import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import React from 'react';
const StatsCard = ({ title, value, icon: Icon, iconColor }) => {
    return (_jsx("div", { className: "app-card group rounded-2xl p-6 transition-all duration-300 hover:shadow-lg", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground mb-1", children: title }), _jsx("p", { className: "text-2xl font-bold text-foreground", children: value })] }), _jsx("div", { className: `p-3 rounded-xl ${iconColor} transition-transform duration-200 group-hover:scale-110`, children: _jsx(Icon, { className: "h-6 w-6 text-primary-foreground" }) })] }) }));
};
export default StatsCard;
