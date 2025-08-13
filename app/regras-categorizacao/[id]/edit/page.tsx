import { notFound } from 'next/navigation';
import { getRuleAction } from '@/lib/actions/rule-management-actions';
import { prisma } from '@/lib/database/client';
import RuleEditPage from './components/RuleEditPage';

interface Props {
  params: { id: string };
}

async function getFormData() {
  const [categories, properties, bankAccounts] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { orderIndex: 'asc' }],
      select: {
        id: true,
        name: true,
        level: true,
        orderIndex: true,
        parentId: true,
      },
    }),
    prisma.property.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        description: true,
        city: true,
        address: true,
      },
    }),
    prisma.bankAccount.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        bankName: true,
        accountType: true,
        isActive: true,
      },
    }),
  ]);

  return { categories, properties, bankAccounts };
}

export default async function EditRulePage({ params }: Props) {
  const ruleResult = await getRuleAction(params.id);
  
  if (!ruleResult.success || !ruleResult.data) {
    notFound();
  }

  const formData = await getFormData();

  return (
    <RuleEditPage 
      rule={ruleResult.data} 
      formData={formData}
    />
  );
}