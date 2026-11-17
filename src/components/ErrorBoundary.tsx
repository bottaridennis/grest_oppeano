import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Error boundary reale: intercetta gli errori di rendering e mostra una schermata di recupero. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] errore non gestito', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center">
          <p className="font-display text-5xl">😵</p>
          <h1 className="text-2xl font-extrabold mt-4">Qualcosa è andato storto</h1>
          <p className="text-muted mt-2 text-sm">Si è verificato un errore imprevisto. Ricarica la pagina per riprovare.</p>
          <button className="btn btn-primary mt-6 w-full" onClick={() => window.location.reload()}>
            Ricarica
          </button>
        </div>
      </div>
    );
  }
}
