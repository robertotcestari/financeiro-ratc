import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInadimplentes() {
  try {
    console.log('Checking inadimplentes data...');

    const rows = await prisma.$queryRaw`
      SELECT id, type, data, createdAt
      FROM meta
      WHERE type = 'INADIMPLENTES'
      ORDER BY createdAt DESC
    `;

    console.log('Found rows:', rows.length);
    rows.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, {
        id: row.id,
        type: row.type,
        createdAt: row.createdAt,
        data: row.data
      });
    });

    // Also check properties
    const properties = await prisma.property.findMany({
      select: { id: true, code: true, address: true }
    });

    console.log('Properties:', properties);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInadimplentes();