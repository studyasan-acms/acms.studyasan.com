import React from 'react';
import {
  Megaphone,
  Newspaper,
  Calendar,
  Palmtree,
  FileCheck2,
  Info,
} from 'lucide-react';
import type { AnnouncementType } from '@/types';

export interface AnnouncementTypeConfig {
  type: AnnouncementType;
  label: string;
  badgeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  borderLeftClass: string;
  bgLightClass: string;
  textColorClass: string;
  iconColorClass: string;
  iconBgClass: string;
  description: string;
}

export const ANNOUNCEMENT_TYPES_CONFIG: Record<AnnouncementType, AnnouncementTypeConfig> = {
  NOTICE: {
    type: 'NOTICE',
    label: 'Notice',
    badgeLabel: 'Notice',
    icon: Megaphone,
    badgeClass: 'bg-blue-50 text-saBlue border-blue-200 hover:bg-blue-100',
    borderLeftClass: 'border-l-saBlue',
    bgLightClass: 'bg-blue-50/50',
    textColorClass: 'text-saBlue',
    iconColorClass: 'text-saBlue',
    iconBgClass: 'bg-blue-100 text-saBlue',
    description: 'Official notice, directive, or policy announcement',
  },
  NEWS: {
    type: 'NEWS',
    label: 'News',
    badgeLabel: 'News',
    icon: Newspaper,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    borderLeftClass: 'border-l-orange-500',
    bgLightClass: 'bg-orange-50/50',
    textColorClass: 'text-orange-700',
    iconColorClass: 'text-orange-600',
    iconBgClass: 'bg-orange-100 text-orange-600',
    description: 'Academy news, achievements, or updates',
  },
  EVENT: {
    type: 'EVENT',
    label: 'Event',
    badgeLabel: 'Event',
    icon: Calendar,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
    borderLeftClass: 'border-l-sky-500',
    bgLightClass: 'bg-sky-50/50',
    textColorClass: 'text-sky-700',
    iconColorClass: 'text-sky-600',
    iconBgClass: 'bg-sky-100 text-sky-600',
    description: 'Workshops, webinars, cultural fests, or sports events',
  },
  HOLIDAY: {
    type: 'HOLIDAY',
    label: 'Holiday',
    badgeLabel: 'Holiday',
    icon: Palmtree,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    borderLeftClass: 'border-l-amber-500',
    bgLightClass: 'bg-amber-50/50',
    textColorClass: 'text-amber-800',
    iconColorClass: 'text-amber-600',
    iconBgClass: 'bg-amber-100 text-amber-600',
    description: 'Holiday declarations, vacation, or institute closures',
  },
  EXAM: {
    type: 'EXAM',
    label: 'Exam',
    badgeLabel: 'Exam',
    icon: FileCheck2,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
    borderLeftClass: 'border-l-blue-600',
    bgLightClass: 'bg-blue-50/50',
    textColorClass: 'text-blue-800',
    iconColorClass: 'text-blue-600',
    iconBgClass: 'bg-blue-100 text-blue-600',
    description: 'Examination datesheets, mock tests, or result alerts',
  },
  GENERAL: {
    type: 'GENERAL',
    label: 'General',
    badgeLabel: 'General',
    icon: Info,
    badgeClass: 'bg-orange-50/80 text-orange-800 border-orange-200 hover:bg-orange-100',
    borderLeftClass: 'border-l-orange-400',
    bgLightClass: 'bg-orange-50/30',
    textColorClass: 'text-orange-800',
    iconColorClass: 'text-orange-500',
    iconBgClass: 'bg-orange-100 text-orange-600',
    description: 'General informational broadcast or message',
  },
};

export const ALL_ANNOUNCEMENT_TYPES: AnnouncementType[] = [
  'NOTICE',
  'NEWS',
  'EVENT',
  'HOLIDAY',
  'EXAM',
  'GENERAL',
];

export function getAnnouncementTypeConfig(type?: AnnouncementType | string | null): AnnouncementTypeConfig {
  if (type && type in ANNOUNCEMENT_TYPES_CONFIG) {
    return ANNOUNCEMENT_TYPES_CONFIG[type as AnnouncementType];
  }
  return ANNOUNCEMENT_TYPES_CONFIG.GENERAL;
}
