import React, { useEffect, useState } from 'react';
import { ShieldCheck, MapPin, Phone, Database, Loader2 } from 'lucide-react';
import { DataQualityData } from '../types';
import { SummaryCard, ColorIndicator } from '../SharedComponents';

interface DataQualityTabProps {
    companyId: string;
    filters: any;
}

const DataQualityTab: React.FC<DataQualityTabProps> = ({ companyId, filters }) => {
    const [data, setData] = useState<DataQualityData[]>([]);
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
                const res = await fetch(`http://localhost:5001/api/reports/data-quality?${queryParams}`);
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
    const totalRecords = data.reduce((acc, curr) => acc + curr.total_records, 0);

    // Weighted Averages for Summary
    const calcWeightedAvg = (key: keyof DataQualityData) => {
        if (!totalRecords) return 0;
        const sum = data.reduce((acc, curr) => acc + (curr[key] as number * curr.total_records), 0);
        return Math.round(sum / totalRecords);
    }

    const overallGps = calcWeightedAvg('gps_coverage');
    const overallPhone = calcWeightedAvg('phone_coverage');
    const overallScore = Math.round((
        calcWeightedAvg('gps_coverage') +
        calcWeightedAvg('phone_coverage') +
        calcWeightedAvg('classification_coverage') +
        calcWeightedAvg('store_type_coverage') +
        calcWeightedAvg('schedule_coverage') +
        calcWeightedAvg('vat_coverage')
    ) / 6);

    const getQualityColor = (score: number) => score >= 90 ? 'text-emerald-400' : (score >= 70 ? 'text-yellow-400' : 'text-rose-400');
    const getQualityStatus = (score: number) => score >= 90 ? 'green' : (score >= 70 ? 'yellow' : 'red');

    // Compute row scores
    const processedData = data.map(row => {
        const score = Math.round((
            row.gps_coverage + row.phone_coverage + row.classification_coverage +
            row.store_type_coverage + row.schedule_coverage + row.vat_coverage
        ) / 6);
        return { ...row, score };
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <p className="text-sm text-gray-400">Data completeness monitoring - identify and fix missing critical information</p>
            </div>



            {/* Breakdown Section */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-gray-900 p-4 rounded-lg border border-gray-800 text-xs text-gray-400">
                <div className="flex flex-col gap-1 items-center p-2 bg-gray-800 rounded">
                    <span>Missing GPS</span>
                    <span className="text-white font-bold">{Math.round(totalRecords * (100 - overallGps) / 100)}</span>
                </div>
                <div className="flex flex-col gap-1 items-center p-2 bg-gray-800 rounded">
                    <span>Missing Phone</span>
                    <span className="text-white font-bold">{Math.round(totalRecords * (100 - overallPhone) / 100)}</span>
                </div>
                <div className="flex flex-col gap-1 items-center p-2 bg-gray-800 rounded">
                    <span>Missing Class</span>
                    <span className="text-white font-bold">{Math.round(totalRecords * (100 - calcWeightedAvg('classification_coverage')) / 100)}</span>
                </div>
                <div className="flex flex-col gap-1 items-center p-2 bg-gray-800 rounded">
                    <span>Missing Type</span>
                    <span className="text-white font-bold">{Math.round(totalRecords * (100 - calcWeightedAvg('store_type_coverage')) / 100)}</span>
                </div>
                <div className="flex flex-col gap-1 items-center p-2 bg-gray-800 rounded">
                    <span>Missing Sched</span>
                    <span className="text-white font-bold">{Math.round(totalRecords * (100 - calcWeightedAvg('schedule_coverage')) / 100)}</span>
                </div>
                <div className="flex flex-col gap-1 items-center p-2 bg-gray-800 rounded">
                    <span>Missing Week</span>
                    {/* schedule_coverage covers both week and day */}
                    <span className="text-white font-bold">-</span>
                </div>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center items-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading Quality...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 border-b border-gray-700 text-xs uppercase font-medium text-gray-300">
                                <tr>
                                    <th className="px-6 py-4 text-left">Route</th>
                                    <th className="px-6 py-4 text-left">Records</th>
                                    <th className="px-6 py-4 text-left">GPS %</th>
                                    <th className="px-6 py-4 text-left">Phone %</th>
                                    <th className="px-6 py-4 text-left">Class %</th>
                                    <th className="px-6 py-4 text-left">Type %</th>
                                    <th className="px-6 py-4 text-left">Sched %</th>
                                    <th className="px-6 py-4 text-left">Overall %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {processedData.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-850 transition-colors text-sm">
                                        <td className="px-6 py-4">
                                            <div className="text-white font-medium">{row.route_name}</div>
                                            <div className="text-xs text-gray-500">{row.branch_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">{row.total_records}</td>
                                        <td className="px-6 py-4 text-gray-400">{row.gps_coverage}%</td>
                                        <td className="px-6 py-4 text-gray-400">{row.phone_coverage}%</td>
                                        <td className="px-6 py-4 text-gray-400">{row.classification_coverage}%</td>
                                        <td className="px-6 py-4 text-gray-400">{row.store_type_coverage}%</td>
                                        <td className="px-6 py-4 text-gray-400">{row.schedule_coverage}%</td>
                                        <td className="px-6 py-4">
                                            <ColorIndicator value={`${row.score}%`} status={getQualityStatus(row.score)} />
                                        </td>
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

export default DataQualityTab;
