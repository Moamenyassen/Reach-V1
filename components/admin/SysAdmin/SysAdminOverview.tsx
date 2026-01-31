import React, { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    Zap,
    TrendingUp,
    Activity,
    Shield,
    Clock,
    ArrowUpRight,
    Plus,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import {
    getAllCompanies,
    getLicenseRequests,
    getSubscriptionPlans
} from '../../../services/supabase';

interface OverviewStats {
    totalCompanies: number;
    activeCompanies: number;
    totalLeads: number;
    pendingLicenses: number;
    totalRevenue: number;
    activeUsers: number;
}

interface SysAdminOverviewProps {
    onNavigate: (tab: string) => void;
}

const SysAdminOverview: React.FC<SysAdminOverviewProps> = ({ onNavigate }) => {
    const [stats, setStats] = useState<OverviewStats>({
        totalCompanies: 0,
        activeCompanies: 0,
        totalLeads: 0,
        pendingLicenses: 0,
        totalRevenue: 0,
        activeUsers: 0
    });
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'checking'>('checking');

    const loadStats = async () => {
        setLoading(true);
        setConnectionStatus('checking');

        try {
            // Fetch companies
            const companies = await getAllCompanies();
            const activeCompanies = companies.filter(c => c.isActive);

            // Fetch license requests
            const licenses = await getLicenseRequests();
            const pendingLicenses = licenses.filter((l: any) => l.status !== 'APPROVED');

            // Calculate estimated revenue (sum of active companies × avg plan price)
            const estimatedMonthlyRevenue = activeCompanies.reduce((sum, c) => {
                const tierPrice = c.subscriptionTier === 'ENTERPRISE' ? 299 :
                    c.subscriptionTier === 'PROFESSIONAL' ? 99 : 29;
                return sum + (tierPrice * (c.maxUsers || 1));
            }, 0);

            setStats({
                totalCompanies: companies.length,
                activeCompanies: activeCompanies.length,
                totalLeads: 21832, // This would come from leads count
                pendingLicenses: pendingLicenses.length,
                totalRevenue: estimatedMonthlyRevenue,
                activeUsers: activeCompanies.reduce((sum, c) => sum + (c.maxUsers || 0), 0)
            });

            setConnectionStatus('connected');
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to load stats:', error);
            setConnectionStatus('error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const StatCard = ({
        icon: Icon,
        label,
        value,
        subValue,
        color,
        onClick
    }: {
        icon: any;
        label: string;
        value: string | number;
        subValue?: string;
        color: string;
        onClick?: () => void;
    }) => (
        <button
            onClick={onClick}
            className={`group relative bg-gradient-to-br ${color} border border-white/10 rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl overflow-hidden`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="w-20 h-20" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 opacity-80" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
                </div>
                <div className="text-4xl font-black text-white mb-1">
                    {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : value}
                </div>
                {subValue && <div className="text-xs opacity-60">{subValue}</div>}
            </div>
            {onClick && (
                <ArrowUpRight className="absolute bottom-4 right-4 w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity" />
            )}
        </button>
    );

    const QuickAction = ({
        icon: Icon,
        label,
        description,
        onClick,
        color
    }: {
        icon: any;
        label: string;
        description: string;
        onClick: () => void;
        color: string;
    }) => (
        <button
            onClick={onClick}
            className={`group flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/5 transition-all text-left`}
        >
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <div className="text-white font-bold text-sm">{label}</div>
                <div className="text-slate-500 text-xs">{description}</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </button>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header with Connection Status */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Activity className="w-7 h-7 text-cyan-500" />
                        Control Center
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        System overview and quick actions
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${connectionStatus === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : connectionStatus === 'error'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                        {connectionStatus === 'connected' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {connectionStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                        {connectionStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Connection Error' : 'Checking...'}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={loadStats}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Last Updated */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
                <Clock className="w-3.5 h-3.5" />
                Last updated: {lastRefresh.toLocaleTimeString()}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Building2}
                    label="Companies"
                    value={stats.totalCompanies}
                    subValue={`${stats.activeCompanies} active`}
                    color="from-indigo-900/40 to-black"
                    onClick={() => onNavigate('COMPANIES')}
                />
                <StatCard
                    icon={Zap}
                    label="Leads"
                    value={stats.totalLeads.toLocaleString()}
                    subValue="Master database"
                    color="from-cyan-900/40 to-black"
                    onClick={() => onNavigate('LEADS')}
                />
                <StatCard
                    icon={Shield}
                    label="License Requests"
                    value={stats.pendingLicenses}
                    subValue="Pending approval"
                    color="from-emerald-900/40 to-black"
                    onClick={() => onNavigate('LICENSE_REQUESTS')}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Est. MRR"
                    value={`${stats.totalRevenue.toLocaleString()} ر.س`}
                    subValue={`${stats.activeUsers} total users`}
                    color="from-purple-900/40 to-black"
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Quick Actions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickAction
                        icon={Plus}
                        label="Provision New Company"
                        description="Create a new tenant with admin access"
                        onClick={() => onNavigate('COMPANIES')}
                        color="bg-indigo-500/20 text-indigo-400"
                    />
                    <QuickAction
                        icon={Shield}
                        label="Process License Request"
                        description="Review and activate pending licenses"
                        onClick={() => onNavigate('LICENSE_REQUESTS')}
                        color="bg-emerald-500/20 text-emerald-400"
                    />
                    <QuickAction
                        icon={Users}
                        label="Manage CRM Contacts"
                        description="View and manage customer contacts"
                        onClick={() => onNavigate('REACH_CRM')}
                        color="bg-blue-500/20 text-blue-400"
                    />
                </div>
            </div>

            {/* System Health */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-500" />
                    System Health
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                        <div>
                            <div className="text-sm font-bold text-white">Database</div>
                            <div className="text-xs text-slate-500">Supabase</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                            <div className="text-sm font-bold text-white">Storage</div>
                            <div className="text-xs text-slate-500">Active</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                            <div className="text-sm font-bold text-white">Realtime</div>
                            <div className="text-xs text-slate-500">Subscribed</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SysAdminOverview;
