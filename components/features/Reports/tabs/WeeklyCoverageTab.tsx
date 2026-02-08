import React, { useEffect, useState } from 'react';
import { CalendarCheck, PieChart as PieChartIcon, Check, X, Loader2 } from 'lucide-react';
import { WeeklyCoverageData } from '../types';
import { SummaryCard, ColorIndicator } from '../SharedComponents';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface WeeklyCoverageTabProps {
    companyId: string;
    filters: any;
}

const WeeklyCoverageTab: React.FC<WeeklyCoverageTabProps> = ({ companyId, filters }) => {
    const [data, setData] = useState<WeeklyCoverageData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const queryParams = new URLSearchParams({
                    company_id: companyId || '',
                    limit: '500' // Limit for UI performance
                });
                // NEW: Add branchIds filter for restricted users
                if (filters?.branchIds && filters.branchIds.length > 0) {
                    queryParams.set('branch_ids', filters.branchIds.join(','));
                }
                const res = await fetch(`http://localhost:5001/api/reports/weekly-coverage?${queryParams}`);
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
    const fullCoverage = data.filter(d => d.weeks_covered === 4).length;
    const partialCoverage = data.filter(d => d.weeks_covered >= 1 && d.weeks_covered < 4).length;
    const noCoverage = data.filter(d => d.weeks_covered === 0).length; // RPC might not return those if not in data, but if they are in data with null weeks?
    // The query counts distinct weeks. If user is in table but week is null everywhere, weeks_covered = 0.
    const completionRate = data.length ? Math.round((fullCoverage / data.length) * 100) : 0;

    const pieData = [
        { name: 'Full (4 Wks)', value: fullCoverage },
        { name: 'Partial (1-3 Wks)', value: partialCoverage },
        { name: 'None (0 Wk)', value: noCoverage }
    ];
    const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

    const getStatus = (weeks: number) => weeks === 4 ? 'green' : (weeks >= 2 ? 'yellow' : 'red');
    const getIssue = (d: WeeklyCoverageData) => {
        if (d.weeks_covered === 0) return "Missing all weeks";
        if (d.weeks_covered === 1) return "Single week only";
        if (d.weeks_covered === 3) return "Missing one week"; // e.g. "Missing final week" if specific logic
        return "Inconsistent schedule";
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <p className="text-sm text-gray-400">Identify scheduling gaps and inconsistencies - ensure consistent weekly client service</p>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart */}
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 h-64 flex flex-col items-center justify-center">
                    <h4 className="text-gray-300 text-sm font-bold mb-2">Coverage Distribution</h4>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', color: '#fff', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Full</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Partial</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400" /> None</span>
                    </div>
                </div>

                {/* Table */}
                <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto h-64 custom-scrollbar">
                        <table className="w-full relative">
                            <thead className="bg-gray-800 border-b border-gray-700 text-xs uppercase font-medium text-gray-300 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left">Client</th>
                                    <th className="px-2 py-4 text-center">W1</th>
                                    <th className="px-2 py-4 text-center">W2</th>
                                    <th className="px-2 py-4 text-center">W3</th>
                                    <th className="px-2 py-4 text-center">W4</th>
                                    <th className="px-6 py-4 text-center">Coverage</th>
                                    <th className="px-6 py-4 text-left">Issue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data.map((row, i) => {
                                    const status = getStatus(row.weeks_covered);
                                    return (
                                        <tr key={i} className="hover:bg-gray-850 transition-colors text-sm">
                                            <td className="px-6 py-3">
                                                <div className="text-white font-medium">{row.client_name}</div>
                                                <div className="text-xs text-gray-500">{row.client_code}</div>
                                            </td>
                                            <td className="px-2 py-3 text-center">{row.week_1_covered ? <Check size={14} className="text-emerald-500 mx-auto" /> : <div className="w-1 h-1 bg-gray-700 rounded-full mx-auto" />}</td>
                                            <td className="px-2 py-3 text-center">{row.week_2_covered ? <Check size={14} className="text-emerald-500 mx-auto" /> : <div className="w-1 h-1 bg-gray-700 rounded-full mx-auto" />}</td>
                                            <td className="px-2 py-3 text-center">{row.week_3_covered ? <Check size={14} className="text-emerald-500 mx-auto" /> : <div className="w-1 h-1 bg-gray-700 rounded-full mx-auto" />}</td>
                                            <td className="px-2 py-3 text-center">{row.week_4_covered ? <Check size={14} className="text-emerald-500 mx-auto" /> : <div className="w-1 h-1 bg-gray-700 rounded-full mx-auto" />}</td>
                                            <td className="px-6 py-3 justify-center flex">
                                                <ColorIndicator value={`${row.coverage_percent}%`} status={status} />
                                            </td>
                                            <td className="px-6 py-3 text-gray-400 text-xs">{getIssue(row)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyCoverageTab;
