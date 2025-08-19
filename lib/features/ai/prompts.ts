import type { CategoryInfo, PropertyInfo, HistoricalPattern } from './types';

export class PromptBuilder {
  /**
   * Builds the system prompt for transaction categorization
   */
  static buildSystemPrompt(
    categories: CategoryInfo[],
    properties: PropertyInfo[],
    historicalPatterns: HistoricalPattern[] = []
  ): string {
    const categoriesSection = this.buildCategoriesSection(categories);
    const propertiesSection = this.buildPropertiesSection(properties);
    const historicalSection = this.buildHistoricalSection(historicalPatterns);

    return `Você é um assistente especializado em categorizar transações financeiras de uma imobiliária.

CATEGORIAS DISPONÍVEIS:
${categoriesSection}

PROPRIEDADES DISPONÍVEIS:
${propertiesSection}

${historicalSection}

INSTRUÇÕES:

1. SEMPRE use o ID EXATO da categoria conforme listado acima (o código antes dos dois pontos)
2. Identifique a categoria mais apropriada baseando-se na descrição da transação
3. Se a transação se refere a uma propriedade específica, identifique-a pelo código ou endereço mencionado
4. Transações de aluguel, manutenção, condomínio e IPTU DEVEM OBRIGATORIAMENTE ter uma propriedade associada
5. Despesas administrativas gerais podem não ter propriedade específica
6. Use o histórico como referência para padrões similares quando disponível
7. Forneça sempre uma explicação clara e concisa do raciocínio usado

REGRAS ESPECÍFICAS:
- Transferências entre contas: categoria "Transferência Entre Contas"
- Tarifas bancárias: categoria "Tarifas Bancárias"
- Pagamentos de condomínio: categoria "Condomínios" + propriedade específica
- Pagamentos de IPTU: categoria "IPTU" + propriedade específica
- Receitas de aluguel: categoria "Aluguel" + propriedade quando identificável
- Manutenções e reparos: categoria "Manutenção" + propriedade específica (obrigatório)

Retorne APENAS um JSON válido seguindo exatamente o formato especificado.`;
  }

  /**
   * Builds the categories section of the prompt
   */
  private static buildCategoriesSection(categories: CategoryInfo[]): string {
    // Group categories by level for better organization
    const level1 = categories.filter((c) => c.level === 1);
    const level2 = categories.filter((c) => c.level === 2);
    const level3 = categories.filter((c) => c.level === 3);

    const lines: string[] = [];
    lines.push(
      'IMPORTANTE: Use SEMPRE o ID exato da categoria (campo antes dos dois pontos).\n'
    );

    // Build hierarchical structure
    level1.forEach((cat1) => {
      lines.push(`• ${cat1.id}: ${cat1.name} (${cat1.type})`);

      const children2 = level2.filter((c) => c.parentName === cat1.name);
      children2.forEach((cat2) => {
        lines.push(`  ├─ ${cat2.id}: ${cat2.name}`);

        const children3 = level3.filter((c) => c.parentName === cat2.name);
        children3.forEach((cat3, index) => {
          const isLast = index === children3.length - 1;
          lines.push(`  │  ${isLast ? '└─' : '├─'} ${cat3.id}: ${cat3.name}`);
        });

        // If no level 3 children, show that level 2 can be used directly
        if (children3.length === 0) {
          lines.push(`  │  └─ (Use este ID: ${cat2.id})`);
        }
      });
    });

    return lines.join('\n');
  }

  /**
   * Builds the properties section of the prompt
   */
  private static buildPropertiesSection(properties: PropertyInfo[]): string {
    // Group properties by city for better organization
    const propertiesByCity = properties.reduce((acc, prop) => {
      if (!acc[prop.city]) {
        acc[prop.city] = [];
      }
      acc[prop.city].push(prop);
      return acc;
    }, {} as Record<string, PropertyInfo[]>);

    const lines: string[] = [];

    Object.entries(propertiesByCity).forEach(([city, props]) => {
      lines.push(`\n${city}:`);
      props.forEach((prop) => {
        lines.push(`- ID: ${prop.id} | Código: ${prop.code} | ${prop.address}`);
      });
    });

    return lines.join('\n');
  }

  /**
   * Builds the historical patterns section of the prompt
   */
  private static buildHistoricalSection(patterns: HistoricalPattern[]): string {
    if (patterns.length === 0) {
      return '';
    }

    const lines = ['TRANSAÇÕES ANTERIORES SIMILARES:'];

    // Sort by frequency and take top 20 patterns
    const topPatterns = patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    topPatterns.forEach((pattern) => {
      const propertyPart = pattern.propertyCode
        ? `, Propriedade: ${pattern.propertyCode}`
        : '';
      lines.push(
        `- "${pattern.description}" → Categoria: ${pattern.categoryName}${propertyPart} (${pattern.frequency}x)`
      );
    });

    return lines.join('\n');
  }

  /**
   * Builds a prompt for batch processing
   */
  static buildBatchPrompt(
    categories: CategoryInfo[],
    properties: PropertyInfo[],
    historicalPatterns: HistoricalPattern[] = [],
    batchSize: number
  ): string {
    const systemPrompt = this.buildSystemPrompt(
      categories,
      properties,
      historicalPatterns
    );

    return `${systemPrompt}

IMPORTANTE: Você receberá ${batchSize} transação(ões) para categorizar.
Retorne um array JSON com exatamente ${batchSize} sugestão(ões) na mesma ordem das transações recebidas.

IMPORTANTE: CADA SUGESTÃO DEVE INCLUIR O transactionId DA TRANSAÇÃO CORRESPONDENTE!

Formato esperado:
{
  "suggestions": [
    {
      "suggestion": {
        "transactionId": "id_da_transacao_OBRIGATORIO",
        "categoryId": "id_da_categoria",
        "categoryName": "nome_da_categoria",
        "propertyId": "id_da_propriedade_ou_null",
        "propertyCode": "codigo_da_propriedade_ou_null",
        "reasoning": "explicação clara e concisa"
      },
      "metadata": {
        "processingTime": 0,
        "modelUsed": "gpt-5-mini"
      }
    }
  ]
}`;
  }

  /**
   * Builds a simplified prompt for single transaction
   */
  static buildSinglePrompt(
    categories: CategoryInfo[],
    properties: PropertyInfo[],
    historicalPatterns: HistoricalPattern[] = []
  ): string {
    const systemPrompt = this.buildSystemPrompt(
      categories,
      properties,
      historicalPatterns
    );

    return `${systemPrompt}

Formato esperado para resposta:
{
  "suggestion": {
    "transactionId": "id_da_transacao_OBRIGATORIO",
    "categoryId": "id_da_categoria",
    "categoryName": "nome_da_categoria",
    "propertyId": "id_da_propriedade_ou_undefined_se_nao_aplicavel",
    "propertyCode": "codigo_da_propriedade_ou_undefined_se_nao_aplicavel",
    "reasoning": "explicação clara e concisa do raciocínio"
  },
  "metadata": {
    "processingTime": 0,
    "modelUsed": "gpt-5-mini"
  }
}`;
  }
}
