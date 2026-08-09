import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendNotificationAllChannels } from './notification.service.js';

const prisma = new PrismaClient();

export class KnowYourChildScheduler {
  static start() {
    // Run daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      await this.checkLateReports();
    });

    console.log('✓ Know Your Child Report Scheduler started - Checking daily at 9 AM');
  }

  static async checkLateReports() {
    try {
      console.log('[KnowYourChildScheduler] Checking for late student reviews...');
      const now = new Date();
      
      // Calculate Monday of the current week at 00:00:00
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      // Get all student enrollments in subjects
      const enrollments = await prisma.enrollment.findMany({
        where: {
          subject_id: { not: null }
        },
        include: {
          student: {
            include: {
              user: true
            }
          },
          subject: {
            include: {
              teacher_subject_junctions: {
                include: {
                  teacher: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Track teacher-student combinations already checked/alerted in this run to avoid duplicates
      const alertedKeys = new Set<string>();

      for (const enrollment of enrollments) {
        const student = (enrollment as any).student;
        if (!student || !(enrollment as any).subject) continue;

        const teachers = (enrollment as any).subject.teacher_subject_junctions.map((ts: any) => ts.teacher);

        for (const teacher of teachers) {
          if (!teacher || !teacher.user) continue;

          const key = `${teacher.id}-${student.id}`;
          if (alertedKeys.has(key)) continue;
          alertedKeys.add(key);

          // Check if this teacher has created a weekly report for this student since the start of the week
          const existingReport = await prisma.knowYourChildReport.findFirst({
            where: {
              student_id: student.id,
              teacher_id: teacher.id,
              week_start_date: {
                gte: startOfWeek
              }
            }
          });

          if (!existingReport) {
            // Teacher is late! Send warning reminder notification
            try {
              await sendNotificationAllChannels({
                user_id: teacher.user.id,
                type: 'WARNING',
                title: 'Pending Weekly Student Review',
                description: `You have not submitted a weekly "Know Your Child" report card for ${student.user.name} this week. Please submit it from the student's detail page.`,
              });
            } catch (notifErr) {
              console.error(`Error sending weekly reminder to teacher ${teacher.user.name}:`, notifErr);
            }
          }
        }
      }
      console.log(`[KnowYourChildScheduler] Review check complete. Processed ${alertedKeys.size} teacher-student combinations.`);
    } catch (error) {
      console.error('[KnowYourChildScheduler] Error running late reports check:', error);
    }
  }
}
