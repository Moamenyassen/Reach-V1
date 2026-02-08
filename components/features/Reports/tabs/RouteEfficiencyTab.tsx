import React, { useEffect, useState } from 'react';
import { Truck, Map, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { RouteEfficiencyData } from '../types';
import { SummaryCard, StatusBadge } from '../SharedComponents';

interface RouteEfficiencyTabProps {
    companyId: string;
    filters: any;
}

const RouteEfficiencyTab: React.FC<RouteEfficiencyTabProps> = ({ companyId, filters }) => {
    const [data, setData] = useState<RouteEfficiencyData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const queryParams = new URLSearchParams({ company_id: companyId || '' });
                // NEW: Add branchIds filter for restricted users
                if (filters?.branchIds && filters.branchIds.length > 0) {
                    queryParams.set('branch_ids', filters.branchIds.join(','));
                }
                const res = await fetch(`http://localhost:5001/api/reports/route-efficiency?${queryParams}`);
                if (res.ok) {
                    let json = await res.json();
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
    const efficientRoutes = data.filter(d => d.total_clients > 80 && d.districts_covered < 5).length;
    const underutilized = data.filter(d => d.total_clients < 30).length;
    const optimizationNeeded = data.filter(d => d.total_clients < 50 || d.districts_covered > 8).length;
    const avgClients = data.length ? Math.round(data.reduce((acc, curr) => acc + curr.total_clients, 0) / data.length) : 0;

    const getEfficiencyStatus = (clients: number, districts: number) => {
        if (clients > 80 && districts < 5) return 'green';
        if (clients >= 50 && clients <= 80) return 'yellow';
        if (districts >= 5 && districts <= 8) return 'yellow';
        return 'red';
    };

    const getOptimizationFlag = (d: RouteEfficiencyData) => {
        if (d.total_clients < 50) return "Low client count";
        if (d.districts_covered > 8) return "Too spread out";
        if (d.districts_covered === 1) return "Single district";
        if (d.gps_coverage_percent < 50) return "No GPS data";
        return "Optimized";
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <p className="text-sm text-gray-400">Route optimization insights - identify underutilized routes and geographic inefficiencies</p>
            </div>



            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center items-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading Efficiency...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 border-b border-gray-700 text-xs uppercase font-medium text-gray-300">
                                <tr>
                                    <th className="px-6 py-4 text-left">Route</th>
                                    <th className="px-6 py-4 text-left">Branch</th>
                                    <th className="px-6 py-4 text-left">Clients</th>
                                    <th className="px-6 py-4 text-left">Avg/Day</th>
                                    <th className="px-6 py-4 text-left">Districts</th>
                                    <th className="px-6 py-4 text-left">GPS %</th>
                                    <th className="px-6 py-4 text-left">Users</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 text-left">Optimization</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data.map((row, i) => {
                                    const status = getEfficiencyStatus(row.total_clients, row.districts_covered);
                                    const flag = getOptimizationFlag(row);
                                    return (
                                        <tr key={i} className="hover:bg-gray-850 transition-colors text-sm">
                                            <td className="px-6 py-4 font-medium text-white">{row.route_name}</td>
                                            <td className="px-6 py-4 text-gray-400">{row.branch_name}</td>
                                            <td className="px-6 py-4 text-gray-300">{row.total_clients}</td>
                                            <td className="px-6 py-4 text-gray-400">{row.avg_clients_per_day}</td>
                                            <td className="px-6 py-4 text-gray-400">{row.districts_covered}</td>
                                            <td className="px-6 py-4 text-gray-400">{row.gps_coverage_percent}%</td>
                                            <td className="px-6 py-4 text-gray-400">{row.users_assigned}</td>
                                            <td className="px-6 py-4">
                                                <div className={`w-3 h-3 rounded-full ${status === 'green' ? 'bg-emerald-500' : status === 'yellow' ? 'bg-yellow-500' : 'bg-rose-500'}`} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs ${flag === 'Optimized' ? 'text-gray-500' : 'text-blue-400'}`}>{flag}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteEfficiencyTab;
