import type { User } from '@/types';

/**
 * Determines if a student is in class 12 or below (Nursery up to Class 12).
 * For these students, Jobs & Internships / Career sections should NOT be visible.
 * Returns true if student is <= class 12, false if higher education / college or non-student.
 */
export function isStudentTillClass12(
  user: User | null | undefined,
  studentData?: { class?: { name: string } | null; class_id?: number | null } | null
): boolean {
  if (!user) return false;
  // Admin and Teachers are allowed to see Jobs & Internships
  if (user.role !== 'STUDENT') return false;

  const className =
    user.student?.class?.name ||
    studentData?.class?.name ||
    '';

  if (!className) {
    // If no class is specified for the student, default to true (restricted for school-level students)
    return true;
  }

  const normalized = className.trim().toLowerCase();

  // Check keywords for college / higher education / alumni
  const higherEdKeywords = [
    'college',
    'university',
    'graduate',
    'undergraduate',
    'post graduate',
    'b.tech',
    'btech',
    'b.sc',
    'bsc',
    'b.com',
    'bcom',
    'bba',
    'bca',
    'm.tech',
    'mtech',
    'm.sc',
    'msc',
    'm.com',
    'mcom',
    'mba',
    'mca',
    'bachelor',
    'master',
    'phd',
    'diploma',
    'passout',
    'passed out',
    'alumni',
  ];

  if (higherEdKeywords.some((keyword) => normalized.includes(keyword))) {
    return false; // Higher education -> Jobs CAN be seen
  }

  // Extract number from class name (e.g. "Class 10", "12th", "Grade 8", "11-A", "Class-12")
  const match = normalized.match(/(\d+)/);
  if (match) {
    const classNum = parseInt(match[1], 10);
    if (classNum > 12) {
      return false; // Class 13+ -> Jobs CAN be seen
    }
    return true; // Class 1 to 12 -> Jobs CANNOT be seen
  }

  // Check early school keywords (Nursery, LKG, UKG, KG, Primary, etc.)
  const schoolKeywords = [
    'nursery',
    'kg',
    'lkg',
    'ukg',
    'playgroup',
    'pre-kg',
    'kindergarten',
    'prep',
    'primary',
    'middle',
    'secondary',
    'senior secondary',
    'matric',
  ];
  if (schoolKeywords.some((keyword) => normalized.includes(keyword))) {
    return true; // Jobs CANNOT be seen
  }

  // Default for school students: restricted
  return true;
}
