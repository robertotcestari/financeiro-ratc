# PJBank E Imobzi

Use esta referência na etapa de `CC - PJBank`.

## Objetivo

Garantir que:
- o PDF do PJBank foi recebido
- a movimentação do mês bate com o Imobzi
- transferências Pix faltantes foram registradas no Imobzi
- a importação via API só acontece depois da conciliação

## Entradas Necessárias

- PDF do PJBank do mês
- `RATC_API_URL`
- `RATC_API_KEY`
- credenciais ou token válidos para Imobzi, resolvidos fora do `SKILL.md`
- IDs de conta resolvidos dinamicamente ou lidos de configuração segura

Se precisar buscar credenciais ou conferir produção, use `production-access.md`.

## Fluxo

1. Receber o PDF do PJBank do mês.
2. Autenticar no Imobzi com o método atual do ambiente.
3. Buscar transações do período no Imobzi.
4. Comparar totais diários do Imobzi com o PDF do PJBank.
5. Criar no Imobzi as transferências Pix de saída que faltarem.
6. Validar que o saldo final do Imobzi bate com o saldo final do PDF.
7. Rodar preview da importação via API.
8. Executar a importação via API.
9. Confirmar o saldo final no app com o usuário.

## Importação Via API

Use endpoints e payloads em `api-endpoints.md`.

Fluxo mínimo:
- preview primeiro
- importar depois
- registrar `importBatchId`, contagens e divergências no arquivo de memória

## Validação Antes De Avançar

- [ ] O PDF do PJBank foi recebido
- [ ] A reconciliação diária foi concluída
- [ ] As transferências Pix faltantes foram lançadas
- [ ] O saldo final do Imobzi bate com o PDF
- [ ] O preview da importação foi executado
- [ ] A importação foi executada
- [ ] O usuário confirmou o saldo final no app

## Se Falhar

- Se a reconciliação não bater, não importe ainda.
- Se existirem Pix de saída no PDF sem contraparte no Imobzi, crie primeiro essas transferências.
- Se o saldo final continuar divergente, registre a causa no arquivo de memória e trate como bloqueio da etapa.
