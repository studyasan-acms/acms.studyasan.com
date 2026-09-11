import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveImageUrl(url: string | null | undefined) {
  if (!url) return undefined;

  // 1. If it's already a full URL or data URI, return as is
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  // 2. Identify S3 Keys vs Local Assets
  // S3 keys in this project usually don't start with / (e.g., 'modules/filename.webp')
  const isS3Key = !url.startsWith('/');

  if (isS3Key) {
    const s3BaseUrl = import.meta.env.VITE_S3_BUCKET_URL || 'https://studyasan-acms.s3.us-east-1.amazonaws.com';
    return `${s3BaseUrl}/${url}`;
  }

  // 3. Handle local relative assets (starting with /)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/';
  let baseUrl = apiUrl.replace(/\/api\/?$/, '');

  // Remove trailing slash if any on baseUrl
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  return `${baseUrl}${url}`;
}

export interface SyllabusUnit {
  name: string;
  content: string;
}

export interface SyllabusData {
  units: SyllabusUnit[];
  modules: any[];
}

export function normalizeSyllabus(rawSyllabus: any): SyllabusData {
  if (!rawSyllabus) {
    return { units: [], modules: [] };
  }

  let parsed = rawSyllabus;
  while (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }

  if (!parsed) {
    return { units: [], modules: [] };
  }

  // If parsed is an array directly
  if (Array.isArray(parsed)) {
    const units: SyllabusUnit[] = parsed.map((item: any, idx: number) => ({
      name: item?.name || item?.title || `Unit ${idx + 1}`,
      content: item?.content || item?.description || '',
    }));
    return { units, modules: [] };
  }

  if (typeof parsed === 'object') {
    let units: SyllabusUnit[] = [];
    let modules: any[] = [];

    if (Array.isArray(parsed.units)) {
      units = parsed.units.map((u: any, idx: number) => ({
        name: typeof u === 'string' ? u : (u?.name || u?.title || `Unit ${idx + 1}`),
        content: typeof u === 'string' ? '' : (u?.content || u?.description || ''),
      }));
    }

    if (Array.isArray(parsed.modules)) {
      modules = parsed.modules;
    }

    const hasExplicitUnits = 'units' in parsed && Array.isArray(parsed.units);
    if (!hasExplicitUnits && units.length === 0 && modules.length > 0) {
      units = modules.map((m: any, idx: number) => ({
        name: m?.title || m?.name || `Unit ${idx + 1}`,
        content: m?.description || (typeof m?.content === 'string' ? m.content : '') || '',
      }));
    }

    return { units, modules };
  }

  return { units: [], modules: [] };
}