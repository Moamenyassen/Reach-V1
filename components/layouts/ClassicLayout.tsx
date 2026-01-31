import React from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import MagicLayout from './MagicLayout';
import AppContent, { AppContentProps } from '../AppContent';
import { ViewMode } from '../../types';

export interface ClassicLayoutProps extends AppContentProps {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (v: boolean) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (v: boolean) => void;
    lastUpdatedDate: string;
    onToggleUiMode: () => void;
    onToggleAiTheme: () => void;
    onOpenCompanySettings?: () => void;
}

const ClassicLayout: React.FC<ClassicLayoutProps> = (props) => {
    const {
        isSidebarCollapsed, setIsSidebarCollapsed,
        isMobileMenuOpen, setIsMobileMenuOpen,
        lastUpdatedDate, onToggleUiMode, onToggleAiTheme,
        currentUser, currentCompany, view, setView, onLogout, setIsPwdModalOpen,
        controlProps
    } = props;

    return (
        <MagicLayout className="flex h-screen font-sans overflow-hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden fixed top-4 left-4 z-[3500] p-2.5 bg-indigo-600 rounded-xl shadow-lg text-white ring-2 ring-white/20 active:scale-90 transition-all"><Menu className="w-5 h-5" /></button>
            <Sidebar
                currentUser={currentUser}
                company={currentCompany}
                currentView={view}
                onNavigate={setView}
                onLogout={onLogout}
                onChangePassword={() => setIsPwdModalOpen(true)}
                isDarkMode={controlProps.isDarkMode}
                language={controlProps.language}
                onToggleTheme={controlProps.onToggleTheme}
                onToggleLang={controlProps.onToggleLang}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
                lastUpdated={lastUpdatedDate}
                isAiTheme={controlProps.isAiTheme}
                onToggleAiTheme={onToggleAiTheme}
                onToggleUiMode={onToggleUiMode}
                onOpenCompanySettings={props.onOpenCompanySettings}
            />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <AppContent {...props} />
            </main>
        </MagicLayout>
    );
};

export default ClassicLayout;
