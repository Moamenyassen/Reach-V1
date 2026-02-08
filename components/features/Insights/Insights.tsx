
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Route, MapPin, Milestone, Timer, BarChart3,
  Users, Repeat, Zap, AlertOctagon, Target, User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

import { User as UserType, Company, Customer, NormalizedBranch } from '../../../types';
import { RouteHealthStats } from '../../../services/mockAnalytics';
import { getDashboardInsights, getBranches } from '../../../services/supabase';
import RedFlagCard from '../../common/RedFlagCard';
import ReachCommandMap from './ReachCommandMap';

// --- Components ---

// --- Portal Tooltip ---
const PortalTooltip = ({ content, triggerRect }: { content: string, triggerRect: DOMRect }) => {
  if (!content || !triggerRect) return null;

  // Position: Centered above the element
  const top = triggerRect.top - 10; // 10px spacing
  const left = triggerRect.left + (triggerRect.width / 2);

  return createPortal(
    <div
      className="fixed z-[9999] px-3 py-2 bg-panel text-main text-[10px] font-medium uppercase tracking-wider rounded-lg shadow-2xl backdrop-blur-md border border-main whitespace-nowrap pointer-events-none transform -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-200"
      style={{ top: 'var(--tooltip-top)', left: 'var(--tooltip-left)' } as React.CSSProperties}
    >
      <span style={{ '--tooltip-top': `${top}px`, '--tooltip-left': `${left}px` } as any} className="hidden" />
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-panel" />
    </div>,
    document.body
  );
};

const UniformKpiCard = ({ label, value, icon: Icon, color, delay, unit, tooltip }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400',
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    fuchsia: 'from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-500/20 text-fuchsia-400',
    sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-400',
  };

  const style = colorMap[color] || colorMap.indigo;

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay }}
        onMouseEnter={() => {
          if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
          setIsHovered(true);
        }}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative flex flex-col justify-center p-3 rounded-xl border bg-gradient-to-br backdrop-blur-md
          h-22 w-full min-w-[100px]
          hover:scale-[1.02] transition-transform duration-200 cursor-default group
          ${style}
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className={`p-1.5 rounded-lg bg-white/5`}>
            <Icon className="w-3.5 h-3.5 opacity-80" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 ml-2 text-right leading-none">{label}</span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-main tracking-tight">{value}</span>
          {unit && <span className="text-[10px] font-medium opacity-50 text-muted">{unit}</span>}
        </div>
      </motion.div>
      {isHovered && tooltip && rect && <PortalTooltip content={tooltip} triggerRect={rect} />}
    </>
  );
};

const HealthStatRow = ({ label, value, color, tooltip }: { label: string, value: number, color: 'emerald' | 'fuchsia' | 'amber', tooltip: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const colors = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500', text: 'text-emerald-400' },
    fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', dot: 'bg-fuchsia-500', text: 'text-fuchsia-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500', text: 'text-amber-400' },
  };
  const theme = colors[color];

  return (
    <>
      <div
        ref={rowRef}
        onMouseEnter={() => {
          if (rowRef.current) setRect(rowRef.current.getBoundingClientRect());
          setIsHovered(true);
        }}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center justify-between p-3 rounded-lg ${theme.bg} border ${theme.border} cursor-default`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${theme.dot} ${color === 'emerald' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-bold ${theme.text}`}>{label}</span>
        </div>
        <span className="text-lg font-black text-main">{value}</span>
      </div>
      {isHovered && rect && <PortalTooltip content={tooltip} triggerRect={rect} />}
    </>
  );
};

const HealthMonitor = ({ data, settings }: { data: RouteHealthStats, settings: any }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-40 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'Under', value: data.under, color: '#f43f5e' },
                { name: 'Stable', value: data.stable, color: '#10b981' },
                { name: 'Over', value: data.over, color: '#f59e0b' }
              ]}
              innerRadius={60}
              outerRadius={75}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={450}
            >
              <Cell key="cell-0" fill="#f43f5e" className="stroke-main stroke-4" />
              <Cell key="cell-1" fill="#10b981" className="stroke-main stroke-4" />
              <Cell key="cell-2" fill="#f59e0b" className="stroke-main stroke-4" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <Activity className="w-6 h-6 text-slate-600 mb-1" />
          <span className="text-4xl font-black text-main">{data.stable + data.under + data.over}</span>
          <span className="text-[9px] uppercase tracking-widest text-muted font-bold">Monitored</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <HealthStatRow
          label="Stable"
          value={data.stable}
          color="emerald"
          tooltip={`Routes with ${settings?.minClientsPerRoute || 80} to ${settings?.maxClientsPerRoute || 120} customers`}
        />
        <HealthStatRow
          label="Under Utilized"
          value={data.under}
          color="fuchsia"
          tooltip={`Routes with less than ${settings?.minClientsPerRoute || 80} customers`}
        />
        <HealthStatRow
          label="Overloaded"
          value={data.over}
          color="amber"
          tooltip={`Routes with more than ${settings?.maxClientsPerRoute || 120} customers`}
        />
      </div>
    </div>
  )
}





// --- Main Component ---

interface InsightsDashboardProps {
  currentUser: UserType;
  currentCompany: Company | null;
  allCustomers: Customer[];
  userList: UserType[];
  uploadHistory: any[];
  onNavigate: (view: any) => void;
  onLogout: () => void;
  hideHeader?: boolean;
  isDarkMode: boolean;
  language: 'en' | 'ar';
  isAiTheme: boolean;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onOpenCompanySettings?: () => void;
}

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Insights Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong in Insights</h2>
          <p className="text-slate-400 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const InsightsDashboardContent: React.FC<InsightsDashboardProps> = (props) => {
  const { hideHeader, currentCompany, currentUser } = props;

  // NEW: Check if user is admin/manager (can see all data)
  const isAdmin = !currentUser?.role || ['ADMIN', 'MANAGER', 'SYSADMIN'].includes(currentUser?.role?.toUpperCase?.() || '');
  const userBranchIds = currentUser?.branchIds || [];

  // Safety extraction of settings with robust parsing check
  // stableSettingsKey ensures we only re-parse if the actual content changes, not just the object ref
  const settingsStr = typeof currentCompany?.settings === 'string'
    ? currentCompany.settings
    : JSON.stringify(currentCompany?.settings || {});

  const settings = React.useMemo(() => {
    try {
      return JSON.parse(settingsStr);
    } catch {
      return {};
    }
  }, [settingsStr]);

  const insightsSettings = settings?.modules?.insights || {};
  const optimizerSettings = settings?.modules?.optimizer || {};

  // --- NEW: Fetch Branches from company_branches table ---
  const { data: dbBranches = [] } = useQuery({
    queryKey: ['companyBranches', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      return await getBranches(currentCompany.id);
    },
    enabled: !!currentCompany?.id,
    staleTime: 1000 * 60 * 5, // Cache branches for 5 mins
  });

  const activeBranches = React.useMemo(() => {
    let branches = dbBranches.map(b => ({
      id: b.id,
      name: b.name_en,
      nameAr: b.name_ar,
      code: b.code,
      coordinates: { lat: b.lat || 0, lng: b.lng || 0 },
      isActive: b.is_active
    }));

    // NEW: Filter branches for non-admin users
    if (!isAdmin && userBranchIds.length > 0) {
      console.log('[Insights] Filtering branches for restricted user. Allowed:', userBranchIds);
      branches = branches.filter(b =>
        userBranchIds.includes(b.name) ||
        userBranchIds.includes(b.id) ||
        userBranchIds.includes(b.code)
      );
    }

    return branches;
  }, [dbBranches, isAdmin, userBranchIds]);

  // --- Server-Side Stats Fetching ---
  // PERFORMANCE FIX: 
  // 1. gcTime: 0 -> Clears cache/memory immediately on unmount
  // 2. retry: 3 -> Handles network glitches automatically
  // 3. signal -> Cancels pending request if user navigates away
  const {
    data: summary,
    isLoading: isCalculating,
    refetch: refreshInsights,
    isRefetching,
    isError,
    error: queryError
  } = useQuery({
    queryKey: ['dashboardInsights', currentCompany?.id, isAdmin ? 'all' : userBranchIds.join(',')],
    queryFn: async ({ signal }) => {
      if (!currentCompany?.id) throw new Error("No Company ID");
      // Pass branchIds for restricted users
      const branchFilter = !isAdmin && userBranchIds.length > 0 ? userBranchIds : undefined;
      console.log('[Insights] Fetching stats with branchFilter:', branchFilter);
      return await getDashboardInsights(currentCompany.id, branchFilter, signal);
    },
    enabled: !!currentCompany?.id,
    retry: 1, // Reduced retry for debugging
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 0, // Always fetch fresh data on mount
    gcTime: 0,    // Clear memory immediately when component unmounts (requires @tanstack/react-query v5)
    refetchOnWindowFocus: false,
  });

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500">
        <h3 className="font-bold">Error Loading Data</h3>
        <p className="text-sm opacity-70 mb-4">{queryError?.message}</p>
        <button onClick={() => refreshInsights()} className="px-4 py-2 bg-white/10 rounded">Retry</button>
      </div>
    );
  }

  console.log('Insights Debug:', {
    companyId: currentCompany?.id,
    summary,
    isCalculating,
    activeBranchesLength: activeBranches.length,
    firstBranchCoords: activeBranches[0]?.coordinates
  });

  // Safe extraction of alerts to prevent crashes
  const alerts = summary?.alerts || { missingGps: 0, proximityIssues: 0 };

  const formatNum = (n: number) => n?.toLocaleString() || '0';

  // Prepare dynamic tooltips based on company settings
  const metrics = [
    {
      id: 1,
      label: 'Total Customers',
      value: formatNum(summary?.kpis.totalCustomers || 0),
      icon: Users,
      color: 'blue',
      tooltip: 'Distinct Count of "Client Code" across all records. (Fallback to Name+Location hash if missing)'
    },
    {
      id: 2,
      label: 'Active Routes',
      value: summary?.kpis.activeRoutes || 0,
      icon: Route,
      color: 'violet',
      tooltip: 'Distinct Count of unique "Route Names" in the uploaded dataset.'
    },
    {
      id: 3,
      label: 'Total Visits',
      value: formatNum(summary?.kpis.totalVisits || 0),
      icon: MapPin,
      color: 'cyan',
      tooltip: 'Total number of records/stops (including duplicate visits to same client).'
    },
    { id: 4, label: 'Total Distance', value: formatNum(summary?.kpis.totalDistance || 0), unit: 'km', icon: Milestone, color: 'emerald', tooltip: 'Calculated via GPS (Haversine) from customer to customer (North-to-South path).' },
    { id: 5, label: 'Total Time', value: Math.round((summary?.kpis.totalTime || 0) / 60), unit: 'hrs', icon: Timer, color: 'amber', tooltip: 'Total Duration = Travel Time (25km/h) + Service Time (10 mins/visit).' },
    { id: 6, label: 'Avg Visits', value: summary?.kpis.avgVisitsPerRoute || 0, icon: BarChart3, color: 'fuchsia', tooltip: 'Average number of stops per route (Total Visits / Active Routes)' },
    {
      id: 7,
      label: 'Time / User',
      value: summary?.kpis.timePerUser || 0,
      unit: 'hrs',
      icon: User,
      color: 'sky',
      tooltip: `Avg. working minutes per user (Limit: ${optimizerSettings?.maxWorkingHours || 9}h/day)`
    },
    {
      id: 8,
      label: 'Frequency',
      value: summary?.kpis.frequency || 0,
      icon: Repeat,
      color: 'indigo',
      tooltip: `Avg. visits per client (Target: ${insightsSettings?.visitFrequencyDays || 7} days)`
    },
    {
      id: 9,
      label: 'Efficiency',
      value: summary?.kpis.efficiency || 0,
      unit: '%',
      icon: Zap,
      color: 'rose',
      tooltip: `Route optimization score (Target: ${insightsSettings?.efficiencyThreshold || 85}%)`
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-main text-main font-sans overflow-hidden relative">
      {!hideHeader && (
        <header className="h-16 shrink-0 bg-panel backdrop-blur-xl border-b border-main flex items-center justify-between px-6 z-40 relative">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-black tracking-tight text-main uppercase">Operations <span className="text-brand-primary">Insights</span></h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshInsights()}
              disabled={isCalculating || isRefetching}
              className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors ${isCalculating || isRefetching ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh Data"
            >
              <Repeat className={`w-4 h-4 text-slate-400 ${isCalculating || isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </header>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto md:overflow-visible p-4 relative flex flex-col gap-4">


        {/* Background Grid */}
        <style>{`
          .insights-grid-bg {
            background-image: radial-gradient(circle at 1px 1px, #334155 1px, transparent 0);
            background-size: 24px 24px;
          }
        `}</style>
        <div className="absolute inset-0 pointer-events-none opacity-20 insights-grid-bg" />

        {/* 1. TOP ROW: KPI DECK (Exact Order 1-9) */}
        <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3 shrink-0 z-[60] relative">
          {(!summary || isCalculating) ? (
            Array(9).fill(0).map((_, i) => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />)
          ) : (
            metrics.map((m, i) => (
              <UniformKpiCard
                key={m.id}
                label={m.label}
                value={m.value}
                unit={m.unit}
                icon={m.icon}
                color={m.color}
                delay={i * 0.05}
                tooltip={m.tooltip}
              />
            ))
          )}
        </div>

        {/* 2. SPLIT VIEW: MAP (Left) | HEALTH & ALERTS (Right) */}
        <div className="flex-1 min-h-[500px] md:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 z-10 relative">

          {/* Loading Overlay for Map/Stats */}
          {isCalculating && (
            <div className="absolute inset-0 z-[500] bg-main/50 backdrop-blur-sm flex items-center justify-center rounded-2xl border border-main">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-indigo-400 animate-pulse">Syncing Cloud Metrics...</span>
              </div>
            </div>
          )}

          {/* LEFT: MAP - Dominant View */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="lg:col-span-8 bg-panel border border-main rounded-2xl overflow-hidden shadow-2xl relative h-full flex flex-col min-h-[400px]"
          >
            <ReachCommandMap
              companyLocation={settings?.modules?.map?.defaultCenter || null}
              companyName={currentCompany?.name}
              branches={activeBranches}
              country={settings?.common?.general?.country || 'Saudi Arabia'}
            />
          </motion.div>

          {/* RIGHT: HEALTH & ALERTS SIDEBAR */}
          <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar h-full bg-panel/30 border border-main rounded-2xl p-4 glass-panel">

            {/* SECTION A: ROUTE HEALTH CHECK */}
            <div className="shrink-0">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-black text-main uppercase tracking-wider">Route Health Check</h3>
              </div>

              {(!summary || isCalculating) ? (
                <div className="h-40 w-full bg-white/5 animate-pulse rounded-xl" />
              ) : (
                <HealthMonitor
                  data={summary?.routeHealth || { stable: 0, under: 0, over: 0, total: 0, details: [] }}
                  settings={insightsSettings}
                />
              )}
            </div>

            {/* SECTION B: DATA ALERTS */}
            <div className="shrink-0 pt-2">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-black text-main uppercase tracking-wider">Data Alerts</h3>
              </div>

              <div className="flex flex-col gap-2">
                {((alerts.missingGps || 0) === 0 && (alerts.proximityIssues || 0) === 0) ? (
                  <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
                    <div className="p-1 rounded-full bg-emerald-500/20"><Activity className="w-4 h-4 text-emerald-500" /></div>
                    <span className="text-[10px] text-emerald-400 font-medium">No critical alerts detected.</span>
                  </div>
                ) : (
                  <>
                    {alerts.missingGps > 0 && (
                      <RedFlagCard
                        title="Missing GPS"
                        value={formatNum(alerts.missingGps || 0)}
                        icon={AlertOctagon}
                        type="critical"
                        size="compact"
                        tooltip="Vehicles with no GPS signal"
                      />
                    )}
                    {alerts.proximityIssues > 0 && (
                      <RedFlagCard
                        title="Proximity Issues"
                        value={formatNum(alerts.proximityIssues || 0)}
                        icon={Target}
                        type="warning"
                        size="compact"
                        tooltip={`Customers within ${insightsSettings?.nearbyRadiusMeters || 100}m of branch`}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

const InsightsDashboard = (props: InsightsDashboardProps) => (
  <ErrorBoundary>
    <InsightsDashboardContent {...props} />
  </ErrorBoundary>
);

export default InsightsDashboard;
