import React from 'react';
import { Settings } from 'lucide-react';

export default function ChairmanSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">System Configuration</h1>
            <p className="text-sm text-muted font-medium">Central configuration and governance controls.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        <div className="text-sm text-muted font-medium">
          System configuration is handled via environment variables and Firestore rules in this build.
        </div>
      </div>
    </div>
  );
}

