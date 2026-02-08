import React, { useEffect, useState } from 'react';
import { Truck, Users, MapPin, Calendar, Loader2 } from 'lucide-react';
import { RouteSummaryData } from '../types';
import { SummaryCard, ColorIndicator } from '../SharedComponents';

interface RouteSummaryTabProps {
    companyId: string;
    filters: any;
}

const RouteSummaryTab: React.FC<RouteSummaryTabProps> = ({ companyId, filters }) => {
    const [data, setData] = useState<RouteSummaryData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const queryParams = new URLSearchParams({
                    company_id: companyId || ''
                });
                // NEW: Add branchIds filter for restricted users
                if (filters?.branchIds && filters.branchIds.length > 0) {
                    queryParams.set('branch_ids', filters.branchIds.join(','));
                }
                const res = await fetch(`http://localhost:5001/api/reports/route-summary?${queryParams}`);
                if (res.ok) {
                    let json = await res.json();
                    // Client side filtering for Branch if RPC doesn't support it fully or for interactivity
                    if (filters.region && filters.region !== 'All') {
                        json = json.filter((d: any) => d.branch_name === filters.region);
                    }
                    setData(json);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        if (companyId) fetchData();
    }, [companyId, filters]);

    // Aggregations
    const totalRoutes = data.length;
    const totalClients = data.reduce((acc, curr) => acc + curr.total_clients, 0);
    const totalReps = data.reduce((acc, curr) => acc + curr.sales_reps_count, 0); // Might Double count if reps share routes? Usually 1:1 or 1:N
    // Correct rep count involves distinct rep_code, but here we just sum. 
    // Ideally calculating distinct reps from list if rep_code was included. RPC groups by route.

    // Color Logic
    const getClassAStatus = (pct: number) => pct >= 50 ? 'green' : (pct >= 30 ? 'yellow' : 'red');
    const getLocationStatus = (pct: number) => pct >= 90 ? 'green' : (pct >= 70 ? 'yellow' : 'red');
    const getClientStatus = (count: number) => count > 100 ? 'green' : (count >= 50 ? 'yellow' : 'red');
    const getWeeklyStatus = (weeks: number) => weeks >= 4 ? 'green' : (weeks >= 3 ? 'yellow' : 'red');
    const getDailyStatus = (days: number) => days > 5 ? 'green' : (days >= 3 ? 'yellow' : 'red');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <p className="text-sm text-gray-400">Quick performance overview with color-coded KPIs - identify high and low performing routes at a glance</p>
            </div>



            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center items-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading Routes...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 border-b border-gray-700 text-xs uppercase font-medium text-gray-300">
                                <tr>
                                    <th className="px-6 py-4 text-left">Route Description</th>
                                    <th className="px-6 py-4 text-left">Total Clients</th>
                                    <th className="px-6 py-4 text-left">Class A %</th>
                                    <th className="px-6 py-4 text-left">Location Coverage</th>
                                    <th className="px-6 py-4 text-left">Weekly Coverage</th>
                                    <th className="px-6 py-4 text-left">Daily Coverage</th>
                                    <th className="px-6 py-4 text-left">Reps</th>
                                    <th className="px-6 py-4 text-left">Planned Visits</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-850 transition-colors text-sm">
                                        <td className="px-6 py-4">
                                            <div className="text-white font-medium">{row.route_name}</div>
                                            <div className="text-xs text-gray-500">{row.branch_name}</div>
                                        </td>
                                        <td className="px-6 py-4"><ColorIndicator value={row.total_clients} status={getClientStatus(row.total_clients)} /></td>
                                        <td className="px-6 py-4"><ColorIndicator value={`${row.class_a_pct}%`} status={getClassAStatus(row.class_a_pct)} /></td>
                                        <td className="px-6 py-4"><ColorIndicator value={`${row.location_coverage_pct}%`} status={getLocationStatus(row.location_coverage_pct)} /></td>
                                        <td className="px-6 py-4"><ColorIndicator value={`${row.weeks_active} Wks`} status={getWeeklyStatus(row.weeks_active)} /></td>
                                        <td className="px-6 py-4"><ColorIndicator value={`${row.days_active} Days`} status={getDailyStatus(row.days_active)} /></td>
                                        <td className="px-6 py-4 text-gray-400">{row.sales_reps_count}</td>
                                        <td className="px-6 py-4 text-gray-400 font-mono">{row.total_planned_visits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Legend */}
                <div className="bg-gray-850 border-t border-gray-800 p-4 sticky bottom-0">
                    <div className="flex flex-wrap gap-6 text-xs text-gray-400">
                        <div className="font-bold uppercase text-gray-500/50 mr-2">Color Legend:</div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>High / Excellent (≥90% / {'>'}100 Clients)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span>Medium / Good (70-89% / 50-100 Clients)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Low / Critical ({'<'}70% / {'<'}50 Clients)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Local Icon imports to avoid conflicts or missing imports
import { User } from 'lucide-react';

export default RouteSummaryTab;
