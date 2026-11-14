# KURIO — NFT Marketplace

A página inicial foi adaptada à referência visual com paleta marrom/laranja, filtros laterais, destaques e nove cards por página. As cinco ilustrações de personagens são geradas e inspiradas na referência, pois a exportação dos assets originais do Figma não ficou disponível. A fonte IBM Plex Mono é servida localmente, com licença em `public/fonts`. As credenciais e o cupom NEXUS10 continuam iguais aos descritos abaixo.

Marketplace demonstrativo em React e TypeScript para o desafio técnico. Todo o fluxo usa REST interceptado por MSW. Os eventos em tempo real passam por `socket.io-client` e pela ligação `@mswjs/socket.io-binding` no MSW. Não há blockchain nem pagamento real.

## Executar

Requisitos: Node.js 20.19+ e npm 10+.

```bash
npm ci
npx msw init public --save
npm run dev
```

Abra `http://127.0.0.1:5173`. Para o build de demonstração:

```bash
npm run build
npm run preview
```

Os mocks são ativados por padrão, inclusive no build. `VITE_MOCKS=off` desativa o worker para ligar a interface a um servidor REST próprio em `/api`. A camada de UI não possui dados alternativos quando os mocks estão desligados.

## Contas de teste

| E-mail             | Senha      |
| ------------------ | ---------- |
| `ada@nexus.test`   | `Demo123!` |
| `bruno@nexus.test` | `Demo123!` |

O cupom válido é `NEXUS10` (10% do subtotal). `EXPIRED` simula um cupom expirado. As senhas ficam como hashes SHA-256 nos dados simulados; este mecanismo não representa um backend de autenticação de produção.

## Cenários e reprodução

No rodapé, abra **Cenários da demonstração**. Os controles chamam `POST /api/demo`, portanto atualizam o mesmo estado usado pelos handlers REST e pelos eventos.

| Cenário              | Como reproduzir                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Alteração de preço   | Ponha o NFT 1 no carrinho, abra o checkout e acione **Aumentar preço do NFT 1**. A cotação nova exige outra revisão.                        |
| Edição esgotada      | Ponha o NFT 1 no carrinho e acione **Esgotar NFT 1**. A compra é bloqueada.                                                                 |
| Pagamento recusado   | Acione **Recusar próximo pagamento** antes de confirmar. O pedido termina como recusado e os itens ficam no carrinho.                       |
| Timeout após criação | Acione **Timeout após criar pedido**. Na tela de checkout, confirme e tente novamente. A chave de idempotência reaproveita o pedido criado. |
| Falha HTTP           | Acione **Falhar próxima consulta de NFTs** e atualize o catálogo. Use **Tentar novamente**.                                                 |
| Latência             | Acione **Carregamento lento (2 s)** e navegue; os skeletons são exibidos durante o carregamento.                                            |
| Sessão expirada      | Entre, acione **Expirar sessão** e navegue para uma rota privada. **Restaurar sessão** remove a falha simulada.                             |
| Queda do socket      | Acione **Interromper socket**. O cliente reconecta e reconsulta recursos ativos.                                                            |
| Reset                | **Restaurar cenário padrão** limpa contas criadas, pedidos, carrinho, favoritos e sessão e restaura as fixtures.                            |

Para testes automatizados, chame `POST /api/demo` com `{ "action": "reset" }` ao iniciar cada caso. A configuração é persistida em `localStorage` para resistir a refresh.

## Verificações

```bash
npm run typecheck
npm run lint
npm run test:e2e
npm run build
npm run preview
npm run audit
```

A formatação usa Prettier com dois espaços e configuração versionada. Para formatar o código e os documentos mantidos no projeto:

```bash
npm run format
npm run format:check
```

Dependências, build, relatórios, worker gerado, SVGs gerados e licenças são preservados pela configuração de exclusão. Os materiais pessoais de estudo e os relatórios internos da revisão não fazem parte da entrega; `README.md`, `ARCHITECTURE.md` e as informações de origem/licença dos assets devem permanecer.

Instale o Chromium do Playwright com `npx playwright install chromium` se necessário. O Playwright gera relatório HTML em `playwright-report` e preserva traces nas falhas. A auditoria Lighthouse requer o preview do build em `127.0.0.1:4173`; produz HTML/JSON em `reports/lighthouse`.

## Contratos

Todos os valores monetários transitam como strings decimais em ETH. Quantidades são inteiras. Respostas de erro têm `{ code, message, fields? }`.

| Método            | Rota                             | Responsabilidade                                           |
| ----------------- | -------------------------------- | ---------------------------------------------------------- |
| `GET/POST/DELETE` | `/api/session`                   | Consulta, login e logout                                   |
| `POST`            | `/api/users`                     | Cadastro                                                   |
| `GET`             | `/api/nfts`                      | Listagem com `q`, `category`, `min`, `max`, `sort`, `page` |
| `GET`             | `/api/nfts/:id`                  | Detalhe                                                    |
| `GET/PUT/DELETE`  | `/api/favorites[/:id]`           | Favoritos autenticados                                     |
| `GET`             | `/api/cart`                      | Carrinho visitante ou do usuário                           |
| `POST/PUT/DELETE` | `/api/cart/items[/:id/:edition]` | Inclusão, quantidade, remoção                              |
| `PUT`             | `/api/cart/coupon`               | Aplica/remove cupom                                        |
| `GET`             | `/api/quote`                     | Cotação atual e fingerprint                                |
| `GET/POST`        | `/api/orders`                    | Lista e cria pedido                                        |
| `GET`             | `/api/orders/:id`                | Estado e recibo congelado                                  |
| `GET/PUT`         | `/api/profile`                   | Perfil                                                     |
| `PUT`             | `/api/profile/password`          | Senha                                                      |
| `GET/POST/PUT`    | `/api/wallets[/:id]`             | Carteiras                                                  |
| `POST`            | `/api/demo`                      | Seleção e reset de cenários                                |

`POST /api/orders` recebe `walletId`, `network`, `fingerprint` e `idempotencyKey`. A mesma chave e o mesmo conteúdo devolvem o mesmo pedido; a mesma chave com conteúdo diferente devolve `409`. Uma cotação que mudou devolve `409 QUOTE_CHANGED`. O pedido começa `pending` e termina `confirmed` ou `declined`.

O socket usa o caminho `/socket.io/`, transporte WebSocket, namespace padrão e eventos `nft.updated` e `order.updated`. Cada payload tem `id`, `resourceId` e `version`; pedidos também têm `userId`. O cliente ignora duplicatas/versões antigas, filtra por usuário e revalida os recursos por REST após reconectar.

Veja [ARCHITECTURE.md](./ARCHITECTURE.md) para decisões de sessão, cache, consistência e limites conhecidos.
