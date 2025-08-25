## Exemplo de request par quitar fatura:

fetch("https://my.imobzi.com/v1/invoice/571bc2c4655911f0898642004e494300", {
"headers": {
"accept": "application/json, text/plain, _/_",
"accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
"authorization": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjkyZTg4M2NjNDY2M2E2MzMyYWRhNmJjMWU0N2YzZmY1ZTRjOGI1ZDciLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiUm9iZXJ0byBDZXN0YXJpIiwicGxhbnMiOnsiYWMtdGxuYTIzMzE3Nml3ZSI6IkZyZWUifSwicGxhbl9uYW1lIjoiRnJlZSIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9pbW9iemktYXBwLXByb2R1Y3Rpb24iLCJhdWQiOiJpbW9iemktYXBwLXByb2R1Y3Rpb24iLCJhdXRoX3RpbWUiOjE3NTE0Nzk3MDAsInVzZXJfaWQiOiJDV0xBRm1LT0hMT0lQRHI5aE9TUkN2RHgyQWEyIiwic3ViIjoiQ1dMQUZtS09ITE9JUERyOWhPU1JDdkR4MkFhMiIsImlhdCI6MTc1NjE0MDAyNywiZXhwIjoxNzU2MTQzNjI3LCJlbWFpbCI6InJvYmVydG90Y2VzdGFyaUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJyb2JlcnRvdGNlc3RhcmlAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.GbeLEwHkKA4e_igYSDp3AUnMlUP2XF5-T3-DWKTWjoBTzfF0Vx7B36OhdF0mWOtO3PPR_qL04RGQHyiHDRosyncqamAvlPHERP7LaaDAGvahpYR1YKWnPXchAVi1I8H-ifYzsiGegbOEt9KTspAI1K0rdDF6ROoxFx1y_amnEWqWCBv4ECb1KvU2huHbvdTBJ_Xin-Anrkwiuor0xpEddOg2uNUqdVDkUd06M1xPCZDZMZKh_cH_dE4QqTYo6DTAKdqtbLZOOnwasjH6E9n4HJGA6ehJDjtIAfHTp7oNOxxYtHdyaggEOr-byd5uK9uei4pcp3nS8vivJFVnZJpD1A",
"content-type": "application/json",
"priority": "u=1, i",
"sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
"sec-ch-ua-mobile": "?0",
"sec-ch-ua-platform": "\"macOS\"",
"sec-fetch-dest": "empty",
"sec-fetch-mode": "cors",
"sec-fetch-site": "same-origin",
"x-current-database": ""
},
"referrer": "https://my.imobzi.com/",
"body": "{\"total_value\":524.86,\"invoice_id\":\"571bc2c4655911f0898642004e494300\",\"status\":\"paid\",\"due_date\":\"2025-07-30\",\"description\":\"Aluguel ref. 01/07/2025 a 31/07/2025\",\"charge_fee_value\":0,\"payment_method\":\"transference\",\"paid_at\":\"2025-07-30\",\"payment_methods_available\":\"transference\",\"payment_maximum_installments\":null,\"interest_value\":0,\"difference_value\":0,\"invoice_url\":\"https://fatura.imobzi.com/ac-tlna233176iwe/571bc2c4655911f0898642004e494300-7909\",\"contact\":{\"db_id\":6089643998052352,\"type\":\"organization\",\"name\":\"Imobiliária Pró Imóveis\",\"code\":\"11\",\"email\":[\"\"],\"cpf\":null,\"cnpj\":\"51.840.387/0001-25\",\"phone\":[]},\"info_contract\":null,\"property\":{\"db_id\":6512832527990784,\"address\":\"Rua Elisiário, 30\",\"address_complement\":\"\",\"neighborhood\":\"Vila Celso Mauad\",\"city\":\"Catanduva\",\"state\":\"SP\",\"code\":\"7\",\"zipcode\":\"15810-000\",\"cover_photo\":{\"db_id\":979790246,\"url\":\"https://lh3.googleusercontent.com/M2uKClzhlNL4JnGSq0mS_AvyiTTVfPxdm0xwRybLD_YLU3d4gzD_4UY0VefwkmX5QXRqev29Kww4150XVDtAvNQI_HbIju450KynFg4XPUhZHB725yNUyBw=s0\"},\"owners\":[{\"db_id\":5880332491423744,\"name\":\"Ratc Gerenciamento e Adm de Bens\"}]},\"account\":{\"db_id\":5253871883517952,\"account_number\":\"44319-0\",\"account_type\":\"others\",\"active\":true,\"agency\":\"3003\",\"balance\":2312930.47,\"created_at\":\"2023-03-23T12:03:11.825866Z\",\"default\":false,\"description\":\"Sicredi\",\"favorite\":false,\"name\":\"Sicredi\",\"has_transactions\":true,\"has_integration\":false,\"initial_value\":38994.74,\"start_at\":\"2023-03-23\",\"bank\":{\"code\":\"748\",\"db_id\":5759180434571264,\"logo_url\":null,\"name\":\"Banco Cooperativo Sicredi S. A.\"}},\"bank_slip_id\":null,\"bank_slip_url\":null,\"onlending_split\":false,\"category\":\"Terceiros (Administração)\",\"subcategory\":\"Recebimento de Aluguel\",\"reference_start_at\":\"2025-07-01\",\"reference_end_at\":\"2025-07-31\",\"lease\":{\"contract_type\":\"lease\",\"code\":\"41\"},\"send_receipt_tenant\":false}",
"method": "POST",
"mode": "cors",
"credentials": "include"
}); ;
