// Google Translate type definitions
declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: {
          new (options: TranslateElementOptions, elementId: string): void;
          InlineLayout: {
            SIMPLE: number;
            HORIZONTAL: number;
            VERTICAL: number;
          };
        };
      };
    };
    googleTranslateElementInit: () => void;
  }
}

interface TranslateElementOptions {
  pageLanguage: string;
  includedLanguages: string;
  layout: number;
  autoDisplay: boolean;
}

export {};