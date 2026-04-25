import React from 'react';
import { Settings } from 'lucide-react';

export default function DeveloperSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Settings</h1>
            <p className="text-sm text-muted font-medium">Developer preferences (read-only in this build).</p>
          </div>
        </div>
      </div>
      <div className="premium-card text-sm text-muted font-medium">No configurable settings for the developer role.</div>
    </div>
  );
}

