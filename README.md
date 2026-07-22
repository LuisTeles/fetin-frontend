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

Crie um arquivo `.env` baseado no `.env.example`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
```

### 3. Executar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3001](http://localhost:3001) (ou a porta atribuída) no navegador.

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

- [Regras de Negócio (`docs/business-rules.md`)](docs/business-rules.md)
