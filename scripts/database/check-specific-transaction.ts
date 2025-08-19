import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

async function checkSpecificTransaction() {
  console.log('🔍 VERIFICANDO TRANSAÇÃO ESPECÍFICA: 1370.75 de 30/06/2025')
  console.log('============================================================')
  
  // Buscar todas as transações com valor 1370.75
  const transactions = await prisma.transaction.findMany({
    where: {
      amount: 1370.75
    },
    include: {
      bankAccount: true,
      processedTransaction: true
    },
    orderBy: { date: 'desc' }
  })
  
  console.log(`📊 Encontradas ${transactions.length} transações com valor 1370.75`)
  
  for (const tx of transactions) {
    console.log(`\n💳 Transaction ID: ${tx.id}`)
    console.log(`   📅 Data: ${tx.date.toISOString().slice(0, 10)}`)
    console.log(`   🏦 Conta: ${tx.bankAccount.name}`)
    console.log(`   💰 Valor: ${tx.amount}`)
    console.log(`   📊 Saldo: ${tx.balance}`)
    console.log(`   📝 Descrição: ${tx.description}`)
    console.log(`   🔗 Processed Transaction: ${tx.processedTransaction ? 'SIM' : 'NÃO'}`)
    
    if (tx.processedTransaction) {
      console.log(`      🏷️  Categoria: ${tx.processedTransaction.categoryId}`)
      console.log(`      🏠 Propriedade: ${tx.processedTransaction.propertyId || 'N/A'}`)
    }
  }
  
  // Verificar se o ID específico do CSV existe
  const specificTransaction = await prisma.transaction.findUnique({
    where: { id: 'cme8lkb3x0edhzpj6ryzhme77' },
    include: {
      bankAccount: true,
      processedTransaction: true
    }
  })
  
  console.log(`\n🔍 TRANSAÇÃO ESPECÍFICA DO CSV (ID: cme8lkb3x0edhzpj6ryzhme77):`)
  if (specificTransaction) {
    console.log(`   ✅ ENCONTRADA`)
    console.log(`   📅 Data: ${specificTransaction.date.toISOString().slice(0, 10)}`)
    console.log(`   💰 Valor: ${specificTransaction.amount}`)
    console.log(`   📊 Saldo: ${specificTransaction.balance}`)
    console.log(`   🔗 Unified Transaction: ${specificTransaction.unifiedTransaction ? 'SIM' : 'NÃO'}`)
  } else {
    console.log(`   ❌ NÃO ENCONTRADA`)
  }
}

checkSpecificTransaction()
  .catch(console.error)
  .finally(() => prisma.$disconnect())