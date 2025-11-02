import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await hash('password123', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@attackcapital.com' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@attackcapital.com',
      name: 'Demo User',
    },
  });

  console.log('✅ Created demo user:', user.email);
  console.log('   Email: demo@attackcapital.com');
  console.log('   Password: password123');

  console.log('🌱 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
