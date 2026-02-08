import React, { useEffect, useState } from 'react';
import { Filter, Search, Download } from 'lucide-react';
import { ReportFilterState } from './types';
import { API_BASE_URL } from './DetailedReports'; // I will define this in DetailedReports or a config

interface FilterSectionProps {
    filters: ReportFilterState;
    onFilterChange: (filters: ReportFilterState) => void;
    onExport: () => void;
    isLoading?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ filters, onFilterChange, onExport, isLoading }) => {
    const [filterOptions, setFilterOptions] = useState<any[]>([]);
    const [regions, setRegions] = useState<string[]>([]);
    const [routes, setRoutes] = useState<string[]>([]);

    useEffect(() => {
        const loadFilters = async () => {
            try {
                const companyId = filters.company_id;
                if (!companyId) return;

                const res = await fetch(`http://localhost:5001/api/reports/filters?company_id=${companyId}`);
                if (res.ok) {
                    const data = await res.json();
                    setFilterOptions(data);
                    // Extract unique regions
                    const uniqueRegions = Array.from(new Set(data.map((d: any) => d.branch_name || d.region))).filter(Boolean) as string[];
                    setRegions(uniqueRegions);

                    // Routes will be filtered based on selected region later, or just all for now
                }
            } catch (err) {
                console.error("Failed to load filters", err);
            }
        }
        loadFilters();
    }, [filters.company_id]);

    // Update available routes when region changes
    useEffect(() => {
        if (filters.region && filterOptions.length > 0) {
            // This logic depends on what structure /api/reports/filters returns. 
            // Assuming it returns row level { region, branch_code, route_name } distincts is tricky.
            // For now, let's keep it simple.
        }
    }, [filters.region, filterOptions]);

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, region: e.target.value === 'All' ? undefined : e.target.value });
    };

    return (
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Left Side: Filters */}
                <div className="flex items-center gap-4 w-full md:w-auto">

                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            value={filters.region || 'All'}
                            onChange={handleRegionChange}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                        >
                            <option value="All">All Regions</option>
                            {regions.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Add more filters here like Route if needed */}

                </div>

                {/* Right Side: Export */}
                <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    <Download size={18} />
                    {isLoading ? 'Exporting...' : 'Export CSV'}
                </button>
            </div>
        </div>
    );
};

export default FilterSection;
