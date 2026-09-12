import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding Executive Admin users (CEO & COO)...');
  
  const rawPassword = 'Sa@1234!';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  
  const executives = [
    {
      name: 'Deepak kumar Arya',
      email: 'ceo@studyasan.com',
      phone: '7409888805',
      role: 'ADMIN' as const,
    },
    {
      name: 'Kadimbini Gahtory',
      email: 'coo@studyasan.com',
      phone: '9548682613',
      role: 'ADMIN' as const,
    },
  ];

  for (const exec of executives) {
    const user = await prisma.user.upsert({
      where: { email: exec.email },
      update: {
        name: exec.name,
        phone: exec.phone,
        password: hashedPassword,
        role: exec.role,
        delete_requested: false,
        delete_verified: false,
      },
      create: {
        name: exec.name,
        email: exec.email,
        phone: exec.phone,
        password: hashedPassword,
        role: exec.role,
      },
    });

    console.log(`   ✅ Seeded/Updated Admin: ${user.name} (${user.email}) - Phone: ${user.phone}`);
  }

  console.log('🎉 Executive Admin seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during executive seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
