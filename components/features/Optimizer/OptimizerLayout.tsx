
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Sparkles, Filter, Zap, Settings, Play, MousePointer, Search, AlertTriangle, Activity, Loader2, ArrowRight, Lightbulb, Calendar, Users, Map as MapIcon, Check, ChevronDown, X } from 'lucide-react';
import { fetchOptimizationSuggestions, fetchOptimizationFilters, OptimizationSuggestion } from '../../../services/clientOptimizer';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OptimizerLayoutProps {
    onBack?: () => void;
}

const SuggestionCard = ({ suggestion, index, isSelected, onClick }: {
    suggestion: OptimizationSuggestion;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}) => {
    return (
        <div
            onClick={onClick}
            className={`bg-gray-800/50 border rounded-xl p-4 cursor-pointer transition-all mb-3 relative overflow-hidden group
                  ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-900/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
        >
            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}

            {/* Type Badge */}
            <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md border
                        ${suggestion.type === 'USER_SWAP'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                    {suggestion.type === 'USER_SWAP' ? <Users size={12} /> : <Calendar size={12} />}
                    {suggestion.type === 'USER_SWAP' ? 'User Swap' : 'Day Swap'}
                </span>
                <span className="text-[10px] font-mono text-gray-500 group-hover:text-gray-400">#{index + 1}</span>
            </div>

            {/* Customer Info */}
            <div className="mb-3">
                <div className="text-sm font-bold text-white mb-1 truncate">
                    {suggestion.clientName}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">{suggestion.clientCode || 'N/A'}</span>
                    <span>•</span>
                    <span className="truncate">{suggestion.district}</span>
                </div>
            </div>

            {/* Swap Details */}
            <div className="bg-black/40 rounded-lg p-3 mb-3 border border-white/5">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    <div className="overflow-hidden">
                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">From</div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-300 truncate" title={suggestion.fromUser}>{suggestion.fromUser}</span>
                            <span className="text-[10px] text-gray-500">{suggestion.fromDay}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="w-16 h-px bg-white/10 mb-1 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                        </div>
                        <ArrowRight className="text-blue-500 w-3 h-3" />
                    </div>

                    <div className="overflow-hidden text-right">
                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">To</div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-300 truncate" title={suggestion.toUser}>{suggestion.toUser}</span>
                            <span className="text-[10px] text-gray-500">{suggestion.toDay}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Impact Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                    <div className="text-[9px] text-emerald-400/70 uppercase">Distance</div>
                    <div className="text-sm font-black text-emerald-400">
                        -{suggestion.distanceSaved} <span className="text-[9px]">km</span>
                    </div>
                </div>
                <div className="text-center p-2 rounded bg-blue-500/5 border border-blue-500/10">
                    <div className="text-[9px] text-blue-400/70 uppercase">Time</div>
                    <div className="text-sm font-black text-blue-400">
                        -{suggestion.timeSaved} <span className="text-[9px]">min</span>
                    </div>
                </div>
                <div className="text-center p-2 rounded bg-orange-500/5 border border-orange-500/10">
                    <div className="text-[9px] text-orange-400/70 uppercase">Score</div>
                    <div className="text-sm font-black text-orange-400">
                        {suggestion.impactScore}
                    </div>
                </div>
            </div>

            {/* Reason */}
            <div className="text-[10px] text-gray-400 bg-white/5 rounded px-2.5 py-2 flex items-start gap-2 leading-relaxed">
                <Lightbulb size={12} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>{suggestion.reason}</span>
            </div>
        </div>
    );
};

// Map Controller to handle Bounds
const MapBoundsController = ({ points }: { points: [number, number][] }) => {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            try {
                const bounds = L.latLngBounds(points);
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            } catch (e) {
                console.error("Error setting bounds:", e);
            }
        } else {
            // Default to Saudi Arabia view
            map.setView([23.8859, 45.0792], 5);
        }
    }, [map, points]);
    return null;
};

const OptimizerLayout: React.FC<OptimizerLayoutProps> = ({ onBack }) => {
    const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
    const [stats, setStats] = useState({ distance: 0, time: 0, optimizations: 0 });

    // Filter State
    const [branches, setBranches] = useState<{ code: string; name: string }[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('');

    // Route Filter State
    const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
    const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
    const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);

    const toggleRoute = (route: string) => {
        setSelectedRoutes(prev =>
            prev.includes(route)
                ? prev.filter(r => r !== route)
                : [...prev, route]
        );
    };

    useEffect(() => {
        loadFilters();
        loadData();
    }, []);

    // Reload data when filter changes
    useEffect(() => {
        loadData();
    }, [selectedBranch, selectedRoutes]); // Add selectedRoutes dependency

    const loadFilters = async () => {
        const { branches, routes } = await fetchOptimizationFilters();
        setBranches(branches);
        setAvailableRoutes(routes || []);
    };

    const loadData = async () => {
        setLoading(true);
        // Pass the selected region filter
        const result = await fetchOptimizationSuggestions({
            branch_code: selectedBranch === 'All Branches' ? undefined : selectedBranch,
            routes: selectedRoutes.length > 0 ? selectedRoutes : undefined
        });
        if (result.success) {
            setSuggestions(result.suggestions);
            setStats(result.totalSavings);



            if (result.suggestions.length > 0 && !selectedSuggestionId) {
                // optional auto-select
                // setSelectedSuggestionId(result.suggestions[0].id);
            }
        }
        setLoading(false);
    };

    const selectedSuggestion = suggestions.find(s => s.id === selectedSuggestionId);

    const mapPoints = React.useMemo(() => {
        if (selectedSuggestion) {
            return [[selectedSuggestion.latitude, selectedSuggestion.longitude]] as [number, number][];
        }
        if (suggestions.length > 0) {
            // Filter invalid points
            return suggestions
                .filter(s => s.latitude && s.longitude)
                .map(s => [s.latitude, s.longitude] as [number, number]);
        }
        return [];
    }, [suggestions, selectedSuggestion]);

    return (
        <div className="h-full flex flex-col bg-[#0f111a] text-white">
            {/* Header */}
            <div className="h-16 border-b border-white/10 bg-black/20 flex items-center justify-between px-6 shrink-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    {/* Only show User's intended icon/title - NO Nav Back Button here if part of Layout */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <Zap className="text-indigo-400 w-5 h-5 fill-indigo-400/20" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">Optimizer Engine</h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Route Intelligence AI</p>
                        </div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-8">
                    <div className="text-center">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Potential Savings</div>
                        <div className="text-lg font-black text-emerald-400">{stats.distance} <span className="text-xs text-gray-600">km</span></div>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Time Gain</div>
                        <div className="text-lg font-black text-blue-400">{stats.time} <span className="text-xs text-gray-600">hrs</span></div>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Actions</div>
                        <div className="text-lg font-black text-orange-400">{stats.optimizations}</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <Activity size={18} />
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-900/50 flex items-center gap-2">
                        <Play size={14} fill="currentColor" />
                        Auto-Optimize
                    </button>
                    <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="h-12 border-b border-white/5 bg-black/10 flex items-center px-6 gap-4 shrink-0 z-30 relative">
                <Filter size={14} className="text-gray-500" />
                <select
                    className="bg-transparent text-xs font-medium text-gray-300 outline-none cursor-pointer hover:text-white min-w-[120px]"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    title="Select Branch"
                >
                    <option value="">All Branches</option>
                    {branches.map(b => (
                        <option key={b.code} value={b.code} className="text-black">{b.name}</option>
                    ))}
                </select>
                <div className="w-px h-4 bg-white/10"></div>

                {/* Multi-Select Route Filter */}
                <div className="relative">
                    <button
                        onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)}
                        className={`flex items-center gap-2 text-xs font-medium outline-none transition-colors
                            ${selectedRoutes.length > 0 ? 'text-indigo-400' : 'text-gray-300 hover:text-white'}`}
                    >
                        <span>{selectedRoutes.length > 0 ? `Routes (${selectedRoutes.length})` : 'All Routes'}</span>
                        <ChevronDown size={12} className={`transition-transform duration-200 ${isRouteMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isRouteMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsRouteMenuOpen(false)}
                            />
                            <div className="absolute top-full mt-2 left-0 w-64 max-h-[400px] overflow-y-auto bg-[#171a26] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col">
                                <div className="p-3 border-b border-white/5 bg-black/20 sticky top-0 backdrop-blur-md flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Routes</span>
                                    {selectedRoutes.length > 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedRoutes([]); }}
                                            className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div className="p-2 space-y-1">
                                    {availableRoutes.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-gray-500 italic">No routes found</div>
                                    ) : (
                                        availableRoutes.map(route => {
                                            const isSelected = selectedRoutes.includes(route);
                                            return (
                                                <div
                                                    key={route}
                                                    onClick={(e) => { e.stopPropagation(); toggleRoute(route); }}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group
                                                        ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-white/5 text-gray-300'}`}
                                                >
                                                    <span className="text-xs font-mono">{route}</span>
                                                    {isSelected && <Check size={12} className="text-indigo-400" />}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Areas */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT PANEL (35%) - Suggestions */}
                <div className="w-[35%] border-r border-white/10 flex flex-col bg-black/20 backdrop-blur-sm z-10">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Opportunities <span className="text-gray-600">({suggestions.length})</span>
                        </h2>
                        <div className="flex gap-2">
                            <input placeholder="Search..." className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs w-32 focus:border-indigo-500 outline-none transition-colors" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-indigo-400 gap-3">
                                <Loader2 className="animate-spin w-8 h-8" />
                                <span className="text-xs font-mono animate-pulse">Analyzing Network Topology...</span>
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                <Search className="w-8 h-8 opacity-20" />
                                <span className="text-sm font-medium">No optimizations found</span>
                            </div>
                        ) : (
                            suggestions.map((s, idx) => (
                                <SuggestionCard
                                    key={s.id}
                                    suggestion={s}
                                    index={idx}
                                    isSelected={selectedSuggestionId === s.id}
                                    onClick={() => setSelectedSuggestionId(s.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* CENTER PANEL (40%) - Map */}
                <div className="w-[40%] bg-[#05060a] relative border-r border-white/10">
                    {/* Map Container */}
                    {/* @ts-ignore */}
                    <MapContainer
                        center={[24.7136, 46.6753]}
                        zoom={6}
                        style={{ width: '100%', height: '100%', background: '#05060a' }}
                        zoomControl={false}
                    >
                        {/* @ts-ignore */}
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; OpenStreetMap'
                        />
                        <MapBoundsController points={mapPoints} />

                        {suggestions.map((s) => (
                            // @ts-ignore
                            <Marker
                                key={s.id}
                                position={[s.latitude, s.longitude]}
                                icon={new L.DivIcon({
                                    className: 'bg-transparent',
                                    html: `<div style="width: 12px; height: 12px; background-color: ${s.type === 'USER_SWAP' ? '#f97316' : '#a855f7'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${s.type === 'USER_SWAP' ? 'orange' : 'purple'};"></div>`,
                                    iconSize: [12, 12],
                                    iconAnchor: [6, 6]
                                })}
                                eventHandlers={{
                                    click: () => setSelectedSuggestionId(s.id)
                                }}
                            >
                                {/* @ts-ignore */}
                                <Popup className="custom-popup">
                                    <div className="text-black p-1">
                                        <div className="font-bold">{s.clientName}</div>
                                        <div className="text-xs">{s.clientCode}</div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* Legend Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 z-[1000] flex justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-white/50"></div>
                            <span className="text-[10px] font-bold text-gray-300 uppercase">User Swap</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-white/50"></div>
                            <span className="text-[10px] font-bold text-gray-300 uppercase">Day Swap</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL (25%) - Impact Details */}
                <div className="w-[25%] bg-black/20 backdrop-blur-sm p-6 overflow-y-auto">
                    {selectedSuggestion ? (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Zap className="text-white fill-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Impact Analysis</h3>
                                    <p className="text-[10px] text-indigo-300 truncate w-40">{selectedSuggestion.id}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Score Big */}
                                <div className="text-center bg-white/5 rounded-2xl p-6 border border-white/10 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="text-5xl font-black text-white tracking-tighter mb-1">{selectedSuggestion.impactScore}</div>
                                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Efficiency Score</div>
                                </div>

                                {/* Metrics Breakdown */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="text-xs text-gray-400">Total Distance</div>
                                        <div className="font-mono font-bold text-emerald-400">-{selectedSuggestion.distanceSaved} km</div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <div className="text-xs text-gray-400">Time Recovery</div>
                                        <div className="font-mono font-bold text-blue-400">-{selectedSuggestion.timeSaved} min</div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                        <div className="text-xs text-gray-400">AI Confidence</div>
                                        <div className="font-mono font-bold text-orange-400">{selectedSuggestion.confidence}%</div>
                                    </div>
                                </div>

                                {/* Alert */}
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                                    <AlertTriangle className="text-amber-500 w-5 h-5 shrink-0" />
                                    <div className="text-xs text-amber-200/80 leading-relaxed">
                                        Requires <strong>Manager Approval</strong> for cross-branch optimization adjustments.
                                    </div>
                                </div>

                                {/* Action */}
                                <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-xl flex items-center justify-center gap-2">
                                    Apply Optimization
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <MousePointer size={48} className="text-white mb-4 animate-bounce" />
                            <h3 className="text-lg font-bold text-white mb-2">Select Suggestion</h3>
                            <p className="text-sm text-gray-400 max-w-[200px]">Click on any optimization opportunity to view detailed impact analysis.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OptimizerLayout;
