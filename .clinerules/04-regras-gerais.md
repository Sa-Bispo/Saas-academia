# Regras Gerais de Comportamento do Agente

---

## 1. Antes de criar ou editar arquivos

- Se a tarefa envolver criar ou editar um arquivo com mais de 30 linhas, explique em 2–3 frases o que vai fazer antes de executar.
- Se for editar um arquivo existente, liste quais linhas/seções serão alteradas antes de alterar.
- Se a mudança afetar mais de um arquivo, liste todos os arquivos afetados antes de começar.

---

## 2. Dependências

- **Nunca instale pacotes sem perguntar antes**, mesmo que seja uma dependência óbvia.
- Ao sugerir uma nova dependência, informe: nome do pacote, versão sugerida e por que é necessária.
- Aguarde confirmação explícita do usuário antes de rodar `npm install`, `pip install` ou qualquer variante.

---

## 3. Mudanças incrementais

- Prefira mudanças pequenas e focadas a reescrever arquivos inteiros.
- Se um arquivo precisar de refatoração grande, proponha dividir em etapas e faça uma de cada vez.
- Não refatore código que não está relacionado à tarefa atual.

---

## 4. Validação antes de prosseguir

- Após criar ou editar código TypeScript no dashboard, verifique se há erros de tipagem óbvios antes de ir para o próximo passo.
- Após criar ou editar código Python no bot, verifique se imports e indentação estão corretos.
- Se não for possível verificar, diga isso explicitamente ao usuário.

---

## 5. Git — regra rígida

- **Nunca execute `git commit`, `git push` ou qualquer comando destrutivo de git sem confirmação explícita do usuário.**
- Se precisar sugerir um commit, apresente a mensagem de commit sugerida e aguarde aprovação antes de executar.

---

## 6. Projetos originais — REGRA CRÍTICA

Os projetos abaixo são de produção e **nunca devem ser modificados**:

- `C:\Users\samue\projeto-wpp-samuel\wpp-bot-samuel\`
- `C:\Users\samue\projeto-wpp-samuel\whatsapp_ai_bot\`

Qualquer tarefa que possa afetar esses diretórios deve ser recusada e o usuário deve ser avisado.

---

## 7. Multi-tenancy

Toda query Prisma no dashboard **obrigatoriamente** inclui `where: { tenantId }`. Se você escrever uma query sem esse filtro, é um bug de segurança. Não faça isso.

---

## 8. Dúvidas

- Se a tarefa for ambígua, faça uma pergunta objetiva e específica antes de começar.
- Não assuma intenção — prefira perguntar uma vez a refazer duas.

---

## 9. Respostas

- Seja direto. Não repita o enunciado da tarefa de volta para o usuário.
- Informe o que foi feito, não o que você planeja fazer no futuro (exceto quando pedindo confirmação conforme as regras acima).
