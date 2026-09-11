import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Universal Migration Script for Study Modules:
 * 1. Scans existing database subjects and migrates any modules stored inside `syllabus` JSON into `subject.modules`.
 * 2. Supports importing modules from an external JSON file (e.g., from an older project / backup).
 *
 * Usage:
 *   npx tsx src/scripts/migrate-legacy-modules.ts
 *   npx tsx src/scripts/migrate-legacy-modules.ts --import=/path/to/modules-backup.json
 */
async function runModuleMigration() {
  console.log('=====================================================');
  console.log('  STUDYASAN - STUDY MODULES MIGRATION UTILITY        ');
  console.log('=====================================================\n');

  try {
    // Check if an external JSON file was passed via --import
    const importArg = process.argv.find((arg) => arg.startsWith('--import=') || arg.startsWith('-i='));
    
    if (importArg) {
      const filePath = importArg.split('=')[1];
      if (filePath && fs.existsSync(filePath)) {
        console.log(`📥 Importing modules from external file: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const importData = JSON.parse(fileContent);

        // Expected format: array of { subject_id or subject_name, modules: [...] }
        if (Array.isArray(importData)) {
          for (const item of importData) {
            let subject = null;
            if (item.subject_id) {
              subject = await prisma.subject.findUnique({ where: { id: Number(item.subject_id) } });
            } else if (item.subject_name) {
              subject = await prisma.subject.findFirst({ where: { name: { equals: item.subject_name, mode: 'insensitive' } } });
            }

            if (subject && Array.isArray(item.modules) && item.modules.length > 0) {
              const currentModules: any[] = Array.isArray((subject as any).modules) ? (subject as any).modules : [];
              const mergedMap = new Map<number, any>();

              currentModules.forEach((m) => {
                if (m.module_id) mergedMap.set(m.module_id, m);
              });

              item.modules.forEach((m: any, idx: number) => {
                const modId = m.module_id || idx + 1;
                mergedMap.set(modId, {
                  module_id: modId,
                  title: m.title || `Module ${modId}`,
                  description: m.description || '',
                  order: m.order || idx + 1,
                  content: Array.isArray(m.content) ? m.content : [],
                  estimated_time_minutes: m.estimated_time_minutes || 0,
                });
              });

              const finalModules = Array.from(mergedMap.values()).sort((a, b) => a.order - b.order);

              await prisma.subject.update({
                where: { id: subject.id },
                data: { modules: finalModules as any },
              });

              console.log(`✅ [EXTERNAL IMPORT] Imported ${finalModules.length} modules into Subject #${subject.id} ('${subject.name}')`);
            }
          }
        }
      } else {
        console.error(`❌ File not found: ${filePath}`);
      }
    }

    // 2. Database-wide migration from legacy syllabus to dedicated modules
    const subjects = await prisma.subject.findMany();
    console.log(`🔍 Scanning ${subjects.length} subjects in current database...\n`);

    let migratedCount = 0;

    for (const sub of subjects) {
      let syllabusData: any = sub.syllabus;
      while (typeof syllabusData === 'string') {
        try {
          syllabusData = JSON.parse(syllabusData);
        } catch {
          break;
        }
      }

      let currentModules: any = (sub as any).modules;
      while (typeof currentModules === 'string') {
        try {
          currentModules = JSON.parse(currentModules);
        } catch {
          break;
        }
      }

      const existingInSyllabus = (syllabusData && typeof syllabusData === 'object' && Array.isArray(syllabusData.modules))
        ? syllabusData.modules
        : [];

      const existingInModules = Array.isArray(currentModules) ? currentModules : [];

      // If syllabus has modules but modules column is empty, or syllabus has richer content:
      if (existingInSyllabus.length > 0) {
        const mergedMap = new Map<number, any>();

        // Seed with current modules column
        existingInModules.forEach((m: any) => {
          if (m.module_id) mergedMap.set(m.module_id, m);
        });

        // Merge from syllabus.modules (preserving any uploaded content/PDFs)
        existingInSyllabus.forEach((m: any) => {
          if (m.module_id) {
            if (mergedMap.has(m.module_id)) {
              const existing = mergedMap.get(m.module_id);
              mergedMap.set(m.module_id, {
                ...existing,
                ...m,
                content: (Array.isArray(m.content) && m.content.length > 0) ? m.content : (existing.content || []),
              });
            } else {
              mergedMap.set(m.module_id, m);
            }
          }
        });

        const finalModules = Array.from(mergedMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));

        // Clean syllabus to keep only units
        const unitsOnly = Array.isArray(syllabusData.units) ? syllabusData.units : [];
        const cleanSyllabus = unitsOnly.length > 0 ? { units: unitsOnly } : null;

        await prisma.subject.update({
          where: { id: sub.id },
          data: {
            modules: finalModules as any,
            syllabus: cleanSyllabus as any,
          },
        });

        migratedCount++;
        console.log(`✅ Subject #${sub.id} ('${sub.name}'): Migrated ${finalModules.length} modules, preserved ${unitsOnly.length} syllabus units.`);
      }
    }

    console.log(`\n=====================================================`);
    console.log(`  MIGRATION SUMMARY:`);
    console.log(`  Total Subjects Checked: ${subjects.length}`);
    console.log(`  Subjects with Migrated Modules: ${migratedCount}`);
    console.log(`=====================================================\n`);
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runModuleMigration();
