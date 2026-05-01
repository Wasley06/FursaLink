import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Briefcase,
  FileText,
  Globe,
  Gavel,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

function formatNow() {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toLocaleString();
  }
}

export default function Landing() {
  const now = useMemo(() => formatNow(), []);

  return (
    <div className="min-h-screen bg-sky overflow-hidden">
      <div className="absolute inset-0 bg-glass-radial pointer-events-none" />

      <div className="min-h-screen flex">
        {/* App Sidebar */}
        <aside className="hidden lg:flex w-[300px] p-6">
          <div className="glass-card w-full p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-sm">
                <img src="/brand/logo.png" className="w-10 h-10 object-contain" alt="FursaLink Zanzibar logo" />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-extrabold text-navy tracking-tight">FursaLink</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                  Zanzibar Youth Council
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-navy/50">System</div>
              <div className="mt-1 text-sm font-extrabold text-navy">Government Employment Portal</div>
              <div className="mt-2 text-xs text-muted font-medium flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald" />
                Secure access • Verified profiles
              </div>
              <div className="mt-2 text-xs text-muted font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Unguja & Pemba coverage
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-navy/50">Quick Links</div>
              <Link
                to="/login"
                className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 text-navy font-extrabold hover:bg-white/45 transition"
              >
                Sign In <ArrowRight className="w-4 h-4 text-primary" />
              </Link>
              <Link
                to="/login?role=candidate"
                className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 text-navy font-extrabold hover:bg-white/45 transition"
              >
                Candidate Login <ArrowRight className="w-4 h-4 text-primary" />
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 text-navy font-extrabold hover:bg-white/45 transition"
              >
                Candidate Register <ArrowRight className="w-4 h-4 text-primary" />
              </Link>
              <Link
                to="/login?role=controller"
                className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 text-navy font-extrabold hover:bg-white/45 transition"
              >
                Officer Access <ShieldCheck className="w-4 h-4 text-primary" />
              </Link>
            </div>

            <div className="mt-auto text-[11px] font-bold uppercase tracking-widest text-muted">
              {now}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 lg:p-10 min-w-0">
          {/* Topbar */}
          <header className="glass-card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-10 h-10 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-sm">
                <img src="/brand/logo.png" className="w-8 h-8 object-contain" alt="FursaLink Zanzibar logo" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-extrabold text-navy tracking-tight">FursaLink</div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">Portal</div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="text-sm font-black uppercase tracking-widest text-navy/50">Access Portal</div>
              <div className="text-lg font-extrabold text-navy tracking-tight">Select your workspace</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-3 py-2 text-xs font-extrabold text-navy">
                <Bell className="w-4 h-4 text-primary" />
                Notices
              </div>
              <Link to="/register" className="btn-outline py-2.5 px-5 text-xs font-black uppercase tracking-widest border-white/50 bg-white/30">
                Candidate Register
              </Link>
              <Link to="/login?role=candidate" className="btn-primary py-2.5 px-5 text-xs font-black uppercase tracking-widest">
                Candidate Login
              </Link>
            </div>
          </header>

          {/* Desktop auto-update pill (Electron only) */}
          <UpdatePill />

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-8 grid gap-6 lg:grid-cols-12"
          >
            {/* Workspaces */}
            <div className="lg:col-span-8 space-y-6">
              <div className="glass-card p-7">
                <div className="text-[10px] font-black uppercase tracking-widest text-navy/50">Workspaces</div>
                <div className="mt-2 text-3xl font-extrabold text-navy tracking-tight">
                  Government Employment System
                </div>
                <p className="mt-3 text-sm text-muted font-medium max-w-2xl">
                  A secure, role-based platform for candidate applications, district-level processing, and executive oversight.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="premium-card">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary/80">Public</div>
                  </div>
                  <div className="mt-4 text-lg font-extrabold text-navy">Candidate</div>
                  <p className="mt-1 text-xs text-muted font-medium">
                    Register, update profile, and apply for vacancies.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Link to="/register" className="btn-primary flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest">
                      Register
                    </Link>
                    <Link to="/login?role=candidate" className="btn-outline flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest border-white/50 bg-white/30">
                      Login
                    </Link>
                  </div>
                </div>

                <div className="premium-card">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-emerald/10 border border-emerald/15 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald/80">Invite</div>
                  </div>
                  <div className="mt-4 text-lg font-extrabold text-navy">Controller</div>
                  <p className="mt-1 text-xs text-muted font-medium">
                    Manage jobs, review candidates, and publish notices.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Link to="/login?role=controller" className="btn-primary flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest">
                      Login
                    </Link>
                    <Link to="/register/invite/controller" className="btn-outline flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest border-white/50 bg-white/30">
                      Invite
                    </Link>
                  </div>
                </div>

                <div className="premium-card">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-gold/10 border border-gold/15 flex items-center justify-center">
                      <Gavel className="w-5 h-5 text-gold" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gold/80">Invite</div>
                  </div>
                  <div className="mt-4 text-lg font-extrabold text-navy">Administrator</div>
                  <p className="mt-1 text-xs text-muted font-medium">
                    Approvals workflow, dossier reviews, analytics, and reporting.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Link to="/login?role=administrator" className="btn-primary flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest">
                      Login
                    </Link>
                    <Link to="/register/invite/administrator" className="btn-outline flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest border-white/50 bg-white/30">
                      Invite
                    </Link>
                  </div>
                </div>

                <div className="premium-card">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-gold/10 border border-gold/15 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-gold" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gold/80">Invite</div>
                  </div>
                  <div className="mt-4 text-lg font-extrabold text-navy">Chairman</div>
                  <p className="mt-1 text-xs text-muted font-medium">
                    Executive analytics, compliance, and approvals oversight.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Link to="/login?role=chairman" className="btn-primary flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest">
                      Login
                    </Link>
                    <Link to="/register/invite/chairman" className="btn-outline flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest border-white/50 bg-white/30">
                      Invite
                    </Link>
                  </div>
                </div>
              </div>

              {/* Ad / Announcement Banner Slot */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-navy/50">Banner</div>
                    <div className="mt-1 text-sm font-extrabold text-navy">Ad / Public Announcement Space</div>
                    <p className="mt-1 text-xs text-muted font-medium">
                      Place a 1200×300 (or similar) banner image here.
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-3 py-2 text-xs font-extrabold text-navy">
                    <Globe className="w-4 h-4 text-primary" />
                    Sponsored
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-white/70 bg-white/25 backdrop-blur-md overflow-hidden">
                  <div className="h-28 sm:h-32 lg:h-36 flex items-center justify-center text-[11px] font-black uppercase tracking-widest text-navy/40">
                    Banner Placeholder
                  </div>
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-card p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-navy/50">System Modules</div>
                <div className="mt-4 space-y-3">
                  {[
                    { icon: Briefcase, title: 'Vacancies', desc: 'Publishing & lifecycle management.' },
                    { icon: FileText, title: 'Applications', desc: 'Audit-ready candidate records.' },
                    { icon: ShieldCheck, title: 'Security', desc: 'Role-based access control.' },
                  ].map((m) => (
                    <div
                      key={m.title}
                      className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-white/50 border border-white/60 flex items-center justify-center">
                        <m.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-navy truncate">{m.title}</div>
                        <div className="text-xs text-muted font-medium truncate">{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-navy/50">Notice</div>
                <div className="mt-2 text-sm font-extrabold text-navy">Officer accounts are invite-only</div>
                <p className="mt-2 text-xs text-muted font-medium">
                  Controllers, Administrators, and Chairmen register via a secure invitation link provided by the office administrator.
                </p>
                <div className="mt-4 flex gap-2">
                  <Link to="/login?role=controller" className="btn-outline flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest border-white/50 bg-white/30">
                    Officer Login
                  </Link>
                  <Link to="/register" className="btn-primary flex-1 justify-center py-2.5 text-xs font-black uppercase tracking-widest">
                    Candidate Register
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}

function UpdatePill() {
  const [status, setStatus] = React.useState<'available' | 'none' | 'downloaded' | null>(null);

  React.useEffect(() => {
    const unsub = window.FursaLink?.onUpdateStatus?.((p) => setStatus(p.status));
    return () => unsub?.();
  }, []);

  if (!window.FursaLink || !status || status === 'none') return null;

  const label =
    status === 'available' ? 'Update available… downloading' : status === 'downloaded' ? 'Update ready — restart to apply' : null;
  if (!label) return null;

  return (
    <div className="mt-4">
      <div className="glass-card px-4 py-3 flex items-center justify-between">
        <div className="text-xs font-extrabold text-navy">{label}</div>
        <div className="text-[10px] font-black uppercase tracking-widest text-primary">Desktop App</div>
      </div>
    </div>
  );
}
