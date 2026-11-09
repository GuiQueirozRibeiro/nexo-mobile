# Nexo Finance Mobile (`nexo-mobile`) — React Native + Expo + Clean Architecture

Aplicativo móvel oficial do ecossistema **Nexo Finance (by Exímia Tech)** sob o bundle identifier `br.com.eximiatech.nexo`.

Segue a mesma arquitetura de repositórios irmãos homologada no **ArenaX** (`arenax-web` + `arenax-mobile`) e no **App_Nasa** (`core`, `mobile`, `web`):

- **Backend BFF Centralizado (`https://nexo.eximiatech.com.br/api/*`):**
  - Nenhuma chave privada (`ASAAS_API_KEY`, `PLUGGY_CLIENT_SECRET`, `ASAAS_WEBHOOK_TOKEN`) existe no código mobile.
  - Todas as operações de emissão de QR Code PIX, transferências Asaas, token Pluggy Open Finance e conciliação de Webhooks passam pelo BFF via `NexoBffApiDataSource` (`src/data/datasources/nexo-bff-api.datasource.ts`).
- **Mesmo Banco em Tempo Real (`nexo-eximiatech`):**
  - Sincroniza as 6 tabelas corporativas (`accounts`, `transactions`, `credit_cards`, `budgets_cost_centers`, `recurring_subscriptions`, `pix_keys_contacts`) no documento `users/{uid}/finance/snapshot` do Cloud Firestore.
- **Camadas Compartilhadas (100% TypeScript Estrito — Zero `any`):**
  - `src/core/`: `Either<L, R>`, `Failure`, `Result`, `FlavorConfig`, `BRAZILIAN_BANKS`.
  - `src/domain/`: Entidades OOP, `PixKeyValidator`, `PierreFinancialEngine`, `WebhookReconciliationEngine` e `UseCases`.
  - `src/data/`: `NexoBffApiDataSource`, repositórios e mappers.
