import { Check, X } from 'lucide-react';
import type { PasswordRequirementItem } from '@/utils/passwordValidator';

interface PasswordRequirementsListProps {
  requirements: PasswordRequirementItem[];
  title?: string;
  className?: string;
}

export function PasswordRequirementsList({
  requirements,
  title = 'Password must meet the following:',
  className = '',
}: PasswordRequirementsListProps) {
  return (
    <div
      className={`bg-slate-50 border border-slate-200/90 rounded-lg p-3 space-y-1.5 transition-all duration-200 ${className}`}
    >
      {title && (
        <p className="text-xs font-semibold text-gray-700 mb-1.5">{title}</p>
      )}
      <div className="grid grid-cols-1 gap-1.5">
        {requirements.map((req) => (
          <div key={req.id} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span
              className={
                req.met
                  ? 'text-green-700 font-medium'
                  : 'text-gray-600 font-normal'
              }
            >
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordRequirementsList;
