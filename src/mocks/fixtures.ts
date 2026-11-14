import type { NFT, User, Wallet } from "../lib/types";

// IDs stay stable so saved carts and order receipts keep their references.
const portraits = [
  ["Emerald Ape #042", "emerald-ape", "1.19"],
  ["Sage Nomad #009", "sage-nomad", "1.69"],
  ["Neon Vessel #552", "neon-vessel", "1.99"],
  ["Cosmic Bloom #118", "sage-nomad", "1.29"],
  ["Violet Nomad #314", "sage-nomad", "1.39"],
  ["Ivory Baron #988", "neon-vessel", "1.79"],
  ["Golden Beat #207", "golden-beat", "0.99"],
  ["Golden Pulse #083", "golden-beat", "0.59"],
  ["Golden Signal #160", "golden-signal", "0.39"],
] as const;
const categories = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativo",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];
const artists = [
  "Maya Chen",
  "Alex Rivera",
  "Sofia Laurent",
  "Noah Williams",
  "Luna Park",
  "Kai Nakamura",
];
const networks = ["Ethereum", "Polygon", "Solana"] as const;

export const seedNfts: NFT[] = Array.from({ length: 36 }, (_, i) => {
  const [name, portrait, price] = portraits[i % portraits.length];
  const title =
    i < 9
      ? name
      : `${name.split(" #")[0]} #${String(200 + i * 7).padStart(3, "0")}`;
  return {
    id: `nft-${i + 1}`,
    title,
    artist: artists[i % artists.length],
    category: categories[i % categories.length],
    network: networks[Math.floor(i / 9) % networks.length],
    description: `Um colecionável digital da coleção Kurio Editions. ${title} combina personalidade, detalhes artesanais e uma edição limitada para sua coleção.`,
    image: `/art/${portrait}.webp`,
    featured: i % 3 === 0,
    badge: i % 7 === 2 ? "Raro" : i >= 27 ? "Novo" : undefined,
    previousPriceEth: i === 2 ? "2.29" : undefined,
    version: 1,
    editions: [
      {
        id: "standard",
        name: "Standard",
        available: 8 + (i % 5),
        priceEth: price,
      },
      {
        id: "rare",
        name: "Rare",
        available: 2 + (i % 3),
        priceEth: (Number(price) + 0.5).toFixed(2),
      },
    ],
  };
});

export const seedUsers: User[] = [
  {
    id: "u-ada",
    name: "Ada Lovelace",
    email: "ada@nexus.test",
    avatar: "AL",
    bio: "Colecionadora de arte digital e mundos imaginários.",
  },
  {
    id: "u-bruno",
    name: "Bruno Costa",
    email: "bruno@nexus.test",
    avatar: "BC",
    bio: "Explorando o futuro da arte.",
  },
];

export const seedWallets: Record<string, Wallet[]> = {
  "u-ada": [
    {
      id: "w-ada",
      label: "Minha carteira",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "Ethereum",
      primary: true,
    },
  ],
  "u-bruno": [
    {
      id: "w-bruno",
      label: "Carteira principal",
      address: "0xabcdef1234567890abcdef1234567890abcdef12",
      network: "Polygon",
      primary: true,
    },
  ],
};
