import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // If error is caused by Google Translate font tag removal, automatically reload clean
    if (
      error?.message?.includes('removeChild') ||
      error?.message?.includes('insertBefore') ||
      error?.message?.includes('not a child of this node')
    ) {
      console.warn('Recovering from Google Translate DOM mismatch...');
    } else {
      console.error('Uncaught error in component:', error, errorInfo);
    }
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Check if it's the translation DOM error
      const isTranslateError =
        this.state.error?.message?.includes('removeChild') ||
        this.state.error?.message?.includes('not a child of this node');

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-xl bg-saOrangeSubtle text-saVividOrange flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900">
              {isTranslateError ? 'Translation Refresh Needed' : 'Something went wrong'}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isTranslateError
                ? 'Your browser translation adjusted some content. Click reload to refresh this view cleanly.'
                : 'An unexpected display error occurred. Reloading the page will restore normal operation.'}
            </p>
            <Button
              onClick={this.handleReload}
              className="w-full bg-saBlue hover:bg-saBlueDarkHover text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
