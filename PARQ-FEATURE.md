# Feature: PAR-Q + Auto-cadastro de Aluno

Briefing pra construção. Stack atual: Next.js (App Router) + Prisma + Postgres (Supabase), multi-tenant.

## Objetivo

Uma landing page pública (uma por academia) onde a pessoa preenche o questionário
PAR-Q + dados + assinatura. Ao enviar, ela é **criada automaticamente na base de
alunos** daquela academia como **lead / pré-cadastro** (não como aluno ativo).

## Decisão de escopo (importante)

- **AGORA:** PAR-Q padrão (as 7 perguntas abaixo), formulário fixo.
- **As perguntas ficam como DADO** (tabela seedada com o padrão), não cravadas no JSX
  — assim dá pra adicionar edição depois sem refazer.
- **NÃO construir agora** a tela de "configurar perguntas" no dashboard. Só quando
  vários clientes pedirem. (Evitar over-engineering; PAR-Q é padrão.)

## As 7 perguntas (Sim/Não) — exatamente o que a cliente usa

1. Algum médico já disse que você possui algum problema de coração e que só deveria
   realizar atividade física supervisionado por profissionais de saúde?
2. Você sente dores no peito quando pratica atividade física?
3. No último mês, você sentiu dores no peito quando praticou atividade física?
4. Você apresenta desequilíbrio devido à tontura e/ou perda de consciência?
5. Você possui algum problema ósseo ou articular que poderia ser piorado pela
   atividade física?
6. Você toma atualmente algum medicamento para pressão arterial e/ou problema de
   coração?
7. (Confirmar com a cliente se há uma 7ª — o PAR-Q padrão tem "Sabe de alguma outra
   razão pela qual você não deveria praticar atividade física?")

## Dados coletados no formulário

- Nome completo
- CPF
- Telefone (confirmar com a cliente se é obrigatório — recomendo sim, pra cobrança depois)
- Respostas das perguntas (Sim/Não)
- Assinatura (canvas) — ver seção Assinatura
- Aceite LGPD (checkbox obrigatório — dado de saúde + CPF, formulário público)

## Regras de negócio

- **Multi-tenant:** a landing tem que estar amarrada a UMA academia (link/QR único por
  tenant). O aluno criado cai SÓ na base daquele tenant.
- **Status do aluno criado:** entra como **"Sem matrícula" / lead** — NUNCA como ativo
  ou cobrável. A academia converte pra ativo quando a pessoa fecha plano e paga.
  (Protege o dashboard e a cobrança de poluição.)
- **Dedup por CPF:** se o CPF já existe naquele tenant, não cria duplicado — atualiza /
  vincula a ficha ao aluno existente.
- **Flag de saúde:** se QUALQUER resposta for "Sim", marca o aluno com
  `precisaLiberacaoMedica = true` (alerta de "recomenda avaliação médica").

## Assinatura (eletrônica simples + trilha de evidência)

Não precisa ICP-Brasil/gov.br — para documento entre academia e aluno, assinatura
eletrônica simples é válida (Lei 14.063/2020). O que dá robustez é a TRILHA:

- Imagem da assinatura → salvar em storage (Supabase Storage/S3), guardar a URL.
- Capturar e guardar junto: identidade (CPF/nome), data-hora, IP, user-agent/device,
  e um **hash do texto do termo** assinado (qual versão foi aceita).
- Registro **imutável** depois de assinado (não editável).

## Termo de responsabilidade (texto que a cliente usa)

> Declaro que as respostas fornecidas são verdadeiras e assumo a inteira
> responsabilidade por elas. Estou ciente de que é recomendável conversar com um
> médico antes de aumentar meu nível atual de atividade física. Assumo plena
> responsabilidade por qualquer atividade física praticada sem o atendimento a essa
> recomendação.

## Modelo de dados sugerido (Prisma)

Nova tabela `FichaParq` (ou `ParqResposta`), ligada a `Aluno`:

- `id`, `tenantId`, `alunoId`
- `respostas` (JSONB: pergunta → Sim/Não) — ou tabela de perguntas + respostas se quiser normalizar
- `precisaLiberacaoMedica` Boolean
- `termoHash` (hash do termo aceito)
- `assinaturaUrl`
- `assinanteNome`, `assinanteCpf`
- `ip`, `userAgent`
- `consentimentoLgpd` Boolean
- `assinadoEm` DateTime
- (sem campo de update após assinar)

Tabela `ParqPergunta` (seedada com as 7 acima) — mantém perguntas como dado, sem tela
de config por enquanto.

## A confirmar com a cliente

- [ ] Existe a 7ª pergunta? Qual o texto exato?
- [ ] Telefone é obrigatório no formulário?
- [ ] Ela quer gerar/baixar um PDF do termo assinado, ou só guardar no sistema?
- [ ] O link/QR do PAR-Q fica onde (site da academia, recepção, WhatsApp)?
