import { PrismaClient, AccountType } from '../../app/generated/prisma'
import bankAccounts from './bankAccounts.json'

export async function seedBankAccounts(prisma: PrismaClient) {
  console.log('📦 Creating bank accounts...')
  
  const results = []
  for (const account of bankAccounts) {
    const result = await prisma.bankAccount.upsert({
      where: { name: account.name },
      update: {},
      create: {
        name: account.name,
        bankName: account.bankName,
        accountType: account.accountType as AccountType,
      }
    })
    results.push(result)
  }
  
  console.log(`   ✅ Created/updated ${results.length} bank accounts`)
  return results
}