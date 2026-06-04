import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Search, Filter, Plus, MoreHorizontal, User, Edit, Mail, UserX } from 'lucide-react';
const mockTeachers = [
    {
        id: '1',
        name: 'Dr. Williams',
        email: 'williams@faculty.edu',
        department: 'Mathematics',
        position: 'Professor',
        courses: ['Calculus I', 'Linear Algebra'],
        joined: 'Aug 2018',
        status: 'Active'
    },
    {
        id: '2',
        name: 'Professor Brown',
        email: 'brown@faculty.edu',
        department: 'Computer Science',
        position: 'Associate Professor',
        courses: ['Programming 101', 'Algorithms'],
        joined: 'Jan 2020',
        status: 'Active'
    },
    {
        id: '3',
        name: 'Dr. Smith',
        email: 'smith@faculty.edu',
        department: 'Physics',
        position: 'Assistant Professor',
        courses: ['Quantum Mechanics', 'Physics Lab'],
        joined: 'Aug 2015',
        status: 'Sabbatical'
    }
];
const TeachersTable = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [openDropdown, setOpenDropdown] = useState(null);
    const getStatusBadge = (status) => {
        const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
        switch (status) {
            case 'Active':
                return `${baseClasses} bg-green-100 text-green-800`;
            case 'Sabbatical':
                return `${baseClasses} bg-blue-100 text-blue-800`;
            case 'Inactive':
                return `${baseClasses} bg-gray-100 text-gray-800`;
            default:
                return baseClasses;
        }
    };
    const ActionDropdown = ({ teacherId }) => {
        const isOpen = openDropdown === teacherId;
        return (_jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => setOpenDropdown(isOpen ? null : teacherId), className: "p-1 hover:bg-gray-100 rounded transition-colors", children: _jsx(MoreHorizontal, { className: "h-4 w-4 text-gray-600" }) }), isOpen && (_jsx("div", { className: "absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10", children: _jsxs("div", { className: "py-1", children: [_jsxs("button", { className: "flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50", children: [_jsx(User, { className: "h-4 w-4 mr-2" }), "View Profile"] }), _jsxs("button", { className: "flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50", children: [_jsx(Edit, { className: "h-4 w-4 mr-2" }), "Edit Details"] }), _jsxs("button", { className: "flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50", children: [_jsx(Mail, { className: "h-4 w-4 mr-2" }), "Send Email"] }), _jsxs("button", { className: "flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50", children: [_jsx(UserX, { className: "h-4 w-4 mr-2" }), "Deactivate Account"] })] }) }))] }));
    };
    return (_jsxs("div", { className: "bg-white rounded-lg border border-gray-200", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Manage Teachers" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "View and manage all teachers at your institution" })] }), _jsxs("button", { className: "bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center", children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Add Teacher"] })] }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Search teachers...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("button", { className: "flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors", children: [_jsx(Filter, { className: "h-4 w-4 mr-2" }), "Filter"] })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Email" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Department" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Position" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Courses" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Joined" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: mockTeachers.map((teacher) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-3", children: _jsx(User, { className: "h-4 w-4 text-gray-600" }) }), _jsx("span", { className: "text-sm font-medium text-gray-900", children: teacher.name })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-600", children: teacher.email }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: teacher.department }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: teacher.position }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "flex flex-wrap gap-1", children: teacher.courses.map((course, index) => (_jsx("span", { className: "px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded", children: course }, index))) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-600", children: teacher.joined }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: getStatusBadge(teacher.status), children: teacher.status }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: _jsx(ActionDropdown, { teacherId: teacher.id }) })] }, teacher.id))) })] }) })] }));
};
export default TeachersTable;
