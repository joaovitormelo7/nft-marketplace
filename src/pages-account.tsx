import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight,
  Camera,
  LockKeyhole,
  UserRound,
  Wallet as WalletIcon,
} from "lucide-react";
import { routes, useNotice, useSession } from "./app";
import { http, messageOf } from "./lib/api";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import type { Wallet } from "./lib/types";

export function LoginPage() {
  const redirect = routes.login.useSearch().redirect || "/",
    qc = useQueryClient(),
    notify = useNotice();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => http.login(email, password),
    onSuccess: (result) => {
      localStorage.setItem("nexus.token", result.token);
      qc.clear();
      location.assign(redirect);
    },
    onError: (e) => setError(messageOf(e)),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    mutation.mutate();
  }
  return (
    <div className="auth-shell">
      <div className="auth-art">
        <span className="eyebrow">BEM-VINDO AO KURIO</span>
        <h1>Um universo de arte espera por você.</h1>
        <p>Descubra, colecione e viva o extraordinário.</p>
        <img
          src="/art/emerald-ape.webp"
          alt="Personagem da coleção Kurio Editions"
        />
      </div>
      <div className="auth-panel">
        <div className="auth-form">
          <div className="auth-icon">
            <UserRound size={24} />
          </div>
          <div className="eyebrow">QUE BOM TER VOCÊ DE VOLTA</div>
          <h1 className="display-title">Entre na sua conta</h1>
          <p className="muted">
            Ainda não tem uma conta?{" "}
            <Link to="/register" search={{ redirect }} className="text-link">
              Cadastre-se
            </Link>
          </p>
          <form onSubmit={submit}>
            <label>
              E-mail
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Senha
              <Input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <div className="inline-error" role="alert">
                {error}
              </div>
            )}
            <Button
              className="w-full"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Entrando..." : "Entrar na conta"}{" "}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="demo-credentials">
            <strong>Conta de demonstração</strong>
            <span>ada@nexus.test · Demo123!</span>
            <button
              className="text-link"
              onClick={() => {
                setEmail("ada@nexus.test");
                setPassword("Demo123!");
                notify("Credenciais preenchidas para demonstração.");
              }}
            >
              Preencher dados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function RegisterPage() {
  const redirect = routes.register.useSearch().redirect || "/",
    qc = useQueryClient();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => http.register(name, email, password),
    onSuccess: (result) => {
      localStorage.setItem("nexus.token", result.token);
      qc.clear();
      location.assign(redirect);
    },
    onError: (e) => setError(messageOf(e)),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    mutation.mutate();
  }
  return (
    <div className="auth-shell">
      <div className="auth-art">
        <span className="eyebrow">FAÇA PARTE DO FUTURO</span>
        <h1>Sua coleção começa aqui.</h1>
        <p>Descubra obras extraordinárias e apoie artistas visionários.</p>
        <img
          src="/art/golden-beat.webp"
          alt="Personagem Golden Beat da coleção Kurio"
        />
      </div>
      <div className="auth-panel">
        <div className="auth-form">
          <div className="auth-icon">
            <UserRound size={24} />
          </div>
          <div className="eyebrow">CRIE SUA CONTA</div>
          <h1 className="display-title">Junte-se ao Kurio</h1>
          <p className="muted">
            Já tem uma conta?{" "}
            <Link to="/login" search={{ redirect }} className="text-link">
              Entrar
            </Link>
          </p>
          <form onSubmit={submit}>
            <label>
              Nome completo
              <Input
                required
                minLength={2}
                autoComplete="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              E-mail
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Senha
              <Input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Pelo menos 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Confirmar senha
              <Input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error && (
              <div className="inline-error" role="alert">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Criando conta..." : "Criar conta"}{" "}
              <ArrowRight size={17} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
export function ProfilePage() {
  const { data: session } = useSession(),
    user = session?.user,
    qc = useQueryClient(),
    notify = useNotice();
  const query = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: http.profile,
    enabled: !!user,
  });
  const [name, setName] = useState(""),
    [bio, setBio] = useState(""),
    [avatar, setAvatar] = useState(""),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [passwordError, setPasswordError] = useState("");
  useEffect(() => {
    if (query.data) {
      setName(query.data.name);
      setBio(query.data.bio);
      setAvatar(query.data.avatar);
    }
  }, [query.data]);
  const save = useMutation({
    mutationFn: () => http.saveProfile({ name, bio, avatar }),
    onSuccess: (updated) => {
      qc.setQueryData(["session"], { user: updated });
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      notify("Perfil atualizado.");
    },
    onError: (e) => setError(messageOf(e)),
  });
  const password = useMutation({
    mutationFn: () => http.password(current, next),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      notify("Senha alterada.");
    },
    onError: (e) => setPasswordError(messageOf(e)),
  });
  function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250_000 || !file.type.startsWith("image/")) {
      setError("Use uma imagem de até 250 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }
  if (query.isPending)
    return (
      <div className="container section">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  if (query.isError)
    return (
      <div className="container section state-panel" role="alert">
        <h1>Falha ao carregar perfil</h1>
        <Button onClick={() => query.refetch()}>Tentar novamente</Button>
      </div>
    );
  return (
    <div className="container section account-page">
      <div className="page-heading">
        <div className="eyebrow">SUA CONTA KURIO</div>
        <h1 className="display-title">Meu perfil</h1>
        <p className="muted">Gerencie seus dados e preferências.</p>
      </div>
      <div className="account-tabs">
        <Link to="/profile" className="active">
          <UserRound size={18} /> Meu perfil
        </Link>
        <Link to="/wallets">
          <WalletIcon size={18} /> Carteiras
        </Link>
      </div>
      <div className="account-grid">
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            save.mutate();
          }}
        >
          <h2>Informações pessoais</h2>
          <p className="muted mb-6">Atualize seu perfil de colecionador.</p>
          <div className="avatar-edit">
            <div className="avatar large">
              {avatar.startsWith("data:") ? (
                <img src={avatar} alt="Avatar atual" />
              ) : (
                avatar
              )}
            </div>
            <label className="button button-outline button-sm">
              <Camera size={17} /> Alterar avatar
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={upload}
              />
            </label>
          </div>
          <label>
            Nome completo
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            E-mail
            <Input
              value={query.data?.email || ""}
              readOnly
              aria-describedby="email-note"
            />
          </label>
          <small id="email-note" className="muted">
            O e-mail é usado para acessar a conta.
          </small>
          <label>
            Biografia
            <textarea
              className="field textarea"
              value={bio}
              maxLength={280}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você"
            />
          </label>
          {error && (
            <div role="alert" className="inline-error">
              {error}
            </div>
          )}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            setPasswordError("");
            if (next !== confirm) {
              setPasswordError("As senhas não coincidem.");
              return;
            }
            password.mutate();
          }}
        >
          <h2>Segurança</h2>
          <p className="muted mb-6">Altere sua senha de acesso.</p>
          <label>
            Senha atual
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            Nova senha
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </label>
          <label>
            Confirmar nova senha
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {passwordError && (
            <div role="alert" className="inline-error">
              {passwordError}
            </div>
          )}
          <Button variant="outline" type="submit" disabled={password.isPending}>
            <LockKeyhole size={17} />
            {password.isPending ? "Alterando..." : "Alterar senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
export function WalletsPage() {
  const { data: session } = useSession(),
    user = session?.user,
    qc = useQueryClient(),
    notify = useNotice();
  const query = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: http.wallets,
    enabled: !!user,
  });
  const [editing, setEditing] = useState<string | null>(null),
    [label, setLabel] = useState(""),
    [address, setAddress] = useState(""),
    [network, setNetwork] = useState<"Ethereum" | "Polygon">("Ethereum"),
    [primary, setPrimary] = useState(false),
    [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () =>
      editing
        ? http.updateWallet(editing, { label, address, network, primary })
        : http.saveWallet({ label, address, network, primary }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets", user?.id] });
      setEditing(null);
      setLabel("");
      setAddress("");
      setPrimary(false);
      setError("");
      notify("Carteira salva.");
    },
    onError: (e) => setError(messageOf(e)),
  });
  function edit(wallet: Wallet) {
    setEditing(wallet.id);
    setLabel(wallet.label);
    setAddress(wallet.address);
    setNetwork(wallet.network);
    setPrimary(wallet.primary);
    setError("");
    document
      .getElementById("wallet-form")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  return (
    <div className="container section account-page">
      <div className="page-heading">
        <div className="eyebrow">SUA CONTA KURIO</div>
        <h1 className="display-title">Minhas carteiras</h1>
        <p className="muted">
          Cadastre e gerencie as carteiras usadas nas compras simuladas.
        </p>
      </div>
      <div className="account-tabs">
        <Link to="/profile">
          <UserRound size={18} /> Meu perfil
        </Link>
        <Link to="/wallets" className="active">
          <WalletIcon size={18} /> Carteiras
        </Link>
      </div>
      <div className="account-grid">
        <div>
          <h2 className="text-xl font-semibold mb-5">Carteiras cadastradas</h2>
          {query.isPending ? (
            <div className="skeleton h-48 rounded-2xl" />
          ) : query.isError ? (
            <div role="alert" className="inline-error">
              {messageOf(query.error)}{" "}
              <Button onClick={() => query.refetch()}>Tentar novamente</Button>
            </div>
          ) : query.data?.length ? (
            <div className="wallet-list">
              {query.data.map((w) => (
                <div className="wallet-card" key={w.id}>
                  <div className="wallet-card-icon">
                    <WalletIcon size={23} />
                  </div>
                  <div>
                    <strong>
                      {w.label}{" "}
                      {w.primary && (
                        <span className="network-pill">Principal</span>
                      )}
                    </strong>
                    <small>{w.address}</small>
                    <span>{w.network}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => edit(w)}>
                    Editar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="state-panel">
              <WalletIcon size={28} />
              <p>Nenhuma carteira cadastrada.</p>
            </div>
          )}
        </div>
        <form
          id="wallet-form"
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            save.mutate();
          }}
        >
          <h2>{editing ? "Editar carteira" : "Adicionar carteira"}</h2>
          <p className="muted mb-6">
            Use um endereço fictício no formato Ethereum.
          </p>
          <label>
            Nome da carteira
            <Input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex.: Minha carteira"
            />
          </label>
          <label>
            Endereço
            <Input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              aria-describedby="address-hint"
            />
          </label>
          <small id="address-hint" className="muted">
            0x seguido de 40 caracteres hexadecimais.
          </small>
          <label>
            Rede
            <select
              className="field"
              value={network}
              onChange={(e) =>
                setNetwork(e.target.value as "Ethereum" | "Polygon")
              }
            >
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={primary}
              onChange={(e) => setPrimary(e.target.checked)}
            />{" "}
            Definir como principal
          </label>
          {error && (
            <div role="alert" className="inline-error">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending
                ? "Salvando..."
                : editing
                  ? "Salvar carteira"
                  : "Adicionar carteira"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setLabel("");
                  setAddress("");
                  setPrimary(false);
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
