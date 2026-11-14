import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ShieldCheck,
  Wallet as WalletIcon,
  XCircle,
} from "lucide-react";
import { routes, useSession } from "./app";
import { http, messageOf } from "./lib/api";
import { eth } from "./lib/utils";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import type { Quote } from "./lib/types";

function QuoteSummary({ quote }: { quote: Quote }) {
  return (
    <aside className="summary-card">
      <h2>Resumo do pedido</h2>
      <div className="checkout-items">
        {quote.lines.map((line) => (
          <div
            key={`${line.nftId}-${line.editionId}`}
            className="checkout-item"
          >
            <img src={line.image} alt="" />
            <div>
              <strong>{line.title}</strong>
              <small>
                {line.edition} · {line.quantity} × {eth(line.unitEth)}
              </small>
            </div>
            <strong>{eth(line.totalEth)}</strong>
          </div>
        ))}
      </div>
      <div className="summary-line">
        <span>Subtotal</span>
        <strong>{eth(quote.subtotalEth)}</strong>
      </div>
      <div className="summary-line">
        <span>Desconto</span>
        <strong>− {eth(quote.discountEth)}</strong>
      </div>
      <div className="summary-line">
        <span>Taxa de rede</span>
        <strong>{eth(quote.feeEth)}</strong>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>{eth(quote.totalEth)}</strong>
      </div>
      {quote.issues.length > 0 && (
        <div className="inline-error" role="alert">
          {quote.issues.join(" ")}
        </div>
      )}
    </aside>
  );
}

export function CheckoutPage() {
  const { data: session } = useSession(),
    user = session?.user,
    qc = useQueryClient(),
    navigate = useNavigate();
  const quoteQuery = useQuery({
    queryKey: ["quote", user?.id],
    queryFn: http.quote,
    enabled: !!user,
  });
  const walletsQuery = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: http.wallets,
    enabled: !!user,
  });
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [walletId, setWalletId] = useState(""),
    [connected, setConnected] = useState(false),
    [review, setReview] = useState(false),
    [reviewedFingerprint, setReviewedFingerprint] = useState(""),
    [error, setError] = useState(""),
    [changed, setChanged] = useState(false);
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);
  useEffect(() => {
    if (walletsQuery.data?.length && !walletId)
      setWalletId(
        walletsQuery.data.find((w) => w.primary)?.id || walletsQuery.data[0].id,
      );
  }, [walletsQuery.data, walletId]);
  const wallet = walletsQuery.data?.find((w) => w.id === walletId),
    quote = quoteQuery.data;
  useEffect(() => {
    if (
      reviewedFingerprint &&
      quote?.fingerprint &&
      quote.fingerprint !== reviewedFingerprint
    ) {
      setReview(false);
      setChanged(true);
      setError("A cotação mudou. Revise os novos valores antes de continuar.");
    }
  }, [quote?.fingerprint, reviewedFingerprint]);
  const order = useMutation({
    mutationFn: http.createOrder,
    onSuccess: (result) => {
      sessionStorage.removeItem("nexus.order.attempt");
      qc.invalidateQueries({ queryKey: ["orders", user?.id] });
      navigate({ to: "/orders/$id", params: { id: result.id } });
    },
    onError: (e) => {
      setError(messageOf(e));
      qc.invalidateQueries({ queryKey: ["quote"] });
    },
  });
  async function reviewOrder(e: FormEvent) {
    e.preventDefault();
    setError("");
    setChanged(false);
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Preencha nome e e-mail válidos.");
      return;
    }
    if (!wallet || !connected) {
      setError("Selecione e conecte uma carteira.");
      return;
    }
    try {
      const fresh = await http.quote();
      qc.setQueryData(["quote", user?.id], fresh);
      if (!fresh.valid) {
        setError(fresh.issues.join(" "));
        return;
      }
      if (fresh.fingerprint !== quote?.fingerprint) {
        setChanged(true);
        setError(
          "A cotação mudou. Revise os novos valores antes de continuar.",
        );
        return;
      }
      setReviewedFingerprint(fresh.fingerprint);
      setReview(true);
    } catch (e) {
      setError(messageOf(e));
    }
  }
  function confirm() {
    if (!quote || !wallet) return;
    if (quote.fingerprint !== reviewedFingerprint) {
      setReview(false);
      setChanged(true);
      return;
    }
    const signature = JSON.stringify({
      walletId,
      network: wallet.network,
      fingerprint: quote.fingerprint,
      collectorName: name,
      collectorEmail: email,
    });
    const saved = sessionStorage.getItem("nexus.order.attempt");
    let attempt: { key: string; signature: string } | null = null;
    try {
      attempt = saved ? JSON.parse(saved) : null;
    } catch {
      /* regenerate */
    }
    if (!attempt || attempt.signature !== signature) {
      attempt = { key: crypto.randomUUID(), signature };
      sessionStorage.setItem("nexus.order.attempt", JSON.stringify(attempt));
    }
    order.mutate({
      walletId,
      network: wallet.network,
      fingerprint: quote.fingerprint,
      idempotencyKey: attempt.key,
      collectorName: name,
      collectorEmail: email,
    });
  }
  if (quoteQuery.isPending || walletsQuery.isPending)
    return (
      <div className="container section">
        <div className="skeleton h-12 w-1/3 rounded" />
        <div className="cart-layout mt-10">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  if (quoteQuery.isError || walletsQuery.isError)
    return (
      <div className="container section">
        <div className="state-panel" role="alert">
          <h1>Não foi possível carregar o pagamento</h1>
          <p>{messageOf(quoteQuery.error || walletsQuery.error)}</p>
          <Button
            onClick={() => {
              quoteQuery.refetch();
              walletsQuery.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  if (!quote?.lines.length)
    return (
      <div className="container section state-panel">
        <h1>Seu carrinho está vazio</h1>
        <Link to="/" className="button button-default">
          Explorar obras
        </Link>
      </div>
    );
  return (
    <div className="container section">
      <Link to="/cart" className="back-link">
        <ArrowLeft size={16} /> Voltar ao carrinho
      </Link>
      <div className="page-heading">
        <div className="eyebrow">ÚLTIMO PASSO</div>
        <h1 className="display-title">Finalizar compra</h1>
        <p className="muted">Revise os dados e confirme seu pedido.</p>
      </div>
      <div className="checkout-progress">
        <span className="done">
          <Check size={15} /> Carrinho
        </span>
        <span className="line" />
        <span className="current">2 &nbsp; Pagamento</span>
        <span className="line" />
        <span>3 &nbsp; Confirmação</span>
      </div>
      <div className="cart-layout">
        <form onSubmit={reviewOrder} className="checkout-form">
          <section className="form-card">
            <div className="form-card-heading">
              <span className="number-circle">1</span>
              <div>
                <h2>Dados do colecionador</h2>
                <p>Informações para identificar sua compra.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Nome completo
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setReview(false);
                  }}
                  required
                  minLength={2}
                />
              </label>
              <label>
                E-mail
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setReview(false);
                  }}
                  required
                />
              </label>
            </div>
          </section>
          <section className="form-card">
            <div className="form-card-heading">
              <span className="number-circle">2</span>
              <div>
                <h2>Carteira e rede</h2>
                <p>Escolha uma carteira cadastrada para simular a conexão.</p>
              </div>
            </div>
            {walletsQuery.data?.length ? (
              <>
                <label className="full-label">
                  Carteira
                  <select
                    className="field"
                    value={walletId}
                    onChange={(e) => {
                      setWalletId(e.target.value);
                      setConnected(false);
                      setReview(false);
                    }}
                  >
                    {walletsQuery.data.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label} · {w.address.slice(0, 8)}…
                        {w.address.slice(-4)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="wallet-preview">
                  <WalletIcon size={23} />
                  <span>
                    <strong>{wallet?.label}</strong>
                    <small>{wallet?.address}</small>
                  </span>
                  <span className="network-pill">{wallet?.network}</span>
                </div>
                <div className="connect-row">
                  <Button
                    type="button"
                    variant={connected ? "outline" : "default"}
                    onClick={() => {
                      setConnected(!connected);
                      setReview(false);
                    }}
                  >
                    {connected ? "Desconectar" : "Conectar carteira"}
                  </Button>
                  <span role="status">
                    {connected
                      ? "Conectada na simulação"
                      : "Aguardando conexão"}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-link mt-4"
                  onClick={() => {
                    setConnected(false);
                    setError(
                      "Conexão recusada pela carteira simulada. Tente novamente.",
                    );
                  }}
                >
                  Simular recusa da conexão
                </button>
              </>
            ) : (
              <div className="inline-error">
                Cadastre uma carteira para continuar.{" "}
                <Link to="/wallets" className="text-link">
                  Cadastrar carteira
                </Link>
              </div>
            )}
          </section>
          {error && (
            <div role="alert" className="inline-error">
              {error}
            </div>
          )}
          {changed && (
            <div role="status" className="notice-box">
              A cotação foi atualizada. Verifique o resumo e clique em “Revisar
              pedido” novamente.
            </div>
          )}
          {review ? (
            <section className="form-card review-card">
              <div className="form-card-heading">
                <span className="number-circle">
                  <Check size={18} />
                </span>
                <div>
                  <h2>Revise e confirme</h2>
                  <p>
                    {name} · {email} · {wallet?.network}
                  </p>
                </div>
              </div>
              <p>
                Você confirma o total de <strong>{eth(quote.totalEth)}</strong>{" "}
                para {quote.lines.length} item(ns)?
              </p>
              <div className="review-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReview(false)}
                >
                  Editar dados
                </Button>
                <Button
                  type="button"
                  disabled={order.isPending}
                  onClick={confirm}
                >
                  {order.isPending ? "Enviando..." : "Confirmar compra"}{" "}
                  <ArrowRight size={17} />
                </Button>
              </div>
            </section>
          ) : (
            <Button
              type="submit"
              disabled={!quote.valid}
              className="w-full mt-6"
            >
              Revisar pedido <ArrowRight size={17} />
            </Button>
          )}
          <p className="secure-note">
            <ShieldCheck size={16} /> Nenhum pagamento real será processado.
          </p>
        </form>
        <QuoteSummary quote={quote} />
      </div>
    </div>
  );
}

export function OrderPage() {
  const { id } = routes.order.useParams(),
    { data: session } = useSession(),
    user = session?.user;
  const query = useQuery({
    queryKey: ["order", user?.id, id],
    queryFn: () => http.order(id),
    enabled: !!user,
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 2000 : false),
  });
  const order = query.data;
  if (query.isPending)
    return (
      <div className="container section">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  if (query.isError || !order)
    return (
      <div className="container section state-panel" role="alert">
        <h1>Pedido não encontrado</h1>
        <p>{messageOf(query.error)}</p>
        <Link to="/" className="button button-default">
          Voltar ao início
        </Link>
      </div>
    );
  return (
    <div className="container section receipt-page">
      <div className={`receipt-icon ${order.status}`}>
        {order.status === "confirmed" ? (
          <Check size={33} />
        ) : order.status === "pending" ? (
          <Clock3 size={33} />
        ) : (
          <XCircle size={33} />
        )}
      </div>
      <div className="eyebrow">
        {order.status === "confirmed"
          ? "COMPRA CONCLUÍDA"
          : order.status === "pending"
            ? "AGUARDANDO RESULTADO"
            : "PAGAMENTO RECUSADO"}
      </div>
      <h1 className="display-title">
        {order.status === "confirmed"
          ? "Sua nova coleção começa aqui."
          : order.status === "pending"
            ? "Seu pedido está pendente."
            : "Não foi possível concluir."}
      </h1>
      <p className="muted receipt-intro">
        {order.status === "confirmed"
          ? "Seu pedido foi confirmado na simulação. Confira os detalhes abaixo."
          : order.status === "pending"
            ? "Estamos aguardando a confirmação. Esta página atualiza automaticamente."
            : "O pagamento simulado foi recusado. Seus itens continuam no carrinho."}
      </p>
      <div className="receipt-card">
        <div className="receipt-top">
          <div>
            <small>NÚMERO DO PEDIDO</small>
            <strong>{order.id}</strong>
          </div>
          <div>
            <small>DATA</small>
            <strong>{new Date(order.createdAt).toLocaleString("pt-BR")}</strong>
          </div>
          <div>
            <small>STATUS</small>
            <strong>
              {order.status === "confirmed"
                ? "Confirmado"
                : order.status === "pending"
                  ? "Pendente"
                  : "Recusado"}
            </strong>
          </div>
        </div>
        <div className="checkout-items">
          {order.quote.lines.map((line) => (
            <div
              className="checkout-item"
              key={`${line.nftId}-${line.editionId}`}
            >
              <img src={line.image} alt="" />
              <div>
                <strong>{line.title}</strong>
                <small>
                  {line.edition} · {line.quantity} unidade(s)
                </small>
              </div>
              <strong>{eth(line.totalEth)}</strong>
            </div>
          ))}
        </div>
        <div className="summary-line">
          <span>Subtotal</span>
          <strong>{eth(order.quote.subtotalEth)}</strong>
        </div>
        <div className="summary-line">
          <span>Desconto</span>
          <strong>− {eth(order.quote.discountEth)}</strong>
        </div>
        <div className="summary-line">
          <span>Taxa de rede</span>
          <strong>{eth(order.quote.feeEth)}</strong>
        </div>
        <div className="summary-total">
          <span>Total pago</span>
          <strong>{eth(order.quote.totalEth)}</strong>
        </div>
        {order.status === "confirmed" && (
          <div className="transaction">
            <span>Referência simulada</span>
            <code>{order.txRef}</code>
          </div>
        )}
      </div>
      <div className="receipt-actions">
        <Link to="/" className="button button-default">
          Explorar mais obras
        </Link>
        {order.status === "declined" && (
          <Link to="/cart" className="button button-outline">
            Voltar ao carrinho
          </Link>
        )}
      </div>
    </div>
  );
}
