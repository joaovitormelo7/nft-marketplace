export type Network = "Ethereum" | "Polygon";
export type Edition = {
  id: string;
  name: string;
  available: number;
  priceEth: string;
};
export type NFT = {
  id: string;
  title: string;
  artist: string;
  category: string;
  image: string;
  description: string;
  featured?: boolean;
  network: Network | "Solana";
  badge?: "Novo" | "Raro";
  previousPriceEth?: string;
  version: number;
  editions: Edition[];
};
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
};
export type Wallet = {
  id: string;
  label: string;
  address: string;
  network: Network;
  primary: boolean;
};
export type CartItem = { nftId: string; editionId: string; quantity: number };
export type Cart = { items: CartItem[]; coupon: string };
export type QuoteLine = CartItem & {
  title: string;
  image: string;
  edition: string;
  unitEth: string;
  totalEth: string;
  available: number;
  version: number;
};
export type Quote = {
  lines: QuoteLine[];
  subtotalEth: string;
  discountEth: string;
  feeEth: string;
  totalEth: string;
  coupon: string;
  valid: boolean;
  issues: string[];
  fingerprint: string;
};
export type Order = {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "declined";
  plannedStatus: "confirmed" | "declined";
  quote: Quote;
  collectorName: string;
  collectorEmail: string;
  walletId: string;
  network: Network;
  createdAt: string;
  txRef: string;
};
export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};
export type CatalogSearch = {
  q?: string;
  category?: string;
  network?: string;
  tab?: "all" | "new" | "trending";
  min?: string;
  max?: string;
  sort?: "recent" | "price-asc" | "price-desc" | "title";
  page?: number;
};
export type CatalogResponse = {
  items: NFT[];
  total: number;
  page: number;
  pages: number;
  facets: {
    categories: Record<string, number>;
    networks: Record<string, number>;
  };
};
export type RealtimeEvent = {
  id: string;
  resourceId: string;
  version: number;
  userId?: string;
};
