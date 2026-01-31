import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, ScaleControl, ZoomControl } from 'react-leaflet';
import { Sun, Moon, Globe, Layers, Map as MapIcon, Focus, Filter, RotateCcw, PieChart as PieIcon, BarChart as BarIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMapEvents } from 'react-leaflet';
import { Customer } from '../types';
import { supabase } from '../services/supabase';

// --- Marker & Popup Styling ---
// Premium aesthetics: Pulsing animations, gradients, glassmorphism, and magic button
const MARKER_STYLES = `
  @keyframes pulse-ring {
    0% { transform: scale(0.33); opacity: 1; }
    80%, 100% { transform: scale(2); opacity: 0; }
  }
  @keyframes pulse-bounce {
    0% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
    100% { transform: translateY(0); }
  }

  .premium-pin-container {
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .premium-pin-container:hover {
    z-index: 900 !important;
    transform: translateY(-4px) scale(1.1); 
    filter: drop-shadow(0 10px 10px rgba(0,0,0,0.4));
  }

  /* Selected state */
  .premium-pin-container.selected {
    z-index: 1000 !important;
    /* No scale transform here to avoid conflict with Leaflet positioning, handle in SVG or inner */
    /* Actually we can transform, but Leaflet moves the container */
  }
  
  .premium-pin-container.selected svg {
    animation: pulse-bounce 1.5s infinite ease-in-out;
  }
  
  .premium-pin-container.selected::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 20px;
    height: 10px;
    background: rgba(0,0,0,0.2);
    border-radius: 50%;
    transform: translateX(-50%) scale(0);
    animation: shadow-pulse 1.5s infinite ease-in-out;
    z-index: -1;
  }
  
  /* Number styling */
  .premium-pin-label {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 34px; /* Height of the head part roughly */
    display: flex;
    align-items: center;
    justify-content: center;
    color: white; /* Will be overridden by dynamic text color if needed, but white on colored pin is good */
    font-weight: 800;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    pointer-events: none;
  }
  

  .leaflet-popup-content-wrapper {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
    padding: 0;
    overflow: hidden;
  }
  .leaflet-popup-tip {
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  .leaflet-popup-content {
    margin: 0 !important;
    width: 280px !important;
  }
  .leaflet-container a.leaflet-popup-close-button {
    color: #9ca3af;
    top: 12px;
    right: 12px;
    font-size: 18px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  .leaflet-container a.leaflet-popup-close-button:hover {
    background: #f3f4f6;
    color: #374151;
  }
  /* Magic View Mode Button */
  .magic-map-btn {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: #4f46e5;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
  }
  .magic-map-btn:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 20px 25px -5px rgba(79, 70, 229, 0.15), 0 10px 10px -5px rgba(79, 70, 229, 0.1);
    background: white;
    color: #4338ca;
  }
  .magic-map-btn:active {
    transform: scale(0.95);
  }
`;

// ... (Rest of styles and icons same) ...

const DAY_COLORS: Record<string, string> = {
  'Monday': '#3B82F6', // Blue
  'Tuesday': '#10B981', // Emerald
  'Wednesday': '#8B5CF6', // Violet
  'Thursday': '#F59E0B', // Amber
  'Friday': '#EF4444', // Red
  'Saturday': '#EC4899', // Pink
  'Sunday': '#6366F1', // Indigo
};

// Default fallback color
const DEFAULT_COLOR = '#4f46e5';

// Helper to create depot/branch icon (Building Shape)
const createDepotIcon = (isSelected: boolean, color: string) => {
  const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="buildingGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stop-color="#374151"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
        <filter id="shadow" x="-2" y="-2" width="28" height="28" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path d="M3 21V8L12 2L21 8V21H3Z" fill="url(#buildingGradient)" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M9 10V14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M15 10V14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M9 21V17H15V21" fill="#4B5563"/>
      </g>
    </svg>
  `;

  return L.divIcon({
    className: `premium-pin-container ${isSelected ? 'selected' : ''}`,
    html: svgIcon,
    iconSize: [40, 40],
    iconAnchor: [20, 20], // Center
    popupAnchor: [0, -20]
  });
};

// Helper to create numbered icons with dynamic colors
const createNumberedIcon = (number: number, isSelected: boolean, color: string) => {
  // SVG Pin Shape (Modern "Map Marker")
  const svgIcon = `
    <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Pin Body with Gradient -->
      <path d="M18 0C8.05888 0 0 8.05888 0 18C0 29.5 16.5 45 18 46C19.5 45 36 29.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="${color}"/>
      <path d="M18 0C8.05888 0 0 8.05888 0 18C0 29.5 16.5 45 18 46C19.5 45 36 29.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="url(#gloss-${number})" fill-opacity="0.2"/>
      
      <!-- Inner White Circle for Contrast -->
      <circle cx="18" cy="18" r="14" fill="white" fill-opacity="0.2"/>
      <circle cx="18" cy="18" r="12" fill="white"/>

      <!-- Gloss Gradient Definition -->
      <defs>
        <linearGradient id="gloss-${number}" x1="0" y1="0" x2="36" y2="46" gradientUnits="userSpaceOnUse">
          <stop stop-color="white" stop-opacity="0.5"/>
          <stop offset="0.5" stop-color="white" stop-opacity="0"/>
          <stop offset="1" stop-color="black" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
    </svg>
    <div class="premium-pin-label" style="color: ${color};">
      ${number}
    </div>
  `;

  return L.divIcon({
    className: `premium-pin-container ${isSelected ? 'selected' : ''}`,
    html: svgIcon,
    iconSize: [36, 46],
    iconAnchor: [18, 46], // Bottom tip
    popupAnchor: [0, -42]
  });
};

// --- Helper Components ---

// Component to fit bounds
const FitBounds = ({ markers }: { markers: Customer[] }) => {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      // Vital: Ensure map knows its true size (fixes centering if container resized)
      map.invalidateSize();

      const valid = markers.filter(m => m.lat && m.lng);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(m => [m.lat, m.lng]));
        // Use RAF to ensure DOM is ready
        requestAnimationFrame(() => {
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
        });
      }
    }
  }, [markers, map]);

  return null;
};

// Component for Auto Focus Button
const AutoFocusControl = ({ markers }: { markers: Customer[] }) => {
  const map = useMap();

  const handleFocus = () => {
    if (markers.length > 0) {
      const valid = markers.filter(m => m.lat && m.lng);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(m => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
      }
    }
  };

  return (
    <div className="absolute top-20 left-4 z-[1000]">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleFocus();
        }}
        className="magic-map-btn"
        title="Auto Focus on Route"
      >
        <Focus size={20} />
      </button>
    </div>
  );

};

// --- Viewport Fetcher ---
const ViewportFetcher = ({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) => {
  const map = useMap();
  useEffect(() => {
    // Initial fetch
    onBoundsChange(map.getBounds());
  }, [map]);

  useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
  });
  return null;
};

// --- Main Component ---

interface MapVisualizerProps {
  route: Customer[];
  selectedCustomerId?: string | null;
  focusedSuggestion?: any;
  highlightedSegment?: { fromId: string, toId: string } | null;
  coloringMode?: string;
  suggestionIds?: string[];
  isDarkMode?: boolean;
  settings?: any;
  branches?: any[]; // Loose type for now or import BranchConfig
}

type MapTheme = 'street' | 'satellite' | 'dark' | 'light';

const MapVisualizer: React.FC<MapVisualizerProps> = ({
  route,
  selectedCustomerId,
  focusedSuggestion,
  settings,
  branches
}) => {

  const [currentTheme, setCurrentTheme] = useState<MapTheme>('street');

  // Cycle: Street -> Satellite -> Dark -> Light -> Street
  const toggleTheme = () => {
    setCurrentTheme(prev => {
      if (prev === 'street') return 'satellite';
      if (prev === 'satellite') return 'dark';
      if (prev === 'dark') return 'light';
      return 'street';
    });
  };


  // --- Viewport Fetching Logic ---
  const [viewportPoints, setViewportPoints] = useState<Customer[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // If route is empty, we assume "Explorer Mode" and fetch based on viewport
  const isExplorerMode = (!route || route.length === 0);

  const handleBoundsChange = async (bounds: L.LatLngBounds) => {
    if (!isExplorerMode) return; // Don't auto-fetch if showing a specific route

    setLoadingPoints(true);
    try {
      const { data, error } = await supabase.rpc('get_map_points', {
        min_lat: bounds.getSouth(),
        min_lng: bounds.getWest(),
        max_lat: bounds.getNorth(),
        max_lng: bounds.getEast()
      });

      if (error) {
        console.error("Map Fetch Error:", error);
      } else if (data) {
        // Map RPC result to Customer type (partial)
        const mapped: Customer[] = data.map((d: any) => ({
          id: d.id,
          lat: d.lat,
          lng: d.lng,
          name: d.name || 'Unknown',
          status: d.status,
          // Defaults for missing fields
          location: { lat: d.lat, lng: d.lng },
          is_visited: d.status === 'visited'
        }));
        setViewportPoints(mapped);
      }
    } catch (err) {
      console.error("Map Fetch Exception:", err);
    } finally {
      setLoadingPoints(false);
    }
  };

  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'street': return <MapIcon size={20} />;
      case 'satellite': return <Globe size={20} />;
      case 'dark': return <Moon size={20} />;
      case 'light': return <Sun size={20} />;
    }
  };

  const displayMarkers = useMemo(() => {
    if (focusedSuggestion) {
      const markers = [];
      if (focusedSuggestion.customer.lat && focusedSuggestion.customer.lng) {
        markers.push(focusedSuggestion.customer);
      }
      if (focusedSuggestion.neighbor && focusedSuggestion.neighbor.lat && focusedSuggestion.neighbor.lng) {
        markers.push({ ...focusedSuggestion.neighbor, id: 'neighbor-marker' });
      }
      return markers;
    }

    const mapSettings = settings?.modules?.map;
    let base = route.filter(c => c.lat && c.lng);
    if (mapSettings?.showUnassignedCustomers === false) {
      base = base.filter(c => c.routeName && c.routeName !== 'Unassigned');
    }

    // Inject branches if available
    /* NOTE: We mix branches into the customer list for rendering convenience, 
       but give them distinct IDs or properties for styling. */
    // Inject branches if available
    /* NOTE: We mix branches into the customer list for rendering convenience, 
       but give them distinct IDs or properties for styling. */
    if (branches && branches.length > 0) {
      const branchMarkers = branches
        .filter(b => b.coordinates?.lat != null && b.coordinates?.lng != null)
        .map(b => ({
          id: `branch-${b.id}`, // Unique ID for keying
          name: b.name,
          lat: b.coordinates.lat,
          lng: b.coordinates.lng,
          clientCode: 'BRANCH',
          routeName: 'Depot',
          regionDescription: 'Central',
          day: '',
          isBranch: true // internal flag
        } as any)); // Type casting to match Customer roughly or we can expand the type
      base = [...branchMarkers, ...base];
    }

    // Merge Viewport Points if in Explorer Mode
    if (isExplorerMode && viewportPoints.length > 0) {
      // Simple merge, dependent on being distinct from route
      return [...base, ...viewportPoints];
    }

    return base;
  }, [route, focusedSuggestion, settings, branches, viewportPoints, isExplorerMode]);

  // Calculate Path Coordinates for the Line - filter out invalid coordinates
  const pathCoordinates = useMemo(() => {
    return displayMarkers
      .filter(c => c.lat != null && c.lng != null && !isNaN(c.lat) && !isNaN(c.lng))
      .map(c => [c.lat, c.lng] as [number, number]);
  }, [displayMarkers]);

  // Default center
  const defaultCenter: [number, number] = [24.7136, 46.6753];

  return (
    <div className="h-full w-full relative z-0">
      <style>{MARKER_STYLES}</style>

      {/* Magic View Mode Button */}
      <div className="absolute top-4 left-4 z-[1000]">
        <button
          onClick={toggleTheme}
          className="magic-map-btn"
          title={`Currently: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} Mode`}
        >
          {getThemeIcon()}
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={10}
        style={{ height: "100%", width: "100%", borderRadius: "1.5rem", background: "#111827" }}
        zoomControl={false} // We will add custom position or just let it be default if we want standard. User asked for "Full Option".
      >
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" />
        {/* Dynamic Tile Layer */}
        {currentTheme === 'street' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {currentTheme === 'dark' && (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        )}
        {currentTheme === 'light' && (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
        )}
        {currentTheme === 'satellite' && (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        <FitBounds markers={displayMarkers} />
        {isExplorerMode && <ViewportFetcher onBoundsChange={handleBoundsChange} />}
        <AutoFocusControl markers={displayMarkers} />

        {/* Connecting Line */}
        {pathCoordinates.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            pathOptions={{
              color: '#4f46e5',
              weight: 4,
              opacity: 0.6,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: '1, 10'
            }}
          />
        )}
        {pathCoordinates.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            pathOptions={{
              color: '#4f46e5',
              weight: 2,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {displayMarkers
          .filter(c => c.lat != null && c.lng != null && !isNaN(c.lat) && !isNaN(c.lng))
          .map((customer, idx) => {
            const isSelected = selectedCustomerId === customer.id;
            const isBranch = customer.id?.startsWith('branch-') || false;

            // Determine color based on day
            let pinColor = DEFAULT_COLOR;
            if (customer.day && DAY_COLORS[customer.day]) {
              pinColor = DAY_COLORS[customer.day];
            }

            let icon;
            if (isBranch) {
              icon = createDepotIcon(isSelected, pinColor);
            } else {
              icon = createNumberedIcon(idx + 1, isSelected, pinColor);
            }

            return (
              <Marker
                key={`${customer.id} -${idx} `}
                position={[customer.lat, customer.lng]}
                icon={icon}
                zIndexOffset={isSelected ? 1000 : (isBranch ? 900 : 0)}
              >
                <Popup closeButton={false} className="custom-popup" offset={[0, 8]}>
                  <div className="font-sans min-w-[200px] max-w-[220px]">
                    {/* Header: Compact & Gradient */}
                    <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between rounded-t-xl">
                      <div className="flex items-center gap-2">
                        {isBranch ? (
                          <div className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-sm">DEPOT</div>
                        ) : (
                          <div className="text-white px-1.5 py-0.5 rounded text-[9px] font-black shadow-sm" style={{ backgroundColor: pinColor }}>#{idx + 1}</div>
                        )}
                        {customer.clientCode && <span className="text-[9px] font-mono font-bold text-gray-400">{customer.clientCode}</span>}
                      </div>
                    </div>

                    {/* Body: Dense Infomation */}
                    <div className="p-3 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md rounded-b-xl">
                      <h3 className="text-xs font-black text-gray-900 dark:text-white leading-tight mb-0.5 truncate pr-2">{customer.name}</h3>
                      <div className="flex items-center gap-1.5 mb-2">
                        {customer.nameAr && <p className="text-[10px] font-bold text-indigo-500 truncate" dir="rtl">{customer.nameAr}</p>}
                        {customer.reachCustomerCode && (
                          <span className="text-[9px] font-black bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20">
                            {customer.reachCustomerCode}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-bold uppercase">Route</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{customer.routeName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-bold uppercase">Region</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{customer.regionDescription || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-bold uppercase">Day</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${customer.day ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-gray-500'}`}>{customer.day || 'Any'}</span>
                        </div>
                      </div>

                      {/* Action Button: Slim */}
                      <button
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${customer.lat},${customer.lng}`, '_blank')}
                        className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                      >
                        <MapIcon size={12} /> Google Maps
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker >
            );
          })}
      </MapContainer >
    </div >
  );
};

export default MapVisualizer;
