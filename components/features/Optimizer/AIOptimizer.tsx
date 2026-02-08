import React from 'react';
import OptimizerLayout from './OptimizerLayout';
import { Customer } from '../../../types';

interface AIOptimizerProps {
    customers: Customer[]; // Kept for prop compatibility, though now we fetch data internally
    focusedSuggestionId?: string | null;
    onBack: () => void;
    isDarkMode: boolean;
    language: 'en' | 'ar';
    onToggleTheme: () => void;
    onToggleLang: () => void;
    hideHeader?: boolean;
}

const AIOptimizer: React.FC<AIOptimizerProps> = ({ onBack }) => {
    return (
        <OptimizerLayout onBack={onBack} />
    );
};

export default AIOptimizer;
