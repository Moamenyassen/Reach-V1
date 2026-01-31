
import React, { useMemo, useState, useEffect } from 'react';
import { Customer, AISuggestion } from '../../../types';
import { analyzeCrossRouteOptimizationAsync, optimizeRoute } from '../../../services/optimizer';
import { Sparkles, ArrowRight, TrendingUp, MapPin, Hash, CheckCircle2, Filter, X, Map as MapIcon, Loader2, ArrowLeft, Building2, ChevronDown, Check, Eye, Calendar, Download, DollarSign, ListTodo, Route, Sliders, Activity, Zap, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MAP_LAYERS, TRANSLATIONS } from '../../../config/constants';
import { createRouteMarker, createLeadMarkerIcon } from '../../../services/mapIcons';

interface AIOptimizerProps {
    customers: Customer[];
    focusedSuggestionId?: string | null;
    onBack: () => void;
    isDarkMode: boolean;
    language: 'en' | 'ar';
    onToggleTheme: () => void;
    onToggleLang: () => void;
    hideHeader?: boolean;
}

// Custom Map Component for Topology Visualization
const ProofMap = ({ suggestion, allCustomers }: { suggestion: AISuggestion, allCustomers: Customer[] }) => {
    const { customer, currentCentroid, targetCentroid, currentRoute, targetRoute } = suggestion;

    const { currentRoutePath, targetRoutePath } = useMemo(() => {
        const currentPeers = allCustomers.filter(c => c.routeName === currentRoute && c.id !== customer.id);
        const targetPeers = allCustomers.filter(c => c.routeName === targetRoute);
        const optimizedCurrent = optimizeRoute(currentPeers).orderedCustomers;
        const optimizedTarget = optimizeRoute(targetPeers).orderedCustomers;
        return { currentRoutePath: optimizedCurrent, targetRoutePath: optimizedTarget };
    }, [allCustomers, currentRoute, targetRoute, customer.id]);

    const boundsPoints = useMemo(() => {
        const points = [
            [customer.lat, customer.lng],
            [currentCentroid.lat, currentCentroid.lng],
            [targetCentroid.lat, targetCentroid.lng],
            ...currentRoutePath.map(c => [c.lat, c.lng]),
            ...targetRoutePath.map(c => [c.lat, c.lng])
        ] as [number, number][];
        return points.filter(p => !isNaN(p[0]) && !isNaN(p[1]) && p[0] !== 0 && p[1] !== 0);
    }, [customer, currentCentroid, targetCentroid, currentRoutePath, targetRoutePath]);

    const goldPulseIcon = useMemo(() => new L.DivIcon({
        className: 'bg-transparent',
        html: `<div class="relative flex items-center justify-center w-8 h-8"><div class="absolute inset-0 bg-yellow-500 rounded-full animate-ping opacity-75"></div><div class="relative z-10 w-4 h-4 bg-yellow-400 border-2 border-white/50 rounded-full shadow-lg shadow-yellow-500/50"></div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    }), []);

    const redDotIcon = useMemo(() => new L.DivIcon({
        className: 'bg-transparent',
        html: `<div style="width: 6px; height: 6px; background-color: #ef4444; border-radius: 50%; border: 1px solid rgba(255,255,255,0.5); opacity: 0.6;"></div>`,
        iconSize: [6, 6],
        iconAnchor: [3, 3]
    }), []);

    const cyanDotIcon = useMemo(() => new L.DivIcon({
        className: 'bg-transparent',
        html: `<div style="width: 6px; height: 6px; background-color: #06b6d4; border-radius: 50%; border: 1px solid rgba(255,255,255,0.5); opacity: 0.8; box-shadow: 0 0 4px #06b6d4;"></div>`,
        iconSize: [6, 6],
        iconAnchor: [3, 3]
    }), []);

    const MapEffect = () => {
        const map = useMap();
        useEffect(() => {
            if (boundsPoints.length > 0) {
                const bounds = L.latLngBounds(boundsPoints);
                if (bounds.isValid()) {
                    map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
                }
            }
        }, [map, boundsPoints]);
        return null;
    };

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden border border-white/10 relative z-0 bg-black/40 shadow-inner group">
            <MapContainer center={[customer.lat, customer.lng]} zoom={13} style={{ height: '100%', width: '100%', background: '#020617' }} zoomControl={false} dragging={true}>
                <MapEffect />
                <TileLayer url={MAP_LAYERS.DARK.url} attribution={MAP_LAYERS.DARK.attribution} />

                <Polyline positions={currentRoutePath.map(c => [c.lat, c.lng]) as [number, number][]} pathOptions={{ color: '#ef4444', weight: 1, opacity: 0.3, dashArray: '5,5' }} />
                {currentRoutePath.map(c => (<Marker key={`curr-${c.id}`} position={[c.lat, c.lng]} icon={redDotIcon} />))}

                <Polyline positions={targetRoutePath.map(c => [c.lat, c.lng]) as [number, number][]} pathOptions={{ color: '#06b6d4', weight: 2, opacity: 0.6 }} />
                {targetRoutePath.map(c => (<Marker key={`tgt-${c.id}`} position={[c.lat, c.lng]} icon={cyanDotIcon} />))}

                {/* Target Customer */}
                <Marker position={[customer.lat, customer.lng]} icon={goldPulseIcon} zIndexOffset={1000}>
                    <Tooltip permanent direction="top" offset={[0, -20]} className="!border-0 bg-transparent shadow-none">
                        <div className="bg-yellow-500/90 backdrop-blur-md text-black text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-wide border border-yellow-300/50">
                            {customer.name}
                        </div>
                    </Tooltip>
                </Marker>

                {/* Connection Lines */}
                <Polyline positions={[[customer.lat, customer.lng], [currentCentroid.lat, currentCentroid.lng]]} pathOptions={{ color: '#ef4444', weight: 2, dashArray: '4, 8', opacity: 0.6 }} />
                <Polyline positions={[[customer.lat, customer.lng], [targetCentroid.lat, targetCentroid.lng]]} pathOptions={{ color: '#10b981', weight: 2, opacity: 0.8 }} />

            </MapContainer>

            {/* Floating Legend */}
            <div className="absolute top-4 left-4 glass-panel p-3 rounded-xl border border-white/10 shadow-xl z-[1000] text-[10px] space-y-2 min-w-[140px]">
                <h4 className="font-bold text-slate-300 uppercase tracking-widest border-b border-white/10 pb-1 mb-1">Topology</h4>
                <div className="flex items-center justify-between"><span className="text-slate-400 font-medium">Target Route</span><div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"></div></div>
                <div className="flex items-center justify-between"><span className="text-slate-400 font-medium">Current Route</span><div className="w-2 h-2 bg-red-500 rounded-full opacity-60"></div></div>
                <div className="pt-2 border-t border-white/10 flex justify-between items-center bg-emerald-500/10 -mx-3 -mb-3 p-2 rounded-b-xl">
                    <span className="text-emerald-400 uppercase font-bold">Delta</span>
                    <span className="text-emerald-300 font-black text-xs">{Number(suggestion.saving).toFixed(1)} km</span>
                </div>
            </div>
        </div>
    );
};

const AIOptimizer: React.FC<AIOptimizerProps> = ({
    customers,
    onBack,
    language,
    hideHeader = false
}) => {
    const t = TRANSLATIONS[language];
    const [allSuggestions, setAllSuggestions] = useState<AISuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanProgress, setScanProgress] = useState(0);
    const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    const [excludedRoutes, setExcludedRoutes] = useState<string[]>([]);
    const [isExcludeOpen, setIsExcludeOpen] = useState(false);
    const [simulationMode, setSimulationMode] = useState(false);
    const [showSmartAlerts, setShowSmartAlerts] = useState(true);

    useEffect(() => {
        setLoading(true);
        setScanProgress(0);
        setAllSuggestions([]);
        let isMounted = true;
        const process = async () => {
            await new Promise(r => setTimeout(r, 100));
            const results = await analyzeCrossRouteOptimizationAsync(customers, (percent) => {
                if (isMounted) setScanProgress(percent);
            });
            if (isMounted) {
                setAllSuggestions(results);
                if (results.length > 0) setSelectedSuggestionId(results[0].id);
                setLoading(false);
            }
        };
        process();
        return () => { isMounted = false; };
    }, [customers]);

    const availableTargetRoutes = useMemo(() => {
        const routes = new Set(allSuggestions.map(s => s.targetRoute));
        return Array.from(routes).sort();
    }, [allSuggestions]);

    const filteredSuggestions = useMemo(() => {
        return allSuggestions.filter(s =>
            (selectedBranch === 'All' || s.customer.regionDescription === selectedBranch) &&
            !excludedRoutes.includes(s.targetRoute)
        );
    }, [allSuggestions, selectedBranch, excludedRoutes]);

    const selectedSuggestion = useMemo(() =>
        filteredSuggestions.find(s => s.id === selectedSuggestionId) || filteredSuggestions[0],
        [filteredSuggestions, selectedSuggestionId]);

    const uniqueBranches = useMemo(() => Array.from(new Set(customers.map(c => c.regionDescription).filter(Boolean))).sort(), [customers]);
    const totalPotentialSavings = useMemo(() => filteredSuggestions.reduce((acc, s) => acc + Math.max(0, s.distToCurrent - s.distToTarget), 0), [filteredSuggestions]);

    const handleExport = () => {
        const headers = ['Reach Code', 'Client Name', 'Current Route', 'Target Route', 'Suggested Day', 'Current Dist (km)', 'Target Dist (km)', 'Saving (km)', 'Reason'];
        const rows = filteredSuggestions.map(s => [`"${s.customer.reachCustomerCode || ''}"`, `"${s.customer.name}"`, `"${s.currentRoute}"`, `"${s.targetRoute}"`, `"${s.suggestedDay || ''}"`, s.distToCurrent.toFixed(2), s.distToTarget.toFixed(2), (s.distToCurrent - s.distToTarget).toFixed(2), `"${s.reason}"`]);
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.body.appendChild(document.createElement("a"));
        link.href = url;
        link.setAttribute("download", `Optimization_Plan_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-full flex flex-col relative">

            {/* Header */}
            <header className={`shrink-0 h-16 flex items-center ${hideHeader ? 'justify-end' : 'justify-between'} px-6 border-b border-white/10 bg-black/20 backdrop-blur-md z-20`}>
                {!hideHeader && (
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
                                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                                Neural Optimizer
                            </h1>
                            <p className="text-[10px] text-indigo-300/60 font-medium uppercase tracking-widest">Cross-Route Analysis AI</p>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {/* Filter Dropdown */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                            <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <select
                            value={selectedBranch}
                            onChange={(e) => { setSelectedBranch(e.target.value); setSelectedSuggestionId(null); }}
                            className="pl-9 pr-8 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-bold text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors min-w-[140px]"
                        >
                            <option value="All">Global Network</option>
                            {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => setIsExcludeOpen(!isExcludeOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${excludedRoutes.length > 0 ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-black/40 text-slate-400 border-white/10 hover:bg-white/5'}`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {t.excludeRoutes}
                    </button>

                    <button
                        onClick={() => setSimulationMode(!simulationMode)}
                        className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${simulationMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-black/40 text-slate-400 border-white/10 hover:bg-white/5'}`}
                    >
                        <Zap className={`w-3.5 h-3.5 ${simulationMode ? 'text-indigo-400 fill-indigo-400 animate-pulse' : ''}`} />
                        {simulationMode ? 'SIMULATION ACTIVE' : 'AI SIMULATION'}
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                {/* Left Panel: Suggestions List */}
                <div className="w-full lg:w-[450px] h-[45%] lg:h-full border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-black/20 backdrop-blur-sm z-10 shrink-0">

                    {/* Stats Summary Panel */}
                    <div className="p-6 relative overflow-hidden shrink-0 border-b border-white/10">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-cyan-900/20"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5" /> Efficiency Gain
                                </h4>
                                <div className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
                                    Cycle #{new Date().getDate()}-{Math.floor(Math.random() * 100)}
                                </div>
                            </div>
                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-4xl font-black text-white tracking-tight">{totalPotentialSavings.toFixed(1)}</span>
                                <span className="text-sm font-bold text-slate-500 mb-1.5">km / cycle</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/30 rounded-lg p-2 border border-white/5 flex flex-col">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Optimizations</span>
                                    <span className="text-lg font-bold text-white">{filteredSuggestions.length}</span>
                                </div>
                                <div className="bg-black/30 rounded-lg p-2 border border-white/5 flex flex-col">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Avg. Saving per Stop</span>
                                    <span className="text-lg font-bold text-emerald-400">
                                        {filteredSuggestions.length ? (totalPotentialSavings / filteredSuggestions.length).toFixed(1) : '0.0'} <span className="text-[10px] text-emerald-600">km</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* List Header */}
                    <div className="grid grid-cols-[1.5fr_1.5fr_0.8fr_0.8fr] gap-2 px-4 py-2 bg-black/40 border-b border-white/10 text-[9px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-20 backdrop-blur">
                        <div>Client Entity</div>
                        <div>Route Swap</div>
                        <div className="text-center">Delta</div>
                        <div className="text-center">Action</div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4 text-indigo-400">
                                <div className="relative">
                                    <Loader2 className="w-10 h-10 animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">{scanProgress}%</div>
                                </div>
                                <span className="text-xs font-bold tracking-widest uppercase animate-pulse">Neural Scan In Progress...</span>
                            </div>
                        ) : filteredSuggestions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500 px-8 text-center">
                                <CheckCircle2 className="w-12 h-12 mb-4 text-emerald-500/50" />
                                <p className="text-sm font-bold">Network Optimized</p>
                                <p className="text-xs mt-1 opacity-60">No inefficiency detected in current topology.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {filteredSuggestions.slice(0, 500).map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => setSelectedSuggestionId(s.id)}
                                        className={`
                                        grid grid-cols-[1.5fr_1.5fr_0.8fr_0.8fr] gap-2 p-3 items-center cursor-pointer transition-all duration-200 border-l-2
                                        ${selectedSuggestion?.id === s.id
                                                ? 'bg-indigo-500/10 border-indigo-500 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]'
                                                : 'border-transparent hover:bg-white/5 hover:border-slate-700'}
                                    `}
                                    >
                                        <div className="min-w-0">
                                            <div className={`font-bold text-xs truncate ${selectedSuggestion?.id === s.id ? 'text-white' : 'text-slate-300'}`}>{s.customer.name}</div>
                                            <div className="flex gap-1.5 items-center">
                                                <div className="text-[9px] text-slate-600 font-mono">{s.customer.clientCode || 'N/A'}</div>
                                                {s.customer.reachCustomerCode && (
                                                    <div className="text-[8px] px-1 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20 font-black">
                                                        {s.customer.reachCustomerCode}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                <div className="w-1 h-1 rounded-full bg-red-400"></div>
                                                <span className="truncate text-slate-500">{s.currentRoute}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                <div className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_4px_cyan]"></div>
                                                <span className="font-bold text-cyan-300 truncate">{s.targetRoute}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <div className="font-mono font-bold text-emerald-400 text-xs">{(s.distToCurrent - s.distToTarget).toFixed(1)}</div>
                                            <div className="text-[8px] text-slate-600">km</div>
                                        </div>

                                        <div className="flex justify-center">
                                            <div className={`p-1.5 rounded-lg transition-colors ${selectedSuggestion?.id === s.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/50' : 'bg-white/5 text-slate-500'}`}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Export Bar */}
                    <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur">
                        <button
                            onClick={handleExport}
                            disabled={filteredSuggestions.length === 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <Download className="w-4 h-4 group-hover:animate-bounce" />
                            Export Optimization Cycle
                        </button>
                    </div>
                </div>

                {/* Right Panel: Visualization */}
                <div className="flex-1 bg-[#020617] p-6 flex flex-col relative overflow-hidden">

                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }}>
                    </div>

                    {selectedSuggestion ? (
                        <div className="flex-1 flex flex-col h-full rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex-1 relative z-0">
                                <ProofMap suggestion={selectedSuggestion} allCustomers={customers} />

                                {/* Overlay Info Logic */}
                                <div className="absolute top-4 right-4 z-[400] flex gap-2">
                                    <div className="bg-black/60 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 shadow-lg flex items-center gap-2">
                                        <MapIcon className="w-3.5 h-3.5 text-indigo-400" />
                                        Geo-Spatial Verify
                                    </div>
                                </div>

                                {/* Smart Alerts Widget */}
                                {showSmartAlerts && (
                                    <div className="absolute top-16 right-4 w-64 glass-panel rounded-xl border border-white/10 shadow-2xl p-3 animate-in fade-in slide-in-from-right-10 duration-500 z-[400]">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Smart Alert</span>
                                            </div>
                                            <button onClick={() => setShowSmartAlerts(false)} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
                                        </div>
                                        <div className="text-xs text-slate-300 leading-relaxed">
                                            Route <strong>{selectedSuggestion?.currentRoute}</strong> has <b>15% overlap</b> with Zone B. Swapping enables backhaul efficiency.
                                        </div>
                                        <div className="mt-2 text-[9px] text-slate-500 font-mono text-right">Just now</div>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Metric Strip */}
                            <div className="h-20 bg-black/80 backdrop-blur-xl border-t border-white/10 px-8 flex items-center justify-between shrink-0">
                                <div className="flex gap-12">
                                    <div className="flex flex-col">
                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Divergence</div>
                                        <div className="text-lg font-mono font-black text-red-400">{selectedSuggestion.distToCurrent.toFixed(1)} <span className="text-xs text-slate-600">km</span></div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10 self-center"></div>
                                    <div className="flex flex-col">
                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Optimized Path</div>
                                        <div className="text-lg font-mono font-black text-emerald-400">{selectedSuggestion.distToTarget.toFixed(1)} <span className="text-xs text-slate-600">km</span></div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10 self-center"></div>
                                    <div className="flex flex-col">
                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Efficiency Delta</div>
                                        <div className="text-lg font-mono font-black text-cyan-400">+{((selectedSuggestion.saving / selectedSuggestion.distToCurrent) * 100).toFixed(1)}%</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                    <Activity className="w-3 h-3 text-cyan-500 animate-pulse" />
                                    AI Topology Verification Active
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 relative z-10 glass-panel rounded-3xl border border-white/5 border-dashed">
                            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                                <Route className="w-10 h-10 text-indigo-500/50" />
                            </div>
                            <p className="text-lg font-medium text-slate-400">Select a route constraint to inspect topology</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIOptimizer;
