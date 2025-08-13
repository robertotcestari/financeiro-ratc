# Relatório de Migração das Regras de Categorização

## Resumo da Migração

- **Total de regras no sistema antigo**: 49
- **Total de regras migradas**: 49 (100%)
- **Executada em**: `npx tsx prisma/migration/migrate-rules.ts`
- **Correções aplicadas em**: `npx tsx prisma/migration/fix-unmapped-rules.ts`

## Estrutura do Sistema Antigo

### Tabelas Analisadas
- `StringToCategoryMapping`: 49 regras de mapeamento
- `TransactionCategory`: 37 categorias
- `Unit`: 53 unidades/propriedades

## Mapeamentos Realizados

### Categorias Mapeadas
| ID Antigo | Nome Antigo | ID Novo | Nome Novo |
|-----------|-------------|---------|-----------|
| 5 | Tarifas Bancárias | `cat-tarifas-bancarias` | Tarifas Bancárias |
| 8 | Salários | `cat-salarios` | Salários |
| 9 | FGTS | `cat-fgts` | FGTS |
| 10 | INSS | `cat-inss` | INSS |
| 11 | TI | `cat-ti` | TI |
| 12 | Documentações e Jurídico | `cat-juridico` | Jurídico |
| 14 | Condomínios | `cat-condominios` | Condomínios |
| 15 | Energia Elétrica | `cat-energia` | Energia |
| 18 | Telefone e Internet | `cat-internet` | Internet |
| 19 | Manutenção | `cat-manutencao` | Manutenção |
| 22 | IPTU | `cat-iptu` | IPTU |
| 24 | IRPJ | `cat-irpj` | IRPJ |
| 35 | Aluguel | `cat-aluguel` | Aluguel |
| 37 | Aluguel de Terceiros | `cat-aluguel-terceiros` | Aluguel de Terceiros |
| 38 | Transferência entre Contas | `cat-transferencia-entre-contas` | Transferência Entre Contas |

### Propriedades Mapeadas
Foram mapeadas 25 propriedades do sistema antigo para o novo sistema, incluindo:

- **CAT**: 13 propriedades em Catanduva
- **SJP**: 3 propriedades em São José do Rio Preto  
- **RIB**: 3 propriedades em Ribeirão Preto
- **SAO**: 2 propriedades em São Paulo
- **SAL**: 3 propriedades rurais (sítio e rancho)
- **SVC**: 1 apartamento em São Vicente

### Propriedades Não Encontradas
As seguintes propriedades do sistema antigo não foram encontradas no novo sistema e foram migradas sem vinculação de propriedade:

- `SJP - Rua Brasilusa 669`
- `CAT - Rua Belo Horizonte` 
- `CAT - Chácara Nova`
- `RIB - Av. Independência 1589`
- `COS - Sítio Cosmorama - Pasto`
- `SAO - Eduardo Apartamento Pamplona`
- `COS - Sítio Cosmorama - Casa ao Fundo`
- `COS - Sítio Cosmorama - Cana`
- `CAT - Rua Piauí - 317`

## Estrutura das Regras Migradas

Cada regra migrada possui:
- **name**: `"Regra: [string de busca]"`
- **description**: Informações sobre categoria e unidade antigas
- **isActive**: `true`
- **priority**: 5-10 (baseado no tamanho da string)
- **categoryId**: ID da categoria no novo sistema
- **propertyId**: ID da propriedade no novo sistema (ou null)
- **criteria**: JSON com critério de busca por descrição

### Exemplo de Critério
```json
{
  "description": {
    "contains": "THAIS HELENA MORADA IMOBILIARIA",
    "caseSensitive": false
  }
}
```

## Regras de Negócio Aplicadas

1. **Prioridade**: Strings maiores (> 20 caracteres) recebem prioridade 10, outras recebem 5
2. **Unidade 9999**: Representa regras sem propriedade específica
3. **Case Insensitive**: Todas as buscas são case insensitive
4. **Transferências**: Regras de transferência entre contas foram mapeadas corretamente

## Validação

Após a migração:
- ✅ 49 regras criadas no novo sistema
- ✅ Todas as categorias mapeadas existem no novo sistema
- ✅ Propriedades existentes foram vinculadas corretamente
- ✅ Sistema de sugestões pode processar as regras migradas

## Observações

- As propriedades não encontradas provavelmente foram descontinuadas ou renomeadas
- As regras sem propriedade funcionarão normalmente para categorização
- É recomendado testar o sistema de sugestões com transações reais para validar a eficácia das regras migradas