# Verificação De Inadimplentes

Use esta referência na etapa de inadimplentes do relatório mensal.

## Objetivo

Garantir que a lista de inadimplentes do sistema reflita corretamente:

- os inadimplentes ativos que vieram do mês anterior
- os pendentes do Imobzi do mês de referência
- os recebimentos/de depósitos que já aconteceram fora do fluxo esperado do Imobzi

## Fonte De Verdade

- A fonte de verdade da lista ativa é o sistema `financeiro.ratc.com.br`, via `GET /inadimplentes`.
- Os pendentes operacionais do mês vêm do Imobzi.
- A decisão final de fechar qualquer match é sempre do usuário.

## Fluxo

1. Liste os inadimplentes atuais do sistema.
2. Liste os pendentes do Imobzi do mês.
3. Gere uma tabela de correspondência entre pendentes do Imobzi e recebimentos do sistema.
4. Mostre sempre ao usuário, de forma separada:
   - os inadimplentes que vieram do mês anterior
   - os pendentes do Imobzi
   - o novo estado proposto dos inadimplentes
5. Separe os casos em:
   - match forte
   - match possível
   - sem match
6. Mostre todos os matches e possíveis matches ao usuário.
7. Só depois da aprovação explícita do usuário:
   - deixe de adicionar um inadimplente novo
   - remova um inadimplente anterior da lista
   - considere um match como fechado
8. Se um caso aprovado significar pagamento fora do fluxo do Imobzi, marque a invoice como paga no Imobzi via API.
9. Atualize a lista do sistema.

## Como Listar Os Inadimplentes Do Sistema

Use:

```text
GET /inadimplentes
```

Interpretação:

- `settled: false` = inadimplente ativo
- `settled: true` = histórico quitado; não entra na lista ativa

## Como Levantar Os Pendentes Do Imobzi

Use a fonte operacional atual do projeto para aluguéis pendentes do Imobzi.

Campos mínimos para a etapa:

- `tenantName`
- `propertyName`
- `dueDate`
- `value`
- `description`
- `payment_method`
- `payment_methods_available`
- `bank_slip_id`
- `bank_slip_url`

## Regras De Matching

Nunca feche match automaticamente.

Use a seguinte ordem de confiança:

1. propriedade
2. inquilino/contato
3. janela de datas
4. conta corrente histórica usada naquele recebimento
5. valor aproximado

## Importante Sobre Valores

Não use igualdade de valor como critério principal.

Em fevereiro de 2026, os pendentes do Imobzi mostraram que:

- o valor da invoice nem sempre bate com o valor que entrou no banco
- o depósito pode refletir valor líquido, repasse líquido, desconto, taxa ou ajuste
- alguns casos bateram por propriedade e inquilino, mas não pelo valor bruto

Por isso:

- valor é critério auxiliar
- propriedade, inquilino e histórico do recebimento pesam mais

## Boleto Vs Não-Boleto

Regra desejada:

- se deveria pagar por boleto e não pagou no Imobzi, provavelmente é inadimplente
- ainda assim, cheque se houve depósito na conta corrente

Limitação prática encontrada em fevereiro de 2026:

- a resposta bruta do Imobzi veio com `payment_method: null` em todos os casos analisados
- vários registros vieram com `payment_methods_available: "transference"`
- `bank_slip_id` e `bank_slip_url` vieram `null`

Conclusão:

- a distinção entre boleto e não-boleto pode vir incompleta ou inconclusiva
- se o método de pagamento não vier claro, trate como caso inconclusivo e leve ao usuário

## Como Tratar Cada Grupo

### Match forte

Critérios típicos:

- mesma propriedade
- mesmo inquilino ou administrador
- data compatível com o vencimento
- histórico recorrente do mesmo fluxo

Ação:

- apresente ao usuário
- só feche após aprovação explícita

### Match possível

Critérios típicos:

- propriedade compatível, mas valor divergente
- descrição genérica ou incompleta
- pagamento identificado em conta diferente do padrão histórico

Ação:

- sempre escale ao usuário
- não remova nem deixe de adicionar inadimplente sem aprovação

### Sem match

Critérios típicos:

- nenhum depósito correspondente encontrado
- nenhuma transação categorizada de aluguel correspondente
- nenhuma evidência em conta corrente

Ação:

- trate como candidato a inadimplente novo
- apresente ao usuário antes de cadastrar

## Atualização Da Lista

Depois da aprovação do usuário:

- pagamento aprovado fora do fluxo do Imobzi: marcar a invoice como paga no Imobzi via API
- novo inadimplente confirmado: `POST /inadimplentes`
- inadimplente antigo quitado: `DELETE /inadimplentes/{id}` ou atualização equivalente do registro

## Marcar Como Pago No Imobzi

Sim, o projeto já sabe fazer isso via API externa do Imobzi.

Implementação atual:

- [invoices.ts](/Users/robertotcestari/Programming/projetos/ratc/financeiro-ratc/lib/features/imobzi/invoices.ts) expõe `markInvoiceAsPaid`
- o fluxo faz `POST https://my.imobzi.com/v1/invoice/{invoiceId}`
- o payload atual usa `status: "paid"` e `payment_method: "transference"`

Regra operacional:

- só chame essa ação depois da aprovação explícita do usuário
- registre no arquivo de memória qual invoice foi marcada como paga
- só depois ajuste o novo estado dos inadimplentes

Registre no arquivo de memória:

- quem já estava na lista
- quem veio do Imobzi
- quais matches foram apresentados
- o que o usuário aprovou
- quais inclusões/remoções foram feitas

## Achados De Fevereiro De 2026

Fevereiro de 2026 revelou estes edge cases:

1. O sistema tinha apenas registros antigos quitados; não havia inadimplentes ativos.
2. O Imobzi tinha 11 pendentes para fevereiro de 2026.
3. A maioria dos pendentes tinha correspondência forte com recebimentos já lançados no sistema.
4. Três casos ficaram sem correspondência forte encontrada:
   - Usina / Sítio Sales
   - Agrícola Moreno de Nipoã / Cosmorama
   - Maria José Nadruz / Brasilusa 669 ap 21
5. Esses casos precisam de aprovação explícita do usuário antes de entrar na lista.
