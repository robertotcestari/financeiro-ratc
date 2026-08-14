# Checks E Validação

Use esta referência para decidir quando uma etapa pode avançar e quando precisa parar, corrigir e rerodar.

## Importações

### Critério mínimo

- [ ] O arquivo do mês correto foi usado
- [ ] O preview foi executado quando aplicável
- [ ] O resultado da importação foi registrado
- [ ] O saldo no app foi comparado com a fonte externa
- [ ] O usuário confirmou o saldo quando a etapa exige confirmação

### Se falhar

- Não avance para sugestões ou categorização.
- Investigue arquivo incorreto, duplicidade, transação faltante ou saldo divergente.
- Corrija e repita a validação.

## Sugestões Automáticas

### Critério mínimo

- [ ] O script rodou com `YEAR` e `MONTH` corretos
- [ ] A quantidade de sugestões geradas foi registrada
- [ ] As sugestões aplicáveis foram aplicadas
- [ ] O restante foi encaminhado para categorização manual

### Se falhar

- Se o script falhar, corrija a causa e rerode.
- Se gerar zero sugestões, registre isso e siga para a etapa manual.
- Não trate falha silenciosa como sucesso.

## Checks Finais

### Critério mínimo

- [ ] `Transferência Entre Contas` soma zero no mês
- [ ] Não restam transações sem categoria
- [ ] O DRE foi gerado com sucesso
- [ ] As contas a pagar em aberto/atrasadas do mês foram listadas (informativo; não bloqueia o DRE)
- [ ] O resultado foi registrado no arquivo de memória

### Se falhar

- Não envie o relatório.
- Corrija a causa da falha.
- Rode `./scripts/checks.sh $YEAR $MONTH` novamente.
- Só avance quando todos os checks passarem.
