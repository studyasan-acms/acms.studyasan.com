import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting admin-only database seeding...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@studyasan.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      name: 'Admin User',
      email: 'admin@studyasan.com',
      phone: '+919876543210',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`   ✅ Seeded/Updated admin user: ${admin.email}`);
  console.log('🎉 Admin seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during admin seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
