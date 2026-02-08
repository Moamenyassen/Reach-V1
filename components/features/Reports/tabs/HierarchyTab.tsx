import React, { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Building, Truck, User, Calendar, CalendarDays, Loader2 } from 'lucide-react';
import { HierarchicalData } from '../types';
import { SummaryCard } from '../SharedComponents';

interface HierarchyTabProps {
    companyId: string;
    filters: any;
}

const HierarchyTab: React.FC<HierarchyTabProps> = ({ companyId, filters }) => {
    const [data, setData] = useState<HierarchicalData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    // Initial Load - BRANCH level
    useEffect(() => {
        loadData('BRANCH', null);
    }, [companyId]);

    const loadData = async (level: string, parentId: string | null) => {
        setIsLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams({
                company_id: companyId || '',
                target_level: level,
                ...(parentId && { parent_id: parentId }),
                // NEW: Add branchIds filter for restricted users
                ...(filters?.branchIds && filters.branchIds.length > 0 && { branch_ids: filters.branchIds.join(',') })
            });
            const url = `http://localhost:5001/api/reports/hierarchical?${queryParams}`;
            console.log("[HierarchyTab] Fetching:", url);
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();

                if (level === 'BRANCH') {
                    // Initial load
                    // Initialize _children array for valid tree structure
                    const processed = json.map((item: any) => ({ ...item, _children: [] }));
                    setData(processed);
                } else {
                    // Append children to parent
                    setData(prev => {
                        const next = [...prev];
                        // Helper to find and update
                        const updateNode = (nodes: any[]): boolean => {
                            for (const node of nodes) {
                                if (node.id === parentId) {
                                    node._children = json.map((item: any) => ({ ...item, _children: [] }));
                                    return true;
                                }
                                if (node._children && node._children.length > 0) {
                                    if (updateNode(node._children)) return true;
                                }
                            }
                            return false;
                        };
                        updateNode(next);
                        return next;
                    });
                }
            } else {
                const txt = await res.text();
                setError(`Error ${res.status}: ${txt}`);
            }
        } catch (err: any) {
            console.error(err);
            setError(`Fetch Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Build Tree ... (no change needed in logic, just use data)


    // Build Tree
    const toggleExpand = async (item: any) => {
        const id = item.id;
        const currentLevel = item.level_type;
        const newSet = new Set(expandedIds);

        if (newSet.has(id)) {
            newSet.delete(id);
            setExpandedIds(newSet);
        } else {
            newSet.add(id);
            setExpandedIds(newSet);
            // Lazy load if children empty
            if (!item._children || item._children.length === 0) {
                let nextLevel = '';
                if (currentLevel === 'BRANCH') nextLevel = 'ROUTE';
                else if (currentLevel === 'ROUTE') nextLevel = 'USER';
                else if (currentLevel === 'USER') nextLevel = 'WEEK';
                else if (currentLevel === 'WEEK') nextLevel = 'DAY';

                if (nextLevel) {
                    await loadData(nextLevel, id);
                }
            }
        }
    };

    const getLevelStyle = (level: string) => {
        switch (level) {
            case 'BRANCH': return { bg: 'bg-gray-800', pl: 'pl-6', icon: Building, color: 'text-blue-400' };
            case 'ROUTE': return { bg: 'bg-gray-850', pl: 'pl-12', icon: Truck, color: 'text-orange-400' };
            case 'USER': return { bg: 'bg-gray-900', pl: 'pl-16', icon: User, color: 'text-purple-400' };
            case 'WEEK': return { bg: 'bg-gray-925', pl: 'pl-20', icon: Calendar, color: 'text-green-400' };
            case 'DAY': return { bg: 'bg-gray-950', pl: 'pl-24', icon: CalendarDays, color: 'text-gray-400' };
            default: return { bg: 'bg-gray-900', pl: 'pl-4', icon: Building, color: 'text-gray-400' };
        }
    };

    // Client Side Aggregation (Only Top Level for Summary)
    const totalClients = data.filter(d => d.level_type === 'BRANCH').reduce((acc, curr) => acc + curr.total_clients, 0);

    const renderRow = (item: any) => {
        const isExpanded = expandedIds.has(item.id);
        const hasChildren = item._children && item._children.length > 0;
        const style = getLevelStyle(item.level_type);
        const Icon = style.icon;
        const isLeaf = item.level_type === 'DAY';

        return (
            <React.Fragment key={item.id}>
                <tr
                    className={`${style.bg} border-b border-gray-800 hover:bg-white/5 transition-colors cursor-pointer text-sm`}
                    onClick={() => !isLeaf && toggleExpand(item)}
                >
                    <td className={`py-3 pr-4 text-left ${style.pl} flex items-center gap-3`}>
                        {hasChildren ? (
                            isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />
                        ) : <span className="w-3.5" />} {/* Spacer */}
                        <Icon size={16} className={style.color} />
                        <span className="font-medium text-gray-200">{item.name}</span>
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider ml-2 border border-gray-700 rounded px-1">{item.level_type}</span>
                    </td>
                    <td className="px-6 py-3 text-white font-mono">{item.total_clients}</td>
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                        <span className="text-emerald-500 font-bold">{item.class_a_count}</span> /
                        <span className="text-yellow-500 font-bold"> {item.class_b_count}</span> /
                        <span className="text-rose-500 font-bold"> {item.class_c_count}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                        {item.supermarkets_count + item.retail_count + item.hypermarkets_count + item.minimarkets_count}
                    </td>
                    <td className="px-6 py-3 text-blue-300 font-mono">{item.total_visits}</td>
                </tr>
                {isExpanded && item._children && item._children.map((child: any) => renderRow(child))}
            </React.Fragment>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Tab Description */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <p className="text-sm text-gray-400">
                    Drill down through Branch → Route → User → Week → Day with complete KPI aggregation at every level.
                </p>
                {/* DEBUG INFO */}
                <div className="mt-2 text-xs text-blue-400 font-mono flex gap-4">
                    <span>Records: {data.length}</span>
                    {error && <span className="text-red-400">{error}</span>}
                </div>
            </div>



            {/* Tree Table */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center items-center text-gray-500">
                        <Loader2 className="animate-spin mr-2" /> Loading Hierarchy...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 border-b border-gray-700 text-xs uppercase font-medium text-gray-300">
                                <tr>
                                    <th className="px-6 py-4 text-left w-1/3">Hierarchy Level</th>
                                    <th className="px-6 py-4 text-left">Total Clients</th>
                                    <th className="px-6 py-4 text-left">Class Breakdown (A/B/C)</th>
                                    <th className="px-6 py-4 text-left">Stores</th>
                                    <th className="px-6 py-4 text-left">Total Visits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length > 0 ? data.map(renderRow) : (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        {error ? <span className="text-red-400">{error}</span> : "No data found"}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HierarchyTab;
