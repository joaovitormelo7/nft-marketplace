import { http, HttpResponse, delay, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import {
  db,
  save,
  reset,
  cartFor,
  userFromToken,
  mergeGuestCart,
  quoteFor,
} from "./state";
import type { CartItem, Order, User, Wallet } from "../lib/types";

const origin = location.origin.replace(/^http/, "ws");
const socket = ws.link(`${origin}/socket.io/`);
const connections = new Set<ReturnType<typeof toSocketIo>>();
function emit(name: string, data: object) {
  for (const connection of connections) connection.client.emit(name, data);
}
const error = (
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) => HttpResponse.json({ code, message, fields }, { status });
const tokenOf = (request: Request) =>
  request.headers.get("authorization")?.replace(/^Bearer /, "") || null;
const account = (request: Request) => userFromToken(tokenOf(request));
const secured = (request: Request) =>
  account(request)
    ? null
    : error(401, "UNAUTHORIZED", "Sua sessão expirou. Entre novamente.");
async function prepare(request: Request) {
  await delay(
    db.scenario.latency +
      (request.url.includes("/nfts?") ? Math.floor(Math.random() * 250) : 0),
  );
  if (db.scenario.failNext && request.url.includes(db.scenario.failNext)) {
    db.scenario.failNext = "";
    save();
    return error(
      503,
      "TEMPORARY",
      "Serviço temporariamente indisponível. Tente novamente.",
    );
  }
  if (db.scenario.expire && !request.url.includes("/demo"))
    return error(401, "EXPIRED", "Sua sessão expirou. Entre novamente.");
  return null;
}
function cartIdentity(request: Request) {
  return account(request)?.id || "guest";
}
function findEdition(id: string, editionId: string) {
  const nft = db.nfts.find((n) => n.id === id);
  return { nft, edition: nft?.editions.find((e) => e.id === editionId) };
}
function sessionResponse(user: User) {
  const token = crypto.randomUUID();
  db.sessions[token] = user.id;
  mergeGuestCart(user.id);
  save();
  return HttpResponse.json({ user, token });
}
async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
function settleOrder(order: Order) {
  if (
    order.status !== "pending" ||
    Date.now() - new Date(order.createdAt).getTime() < 1600
  )
    return;
  order.status = order.plannedStatus;
  if (order.status === "confirmed") {
    const cart = cartFor(order.userId);
    for (const line of order.quote.lines) {
      const item = cart.items.find(
        (x) => x.nftId === line.nftId && x.editionId === line.editionId,
      );
      if (item) {
        item.quantity -= line.quantity;
        if (item.quantity <= 0)
          cart.items = cart.items.filter((x) => x !== item);
      }
      const { nft, edition } = findEdition(line.nftId, line.editionId);
      if (nft && edition) {
        edition.available -= line.quantity;
        nft.version++;
        emit("nft.updated", {
          id: crypto.randomUUID(),
          resourceId: nft.id,
          version: nft.version,
        });
      }
    }
    if (!cart.items.length) cart.coupon = "";
  }
  save();
  emit("order.updated", {
    id: crypto.randomUUID(),
    resourceId: order.id,
    version: 2,
    userId: order.userId,
  });
}

export const handlers = [
  socket.addEventListener("connection", (connection) => {
    const bound = toSocketIo(connection);
    connections.add(bound);
    connection.client.addEventListener("close", () =>
      connections.delete(bound),
    );
  }),
  http.get("/api/session", async ({ request }) => {
    const issue = await prepare(request);
    return issue || HttpResponse.json({ user: account(request) || null });
  }),
  http.post("/api/session", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email?.toLowerCase(),
    );
    if (!user || db.hashes[user.id] !== (await hash(password || "")))
      return error(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
    return sessionResponse(user);
  }),
  http.delete("/api/session", async ({ request }) => {
    const token = tokenOf(request);
    if (token) delete db.sessions[token];
    save();
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/users", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const { name, email, password } = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };
    const fields: Record<string, string> = {};
    if (!name?.trim() || name.trim().length < 2)
      fields.name = "Informe pelo menos 2 caracteres.";
    if (!/^\S+@\S+\.\S+$/.test(email || ""))
      fields.email = "Informe um e-mail válido.";
    if (!password || password.length < 8)
      fields.password = "Use pelo menos 8 caracteres.";
    if (Object.keys(fields).length)
      return error(422, "VALIDATION", "Corrija os campos destacados.", fields);
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
      return error(409, "EMAIL_EXISTS", "Este e-mail já está cadastrado.", {
        email: "Use outro e-mail.",
      });
    const user: User = {
      id: `u-${db.counter++}`,
      name: name.trim(),
      email: email.toLowerCase(),
      avatar: name
        .trim()
        .split(/\s+/)
        .map((x) => x[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      bio: "",
    };
    db.users.push(user);
    db.hashes[user.id] = await hash(password);
    save();
    return sessionResponse(user);
  }),
  http.get("/api/nfts", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") || "").toLowerCase(),
      category = params.get("category") || "",
      network = params.get("network") || "",
      tab = params.get("tab") || "all",
      min = Number(params.get("min") || 0),
      max = Number(params.get("max") || Infinity);
    let items = db.nfts.filter(
      (n) =>
        `${n.title} ${n.artist}`.toLowerCase().includes(q) &&
        (!category || n.category === category) &&
        (!network || n.network === network) &&
        (tab !== "new" || n.badge === "Novo") &&
        (tab !== "trending" || !!n.featured) &&
        Number(n.editions[0].priceEth) >= min &&
        Number(n.editions[0].priceEth) <= max,
    );
    switch (params.get("sort")) {
      case "price-asc":
        items = items.sort(
          (a, b) =>
            Number(a.editions[0].priceEth) - Number(b.editions[0].priceEth),
        );
        break;
      case "price-desc":
        items = items.sort(
          (a, b) =>
            Number(b.editions[0].priceEth) - Number(a.editions[0].priceEth),
        );
        break;
      case "title":
        items = items.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    const page = Math.max(1, Number(params.get("page") || 1));
    return HttpResponse.json({
      items: items.slice((page - 1) * 9, page * 9),
      total: items.length,
      page,
      pages: Math.max(1, Math.ceil(items.length / 9)),
      facets: {
        categories: db.nfts.reduce<Record<string, number>>((counts, nft) => {
          counts[nft.category] = (counts[nft.category] || 0) + 1;
          return counts;
        }, {}),
        networks: db.nfts.reduce<Record<string, number>>((counts, nft) => {
          counts[nft.network] = (counts[nft.network] || 0) + 1;
          return counts;
        }, {}),
      },
    });
  }),
  http.get("/api/nfts/:id", async ({ request, params }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const nft = db.nfts.find((n) => n.id === params.id);
    return nft
      ? HttpResponse.json(nft)
      : error(404, "NOT_FOUND", "NFT não encontrado.");
  }),
  http.get("/api/favorites", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    return HttpResponse.json(db.favorites[account(request)!.id] || []);
  }),
  http.put("/api/favorites/:id", async ({ request, params }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    if (!db.nfts.some((n) => n.id === params.id))
      return error(404, "NOT_FOUND", "NFT não encontrado.");
    const list = (db.favorites[account(request)!.id] ||= []);
    if (!list.includes(String(params.id))) list.push(String(params.id));
    save();
    return HttpResponse.json(list);
  }),
  http.delete("/api/favorites/:id", async ({ request, params }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    const list = (db.favorites[account(request)!.id] ||= []);
    db.favorites[account(request)!.id] = list.filter((x) => x !== params.id);
    save();
    return HttpResponse.json(db.favorites[account(request)!.id]);
  }),
  http.get("/api/cart", async ({ request }) => {
    const issue = await prepare(request);
    return issue || HttpResponse.json(cartFor(cartIdentity(request)));
  }),
  http.post("/api/cart/items", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const item = (await request.json()) as CartItem;
    const { nft, edition } = findEdition(item.nftId, item.editionId);
    if (!nft || !edition)
      return error(404, "NOT_FOUND", "Edição não encontrada.");
    const cart = cartFor(cartIdentity(request)),
      existing = cart.items.find(
        (x) => x.nftId === item.nftId && x.editionId === item.editionId,
      );
    const next = (existing?.quantity || 0) + item.quantity;
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      next > edition.available
    )
      return error(
        409,
        "AVAILABILITY",
        `Há apenas ${edition.available} unidades disponíveis.`,
      );
    if (existing) existing.quantity = next;
    else cart.items.push(item);
    save();
    return HttpResponse.json(cart);
  }),
  http.put("/api/cart/items/:id/:edition", async ({ request, params }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const { quantity } = (await request.json()) as { quantity: number };
    const { edition } = findEdition(String(params.id), String(params.edition));
    const cart = cartFor(cartIdentity(request)),
      item = cart.items.find(
        (x) => x.nftId === params.id && x.editionId === params.edition,
      );
    if (!item || !edition)
      return error(404, "NOT_FOUND", "Item não encontrado.");
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > edition.available
    )
      return error(
        409,
        "AVAILABILITY",
        `Há apenas ${edition.available} unidades disponíveis.`,
      );
    item.quantity = quantity;
    save();
    return HttpResponse.json(cart);
  }),
  http.delete("/api/cart/items/:id/:edition", async ({ request, params }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const cart = cartFor(cartIdentity(request));
    cart.items = cart.items.filter(
      (x) => x.nftId !== params.id || x.editionId !== params.edition,
    );
    save();
    return HttpResponse.json(cart);
  }),
  http.put("/api/cart/coupon", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const { coupon } = (await request.json()) as { coupon: string };
    const code = coupon.trim().toUpperCase();
    if (code && code !== "NEXUS10")
      return error(
        422,
        code === "EXPIRED" ? "EXPIRED" : "INVALID_COUPON",
        code === "EXPIRED" ? "Este cupom expirou." : "Cupom inválido.",
      );
    const cart = cartFor(cartIdentity(request));
    cart.coupon = code;
    save();
    return HttpResponse.json(cart);
  }),
  http.get("/api/quote", async ({ request }) => {
    const issue = await prepare(request);
    return issue || HttpResponse.json(quoteFor(cartIdentity(request)));
  }),
  http.get("/api/profile", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    return secured(request) || HttpResponse.json(account(request));
  }),
  http.put("/api/profile", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    const { name, bio, avatar } = (await request.json()) as User;
    if (!name?.trim() || name.trim().length < 2)
      return error(422, "VALIDATION", "Nome muito curto.", {
        name: "Informe pelo menos 2 caracteres.",
      });
    const user = account(request)!;
    Object.assign(user, {
      name: name.trim(),
      bio: String(bio || "").slice(0, 280),
      avatar: String(avatar || "").slice(0, 200),
    });
    save();
    return HttpResponse.json(user);
  }),
  http.put("/api/profile/password", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    const { current, next } = (await request.json()) as {
      current: string;
      next: string;
    };
    const user = account(request)!;
    if (db.hashes[user.id] !== (await hash(current)))
      return error(422, "VALIDATION", "Senha atual incorreta.", {
        current: "Senha atual incorreta.",
      });
    if (next.length < 8)
      return error(422, "VALIDATION", "Nova senha muito curta.", {
        next: "Use pelo menos 8 caracteres.",
      });
    db.hashes[user.id] = await hash(next);
    save();
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/wallets", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    return (
      secured(request) ||
      HttpResponse.json(db.wallets[account(request)!.id] || [])
    );
  }),
  http.post("/api/wallets", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    const input = (await request.json()) as Wallet;
    if (!/^0x[a-fA-F0-9]{40}$/.test(input.address || ""))
      return error(422, "VALIDATION", "Endereço inválido.", {
        address: "Use um endereço 0x com 40 caracteres hexadecimais.",
      });
    const wallets = (db.wallets[account(request)!.id] ||= []);
    if (
      wallets.some(
        (w) => w.address.toLowerCase() === input.address.toLowerCase(),
      )
    )
      return error(409, "DUPLICATE", "Carteira já cadastrada.");
    const wallet: Wallet = {
      id: crypto.randomUUID(),
      label: input.label?.trim() || "Minha carteira",
      address: input.address,
      network: input.network === "Polygon" ? "Polygon" : "Ethereum",
      primary: input.primary || wallets.length === 0,
    };
    if (wallet.primary) wallets.forEach((w) => (w.primary = false));
    wallets.push(wallet);
    save();
    return HttpResponse.json(wallet);
  }),
  http.put("/api/wallets/:id", async ({ request, params }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    const wallets = db.wallets[account(request)!.id] || [],
      wallet = wallets.find((w) => w.id === params.id);
    if (!wallet) return error(404, "NOT_FOUND", "Carteira não encontrada.");
    const input = (await request.json()) as Wallet;
    if (!/^0x[a-fA-F0-9]{40}$/.test(input.address || ""))
      return error(422, "VALIDATION", "Endereço inválido.", {
        address: "Use um endereço 0x com 40 caracteres hexadecimais.",
      });
    Object.assign(wallet, {
      label: input.label?.trim() || wallet.label,
      address: input.address,
      network: input.network,
      primary: input.primary,
    });
    if (wallet.primary)
      wallets.forEach((w) => {
        if (w.id !== wallet.id) w.primary = false;
      });
    save();
    return HttpResponse.json(wallet);
  }),
  http.get("/api/orders", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    db.orders
      .filter((o) => o.userId === account(request)!.id)
      .forEach(settleOrder);
    return HttpResponse.json(
      db.orders.filter((o) => o.userId === account(request)!.id),
    );
  }),
  http.get("/api/orders/:id", async ({ request, params }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    const order = db.orders.find(
      (o) => o.id === params.id && o.userId === account(request)!.id,
    );
    if (order) settleOrder(order);
    return order
      ? HttpResponse.json(order)
      : error(404, "NOT_FOUND", "Pedido não encontrado.");
  }),
  http.post("/api/orders", async ({ request }) => {
    const issue = await prepare(request);
    if (issue) return issue;
    const unauthorized = secured(request);
    if (unauthorized) return unauthorized;
    const input = (await request.json()) as {
      walletId: string;
      network: string;
      fingerprint: string;
      idempotencyKey: string;
      collectorName: string;
      collectorEmail: string;
    };
    const user = account(request)!,
      signature = JSON.stringify({
        walletId: input.walletId,
        network: input.network,
        fingerprint: input.fingerprint,
        collectorName: input.collectorName,
        collectorEmail: input.collectorEmail,
      });
    if (!input.idempotencyKey)
      return error(422, "VALIDATION", "Chave de idempotência obrigatória.");
    const attemptKey = `${user.id}:${input.idempotencyKey}`,
      previous = db.idempotency[attemptKey];
    if (previous) {
      if (previous.signature !== signature)
        return error(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Tentativa já usada com dados diferentes.",
        );
      const prior = db.orders.find((o) => o.id === previous.orderId)!;
      settleOrder(prior);
      return HttpResponse.json(prior);
    }
    if (
      !input.collectorName?.trim() ||
      !/^\S+@\S+\.\S+$/.test(input.collectorEmail || "")
    )
      return error(422, "VALIDATION", "Dados do colecionador inválidos.");
    const wallet = (db.wallets[user.id] || []).find(
      (w) => w.id === input.walletId,
    );
    if (!wallet)
      return error(422, "WALLET", "Selecione uma carteira cadastrada.");
    if (wallet.network !== input.network)
      return error(422, "NETWORK", "A rede deve corresponder à carteira.");
    const quote = quoteFor(user.id);
    if (!quote.valid)
      return error(409, "QUOTE_INVALID", quote.issues.join(" "), {
        quote: "Revise o carrinho.",
      });
    if (quote.fingerprint !== input.fingerprint)
      return error(
        409,
        "QUOTE_CHANGED",
        "O preço ou a disponibilidade mudou. Revise a nova cotação.",
      );
    const order: Order = {
      id: `NX-${String(db.counter++).padStart(6, "0")}`,
      userId: user.id,
      status: "pending",
      plannedStatus: db.scenario.payment,
      quote: structuredClone(quote),
      collectorName: input.collectorName.trim(),
      collectorEmail: input.collectorEmail,
      walletId: wallet.id,
      network: wallet.network,
      createdAt: new Date().toISOString(),
      txRef: `0x${crypto.randomUUID().replaceAll("-", "")}`,
    };
    db.orders.push(order);
    db.idempotency[attemptKey] = { signature, orderId: order.id };
    save();
    setTimeout(() => settleOrder(order), 1600);
    if (db.scenario.timeoutOrder) {
      db.scenario.timeoutOrder = false;
      save();
      return Response.error();
    }
    return HttpResponse.json(order, { status: 202 });
  }),
  http.post("/api/demo", async ({ request }) => {
    const { action, value } = (await request.json()) as {
      action: string;
      value?: string;
    };
    if (action === "reset") {
      reset();
      return HttpResponse.json({ ok: true });
    }
    if (action === "latency")
      db.scenario.latency = Math.max(0, Math.min(5000, Number(value || 0)));
    if (action === "fail-next") db.scenario.failNext = value || "/api/nfts";
    if (action === "expire") db.scenario.expire = true;
    if (action === "restore") db.scenario.expire = false;
    if (action === "decline") db.scenario.payment = "declined";
    if (action === "approve") db.scenario.payment = "confirmed";
    if (action === "timeout-order") db.scenario.timeoutOrder = true;
    if (action === "disconnect")
      for (const connection of connections) connection.rawClient.close();
    if (action === "price-up" || action === "sell-out") {
      const nft =
        db.nfts.find((n) => n.id === (value || "nft-1")) || db.nfts[0];
      if (action === "price-up")
        nft.editions[0].priceEth = String(
          (Number(nft.editions[0].priceEth) + 0.15).toFixed(3),
        );
      else nft.editions[0].available = 0;
      nft.version++;
      emit("nft.updated", {
        id: crypto.randomUUID(),
        resourceId: nft.id,
        version: nft.version,
      });
    }
    save();
    return HttpResponse.json({ ok: true });
  }),
];
