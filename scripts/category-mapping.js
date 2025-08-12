// Mapping from old category names to new category IDs
const categoryMapping = {
  // Receitas Operacionais
  'Aluguel': 'cat-aluguel',
  'Aluguel de Terceiros': 'cat-aluguel-terceiros',
  
  // Despesas Operacionais - Administrativas
  'Tarifas Bancárias': 'cat-tarifas-bancarias',
  'Escritórios e Postagens': 'cat-escritorios',
  'Contabilidade': 'cat-contabilidade',
  'Salários': 'cat-salarios',
  'FGTS': 'cat-fgts',
  'INSS': 'cat-inss',
  'TI': 'cat-ti',
  'Documentações e Jurídico': 'cat-documentacoes', // ou cat-juridico dependendo do contexto
  
  // Despesas Operacionais - Imóveis
  'Condomínios': 'cat-condominios',
  'IPTU': 'cat-iptu',
  'Água e Esgoto': 'cat-agua',
  'Energia Elétrica': 'cat-energia',
  'Telefone e Internet': 'cat-internet',
  'Manutenção': 'cat-manutencao',
  'Reformas': 'cat-reformas',
  
  // Despesas Operacionais - Tributárias
  'IRPJ': 'cat-irpj',
  'Outros Impostos': 'cat-impostos-taxas',
  'PIS': 'cat-pis',
  'Cofins': 'cat-cofins',
  'CSLL': 'cat-csll',
  'Taxa de Fiscalização': 'cat-taxa-fiscalizacao',
  
  // Despesas Operacionais - Repasse
  'Repasse de Aluguel': 'cat-repasse-aluguel',
  
  // Receitas não Operacionais
  'Juros Bancários': 'cat-rendimentos-financeiros',
  'Depósitos Caução': 'cat-deposito-caucao',
  'Aporte de Capital': 'cat-aporte-capital',
  
  // Despesas não Operacionais
  'Despesas Pessoais Sócios': 'cat-despesas-pessoais-socios',
  'Investimentos em Terceiros': 'cat-investimentos-terceiros',
  'Compra de Imóveis': 'cat-compra-ativos',
  'Outras Despesas': 'cat-outras-despesas-nao-operacionais',
  
  // Ajustes - podem ser receita ou despesa dependendo do valor
  'Ajuste de Saldo': null, // será determinado pelo valor (+ ou -)
  
  // Transferências
  'Transferência entre Contas': 'cat-transferencia-entre-contas'
};

module.exports = { categoryMapping };