import React, { useEffect, useState } from 'react';
import { Calendar, Users, Activity, BarChart2, Loader2 } from 'lucide-react';
import { VisitFrequencyData } from '../types';
import { SummaryCard, ColorIndicator } from '../SharedComponents';

interface VisitFrequencyTabProps {
    companyId: string;
    filters: any;
}

const VisitFrequencyTab: React.FC<VisitFrequencyTabProps> = ({ companyId, filters }) => {
    const [data, setData] = useState<VisitFrequencyData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const queryParams = new URLSearchParams({
                    company_id: companyId || '',
                    limit: '500' // Limit to top 500 for performance in UI
                });
                // NEW: Add branchIds filter for restricted users
                if (filters?.branchIds && filters.branchIds.length > 0) {
                    queryParams.set('branch_ids', filters.branchIds.join(','));
                }
                const res = await fetch(`http://localhost:5001/api/reports/visit-frequency?${queryParams}`);
                if (res.ok) {
                    let json = await res.json();
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

    const uniqueClients = data.length;
    const totalVisits = data.reduce((acc, curr) => acc + curr.total_visits, 0);
    const avgVisits = uniqueClients ? Math.round((totalVisits / uniqueClients) * 10) / 10 : 0;
    const highFreq = data.filter(d => d.total_visits >= 8).length;
    const lowFreq = data.filter(d => d.total_visits < 4).length;

    const getFreqStatus = (visits: number) => visits >= 8 ? 'green' : (visits >= 4 ? 'yellow' : 'red');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <p className="text-sm text-gray-400">Analyze client visit patterns and frequencies - identify over-serviced and under-serviced clients</p>
            </div>



            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center items-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading Patterns...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 border-b border-gray-700 text-xs uppercase font-medium text-gray-300">
                                <tr>
                                    <th className="px-6 py-4 text-left">Client</th>
                                    <th className="px-6 py-4 text-left">Class</th>
                                    <th className="px-6 py-4 text-left">Type</th>
                                    <th className="px-6 py-4 text-left">District</th>
                                    <th className="px-6 py-4 text-left">Total Visits</th>
                                    <th className="px-6 py-4 text-left">Weeks</th>
                                    <th className="px-6 py-4 text-left">Days/Wk</th>
                                    <th className="px-6 py-4 text-left">Pattern</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-850 transition-colors text-sm">
                                        <td className="px-6 py-4">
                                            <div className="text-white font-medium">{row.client_name_en || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{row.client_code}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">{row.classification || '-'}</td>
                                        <td className="px-6 py-4 text-gray-400">{row.store_type || '-'}</td>
                                        <td className="px-6 py-4 text-gray-400">{row.district || '-'}</td>
                                        <td className="px-6 py-4">
                                            <ColorIndicator value={row.total_visits} status={getFreqStatus(row.total_visits)} />
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">{row.weeks_covered}</td>
                                        <td className="px-6 py-4 text-gray-400">{row.days_per_week}</td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">{row.visit_days}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisitFrequencyTab;
