import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load countries data
const countriesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/countries+states+cities.json'), 'utf-8')
);

async function clearDatabase() {
  console.log('🗑️  Clearing database...');
  
  // Delete in correct order to avoid FK constraint errors
  await prisma.answer.deleteMany();
  await prisma.testAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.test.deleteMany();
  await prisma.studentModuleProgress.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.classSessionAttendance.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.teacherSubjectJunction.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.studentAddress.deleteMany();
  await prisma.teacherAddress.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.city.deleteMany();
  await prisma.state.deleteMany();
  await prisma.country.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.class.deleteMany();
  await prisma.board.deleteMany();
  
  console.log('✅ Database cleared!');
}

async function seedCurrencies() {
  console.log('💰 Seeding currencies...');
  
  const fetchFn = globalThis.fetch ?? (await import('node-fetch').then((m: any) => m.default || m));
  
  const url = new URL('https://restcountries.com/v3.1/all');
  url.searchParams.set('fields', 'currencies');
  
  const res = await fetchFn(url.toString());
  if (!res.ok) {
    console.log('⚠️  Failed to fetch currencies from API, using fallback...');
    
    // Fallback currencies
    const fallbackCurrencies = [
      { code: 'USD', name: 'United States Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    ];
    
    await prisma.currency.createMany({
      data: fallbackCurrencies,
      skipDuplicates: true,
    });
    
    console.log(`✅ Seeded ${fallbackCurrencies.length} fallback currencies`);
    return;
  }
  
  const raw = await res.json();
  const currencyMap: Record<string, { code: string; name: string; symbol: string }> = {};
  
  raw.forEach((country: any) => {
    if (!country.currencies) return;
    
    Object.entries(country.currencies).forEach(([code, data]: [string, any]) => {
      if (!currencyMap[code]) {
        currencyMap[code] = {
          code: code.toUpperCase(),
          name: data.name || code,
          symbol: data.symbol || '',
        };
      }
    });
  });
  
  const currencies = Object.values(currencyMap).sort((a, b) => a.code.localeCompare(b.code));
  
  await prisma.currency.createMany({
    data: currencies,
    skipDuplicates: true,
  });
  
  console.log(`✅ Seeded ${currencies.length} currencies`);
}

async function seedCountriesStatesAndCities() {
  console.log('🌍 Seeding countries, states, and cities...');
  
  // Insert countries
  const countries = countriesData.map((c: any) => ({
    code: c.iso2.toUpperCase(),
    name: c.name,
  }));
  
  await prisma.country.createMany({
    data: countries,
    skipDuplicates: true,
  });
  
  const dbCountries = await prisma.country.findMany();
  const countryMap = new Map(dbCountries.map((c) => [c.code, c.id]));
  
  console.log(`✅ Seeded ${dbCountries.length} countries`);
  
  // Insert states
  const states = [];
  
  for (const c of countriesData) {
    if (Array.isArray(c.states)) {
      for (const s of c.states) {
        const countryId = countryMap.get(c.iso2.toUpperCase());
        if (countryId) {
          states.push({
            name: s.name,
            countryId,
          });
        }
      }
    }
  }
  
  const uniqueStates = states.filter(
    (v, i, a) => a.findIndex((t) => t.name === v.name && t.countryId === v.countryId) === i
  );
  
  await prisma.state.createMany({
    data: uniqueStates,
    skipDuplicates: true,
  });
  
  const dbStates = await prisma.state.findMany();
  const stateMap = new Map(dbStates.map((s) => [`${s.name}-${s.countryId}`, s.id]));
  
  console.log(`✅ Seeded ${dbStates.length} states`);
  
  // Insert cities in batches
  const cities = [];
  
  for (const c of countriesData) {
    const countryId = countryMap.get(c.iso2.toUpperCase());
    if (!countryId || !Array.isArray(c.states)) continue;
    
    for (const s of c.states) {
      const stateId = stateMap.get(`${s.name}-${countryId}`);
      if (!stateId || !Array.isArray(s.cities)) continue;
      
      for (const ct of s.cities) {
        cities.push({
          name: ct.name,
          stateId,
        });
      }
    }
  }
  
  const uniqueCities = cities.filter(
    (v, i, a) => a.findIndex((t) => t.name === v.name && t.stateId === v.stateId) === i
  );
  
  // Insert in batches for performance
  const batchSize = 1000;
  for (let i = 0; i < uniqueCities.length; i += batchSize) {
    const batch = uniqueCities.slice(i, i + batchSize);
    await prisma.city.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`   📍 Inserted cities batch: ${i + batch.length}/${uniqueCities.length}`);
  }
  
  console.log(`✅ Seeded ${uniqueCities.length} cities`);
}

async function seedBoards() {
  console.log('📋 Seeding boards...');
  
  const boards = [
    { name: 'CBSE' },
    { name: 'ICSE' },
    { name: 'State Board' },
    { name: 'IB' },
    { name: 'Cambridge' },
  ];
  
  await prisma.board.createMany({
    data: boards,
    skipDuplicates: true,
  });
  
  console.log(`✅ Seeded ${boards.length} boards`);
  
  return await prisma.board.findMany();
}

async function seedClasses() {
  console.log('🎓 Seeding classes...');
  
  const classes = [
    { name: 'LKG' },
    { name: 'UKG' },
    { name: 'Class 1' },
    { name: 'Class 2' },
    { name: 'Class 3' },
    { name: 'Class 4' },
    { name: 'Class 5' },
    { name: 'Class 6' },
    { name: 'Class 7' },
    { name: 'Class 8' },
    { name: 'Class 9' },
    { name: 'Class 10' },
    { name: 'Class 11' },
    { name: 'Class 12' },
  ];
  
  await prisma.class.createMany({
    data: classes,
    skipDuplicates: true,
  });
  
  console.log(`✅ Seeded ${classes.length} classes`);
  
  return await prisma.class.findMany();
}

async function seedSubjects(classes: any[], boards: any[]) {
  console.log('📚 Seeding subjects...');
  
  // Create only 3 subjects for Class 1 and CBSE board
  const class1 = classes.find(c => c.name === 'Class 1');
  const cbseBoard = boards.find(b => b.name === 'CBSE');
  
  const subjects = [
    {
      name: 'English',
      class_id: class1.id,
      board_id: cbseBoard.id,
      is_course: false,
    },
    {
      name: 'Mathematics',
      class_id: class1.id,
      board_id: cbseBoard.id,
      is_course: false,
    },
    {
      name: 'Science',
      class_id: class1.id,
      board_id: cbseBoard.id,
      is_course: false,
    },
  ];
  
  await prisma.subject.createMany({
    data: subjects,
    skipDuplicates: true,
  });
  
  console.log(`✅ Seeded ${subjects.length} subjects`);
  
  return await prisma.subject.findMany();
}

async function seedUsers() {
  console.log('👥 Seeding users...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Admin user
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@studyasan.com',
      phone: '+919876543210',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  
  console.log(`   ✅ Created admin: ${admin.email}`);
  
  // Create 1 teacher
  const teacher = await prisma.user.create({
    data: {
      name: 'John Smith',
      email: 'teacher@studyasan.com',
      phone: '+919876543211',
      password: hashedPassword,
      role: 'TEACHER',
    },
  });
  console.log(`   ✅ Created teacher: ${teacher.email}`);
  
  // Create 1 student
  const student = await prisma.user.create({
    data: {
      name: 'Jane Doe',
      email: 'student@studyasan.com',
      phone: '+919876543212',
      password: hashedPassword,
      role: 'STUDENT',
    },
  });
  console.log(`   ✅ Created student: ${student.email}`);
  
  return { admin, teachers: [teacher], students: [student] };
}

async function seedTeachers(teacherUsers: any[], subjects: any[]) {
  console.log('👨‍🏫 Seeding teacher profiles...');
  
  // Get INR currency
  const inrCurrency = await prisma.currency.findFirst({ where: { code: 'INR' } });
  
  const teacherUser = teacherUsers[0];
  const teacher = await prisma.teacher.create({
    data: {
      user_id: teacherUser.id,
      salary: 50000,
      salary_currency_id: inrCurrency?.id,
      qualification: 'B.Ed',
      gender: 'M',
      experience: '5 years',
    },
  });
  
  // Assign all 3 subjects to the teacher
  for (const subject of subjects) {
    await prisma.teacherSubjectJunction.create({
      data: {
        teacher_id: teacher.id,
        subject_id: subject.id,
      },
    });
  }
  
  console.log(`   ✅ Created teacher profile for: ${teacherUser.name}`);
}

async function seedStudents(studentUsers: any[], classes: any[], boards: any[]) {
  console.log('👨‍🎓 Seeding student profiles...');
  
  const class1 = classes.find(c => c.name === 'Class 1');
  const cbseBoard = boards.find(b => b.name === 'CBSE');
  const studentUser = studentUsers[0];
  
  await prisma.student.create({
    data: {
      user_id: studentUser.id,
      class_id: class1.id,
      board_id: cbseBoard.id,
      date_of_birth: new Date(2015, 5, 15),
      gender: 'F',
      school: 'Delhi Public School',
      blood_group: 'A_POS',
    },
  });
  
  console.log(`   ✅ Created student profile for: ${studentUser.name}`);
}

async function seedEnrollments(students: any[], subjects: any[]) {
  console.log('📝 Seeding enrollments...');
  
  const dbStudents = await prisma.student.findMany({ include: { user: true } });
  
  for (const student of dbStudents) {
    // Enroll each student in 3-5 subjects from their class and board
    const studentSubjects = subjects.filter(
      (s) => s.class_id === student.class_id && s.board_id === student.board_id
    );
    
    const enrollmentCount = Math.min(studentSubjects.length, 3 + (student.id % 3));
    
    for (let i = 0; i < enrollmentCount; i++) {
      await prisma.enrollment.create({
        data: {
          student_id: student.id,
          subject_id: studentSubjects[i].id,
        },
      });
    }
    
    console.log(`   ✅ Enrolled ${student.user.name} in ${enrollmentCount} subjects`);
  }
}

async function main() {
  console.log('🚀 Starting database seeding...\n');
  
  try {
    // Step 1: Clear database
    await clearDatabase();
    
    // Step 2: Seed currencies
    await seedCurrencies();
    
    // Step 3: Seed countries, states, and cities
    await seedCountriesStatesAndCities();
    
    // Step 4: Seed boards
    const boards = await seedBoards();
    
    // Step 5: Seed classes
    const classes = await seedClasses();
    
    // Step 6: Seed subjects
    const subjects = await seedSubjects(classes, boards);
    
    // Step 7: Seed users
    const { admin, teachers, students } = await seedUsers();
    
    // Step 8: Seed teacher profiles
    await seedTeachers(teachers, subjects);
    
    // Step 9: Seed student profiles
    await seedStudents(students, classes, boards);
    
    // Step 10: Seed enrollments
    await seedEnrollments(students, subjects);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Boards: ${boards.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Subjects: ${subjects.length}`);
    console.log(`   - Users: ${1 + teachers.length + students.length} (1 admin, ${teachers.length} teacher, ${students.length} student)`);
    console.log('\n🔐 Default credentials:');
    console.log('   - Admin: admin@studyasan.com / password123');
    console.log('   - Teacher: teacher@studyasan.com / password123');
    console.log('   - Student: student@studyasan.com / password123');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

