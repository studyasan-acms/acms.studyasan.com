import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text?: string;
  className?: string;
  inline?: boolean;
}

/**
 * Component to render mathematical expressions with proper formatting.
 * Supports Unicode math characters (subscripts, superscripts, Greek letters, etc.)
 * and LaTeX-style math expressions.
 * 
 * Features:
 * - Detects Unicode subscripts/superscripts and Greek letters
 * - Converts Unicode math symbols to LaTeX
 * - Renders using KaTeX for professional math display
 * - Handles mixed text and math content
 */
export default function MathRenderer({
  text = '',
  className = '',
  inline = true,
}: MathRendererProps) {
  if (!text || text.trim() === '') {
    return <span className={className}></span>;
  }

  // Unicode ranges for math characters
  const unicodeToLatex: { [key: string]: string } = {
    // Greek letters (lowercase)
    'α': '\\alpha',
    'β': '\\beta',
    'γ': '\\gamma',
    'δ': '\\delta',
    'ε': '\\epsilon',
    'ζ': '\\zeta',
    'η': '\\eta',
    'θ': '\\theta',
    'ι': '\\iota',
    'κ': '\\kappa',
    'λ': '\\lambda',
    'μ': '\\mu',
    'ν': '\\nu',
    'ξ': '\\xi',
    'ο': 'o',
    'π': '\\pi',
    'ρ': '\\rho',
    'ς': '\\varsigma',
    'σ': '\\sigma',
    'τ': '\\tau',
    'υ': '\\upsilon',
    'φ': '\\phi',
    'χ': '\\chi',
    'ψ': '\\psi',
    'ω': '\\omega',
    // Greek letters (uppercase)
    'Α': 'A',
    'Β': 'B',
    'Γ': '\\Gamma',
    'Δ': '\\Delta',
    'Ε': 'E',
    'Ζ': 'Z',
    'Η': 'H',
    'Θ': '\\Theta',
    'Ι': 'I',
    'Κ': 'K',
    'Λ': '\\Lambda',
    'Μ': 'M',
    'Ν': 'N',
    'Ξ': '\\Xi',
    'Ο': 'O',
    'Π': '\\Pi',
    'Ρ': 'P',
    'Σ': '\\Sigma',
    'Τ': 'T',
    'Υ': '\\Upsilon',
    'Φ': '\\Phi',
    'Χ': 'X',
    'Ψ': '\\Psi',
    'Ω': '\\Omega',
    // Math operators
    '°': '^\\circ',
    '∑': '\\sum',
    '∏': '\\prod',
    '√': '\\sqrt',
    '∫': '\\int',
    '≤': '\\leq',
    '≥': '\\geq',
    '≠': '\\neq',
    '±': '\\pm',
    '∞': '\\infty',
    '÷': '\\div',
    '×': '\\times',
    '⋅': '\\cdot',
  };

  // Convert Unicode subscripts (U+2080-U+2089) to LaTeX
  const subscriptMap: { [key: string]: string } = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  };

  // Convert Unicode superscripts (U+2070, U+00B9-U+00B3, U+2074-U+2079) to LaTeX
  const superscriptMap: { [key: string]: string } = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  };

  /**
   * Convert Unicode math characters to LaTeX
   */
  const convertToLatex = (str: string): string => {
    let result = '';
    let i = 0;

    while (i < str.length) {
      const char = str[i];
      const nextChar = str[i + 1];

      // Check for subscript sequences
      if (subscriptMap[char]) {
        // Look ahead to see if we have multiple subscripts or a subscript after a letter/number
        if (i > 0 && (/[a-zA-Z0-9]/.test(result[result.length - 1]) || result.endsWith('}'))) {
          let subscriptContent = '';
          let j = i;
          while (j < str.length && subscriptMap[str[j]]) {
            subscriptContent += subscriptMap[str[j]];
            j++;
          }
          if (subscriptContent.length > 0) {
            // Remove the last character from result if it's not }
            if (!result.endsWith('}')) {
              const lastChar = result[result.length - 1];
              result = result.slice(0, -1);
              result += `${lastChar}_{${subscriptContent}}`;
            } else {
              result += `_{${subscriptContent}}`;
            }
            i = j;
            continue;
          }
        }
      }

      // Check for superscript sequences
      if (superscriptMap[char]) {
        // Look ahead to see if we have multiple superscripts or a superscript after a letter/number
        if (i > 0 && (/[a-zA-Z0-9]/.test(result[result.length - 1]) || result.endsWith('}'))) {
          let superscriptContent = '';
          let j = i;
          while (j < str.length && superscriptMap[str[j]]) {
            superscriptContent += superscriptMap[str[j]];
            j++;
          }
          if (superscriptContent.length > 0) {
            // Remove the last character from result if it's not }
            if (!result.endsWith('}')) {
              const lastChar = result[result.length - 1];
              result = result.slice(0, -1);
              result += `${lastChar}^{${superscriptContent}}`;
            } else {
              result += `^{${superscriptContent}}`;
            }
            i = j;
            continue;
          }
        }
      }

      // Check for Unicode math characters
      if (unicodeToLatex[char]) {
        result += unicodeToLatex[char];
        i++;
        continue;
      }

      // Regular character
      result += char;
      i++;
    }

    return result;
  };

  /**
   * Detect and extract math expressions from text
   * Returns array of { type: 'text' | 'math', content: string }
   */
  const parseContent = (content: string) => {
    const parts: Array<{ type: 'text' | 'math'; content: string }> = [];
    const mathPatterns = [
      /\$\$[\s\S]*?\$\$/g, // Block math: $$...$$
      /\$[^\$]*\$/g, // Inline math: $...$
      /\\[\[\(][\s\S]*?\\[\]\)]/g, // LaTeX math: \[...\] or \(...\)
    ];

    let lastIndex = 0;
    let hasMatch = false;

    for (const pattern of mathPatterns) {
      let match;
      const tempRegex = new RegExp(pattern);
      while ((match = tempRegex.exec(content)) !== null) {
        hasMatch = true;
        // Add text before match
        if (match.index > lastIndex) {
          parts.push({ type: 'text', content: content.substring(lastIndex, match.index) });
        }
        // Add math expression (remove delimiters)
        let mathContent = match[0];
        if (mathContent.startsWith('$$') && mathContent.endsWith('$$')) {
          mathContent = mathContent.slice(2, -2);
        } else if (mathContent.startsWith('$') && mathContent.endsWith('$')) {
          mathContent = mathContent.slice(1, -1);
        } else if (mathContent.startsWith('\\[') && mathContent.endsWith('\\]')) {
          mathContent = mathContent.slice(2, -2);
        } else if (mathContent.startsWith('\\(') && mathContent.endsWith('\\)')) {
          mathContent = mathContent.slice(2, -2);
        }
        parts.push({ type: 'math', content: mathContent });
        lastIndex = match.index + match[0].length;
      }
    }

    // If no explicit math markers found, add entire content as potential text
    if (!hasMatch) {
      parts.push({ type: 'text', content });
    } else if (lastIndex < content.length) {
      // Add remaining text
      parts.push({ type: 'text', content: content.substring(lastIndex) });
    }

    return parts;
  };

  const parts = parseContent(text);

  // If single text part with no math markers, check for Unicode math chars and convert
  if (parts.length === 1 && parts[0].type === 'text') {
    const converted = convertToLatex(parts[0].content);
    
    // Check if conversion resulted in LaTeX math content
    if (converted !== parts[0].content && (converted.includes('_{') || converted.includes('^{') || converted.includes('\\'))) {
      const Component = inline ? InlineMath : BlockMath;
      try {
        return (
          <span className={className}>
            <Component 
              math={converted}
              errorColor="#cc0000"
            />
          </span>
        );
      } catch (e) {
        // Fallback if KaTeX fails to parse
        return (
          <span className={`${className} whitespace-pre-wrap`} title="Math rendering failed">
            {text}
          </span>
        );
      }
    }

    // Return as plain text with formatting preserved
    return (
      <span className={`${className} whitespace-pre-wrap`}>
        {parts[0].content}
      </span>
    );
  }

  // Render mixed content
  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.type === 'math') {
          try {
            const Component = inline ? InlineMath : BlockMath;
            return (
              <Component
                key={idx}
                math={part.content}
                errorColor="#cc0000"
              />
            );
          } catch (e) {
            return <span key={idx}>{part.content}</span>;
          }
        } else {
          const converted = convertToLatex(part.content);
          return (
            <span key={idx} className="whitespace-pre-wrap">
              {converted}
            </span>
          );
        }
      })}
    </span>
  );
}
