import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useSystemConfig } from '../contexts/SystemConfigContext';

export default function Maintenance() {
  const { config } = useSystemConfig();
  const msg =
    config?.maintenanceMessage ||
    'System maintenance is in progress. Please try again later.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky p-6 overflow-hidden relative font-sans">
      <div className="absolute inset-0 bg-glass-radial pointer-events-none" />
      <div className="max-w-lg w-full glass-card overflow-hidden">
        <div className="p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-sm mb-5">
            <Wrench className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted font-medium mt-3">{msg}</p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link to="/login" className="btn-primary px-6 py-3">
              Back to Login
            </Link>
          </div>
          <div className="mt-6 text-[11px] text-muted font-bold uppercase tracking-widest">
            FursaLink Zanzibar
          </div>
        </div>
      </div>
    </div>
  );
}

