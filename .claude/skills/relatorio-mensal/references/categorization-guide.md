# Guia de Categorização Manual

Após aplicar as sugestões automáticas (regras), as transações restantes precisam de categorização manual. Use os padrões abaixo para decidir a categoria.

## Padrões Comuns por Descrição

### Tarifas Bancárias
- `TARIFA` / `TAR MANUT` / `TARIFA BANCÁRIA`
- `PACOTE DE SERVIÇO` / `ANUIDADE`
- `TAR EXTRATO` / `TAR DOC` / `TAR TED`

### Transferências Entre Contas
- `TRANSF` / `TRANSFERENCIA` / `TEF`
- `APLICACAO FINANCEIRA` / `APLIC.FIN`
- `RESG.APLIC.FIN` / `RESGATE`
- `PIX` entre contas próprias (verificar se origem/destino é conta da RATC)

### Aluguel (Receita — requer imóvel)
- Créditos do PJBank/Imobzi com identificação de inquilino
- `ALUGUEL` / `LOCAÇÃO` no description
- Valor positivo recorrente mensal

### Condomínios (Despesa — requer imóvel)
- `CONDOMINIO` / `COND.` / nome da administradora
- Débito recorrente mensal

### IPTU (Despesa — requer imóvel)
- `IPTU` / `PREFEITURA` / `TRIBUTO MUNICIPAL`

### Água (Despesa — requer imóvel)
- `SABESP` / `COPASA` / `SEMAE` / nome da companhia de água
- `AGUA` / `SANEAMENTO`

### Energia (Despesa — requer imóvel)
- `CPFL` / `ENEL` / `ELEKTRO` / `ENERGISA` / nome da distribuidora
- `ENERGIA` / `LUZ`

### Manutenção (Despesa — requer imóvel)
- `MANUTENÇÃO` / `REFORMA` / `CONSERTO`
- Pagamento a prestadores de serviço para imóveis

### Contabilidade
- `CONTABILIDADE` / nome do escritório contábil

### Salários / FGTS / INSS
- `FOLHA` / `SALARIO` / `RESCISAO`
- `FGTS` / `CAIXA ECONOMICA` (para FGTS)
- `INSS` / `GPS` / `DARF` (para INSS)

### Impostos e Taxas
- `DARF` / `DAS` / `SIMPLES`
- `IRPJ` / `CSLL` / `PIS` / `COFINS`
- `IRPF` → DARF IRPF especificamente

### Rendimentos (Receita financeira)
- `RENDIMENTO` / `JUROS` / `DIVIDENDO`
- Créditos em contas de investimento (CI)

### IOF / Juros / Taxas Financeiras
- `IOF` → IOF
- `JUROS` em débito → Juros (despesa financeira)
- `ENCARGO` / `MORA` → Taxas e Encargos

## Regras de Decisão

1. **Primeiro**: Verifique se a transação é uma transferência entre contas próprias (RATC)
2. **Segundo**: Procure palavras-chave na descrição (tabela acima)
3. **Terceiro**: Analise o valor e recorrência (ex: mesmo valor todo mês = aluguel/condomínio)
4. **Quarto**: Se não conseguir determinar, pergunte ao usuário

## Categorias que Requerem Imóvel

Ao categorizar estas, SEMPRE associe o imóvel correspondente:
- Aluguel, Aluguel de Terceiros
- Condomínios, IPTU, Água, Energia, Manutenção

Use `GET /properties` para listar imóveis disponíveis. O código do imóvel (ex: `CAT-01`, `SJP-02`) geralmente aparece na descrição ou pode ser inferido pelo endereço.

## Quando Perguntar ao Usuário

Pergunte ao usuário quando:
- A descrição é genérica (ex: `PIX RECEBIDO`, `TED ENVIADO`)
- Não há padrão reconhecível
- Valor incomum ou primeira ocorrência
- Pode ser transferência OU despesa (ambíguo)

Formato sugerido para perguntar:
```
Transação não identificada:
- Data: 2025-12-15
- Descrição: PIX RECEBIDO - FULANO DE TAL
- Valor: R$ 1.500,00
- Conta: CC - Sicredi

Qual categoria? (se aplicável, qual imóvel?)
```
