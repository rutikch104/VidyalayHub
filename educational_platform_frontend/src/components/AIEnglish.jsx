import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { BookOpen, Play, Mic, Volume2, Clock, Users, TrendingUp, CheckCircle, Headphones, MessageCircle, FileText, Trophy, Brain, Globe, Lightbulb, PenTool, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import aiEnglishService from '@/services/aiEnglishService';
const AIEnglish = () => {
    const { user } = useAuth();
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isStarting, setIsStarting] = useState(false);
    const [courses, setCourses] = useState([]);
    const [activities, setActivities] = useState([]);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        fetchCourses();
        fetchActivities();
        fetchProgress();
    }, []);
    const fetchCourses = async () => {
        setLoading(true);
        try {
            const response = await aiEnglishService.getCourses();
            // Transform API response to include UI properties
            const coursesWithUI = response.courses.map(course => {
                const iconMap = {
                    'basic-conversation': MessageCircle,
                    'business-english': Users,
                    'academic-writing': PenTool,
                    'pronunciation-practice': Mic,
                    'grammar-fundamentals': BookOpen,
                    'vocabulary-building': Brain,
                    'listening-comprehension': Headphones,
                    'speaking-fluency': Volume2
                };
                const colorMap = {
                    'basic-conversation': 'blue',
                    'business-english': 'purple',
                    'academic-writing': 'green',
                    'pronunciation-practice': 'orange',
                    'grammar-fundamentals': 'indigo',
                    'vocabulary-building': 'pink',
                    'listening-comprehension': 'teal',
                    'speaking-fluency': 'red'
                };
                const gradientMap = {
                    'basic-conversation': 'from-blue-500 to-cyan-500',
                    'business-english': 'from-purple-500 to-pink-500',
                    'academic-writing': 'from-green-500 to-emerald-500',
                    'pronunciation-practice': 'from-orange-500 to-red-500',
                    'grammar-fundamentals': 'from-indigo-500 to-purple-500',
                    'vocabulary-building': 'from-pink-500 to-rose-500',
                    'listening-comprehension': 'from-teal-500 to-cyan-500',
                    'speaking-fluency': 'from-red-500 to-pink-500'
                };
                return {
                    ...course,
                    icon: iconMap[course.category] || BookOpen,
                    color: colorMap[course.category] || 'blue',
                    bgGradient: gradientMap[course.category] || 'from-blue-500 to-cyan-500'
                };
            });
            setCourses(coursesWithUI);
        }
        catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch courses');
            console.error('Error fetching courses:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const fetchActivities = async () => {
        try {
            const response = await aiEnglishService.getActivities();
            const activitiesWithUI = response.activities.map(activity => {
                const iconMap = {
                    'speaking-practice': Mic,
                    'listening-exercise': Headphones,
                    'vocabulary-quiz': Brain,
                    'grammar-check': FileText,
                    'pronunciation-feedback': Volume2,
                    'writing-prompt': PenTool,
                    'conversation-simulation': MessageCircle,
                    'reading-comprehension': BookOpen
                };
                const colorMap = {
                    'speaking-practice': 'blue',
                    'listening-exercise': 'green',
                    'vocabulary-quiz': 'purple',
                    'grammar-check': 'orange',
                    'pronunciation-feedback': 'pink',
                    'writing-prompt': 'indigo',
                    'conversation-simulation': 'teal',
                    'reading-comprehension': 'red'
                };
                const gradientMap = {
                    'speaking-practice': 'from-blue-500 to-cyan-500',
                    'listening-exercise': 'from-green-500 to-emerald-500',
                    'vocabulary-quiz': 'from-purple-500 to-pink-500',
                    'grammar-check': 'from-orange-500 to-red-500',
                    'pronunciation-feedback': 'from-pink-500 to-rose-500',
                    'writing-prompt': 'from-indigo-500 to-purple-500',
                    'conversation-simulation': 'from-teal-500 to-cyan-500',
                    'reading-comprehension': 'from-red-500 to-pink-500'
                };
                return {
                    ...activity,
                    icon: iconMap[activity.type] || BookOpen,
                    color: colorMap[activity.type] || 'blue',
                    bgGradient: gradientMap[activity.type] || 'from-blue-500 to-cyan-500'
                };
            });
            setActivities(activitiesWithUI);
        }
        catch (err) {
            console.error('Error fetching activities:', err);
        }
    };
    const fetchProgress = async () => {
        try {
            const response = await aiEnglishService.getLearningProgress();
            setProgress(response);
        }
        catch (err) {
            console.error('Error fetching progress:', err);
        }
    };
    const handleStartCourse = async (courseId) => {
        if (!user) {
            setError('Please login to start learning');
            return;
        }
        setIsStarting(true);
        setError('');
        try {
            const response = await aiEnglishService.startCourse(courseId);
            console.log('Course started:', response);
            setSelectedCourse(courseId);
            // In a real app, you would navigate to the course interface
            // navigate(`/english-course/${courseId}`);
        }
        catch (err) {
            setError(err.response?.data?.message || 'Failed to start course');
            console.error('Error starting course:', err);
        }
        finally {
            setIsStarting(false);
        }
    };
    const handleStartActivity = async (activityId) => {
        if (!user) {
            setError('Please login to start activity');
            return;
        }
        try {
            const response = await aiEnglishService.startActivity(activityId);
            console.log('Activity started:', response);
            // In a real app, you would navigate to the activity interface
            // navigate(`/english-activity/${activityId}`);
        }
        catch (err) {
            setError(err.response?.data?.message || 'Failed to start activity');
            console.error('Error starting activity:', err);
        }
    };
    const getLevelColor = (level) => {
        switch (level.toLowerCase()) {
            case 'beginner':
                return 'bg-green-100 text-green-700';
            case 'intermediate':
                return 'bg-yellow-100 text-yellow-700';
            case 'advanced':
                return 'bg-red-100 text-red-700';
            case 'all levels':
                return 'bg-purple-100 text-purple-700';
            default:
                return 'bg-muted text-foreground';
        }
    };
    return (_jsx("div", { className: "platform-page", children: _jsxs("div", { className: "platform-page__container p-6", children: [_jsxs("div", { className: "bg-card rounded-2xl shadow-sm border border-border p-6 mb-6", children: [_jsx("div", { className: "flex items-center justify-between mb-6", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl", children: _jsx(Globe, { className: "h-6 w-6 text-white" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-foreground", children: "AI English Learning" }), _jsx("p", { className: "text-muted-foreground", children: "Master English with AI-powered personalized learning" })] })] }) }), progress && (_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6", children: [_jsx("div", { className: "bg-green-50 rounded-xl p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-green-600 font-medium", children: "Total Lessons" }), _jsx("p", { className: "text-2xl font-bold text-green-900", children: progress.totalLessons })] }), _jsx(BookOpen, { className: "h-8 w-8 text-green-500" })] }) }), _jsx("div", { className: "bg-blue-50 rounded-xl p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-blue-600 font-medium", children: "Completed" }), _jsx("p", { className: "text-2xl font-bold text-blue-900", children: progress.completedLessons })] }), _jsx(CheckCircle, { className: "h-8 w-8 text-blue-500" })] }) }), _jsx("div", { className: "bg-purple-50 rounded-xl p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-purple-600 font-medium", children: "Current Streak" }), _jsxs("p", { className: "text-2xl font-bold text-purple-900", children: [progress.currentStreak, " days"] })] }), _jsx(TrendingUp, { className: "h-8 w-8 text-purple-500" })] }) }), _jsx("div", { className: "bg-orange-50 rounded-xl p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-orange-600 font-medium", children: "Overall Score" }), _jsxs("p", { className: "text-2xl font-bold text-orange-900", children: [progress.overallScore, "%"] })] }), _jsx(Trophy, { className: "h-8 w-8 text-orange-500" })] }) })] }))] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), _jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-xl font-semibold text-foreground mb-4", children: "Learning Courses" }), loading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-green-600" }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: courses.map((course) => {
                                const IconComponent = course.icon;
                                return (_jsxs("div", { className: `bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${selectedCourse === course.id ? 'ring-2 ring-green-500' : ''}`, onClick: () => setSelectedCourse(course.id), children: [_jsx("div", { className: `w-16 h-16 bg-gradient-to-r ${course.bgGradient} rounded-xl flex items-center justify-center mb-4`, children: _jsx(IconComponent, { className: "h-8 w-8 text-white" }) }), _jsx("h3", { className: "text-lg font-semibold text-foreground mb-2", children: course.title }), _jsx("p", { className: "text-muted-foreground mb-4", children: course.description }), _jsxs("div", { className: "space-y-3 mb-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Level:" }), _jsx("span", { className: `px-2 py-1 text-xs rounded-full ${getLevelColor(course.level)}`, children: course.level })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Duration:" }), _jsx("span", { className: "text-sm font-medium", children: course.duration })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Modules:" }), _jsx("span", { className: "text-sm font-medium", children: course.modules })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Progress:" }), _jsxs("span", { className: "text-sm font-medium", children: [course.progress, "%"] })] })] }), _jsx("div", { className: "w-full bg-muted rounded-full h-2 mb-4", children: _jsx("div", { className: "bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300", style: { width: `${course.progress}%` } }) }), _jsx("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                handleStartCourse(course.id);
                                            }, disabled: isStarting, className: `w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${isStarting
                                                ? 'bg-gray-300 text-muted-foreground cursor-not-allowed'
                                                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:scale-105'}`, children: isStarting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: "Starting..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { className: "h-4 w-4" }), _jsxs("span", { children: [course.progress > 0 ? 'Continue' : 'Start', " Course"] })] })) })] }, course.id));
                            }) }))] }), _jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-xl font-semibold text-foreground mb-4", children: "Quick Activities" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: activities.map((activity) => {
                                const IconComponent = activity.icon;
                                return (_jsxs("div", { className: "bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-md transition-all duration-200 cursor-pointer", onClick: () => handleStartActivity(activity.id), children: [_jsx("div", { className: `w-12 h-12 bg-gradient-to-r ${activity.bgGradient} rounded-xl flex items-center justify-center mb-4`, children: _jsx(IconComponent, { className: "h-6 w-6 text-white" }) }), _jsx("h3", { className: "font-semibold text-foreground mb-2", children: activity.title }), _jsx("p", { className: "text-sm text-muted-foreground mb-3", children: activity.description }), activity.duration && (_jsxs("div", { className: "flex items-center space-x-1 text-sm text-muted-foreground", children: [_jsx(Clock, { className: "h-4 w-4" }), _jsx("span", { children: activity.duration })] }))] }, activity.id));
                            }) })] }), _jsxs("div", { className: "bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-4", children: [_jsx(Lightbulb, { className: "h-6 w-6" }), _jsx("h3", { className: "text-lg font-semibold", children: "Learning Tips" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { className: "flex items-start space-x-2", children: [_jsx(CheckCircle, { className: "h-4 w-4 mt-0.5 text-green-300" }), _jsx("span", { children: "Practice daily, even if just for 15 minutes" })] }), _jsxs("div", { className: "flex items-start space-x-2", children: [_jsx(CheckCircle, { className: "h-4 w-4 mt-0.5 text-green-300" }), _jsx("span", { children: "Use the AI pronunciation feedback to improve your accent" })] }), _jsxs("div", { className: "flex items-start space-x-2", children: [_jsx(CheckCircle, { className: "h-4 w-4 mt-0.5 text-green-300" }), _jsx("span", { children: "Complete vocabulary quizzes to build your word bank" })] }), _jsxs("div", { className: "flex items-start space-x-2", children: [_jsx(CheckCircle, { className: "h-4 w-4 mt-0.5 text-green-300" }), _jsx("span", { children: "Practice speaking with conversation simulations" })] })] })] })] }) }));
};
export default AIEnglish;
