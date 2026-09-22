# Fetin Frontend — Plataforma de Gestão Acadêmica Inteligente

Frontend web moderno desenvolvido com **Next.js (App Router)**, **TypeScript**, **TailwindCSS** e **shadcn/ui**, integrado à API backend NestJS.

---

## 🌟 Funcionalidades Principais

- **Dashboard Analítico**: Gráficos e KPIs de ritmo de estudo, mapas de calor de atividade e progresso de retenção.
- **Notas Rápidas (Quick Notes)**:
  - **Frictionless Capture**: Editor Markdown completo (< 5.000 caracteres) com barra de ferramentas e pré-visualização em tempo real.
  - **Color Tagging**: Sistema de marcadores coloridos com seletor de paletas pré-definidas e criador de tags personalizadas.
  - **Vínculos Relacionais Searchable**: Vínculo a Disciplinas, Tópicos ou Provas através de dropdown com busca ao vivo.
  - **Inline `@` Mentions**: Menu popover autocompletável para mencionar disciplinas, tópicos, provas e notas com a sintaxe `@tipo:UUID[Rótulo]`, renderizadas como pills coloridas interativas.
  - **Gaveta Global (Drawer)**: Acesso instantâneo de qualquer página via Botão Flutuante (FAB) ou atalho de teclado `Option+N` (`Alt+N`) / `Cmd+Shift+K`.
  - **Visualização em Tela Cheia**: Página dedicada (`/notes/[id]`) para leitura sem distrações, navegação por notas conectadas e edição direta.
- **Calendário & Agendamento Automático**: Cronogramas inteligentes ajustados à disponibilidade do estudante.
- **Gestão de Disciplinas & Provas**: Organização de tópicos, pesos e retenção de memória.

---

## 🚀 Como Executar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# URL base da API NestJS. Lida somente no servidor (route handlers).
BACKEND_API_URL="http://localhost:3000/api/v1"
```

`lib/api-config.ts` resolve a URL nesta ordem: `BACKEND_API_URL` →
`NEXT_PUBLIC_API_BASE_URL` → `http://localhost:3000/api/v1`.

> [!IMPORTANT]
> Prefira `BACKEND_API_URL`. Como todas as chamadas ao backend partem dos route
> handlers (veja [Arquitetura](#-arquitetura)), a URL nunca precisa chegar ao navegador —
> usar um nome `NEXT_PUBLIC_*` a embutiria no bundle sem necessidade.


### 3. Executar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3001](http://localhost:3001) (ou a porta atribuída) no navegador.

---

## 🏗️ Arquitetura

O navegador **nunca** fala com o NestJS diretamente e **nunca** enxerga um token.
Cada chamada passa por um route handler do Next em `app/api/`, que atua como um
**BFF (Backend-For-Frontend)**:

```
 Componente client            Route handler (servidor)              NestJS
 ------------------           ------------------------              ------
 fetch("/api/subjects")  ──▶  lê fetin_access_token (httpOnly)
                              forwardToBackend("/subjects")   ──▶   GET /api/v1/subjects
                                                                       │
                              ◀── 401? refreshTokensFromCookie() ─────┘
                                  e repete a requisição uma vez
                         ◀──  { subjects: [...] }
```

Toda a lógica de sessão vive em `lib/server-auth.ts`:

| Helper | Responsabilidade |
| :--- | :--- |
| `forwardToBackend()` | `fetch` para o NestJS com `cache: "no-store"` |
| `getAccessTokenFromCookie()` | Lê `fetin_access_token` |
| `refreshTokensFromCookie()` | Renova a sessão; em caso de falha, limpa os cookies |
| `writeAuthCookies()` | Grava `fetin_access_token` (15 min) e `fetin_refresh_token` (7 dias) |
| `clearAuthCookies()` | Logout |
| `getMessageFromApiError()` | Normaliza o erro do NestJS (string ou array) em uma mensagem |

Os dois cookies são `httpOnly`, `sameSite=lax` e `secure` em produção — nenhum script
do navegador consegue lê-los.

> [!WARNING]
> **A renovação de sessão está quebrada hoje.** O `POST /auth/login` do backend não
> devolve mais `refresh_token` no corpo da resposta (ele vai apenas no cookie httpOnly
> do próprio backend), e `refreshTokensFromCookie()` envia o token no **corpo** da
> requisição enquanto o backend o lê apenas do **cabeçalho `Cookie`**. O resultado é
> `401 REFRESH_TOKEN_MISSING` em toda renovação: o usuário é deslogado silenciosamente
> cerca de 15 minutos após o login. Corrija em **um** dos lados — aceitando o
> `refresh_token` do corpo no `AuthController.refresh()` do backend, ou encaminhando o
> cabeçalho `Cookie` a partir daqui.

### Mapa de rotas

| Grupo | Rotas | Observação |
| :--- | :--- | :--- |
| `app/(auth)/` | `/login`, `/signup` | Sem sessão |
| `app/(dashboard)/` | `/dashboard`, `/me`, `/subjects`, `/subjects/[id]`, `/exams`, `/calendar`, `/availability`, `/auto-schedule`, `/notes`, `/notes/[id]`, `/admin/users` | O layout redireciona para `/login` sem cookie de sessão |
| `app/api/` | `auth`, `subjects`, `topics`, `exams`, `schedules`, `availability`, `dashboard`, `notes`, `tags`, `tasks`, `admin` | Proxy BFF para o NestJS |

O link **Painel Admin** só é renderizado quando o payload do JWT traz `role === "ADMIN"`.
Esse decode é feito sem verificação de assinatura e serve **apenas** para decidir o que
mostrar na navegação — a autorização real é sempre do backend.

### Modo de visualização (impersonação)

Um administrador abre o painel de outro usuário navegando com `?userId=<uuid>`. A query
string é a única fonte de verdade desse estado: ela alimenta o `ImpersonationBanner`
amarelo e o cabeçalho `x-impersonate-user-id` que os route handlers repassam ao backend.
Como o backend rejeita qualquer método diferente de `GET` durante a impersonação, o modo
é somente leitura.

> [!NOTE]
> O cabeçalho é repassado em 14 route handlers, mas **não** em `app/api/notes/*` nem em
> `app/api/tags/*`. Durante a impersonação, notas e tags exibidas continuam sendo as do
> próprio administrador.

---

## ☁️ Deploy

O deploy é feito pelo **AWS Amplify**, configurado em `amplify.yml`: `npm ci`, injeção
das variáveis `NEXT_PUBLIC_*` e `BACKEND_*` em `.env.production` e `npm run build`,
publicando `.next` com cache de `node_modules` e `.next/cache`.

A injeção em tempo de build é necessária porque o Next.js resolve variáveis de ambiente
na compilação, não na execução.

---

## 📁 Estrutura de Componentes das Notas Rápidas

```
components/notes/
├── global-note-fab.tsx          # Botão flutuante (FAB) & atalho global (Alt+N / Cmd+Shift+K)
├── quick-note-drawer.tsx        # Painel lateral slide-in para captura rápida de notas
├── note-card.tsx                # Card de pré-visualização com menu de ações e acionador de tela cheia
├── note-form.tsx                # Formulário completo de criação/edição de notas
├── markdown-toolbar.tsx         # Barra de ferramentas de formatação Markdown com botão @
├── markdown-preview.tsx         # Renderizador de pré-visualização de Markdown estendido
├── inline-mention-popover.tsx   # Popover autocompletável para menções @ de entidades
├── wiki-link-renderer.tsx       # Renderizador de pills coloridas para sintaxe @tipo:UUID[Rótulo]
├── entity-selector-dropdown.tsx # Dropdown searchable de Disciplinas/Tópicos/Provas
├── tag-selector-dropdown.tsx    # Multi-seletor dropdown de tags coloridas
├── tag-manager.tsx              # Gerenciador de criação/edição/exclusão de tags
└── color-palette-picker.tsx     # Seletor de cores hex com 8 presets de estudo
```

---

## 📖 Documentação Adicional

As regras de negócio são mantidas em um único lugar, no repositório do backend:
[`Fetin-backend/docs/business-rules.md`](../Fetin-backend/docs/business-rules.md).
O arquivo local [`docs/business-rules.md`](docs/business-rules.md) é apenas um ponteiro.

Convenções para agentes de código estão em [`AGENTS.md`](AGENTS.md) — esta versão do
Next.js tem mudanças que quebram compatibilidade com o que os modelos aprenderam, então
consulte `node_modules/next/dist/docs/` antes de escrever código.
