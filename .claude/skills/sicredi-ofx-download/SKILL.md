---
name: Sicredi OFX Download
description: Automatiza o download do extrato bancário em formato OFX do Sicredi Internet Banking PJ. Use esta skill no início de cada mês para baixar o extrato do mês anterior.
---

# Sicredi OFX Download

## Overview

Esta skill automatiza o processo de download do extrato bancário em formato OFX do Sicredi Internet Banking PJ (Pessoa Jurídica). O arquivo OFX é necessário para importação no sistema financeiro.

**IMPORTANTE:** Esta skill requer interação do usuário para inserir credenciais (CNPJ e senha). O Claude NÃO deve inserir credenciais bancárias.

## Informações da Conta

- **Banco:** Sicredi
- **Tipo:** Internet Banking PJ (Pessoa Jurídica)
- **CNPJ:** 13.292.738/0001-11
- **Cooperativa e Conta:** 3003 44319-0
- **Empresa:** RATC GERENCIAMENTO E ADMINISTRACAO DE BENS LTDA

## URLs Importantes

- **Site principal:** https://www.sicredi.com.br
- **Login PJ direto:** https://ibpj.sicredi.com.br/ib-view/loginpj/preauth.html
- **Página de Extrato:** https://ibpj.sicredi.com.br/ib-view/extrato/form/1.html?oidTrans=116

## Fluxo Completo

### Step 1: Acessar o Internet Banking

1. Navegar para https://www.sicredi.com.br
2. Clicar no botão **"Acessar minha conta"** (menu superior direito, botão verde)
3. No dropdown que aparece, selecionar **"Pessoa Jurídica"**
4. Será redirecionado para a tela de login PJ

**Alternativa:** Navegar diretamente para https://ibpj.sicredi.com.br/ib-view/loginpj/preauth.html

### Step 2: Realizar Login

**ATENÇÃO: O usuário DEVE realizar o login manualmente.**

1. Campo **CNPJ**: O usuário deve digitar o CNPJ (13.292.738/0001-11)
2. Clicar no botão **"Acessar"**
3. Na próxima tela, digitar a **senha**
4. Aguardar o carregamento da página inicial do Internet Banking

**Dica:** Informar ao usuário para avisar quando o login estiver completo.

### Step 3: Navegar para Extrato

Após o login, há duas formas de acessar o extrato:

**Opção A - Menu Lateral (Recomendado):**
1. No menu lateral esquerdo, na seção "Acessos rápidos"
2. Dentro de "Consultas", clicar em **"Extrato"**

**Opção B - Menu Superior:**
1. Clicar em **"Conta Corrente"** no menu superior
2. Dentro de "Extratos", clicar em **"Extrato"**

**Opção C - URL Direta:**
- Navegar para: https://ibpj.sicredi.com.br/ib-view/extrato/form/1.html?oidTrans=116

### Step 4: Configurar Período do Mês Anterior

Na página de Extrato, dentro da aba **"Movimentações Recentes"**:

1. Localizar os campos de data **"De"** e **"Até"**
2. No campo **"De"**: Inserir o primeiro dia do mês anterior
   - Formato: DD/MM/AAAA
   - Exemplo: Se estamos em Janeiro 2026, inserir **01/12/2025**
3. No campo **"Até"**: Inserir o último dia do mês anterior
   - Exemplo: **31/12/2025**
4. Clicar no botão **"Pesquisar"**
5. Aguardar o carregamento das transações

**Cálculo do mês anterior:**
- Se o mês atual é Janeiro, o mês anterior é Dezembro do ano anterior
- Se o mês atual é qualquer outro, o mês anterior é o mês -1 do mesmo ano
- Último dia do mês: verificar se é 28, 29, 30 ou 31

### Step 5: Baixar o Arquivo OFX

1. Após carregar o extrato, fazer **scroll até o final da página**
2. Localizar a seção com os botões de exportação:
   - Gerar PDF
   - Gerar Planilha
   - **Gerar OFX** ← Clicar neste
   - Gerar CNAB240
   - Imprimir
3. **Solicitar confirmação do usuário** antes de clicar no botão de download
4. Clicar no botão **"Gerar OFX"** usando **JavaScript** (ver seção Workaround abaixo)
5. O arquivo será baixado automaticamente

**IMPORTANTE - Workaround para Clique:**
Os cliques diretos (coordenadas ou ref) podem não funcionar nos botões de exportação do Sicredi.
Use JavaScript para garantir o clique:

```javascript
// Usar javascript_tool com este código:
const buttons = document.querySelectorAll('button');
let ofxButton = null;
buttons.forEach(btn => {
  if (btn.textContent.includes('Gerar OFX') || btn.innerText.includes('Gerar OFX')) {
    ofxButton = btn;
  }
});
if (ofxButton) {
  ofxButton.click();
  'OFX button found and clicked';
} else {
  'OFX button not found';
}
```

### Step 6: Verificar Download

1. O arquivo OFX será baixado para a pasta de downloads do navegador
2. Nome típico do arquivo: `extrato.ofx` ou similar
3. Mover o arquivo para o diretório `data/ofx/` do projeto
4. Renomear para um nome descritivo: `sicredi-MMMM-AAAA.ofx` (ex: `sicredi-dezembro-2025.ofx`)

## Elementos da Interface

### Tela de Login
- Campo de texto para CNPJ (placeholder: "Ex.:00.000.000/0000-00")
- Botão verde "Acessar"

### Tela de Extrato
- Abas: "Movimentações Recentes" | "Movimentações Anteriores"
- Dropdown "Período do Extrato" com opções:
  - Hoje
  - Últimos 3/7/15/30 dias
  - Mês atual
  - Mês atual + Mês anterior
  - Extratos + Antigos
- Campos de data: "De" e "Até" (formato DD/MM/AAAA)
- Botão "Pesquisar"
- Tabela com transações (Data, Descrição, Documento, Valor, Saldo)
- Seção "Saldo da Conta" com informações do saldo atual
- Seção "Lançamentos Futuros" (expansível)
- Botões de exportação no final da página

## Checklist de Execução

1. [ ] Abrir navegador e acessar Sicredi
2. [ ] Navegar para login PJ
3. [ ] **USUÁRIO:** Realizar login (CNPJ + senha)
4. [ ] Navegar para página de Extrato
5. [ ] Configurar período do mês anterior (De/Até)
6. [ ] Pesquisar extrato
7. [ ] Scroll até o final da página
8. [ ] **CONFIRMAR COM USUÁRIO:** Permissão para download
9. [ ] Clicar em "Gerar OFX"
10. [ ] Verificar download do arquivo
11. [ ] Mover arquivo para `data/ofx/`

## Regras de Segurança

**OBRIGATÓRIO:**
- **NUNCA** inserir CNPJ, senha ou qualquer credencial bancária
- **SEMPRE** solicitar que o usuário faça login manualmente
- **SEMPRE** pedir confirmação antes de clicar em botões de download
- **NUNCA** capturar ou armazenar credenciais
- **SEMPRE** informar ao usuário cada ação que será realizada

## Troubleshooting

### Sessão expirada
Se a sessão expirar durante o processo:
1. Navegar novamente para a página de login
2. Solicitar que o usuário faça login novamente

### Extrato não carrega
1. Verificar se as datas estão no formato correto (DD/MM/AAAA)
2. Verificar se o período não excede o limite permitido pelo banco
3. Tentar usar a aba "Movimentações Anteriores" e selecionar ano/mês

### Botão OFX não aparece
1. Verificar se o scroll chegou ao final da página
2. Verificar se há transações no período selecionado
3. Tentar pesquisar novamente

### Erro no download
1. Verificar conexão com internet
2. Verificar se há pop-ups bloqueados
3. Tentar novamente após alguns segundos

### Clique no botão não funciona
Os botões de exportação do Sicredi podem não responder a cliques diretos via coordenadas ou referências de elemento. **Solução:**

1. **Usar JavaScript** para clicar no botão (método recomendado):
   ```javascript
   const buttons = document.querySelectorAll('button');
   buttons.forEach(btn => {
     if (btn.textContent.includes('Gerar OFX')) btn.click();
   });
   ```

2. Se o JavaScript também falhar, tentar:
   - Recarregar a página e pesquisar novamente
   - Verificar se a sessão não expirou
   - Tentar em outro momento (pode ser problema temporário do site)

## Destino do Arquivo

Após o download, o arquivo OFX deve ser movido para:
```
data/ofx/sicredi-{mes}-{ano}.ofx
```

Exemplo: `data/ofx/sicredi-dezembro-2025.ofx`

## Integração com Skill Mensal

Esta skill é parte do workflow mensal de importação de arquivos bancários. Após baixar o OFX:

1. Executar a skill `/mensal` para importar o arquivo
2. Seguir os passos de importação e categorização

## Quando Usar Esta Skill

Use esta skill quando:
- No início de cada mês, para baixar o extrato do mês anterior
- Quando precisar reimportar dados do Sicredi
- Quando o arquivo OFX original foi perdido ou corrompido

## Exemplo de Execução

```
Usuário: /sicredi-ofx-download

Claude: Vou ajudá-lo a baixar o extrato OFX do Sicredi do mês anterior.

1. Abrindo o navegador e navegando para o Sicredi...
2. [Navega para página de login PJ]

Por favor, faça login com seu CNPJ e senha. Me avise quando estiver logado.

Usuário: Pronto, logado.

Claude: 3. Navegando para a página de Extrato...
4. Configurando período para dezembro/2025 (01/12/2025 a 31/12/2025)...
5. Pesquisando extrato...
6. Fazendo scroll até o final da página...

Encontrei o botão "Gerar OFX". Posso clicar para fazer o download?

Usuário: Sim, pode baixar.

Claude: 7. Clicando em "Gerar OFX"...
8. Download iniciado!

O arquivo foi baixado. Por favor, mova-o para data/ofx/sicredi-dezembro-2025.ofx
```
