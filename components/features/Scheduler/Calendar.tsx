
import React, { useState, useMemo, useEffect } from 'react';
import { User, Customer } from '../../../types';
import { TRANSLATIONS } from '../../../config/constants';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Filter,
    Clock,
    MapPin,
    User as UserIcon,
    MoreHorizontal,
    LayoutGrid,
    List,
    Search,
    Map as MapIcon,
    X,
    ArrowRight,
    MapPinOff
} from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addWeeks,
    subWeeks,
    isToday,
    parseISO,
    isValid
} from 'date-fns';

interface CalendarProps {
    currentUser: User;
    users: User[];
    allCustomers: Customer[];
    onNavigate: (view: string) => void;
    hideHeader?: boolean;
    isDarkMode: boolean;
}

const Calendar: React.FC<CalendarProps> = ({
    currentUser,
    users,
    allCustomers,
    onNavigate,
    hideHeader,
    isDarkMode
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK'>('MONTH');
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
    const [selectedRoute, setSelectedRoute] = useState<string>('ALL');

    // DEBUG: Check data flow
    useEffect(() => {
        console.log('RouteScheduler - allCustomers:', allCustomers.length);
        if (allCustomers.length > 0) {
            console.log('Sample customer:', allCustomers[0]);
            console.log('Unique Days:', Array.from(new Set(allCustomers.map(c => c.day))));
            console.log('Unique Routes:', Array.from(new Set(allCustomers.map(c => c.routeName))));
            console.log('Unique Regions:', Array.from(new Set(allCustomers.map(c => c.regionCode || c.regionDescription))));
        }
    }, [allCustomers]);

    // Derived Data: Unique Branches
    const uniqueBranches = useMemo(() => {
        const branches = new Set(allCustomers.map(c => c.regionCode || c.regionDescription).filter(Boolean));
        return Array.from(branches).sort();
    }, [allCustomers]);

    // Derived Data: Unique Routes (Filtered by Branch)
    const uniqueRoutes = useMemo(() => {
        let filteredCustomers = allCustomers;
        if (selectedBranch !== 'ALL') {
            filteredCustomers = allCustomers.filter(c =>
                (c.regionCode === selectedBranch || c.regionDescription === selectedBranch)
            );
        }
        const routes = new Set(filteredCustomers.map(c => c.routeName).filter(Boolean));
        return Array.from(routes).sort();
    }, [allCustomers, selectedBranch]);

    // Reset Route when Branch changes
    useEffect(() => {
        setSelectedRoute('ALL');
    }, [selectedBranch]);

    // Calendar Generation
    const days = useMemo(() => {
        let start, end;
        if (viewMode === 'MONTH') {
            start = startOfWeek(startOfMonth(currentDate));
            end = endOfWeek(endOfMonth(currentDate));
        } else {
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
        }
        return eachDayOfInterval({ start, end });
    }, [currentDate, viewMode]);

    // Event/Plan Generation based on Routes and Day Names
    const getCustomersForDay = (date: Date) => {
        const dayName = format(date, 'EEEE'); // Monday, Tuesday...

        return allCustomers.filter(c => {
            // Filter by Branch if selected
            if (selectedBranch !== 'ALL' &&
                c.regionCode !== selectedBranch &&
                c.regionDescription !== selectedBranch) {
                return false;
            }

            // Filter by Route if selected
            if (selectedRoute !== 'ALL' && c.routeName !== selectedRoute) return false;

            // Match day name (basic recurrence)
            // Note: In a real app this might be more complex (Week 1 vs Week 2),
            // but for now we match generic day names.
            if (!c.day || !c.day.includes(dayName)) return false;

            return true;
        });
    };

    const nextPeriod = () => {
        if (viewMode === 'MONTH') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addWeeks(currentDate, 1));
    };

    const prevPeriod = () => {
        if (viewMode === 'MONTH') setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(subWeeks(currentDate, 1));
    };

    // Modal State
    const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: Date, customers: Customer[] } | null>(null);

    return (
        <div className={`h-full flex flex-col relative ${isDarkMode ? 'bg-[#020617] text-white' : 'bg-gray-50 text-gray-900'} `}>

            {/* --- Header Station --- */}
            <div className="shrink-0 p-6 pb-2">
                {!hideHeader && (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                <CalendarIcon className="w-8 h-8 text-cyan-500" />
                                <span className={isDarkMode ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400' : 'text-gray-900'}>
                                    Route Master
                                </span>
                            </h1>
                            <p className={`mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} `}>
                                Advanced scheduling and visit planning visualization.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl backdrop-blur-md border border-white/10">
                            <button
                                onClick={() => setViewMode('MONTH')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'MONTH' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-400 hover:bg-white/5'} `}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Month
                            </button>
                            <button
                                onClick={() => setViewMode('WEEK')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'WEEK' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-400 hover:bg-white/5'} `}
                            >
                                <List className="w-3.5 h-3.5" /> Week
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-4 bg-black/20 rounded-xl px-4 py-2">
                    <button onClick={prevPeriod} className="p-1 hover:text-cyan-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <span className="text-lg font-black tracking-wide min-w-[200px] text-center">
                        {format(currentDate, viewMode === 'MONTH' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
                    </span>
                    <button onClick={nextPeriod} className="p-1 hover:text-cyan-400 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="ml-2 text-xs font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-wider"
                    >
                        Today
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0" style={{ scrollbarWidth: 'none' }}>

                    {/* Branch Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-xl border border-white/5">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase mr-2">Branch:</span>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-200 outline-none cursor-pointer hover:text-white max-w-[150px]"
                        >
                            <option value="ALL" className="bg-slate-900 text-slate-300">All Branches</option>
                            {uniqueBranches.map(branch => (
                                <option key={branch} value={branch} className="bg-slate-900 text-slate-300">
                                    {branch}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Route Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-xl border border-white/5">
                        <Search className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase mr-2">Route:</span>
                        <select
                            value={selectedRoute}
                            onChange={(e) => setSelectedRoute(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-200 outline-none cursor-pointer hover:text-white max-w-[150px]"
                        >
                            <option value="ALL" className="bg-slate-900 text-slate-300">All Routes</option>
                            {uniqueRoutes.map(route => (
                                <option key={route} value={route} className="bg-slate-900 text-slate-300">
                                    {route}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>


            {/* --- Calendar Grid --- */}
            <div className="flex-1 p-6 pt-0 overflow-y-auto custom-scrollbar">
                <div className={`grid grid-cols-7 gap-px bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl ${viewMode === 'MONTH' ? 'auto-rows-[minmax(120px,1fr)]' : 'h-full auto-rows-fr'} `}>

                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="h-10 bg-slate-900/80 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                            {day}
                        </div>
                    ))}

                    {/* Day Cells */}
                    {days.map((day, dayIdx) => {
                        const dayCustomers = getCustomersForDay(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isDayToday = isToday(day);
                        const hasVisits = dayCustomers.length > 0;

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => hasVisits && setSelectedDayDetails({ date: day, customers: dayCustomers })}
                                className={`
                                    relative p-2 transition-all group overflow-hidden
                                    ${isCurrentMonth ? (isDarkMode ? 'bg-[#0f172a]/40 hover:bg-[#1e293b]/80' : 'bg-white hover:bg-gray-50') : (isDarkMode ? 'bg-black/20' : 'bg-gray-100/50')}
                                    ${viewMode === 'WEEK' ? 'min-h-[400px] border-r border-white/5 last:border-r-0' : 'min-h-[120px]'}
                                    ${hasVisits ? 'cursor-pointer' : ''}
`}
                            >
                                {/* Date Number */}
                                <div className={`
w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-2
                                    ${isDayToday
                                        ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                        : (isCurrentMonth ? (isDarkMode ? 'text-slate-300' : 'text-gray-700') : 'text-slate-600')
                                    }
`}>
                                    {format(day, 'd')}
                                </div>

                                {/* Content: List of Visits */}
                                {hasVisits && (
                                    <div className="space-y-1">
                                        {/* Summary Header */}
                                        <div className="flex items-center gap-2 mb-2 px-1">
                                            <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                {dayCustomers.length} Stops
                                            </span>
                                        </div>

                                        {/* Customer Previews */}
                                        {dayCustomers.slice(0, viewMode === 'MONTH' ? 3 : 15).map((customer, idx) => (
                                            <div
                                                key={`${customer.id || idx} `}
                                                className={`
                                                    flex items-center justify-between text-[10px] p-1.5 pl-2 rounded-md
                                                    ${isDarkMode ? 'bg-slate-800/80' : 'bg-white border-gray-100'}
border-l-2 border-l-cyan-500 shadow-sm
    `}
                                            >
                                                <span className={`font-bold truncate max-w-[80px] ${isDarkMode ? 'text-slate-300' : 'text-gray-700'} `}>
                                                    {customer.name}
                                                </span>
                                                {customer.routeName && selectedRoute === 'ALL' && (
                                                    <span className="text-[8px] text-slate-500 bg-slate-900 px-1 rounded ml-1">
                                                        {customer.routeName}
                                                    </span>
                                                )}
                                            </div>
                                        ))}

                                        {dayCustomers.length > (viewMode === 'MONTH' ? 3 : 15) && (
                                            <div className="text-[9px] font-bold text-center text-slate-500 pt-1">
                                                + {dayCustomers.length - (viewMode === 'MONTH' ? 3 : 15)} more visits
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                {hasVisits && (
                                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-cyan-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                )}
                            </div>
                        );
                    })
                    }
                </div>
            </div>

            {/* --- Day Details Modal/Slide-over --- */}
            {
                selectedDayDetails && (
                    <div className="absolute inset-0 z-50 flex justify-end animate-in slide-in-from-right duration-300">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedDayDetails(null)}
                        ></div>

                        {/* Panel */}
                        <div className={`relative w-full max-w-md h-full shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#0f172a] border-l border-white/10' : 'bg-white border-l border-gray-200'} `}>
                            {/* Header */}
                            <div className={`p-6 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-100'} flex items-center justify-between bg-gradient-to-r from-transparent to-cyan-500/5`}>
                                <div>
                                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                                        {format(selectedDayDetails.date, 'EEEE, MMM d')}
                                    </h2>
                                    <p className="text-sm text-slate-400 font-medium">Daily Visit Manifesto</p>
                                </div>
                                <button
                                    onClick={() => setSelectedDayDetails(null)}
                                    className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-0">
                                <div className="divide-y divide-white/5">
                                    {selectedDayDetails.customers.map((customer, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 hover:bg-white/5 transition-colors group flex items-center gap-4`}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-black text-sm border border-cyan-500/20">
                                                    {idx + 1}
                                                </div>
                                                <div className="h-full w-px bg-white/5 group-last:hidden"></div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className={`font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-900'} `}>
                                                        {customer.name}
                                                    </h3>
                                                    {customer.routeName && (
                                                        <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-white/5">
                                                            {customer.routeName}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                    {customer.clientCode && (
                                                        <span className="flex items-center gap-1">
                                                            <span className="opacity-50">ID:</span> {customer.clientCode}
                                                        </span>
                                                    )}
                                                    {customer.reachCustomerCode && (
                                                        <span className="flex items-center gap-1 text-cyan-400 font-bold">
                                                            {customer.reachCustomerCode}
                                                        </span>
                                                    )}
                                                    {customer.address && (
                                                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                                                            <MapPin className="w-3 h-3" /> {customer.address}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-cyan-500 hover:text-white rounded-lg transition-all text-cyan-500">
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Empty State */}
                                {selectedDayDetails.customers.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 container mx-auto text-center p-8">
                                        <MapPinOff className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No visits scheduled for this day.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className={`p-4 border-t ${isDarkMode ? 'border-white/10 bg-slate-900/50' : 'border-gray-100 bg-gray-50'} backdrop-blur`}>
                                <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <MapIcon className="w-4 h-4" /> View Optimized Route Map
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default Calendar;
