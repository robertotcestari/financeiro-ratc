import { PrismaClient } from '@/app/generated/prisma';

const prisma = new PrismaClient();

async function verifyCategorizationRules() {
  console.log('🔍 Verifying categorization rules with property links...\n');

  // Fetch all rules that have property links
  const rulesWithProperties = await prisma.categorizationRule.findMany({
    where: {
      propertyId: {
        not: null
      }
    },
    include: {
      property: true,
      category: true
    },
    orderBy: {
      priority: 'desc'
    }
  });

  console.log(`📊 Found ${rulesWithProperties.length} rules with property links:\n`);

  // Group by category for better visualization
  const rulesByCategory = rulesWithProperties.reduce((acc, rule) => {
    const categoryName = rule.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(rule);
    return acc;
  }, {} as Record<string, typeof rulesWithProperties>);

  // Display rules grouped by category
  for (const [categoryName, rules] of Object.entries(rulesByCategory)) {
    console.log(`\n📂 Category: ${categoryName}`);
    console.log('─'.repeat(60));
    
    for (const rule of rules) {
      const criteria = rule.criteria as any;
      const keywords = criteria?.description?.keywords?.[0] || 'N/A';
      console.log(`  ✅ ${rule.name}`);
      console.log(`     Property: ${rule.property?.code || 'N/A'}`);
      console.log(`     Keywords: ${keywords}`);
      console.log(`     Priority: ${rule.priority}`);
    }
  }

  // Summary statistics
  console.log('\n' + '═'.repeat(60));
  console.log('📈 Summary Statistics:');
  console.log('─'.repeat(60));
  
  const totalRules = await prisma.categorizationRule.count();
  const rulesWithoutProperties = await prisma.categorizationRule.count({
    where: {
      propertyId: null
    }
  });

  console.log(`  Total categorization rules: ${totalRules}`);
  console.log(`  Rules with property links: ${rulesWithProperties.length}`);
  console.log(`  Rules without property links: ${rulesWithoutProperties}`);
  console.log(`  Coverage: ${((rulesWithProperties.length / totalRules) * 100).toFixed(1)}% of rules have property links`);

  // Check for specific rental rules
  console.log('\n🏠 Rental Rules with Properties:');
  console.log('─'.repeat(60));
  
  const rentalRules = rulesWithProperties.filter(rule => 
    rule.category.name === 'Aluguel' || rule.category.name === 'Aluguel de Terceiros'
  );

  console.log(`  Found ${rentalRules.length} rental rules with property links`);
  
  // Sample some rules to show the mapping
  const sampleRules = rentalRules.slice(0, 5);
  for (const rule of sampleRules) {
    const criteria = rule.criteria as any;
    const tenant = criteria?.description?.keywords?.[0] || 'N/A';
    console.log(`    • ${tenant} → ${rule.property?.code}`);
  }
  
  if (rentalRules.length > 5) {
    console.log(`    ... and ${rentalRules.length - 5} more`);
  }
}

verifyCategorizationRules()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });