import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';

// Lazy load pages
const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const InviteRegister = React.lazy(() => import('./pages/InviteRegister'));
const CandidateDashboard = React.lazy(() => import('./pages/CandidateDashboard'));
const ControllerDashboard = React.lazy(() => import('./pages/ControllerDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const DeveloperDashboard = React.lazy(() => import('./pages/DeveloperDashboard'));
const VerifyPhone = React.lazy(() => import('./pages/VerifyPhone'));

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (profile && !allowedRoles.includes(profile.role)) return <Navigate to="/dashboard" />;
  if (profile?.role === 'candidate' && profile.phoneVerified === false) return <Navigate to="/verify-phone" replace />;

  return <>{children}</>;
}

function RoleRedirect() {
  const { profile, loading } = useAuth();
  
  if (loading) return null;
  if (!profile) return <Navigate to="/login" />;
  if (profile.role === 'candidate' && profile.phoneVerified === false) return <Navigate to="/verify-phone" replace />;

  switch (profile.role) {
    case 'candidate': return <Navigate to="/candidate" />;
    case 'controller': return <Navigate to="/controller" />;
    case 'chairman': return <Navigate to="/chairman" />;
    case 'developer': return <Navigate to="/developer" />;
    default: return <Navigate to="/login" />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-sky">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/login/:role" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/invite/:role" element={<InviteRegister />} />
            <Route path="/verify-phone" element={<VerifyPhone />} />
            <Route path="/dashboard" element={<RoleRedirect />} />
                
                <Route path="/candidate/*" element={
                  <ProtectedRoute allowedRoles={['candidate']}>
                    <CandidateDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/controller/*" element={
                  <ProtectedRoute allowedRoles={['controller']}>
                    <ControllerDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/chairman/*" element={
                  <ProtectedRoute allowedRoles={['chairman']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/admin/*" element={<Navigate to="/chairman" replace />} />

                <Route path="/developer/*" element={
                  <ProtectedRoute allowedRoles={['developer']}>
                    <DeveloperDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
