# KURIO — NFT Marketplace

Projeto em React e TypeScript para um desafio de frontend. Tem catálogo de NFTs, filtros, favoritos, carrinho, compra simulada e gerenciamento de conta e carteiras.

Os dados ficam no navegador e as chamadas de API são simuladas com MSW. Não há pagamento real nem integração com blockchain.

## Rodar o projeto

Use Node.js 20.19 ou superior e npm 10 ou superior.

```bash
npm ci
npm run dev
```

Abra http://127.0.0.1:5173.

Para testar o build de produção:

```bash
npm run build
npm run preview
```

Os mocks também funcionam no build. Para desativá-los, defina `VITE_MOCKS=off` em `.env.local`; nesse caso, é necessário fornecer uma API em `/api`.

## Contas de teste

| E-mail           | Senha    |
| ---------------- | -------- |
| ada@nexus.test   | Demo123! |
| bruno@nexus.test | Demo123! |

O cupom `NEXUS10` dá 10% de desconto. Use `EXPIRED` para testar um cupom expirado.

## Testar os cenários

No rodapé, abra **Cenários da demonstração**. Você pode alterar o preço ou esgotar o NFT 1, recusar o pagamento, simular perda da resposta de um pedido, falhar uma consulta, aumentar a latência, expirar a sessão ou interromper o socket.

Para testar mudanças de preço e estoque, coloque o NFT 1 no carrinho antes de ativar o cenário. Para recusar um pagamento, ative a opção antes de confirmar a compra. Depois de expirar a sessão, use **Restaurar sessão** para liberar as requisições novamente.

Os dados permanecem após atualizar a página. **Restaurar cenário padrão** apaga os dados da demonstração e volta às contas e ao catálogo iniciais.

## Comandos úteis

| Comando                | Para quê                      |
| ---------------------- | ----------------------------- |
| `npm run typecheck`    | Conferir os tipos             |
| `npm run lint`         | Verificar o código            |
| `npm run format`       | Formatar os arquivos          |
| `npm run format:check` | Conferir a formatação         |
| `npm run test:e2e`     | Executar os testes Playwright |
| `npm run test:e2e:ui`  | Abrir a interface dos testes  |
| `npm run audit`        | Executar o Lighthouse         |

Antes dos testes, instale o navegador com `npx playwright install chromium`. O relatório fica em `playwright-report`.

Para o Lighthouse, deixe o build rodando com `npm run preview` na porta 4173. Os relatórios ficam em `reports/lighthouse`.

As imagens dos personagens foram geradas a partir da referência visual e não são exportações originais do Figma. Os assets e a fonte IBM Plex Mono estão em `public`, com informações de origem e licença.
