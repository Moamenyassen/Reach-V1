import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import { Building2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BranchConfig } from '../../../types';

// --- Configuration & Constants ---

// Country Border Definitions
const COUNTRY_BORDERS: Record<string, L.LatLngExpression[]> = {
    'SAUDI ARABIA': [
        [29.45, 34.96], [28.00, 34.60], [26.00, 36.50], [24.50, 37.50], [22.50, 38.90],
        [21.30, 39.10], [20.00, 40.00], [18.00, 41.50], [16.70, 42.50], [16.30, 42.80],
        [16.70, 43.30], [17.30, 43.80], [17.40, 44.50], [17.00, 46.00], [17.20, 48.00],
        [18.00, 50.00], [18.80, 52.00], [19.00, 53.00], [19.50, 55.00], [20.00, 55.60],
        [21.50, 55.50], [22.70, 55.30], [23.00, 54.00], [24.00, 52.00], [24.20, 51.60],
        [24.60, 50.80], [24.80, 50.80], [25.00, 50.50], [25.50, 50.20], [26.00, 50.10],
        [26.60, 50.00], [27.00, 49.50], [28.00, 48.80], [29.00, 48.00], [29.10, 47.00],
        [29.20, 46.00], [30.00, 44.00], [31.00, 42.00], [31.50, 40.00], [32.00, 39.00],
        [31.00, 38.00], [30.00, 37.00], [29.45, 34.96]
    ]
};

// Default Bounds (Fallback)
const DEFAULT_BOUNDS: L.LatLngBoundsExpression = [
    [15.5, 34.0], // Adjusted SW
    [32.5, 56.0]  // Adjusted NE
];

// --- Custom Icons ---

const createBranchIcon = () => {
    return L.divIcon({
        html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-full h-full rounded-full border border-emerald-400/50 opacity-0 animate-pulse-ring"></div>
        <div class="absolute w-full h-full rounded-lg bg-emerald-500/10 border border-emerald-500/30"></div>
        <div class="relative z-10 p-1.5 bg-[#020617] rounded-md border border-emerald-400/50 shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                <path d="M2 7h20"/>
                <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
             </svg>
        </div>
      </div>
    `,
        className: 'branch-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
};


// --- Map Controller Sub-component ---

const MapController = ({ activeBranchId, companyLocation, targetBounds, onReset, onMapReady }: { activeBranchId: string | null, companyLocation?: [number, number] | null, targetBounds: L.LatLngExpression[] | null, onReset: () => void, onMapReady: (map: L.Map) => void }) => {
    const map = useMap();

    // Capture map instance on mount and handle resize
    useEffect(() => {
        onMapReady(map);

        // Critical: Invalidate size to handle grid layout changes, then fit bounds
        const timer = setTimeout(() => {
            map.invalidateSize();
            if (targetBounds && targetBounds.length > 0) {
                map.fitBounds(L.polygon(targetBounds).getBounds(), { padding: [20, 20], maxZoom: 6, animate: false });
            } else if (companyLocation) {
                map.setView(companyLocation, 6, { animate: false });
            } else {
                map.fitBounds(DEFAULT_BOUNDS, { padding: [20, 20], maxZoom: 6, animate: false });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [map, onMapReady, companyLocation, targetBounds]);


    // Handle Reset on Background Click - Always trigger reset to default bounds
    useMapEvents({
        click: (e) => {
            // If clicking map background (not a feature)
            onReset();
            // Return to company location or Border View
            if (companyLocation) {
                map.flyTo(companyLocation, 12, { duration: 1.2 });
            } else if (targetBounds && targetBounds.length > 0) {
                map.flyToBounds(L.polygon(targetBounds).getBounds(), { padding: [20, 20], duration: 1.2, animate: true });
            }
        }
    });

    return null;
};

// --- Main Component ---

interface ReachCommandMapProps {
    companyLocation?: [number, number] | null;
    companyName?: string;
    branches?: BranchConfig[];
    country?: string;
}

const ReachCommandMap: React.FC<ReachCommandMapProps> = ({ companyLocation, companyName, branches = [], country = 'Saudi Arabia' }) => {
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

    // Determine Country Border
    const activeBorder = React.useMemo(() => {
        const normalizedCountry = country?.trim().toUpperCase() || 'SAUDI ARABIA';
        // Fuzzy match or direct lookup
        const key = Object.keys(COUNTRY_BORDERS).find(k => normalizedCountry.includes(k)) || 'SAUDI ARABIA';
        return COUNTRY_BORDERS[key];
    }, [country]);


    const handleBranchClick = (id: string, e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e); // Prevent map click
        if (activeBranchId === id) {
            // Toggle off
            setActiveBranchId(null);
        } else {
            setActiveBranchId(id);
        }
    };

    const handleReset = () => {
        setActiveBranchId(null);
    };

    const handleAutoFocus = () => {
        if (mapInstance) {
            setActiveBranchId(null);
            if (companyLocation) {
                mapInstance.flyTo(companyLocation, 12, { duration: 1.5 });
            } else if (activeBorder && activeBorder.length > 0) {
                mapInstance.flyToBounds(L.polygon(activeBorder).getBounds(), { padding: [20, 20], maxZoom: 6, duration: 1.5 });
            }
        }
    };

    return (
        <div className="relative w-full h-full bg-[#020617] overflow-hidden rounded-3xl border border-white/10 shadow-2xl group">

            {/* Styles for Pulse Ring and Border Glow */}
            <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.5); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .border-glow {
          filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.6));
        }
      `}</style>

            {/* Map Header Overlay */}
            <div className="absolute top-6 left-6 z-[400] pointer-events-none">
                <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm drop-shadow-md">
                    Strategic Map <span className="text-cyan-400">/// Live</span>
                </h3>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                    {companyLocation ? `HQ: ${companyName || 'MAIN OFFSET'}` : `VIEW: ${country?.toUpperCase() || 'REGIONAL OVERVIEW'}`}
                </p>
            </div>

            {/* Auto-Focus Button */}
            <button
                onClick={handleAutoFocus}
                className="absolute top-6 right-6 z-[400] flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 backdrop-blur-md border border-cyan-400/30 hover:border-cyan-400/60 rounded-lg transition-all duration-300 group/btn shadow-lg hover:shadow-cyan-500/20"
                title={companyLocation ? "Return to HQ" : `Auto-focus on ${country}`}
            >
                <svg className="w-4 h-4 text-cyan-400 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    <circle cx="11" cy="11" r="3" strokeWidth={2} />
                </svg>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Auto Focus</span>
            </button>

            <MapContainer
                {...({
                    center: [24.0, 45.0],
                    zoom: 6, // Start closer to KSA
                    zoomControl: false, // Custom controls
                    scrollWheelZoom: true,
                    doubleClickZoom: true
                } as any)}
                style={{ width: '100%', height: '100%', background: '#020617' }}
            >
                {/* Dark Matter Tiles */}
                <TileLayer
                    {...({ attribution: '&copy; <a href="https://www.carto.com/">CARTO</a>', url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" } as any)}
                />

                {/* Operational Border - Enhanced Visibility */}
                {activeBorder && (
                    <Polygon
                        {...({
                            positions: activeBorder,
                            pathOptions: {
                                color: '#06b6d4',
                                weight: 3,
                                fillColor: '#06b6d4',
                                fillOpacity: 0.12,
                                opacity: 1,
                                className: 'border-glow'
                            }
                        } as any)}
                    />
                )}

                {/* Logic Controller that handles Bounds Updates */}
                <MapController
                    activeBranchId={activeBranchId}
                    companyLocation={companyLocation}
                    targetBounds={activeBorder} // Focus on country by default
                    onReset={handleReset}
                    onMapReady={setMapInstance}
                />


                {/* Configured Company Branches */}
                {branches.map((branch, idx) => {
                    if (!branch.isActive || !branch.coordinates) return null;

                    return (
                        <Marker
                            key={`configured-branch-${idx}`}
                            {...({
                                position: [branch.coordinates.lat, branch.coordinates.lng],
                                icon: createBranchIcon(),
                                zIndexOffset: 900
                            } as any)}
                        >
                            <Tooltip
                                {...({
                                    direction: "top",
                                    offset: [0, -16],
                                    opacity: 1,
                                    className: "custom-leaflet-tooltip"
                                } as any)}
                            >
                                <div className="bg-[#050914]/95 backdrop-blur-xl border border-emerald-500/30 p-0 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden min-w-[150px]">
                                    {/* Header with Gradient */}
                                    <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-600/20 px-4 py-3 border-b border-emerald-500/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="block text-xs font-black text-white uppercase tracking-[0.15em]">{branch.name}</span>
                                        </div>
                                    </div>
                                    {/* Simplified Footer Decor */}
                                    <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Footer / Status */}
            <div className="absolute bottom-4 right-4 z-[400] flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-[10px] font-mono text-cyan-200/80">CONN: SECURE</span>
            </div>
        </div>
    );
};

export default React.memo(ReachCommandMap);
