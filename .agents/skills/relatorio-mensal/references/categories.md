# Category Hierarchy

Use `GET /categories` to get current IDs. This is the standard structure:

## Income (Receitas)

```
Receitas Operacionais (L1)
├── Aluguel (L2) — own property rentals (requires property)
├── Aluguel de Terceiros (L2) — third-party rentals (requires property)
└── Outras Receitas (L2)
```

## Operating Expenses (Despesas)

```
Despesas Operacionais (L1)
├── Despesas Administrativas (L2)
│   ├── Tarifas Bancárias (L3)
│   ├── Escritórios e Postagens (L3)
│   ├── Contabilidade (L3)
│   ├── Salários (L3)
│   ├── FGTS (L3)
│   ├── INSS (L3)
│   ├── TI (L3)
│   └── Documentações e Jurídico (L3)
├── Despesas com Imóveis (L2)
│   ├── Condomínios (L3) — requires property
│   ├── IPTU (L3) — requires property
│   ├── Água (L3) — requires property
│   ├── Energia (L3) — requires property
│   ├── Internet (L3)
│   ├── Aluguel (L3) — requires property
│   ├── Manutenção (L3) — requires property
│   └── Seguro (L3)
├── Despesas com Vendas (L2)
│   ├── Comissões (L3)
│   └── Marketing (L3)
└── Despesas Tributárias (L2)
    ├── IRPJ (L3)
    ├── Impostos e Taxas (L3)
    └── DARF IRPF (L3)
```

## Financial

```
Despesas Financeiras (L1)
├── Juros (L2)
├── IOF (L2)
└── Taxas e Encargos (L2)

Receitas Financeiras (L1)
└── Rendimentos (L2) — investment returns
```

## Investments

```
Investimentos (L1)
├── Aplicações (L2) — money invested
└── Resgates (L2) — money withdrawn
```

## Transfers

```
Transferências (L1)
└── Transferência Entre Contas (L2) — inter-account transfers (MUST sum to zero)
```

## Categories Requiring Property

When categorizing, these categories should have a property assigned:
- Aluguel (own rentals)
- Aluguel de Terceiros
- Condomínios
- IPTU
- Água
- Energia
- Manutenção
- Aluguel (under Despesas com Imóveis)
