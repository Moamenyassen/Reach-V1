import React, { useState } from 'react';
import SysAdminOverview from './SysAdmin/SysAdminOverview';
import SysAdminCustomers from './SysAdmin/SysAdminCustomers';
import SysAdminLeads from './SysAdmin/SysAdminLeads';
import SysAdminUsers from './SysAdmin/SysAdminUsers';
import SysAdminPromos from './SysAdmin/SysAdminPromos';
import SysAdminAffiliates from './SysAdmin/SysAdminAffiliates';
import SysAdminLicenseRequests from './SysAdmin/SysAdminLicenseRequests';
import SysAdminPlans from './SysAdmin/SysAdminPlans';
import {
    LayoutDashboard,
    Activity,
    Building2,
    Users,
    Ticket,
    CreditCard,
    LogOut,
    Zap,
    Megaphone,
    FileText
} from 'lucide-react';

interface SysAdminDashboardProps {
    onLogout: () => void;
}

const SysAdminDashboard: React.FC<SysAdminDashboardProps> = ({ onLogout }) => {
    // Current View State - Default to Overview
    const [viewMode, setViewMode] = useState<string>('OVERVIEW');

    // Render Content Based on View
    const renderContent = () => {
        switch (viewMode) {
            case 'OVERVIEW':
                return <SysAdminOverview onNavigate={setViewMode} />;
            case 'COMPANIES':
                return <SysAdminCustomers />;
            case 'LEADS':
                return <SysAdminLeads />;
            case 'LICENSE_REQUESTS':
                return <SysAdminLicenseRequests />;
            case 'REACH_CRM':
                return <SysAdminUsers />;
            case 'PROMOS':
                return <SysAdminPromos />;
            case 'AFFILIATES':
                return <SysAdminAffiliates />;
            case 'PLANS':
                return <SysAdminPlans />;
            default:
                return <SysAdminOverview onNavigate={setViewMode} />;
        }
    };

    const tabs = [
        { id: 'OVERVIEW', label: 'Overview', icon: Activity },
        { id: 'COMPANIES', label: 'Companies', icon: Building2 },
        { id: 'LEADS', label: 'Reach Leads', icon: Zap },
        { id: 'LICENSE_REQUESTS', label: 'Licenses', icon: FileText },
        { id: 'REACH_CRM', label: 'CRM', icon: Users },
        { id: 'AFFILIATES', label: 'Affiliates', icon: Megaphone },
        { id: 'PROMOS', label: 'Promos', icon: Ticket },
        { id: 'PLANS', label: 'Plans', icon: CreditCard },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-slate-200 font-sans">
            {/* Top Brand Bar */}
            <header className="bg-[var(--bg-sidebar)] border-b border-white/5 relative z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo / Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Reach Sysadmin Portal</h1>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </header>

            {/* Sticky Navigation Tabs Bar */}
            <div className="sticky top-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center h-14 overflow-x-auto no-scrollbar">
                        <nav className="flex items-center gap-6">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = viewMode === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setViewMode(tab.id)}
                                        className={`group relative py-4 text-sm font-bold flex items-center gap-2 transition-all duration-300 ${isActive
                                            ? 'text-white'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        <div className={`p-1 rounded-md transition-colors ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-transparent group-hover:bg-white/5'}`}>
                                            <Icon className={`w-4 h-4`} />
                                        </div>
                                        {tab.label}

                                        {/* Active Indicator Line */}
                                        {isActive && (
                                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_-2px_6px_rgba(99,102,241,0.5)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {renderContent()}
            </main>
        </div>
    );
};

export default SysAdminDashboard;
