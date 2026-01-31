import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Customer, User, HistoryLog, UserRole, EfficiencyAnalysis, RouteSummary } from '../../../types';
import { TRANSLATIONS, BRANCHES, SERVICE_TIME_MIN } from '../../../config/constants';
import { supabase } from '../../../services/supabase';
import {
  ChevronDown, ChevronRight, ArrowLeft, Download, Printer, Search, FileText,
  AlertOctagon, Target, X, Users, ArrowUpDown, ArrowUp, ArrowDown, Filter,
  Zap, AlertTriangle, LayoutList, Activity, Sparkles, Loader2, Bot, TrendingUp,
  MapPinOff, MapPin
} from 'lucide-react';

interface SummaryDashboardProps {
  currentUser?: User;
  allCustomers?: Customer[]; // Deprecated/Optional
  uploadHistory?: HistoryLog[];
  onBack: () => void;
  isDarkMode: boolean;
  language: 'en' | 'ar';
  onToggleTheme: () => void;
  onToggleLang: () => void;
  hideHeader?: boolean;
  // Filters passed from parent
  currentFilters?: {
    region?: string;
    route?: string;
    day?: string;
    week?: string;
  }
}

const formatNumber = (num: number) => num.toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function SummaryDashboard({
  onBack,
  isDarkMode,
  language,
  currentFilters,
  currentUser
}: SummaryDashboardProps) {
  const isAr = language === 'ar';

  // Tabs
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'ROUTES'>('CUSTOMERS');

  // Customer Pagination State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Route Stats State
  const [routeStats, setRouteStats] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Initial Data Fetch & Filter Change
  useEffect(() => {
    // Reset on filter change
    setCustomers([]);
    setPage(0);
    setHasMore(true);
    setTotalCount(0);
    loadCustomers(0, true);
    loadRouteStats();
  }, [currentFilters?.region, currentFilters?.route, currentFilters?.day, searchTerm]);

  const loadCustomers = async (pageIndex: number, isReset: boolean = false) => {
    setIsLoading(true);
    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('company_uploaded_data')
        .select('*', { count: 'exact' });

      // Ensure we filter by company if available
      if (currentUser?.companyId) {
        query = query.eq('company_id', currentUser.companyId);
      }

      // Filters
      if (currentFilters?.region && currentFilters.region !== 'All') {
        query = query.eq('branch_name', currentFilters.region);
      }
      if (currentFilters?.route && currentFilters.route !== 'All') {
        query = query.eq('route_name', currentFilters.route);
      }
      if (currentFilters?.day && currentFilters.day !== 'All') {
        query = query.eq('day_name', currentFilters.day);
      }
      if (searchTerm) {
        query = query.ilike('customer_name_en', `%${searchTerm}%`);
      }

      // Order
      query = query.order('customer_name_en', { ascending: true }).range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      if (data) {
        // Map DB types to Customer
        const mapped: Customer[] = data.map((d: any) => ({
          id: d.id,
          name: d.customer_name_en, // Mapped from company_uploaded_data
          lat: d.lat,
          lng: d.lng,
          location: { lat: d.lat, lng: d.lng },
          regionDescription: d.branch_name, // Mapped
          routeName: d.route_name, // Mapped
          day: d.day_name, // Mapped
          clientCode: d.client_code,
          reachCustomerCode: d.client_code, // Fallback
          is_visited: false, // Not available in raw data usually, or computed separately
          phone: d.phone,
          tags: []
        }));

        setCustomers(prev => isReset ? mapped : [...prev, ...mapped]);
        if (count !== null) setTotalCount(count);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadCustomers(nextPage, false);
    }
  };

  const loadRouteStats = async () => {
    setLoadingRoutes(true);
    try {
      // Use the RPC or View
      let query = supabase.from('view_route_performance').select('*');
      // Apply filters if applicable (though View is pre-aggregated, we can filter result)
      // Actually view_route_performance is per route.
      if (currentFilters?.route && currentFilters.route !== 'All') {
        query = query.eq('route_name', currentFilters.route);
      }
      // Region filter not directly in view_route_performance unless we added proper JOINs or cols.
      // The view currently has: route_id, route_name, branch_id...
      // If we need Region filtering for routes, we might need to adjust view.
      // For now, simple fetch.

      const { data, error } = await query;
      if (data) setRouteStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoutes(false);
    }
  };

  return (
    <div className="min-h-screen bg-main flex flex-col font-sans relative z-10">
      {/* Header */}
      {!isDarkMode && (
        <header className="bg-panel/80 backdrop-blur-xl border-b border-main p-6 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-panel rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-2xl font-black text-main flex items-center gap-2"><FileText className="w-6 h-6 text-brand-primary" /> {isAr ? 'البيانات التفصيلية' : 'Detailed Data View'}</h1>
              <p className="text-xs text-muted font-medium">Server-side Paginated 50/page</p>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {/* Tabs */}
          <div className="flex bg-panel border border-main rounded-xl p-1 w-fit">
            <button onClick={() => setActiveTab('CUSTOMERS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'CUSTOMERS' ? 'bg-brand-primary text-white shadow-md' : 'text-muted hover:text-main'}`}>Customers (Paginated)</button>
            <button onClick={() => setActiveTab('ROUTES')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ROUTES' ? 'bg-brand-primary text-white shadow-md' : 'text-muted hover:text-main'}`}>Route Stats</button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-panel border border-main rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
            />
          </div>

          {/* Content */}
          {activeTab === 'CUSTOMERS' && (
            <div className="bg-panel border border-main rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-main/50 text-xs uppercase font-black text-muted border-b border-main">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Region</th>
                      <th className="px-6 py-4">Route</th>
                      <th className="px-6 py-4">Day</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-main">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-main/30 transition-colors">
                        <td className="px-6 py-3 font-bold text-main">{c.name}</td>
                        <td className="px-6 py-3 text-muted">{c.regionDescription || '-'}</td>
                        <td className="px-6 py-3 text-muted">{c.routeName || '-'}</td>
                        <td className="px-6 py-3 text-muted">{c.day || '-'}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase ${c.is_visited ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                            {c.is_visited ? 'Visited' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && !isLoading && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="p-4 flex justify-center border-t border-main">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-6 py-2 bg-main hover:bg-main/80 border border-main rounded-xl text-sm font-bold text-main shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? 'Loading More...' : 'Load More Results'}
                  </button>
                </div>
              )}
              <div className="p-2 text-center text-xs text-muted border-t border-main bg-main/20">
                Showing {customers.length} of {totalCount} records
              </div>
            </div>
          )}

          {activeTab === 'ROUTES' && (
            <div className="bg-panel border border-main rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-main/50 text-xs uppercase font-black text-muted border-b border-main">
                  <tr>
                    <th className="px-6 py-4">Route Name</th>
                    <th className="px-6 py-4 text-center">Review</th>
                    <th className="px-6 py-4 text-center">Total Stops</th>
                    <th className="px-6 py-4 text-center">Visited</th>
                    <th className="px-6 py-4 text-center">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-main">
                  {routeStats.map((r) => (
                    <tr key={r.route_id} className="hover:bg-main/30 transition-colors">
                      <td className="px-6 py-3 font-bold text-main">{r.route_name}</td>
                      <td className="px-6 py-3 text-center">
                        {/* If we had Rep info */}
                        <span className="text-muted">{r.rep_code || '-'}</span>
                      </td>
                      <td className="px-6 py-3 text-center font-mono">{r.total_stops}</td>
                      <td className="px-6 py-3 text-center font-mono">{r.visited_stops}</td>
                      <td className="px-6 py-3 text-center font-mono font-black text-brand-primary">
                        {r.efficiency_score}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
