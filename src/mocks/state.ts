import Decimal from "decimal.js";
import { seedNfts, seedUsers, seedWallets } from "./fixtures";
import type { Cart, NFT, Order, Quote, User, Wallet } from "../lib/types";

type Scenario = {
  latency: number;
  failNext: string;
  payment: "confirmed" | "declined";
  timeoutOrder: boolean;
  expire: boolean;
};
export type Database = {
  nfts: NFT[];
  users: User[];
  hashes: Record<string, string>;
  wallets: Record<string, Wallet[]>;
  carts: Record<string, Cart>;
  favorites: Record<string, string[]>;
  sessions: Record<string, string>;
  orders: Order[];
  idempotency: Record<string, { signature: string; orderId: string }>;
  scenario: Scenario;
  counter: number;
};
const key = "nexus.mock.db.v1";
const emptyCart = (): Cart => ({ items: [], coupon: "" });
export const makeDatabase = (): Database => ({
  nfts: structuredClone(seedNfts),
  users: structuredClone(seedUsers),
  hashes: {
    "u-ada": "588c55f3ce2b8569b153c5abbf13f9f74308b88a20017cc699b835cc93195d16",
    "u-bruno":
      "588c55f3ce2b8569b153c5abbf13f9f74308b88a20017cc699b835cc93195d16",
  },
  wallets: structuredClone(seedWallets),
  carts: { guest: emptyCart() },
  favorites: {},
  sessions: {},
  orders: [],
  idempotency: {},
  scenario: {
    latency: 100,
    failNext: "",
    payment: "confirmed",
    timeoutOrder: false,
    expire: false,
  },
  counter: 1,
});
export let db: Database = load();
function load(): Database {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "") as Database;
    // Refresh presentation data without deleting accounts, carts or snapshots.
    // Existing prices, stock and versions remain authoritative in saved scenarios.
    stored.nfts = seedNfts.map((seed) => {
      const previous = stored.nfts.find((nft) => nft.id === seed.id);
      return previous
        ? { ...seed, editions: previous.editions, version: previous.version }
        : structuredClone(seed);
    });
    return stored;
  } catch {
    return makeDatabase();
  }
}
export function save() {
  localStorage.setItem(key, JSON.stringify(db));
}
export function reset() {
  db = makeDatabase();
  localStorage.removeItem("nexus.token");
  save();
}
export function cartFor(id: string) {
  return (db.carts[id] ||= emptyCart());
}
export function userFromToken(token: string | null): User | undefined {
  const id = token ? db.sessions[token] : undefined;
  return db.users.find((u) => u.id === id);
}
export function mergeGuestCart(userId: string) {
  const guest = cartFor("guest"),
    own = cartFor(userId);
  for (const item of guest.items) {
    const existing = own.items.find(
      (x) => x.nftId === item.nftId && x.editionId === item.editionId,
    );
    if (existing) existing.quantity += item.quantity;
    else own.items.push(item);
  }
  if (!own.coupon) own.coupon = guest.coupon;
  db.carts.guest = emptyCart();
  save();
}
export function quoteFor(id: string): Quote {
  const cart = cartFor(id);
  const issues: string[] = [];
  const lines = cart.items.flatMap((item) => {
    const nft = db.nfts.find((n) => n.id === item.nftId);
    const edition = nft?.editions.find((e) => e.id === item.editionId);
    if (!nft || !edition) {
      issues.push("Um item não está mais disponível.");
      return [];
    }
    if (edition.available < item.quantity)
      issues.push(`${nft.title}: restam ${edition.available} unidades.`);
    return [
      {
        ...item,
        title: nft.title,
        image: nft.image,
        edition: edition.name,
        unitEth: edition.priceEth,
        totalEth: new Decimal(edition.priceEth).mul(item.quantity).toFixed(3),
        available: edition.available,
        version: nft.version,
      },
    ];
  });
  const subtotal = lines.reduce(
    (sum, line) => sum.plus(line.totalEth),
    new Decimal(0),
  );
  const coupon = cart.coupon.trim().toUpperCase();
  if (coupon && coupon !== "NEXUS10")
    issues.push(
      coupon === "EXPIRED" ? "Este cupom expirou." : "Cupom inválido.",
    );
  const discount = coupon === "NEXUS10" ? subtotal.mul("0.10") : new Decimal(0);
  const fee = lines.length ? new Decimal("0.005") : new Decimal(0);
  const total = Decimal.max(0, subtotal.minus(discount).plus(fee));
  const fingerprint = JSON.stringify({
    lines: lines.map((l) => [
      l.nftId,
      l.editionId,
      l.quantity,
      l.unitEth,
      l.version,
    ]),
    coupon,
    fee: fee.toFixed(3),
  });
  return {
    lines,
    subtotalEth: subtotal.toFixed(3),
    discountEth: discount.toFixed(3),
    feeEth: fee.toFixed(3),
    totalEth: total.toFixed(3),
    coupon,
    valid: issues.length === 0 && lines.length > 0,
    issues,
    fingerprint,
  };
}
