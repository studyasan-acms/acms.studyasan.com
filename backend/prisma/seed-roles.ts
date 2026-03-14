import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding teacher roles...');

    // Define comprehensive permissions structure
    const createRole = async (name: string, description: string, permissions: any) => {
        return prisma.teacherRole.upsert({
            where: { name },
            update: { description, permissions, is_active: true },
            create: { name, description, permissions, is_active: true },
        });
    };

    // 1. Accountant Role - Manages finances and enrollments
    await createRole(
        'Accountant',
        'Manages student enrollments, payments, and financial records',
        {
            students: { view: true, create: false, update: false, delete: false },
            teachers: { view: false, create: false, update: false, delete: false },
            subjects: { view: true, create: false, update: false, delete: false },
            boards: { view: true, create: false, update: false, delete: false },
            classes: { view: true, create: false, update: false, delete: false },
            classSessions: { view: true, create: false, update: false, delete: false },
            enrollments: { view: true, create: true, update: true, delete: true },
            payments: { view: true, create: false, update: true, delete: false },
            testSeries: { view: true, create: false, update: false, delete: false },
            activityGroups: { view: true, create: false, update: false, delete: false },
            notifications: { create: false, sendToRole: false },
            enquiries: { view: true, create: false, update: true, delete: false },
            analytics: { viewAdmin: true },
            accountDeletion: { manage: false },
            chat: { viewAll: false },
        }
    );

    // 2. Coordinator Role - Manages students and enrollments
    await createRole(
        'Coordinator',
        'Manages students, enrollments, and handles enquiries',
        {
            students: { view: true, create: true, update: true, delete: true },
            teachers: { view: true, create: false, update: false, delete: false },
            subjects: { view: true, create: false, update: false, delete: false },
            boards: { view: true, create: false, update: false, delete: false },
            classes: { view: true, create: false, update: false, delete: false },
            classSessions: { view: true, create: false, update: false, delete: false },
            enrollments: { view: true, create: true, update: true, delete: true },
            payments: { view: true, create: false, update: false, delete: false },
            testSeries: { view: true, create: false, update: false, delete: false },
            activityGroups: { view: true, create: false, update: false, delete: false },
            notifications: { create: true, sendToRole: false },
            enquiries: { view: true, create: false, update: true, delete: true },
            analytics: { viewAdmin: true },
            accountDeletion: { manage: false },
            chat: { viewAll: true },
        }
    );

    // 3. Senior Teacher Role - Can manage subjects, teachers, and content
    await createRole(
        'Senior Teacher',
        'Manages subjects, other teachers, test series, and activity groups',
        {
            students: { view: true, create: false, update: false, delete: false },
            teachers: { view: true, create: true, update: true, delete: false },
            subjects: { view: true, create: true, update: true, delete: true },
            boards: { view: true, create: true, update: true, delete: false },
            classes: { view: true, create: true, update: true, delete: false },
            classSessions: { view: true, create: true, update: true, delete: true },
            enrollments: { view: true, create: false, update: false, delete: false },
            payments: { view: false, create: false, update: false, delete: false },
            testSeries: { view: true, create: true, update: true, delete: true },
            activityGroups: { view: true, create: true, update: true, delete: true },
            notifications: { create: true, sendToRole: true },
            enquiries: { view: true, create: false, update: true, delete: false },
            analytics: { viewAdmin: true },
            accountDeletion: { manage: false },
            chat: { viewAll: true },
        }
    );

    // 4. Content Manager Role - Manages educational content
    await createRole(
        'Content Manager',
        'Manages subjects, test series, activity groups, and educational content',
        {
            students: { view: true, create: false, update: false, delete: false },
            teachers: { view: true, create: false, update: false, delete: false },
            subjects: { view: true, create: true, update: true, delete: false },
            boards: { view: true, create: false, update: false, delete: false },
            classes: { view: true, create: false, update: false, delete: false },
            classSessions: { view: true, create: false, update: false, delete: false },
            enrollments: { view: true, create: false, update: false, delete: false },
            payments: { view: false, create: false, update: false, delete: false },
            testSeries: { view: true, create: true, update: true, delete: false },
            activityGroups: { view: true, create: true, update: true, delete: false },
            notifications: { create: true, sendToRole: false },
            enquiries: { view: false, create: false, update: false, delete: false },
            analytics: { viewAdmin: false },
            accountDeletion: { manage: false },
            chat: { viewAll: false },
        }
    );

    // 5. Administrator Assistant Role - Has most admin permissions except critical ones
    await createRole(
        'Administrator Assistant',
        'Has broad administrative permissions except account deletion and teacher management',
        {
            students: { view: true, create: true, update: true, delete: true },
            teachers: { view: true, create: false, update: false, delete: false },
            subjects: { view: true, create: true, update: true, delete: true },
            boards: { view: true, create: true, update: true, delete: true },
            classes: { view: true, create: true, update: true, delete: true },
            classSessions: { view: true, create: true, update: true, delete: true },
            enrollments: { view: true, create: true, update: true, delete: true },
            payments: { view: true, create: false, update: true, delete: false },
            testSeries: { view: true, create: true, update: true, delete: true },
            activityGroups: { view: true, create: true, update: true, delete: true },
            notifications: { create: true, sendToRole: true },
            enquiries: { view: true, create: false, update: true, delete: true },
            analytics: { viewAdmin: true },
            accountDeletion: { manage: false },
            chat: { viewAll: true },
        }
    );

    console.log('✅ Seeded 5 default teacher roles');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
