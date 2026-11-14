# Arquitetura e decisões

## Atualização visual de 12/11/2026

A home foi extraída para `src/pages-home.tsx`, com composição baseada na captura do usuário: marca KURIO, hero com personagem, filtros laterais, três colunas desktop e duas mobile. `src/marketplace.css` contém os estilos da home e do cabeçalho; `src/styles.css` mantém os componentes das demais telas com a paleta quente. Fundo `#140d0a`, painel `#241612` e acento `#d28a4c` foram amostrados da captura. A fonte local IBM Plex Mono aproxima o aspecto monoespaçado; a família exata do Figma não foi obtida.

As imagens são cinco ilustrações geradas a partir da referência e otimizadas para WebP; não são assets originais exportados. A origem está documentada em `public/art/README.md`. Os SVGs antigos permanecem para preservar recibos salvos.

O catálogo contém 36 fixtures e devolve nove itens por página. `network` e `tab` passam pela URL, pelo Axios e pelo handler MSW. `tab=new` filtra o badge Novo; `tab=trending` filtra obras em destaque. As contagens de coleções e redes são calculadas sobre o catálogo completo pelo mock em `facets`, sem números fictícios na UI. As redes de NFTs incluem Solana para o filtro visual; as carteiras continuam com as redes suportadas anteriormente.

Ao recuperar o banco local, os dados de apresentação dos NFTs são atualizados a partir das fixtures. Preços, disponibilidade, versões, carrinhos, contas e snapshots de pedidos já existentes são preservados. Portanto, um navegador com cenário salvo pode exibir preços diferentes dos valores das fixtures de uma instalação nova.

Os testes foram atualizados para os nomes/preços das fixtures, o novo filtro e a abertura da busca. As esperas por conclusão de mutations e navegação também foram corrigidas. Isso não representa cobertura integral de todos os cenários exigidos no enunciado.

## Camadas

- `src/lib/types.ts`: contratos usados no transporte, mocks e interface.
- `src/lib/api.ts`: cliente Axios. Todas as chamadas REST da UI passam por aqui.
- `src/mocks`: fixtures, estado persistido e handlers MSW. A simulação é ligada antes da importação do app para que o `socket.io-client` use o WebSocket interceptado.
- `src/app.tsx`: TanStack Router, Query, sessão, layout e listeners Socket.IO.
- `src/pages*.tsx`: fluxos de descoberta, compra e conta.

## Consistência e persistência

O banco simulado é serializado em `localStorage`. Catálogo, carrinho, favoritos, carteiras e pedidos consultam esse único banco. A sessão usa token opaco criado pelo mock e recuperado pelo cliente após refresh. O carrinho do visitante é mesclado ao autenticar. Logout elimina o token, limpa o cache Query e desmonta a subscription da sessão. Chaves privadas de Query incluem o ID do usuário. Os handlers exigem autorização para favoritos, perfil, carteiras e pedidos.

O cálculo da cotação usa `decimal.js`, com ETH em strings. O recibo contém um snapshot da cotação e não muda quando o catálogo é alterado. A confirmação reduz apenas as quantidades compradas. Falhas e recusas deixam o carrinho intacto. O checkout reconsulta a cotação antes da revisão e o handler do pedido a valida novamente no envio. A chave de idempotência fica em `sessionStorage` até receber a resposta do pedido, permitindo repetir a tentativa após timeout sem criar outra compra.

## Query e tempo real

Consultas têm `staleTime` de 20 s, uma tentativa de retry e refetch ao focar a aba. A sessão tem 60 s de `staleTime`. Mutations não fazem retry automático. Favoritos usam atualização otimista com rollback. Catálogo usa a URL como chave de cache; o `AbortSignal` do Query é passado ao Axios para descartar respostas obsoletas. Mutations invalidam apenas os recursos relacionados.

O MSW usa `@mswjs/socket.io-binding` para responder ao handshake do cliente Socket.IO por WebSocket. Alterações de NFT e pedido emitem eventos reais pelo canal interceptado, não setters da UI. O cliente aceita somente eventos com versão maior que a última observada, ignora IDs duplicados e filtra pedidos por usuário. Ao reconectar, invalida recursos ativos para reconciliar por REST. A ligação suporta apenas namespace padrão e eventos de texto; não há acknowledgements nem anexos binários.

## UX, acessibilidade e visual

Filtros e paginação são parâmetros da URL; novos filtros voltam à página 1. Estados de carregamento preservam espaço com skeletons. Erros de rede exibem nova tentativa. Formulários usam labels, validação nativa e mensagens com `role="alert"`; feedback de operações usa `role="status"`. Controles têm foco visível e animações respeitam `prefers-reduced-motion`.

O arquivo Figma do enunciado retornou erro de acesso na leitura durante a implementação. Por isso o visual é uma interpretação própria da identidade de um marketplace de arte digital. Os 12 assets SVG locais em `public/art` foram gerados para manter a aplicação autocontida. A fidelidade ao Figma e o uso de assets originais dependem de acesso ao arquivo.

## Limitações

- Os dados são locais ao navegador. Abas diferentes no mesmo perfil podem compartilhar `localStorage`, mas eventos WebSocket não são distribuídos entre workers de abas distintas.
- A simulação de carteira não assina transações. Rede e endereço são validados pelo mock.
- O token e o hash de senha são apenas para a demonstração; não substituem autenticação em servidor.
- O controle de cenários no rodapé é intencionalmente visível no build para avaliação.
- Publicação, link de repositório e URL pública exigem contas e destinos do usuário. O código contém os mocks necessários para o build publicado.
