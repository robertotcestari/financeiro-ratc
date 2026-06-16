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
- `Santa Maria Tem Negocios Imobiliarios` / `Santa Maria Tem` / CNPJ `64.508.005/0001-02`: sempre `Aluguel` no imóvel `RIB - Av. Independência 1589`; nunca `POA - Protásio Alves Porto Alegre`
- `Painew Propaganda e Publicidade` / `Painew Propaganda`: sempre `Aluguel` no imóvel `RIB - Totem`
- `Ilha da Madeira Gestao Hoteis` / `Ilha da Madeira` / CNPJ `10.706.625/0001-27`: sempre `Aluguel` no imóvel `BER - Riviera de São Lourenço`
- `Instituto de Olhos de Catanduva` / CNPJ `00.579.873/0001-09`: sempre `Aluguel` no imóvel `CAT - Otica - Casa ao Fundo`
- `Agatha Brandini Fernandes` / `Agatha Brandini`: sempre `Aluguel` no imóvel `CAT - Rua Bahia Sala 4`
- `Rodrigo Cristiano Genoves`: sempre `Aluguel` no imóvel `CAT - Rua Bahia Sala 1` (recebido no CC - PJBank via Imobzi)
- `Pro Imoveis Ltda EPP` (TED, CNPJ `51.840.387/0001-25`): é `Aluguel`, mas o imóvel é definido pelo VALOR do repasse (cada valor recorrente = um imóvel). Mapeamento conhecido: `1.877,95`→`CAT - Rua Monte Aprazível`; `1.058,60`→`CAT - Rua Elisiário 32`; `479,53`→`CAT - Rua Fortaleza - 504`; `532,02`→`CAT - Rua Elisiário 30`. As regras por valor às vezes não casam na sugestão automática — confira e ajuste o imóvel manualmente.

### Condomínios (Despesa — requer imóvel)
- `CONDOMINIO` / `COND.` / nome da administradora
- Débito recorrente mensal
- `Village Damha` via `PJBANK PAGAMENTOS` no valor de `550,00`: sempre `Condomínios` no imóvel `CAT - Terreno Dahma`

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

#### Códigos de DARF (decisão do usuário/contador)
- `DEBITO ARRECADACAO-DARF81COO` e `DEBITO ARRECADACAO-DARFC0385` aparecem todo mês com valores variáveis.
- O código do DARF NÃO determina sozinho a categoria — o mesmo `DARF81COO` já foi `PIS`, `IRPJ`, `CSLL` e `COFINS`; o `DARFC0385` já foi `INSS` e `Impostos e Taxas`.
- O split entre `INSS / IRPJ / CSLL / PIS / COFINS / Impostos e Taxas` é decidido pelo usuário/contador. Não adivinhe: leve ao usuário (afeta o relatório de tributação).

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
- Data: YYYY-MM-DD
- Descrição: PIX RECEBIDO - FULANO DE TAL
- Valor: R$ 1.500,00
- Conta: CC - Sicredi

Qual categoria? (se aplicável, qual imóvel?)
```
