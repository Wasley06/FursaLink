import React, { Suspense } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';

const DeveloperSecurityPage = React.lazy(() => import('./developer/SecurityPage'));
const DeveloperUsersPage = React.lazy(() => import('./developer/UsersPage'));
const DeveloperSettingsPage = React.lazy(() => import('./developer/SettingsPage'));
const PresencePage = React.lazy(() => import('./developer/PresencePage'));
const DeveloperSystemPage = React.lazy(() => import('./developer/SystemPage'));
const DeveloperToolsPage = React.lazy(() => import('./developer/ToolsPage'));
const DeveloperRecoveryPage = React.lazy(() => import('./developer/RecoveryPage'));

// Reuse existing "chairman" admin pages for developer full-system control (lazy-loaded to keep login fast).
const ChairmanApprovalsPage = React.lazy(() => import('./chairman/ApprovalsPage'));
const ChairmanApplicationApprovalsPage = React.lazy(() => import('./chairman/ApplicationApprovalsPage'));
const ChairmanAnalyticsPage = React.lazy(() => import('./chairman/AnalyticsPage'));
const ChairmanJobsPage = React.lazy(() => import('./chairman/JobsPage'));
const ChairmanEditJobPage = React.lazy(() => import('./chairman/EditJobPage'));
const ChairmanCandidatesPage = React.lazy(() => import('./chairman/CandidatesPage'));
const ChairmanUsersPage = React.lazy(() => import('./chairman/UsersPage'));
const ChairmanMessagesPage = React.lazy(() => import('./chairman/MessagesPage'));
const ChairmanSecurityPage = React.lazy(() => import('./chairman/SecurityPage'));
const ChairmanSettingsPage = React.lazy(() => import('./chairman/SettingsPage'));

const ControllerNoticesPage = React.lazy(() => import('./controller/NoticesPage'));

function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function lazy(el: React.ReactNode) {
  return <Suspense fallback={<Loading />}>{el}</Suspense>;
}

function Overview() {
  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="text-[10px] font-black text-muted uppercase tracking-widest">Developer Console</div>
        <h1 className="text-2xl font-extrabold text-navy mt-2">System Diagnostics</h1>
        <p className="text-sm text-muted font-medium mt-2">
          Limited-access tools for troubleshooting, audit visibility, and environment verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link to="/developer/security" className="premium-card hover:bg-sky/20 transition-colors block">
          <div className="text-sm font-extrabold text-navy">Security Posture</div>
          <div className="text-xs text-muted font-medium mt-2">
            Review audit logs and access issues. No administrative write access is granted to this role.
          </div>
        </Link>
        <Link to="/developer/system" className="premium-card hover:bg-sky/20 transition-colors block">
          <div className="text-sm font-extrabold text-navy">Environment</div>
          <div className="text-xs text-muted font-medium mt-2">
            Verifies Firebase configuration and build metadata.
          </div>
        </Link>
        <Link to="/developer/recovery" className="premium-card hover:bg-sky/20 transition-colors block">
          <div className="text-sm font-extrabold text-navy">Recovery</div>
          <div className="text-xs text-muted font-medium mt-2">
            Restore archived candidates and unban accounts.
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function DeveloperDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="tools" element={lazy(<DeveloperToolsPage />)} />
        <Route path="presence" element={lazy(<PresencePage />)} />
        <Route path="security" element={lazy(<DeveloperSecurityPage />)} />
        <Route path="users" element={lazy(<DeveloperUsersPage />)} />
        <Route path="system" element={lazy(<DeveloperSystemPage />)} />
        <Route path="recovery" element={lazy(<DeveloperRecoveryPage />)} />
        <Route path="settings" element={lazy(<DeveloperSettingsPage />)} />

        {/* Full admin surface area (developer has system control) */}
        <Route path="approvals" element={lazy(<ChairmanApprovalsPage />)} />
        <Route path="application-approvals" element={lazy(<ChairmanApplicationApprovalsPage />)} />
        <Route path="analytics" element={lazy(<ChairmanAnalyticsPage />)} />
        <Route path="jobs" element={lazy(<ChairmanJobsPage />)} />
        <Route path="jobs/:jobId" element={lazy(<ChairmanEditJobPage />)} />
        <Route path="candidates" element={lazy(<ChairmanCandidatesPage />)} />
        <Route path="directory" element={lazy(<ChairmanUsersPage />)} />
        <Route path="messages" element={lazy(<ChairmanMessagesPage />)} />
        <Route path="security-admin" element={lazy(<ChairmanSecurityPage />)} />
        <Route path="config" element={lazy(<ChairmanSettingsPage />)} />
        <Route path="notices" element={lazy(<ControllerNoticesPage />)} />

        <Route path="*" element={<Overview />} />
      </Routes>
    </DashboardLayout>
  );
}
