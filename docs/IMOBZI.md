## Imobzi

### Variáveis de ambiente

- `IMOBZI_EMAIL`
- `IMOBZI_PASSWORD`
- `IMOBZI_FIREBASE_API_KEY`
- `IMOBZI_ACCOUNT_ID` (opcional, se quiser evitar passar o `accountId` manualmente)

### Exemplo sanitizado para quitar fatura

```js
fetch('https://my.imobzi.com/v1/invoice/<INVOICE_ID>', {
  method: 'POST',
  headers: {
    accept: 'application/json, text/plain, */*',
    authorization: '<ID_TOKEN>',
    'content-type': 'application/json',
    'x-current-database': '',
  },
  referrer: 'https://my.imobzi.com/',
  mode: 'cors',
  credentials: 'include',
  body: JSON.stringify({
    total_value: 524.86,
    invoice_id: '<INVOICE_ID>',
    status: 'paid',
    due_date: '2025-07-30',
    description: 'Aluguel ref. 01/07/2025 a 31/07/2025',
    payment_method: 'transference',
    paid_at: '2025-07-30',
    contact: {
      name: '<TENANT_OR_COMPANY_NAME>',
    },
    property: {
      db_id: '<PROPERTY_ID>',
      address: '<PROPERTY_ADDRESS>',
    },
    account: {
      db_id: '<ACCOUNT_ID>',
      name: '<ACCOUNT_NAME>',
      bank: {
        code: '<BANK_CODE>',
        name: '<BANK_NAME>',
      },
    },
  }),
});
```

Nunca commite `authorization` tokens, chaves do Firebase/Google ou dados reais de clientes nessa documentação.
