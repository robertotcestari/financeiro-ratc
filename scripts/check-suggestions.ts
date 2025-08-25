import { prisma } from '../lib/core/database/client';

async function main() {
  const appliedCount = await prisma.transactionSuggestion.count({
    where: { isApplied: true }
  });
  
  const notAppliedCount = await prisma.transactionSuggestion.count({
    where: { isApplied: false }
  });
  
  const totalCount = await prisma.transactionSuggestion.count();
  
  console.log('Suggestion counts:');
  console.log('- Total:', totalCount);
  console.log('- Applied:', appliedCount);
  console.log('- Not applied:', notAppliedCount);
  
  // Check recent suggestions
  const recentSuggestions = await prisma.transactionSuggestion.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      rule: true,
      suggestedCategory: true,
      suggestedProperty: true
    }
  });
  
  console.log('\nRecent suggestions:');
  recentSuggestions.forEach((s: any) => {
    console.log(`- ${s.id}: rule=${s.ruleId}, applied=${s.isApplied}, confidence=${s.confidence}, category=${s.suggestedCategory?.name || 'none'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());