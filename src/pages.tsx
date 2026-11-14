import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { routes, useNotice, useSession } from "./app";
import { http, messageOf } from "./lib/api";
import { eth } from "./lib/utils";
import type { Quote } from "./lib/types";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

function ErrorState({
  onRetry,
  message,
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <div role="alert" className="state-panel">
      <h2>Não foi possível carregar</h2>
      <p>{message || "Confira a conexão e tente novamente."}</p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
}
export { HomePage } from "./pages-home";

export function DetailPage() {
  const { id } = routes.detail.useParams(),
    qc = useQueryClient(),
    notify = useNotice(),
    navigate = useNavigate();
  const { data: session } = useSession(),
    user = session?.user;
  const query = useQuery({
    queryKey: ["nft", id],
    queryFn: () => http.nft(id),
  });
  const { data: favorites } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: http.favorites,
    enabled: !!user,
  });
  const [editionId, setEditionId] = useState("standard"),
    [quantity, setQuantity] = useState(1);
  const nft = query.data,
    edition = nft?.editions.find((e) => e.id === editionId),
    active = favorites?.includes(id) || false;
  const add = useMutation({
    mutationFn: () => http.addCart({ nftId: id, editionId, quantity }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["quote"] });
      notify("Obra adicionada ao carrinho.");
    },
    onError: (e) => notify(messageOf(e)),
  });
  const favorite = useMutation({
    mutationFn: (value: boolean) => http.favorite(id, value),
    onMutate: async (value) => {
      const key = ["favorites", user?.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<string[]>(key);
      qc.setQueryData(
        key,
        value
          ? [...(previous || []), id]
          : (previous || []).filter((x) => x !== id),
      );
      return { previous };
    },
    onError: (e, _, ctx) => {
      qc.setQueryData(["favorites", user?.id], ctx?.previous);
      notify(messageOf(e));
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });
  if (query.isPending)
    return (
      <div className="container section detail-grid">
        <div className="skeleton aspect-square rounded-3xl" />
        <div>
          <div className="skeleton h-12 w-3/4 rounded" />
          <div className="skeleton mt-8 h-24 rounded" />
          <div className="skeleton mt-8 h-32 rounded" />
        </div>
      </div>
    );
  if (query.isError || !nft)
    return (
      <div className="container section">
        <ErrorState
          onRetry={() => query.refetch()}
          message={messageOf(query.error)}
        />
      </div>
    );
  return (
    <div className="container section">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Voltar à coleção
      </Link>
      <div className="detail-grid">
        <div className="detail-gallery">
          <div className="detail-main-image">
            <img src={nft.image} alt={`Arte digital ${nft.title}`} />
          </div>
          <div className="gallery-thumbs">
            <img src={nft.image} alt={`Vista principal de ${nft.title}`} />
            <div className="thumb-note">
              ◆
              <span>
                Obra digital
                <br />
                exclusiva
              </span>
            </div>
          </div>
        </div>
        <div className="detail-info">
          <div className="eyebrow">
            {nft.category.toUpperCase()} · EDIÇÃO LIMITADA
          </div>
          <h1 className="display-title detail-title">{nft.title}</h1>
          <div className="creator-row">
            <span className="avatar">
              {nft.artist
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </span>
            <span>
              <small>Criado por</small>
              <strong>
                {nft.artist} <span className="verified">✓</span>
              </strong>
            </span>
          </div>
          <p className="detail-description">
            {nft.description} Uma peça cuidadosamente criada para colecionadores
            que buscam expressão, originalidade e novas perspectivas.
          </p>
          <div className="divider" />
          <div className="eyebrow">ESCOLHA SUA EDIÇÃO</div>
          <div className="edition-list">
            {nft.editions.map((e) => (
              <button
                key={e.id}
                className={`edition-choice ${editionId === e.id ? "active" : ""}`}
                onClick={() => {
                  setEditionId(e.id);
                  setQuantity(1);
                }}
                disabled={e.available === 0}
              >
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.available ? `${e.available} disponíveis` : "Esgotada"}
                  </small>
                </span>
                <strong>{eth(e.priceEth)}</strong>
              </button>
            ))}
          </div>
          <div className="quantity-row">
            <span>Quantidade</span>
            <div className="stepper">
              <button
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus size={16} />
              </button>
              <output aria-label="Quantidade selecionada">{quantity}</output>
              <button
                aria-label="Aumentar quantidade"
                disabled={quantity >= (edition?.available || 0)}
                onClick={() =>
                  setQuantity(Math.min(edition?.available || 1, quantity + 1))
                }
              >
                <Plus size={16} />
              </button>
            </div>
            <small>Máx. {edition?.available || 0}</small>
          </div>
          <div className="purchase-box">
            <div>
              <small>PREÇO TOTAL</small>
              <strong>
                {edition
                  ? `${(Number(edition.priceEth) * quantity).toFixed(3)} ETH`
                  : "—"}
              </strong>
            </div>
            <p>Taxa de rede calculada no carrinho</p>
          </div>
          <div className="detail-actions">
            <Button
              disabled={!edition?.available || add.isPending}
              onClick={() => add.mutate()}
            >
              <ShoppingBag size={19} />
              {add.isPending ? "Adicionando..." : "Adicionar ao carrinho"}
            </Button>
            <Button
              variant="outline"
              aria-label={
                active ? "Remover dos favoritos" : "Adicionar aos favoritos"
              }
              onClick={() =>
                user
                  ? favorite.mutate(!active)
                  : navigate({
                      to: "/login",
                      search: { redirect: location.pathname },
                    })
              }
            >
              <Heart size={19} fill={active ? "currentColor" : "none"} />
            </Button>
          </div>
          <div className="assurance">
            <ShieldCheck size={18} /> Compra simulada e protegida
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({
  quote,
  loading = false,
}: {
  quote?: Quote;
  loading?: boolean;
}) {
  return (
    <aside className="summary-card">
      <h2>Resumo do pedido</h2>
      {loading || !quote ? (
        <>
          <div className="skeleton mt-6 h-5 rounded" />
          <div className="skeleton mt-4 h-5 rounded" />
          <div className="skeleton mt-4 h-8 rounded" />
        </>
      ) : (
        <>
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
          {!!quote.issues.length && (
            <div role="alert" className="inline-error">
              {quote.issues.join(" ")}
            </div>
          )}
        </>
      )}
    </aside>
  );
}

export function CartPage() {
  const { data: session } = useSession(),
    user = session?.user,
    qc = useQueryClient(),
    notify = useNotice();
  const cart = useQuery({
    queryKey: ["cart", user?.id || "guest"],
    queryFn: http.cart,
  });
  const quote = useQuery({
    queryKey: ["quote", user?.id || "guest"],
    queryFn: http.quote,
    enabled: !!cart.data,
  });
  const [coupon, setCoupon] = useState("");
  useEffect(() => setCoupon(cart.data?.coupon || ""), [cart.data?.coupon]);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["cart"] });
    qc.invalidateQueries({ queryKey: ["quote"] });
  };
  const update = useMutation({
    mutationFn: http.updateCart,
    onSuccess: refresh,
    onError: (e) => notify(messageOf(e)),
  });
  const remove = useMutation({
    mutationFn: http.removeCart,
    onSuccess: refresh,
    onError: (e) => notify(messageOf(e)),
  });
  const apply = useMutation({
    mutationFn: http.coupon,
    onSuccess: () => {
      refresh();
      notify("Cupom atualizado.");
    },
    onError: (e) => notify(messageOf(e)),
  });
  const lines = quote.data?.lines || [];
  return (
    <div className="container section">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Continuar explorando
      </Link>
      <div className="page-heading">
        <div className="eyebrow">SUA COLEÇÃO ESTÁ CRESCENDO</div>
        <h1 className="display-title">Seu carrinho</h1>
        <p className="muted">Revise suas obras antes de finalizar.</p>
      </div>
      {cart.isPending ? (
        <div className="cart-layout">
          <div className="skeleton h-80 rounded-2xl" />
          <Summary loading />
        </div>
      ) : cart.isError ? (
        <ErrorState
          onRetry={() => cart.refetch()}
          message={messageOf(cart.error)}
        />
      ) : !cart.data?.items.length ? (
        <div className="state-panel">
          <ShoppingBag size={36} />
          <h2>Seu carrinho está vazio</h2>
          <p>Descubra obras incríveis e comece sua coleção.</p>
          <Link to="/" className="button button-default">
            Explorar obras
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            <div className="cart-items">
              {lines.map((line) => (
                <article
                  className="cart-item"
                  key={`${line.nftId}-${line.editionId}`}
                >
                  <Link to="/nft/$id" params={{ id: line.nftId }}>
                    <img src={line.image} alt={`Arte ${line.title}`} />
                  </Link>
                  <div className="cart-item-info">
                    <div className="eyebrow">{line.edition}</div>
                    <Link
                      to="/nft/$id"
                      params={{ id: line.nftId }}
                      className="card-title"
                    >
                      {line.title}
                    </Link>
                    <p className="muted">{eth(line.unitEth)} por unidade</p>
                    {line.available < line.quantity && (
                      <p role="alert" className="text-rose-300 text-sm mt-2">
                        Estoque alterado: {line.available} disponível(is)
                      </p>
                    )}
                    <div className="cart-item-controls">
                      <div className="stepper">
                        <button
                          aria-label={`Diminuir ${line.title}`}
                          disabled={update.isPending || line.quantity <= 1}
                          onClick={() =>
                            update.mutate({
                              nftId: line.nftId,
                              editionId: line.editionId,
                              quantity: line.quantity - 1,
                            })
                          }
                        >
                          <Minus size={15} />
                        </button>
                        <output>{line.quantity}</output>
                        <button
                          aria-label={`Aumentar ${line.title}`}
                          disabled={
                            update.isPending || line.quantity >= line.available
                          }
                          onClick={() =>
                            update.mutate({
                              nftId: line.nftId,
                              editionId: line.editionId,
                              quantity: line.quantity + 1,
                            })
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <button
                        className="remove-button"
                        onClick={() =>
                          remove.mutate({
                            nftId: line.nftId,
                            editionId: line.editionId,
                            quantity: line.quantity,
                          })
                        }
                      >
                        <Trash2 size={16} /> Remover
                      </button>
                    </div>
                  </div>
                  <strong className="cart-line-price">
                    {eth(line.totalEth)}
                  </strong>
                </article>
              ))}
            </div>
            <form
              className="coupon-box"
              onSubmit={(e) => {
                e.preventDefault();
                apply.mutate(coupon);
              }}
            >
              <label htmlFor="coupon">Possui um cupom?</label>
              <div>
                <Input
                  id="coupon"
                  placeholder="Digite seu código"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={apply.isPending}
                >
                  Aplicar
                </Button>
              </div>
              {cart.data.coupon && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => apply.mutate("")}
                >
                  Remover cupom {cart.data?.coupon}
                </button>
              )}
            </form>
          </div>
          <div>
            <Summary quote={quote.data} loading={quote.isPending} />
            <Link
              to={user ? "/checkout" : "/login"}
              search={user ? undefined : { redirect: "/checkout" }}
              className={`button button-default checkout-link ${!quote.data?.valid ? "disabled-link" : ""}`}
              aria-disabled={!quote.data?.valid}
              onClick={(e) => {
                if (!quote.data?.valid) e.preventDefault();
              }}
            >
              Finalizar compra <ArrowRight size={18} />
            </Link>
            <p className="secure-note">
              <ShieldCheck size={16} /> Checkout simulado e seguro
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { CheckoutPage, OrderPage } from "./pages-checkout";
export {
  LoginPage,
  RegisterPage,
  ProfilePage,
  WalletsPage,
} from "./pages-account";
