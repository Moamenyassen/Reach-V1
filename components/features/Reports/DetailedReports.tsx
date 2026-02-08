import React, { useState } from 'react';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { User, HistoryLog, Customer } from '../../../types';
import HierarchyTab from './tabs/HierarchyTab';
import RouteSummaryTab from './tabs/RouteSummaryTab';
import VisitFrequencyTab from './tabs/VisitFrequencyTab';
import RouteEfficiencyTab from './tabs/RouteEfficiencyTab';
import UserWorkloadTab from './tabs/UserWorkloadTab';
import DataQualityTab from './tabs/DataQualityTab';
import WeeklyCoverageTab from './tabs/WeeklyCoverageTab';
import FilterSection from './FilterSection';
import { ReportFilterState } from './types';

// Hardcoded for now, or use environment variable
export const API_BASE_URL = 'http://localhost:5001/api/reports';

interface DetailedReportsProps {
  currentUser?: User;
  allCustomers?: Customer[]; // Kept for prop compatibility
  uploadHistory?: HistoryLog[]; // Kept for prop compatibility
  onBack: () => void;
  isDarkMode: boolean;
  language: 'en' | 'ar';
  onToggleTheme: () => void;
  onToggleLang: () => void;
  hideHeader?: boolean;
  currentFilters?: {
    region?: string;
    route?: string;
    day?: string;
    week?: string;
  }
}

const DetailedReports: React.FC<DetailedReportsProps> = ({
  onBack,
  isDarkMode,
  language,
  currentUser,
  currentFilters: initialFilters
}) => {
  // NEW: Check if user is admin/manager (can see all data)
  const isAdmin = !currentUser?.role || ['ADMIN', 'MANAGER', 'SYSADMIN'].includes(currentUser?.role?.toUpperCase?.() || '');
  const userBranchIds = currentUser?.branchIds || [];

  const [activeTab, setActiveTab] = useState('tab1');
  const [filters, setFilters] = useState<ReportFilterState>({
    company_id: currentUser?.companyId || 'LICENSE-MBN2OM3Q', // Fallback for dev if needed
    region: initialFilters?.region,
    // NEW: Add branchIds filter for non-admin users
    branchIds: !isAdmin && userBranchIds.length > 0 ? userBranchIds : undefined
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const typeMap: Record<string, string> = {
        'tab2': 'route-summary',
        'tab3': 'visit-frequency',
        'tab4': 'route-efficiency',
        'tab5': 'user-workload',
        'tab6': 'data-quality',
        'tab7': 'weekly-coverage'
      };
      const exportType = typeMap[activeTab];
      if (!exportType) {
        // Fallback or explicit handling for Tab 1 (Hierarchy might be complex to export as CSV flat)
        alert("Export for hierarchical view is not supported yet.");
        return;
      }

      const queryParams = new URLSearchParams({
        type: exportType,
        company_id: filters.company_id || ''
      });

      // Trigger download
      window.location.href = `${API_BASE_URL}/export?${queryParams}`;
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: 'tab1', label: 'Hierarchical View', component: HierarchyTab },
    { id: 'tab2', label: 'Route Summary', component: RouteSummaryTab },
    { id: 'tab3', label: 'Visit Frequency', component: VisitFrequencyTab },
    { id: 'tab4', label: 'Route Efficiency', component: RouteEfficiencyTab },
    { id: 'tab5', label: 'User Workload', component: UserWorkloadTab },
    { id: 'tab6', label: 'Data Quality', component: DataQualityTab },
    { id: 'tab7', label: 'Weekly Coverage', component: WeeklyCoverageTab },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col font-sans relative z-10 text-gray-100">


      {/* Filter Section */}
      <FilterSection
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        isLoading={isExporting}
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-800 bg-gray-900 sticky top-0 z-20">
        <div className="px-6">
          <div className="flex gap-1 overflow-x-auto custom-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-[1920px] mx-auto">
          {tabs.map(tab => {
            if (tab.id !== activeTab) return null;
            const Component = tab.component;
            return (
              <Component
                key={tab.id}
                companyId={filters.company_id || ''}
                filters={filters}
              />
            );
          })}
        </div>
        {/* Debug Info */}
        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded text-xs text-gray-500 font-mono">
          DEBUG: CompanyID: {filters.company_id} | API: {API_BASE_URL}
        </div>
      </div>
    </div>
  );
};

export default DetailedReports;
