# Credenciais de Acesso (Ambiente de Desenvolvimento)

Esta documentação contém as contas de usuários padrão geradas pelo script de seed do banco de dados para auxiliar no desenvolvimento e testes do sistema.

> [!WARNING]
> **Apenas para Desenvolvimento**
> Estas credenciais são públicas e destinadas exclusivamente a testes locais. Nunca as utilize em ambientes de produção.

---

## Contas de Teste

| Nome | E-mail | Senha | Função (Role) | Dados Mockados |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Fetin** | `admin@fetin.com` | `admin12345` | `ADMIN` | Acesso ao Painel de Usuários e capacidade de impersonar outros painéis |
| **Alice Estudiosa** | `alice@fetin.com` | `user12345` | `USER` | Disciplinas: Cálculo I, Algoritmos, Física I (com tópicos e datas de provas) |
| **Bob Descontraído** | `bob@fetin.com` | `user12345` | `USER` | Disciplinas: Química Geral, Introdução à Engenharia |

---

## Como Rodar o Seed do Banco

Caso os dados não apareçam no banco de dados local ou queira resetar as informações dos usuários padrão para o estado inicial, execute o comando de seed:

```bash
# Navegue até a pasta do backend
cd Fetin-backend

# Execute o seed
npx prisma db seed
```
