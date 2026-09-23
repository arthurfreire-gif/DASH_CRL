import React, { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-slate-100">Erro ao carregar o aplicativo</h2>
            <p className="text-xs text-slate-400">
              Ocorreu um erro ao renderizar os componentes. Clique no botão abaixo para reiniciar o estado e recarregar os dados.
            </p>
            {this.state.error && (
              <pre className="text-[11px] text-rose-300 bg-slate-950/80 p-3 rounded-xl overflow-x-auto text-left max-h-36">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Limpar Cache e Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Purge stale large payloads that could exceed browser storage quota
try {
  const obsoletePrefixes = [
    'consultor_roi_regional_clients',
    'consultor_roi_infoped_records',
    'consultor_roi_visits_synced_v1',
    'consultor_roi_visits_synced_v2',
    'consultor_roi_visits_synced_v3',
    'consultor_roi_visits_synced_v4',
    'consultor_roi_visits_synced_v5',
    'consultor_roi_visits_synced_v6',
    'consultor_roi_visits_synced_v7',
    'consultor_roi_visits_synced_v8',
    'consultor_roi_visits_synced_v9',
    'consultor_roi_visits_synced_v10',
    'consultor_roi_visits_synced_v11',
    'consultor_roi_visits_synced_v12',
    'consultor_roi_visits_synced_v13',
  ];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && obsoletePrefixes.some(prefix => k.startsWith(prefix))) {
      localStorage.removeItem(k);
    }
  }
} catch (e) {
  // ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

