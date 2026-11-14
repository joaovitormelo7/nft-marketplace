import axios from "axios";
import type {
  Cart,
  CartItem,
  CatalogResponse,
  CatalogSearch,
  NFT,
  Order,
  Quote,
  User,
  Wallet,
} from "./types";

export const api = axios.create({ baseURL: "/api", timeout: 8000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexus.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const http = {
  session: async () => (await api.get<{ user: User | null }>("/session")).data,
  login: async (email: string, password: string) =>
    (
      await api.post<{ user: User; token: string }>("/session", {
        email,
        password,
      })
    ).data,
  register: async (name: string, email: string, password: string) =>
    (
      await api.post<{ user: User; token: string }>("/users", {
        name,
        email,
        password,
      })
    ).data,
  logout: async () => (await api.delete("/session")).data,
  catalog: async (search: CatalogSearch, signal?: AbortSignal) =>
    (await api.get<CatalogResponse>("/nfts", { params: search, signal })).data,
  nft: async (id: string) => (await api.get<NFT>(`/nfts/${id}`)).data,
  favorites: async () => (await api.get<string[]>("/favorites")).data,
  favorite: async (id: string, value: boolean) =>
    (
      await api.request({
        url: `/favorites/${id}`,
        method: value ? "put" : "delete",
      })
    ).data,
  cart: async () => (await api.get<Cart>("/cart")).data,
  addCart: async (item: CartItem) =>
    (await api.post<Cart>("/cart/items", item)).data,
  updateCart: async (item: CartItem) =>
    (
      await api.put<Cart>(`/cart/items/${item.nftId}/${item.editionId}`, {
        quantity: item.quantity,
      })
    ).data,
  removeCart: async (item: CartItem) =>
    (await api.delete<Cart>(`/cart/items/${item.nftId}/${item.editionId}`))
      .data,
  coupon: async (coupon: string) =>
    (await api.put<Cart>("/cart/coupon", { coupon })).data,
  quote: async () => (await api.get<Quote>("/quote")).data,
  profile: async () => (await api.get<User>("/profile")).data,
  saveProfile: async (data: Pick<User, "name" | "bio" | "avatar">) =>
    (await api.put<User>("/profile", data)).data,
  password: async (current: string, next: string) =>
    (await api.put("/profile/password", { current, next })).data,
  wallets: async () => (await api.get<Wallet[]>("/wallets")).data,
  saveWallet: async (wallet: Partial<Wallet>) =>
    (await api.post<Wallet>("/wallets", wallet)).data,
  updateWallet: async (id: string, wallet: Partial<Wallet>) =>
    (await api.put<Wallet>(`/wallets/${id}`, wallet)).data,
  orders: async () => (await api.get<Order[]>("/orders")).data,
  order: async (id: string) => (await api.get<Order>(`/orders/${id}`)).data,
  createOrder: async (payload: {
    walletId: string;
    network: string;
    fingerprint: string;
    idempotencyKey: string;
    collectorName: string;
    collectorEmail: string;
  }) => (await api.post<Order>("/orders", payload, { timeout: 12000 })).data,
  demo: async (action: string, value?: string) =>
    (await api.post("/demo", { action, value })).data,
};

export function messageOf(error: unknown) {
  if (axios.isAxiosError(error))
    return (
      error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "A conexão demorou demais. Tente novamente."
        : "Não foi possível completar a operação.")
    );
  return "Ocorreu um erro inesperado.";
}
