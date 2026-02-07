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
    const s3BaseUrl = import.meta.env.VITE_S3_BUCKET_URL || 'https://dinesuite.s3.eu-north-1.amazonaws.com';
    return `${s3BaseUrl}/${url}`;
  }

  // 3. Handle local relative assets (starting with /)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/';
  let baseUrl = apiUrl.replace(/\/api\/?$/, '');

  // Remove trailing slash if any on baseUrl
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  return `${baseUrl}${url}`;
}