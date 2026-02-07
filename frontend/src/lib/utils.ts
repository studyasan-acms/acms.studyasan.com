import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveImageUrl(url: string | null | undefined) {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/';
  // Remove '/api/' or '/api' from the end quite robustly
  let baseUrl = apiUrl.replace(/\/api\/?$/, '');

  // Remove trailing slash if any on baseUrl
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  // Ensure url starts with /
  const path = url.startsWith('/') ? url : `/${url}`;

  return `${baseUrl}${path}`;
}