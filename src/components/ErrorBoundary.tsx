import * as React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] p-10 shadow-2xl border border-zinc-100 dark:border-zinc-800 text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-8">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight uppercase">Something went wrong</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-10 font-medium leading-relaxed">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={this.handleReset}
                className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
              >
                <RefreshCw size={20} /> Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                <Home size={20} /> Go to Home
              </button>
            </div>
            {this.state.error && (
              <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-left overflow-auto max-h-40">
                <code className="text-xs text-red-500 font-mono break-all">{this.state.error.toString()}</code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
