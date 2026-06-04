import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import aiEnglishService from '@/services/aiEnglishService';
import { Bot, Send, Mic, Paperclip, Brain, Zap, Star, User as UserIcon, Copy, ThumbsUp, ThumbsDown, Share2, Bookmark, History, Plus, Lightbulb, Code, BookOpen, Calculator, Camera, FileText, Smile, Maximize2, Minimize2, BarChart3 } from 'lucide-react';
const RCPITChatGPT = () => {
    const [messages, setMessages] = useState([
        {
            id: '1',
            type: 'ai',
            content: 'Hello! I\'m RCPIT AI Assistant, powered by advanced language models. I\'m here to help you with your studies, research, coding, and any academic questions. How can I assist you today?',
            timestamp: '10:30 AM',
            suggestions: [
                'Help me with programming concepts',
                'Explain machine learning basics',
                'Assist with academic writing',
                'Solve mathematical problems'
            ]
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedModel, setSelectedModel] = useState('GPT-4');
    const [chatSessions, setChatSessions] = useState([
        {
            id: '1',
            title: 'Machine Learning Help',
            lastMessage: 'Explain neural networks...',
            timestamp: '2 hours ago',
            messageCount: 15
        },
        {
            id: '2',
            title: 'Programming Assignment',
            lastMessage: 'Help with React components...',
            timestamp: '1 day ago',
            messageCount: 8
        },
        {
            id: '3',
            title: 'Research Paper Review',
            lastMessage: 'Review my abstract...',
            timestamp: '3 days ago',
            messageCount: 23
        }
    ]);
    const [showSidebar, setShowSidebar] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const messagesEndRef = useRef(null);
    const conversationIdRef = useRef(null);
    const quickPrompts = [
        {
            icon: Code,
            title: 'Code Review',
            description: 'Review and improve my code',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: BookOpen,
            title: 'Study Help',
            description: 'Explain complex concepts',
            color: 'from-green-500 to-emerald-500'
        },
        {
            icon: Calculator,
            title: 'Math Solver',
            description: 'Solve mathematical problems',
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: FileText,
            title: 'Writing Assistant',
            description: 'Help with essays and papers',
            color: 'from-orange-500 to-red-500'
        }
    ];
    const aiModels = [
        { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model', icon: '🧠' },
        { id: 'gpt-3.5', name: 'GPT-3.5 Turbo', description: 'Fast and efficient', icon: '⚡' },
        { id: 'claude', name: 'Claude', description: 'Great for analysis', icon: '🎯' },
        { id: 'rcpit-ai', name: 'RCPIT AI', description: 'Specialized for education', icon: '🎓' }
    ];
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    const sendMessage = async () => {
        if (!inputMessage.trim())
            return;
        const text = inputMessage.trim();
        const userMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);
        try {
            if (!conversationIdRef.current) {
                const start = await aiEnglishService.startConversation('campus');
                conversationIdRef.current = start.conversation_id;
            }
            const res = await aiEnglishService.continueConversation(conversationIdRef.current, text);
            const aiResponse = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: res.ai_response ||
                    `I understand you're asking about "${text}". Let me help you with that.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestions: res.conversation_complete
                    ? undefined
                    : [
                        'Tell me more about this topic',
                        'Show me an example',
                        'Explain it differently',
                        'What are the next steps?',
                    ],
            };
            setMessages((prev) => [...prev, aiResponse]);
            setIsTyping(false);
        }
        catch {
            setTimeout(() => {
                const aiResponse = {
                    id: (Date.now() + 1).toString(),
                    type: 'ai',
                    content: `I understand you're asking about "${text}". Let me help you with that. This is a comprehensive response that would address your question with detailed explanations, examples, and practical guidance tailored to your academic needs.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    suggestions: [
                        'Tell me more about this topic',
                        'Show me an example',
                        'Explain it differently',
                        'What are the next steps?',
                    ],
                };
                setMessages((prev) => [...prev, aiResponse]);
                setIsTyping(false);
            }, 2000);
        }
    };
    const handleSuggestionClick = (suggestion) => {
        setInputMessage(suggestion);
    };
    const startNewChat = () => {
        conversationIdRef.current = null;
        setMessages([
            {
                id: '1',
                type: 'ai',
                content: "Hello! I'm RCPIT AI Assistant. How can I help you today?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
        ]);
    };
    return (_jsxs("div", { className: `platform-page ${isFullscreen ? 'fixed inset-0 z-50 min-h-screen bg-muted/50' : ''}`, children: [_jsx("div", { className: "bg-card/90 backdrop-blur-sm border-b border-border/50 sticky top-16 z-40", children: _jsx("div", { className: "platform-page__container px-6 py-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg", children: _jsx(Bot, { className: "h-8 w-8 text-white" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent", children: "RCPIT ChatGPT" }), _jsx("p", { className: "text-muted-foreground mt-1", children: "Your AI-powered academic assistant" })] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("select", { value: selectedModel, onChange: (e) => setSelectedModel(e.target.value), className: "px-4 py-2 bg-card border border-border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200", children: aiModels.map((model) => (_jsxs("option", { value: model.name, children: [model.icon, " ", model.name] }, model.id))) }), _jsx("button", { onClick: () => setShowSidebar(!showSidebar), className: "p-2 bg-card border border-border rounded-xl hover:bg-muted/50 transition-all duration-200", children: _jsx(History, { className: "h-5 w-5 text-muted-foreground" }) }), _jsx("button", { onClick: () => setIsFullscreen(!isFullscreen), className: "p-2 bg-card border border-border rounded-xl hover:bg-muted/50 transition-all duration-200", children: isFullscreen ? _jsx(Minimize2, { className: "h-5 w-5 text-muted-foreground" }) : _jsx(Maximize2, { className: "h-5 w-5 text-muted-foreground" }) })] })] }) }) }), _jsxs("div", { className: "max-w-7xl mx-auto flex h-screen", children: [showSidebar && (_jsxs("div", { className: "w-80 bg-card/90 backdrop-blur-sm border-r border-border/50 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-bold text-foreground", children: "Chat History" }), _jsx("button", { onClick: startNewChat, className: "bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200", children: _jsx(Plus, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "space-y-3 mb-6", children: chatSessions.map((session) => (_jsxs("div", { className: "p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-border hover:from-blue-50 hover:to-purple-50 transition-all duration-200 cursor-pointer group", children: [_jsx("h3", { className: "font-medium text-foreground mb-1 group-hover:text-purple-600 transition-colors duration-200", children: session.title }), _jsx("p", { className: "text-sm text-muted-foreground mb-2 truncate", children: session.lastMessage }), _jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [_jsx("span", { children: session.timestamp }), _jsxs("span", { children: [session.messageCount, " messages"] })] })] }, session.id))) }), _jsxs("div", { className: "mb-6", children: [_jsx("h3", { className: "font-semibold text-foreground mb-3", children: "AI Models" }), _jsx("div", { className: "space-y-2", children: aiModels.map((model) => (_jsx("button", { onClick: () => setSelectedModel(model.name), className: `w-full p-3 rounded-xl text-left transition-all duration-200 ${selectedModel === model.name
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                                : 'bg-muted/50 hover:bg-muted text-foreground'}`, children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("span", { className: "text-lg", children: model.icon }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: model.name }), _jsx("p", { className: `text-xs ${selectedModel === model.name ? 'text-white/80' : 'text-muted-foreground'}`, children: model.description })] })] }) }, model.id))) })] }), _jsxs("div", { className: "bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 text-white", children: [_jsxs("h3", { className: "font-bold mb-3 flex items-center", children: [_jsx(Zap, { className: "h-5 w-5 mr-2" }), "Quick Actions"] }), _jsxs("div", { className: "space-y-2", children: [_jsx("button", { className: "w-full bg-card/20 hover:bg-card/30 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left px-3", children: "\uD83D\uDCDA Study Assistant" }), _jsx("button", { className: "w-full bg-card/20 hover:bg-card/30 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left px-3", children: "\uD83D\uDCBB Code Helper" }), _jsx("button", { className: "w-full bg-card/20 hover:bg-card/30 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left px-3", children: "\uD83D\uDCDD Writing Assistant" })] })] })] })), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: [messages.length === 1 && (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "w-24 h-24 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl", children: _jsx(Bot, { className: "h-12 w-12 text-white" }) }), _jsx("h2", { className: "text-2xl font-bold text-foreground mb-4", children: "Welcome to RCPIT AI Assistant" }), _jsx("p", { className: "text-muted-foreground mb-8 max-w-2xl mx-auto", children: "I'm here to help you with your academic journey. Ask me anything about programming, mathematics, research, writing, or any other subject you're studying." }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto", children: quickPrompts.map((prompt, index) => (_jsxs("button", { onClick: () => handleSuggestionClick(prompt.description), className: `p-6 bg-gradient-to-r ${prompt.color} rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group`, children: [_jsx(prompt.icon, { className: "h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-200" }), _jsx("h3", { className: "font-bold mb-2", children: prompt.title }), _jsx("p", { className: "text-sm text-white/90", children: prompt.description })] }, index))) })] })), messages.map((message) => (_jsx("div", { className: `flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsx("div", { className: `max-w-4xl w-full ${message.type === 'user' ? 'flex justify-end' : 'flex justify-start'}`, children: _jsxs("div", { className: `flex space-x-4 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`, children: [_jsx("div", { className: "flex-shrink-0", children: message.type === 'ai' ? (_jsx("div", { className: "w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg", children: _jsx(Bot, { className: "h-6 w-6 text-white" }) })) : (_jsx("div", { className: "w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg", children: _jsx(UserIcon, { className: "h-6 w-6 text-white" }) })) }), _jsxs("div", { className: `flex-1 ${message.type === 'user' ? 'text-right' : ''}`, children: [_jsxs("div", { className: `inline-block max-w-3xl p-6 rounded-2xl shadow-lg ${message.type === 'user'
                                                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                                                    : 'bg-card/90 backdrop-blur-sm border border-border/50 text-foreground'}`, children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("span", { className: `font-medium ${message.type === 'user' ? 'text-white/90' : 'text-muted-foreground'}`, children: message.type === 'ai' ? 'RCPIT AI Assistant' : 'You' }), _jsx("span", { className: `text-xs ${message.type === 'user' ? 'text-white/70' : 'text-muted-foreground'}`, children: message.timestamp })] }), _jsx("p", { className: "leading-relaxed whitespace-pre-wrap", children: message.content }), message.type === 'ai' && (_jsxs("div", { className: "flex items-center space-x-2 mt-4 pt-4 border-t border-border", children: [_jsx("button", { className: "p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200", children: _jsx(ThumbsUp, { className: "h-4 w-4" }) }), _jsx("button", { className: "p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200", children: _jsx(ThumbsDown, { className: "h-4 w-4" }) }), _jsx("button", { className: "p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200", children: _jsx(Copy, { className: "h-4 w-4" }) }), _jsx("button", { className: "p-2 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200", children: _jsx(Share2, { className: "h-4 w-4" }) }), _jsx("button", { className: "p-2 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200", children: _jsx(Bookmark, { className: "h-4 w-4" }) })] }))] }), message.type === 'ai' && message.suggestions && (_jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: message.suggestions.map((suggestion, index) => (_jsx("button", { onClick: () => handleSuggestionClick(suggestion), className: "px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-xl hover:from-purple-200 hover:to-pink-200 transition-all duration-200 text-sm font-medium border border-purple-200 hover:scale-105", children: suggestion }, index))) }))] })] }) }) }, message.id))), isTyping && (_jsx("div", { className: "flex justify-start", children: _jsxs("div", { className: "flex space-x-4", children: [_jsx("div", { className: "w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg", children: _jsx(Bot, { className: "h-6 w-6 text-white" }) }), _jsx("div", { className: "bg-card/90 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-lg", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("div", { className: "flex space-x-1", children: [_jsx("div", { className: "w-2 h-2 bg-purple-500 rounded-full animate-bounce" }), _jsx("div", { className: "w-2 h-2 bg-purple-500 rounded-full animate-bounce", style: { animationDelay: '0.1s' } }), _jsx("div", { className: "w-2 h-2 bg-purple-500 rounded-full animate-bounce", style: { animationDelay: '0.2s' } })] }), _jsx("span", { className: "text-muted-foreground text-sm", children: "AI is thinking..." })] }) })] }) })), _jsx("div", { ref: messagesEndRef })] }), _jsx("div", { className: "bg-card/90 backdrop-blur-sm border-t border-border/50 p-6", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-4", children: [_jsxs("button", { className: "flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition-all duration-200 border border-blue-200", children: [_jsx(Camera, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "Upload Image" })] }), _jsxs("button", { className: "flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-200 border border-green-200", children: [_jsx(FileText, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "Upload Document" })] }), _jsxs("button", { className: "flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 rounded-xl hover:from-orange-100 hover:to-red-100 transition-all duration-200 border border-orange-200", children: [_jsx(Mic, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "Voice Input" })] })] }), _jsxs("div", { className: "flex items-end space-x-4", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx("textarea", { value: inputMessage, onChange: (e) => setInputMessage(e.target.value), placeholder: "Ask me anything about your studies, coding, research, or any academic topic...", className: "w-full px-6 py-4 pr-16 bg-card border-2 border-border rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 resize-none shadow-lg hover:shadow-xl", rows: 3, onKeyPress: (e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    sendMessage();
                                                                }
                                                            } }), _jsxs("div", { className: "absolute right-4 bottom-4 flex items-center space-x-2", children: [_jsx("button", { className: "p-2 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200", children: _jsx(Paperclip, { className: "h-4 w-4" }) }), _jsx("button", { className: "p-2 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200", children: _jsx(Smile, { className: "h-4 w-4" }) })] })] }), _jsx("button", { onClick: sendMessage, disabled: !inputMessage.trim() || isTyping, className: `p-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl ${inputMessage.trim() && !isTyping
                                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:scale-105'
                                                        : 'bg-muted text-muted-foreground cursor-not-allowed'}`, children: _jsx(Send, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "flex justify-between items-center mt-2 text-xs text-muted-foreground", children: [_jsxs("span", { children: ["Powered by ", selectedModel] }), _jsxs("span", { children: [inputMessage.length, "/2000"] })] })] }) })] }), !isFullscreen && (_jsxs("div", { className: "w-80 bg-card/90 backdrop-blur-sm border-l border-border/50 p-6 space-y-6", children: [_jsxs("div", { className: "bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6", children: [_jsxs("h3", { className: "font-bold text-foreground mb-4 flex items-center", children: [_jsx(Brain, { className: "h-5 w-5 mr-2 text-purple-600" }), "AI Capabilities"] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center", children: _jsx(Code, { className: "h-4 w-4 text-white" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium text-foreground", children: "Code Analysis" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Debug, optimize, and explain code" })] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center", children: _jsx(BookOpen, { className: "h-4 w-4 text-white" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium text-foreground", children: "Study Assistant" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Explain concepts and theories" })] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center", children: _jsx(FileText, { className: "h-4 w-4 text-white" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium text-foreground", children: "Writing Help" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Essays, reports, and papers" })] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center", children: _jsx(Calculator, { className: "h-4 w-4 text-white" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium text-foreground", children: "Math Solver" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Step-by-step solutions" })] })] })] })] }), _jsxs("div", { className: "bg-card/90 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-lg", children: [_jsxs("h3", { className: "font-bold text-foreground mb-4 flex items-center", children: [_jsx(BarChart3, { className: "h-5 w-5 mr-2 text-blue-600" }), "Usage Statistics"] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Messages Today" }), _jsx("span", { className: "font-bold text-blue-600", children: "47" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Total Conversations" }), _jsx("span", { className: "font-bold text-green-600", children: "156" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Code Reviews" }), _jsx("span", { className: "font-bold text-purple-600", children: "23" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Study Sessions" }), _jsx("span", { className: "font-bold text-orange-600", children: "89" })] })] })] }), _jsxs("div", { className: "bg-card/90 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-lg", children: [_jsxs("h3", { className: "font-bold text-foreground mb-4 flex items-center", children: [_jsx(Lightbulb, { className: "h-5 w-5 mr-2 text-yellow-600" }), "AI Tips"] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("div", { className: "w-2 h-2 bg-blue-500 rounded-full mt-2" }), _jsx("p", { className: "text-sm text-foreground", children: "Be specific in your questions for better responses" })] }), _jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full mt-2" }), _jsx("p", { className: "text-sm text-foreground", children: "Upload images or documents for context" })] }), _jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("div", { className: "w-2 h-2 bg-purple-500 rounded-full mt-2" }), _jsx("p", { className: "text-sm text-foreground", children: "Use follow-up questions to dive deeper" })] }), _jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("div", { className: "w-2 h-2 bg-orange-500 rounded-full mt-2" }), _jsx("p", { className: "text-sm text-foreground", children: "Save important conversations for later" })] })] })] }), _jsxs("div", { className: "bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-xl", children: [_jsxs("h3", { className: "font-bold mb-4 flex items-center", children: [_jsx(Star, { className: "h-5 w-5 mr-2" }), "Premium AI Features"] }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("p", { className: "flex items-center space-x-2", children: [_jsx("span", { children: "\uD83D\uDE80" }), _jsx("span", { children: "Advanced AI models access" })] }), _jsxs("p", { className: "flex items-center space-x-2", children: [_jsx("span", { children: "\uD83D\uDCCA" }), _jsx("span", { children: "Detailed conversation analytics" })] }), _jsxs("p", { className: "flex items-center space-x-2", children: [_jsx("span", { children: "\uD83D\uDCBE" }), _jsx("span", { children: "Unlimited conversation history" })] }), _jsxs("p", { className: "flex items-center space-x-2", children: [_jsx("span", { children: "\uD83C\uDFAF" }), _jsx("span", { children: "Personalized learning paths" })] })] }), _jsx("button", { className: "w-full bg-card/20 hover:bg-card/30 py-2 rounded-lg text-sm font-medium transition-all duration-200 mt-4", children: "Upgrade to Premium" })] })] }))] })] }));
};
export default RCPITChatGPT;
