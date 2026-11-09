# AGENTS.md — Nexo Finance

Instruções mandatórias para Antigravity, Codex, Cursor, Claude e qualquer agente de IA que atue neste repositório.

## REGRA DE OURO DE SEGURANÇA E CREDENCIAIS (ESTRITA E INEGOCIÁVEL)

1. **NUNCA INSERIR CREDENCIAIS REAIS EM CÓDIGO FONTE:**
   - Jamais commitar ou embutir chaves de API, senhas, tokens de serviço, segredos ou chaves privadas (Firebase `AIzaSy...`, Asaas `$aact_...`, Pluggy `v0Z6ut_...`, tokens JWT, AWS, GCP) em qualquer arquivo de código `.ts`, `.tsx`, `.js`, `.json` ou documentação pública.
2. **PROIBIDO INLINE FALLBACKS COM CHAVES REAIS:**
   - Nunca faça `process.env.API_KEY ?? 'AIzaSy...'` ou qualquer fallback com credenciais reais. Se a variável não estiver definida no ambiente, o valor deve ser vazio `''` ou lançar erro explicativo.
3. **ARQUIVOS DE EXEMPLO (.env.example):**
   - Devem conter EXCLUSIVAMENTE placeholders vazios ou descritivos (ex.: `NEXT_PUBLIC_FIREBASE_API_KEY=sua_firebase_api_key_aqui`). Jamais utilize dados de projetos reais.
4. **CREDENCIAIS APENAS EM VARIÁVEIS DE AMBIENTE:**
   - As credenciais vivem unicamente em `.env.local` (ignorado pelo git) e no painel da Vercel / Firebase Console.
5. **VERIFICAÇÃO OBRIGATÓRIA ANTES DE COMMITS:**
   - Antes de qualquer commit, valide com `git diff --staged` e confirme que nenhum arquivo rastreado contenha tokens, chaves ou credenciais.

