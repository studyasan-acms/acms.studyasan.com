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

const SUBJECT_LIBRARY = [
  'English',
  'Mathematics',
  'Science',
  'Social Studies',
  'EVS',
  'Hindi',
  'Computer',
  'GK',
  'Art',
  'Music',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Civics',
  'Economics',
  'French',
  'Sanskrit',
  'Coding',
  'Robotics',
  'Environmental Science',
  'Business Studies',
  'Accountancy',
  'Information Technology',
  'Literature',
  'Spoken English',
  'Advanced Mathematics',
  'Applied Science',
  'Value Education',
];

const CLASS_NAMES = [
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
];

const TEACHER_NAMES = [
  'John Smith',
  'Priya Sharma',
  'Aman Verma',
  'Neha Gupta',
  'Rahul Mehta',
  'Ananya Iyer',
  'Vikram Rao',
  'Sneha Kapoor',
  'Arjun Patel',
  'Fatima Khan',
  'Karan Singh',
  'Meera Joshi',
  'Rohit Kulkarni',
  'Nisha Das',
  'Kabir Sethi',
  'Pooja Nair',
  'Sanjay Bansal',
  'Isha Malhotra',
  'Dev Prakash',
  'Shreya Menon',
];

const STUDENT_NAMES = [
  'Jane Doe',
  'Harmeet Kaur',
  'Aleeza Khan',
  'Bhoomika Arya',
  'Rohan Das',
  'Anika Sharma',
  'Arnav Jain',
  'Sara Ali',
  'Kabir Rao',
  'Ira Gupta',
  'Vihaan Mehta',
  'Mahi Verma',
  'Ayaan Khan',
  'Tanya Singh',
  'Devika Nair',
  'Reyansh Patel',
  'Naina Kapoor',
  'Yash Joshi',
  'Siya Malhotra',
  'Rudra Iyer',
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

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

  const classes = CLASS_NAMES.map((name) => ({ name }));
  
  await prisma.class.createMany({
    data: classes,
    skipDuplicates: true,
  });
  
  console.log(`✅ Seeded ${classes.length} classes`);
  
  return await prisma.class.findMany();
}

async function seedSubjects(classes: any[], boards: any[]) {
  console.log('📚 Seeding subjects...');

  const cbseBoard = boards.find(b => b.name === 'CBSE');
  const icseBoard = boards.find(b => b.name === 'ICSE');
  const stateBoard = boards.find(b => b.name === 'State Board');
  const ibBoard = boards.find(b => b.name === 'IB');
  const cambridgeBoard = boards.find(b => b.name === 'Cambridge');

  const boardCycle = [cbseBoard, icseBoard, stateBoard, ibBoard, cambridgeBoard].filter(Boolean);
  const subjects = classes.flatMap((classItem, classIndex) => {
    const subjectCount = classIndex < 2 ? 4 : 3;
    return SUBJECT_LIBRARY.slice(classIndex, classIndex + subjectCount).map((subjectName, subjectOffset) => {
      const board = pick(boardCycle, classIndex + subjectOffset);
      return {
        name: subjectName,
        class_id: classItem.id,
        board_id: board?.id,
        is_course: classIndex >= 12 && subjectOffset === 0,
      };
    });
  });

  // Add a few cross-class subjects/courses so teachers have broader options
  subjects.push(
    { name: 'Spoken English', class_id: classes.find(c => c.name === 'Class 6')?.id, board_id: cbseBoard?.id, is_course: true },
    { name: 'Coding Foundations', class_id: classes.find(c => c.name === 'Class 5')?.id, board_id: icseBoard?.id, is_course: true },
    { name: 'Robotics Lab', class_id: classes.find(c => c.name === 'Class 8')?.id, board_id: stateBoard?.id, is_course: true },
    { name: 'Advanced Math', class_id: classes.find(c => c.name === 'Class 11')?.id, board_id: cbseBoard?.id, is_course: true },
    { name: 'Applied Science', class_id: classes.find(c => c.name === 'Class 12')?.id, board_id: icseBoard?.id, is_course: true },
  );
  
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
  
  const teacherUsers = [];
  for (let i = 0; i < 20; i += 1) {
    const name = TEACHER_NAMES[i];
    const teacher = await prisma.user.create({
      data: {
        name,
        email: `${slugify(name)}@studyasan.com`,
        phone: `+91987654${String(300 + i).padStart(3, '0')}`,
        password: hashedPassword,
        role: 'TEACHER',
      },
    });
    teacherUsers.push(teacher);
    console.log(`   ✅ Created teacher: ${teacher.email}`);
  }

  const studentUsers = [];
  for (let i = 0; i < 20; i += 1) {
    const name = STUDENT_NAMES[i];
    const student = await prisma.user.create({
      data: {
        name,
        email: `${slugify(name)}@studyasan.com`,
        phone: `+91987655${String(400 + i).padStart(3, '0')}`,
        password: hashedPassword,
        role: 'STUDENT',
      },
    });
    studentUsers.push(student);
    console.log(`   ✅ Created student: ${student.email}`);
  }
  
  return { admin, teachers: teacherUsers, students: studentUsers };
}

async function seedTeachers(teacherUsers: any[], subjects: any[]) {
  console.log('👨‍🏫 Seeding teacher profiles...');
  
  // Get INR currency
  const inrCurrency = await prisma.currency.findFirst({ where: { code: 'INR' } });
  
  const teacherProfiles = [];

  for (let i = 0; i < teacherUsers.length; i += 1) {
    const teacherUser = teacherUsers[i];
    const teacher = await prisma.teacher.create({
      data: {
        user_id: teacherUser.id,
        salary: 45000 + i * 2500,
        salary_currency_id: inrCurrency?.id,
        qualification: i % 3 === 0 ? 'B.Ed' : i % 3 === 1 ? 'M.Ed' : 'M.Sc',
        gender: i % 2 === 0 ? 'M' : 'F',
        experience: `${2 + (i % 8)} years`,
      },
    });
    teacherProfiles.push(teacher);

    const firstSubjectIndex = (i * 2) % subjects.length;
    const subjectBatch = [
      subjects[firstSubjectIndex],
      subjects[(firstSubjectIndex + 1) % subjects.length],
    ];

    for (const subject of subjectBatch) {
      await prisma.teacherSubjectJunction.create({
        data: {
          teacher_id: teacher.id,
          subject_id: subject.id,
        },
      });
    }

    console.log(`   ✅ Created teacher profile for: ${teacherUser.name}`);
  }

  return teacherProfiles;
}

async function seedStudents(studentUsers: any[], classes: any[], boards: any[]) {
  console.log('👨‍🎓 Seeding student profiles...');

  const cbseBoard = boards.find(b => b.name === 'CBSE');
  const schoolNames = [
    'Delhi Public School',
    'Study ASAN Academy',
    'Green Valley School',
    'St. Xavier School',
    'Sunrise Public School',
  ];

  for (let i = 0; i < studentUsers.length; i += 1) {
    const studentUser = studentUsers[i];
    const classItem = classes[i % classes.length];
    const board = boards[i % boards.length] || cbseBoard;

    await prisma.student.create({
      data: {
        user_id: studentUser.id,
        class_id: classItem.id,
        board_id: board?.id,
        date_of_birth: new Date(2012 + (i % 8), i % 12, 10 + (i % 15)),
        gender: i % 3 === 0 ? 'M' : i % 3 === 1 ? 'F' : 'OTHER',
        school: schoolNames[i % schoolNames.length],
        blood_group: pick(['A_POS', 'B_POS', 'O_POS', 'AB_POS', 'A_NEG', 'B_NEG', 'O_NEG', 'AB_NEG'] as any[], i),
      },
    });

    console.log(`   ✅ Created student profile for: ${studentUser.name}`);
  }
}

async function seedEnrollments(students: any[], subjects: any[]) {
  console.log('📝 Seeding enrollments...');
  
  const dbStudents = await prisma.student.findMany({ include: { user: true } });
  
  for (const student of dbStudents) {
    // Enroll each student in 3-5 subjects from their class and board
    const studentSubjects = subjects.filter(
      (s) => s.class_id === student.class_id && s.board_id === student.board_id
    );
    
    const enrollmentCount = Math.min(studentSubjects.length, 3 + (student.id % 4));
    
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
    const teacherProfiles = await seedTeachers(teachers, subjects);
    
    // Step 9: Seed student profiles
    await seedStudents(students, classes, boards);
    
    // Step 10: Seed enrollments
    await seedEnrollments(students, subjects);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Boards: ${boards.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Subjects: ${subjects.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Teachers: ${teacherProfiles.length}`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Users: ${1 + teachers.length + students.length} (1 admin, ${teachers.length} teachers, ${students.length} students)`);
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

