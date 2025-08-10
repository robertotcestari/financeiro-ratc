const { PrismaClient, CategoryType } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createSampleCategories() {
  console.log('Criando categorias de exemplo...');

  try {
    // Categorias de Despesa - Nível 1 (Principal)
    const despesasOperacionais = await prisma.category.create({
      data: {
        name: 'Despesas Operacionais',
        type: CategoryType.EXPENSE,
        level: 1,
        orderIndex: 1,
        isSystem: false
      }
    });

    const despesasImovel = await prisma.category.create({
      data: {
        name: 'Despesas com Imóvel',
        type: CategoryType.EXPENSE,
        level: 1,
        orderIndex: 2,
        isSystem: false
      }
    });

    // Subcategorias de Despesas Operacionais - Nível 2
    await prisma.category.create({
      data: {
        name: 'Taxas Bancárias',
        type: CategoryType.EXPENSE,
        parentId: despesasOperacionais.id,
        level: 2,
        orderIndex: 1,
        isSystem: false
      }
    });

    await prisma.category.create({
      data: {
        name: 'Contador e Advogado',
        type: CategoryType.EXPENSE,
        parentId: despesasOperacionais.id,
        level: 2,
        orderIndex: 2,
        isSystem: false
      }
    });

    // Subcategorias de Despesas com Imóvel - Nível 2
    await prisma.category.create({
      data: {
        name: 'IPTU',
        type: CategoryType.EXPENSE,
        parentId: despesasImovel.id,
        level: 2,
        orderIndex: 1,
        isSystem: false
      }
    });

    await prisma.category.create({
      data: {
        name: 'Manutenção',
        type: CategoryType.EXPENSE,
        parentId: despesasImovel.id,
        level: 2,
        orderIndex: 2,
        isSystem: false
      }
    });

    // Categorias de Receita - Nível 1 (Principal)
    const receitaAluguel = await prisma.category.create({
      data: {
        name: 'Receita de Aluguel',
        type: CategoryType.INCOME,
        level: 1,
        orderIndex: 1,
        isSystem: false
      }
    });

    const outrasReceitas = await prisma.category.create({
      data: {
        name: 'Outras Receitas',
        type: CategoryType.INCOME,
        level: 1,
        orderIndex: 2,
        isSystem: false
      }
    });

    // Subcategorias de Receita de Aluguel - Nível 2
    await prisma.category.create({
      data: {
        name: 'Aluguel Residencial',
        type: CategoryType.INCOME,
        parentId: receitaAluguel.id,
        level: 2,
        orderIndex: 1,
        isSystem: false
      }
    });

    await prisma.category.create({
      data: {
        name: 'Aluguel Comercial',
        type: CategoryType.INCOME,
        parentId: receitaAluguel.id,
        level: 2,
        orderIndex: 2,
        isSystem: false
      }
    });

    // Categorias de Transferência
    await prisma.category.create({
      data: {
        name: 'Transferência entre Contas',
        type: CategoryType.TRANSFER,
        level: 1,
        orderIndex: 1,
        isSystem: true
      }
    });

    console.log('✅ Categorias de exemplo criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar categorias:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleCategories();