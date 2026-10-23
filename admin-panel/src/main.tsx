import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import { Ajustes } from './pages/Ajustes';
import { Auditoria } from './pages/Auditoria';
import { Eventos } from './pages/Eventos';
import { Login } from './pages/Login';
import { Pedidos } from './pages/Pedidos';
import { Reclamaciones } from './pages/Reclamaciones';
import { Resumen } from './pages/Resumen';
import { Usuarios } from './pages/Usuarios';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
});

function Protegido() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  return usuario ? <Layout /> : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Protegido />}>
                <Route index element={<Resumen />} />
                <Route path="eventos" element={<Eventos />} />
                <Route path="pedidos" element={<Pedidos />} />
                <Route path="reclamaciones" element={<Reclamaciones />} />
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="auditoria" element={<Auditoria />} />
                <Route path="ajustes" element={<Ajustes />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
