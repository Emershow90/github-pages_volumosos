import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';

// Clear stuck queue for now
localStorage.removeItem('radar_offline_queue');
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Erro ao iniciar a Torre de Comando">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
