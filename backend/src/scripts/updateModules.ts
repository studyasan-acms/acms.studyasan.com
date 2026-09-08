import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Updating Kajal Gupta Subjects & Migrating Syllabus Units ---');

  // 1. EVS (Grade 2, Subject #40)
  const evs = await prisma.subject.findUnique({ where: { id: 40 } });
  if (evs) {
    const syl: any = evs.syllabus || {};
    const existingModules: any[] = Array.isArray(syl.modules) ? syl.modules : [];
    
    // Check if Festivals already exists
    const hasFestivals = existingModules.some(m => m.title?.toLowerCase().includes('festival'));
    if (!hasFestivals) {
      // Remove placeholder 'nbnh' if present or replace it with Festivals
      const cleanModules = existingModules.filter(m => m.title !== 'nbnh');
      const maxId = cleanModules.length > 0 ? Math.max(...cleanModules.map(m => m.module_id || m.order || 1)) : 0;
      cleanModules.push({
        module_id: maxId + 1,
        title: 'Festivals',
        description: 'Celebrations, cultural festivals, national festivals, and their significance in our lives.',
        order: cleanModules.length + 1,
        content: [],
        estimated_time_minutes: 0,
      });
      await prisma.subject.update({
        where: { id: 40 },
        data: {
          syllabus: {
            ...syl,
            modules: cleanModules,
          },
        },
      });
      console.log('✅ Subject #40 (EVS Grade 2) updated with Festivals module');
    }
  }

  // 2. Hindi (Grade 2, Subject #99)
  const hindi = await prisma.subject.findUnique({ where: { id: 99 } });
  if (hindi) {
    const syl: any = hindi.syllabus || {};
    const modules = [
      {
        module_id: 1,
        title: 'मात्राएँ (अ–ऊ)',
        description: 'स्वर और उनकी मात्राओं का ज्ञान एवं अभ्यास (अ से ऊ तक)',
        order: 1,
        content: [],
        estimated_time_minutes: 0,
      },
      {
        module_id: 2,
        title: 'ऋ की मात्रा',
        description: 'ऋ की मात्रा वाले शब्द और उनका सही उच्चारण एवं प्रयोग',
        order: 2,
        content: [],
        estimated_time_minutes: 0,
      },
    ];
    await prisma.subject.update({
      where: { id: 99 },
      data: {
        syllabus: {
          ...syl,
          units: syl.units || [
            { name: 'मात्राएँ (अ–ऊ)', content: 'स्वर और उनकी मात्राओं का ज्ञान (अ से ऊ तक)' },
            { name: 'ऋ की मात्रा', content: 'ऋ की मात्रा और शब्दों का अभ्यास' },
          ],
          modules,
        },
      },
    });
    console.log('✅ Subject #99 (Hindi Grade 2) updated with मात्राएँ (अ–ऊ) and ऋ की मात्रा modules');
  }

  // 3. Science (Grade 9, Subject #88)
  const science = await prisma.subject.findUnique({ where: { id: 88 } });
  if (science) {
    const syl: any = science.syllabus || {};
    const modules = [
      {
        module_id: 1,
        title: 'Cell: The Fundamental Unit of Life',
        description: 'Cell structure, plasma membrane, nucleus, cytoplasm, and cell organelles (structure and functions).',
        order: 1,
        content: [],
        estimated_time_minutes: 0,
      },
      {
        module_id: 2,
        title: 'Plant Tissues',
        description: 'Meristematic tissues and permanent tissues (parenchyma, collenchyma, sclerenchyma, xylem, phloem).',
        order: 2,
        content: [],
        estimated_time_minutes: 0,
      },
    ];
    await prisma.subject.update({
      where: { id: 88 },
      data: {
        syllabus: {
          ...syl,
          units: syl.units || [
            { name: 'Cell: The Fundamental Unit of Life', content: 'Cell structure and organelles' },
            { name: 'Plant Tissues', content: 'Plant tissue classification and functions' },
          ],
          modules,
        },
      },
    });
    console.log('✅ Subject #88 (Science Grade 9) updated with Cell and Plant Tissues modules');
  }

  // 4. Spoken English Kids (Grade 2, Subject #77)
  const spoken = await prisma.subject.findUnique({ where: { id: 77 } });
  if (spoken) {
    const syl: any = spoken.syllabus || {};
    const modules = [
      {
        module_id: 1,
        title: 'Alphabet Sounds',
        description: 'Phonics, letter pronunciations, vowel and consonant sounds for young learners.',
        order: 1,
        content: [],
        estimated_time_minutes: 0,
      },
      {
        module_id: 2,
        title: 'Conversation Sounds',
        description: 'Everyday greetings, conversational sounds, common expressions, and dialogue practice.',
        order: 2,
        content: [],
        estimated_time_minutes: 0,
      },
    ];
    await prisma.subject.update({
      where: { id: 77 },
      data: {
        syllabus: {
          ...syl,
          units: [
            { name: 'Alphabet Sounds', content: 'Phonics and letter sounds' },
            { name: 'Conversation Sounds', content: 'Everyday expressions and greetings' },
          ],
          modules,
        },
      },
    });
    console.log('✅ Subject #77 (Spoken English Kids Grade 2) updated with Alphabet Sounds and Conversation Sounds modules');
  }

  // 5. Migrate any other subjects with units to modules
  const allSubjects = await prisma.subject.findMany();
  for (const s of allSubjects) {
    const syl: any = s.syllabus;
    if (syl?.units && (!syl?.modules || syl.modules.length === 0)) {
      const autoModules = syl.units.map((u: any, idx: number) => ({
        module_id: idx + 1,
        title: u.name || `Unit ${idx + 1}`,
        description: u.content || u.name || '',
        order: idx + 1,
        content: [],
        estimated_time_minutes: 0,
      }));
      await prisma.subject.update({
        where: { id: s.id },
        data: {
          syllabus: {
            ...syl,
            modules: autoModules,
          },
        },
      });
      console.log(`✅ Subject #${s.id} ('${s.name}') auto-converted ${autoModules.length} units to modules`);
    }
  }

  console.log('--- Migration Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
