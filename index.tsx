import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Error Boundary to catch runtime errors and display a friendly message instead of a white screen
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '20px',
            fontFamily: 'sans-serif',
            direction: 'rtl',
            textAlign: 'center',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
            אופס, משהו השתבש...
          </h1>
          <p style={{ marginBottom: '20px' }}>
            האפליקציה נתקלה בשגיאה בלתי צפויה.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            רענן את העמוד
          </button>
          <pre
            style={{
              marginTop: '30px',
              padding: '10px',
              backgroundColor: 'white',
              border: '1px solid #FECACA',
              borderRadius: '5px',
              fontSize: '0.8rem',
              maxWidth: '80%',
              overflow: 'auto',
              textAlign: 'left',
              direction: 'ltr',
            }}
          >
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
