import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import DeveloperSecurityPage from './developer/SecurityPage';
import DeveloperUsersPage from './developer/UsersPage';
import DeveloperSettingsPage from './developer/SettingsPage';

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
        <div className="premium-card">
          <div className="text-sm font-extrabold text-navy">Security Posture</div>
          <div className="text-xs text-muted font-medium mt-2">
            Review audit logs and access issues. No administrative write access is granted to this role.
          </div>
        </div>
        <div className="premium-card">
          <div className="text-sm font-extrabold text-navy">Environment</div>
          <div className="text-xs text-muted font-medium mt-2">
            Verifies Firebase configuration and build metadata.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeveloperDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="security" element={<DeveloperSecurityPage />} />
        <Route path="users" element={<DeveloperUsersPage />} />
        <Route path="settings" element={<DeveloperSettingsPage />} />
        <Route path="*" element={<Overview />} />
      </Routes>
    </DashboardLayout>
  );
}
