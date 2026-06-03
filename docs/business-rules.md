# Regras de Negócio
## Plataforma de Gestão Acadêmica Inteligente
**Versão 1.0 — 2025**

---

## 1. Visão Geral

A plataforma tem como objetivo automatizar a gestão acadêmica do estudante, substituindo o planejamento manual por um sistema inteligente de agendamento baseado em dados. O sistema processa informações de disciplinas, tópicos, provas e disponibilidade do usuário para gerar cronogramas de estudo otimizados, incorporando conceitos de repetição espaçada e curva de esquecimento (Ebbinghaus).

Este documento descreve as regras de negócio que governam cada entidade do banco de dados e o comportamento esperado do sistema em cada operação.

---

## 2. Entidades e Regras de Negócio

### 2.1 USERS — Usuários

Entidade central do sistema. Cada conta representa um estudante com sua própria base de disciplinas, disponibilidade e cronogramas de estudo.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-USR-01 | Todo usuário deve possuir um endereço de e-mail válido e único no sistema. Não é permitido o cadastro de dois usuários com o mesmo e-mail. |
| RN-USR-02 | A senha deve ser armazenada exclusivamente como hash criptográfico (bcrypt ou equivalente). Nunca em texto puro. |
| RN-USR-03 | Um usuário recém-criado não possui disciplinas, disponibilidades nem cronogramas. O sistema não deve pré-popular nenhum dado. |
| RN-USR-04 | A exclusão de um usuário deve remover em cascata todos os seus dados: disciplinas, tópicos, provas, disponibilidades, cronogramas, sessões e retenção. |
| RN-USR-05 | Não é permitida a recuperação de um usuário excluído. A exclusão é permanente e irreversível. |

---

### 2.2 SUBJECTS — Disciplinas

Representa uma disciplina ou matéria cadastrada pelo usuário. Cada disciplina é o nível mais alto da hierarquia de conteúdo e está sempre vinculada a um único usuário.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-SUB-01 | Uma disciplina pertence a exatamente um usuário e não pode ser transferida entre usuários. |
| RN-SUB-02 | O nome da disciplina deve ser único dentro do conjunto de disciplinas do mesmo usuário. Dois usuários diferentes podem ter disciplinas com o mesmo nome. |
| RN-SUB-03 | O campo `priority_weight` deve ser um número inteiro entre 1 e 10, onde 10 representa a maior prioridade. O valor padrão é 5. |
| RN-SUB-04 | Ao excluir uma disciplina, todos os tópicos e provas associados devem ser removidos em cascata, incluindo as alocações de cronograma que referenciem esses tópicos. |
| RN-SUB-05 | Uma disciplina não pode ser excluída enquanto existir um cronograma ativo (`status = 'active'`) vinculado a ela. O usuário deve encerrar ou cancelar o cronograma antes de excluir a disciplina. |

---

### 2.3 TOPICS — Tópicos de Estudo

Representa um assunto ou unidade de conteúdo dentro de uma disciplina. Suporta hierarquia por meio de auto-referência (subtópicos), e seu peso influencia diretamente a alocação de sessões no cronograma.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-TOP-01 | Todo tópico deve estar vinculado a exatamente uma disciplina. |
| RN-TOP-02 | O campo `weight` aceita apenas três valores: `essential` (essencial para a prova), `review` (conteúdo a ser revisado) e `optional` (conteúdo complementar). O valor padrão é `essential`. |
| RN-TOP-03 | Um subtópico deve referenciar um tópico pai (`parent_topic_id`) que pertença à mesma disciplina. Não é permitido que um subtópico de uma disciplina aponte para um tópico pai de outra disciplina. |
| RN-TOP-04 | A profundidade máxima de aninhamento de subtópicos é de dois níveis (tópico → subtópico). Não é permitido criar subtópicos de subtópicos. |
| RN-TOP-05 | O campo `is_completed` indica se o tópico foi estudado pelo aluno. Ao marcar um tópico pai como concluído, todos os seus subtópicos devem ser automaticamente marcados como concluídos. |
| RN-TOP-06 | A exclusão de um tópico deve remover todos os seus subtópicos em cascata e desassociá-lo de qualquer prova via `EXAM_TOPICS`. |

---

### 2.4 EXAMS — Provas

Representa uma avaliação com data definida, vinculada a uma disciplina. É o evento que dispara a criação de cronogramas de estudo.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-EXM-01 | A data da prova (`exam_date`) deve ser obrigatoriamente uma data futura no momento do cadastro. O sistema deve rejeitar datas passadas. |
| RN-EXM-02 | Uma prova deve estar vinculada a exatamente uma disciplina. |
| RN-EXM-03 | Uma prova pode ter zero ou mais tópicos associados via `EXAM_TOPICS`. Se nenhum tópico for vinculado, o sistema não poderá gerar um cronograma baseado nessa prova. |
| RN-EXM-04 | Não é permitida a criação de mais de uma prova com a mesma data para a mesma disciplina de um mesmo usuário. |
| RN-EXM-05 | Ao excluir uma prova, todos os registros em `EXAM_TOPICS` relacionados devem ser removidos. O cronograma gerado com base nessa prova deve ter seu status alterado para `expired`. |

---

### 2.5 EXAM_TOPICS — Relação Prova ↔ Tópico

Tabela de junção que define quais tópicos uma prova exige. É a base para calcular o progresso do aluno e os tópicos pendentes.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-EXT-01 | Um mesmo tópico não pode ser vinculado mais de uma vez à mesma prova (restrição de unicidade composta: `exam_id + topic_id`). |
| RN-EXT-02 | O tópico vinculado à prova deve pertencer à mesma disciplina que a prova. Não é permitido associar tópicos de disciplinas diferentes. |
| RN-EXT-03 | O número de tópicos pendentes de uma prova é sempre calculado dinamicamente como `COUNT(exam_topics) WHERE topic.is_completed = false`. Esse valor nunca deve ser armazenado como coluna estática. |

---

### 2.6 USER_AVAILABILITY — Disponibilidade do Usuário

Define os blocos de tempo semanais em que o usuário está disponível para estudar. O algoritmo de agendamento lê esta tabela para gerar os cronogramas.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-AVL-01 | O campo `day_of_week` deve ser um inteiro de 0 a 6, onde 0 = Domingo e 6 = Sábado. |
| RN-AVL-02 | O horário de término (`end_time`) deve ser sempre posterior ao horário de início (`start_time`) no mesmo registro. |
| RN-AVL-03 | Dois registros de disponibilidade do mesmo usuário no mesmo dia da semana não podem ter intervalos de horário sobrepostos. |
| RN-AVL-04 | A duração mínima de um bloco de disponibilidade é de 30 minutos. Blocos menores devem ser rejeitados. |
| RN-AVL-05 | A alteração de disponibilidade não afeta retroativamente cronogramas já gerados. Apenas novos cronogramas utilizarão a disponibilidade atualizada. |

---

## 3. Módulo de Cronograma — Regras de Agendamento

O módulo de cronograma é o núcleo da plataforma. Ele é composto por cinco entidades interdependentes que, juntas, implementam a lógica de repetição espaçada com alocação proporcional por prioridade.

---

### 3.1 SCHEDULES — Plano-Mestre

Representa o plano de estudos completo gerado para uma prova específica. É o ponto de entrada de todo o módulo de agendamento.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-SCH-01 | Um cronograma deve estar vinculado a exatamente uma prova (`exam_id`). Um usuário pode ter múltiplos cronogramas, mas apenas um cronograma ativo (`status = 'active'`) por prova ao mesmo tempo. |
| RN-SCH-02 | A data de início (`start_date`) deve ser igual ou posterior à data atual. A data de término (`end_date`) deve ser igual à data da prova vinculada. |
| RN-SCH-03 | O total de dias (`total_days`) é calculado automaticamente como `end_date - start_date + 1`. Não deve ser fornecido manualmente. |
| RN-SCH-04 | O campo `status` segue a seguinte máquina de estados: `active` → `completed` (ao chegar na data da prova) \| `active` → `expired` (ao excluir a prova vinculada) \| `active` → `cancelled` (cancelamento pelo usuário). Não é permitida reversão de status. |
| RN-SCH-05 | Um cronograma só pode ser gerado se a prova vinculada tiver pelo menos um tópico associado via `EXAM_TOPICS`. |
| RN-SCH-06 | O prazo mínimo para geração de um cronograma é de 2 dias antes da prova. Provas com menos de 2 dias de antecedência não podem ter cronograma gerado. |

---

### 3.2 SCHEDULE_TOPIC_ALLOCATIONS — Distribuição por Tópico

Registra quantas sessões de estudo cada tópico receberá dentro do cronograma. É gerado pelo algoritmo de alocação no momento da criação do cronograma.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-STA-01 | O `priority_score` de cada tópico é calculado pelo algoritmo conforme a fórmula: `priority_score = (topic.weight_value × 0.7) + (subject.priority_weight / 10 × 0.3)`, onde `weight_value` é: `1.0` para `essential`, `0.5` para `review` e `0.2` para `optional`. |
| RN-STA-02 | O `total_sessions_allocated` de cada tópico é proporcional ao seu `priority_score` em relação à soma total dos scores, multiplicado pelo número total de sessões disponíveis no cronograma. O mínimo é 1 sessão por tópico. |
| RN-STA-03 | O campo `sessions_completed` é incrementado automaticamente toda vez que uma `STUDY_SESSION` com aquele `topic_id` é marcada como `completed`. Nunca deve ser atualizado manualmente. |
| RN-STA-04 | Não é permitida a alteração manual de `total_sessions_allocated` após a geração do cronograma. Reajustes devem ser feitos por meio de um recálculo do cronograma. |

---

### 3.3 SCHEDULE_DAYS — Dias do Cronograma

Cada registro representa um dia dentro do período do cronograma. O algoritmo distribui as sessões de estudo entre os dias disponíveis.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-SCD-01 | Ao criar um cronograma, o sistema deve gerar automaticamente um registro em `SCHEDULE_DAYS` para cada dia do período (de `start_date` a `end_date`, inclusive). |
| RN-SCD-02 | O campo `available_minutes` é populado a partir de `USER_AVAILABILITY` no momento da geração do cronograma. Dias sem disponibilidade cadastrada recebem `available_minutes = 0`. |
| RN-SCD-03 | O campo `is_available` padrão é `true`. O usuário pode marcar um dia como `is_available = false` (ex: viagem). Isso faz o algoritmo redistribuir as sessões desse dia para os demais dias disponíveis do cronograma. |
| RN-SCD-04 | Dias com `available_minutes = 0` ou `is_available = false` não devem receber nenhuma sessão de estudo alocada. |
| RN-SCD-05 | O número do dia (`day_number`) deve ser sequencial e imutável, iniciando em 1. |

---

### 3.4 STUDY_SESSIONS — Sessões de Estudo

Representa um bloco individual de estudo alocado em um dia específico do cronograma. É a unidade operacional do sistema e o principal ponto de interação do usuário com o plano.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-STS-01 | Toda sessão deve estar vinculada a um `SCHEDULE_DAY` e a um `TOPIC`. A sessão não pode existir de forma avulsa, fora de um cronograma. |
| RN-STS-02 | O campo `session_type` aceita apenas três valores: `new_content` (primeiro contato com o tópico no cronograma atual), `spaced_review` (revisão programada pela curva de esquecimento) e `pre_exam_review` (revisão geral nos últimos 1 a 2 dias antes da prova). |
| RN-STS-03 | A soma de `duration_minutes` de todas as sessões alocadas em um `SCHEDULE_DAY` não pode exceder o `available_minutes` daquele dia. |
| RN-STS-04 | O `status` de uma sessão segue a seguinte transição: `pending` → `completed` \| `pending` → `skipped`. Uma sessão `completed` ou `skipped` não pode retornar ao status `pending`. |
| RN-STS-05 | Ao concluir uma sessão (`status → completed`), o sistema deve: (a) incrementar `sessions_completed` na `SCHEDULE_TOPIC_ALLOCATIONS` correspondente; (b) atualizar o registro `TOPIC_RETENTION` do usuário para aquele tópico, recalculando `next_review_at`. |
| RN-STS-06 | Uma sessão marcada como `skipped` não deve atualizar `TOPIC_RETENTION`. O sistema pode, opcionalmente, reagendar a sessão em um dia posterior disponível. |
| RN-STS-07 | O último dia ou os dois últimos dias de um cronograma (conforme `total_days`) devem conter exclusivamente sessões do tipo `pre_exam_review`. Nenhuma sessão `new_content` é permitida nesses dias. |

---

### 3.5 TOPIC_RETENTION — Retenção por Tópico

Registra o estado de memorização do usuário para cada tópico, baseado na curva de esquecimento de Ebbinghaus. É a memória de longo prazo do sistema, persistindo entre diferentes cronogramas.

| Código | Regra de Negócio |
|--------|-----------------|
| RN-RET-01 | Deve existir no máximo um registro de `TOPIC_RETENTION` por combinação `(user_id, topic_id)`. A combinação é única. |
| RN-RET-02 | O `retention_score` representa o percentual estimado de retenção do conteúdo (0.0 a 1.0). Ele decai com o tempo conforme a fórmula da curva de esquecimento: `R = e^(-t / S)`, onde `t` é o tempo decorrido desde o último estudo (em dias) e `S` é a estabilidade da memória. |
| RN-RET-03 | O campo `review_interval_days` segue progressão geométrica a cada estudo concluído: `1 → 3 → 7 → 14 → 30` dias. O intervalo só avança se o aluno concluiu a sessão (`status = 'completed'`). Sessões puladas não avançam o intervalo. |
| RN-RET-04 | O campo `next_review_at` é sempre calculado como `last_studied_at + review_interval_days`. Ele deve ser recalculado automaticamente ao concluir qualquer sessão de estudo daquele tópico. |
| RN-RET-05 | Ao gerar um novo cronograma, o algoritmo deve consultar `TOPIC_RETENTION`: tópicos com `next_review_at` dentro do período do cronograma devem receber sessões do tipo `spaced_review` nos dias correspondentes, com prioridade sobre sessões de `new_content`. |
| RN-RET-06 | O registro de retenção não é excluído ao final de um cronograma. Ele persiste para informar cronogramas futuros, preservando o histórico de aprendizado do aluno entre diferentes semestres ou períodos. |

---

## 4. Regras do Algoritmo de Geração de Cronograma

O algoritmo de geração é executado no momento em que o usuário cria um novo cronograma. Ele segue as etapas abaixo em ordem estrita:

| Etapa | Nome | Descrição |
|-------|------|-----------|
| 1 | Validação | Verificar se a prova tem tópicos associados, se o prazo mínimo de 2 dias é respeitado e se não existe outro cronograma ativo para a mesma prova. |
| 2 | Leitura de Disponibilidade | Ler `USER_AVAILABILITY` e cruzar com o período do cronograma para calcular `available_minutes` por dia da semana. |
| 3 | Geração de Dias | Criar registros em `SCHEDULE_DAYS` para cada dia do período, populando `available_minutes` conforme a disponibilidade. |
| 4 | Cálculo de Priority Scores | Calcular `priority_score` para cada tópico da prova e criar os registros em `SCHEDULE_TOPIC_ALLOCATIONS` com `total_sessions_allocated` proporcional. |
| 5 | Consulta de Retenção | Verificar `TOPIC_RETENTION`: tópicos com `next_review_at` dentro do período recebem sessões `spaced_review` nos dias correspondentes. |
| 6 | Distribuição das Sessões | Distribuir as sessões em `STUDY_SESSIONS` pelos dias disponíveis, respeitando: (a) tópicos de maior prioridade primeiro, (b) sessões `spaced_review` na data calculada, (c) reserva dos últimos 1–2 dias para `pre_exam_review`. |
| 7 | Persistência | Salvar todos os registros gerados e definir o status do cronograma como `active`. |

---

## 5. Integridade Referencial e Restrições Gerais

| Código | Regra de Negócio |
|--------|-----------------|
| RN-INT-01 | Todas as chaves estrangeiras devem ser respeitadas. O banco de dados deve rejeitar operações que violem integridade referencial (`ON DELETE CASCADE` ou `RESTRICT` conforme definido por entidade). |
| RN-INT-02 | Campos marcados como `NOT NULL` nunca devem ser nulos. O sistema deve validar no nível de aplicação antes de enviar ao banco. |
| RN-INT-03 | Campos de `status` (em `SCHEDULES`, `STUDY_SESSIONS`) devem aceitar apenas os valores do enum definido. Valores fora do conjunto permitido devem ser rejeitados com erro de validação. |
| RN-INT-04 | Toda operação de escrita deve registrar o timestamp de criação (`created_at`) automaticamente pelo banco de dados. Esse campo não deve ser sobrescrito pela aplicação. |
| RN-INT-05 | Operações de leitura de dados derivados (ex: tópicos pendentes por prova, progresso do cronograma) devem sempre ser calculadas por query, nunca por campos armazenados manualmente, para garantir consistência. |

---

*Documento gerado automaticamente. Versão 1.0 — 2025.*