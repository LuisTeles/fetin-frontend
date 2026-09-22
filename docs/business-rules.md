# Regras de Negócio — ponteiro

As regras de negócio da plataforma são mantidas em **um único lugar**, no repositório do
backend:

👉 [`Fetin-backend/docs/business-rules.md`](../../Fetin-backend/docs/business-rules.md)

---

## Por que este arquivo não tem mais o conteúdo

Este arquivo era uma cópia integral do documento do backend. As duas cópias já haviam
divergido nos dois sentidos:

- a cópia do frontend tinha uma seção **§3.6 NOTES & TAGS** que não existia no backend;
- a cópia do backend recebeu depois as seções **§6 a §9** (rotina semanal, módulos de
  produtividade, controle de acesso e status de implementação) que nunca chegaram aqui.

Nada se perdeu na consolidação: as regras `RN-NOT-*`, `RN-TAG-*` e `RN-LNK-*` que só
existiam neste arquivo foram reescritas a partir do código e hoje vivem em
**§7.2, §7.3 e §7.4** do documento do backend.

Uma correção veio junto: a antiga `RN-NOT-03` dizia que o título automático usa os
primeiros **80** caracteres da primeira linha do conteúdo. O código
(`NotesService.extractAutoTitle`) usa **150**. O documento do backend registra 150.

## Onde encontrar cada assunto

| Assunto | Seção no documento do backend |
| :--- | :--- |
| Usuários, disciplinas, tópicos, provas | §2 |
| Cronogramas, sessões de estudo, retenção | §3 |
| Algoritmo de geração de cronograma (7 etapas) | §4 |
| Integridade referencial | §5 |
| Rotina semanal e disponibilidade derivada | §6 |
| Tarefas, notas, vínculos entre notas e tags | §7 |
| Roles, impersonação e ciclo de vida dos tokens | §8 |
| Regras não implementadas ou parciais | §9 |

Ao alterar uma regra, altere-a **apenas** no backend e ajuste esta tabela se uma seção
nova aparecer.
