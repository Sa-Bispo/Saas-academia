# Contexto do projeto — academia-saas

Cole este conteúdo no chat do Copilot (ou peça pra ele ler este arquivo) para ele entender o que já foi feito antes de continuarmos o trabalho.

## Objetivo

Separar o nicho "academia" (gym) de um SaaS multi-nicho maior (que também atendia adega, lanchonete, pizzaria, clínica, empresa) e transformá-lo em um produto próprio, focado 100% em academia.

## Origem dos projetos (NUNCA tocar nesses dois)

- `C:\Users\samue\projeto-wpp-samuel\wpp-bot-samuel` → dashboard original multi-nicho.
- `C:\Users\samue\projeto-wpp-samuel\whatsapp_ai_bot` → bot original multi-nicho.

Esses dois projetos são a base de produção para os outros nichos e **não devem ser modificados, apagados ou alterados de forma alguma** em nenhum momento deste trabalho.

## O que foi feito até agora

1. **Clonagem**: criamos cópias independentes:
   - `academia-saas-dashboard` (clone de `wpp-bot-samuel`)
   - `academia-saas-bot` (clone de `whatsapp_ai_bot`)

2. **Poda do dashboard** (`academia-saas-dashboard`): removemos por completo os verticais CLINICA e EMPRESA (rotas, componentes, lógica de roteamento por sub_nicho), deixando o fluxo só com academia.

3. **Poda do bot** (`academia-saas-bot`): mesma lógica de remoção dos outros nichos no lado do bot.

4. **Validação do dashboard**:
   - Rodamos `npm install` e `tsc --noEmit` para garantir que nada quebrou.
   - Encontramos e corrigimos um bug real: em `src/components/onboarding/setup-wizard.tsx`, o fluxo `mode === "delivery"` ainda chamava `router.push("/estoque...")`, uma rota que já tinha sido removida nessa poda. Corrigido para ir direto pro dashboard.
   - Corrigimos também dois arquivos que tinham sido salvos com um byte nulo no meio (bug recorrente do mount do Windows que trunca arquivo ao salvar conteúdo menor): `(dashboard)/layout.tsx` e `dashboard/page.tsx`.
   - Não conseguimos rodar `prisma generate` de verdade no sandbox (o binário do schema-engine é bloqueado pela rede), então a validação de tipos do Prisma foi feita com um stub manual só para conferir erros de TypeScript nos arquivos editados — isso não substitui rodar `prisma generate` de verdade na sua máquina.

5. **Organização**: criamos a pasta `academia-saas` dentro de `projeto-wpp-samuel` e movemos os dois clones pra dentro dela, centralizando tudo:
   ```
   projeto-wpp-samuel/
     wpp-bot-samuel/        ← original, intocado
     whatsapp_ai_bot/       ← original, intocado
     academia-saas/
       academia-saas-dashboard/
       academia-saas-bot/
   ```

6. Abrimos essa pasta `academia-saas` no VS Code.

## Pendências / decisões em aberto (ainda não decidimos)

- Limpar os ramos mortos que sobraram em `setup-wizard.tsx` (modos `agendamentos`/`empresa`, perfis de delivery de adega/lanchonete/pizzaria) — código que nunca mais será executado já que só existe academia agora, mas ainda está no arquivo.
- Podar o `prisma/schema.prisma` removendo modelos que não fazem sentido pra academia (StockItem, Order, Motoboy, Combo, Appointment, etc.).
- `src/components/landing/subscription-modal.tsx` tem um gap pré-existente: as listas `PLACEHOLDER_BY_NICHO`/`NICHO_OPTIONS` não incluem "academia" (mesma categoria do gap já conhecido na página `/test-drive`, ainda fora do escopo).
- Rodar `npm install` + `npx prisma generate` de verdade dentro do VS Code/terminal local (fora do sandbox), já que aqui a geração do client Prisma ficou bloqueada por rede.
- Havia também um bug de import de `datetime` já corrigido no clone `academia-saas-bot` — falta decidir se vale aplicar essa mesma correção no `whatsapp_ai_bot` original (mantendo a regra de nunca tocar nele sem decisão explícita).

## Próximo passo sugerido

Continuar o trabalho dentro de `academia-saas/academia-saas-dashboard` e `academia-saas/academia-saas-bot`, tratando as pendências acima conforme prioridade.
