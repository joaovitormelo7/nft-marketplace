import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  useNavigate,
} from "@tanstack/react-router";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { LogIn, Menu, Search, ShoppingCart, X } from "lucide-react";
import { http, api } from "./lib/api";
import {
  HomePage,
  DetailPage,
  CartPage,
  CheckoutPage,
  OrderPage,
  LoginPage,
  RegisterPage,
  ProfilePage,
  WalletsPage,
} from "./pages";
import type { RealtimeEvent } from "./lib/types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
const NoticeContext = createContext<(message: string) => void>(() => {});
export const useNotice = () => useContext(NoticeContext);
export const useSession = () =>
  useQuery({ queryKey: ["session"], queryFn: http.session, staleTime: 60_000 });

function Realtime({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const notify = useNotice();
  const versions = useRef(new Map<string, number>());
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (import.meta.env.VITE_MOCKS === "off") return;
    const socket: Socket = io(location.origin, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
      auth: { token: localStorage.getItem("nexus.token") },
    });
    const eventVersions = versions.current,
      seenEvents = seen.current;
    const valid = (event: RealtimeEvent) => {
      if (
        seenEvents.has(event.id) ||
        (eventVersions.get(event.resourceId) || 0) >= event.version
      )
        return false;
      seenEvents.add(event.id);
      eventVersions.set(event.resourceId, event.version);
      return true;
    };
    socket.on("nft.updated", (event: RealtimeEvent) => {
      if (!valid(event)) return;
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["nft", event.resourceId] });
      qc.invalidateQueries({ queryKey: ["quote"] });
      notify(
        "O preço ou a disponibilidade de uma obra mudou. Revise o resumo atualizado.",
      );
    });
    socket.on("order.updated", (event: RealtimeEvent) => {
      if (event.userId !== userId || !valid(event)) return;
      qc.invalidateQueries({ queryKey: ["order", userId, event.resourceId] });
      qc.invalidateQueries({ queryKey: ["orders", userId] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["quote"] });
    });
    socket.on("connect", () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["quote"] });
      if (userId) qc.invalidateQueries({ queryKey: ["orders", userId] });
    });
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      eventVersions.clear();
      seenEvents.clear();
    };
  }, [qc, userId, notify]);
  return null;
}

function Header() {
  const { data } = useSession(),
    user = data?.user;
  const qc = useQueryClient(),
    navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: cart } = useQuery({
    queryKey: ["cart", user?.id || "guest"],
    queryFn: http.cart,
  });
  async function logout() {
    await http.logout();
    localStorage.removeItem("nexus.token");
    qc.clear();
    navigate({ to: "/" });
    setOpen(false);
  }
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo" aria-label="Kurio, início">
          KURIO
        </Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link to="/" activeProps={{ className: "nav-active" }}>
            Início
          </Link>
          <a
            href="#collections"
            onClick={(e) => {
              if (location.pathname !== "/") {
                e.preventDefault();
                navigate({ to: "/" }).then(() =>
                  document.getElementById("collections")?.scrollIntoView(),
                );
              }
            }}
          >
            Mercado
          </a>
          <a href="#about">Criadores</a>
          <a href="#about">Aprenda</a>
        </nav>
        <div className="header-actions">
          <Link
            to="/"
            hash="catalog-search"
            aria-label="Buscar NFTs"
            className="icon-link"
          >
            <Search size={20} />
          </Link>
          <Link
            to="/cart"
            aria-label={`Carrinho com ${cart?.items.reduce((n, x) => n + x.quantity, 0) || 0} itens`}
            className="icon-link cart-icon"
          >
            <ShoppingCart size={20} />
            {!!cart?.items.length && (
              <span className="cart-badge">
                {cart.items.reduce((n, x) => n + x.quantity, 0)}
              </span>
            )}
          </Link>
          {user ? (
            <Link to="/profile" className="profile-link">
              <span className="avatar tiny">{user.avatar}</span>
              <span>{user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link to="/login" className="button button-default button-sm">
              <LogIn size={15} /> Entrar
            </Link>
          )}
          <button
            className="mobile-menu icon-link"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Navegação móvel"
        >
          <Link to="/" onClick={() => setOpen(false)}>
            Explorar
          </Link>
          <Link to="/cart" onClick={() => setOpen(false)}>
            Carrinho
          </Link>
          {user ? (
            <>
              <Link to="/profile" onClick={() => setOpen(false)}>
                Perfil
              </Link>
              <Link to="/wallets" onClick={() => setOpen(false)}>
                Carteiras
              </Link>
              <button onClick={logout}>Sair</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>
                Entrar
              </Link>
              <Link to="/register" onClick={() => setOpen(false)}>
                Criar conta
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
function DemoPanel() {
  const qc = useQueryClient(),
    notify = useNotice();
  const scenarios = [
    ["price-up", "Aumentar preço do NFT 1"],
    ["sell-out", "Esgotar NFT 1"],
    ["decline", "Recusar próximo pagamento"],
    ["approve", "Aprovar próximo pagamento"],
    ["timeout-order", "Timeout após criar pedido"],
    ["fail-next", "Falhar próxima consulta de NFTs"],
    ["latency", "Carregamento lento (2 s)"],
    ["disconnect", "Interromper socket"],
    ["expire", "Expirar sessão"],
    ["restore", "Restaurar sessão"],
    ["reset", "Restaurar cenário padrão"],
  ] as const;
  async function run(action: string) {
    try {
      await http.demo(
        action,
        action === "latency"
          ? "2000"
          : action === "fail-next"
            ? "/api/nfts"
            : undefined,
      );
      qc.invalidateQueries();
      notify(
        `Cenário ativado: ${scenarios.find((x) => x[0] === action)?.[1]}.`,
      );
      if (action === "reset") location.assign("/");
    } catch {
      notify("Falha ao alterar cenário.");
    }
  }
  return (
    <details className="demo-panel">
      <summary>Cenários da demonstração</summary>
      <div>
        {scenarios.map(([action, label]) => (
          <button key={action} onClick={() => run(action)}>
            {label}
          </button>
        ))}
      </div>
    </details>
  );
}
function Footer() {
  return (
    <footer id="about" className="footer">
      <div className="container footer-inner">
        <div>
          <Link to="/" className="logo">
            KURIO
          </Link>
          <p>Um novo espaço para descobrir e colecionar arte digital.</p>
          <DemoPanel />
        </div>
        <p>© {new Date().getFullYear()} KURIO. Experiência de demonstração.</p>
      </div>
    </footer>
  );
}
function Shell() {
  const [notice, setNotice] = useState("");
  const { data } = useSession();
  useEffect(() => {
    if (notice) {
      const id = setTimeout(() => setNotice(""), 5500);
      return () => clearTimeout(id);
    }
  }, [notice]);
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (r) => r,
      (e) => {
        if (e.response?.status === 401 && localStorage.getItem("nexus.token")) {
          localStorage.removeItem("nexus.token");
          queryClient.clear();
          setNotice("Sua sessão expirou. Entre novamente para continuar.");
        }
        return Promise.reject(e);
      },
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);
  return (
    <NoticeContext.Provider value={setNotice}>
      <Realtime userId={data?.user?.id} />
      <Header />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
      {notice && (
        <div role="status" aria-live="polite" className="toast">
          {notice}
        </div>
      )}
    </NoticeContext.Provider>
  );
}
function AuthGate({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession(),
    navigate = useNavigate();
  useEffect(() => {
    if (!isPending && !data?.user)
      navigate({
        to: "/login",
        search: { redirect: location.pathname + location.search },
      });
  }, [data, isPending, navigate]);
  if (isPending)
    return (
      <div className="container section">
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  return data?.user ? children : null;
}

const root = createRootRoute({
  component: Shell,
  notFoundComponent: () => (
    <div className="container section text-center">
      <h1 className="display-title">Página não encontrada</h1>
      <p className="muted mt-4">O endereço solicitado não existe.</p>
      <Link to="/" className="button button-default mt-8 inline-flex">
        Voltar ao início
      </Link>
    </div>
  ),
});
const home = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch: (
    s: Record<string, unknown>,
  ): import("./lib/types").CatalogSearch => ({
    q: typeof s.q === "string" ? s.q : "",
    category: typeof s.category === "string" ? s.category : "",
    network: ["Ethereum", "Polygon", "Solana"].includes(String(s.network))
      ? String(s.network)
      : "",
    tab: ["new", "trending"].includes(String(s.tab))
      ? (s.tab as "new" | "trending")
      : "all",
    min: typeof s.min === "string" ? s.min : "",
    max: typeof s.max === "string" ? s.max : "",
    sort: ["recent", "price-asc", "price-desc", "title"].includes(
      String(s.sort),
    )
      ? (s.sort as "recent" | "price-asc" | "price-desc" | "title")
      : "recent",
    page: Math.max(1, Number(s.page) || 1),
  }),
  component: HomePage,
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/nft/$id",
  component: DetailPage,
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/cart",
  component: CartPage,
});
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/checkout",
  component: () => (
    <AuthGate>
      <CheckoutPage />
    </AuthGate>
  ),
});
const order = createRoute({
  getParentRoute: () => root,
  path: "/orders/$id",
  component: () => (
    <AuthGate>
      <OrderPage />
    </AuthGate>
  ),
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect:
      typeof s.redirect === "string" &&
      s.redirect.startsWith("/") &&
      !s.redirect.startsWith("//")
        ? s.redirect
        : "/",
  }),
  component: LoginPage,
});
const register = createRoute({
  getParentRoute: () => root,
  path: "/register",
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect:
      typeof s.redirect === "string" &&
      s.redirect.startsWith("/") &&
      !s.redirect.startsWith("//")
        ? s.redirect
        : "/",
  }),
  component: RegisterPage,
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/profile",
  component: () => (
    <AuthGate>
      <ProfilePage />
    </AuthGate>
  ),
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/wallets",
  component: () => (
    <AuthGate>
      <WalletsPage />
    </AuthGate>
  ),
});
export const router = createRouter({
  routeTree: root.addChildren([
    home,
    detail,
    cart,
    checkout,
    order,
    login,
    register,
    profile,
    wallets,
  ]),
  defaultPreload: "intent",
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
export const routes = { home, detail, order, login, register };
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
