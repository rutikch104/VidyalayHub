import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { TrendingUp, Users, Bookmark, Calendar } from 'lucide-react';
const Sidebar = () => {
    const trendingTopics = [
        '#ReactJS',
        '#WebDevelopment',
        '#JavaScript',
        '#TechCareers',
        '#Innovation'
    ];
    const suggestedConnections = [
        {
            name: 'Sarah Johnson',
            title: 'Frontend Developer at Google',
            avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150'
        },
        {
            name: 'Mike Chen',
            title: 'Product Manager at Microsoft',
            avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150'
        },
        {
            name: 'Emily Davis',
            title: 'UX Designer at Apple',
            avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150'
        }
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-4", children: [_jsxs("div", { className: "flex items-center space-x-2 mb-4", children: [_jsx(TrendingUp, { className: "h-5 w-5 text-gray-600" }), _jsx("h3", { className: "font-semibold text-gray-900", children: "Trending" })] }), _jsx("div", { className: "space-y-2", children: trendingTopics.map((topic, index) => (_jsx("button", { className: "block text-blue-600 hover:text-blue-800 text-sm font-medium", children: topic }, index))) })] }), _jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-4", children: [_jsxs("div", { className: "flex items-center space-x-2 mb-4", children: [_jsx(Users, { className: "h-5 w-5 text-gray-600" }), _jsx("h3", { className: "font-semibold text-gray-900", children: "People you may know" })] }), _jsx("div", { className: "space-y-3", children: suggestedConnections.map((person, index) => (_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("img", { src: person.avatar, alt: person.name, className: "w-10 h-10 rounded-full object-cover" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 truncate", children: person.name }), _jsx("p", { className: "text-xs text-gray-500 truncate", children: person.title })] }), _jsx("button", { className: "text-blue-600 hover:text-blue-800 text-sm font-medium", children: "Connect" })] }, index))) })] }), _jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-4", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-4", children: "Quick Actions" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("button", { className: "flex items-center space-x-2 w-full text-left text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-50", children: [_jsx(Bookmark, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm", children: "Saved posts" })] }), _jsxs("button", { className: "flex items-center space-x-2 w-full text-left text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-50", children: [_jsx(Calendar, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm", children: "Events" })] }), _jsxs("button", { className: "flex items-center space-x-2 w-full text-left text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-50", children: [_jsx(Users, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm", children: "Groups" })] })] })] })] }));
};
export default Sidebar;
