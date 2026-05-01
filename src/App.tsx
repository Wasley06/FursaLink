import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { SystemConfigProvider, useSystemConfig } from './contexts/SystemConfigContext';
import { NotificationsProvider } from './contexts/NotificationsContext';

// Lazy load pages
const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const InviteRegister = React.lazy(() => import('./pages/InviteRegister'));
const CandidateDashboard = React.lazy(() => import('./pages/CandidateDashboard'));
const ControllerDashboard = React.lazy(() => import('./pages/ControllerDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdministratorDashboard = React.lazy(() => import('./pages/AdministratorDashboard'));
const DeveloperDashboard = React.lazy(() => import('./pages/DeveloperDashboard'));
const VerifyPhone = React.lazy(() => import('./pages/VerifyPhone'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const ResetOtp = React.lazy(() => import('./pages/ResetOtp'));

function candidateNeedsVerification(profile: any) {
  if (!profile || profile.role !== 'candidate') return false;
  const contactEmail = String(profile.contactEmail || '').trim();
  const hasEmail = contactEmail.includes('@');
  if (hasEmail) return profile.emailVerified !== true;
  return profile.phoneVerified === false;
}

function candidateVerificationPath(profile: any) {
  const contactEmail = String(profile?.contactEmail || '').trim();
  if (contactEmail.includes('@')) return '/verify-email';
  return '/verify-phone';
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, profile, loading } = useAuth();
  const { config, loading: configLoading } = useSystemConfig();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
      />
    </div>
  );

  if (configLoading) return null;
  if (config?.maintenanceEnabled && profile?.role !== 'developer') return <Navigate to="/maintenance" replace />;

  if (!user) return <Navigate to="/login" />;
  if (profile && !allowedRoles.includes(profile.role)) return <Navigate to="/dashboard" />;
  if (candidateNeedsVerification(profile)) return <Navigate to={candidateVerificationPath(profile)} replace />;
  if (profile?.role === 'candidate' && !String((profile as any)?.photoUrl || '').trim() && !location.pathname.startsWith('/candidate/settings')) {
    return <Navigate to="/candidate/settings" replace />;
  }

  return <>{children}</>;
}

function RoleRedirect() {
  const { user, profile, loading } = useAuth();
  const { config, loading: configLoading } = useSystemConfig();
  
  if (loading) return null;
  if (configLoading) return null;
  // If the Firebase session exists but the Firestore profile hasn't loaded yet, avoid bouncing to login.
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }
  if (!profile) return <Navigate to="/login" />;
  if (config?.maintenanceEnabled && profile.role !== 'developer') return <Navigate to="/maintenance" replace />;
  if (candidateNeedsVerification(profile)) return <Navigate to={candidateVerificationPath(profile)} replace />;

  switch (profile.role) {
    case 'candidate': return <Navigate to="/candidate" />;
    case 'controller': return <Navigate to="/controller" />;
    case 'chairman': return <Navigate to="/chairman" />;
    case 'administrator': return <Navigate to="/administrator" />;
    case 'developer': return <Navigate to="/developer" />;
    default: return <Navigate to="/login" />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <SystemConfigProvider>
        <I18nProvider>
          <ThemeProvider>
            <NotificationsProvider>
              <BrowserRouter>
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center bg-sky">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/maintenance" element={<Maintenance />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/login/:role" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/register/invite/:role" element={<InviteRegister />} />
                    <Route path="/verify-phone" element={<VerifyPhone />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/reset-otp" element={<ResetOtp />} />
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

                    <Route path="/administrator/*" element={
                      <ProtectedRoute allowedRoles={['administrator']}>
                        <AdministratorDashboard />
                      </ProtectedRoute>
                    } />

                    <Route path="/admin/*" element={<Navigate to="/administrator" replace />} />

                    <Route path="/developer/*" element={
                      <ProtectedRoute allowedRoles={['developer']}>
                        <DeveloperDashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </NotificationsProvider>
          </ThemeProvider>
        </I18nProvider>
      </SystemConfigProvider>
    </AuthProvider>
  );
}
