import React, { useEffect, useState } from 'react';
import { UserCheck, Users, Briefcase, Activity, Loader2 } from 'lucide-react';
import { UserWorkloadData } from '../types';
import { SummaryCard, StatusBadge } from '../SharedComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UserWorkloadTabProps {
    companyId: string;
    filters: any;
}

const UserWorkloadTab: React.FC<UserWorkloadTabProps> = ({ companyId, filters }) => {
    const [data, setData] = useState<UserWorkloadData[]>([]);
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
                const res = await fetch(`http://localhost:5001/api/reports/user-workload?${queryParams}`);
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

    // Aggregations
    const totalReps = data.length;
    const avgClients = totalReps ? Math.round(data.reduce((acc, curr) => acc + curr.total_clients, 0) / totalReps) : 0;
    const overloaded = data.filter(d => d.total_clients > 200).length; // Adjusted threshold since "50 clients/week" = ~200/month
    // Requirement says ">50 clients/week". My data is total clients assigned. 
    // If visits are weekly, total clients = weekly load * 4? No, clients are visited periodically.
    // Let's use weekly_visits from API which is count(*)/4.
    const overloadedReps = data.filter(d => d.weekly_visits > 50).length;
    const underutilizedReps = data.filter(d => d.weekly_visits < 20).length;

    const getWorkloadStatus = (weeklyVisits: number) => {
        if (weeklyVisits > 50) return { status: 'red', text: 'Overloaded' };
        if (weeklyVisits >= 30) return { status: 'green', text: 'Balanced' };
        return { status: 'yellow', text: 'Underutilized' };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <p className="text-sm text-gray-400">Sales rep workload comparison - ensure fair distribution and prevent burnout</p>
            </div>



            {/* Chart */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 h-64">
                <h3 className="text-sm font-bold text-gray-300 mb-4">Client Distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.slice(0, 20)}> {/* Limit chart items */}
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="rep_code" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            itemStyle={{ color: '#F3F4F6' }}
                        />
                        <Bar dataKey="total_clients" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center items-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading Workload...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 border-b border-gray-700 text-xs uppercase font-medium text-gray-300">
                                <tr>
                                    <th className="px-6 py-4 text-left">Sales Rep</th>
                                    <th className="px-6 py-4 text-left">Clients</th>
                                    <th className="px-6 py-4 text-left">Weekly Visits</th>
                                    <th className="px-6 py-4 text-left">Avg/Day</th>
                                    <th className="px-6 py-4 text-left">Class Breakdown (A/B/C)</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data.map((row, i) => {
                                    const { status, text } = getWorkloadStatus(row.weekly_visits);
                                    return (
                                        <tr key={i} className="hover:bg-gray-850 transition-colors text-sm">
                                            <td className="px-6 py-4 font-medium text-white">{row.rep_code}</td>
                                            <td className="px-6 py-4 text-gray-300">{row.total_clients}</td>
                                            <td className="px-6 py-4 text-gray-300">{row.weekly_visits}</td>
                                            <td className="px-6 py-4 text-gray-400">{row.avg_clients_per_day}</td>
                                            <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                                                <span className="text-emerald-500 font-bold">{row.a_class_count}</span> /
                                                <span className="text-yellow-500 font-bold"> {row.b_class_count}</span> /
                                                <span className="text-rose-500 font-bold"> {row.c_class_count}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={status as any} text={text} />
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

export default UserWorkloadTab;
