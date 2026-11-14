import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Heart,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Expand,
} from "lucide-react";
import { routes, useNotice, useSession } from "./app";
import { http, messageOf } from "./lib/api";
import { eth } from "./lib/utils";
import type { CatalogResponse, CatalogSearch, NFT } from "./lib/types";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Dialog, DialogContent } from "./components/ui/dialog";

const collections = [
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
const networks = ["Ethereum", "Polygon", "Solana"];
const tabs = [
  { value: "all", label: "Todos os NFTs" },
  { value: "new", label: "Novos lançamentos" },
  { value: "trending", label: "Em alta" },
] as const;
const emptySearch: Required<CatalogSearch> = {
  q: "",
  category: "",
  network: "",
  tab: "all",
  min: "",
  max: "",
  sort: "recent",
  page: 1,
};
const shortPrice = (value: string) =>
  value.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");

function LoadingCards() {
  return (
    <div className="nft-grid" aria-label="Carregando NFTs" aria-busy="true">
      {Array.from({ length: 9 }, (_, index) => (
        <div className="nft-card" key={index}>
          <div className="skeleton card-image-skeleton" />
          <div className="skeleton card-title-skeleton" />
          <div className="skeleton card-price-skeleton" />
        </div>
      ))}
    </div>
  );
}

function NFTCard({ nft }: { nft: NFT }) {
  const { data: session } = useSession();
  const user = session?.user;
  const qc = useQueryClient(),
    notify = useNotice(),
    navigate = useNavigate();
  const { data: favorites } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: http.favorites,
    enabled: !!user,
  });
  const active = favorites?.includes(nft.id) || false;
  const edition =
    nft.editions.find((item) => item.available > 0) || nft.editions[0];
  const favorite = useMutation({
    mutationFn: (value: boolean) => http.favorite(nft.id, value),
    onMutate: async (value) => {
      const key = ["favorites", user?.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<string[]>(key);
      qc.setQueryData<string[]>(key, (old) =>
        value
          ? [...new Set([...(old || []), nft.id])]
          : (old || []).filter((id) => id !== nft.id),
      );
      return { previous };
    },
    onError: (error, _, context) => {
      qc.setQueryData(["favorites", user?.id], context?.previous);
      notify(messageOf(error));
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });
  const add = useMutation({
    mutationFn: () =>
      http.addCart({ nftId: nft.id, editionId: edition.id, quantity: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["quote"] });
      notify(`${nft.title} adicionado ao carrinho.`);
    },
    onError: (error) => notify(messageOf(error)),
  });
  return (
    <article className="nft-card">
      <div className="nft-artwork">
        <Link to="/nft/$id" params={{ id: nft.id }} className="nft-image-link">
          <img
            src={nft.image}
            alt={nft.title}
            width={512}
            height={512}
            loading="eager"
            decoding="sync"
          />
        </Link>
        {nft.badge && <span className="nft-badge">{nft.badge}</span>}
        <div className="card-quick-actions">
          <button
            aria-label={`Adicionar ${nft.title} ao carrinho`}
            disabled={add.isPending || !edition.available}
            onClick={() => add.mutate()}
          >
            <ShoppingCart size={17} />
          </button>
          <button
            aria-label={
              active
                ? `Remover ${nft.title} dos favoritos`
                : `Favoritar ${nft.title}`
            }
            aria-pressed={active}
            disabled={favorite.isPending}
            onClick={() =>
              user
                ? favorite.mutate(!active)
                : navigate({
                    to: "/login",
                    search: { redirect: location.pathname + location.search },
                  })
            }
          >
            <Heart size={17} fill={active ? "currentColor" : "none"} />
          </button>
          <Link
            to="/nft/$id"
            params={{ id: nft.id }}
            aria-label={`Ver detalhes de ${nft.title}`}
          >
            <Expand size={17} />
          </Link>
        </div>
      </div>
      <div className="nft-card-body">
        <Link to="/nft/$id" params={{ id: nft.id }} className="card-title">
          {nft.title}
        </Link>
        <div className="card-price">
          <strong>{eth(shortPrice(nft.editions[0].priceEth))}</strong>
          {nft.previousPriceEth && <del>{eth(nft.previousPriceEth)}</del>}
          {!edition.available && <span className="sold-out">Esgotado</span>}
        </div>
      </div>
    </article>
  );
}

function CatalogFilters({
  search,
  facets,
  onChange,
}: {
  search: Required<CatalogSearch>;
  facets?: CatalogResponse["facets"];
  onChange: (part: Partial<CatalogSearch>) => void;
}) {
  const [minimum, setMinimum] = useState(search.min || "0.02");
  const [maximum, setMaximum] = useState(search.max || "12.30");
  useEffect(() => {
    setMinimum(search.min || "0.02");
    setMaximum(search.max || "12.30");
  }, [search.min, search.max]);
  const active = !!(
    search.category ||
    search.network ||
    search.min ||
    search.max
  );
  return (
    <div className="facet-panel">
      <fieldset>
        <legend>Coleções</legend>
        <div className="collection-options">
          {collections.map((category) => (
            <button
              type="button"
              aria-label={category}
              aria-pressed={search.category === category}
              className={search.category === category ? "is-selected" : ""}
              key={category}
              onClick={() =>
                onChange({
                  category: search.category === category ? "" : category,
                })
              }
            >
              <span>{category}</span>
              <span>({facets?.categories[category] ?? "—"})</span>
            </button>
          ))}
        </div>
      </fieldset>
      <form
        className="range-filter"
        onSubmit={(event) => {
          event.preventDefault();
          onChange({ min: minimum, max: maximum });
        }}
      >
        <fieldset>
          <legend>Faixa de preço</legend>
          <div className="range-track">
            <input
              type="range"
              min="0"
              max="12.3"
              step="0.01"
              aria-label="Preço mínimo (ETH)"
              value={minimum}
              onChange={(event) =>
                setMinimum(
                  String(Math.min(Number(event.target.value), Number(maximum))),
                )
              }
            />
            <input
              type="range"
              min="0"
              max="12.3"
              step="0.01"
              aria-label="Preço máximo (ETH)"
              value={maximum}
              onChange={(event) =>
                setMaximum(
                  String(Math.max(Number(event.target.value), Number(minimum))),
                )
              }
            />
          </div>
          <p className="range-caption">
            Preço:{" "}
            {Number(minimum).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}{" "}
            –{" "}
            {Number(maximum).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}{" "}
            ETH
          </p>
          <Button type="submit" size="sm">
            Aplicar
          </Button>
        </fieldset>
      </form>
      <fieldset>
        <legend>Rede</legend>
        <div className="collection-options">
          {networks.map((network) => (
            <button
              type="button"
              aria-label={`Filtrar por ${network}`}
              aria-pressed={search.network === network}
              className={search.network === network ? "is-selected" : ""}
              key={network}
              onClick={() =>
                onChange({ network: search.network === network ? "" : network })
              }
            >
              <span>{network}</span>
              <span>({facets?.networks[network] ?? "—"})</span>
            </button>
          ))}
        </div>
      </fieldset>
      {active && (
        <button
          type="button"
          className="clear-filters"
          onClick={() =>
            onChange({ category: "", network: "", min: "", max: "" })
          }
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

export function HomePage() {
  const parsed = routes.home.useSearch();
  const hash = useRouterState({ select: (state) => state.location.hash });
  const search: Required<CatalogSearch> = { ...emptySearch, ...parsed };
  const navigate = useNavigate();
  const [term, setTerm] = useState(search.q),
    [heroIndex, setHeroIndex] = useState(0),
    [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => setTerm(search.q), [search.q]);
  useEffect(() => {
    if (hash === "catalog-search")
      document.getElementById("catalog-query")?.focus();
  }, [hash]);
  const query = useQuery({
    queryKey: ["catalog", search],
    queryFn: ({ signal }) => http.catalog(search, signal),
    placeholderData: (previous) => previous,
  });
  const featured = useQuery({
    queryKey: ["catalog", "featured"],
    queryFn: ({ signal }) => http.catalog({ page: 1 }, signal),
  });
  const change = (part: Partial<CatalogSearch>) =>
    navigate({ to: "/", search: { ...search, ...part, page: part.page || 1 } });
  const hero = featured.data?.items[heroIndex];
  const spotlight = featured.data?.items[3];
  const hasFilters = !!(
    search.q ||
    search.category ||
    search.network ||
    search.min ||
    search.max ||
    search.tab !== "all"
  );
  return (
    <div className="market-home">
      <section className="hero" aria-label="Destaques da coleção">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-welcome">Bem-vindo à Kurio</p>
            <h1>
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>
            <p className="hero-description">
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              <br className="desktop-break" /> Colecione arte digital rara,
              apoie artistas e tenha uma parte da cultura da internet.
            </p>
            <a href="#collections" className="button button-default hero-cta">
              EXPLORAR
            </a>
          </div>
          <div className="hero-art">
            {hero ? (
              <Link
                to="/nft/$id"
                params={{ id: hero.id }}
                className="hero-feature"
                aria-label={`Conhecer ${hero.title}`}
              >
                <img
                  src={hero.image}
                  alt={hero.title}
                  width={512}
                  height={512}
                  fetchPriority="high"
                />
              </Link>
            ) : featured.isError ? (
              <div className="hero-load-error" role="alert">
                <p>Não foi possível carregar o destaque.</p>
                <Button variant="outline" onClick={() => featured.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <div className="skeleton hero-image-skeleton" />
            )}
            <div className="hero-pagination" aria-label="Escolher destaque">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  aria-label={`Ver destaque ${index + 1}`}
                  aria-pressed={heroIndex === index}
                  className={heroIndex === index ? "active" : ""}
                  onClick={() => setHeroIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      <section
        id="collections"
        className="container marketplace-section"
        aria-label="Catálogo de NFTs"
      >
        <h2 className="sr-only">Explore o mercado de NFTs</h2>
        <form
          id="catalog-search"
          className={`catalog-search ${search.q || hash === "catalog-search" ? "search-active" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            change({ q: term.trim() });
          }}
        >
          <Search size={17} />
          <Input
            id="catalog-query"
            aria-label="Buscar obras ou artistas"
            placeholder="Explorar coleções"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <button type="submit" aria-label="Pesquisar">
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            className="mobile-filter-trigger"
            aria-label="Abrir filtros"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={18} />
          </button>
        </form>
        <aside className="catalog-sidebar" aria-label="Filtros do catálogo">
          <CatalogFilters
            search={search}
            facets={featured.data?.facets}
            onChange={change}
          />
          {spotlight && (
            <Link
              to="/nft/$id"
              params={{ id: spotlight.id }}
              className="spotlight-card"
            >
              <span>NFT EM DESTAQUE</span>
              <strong>OFERTA LIMITADA</strong>
              <img
                src={spotlight.image}
                alt={`NFT em destaque: ${spotlight.title}`}
                width={310}
                height={380}
                loading="lazy"
              />
            </Link>
          )}
        </aside>
        <div className="catalog-results">
          <div className="catalog-controls">
            <div className="catalog-tabs" aria-label="Seleção do catálogo">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  aria-pressed={search.tab === tab.value}
                  className={search.tab === tab.value ? "active" : ""}
                  onClick={() => change({ tab: tab.value })}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <label className="catalog-sort">
              <span>Ordenar por:</span>
              <select
                aria-label="Ordenar por"
                value={search.sort}
                onChange={(event) =>
                  change({ sort: event.target.value as CatalogSearch["sort"] })
                }
              >
                <option value="recent">Listados recentemente</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="title">Título A–Z</option>
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
          {hasFilters && (
            <div className="active-filter-summary">
              <span>{query.data?.total ?? "…"} NFTs encontrados</span>
              <button
                onClick={() => {
                  setTerm("");
                  navigate({ to: "/", search: emptySearch });
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
          {query.isFetching && !query.isPending && (
            <p className="updating" role="status">
              Atualizando resultados…
            </p>
          )}
          {query.isPending ? (
            <LoadingCards />
          ) : query.isError ? (
            <div role="alert" className="state-panel">
              <h2>Não foi possível carregar</h2>
              <p>{messageOf(query.error)}</p>
              <Button onClick={() => query.refetch()}>Tentar novamente</Button>
            </div>
          ) : query.data.items.length ? (
            <div className="nft-grid">
              {query.data.items.map((nft) => (
                <NFTCard key={nft.id} nft={nft} />
              ))}
            </div>
          ) : (
            <div className="state-panel">
              <h3>Nenhuma obra encontrada</h3>
              <p>Tente outros termos ou filtros.</p>
              <Button
                onClick={() => navigate({ to: "/", search: emptySearch })}
              >
                Limpar filtros
              </Button>
            </div>
          )}
          {!!query.data && query.data.pages > 1 && (
            <nav aria-label="Paginação do catálogo" className="pagination">
              <button
                className="pagination-arrow"
                aria-label="Anterior"
                disabled={search.page <= 1}
                onClick={() => change({ page: search.page - 1 })}
              >
                <ArrowLeft size={14} />
              </button>
              {Array.from(
                { length: query.data.pages },
                (_, index) => index + 1,
              ).map((page) => (
                <button
                  key={page}
                  aria-label={`Ir para página ${page}`}
                  aria-current={search.page === page ? "page" : undefined}
                  className={search.page === page ? "current" : ""}
                  onClick={() => change({ page })}
                >
                  {page}
                </button>
              ))}
              <button
                className="pagination-arrow"
                aria-label="Próxima"
                disabled={search.page >= query.data.pages}
                onClick={() => change({ page: search.page + 1 })}
              >
                <ArrowRight size={14} />
              </button>
            </nav>
          )}
        </div>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent title="Filtrar NFTs">
            <CatalogFilters
              search={search}
              facets={featured.data?.facets}
              onChange={change}
            />
            <Button className="w-full" onClick={() => setFiltersOpen(false)}>
              Ver resultados
            </Button>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
