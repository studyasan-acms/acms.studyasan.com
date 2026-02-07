export interface PasswordStrength {
    isValid: boolean;
    score: number; // 0-4 (0 = very weak, 4 = very strong)
    errors: string[];
    suggestions: string[];
}

export const validatePassword = (password: string): PasswordStrength => {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Minimum length check (required)
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    } else {
        score += 1;
        if (password.length >= 12) {
            score += 1;
        }
    }

    // Uppercase letter check (required)
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    } else {
        score += 0.5;
    }

    // Lowercase letter check (required)
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    } else {
        score += 0.5;
    }

    // Number check (required)
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    } else {
        score += 0.5;
    }

    // Special character check (required)
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*...)');
    } else {
        score += 0.5;
    }

    // Additional suggestions for stronger passwords
    if (password.length < 12 && errors.length === 0) {
        suggestions.push('Consider using 12 or more characters for a stronger password');
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
        suggestions.push('Avoid using repeated characters');
    }

    // Normalize score to 0-4 range
    score = Math.min(4, Math.max(0, Math.round(score)));

    return {
        isValid: errors.length === 0,
        score,
        errors,
        suggestions,
    };
};

export const getPasswordStrengthLabel = (score: number): string => {
    switch (score) {
        case 0:
            return 'Very Weak';
        case 1:
            return 'Weak';
        case 2:
            return 'Fair';
        case 3:
            return 'Strong';
        case 4:
            return 'Very Strong';
        default:
            return 'Unknown';
    }
};
