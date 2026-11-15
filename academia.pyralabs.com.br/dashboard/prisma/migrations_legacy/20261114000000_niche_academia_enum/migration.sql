-- O valor ACADEMIA do enum "Niche" está no schema.prisma, mas nunca ganhou migration
-- (produção recebeu via db push). IF NOT EXISTS: em produção não faz nada.
-- Fica numa migration separada porque um valor novo de enum não pode ser usado
-- na mesma transação em que foi criado.
ALTER TYPE "Niche" ADD VALUE IF NOT EXISTS 'ACADEMIA';
