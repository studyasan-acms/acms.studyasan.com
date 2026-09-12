export interface PasswordRequirementItem {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  requirements: PasswordRequirementItem[];
  missingLabels: string[];
}

export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  const requirements: PasswordRequirementItem[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: (password || '').length >= 8,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter (A-Z)',
      met: /[A-Z]/.test(password || ''),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter (a-z)',
      met: /[a-z]/.test(password || ''),
    },
    {
      id: 'number',
      label: 'One number (0-9)',
      met: /[0-9]/.test(password || ''),
    },
    {
      id: 'special',
      label: 'One special character (!@#$%^&*...)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password || ''),
    },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const isValid = metCount === requirements.length;
  const missingLabels = requirements.filter((r) => !r.met).map((r) => r.label);

  return {
    isValid,
    score: metCount,
    requirements,
    missingLabels,
  };
};

export const getStrengthColor = (score: number) => {
  switch (score) {
    case 0:
    case 1:
      return 'bg-red-500';
    case 2:
      return 'bg-orange-500';
    case 3:
      return 'bg-yellow-500';
    case 4:
      return 'bg-lime-500';
    case 5:
      return 'bg-green-500';
    default:
      return 'bg-gray-200';
  }
};

export const getStrengthLabel = (score: number) => {
  switch (score) {
    case 0:
    case 1:
      return 'Weak';
    case 2:
    case 3:
      return 'Moderate';
    case 4:
      return 'Strong';
    case 5:
      return 'Very Strong';
    default:
      return '';
  }
};
