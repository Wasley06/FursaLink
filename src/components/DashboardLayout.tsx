import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Bell, 
  Calendar, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Search, 
  User, 
  Menu, 
  X,
  ChevronRight,
  PlusCircle,
  BarChart3,
  Users,
  Shield,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../contexts/I18nContext';
import { startPresence, stopPresence } from '../lib/presence';

interface SidebarItem {
  icon: any;
  labelKey: string;
  path: string;
}

const candidateItems: SidebarItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/candidate' },
  { icon: Briefcase, labelKey: 'nav.jobs', path: '/candidate/jobs' },
  { icon: FileText, labelKey: 'nav.applications', path: '/candidate/applications' },
  { icon: Bell, labelKey: 'nav.notices', path: '/candidate/notices' },
  { icon: Calendar, labelKey: 'nav.events', path: '/candidate/events' },
  { icon: BookOpenIcon, labelKey: 'nav.courses', path: '/candidate/courses' },
  { icon: MessageSquare, labelKey: 'nav.messages', path: '/candidate/messages' },
  { icon: Settings, labelKey: 'nav.settings', path: '/candidate/settings' },
];

const controllerItems: SidebarItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/controller' },
  { icon: Briefcase, labelKey: 'nav.jobManagement', path: '/controller/jobs' },
  { icon: Users, labelKey: 'nav.candidateDirectory', path: '/controller/candidates' },
  { icon: PlusCircle, labelKey: 'nav.createJob', path: '/controller/jobs/new' },
  { icon: Bell, labelKey: 'nav.notices', path: '/controller/notices' },
  { icon: MessageSquare, labelKey: 'nav.communications', path: '/controller/messages' },
  { icon: Settings, labelKey: 'nav.settings', path: '/controller/settings' },
];

const adminItems: SidebarItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.executiveStats', path: '/chairman' },
  { icon: FileText, labelKey: 'nav.approvals', path: '/chairman/approvals' },
  { icon: BarChart3, labelKey: 'nav.analytics', path: '/chairman/analytics' },
  { icon: Users, labelKey: 'nav.userDirectory', path: '/chairman/users' },
  { icon: Users, labelKey: 'nav.candidateDirectory', path: '/chairman/candidates' },
  { icon: Briefcase, labelKey: 'nav.jobs', path: '/chairman/jobs' },
  { icon: Shield, labelKey: 'nav.systemSecurity', path: '/chairman/security' },
  { icon: MessageSquare, labelKey: 'nav.internalComms', path: '/chairman/messages' },
  { icon: Settings, labelKey: 'nav.systemConfig', path: '/chairman/settings' },
];

const developerItems: SidebarItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.diagnostics', path: '/developer' },
  { icon: TrendingUp, labelKey: 'nav.presence', path: '/developer/presence' },
  { icon: Shield, labelKey: 'nav.securityLogs', path: '/developer/security' },
  { icon: Users, labelKey: 'nav.userLookup', path: '/developer/users' },
  { icon: Settings, labelKey: 'nav.settings', path: '/developer/settings' },
];

function BookOpenIcon(props: any) { return <BookOpen {...props} />; }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleLabel = profile?.role;

  const getItems = () => {
    if (!profile) return [];
    switch (profile.role) {
      case 'candidate': return candidateItems;
      case 'controller': return controllerItems;
      case 'chairman': return adminItems;
      case 'developer': return developerItems;
      default: return [];
    }
  };

  const menuItems = getItems();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  React.useEffect(() => {
    if (!profile?.id) return;
    startPresence(profile.id, { role: profile.role });
    return () => stopPresence();
  }, [profile?.id, profile?.role]);

  return (
    <div className="min-h-screen bg-sky flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-navy text-white sticky top-0 h-screen border-r border-white/10">
        <div className="p-6 pb-8 flex flex-col items-center gap-4 text-center">
          <img src="/brand/logo.png" className="w-16 h-16 object-contain" alt="FursaLink Zanzibar logo" />
          <div>
            <span className="text-xl font-extrabold tracking-tight block">FursaLink</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold/60">Zanzibar Youth Council</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-white/60 text-sm",
                  isActive && "bg-primary-hover text-white shadow-xl shadow-black/10 font-semibold"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-gold")} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="text-[10px] text-center text-white/30 font-bold mb-4 uppercase tracking-widest">
            SMART GOV SYSTEM v4.2<br/>
            <span className="text-gold/40">Powered by AELYN TECHNOLOGIES</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-white/40 hover:text-white hover:bg-danger/20 transition-all text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-20 bg-white/40 border-b border-white/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-sky rounded-lg"
            >
              <Menu className="w-6 h-6 text-navy" />
            </button>
            <div className="hidden md:flex items-center gap-3 bg-white/40 px-4 py-2 rounded-xl border border-white/50 backdrop-blur-md w-96">
              <Search className="w-5 h-5 text-muted" />
              <input type="text" placeholder={t('common.search')} className="bg-transparent outline-none w-full text-sm text-navy" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center bg-sky rounded-xl p-1 border border-border">
              <button
                onClick={() => setLang('en')}
                className={cn(
                  'px-3 py-1 text-[10px] font-bold rounded-lg shadow-sm',
                  lang === 'en' ? 'bg-white text-primary' : 'text-muted hover:text-navy',
                )}
              >
                {t('lang.en')}
              </button>
              <button
                onClick={() => setLang('sw')}
                className={cn(
                  'px-3 py-1 text-[10px] font-bold rounded-lg shadow-sm',
                  lang === 'sw' ? 'bg-white text-primary' : 'text-muted hover:text-navy',
                )}
              >
                {t('lang.sw')}
              </button>
            </div>
            <button
              onClick={() => {
                if (!profile?.role) return;
                if (profile.role === 'candidate') navigate('/candidate/notices');
                else if (profile.role === 'controller') navigate('/controller/notices');
                else if (profile.role === 'chairman') navigate('/chairman/approvals');
                else if (profile.role === 'developer') navigate('/developer/security');
              }}
              className="relative p-2.5 rounded-xl hover:bg-sky transition-colors text-muted hover:text-primary"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full" />
            </button>
            <div className="h-10 w-px bg-border mx-2" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-navy leading-tight">{profile?.fullName}</div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest">{roleLabel ? t(`role.${roleLabel}`) : ''}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky border-2 border-border flex items-center justify-center overflow-hidden">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 p-6 lg:p-10">
          {children}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-80 bg-navy text-white z-[70] lg:hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-navy font-bold text-xl">F</div>
                  <span className="text-xl font-bold tracking-tight">FursaLink</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 p-6 space-y-2">
                {menuItems.map((item) => (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-white/70",
                      location.pathname === item.path && "bg-primary text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{t(item.labelKey)}</span>
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
