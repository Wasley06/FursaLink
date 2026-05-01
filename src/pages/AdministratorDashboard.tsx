import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';

const DashboardPage = React.lazy(() => import('./administrator/DashboardPage'));
const ApprovalsPage = React.lazy(() => import('./administrator/ApprovalsPage'));
const AnalyticsPage = React.lazy(() => import('./administrator/AnalyticsPage'));
const DossiersPage = React.lazy(() => import('./administrator/DossiersPage'));
const MessagesPage = React.lazy(() => import('./administrator/MessagesPage'));
const SettingsPage = React.lazy(() => import('./administrator/SettingsPage'));

function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function lazy(el: React.ReactNode) {
  return <React.Suspense fallback={<Loading />}>{el}</React.Suspense>;
}

export default function AdministratorDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={lazy(<DashboardPage />)} />
        <Route path="approvals" element={lazy(<ApprovalsPage />)} />
        <Route path="analytics" element={lazy(<AnalyticsPage />)} />
        <Route path="dossiers" element={lazy(<DossiersPage />)} />
        <Route path="messages" element={lazy(<MessagesPage />)} />
        <Route path="settings" element={lazy(<SettingsPage />)} />
        <Route path="*" element={lazy(<DashboardPage />)} />
      </Routes>
    </DashboardLayout>
  );
}

