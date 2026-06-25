/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

import './utils/polyfill';
import { initErrorTracker } from './utils/errorTracker';

// Initialize global error tracking immediately at app startup
initErrorTracker();
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import ThemeProvider from './components/shared/ThemeProvider.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/global.css';
import './styles/theme.css';
import './styles/responsive.css';
import './styles/invoice-print.css';

import { UserProvider } from './contexts/UserContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
// Suppress browser-extension noise (Chrome extensions like password managers
// fire this error — it is NOT caused by application code).
window.addEventListener('unhandledrejection', (event) => {
  if (
    event?.reason?.message?.includes('message channel closed') ||
    event?.reason?.message?.includes('asynchronous response')
  ) {
    event.preventDefault();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/shared/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <UserProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </UserProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);




