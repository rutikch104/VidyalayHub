import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
const NavigationTabs = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'students', label: 'Students' },
        { id: 'teachers', label: 'Teachers' },
        { id: 'alumni', label: 'Alumni' },
        { id: 'analytics', label: 'Analytics' }
    ];
    return (_jsx("nav", { className: "flex space-x-8 border-b border-gray-200 bg-white px-6", children: tabs.map((tab) => (_jsx("button", { onClick: () => onTabChange(tab.id), className: `py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: tab.label }, tab.id))) }));
};
export default NavigationTabs;
