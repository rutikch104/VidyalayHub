import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Calendar, Building, Github, Linkedin, Twitter, MessageCircle, UserPlus, MoreHorizontal, Star, Award, Briefcase, GraduationCap, Share2, Users, Zap, Crown, CheckCircle, Code, Trophy, ExternalLink, User, Verified, Plus, } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';
import connectionService from '@/services/connectionService';
import { resolveMediaUrl } from '@/services/postService';
const ViewProfile = ({ onBack, userId, onNavigate }) => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [showAllSkills, setShowAllSkills] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('none');
    useEffect(() => { if (userId) {
        fetchUserProfile();
        checkConnectionStatus();
    } }, [userId]);
    const fetchUserProfile = async () => {
        if (!userId)
            return;
        setLoading(true);
        setError('');
        try {
            const response = await userService.getPublicProfile(userId);
            const avatarSrc = resolveMediaUrl(response.avatar_url || '') || response.avatar_url || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300';
            const coverRaw = response.cover_image_url;
            const coverSrc = coverRaw ? resolveMediaUrl(coverRaw) || coverRaw : 'https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=1200';
            const ut = (response.user_type || 'student');
            const safeUt = ut === 'teacher' || ut === 'alumni' ? ut : 'student';
            const profile = {
                id: response.id, name: response.name || 'User',
                title: response.title || (safeUt === 'teacher' ? 'Teacher' : safeUt === 'alumni' ? 'Alumni' : 'Student'),
                bio: response.bio?.trim() ? response.bio : 'No bio available',
                location: response.location || 'Location not specified', company: response.company || '—',
                email: response.email || '', phone: response.phone || '', website: response.website_url || '',
                linkedin_url: response.linkedin_url || undefined, twitter_url: response.twitter_url || undefined, github_url: response.github_url || undefined,
                userType: safeUt,
                joinDate: response.created_at ? new Date(response.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Unknown',
                avatar: avatarSrc, cover: coverSrc, verified: response.is_verified || false, premium: response.is_premium || false,
                stats: { followers: response.followers_count || 0, following: response.following_count || 0, posts: response.posts_count || 0, connections: response.connections_count || 0, profileViews: response.profile_views || 0, postViews: response.post_views || 0 },
                skills: response.skills || [],
                achievements: (response.achievements || []),
                projects: (response.projects || []),
                academicInfo: { enrollmentYear: response.enrollment_year, currentSemester: response.current_semester, gpa: response.gpa, course: response.course || undefined, department: response.department || undefined, university: response.university || undefined, graduationYear: response.graduation_year },
                professionalInfo: { company: response.company || undefined, position: response.position || undefined, experience: response.experience || undefined, skills: response.skills || [], certifications: response.certifications || [] },
            };
            setProfileData(profile);
        }
        catch (err) {
            const ax = err;
            setError(ax.response?.data?.message || ax.message || 'Failed to fetch profile');
        }
        finally {
            setLoading(false);
        }
    };
    const checkConnectionStatus = async () => {
        if (!userId || !currentUser)
            return;
        try {
            const response = await connectionService.checkConnectionStatus(userId);
            setConnectionStatus(response.status);
        }
        catch (err) {
            console.error('Error checking connection status:', err);
        }
    };
    const handleConnect = async () => {
        if (!userId || !currentUser)
            return;
        try {
            await connectionService.sendConnectionRequest(userId);
            setConnectionStatus('pending');
        }
        catch (err) {
            console.error('Error sending connection request:', err);
        }
    };
    const handleMessage = () => {
        if (!userId)
            return;
        try {
            sessionStorage.setItem('prefill_message_user_id', String(userId));
        }
        catch {
            /* ignore quota / private mode */
        }
        if (typeof onNavigate === 'function') {
            onNavigate('messages');
        }
    };
    const getIconComponent = (iconName) => {
        const iconMap = { 'Trophy': Trophy, 'Users': Users, 'Star': Star, 'Award': Award, 'Crown': Crown, 'CheckCircle': CheckCircle };
        return iconMap[iconName] || Trophy;
    };
    const handleShareProfile = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        try {
            if (navigator.share) {
                await navigator.share({ title: `${profileData?.name} — Profile`, url });
            }
            else {
                await navigator.clipboard.writeText(url);
            }
        }
        catch {
            try {
                await navigator.clipboard.writeText(url);
            }
            catch { /* ignore */ }
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex min-h-[calc(100vh-5rem)] items-center justify-center", children: _jsx("div", { className: "h-10 w-10 loading-spinner" }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex min-h-[calc(100vh-5rem)] items-center justify-center", children: _jsx("div", { className: "app-alert-error px-4 py-3 rounded-xl", children: error }) }));
    }
    if (!profileData) {
        return (_jsx("div", { className: "flex min-h-[calc(100vh-5rem)] items-center justify-center", children: _jsx("div", { className: "rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground", children: "Profile not found" }) }));
    }
    const rolePills = [
        { key: 'student', label: 'Student', icon: GraduationCap },
        { key: 'teacher', label: 'Faculty', icon: Briefcase },
        { key: 'alumni', label: 'Alumni', icon: Award },
    ];
    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'projects', label: 'Projects' },
        { key: 'achievements', label: 'Achievements' },
        { key: 'connections', label: 'Connections' },
    ];
    return (_jsxs("div", { className: "min-h-[calc(100vh-3.75rem)] bg-background pb-12", children: [_jsx("div", { className: "sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-md", children: _jsxs("div", { className: "platform-page__container mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8", children: [_jsx("button", { type: "button", onClick: onBack, className: "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", "aria-label": "Back", children: _jsx(ArrowLeft, { className: "h-5 w-5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h1", { className: "truncate text-sm font-semibold text-foreground", children: profileData.name }), _jsx("p", { className: "truncate text-xs text-muted-foreground", children: profileData.title })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [_jsx("button", { type: "button", onClick: () => void handleShareProfile(), className: "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", "aria-label": "Share", children: _jsx(Share2, { className: "h-4.5 w-4.5" }) }), _jsx("button", { type: "button", className: "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", "aria-label": "More", children: _jsx(MoreHorizontal, { className: "h-4.5 w-4.5" }) })] })] }) }), _jsxs("div", { className: "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft sm:mt-6", children: [_jsxs("div", { className: "relative h-40 sm:h-48 md:h-52", children: [_jsxs("div", { className: "absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-accent/80", children: [_jsx("img", { src: profileData.cover, alt: "", className: "h-full w-full object-cover" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" })] }), _jsx("div", { className: "absolute left-4 top-4 flex gap-2 sm:left-6 sm:top-5", children: rolePills.map(({ key, label, icon: Icon }) => (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all ${profileData.userType === key ? 'border border-white/30 bg-white/95 text-foreground shadow-sm' : 'border border-white/20 bg-white/10 text-white/80 hover:bg-white/20'}`, children: [_jsx(Icon, { className: "h-3.5 w-3.5" }), " ", label] }, key))) })] }), _jsxs("div", { className: "px-4 pb-8 sm:px-8", children: [_jsxs("div", { className: "flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6", children: [_jsxs("div", { className: "relative -mt-16 shrink-0 sm:-mt-20", children: [_jsx("div", { className: "rounded-full border-4 border-card p-0.5 shadow-professional", children: _jsx("img", { src: profileData.avatar, alt: profileData.name, className: "h-28 w-28 rounded-full object-cover sm:h-32 sm:w-32" }) }), profileData.verified && (_jsx("div", { className: "absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm", children: _jsx(CheckCircle, { className: "h-3.5 w-3.5" }) })), profileData.premium && (_jsx("div", { className: "absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm", children: _jsx(Crown, { className: "h-3.5 w-3.5 text-white" }) }))] }), _jsxs("div", { className: "w-full min-w-0 flex-1 space-y-3 pb-1 text-center sm:text-left", children: [_jsxs("div", { className: "flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3", children: [_jsx("h2", { className: "text-2xl font-bold tracking-tight text-foreground sm:text-3xl", children: profileData.name }), profileData.verified && (_jsxs("span", { className: "inline-flex items-center gap-1 text-xs font-medium text-primary", children: [_jsx(Verified, { className: "h-3.5 w-3.5" }), " Verified"] })), _jsxs("div", { className: "hidden sm:flex sm:items-center sm:gap-2 sm:ml-auto", children: [profileData.linkedin_url && _jsxs("a", { href: profileData.linkedin_url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition-all hover:border-primary/30 hover:shadow-sm", children: [_jsx(Linkedin, { className: "h-3.5 w-3.5 text-[#0A66C2]" }), " LinkedIn"] }), profileData.twitter_url && _jsxs("a", { href: profileData.twitter_url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition-all hover:border-primary/30 hover:shadow-sm", children: [_jsx(Twitter, { className: "h-3.5 w-3.5 text-sky-500" }), " Twitter"] }), profileData.github_url && _jsxs("a", { href: profileData.github_url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition-all hover:border-primary/30 hover:shadow-sm", children: [_jsx(Github, { className: "h-3.5 w-3.5" }), " GitHub"] })] })] }), _jsx("p", { className: "text-sm text-muted-foreground sm:text-base", children: profileData.title }), _jsxs("div", { className: "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:justify-start", children: [_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(MapPin, { className: "h-3.5 w-3.5" }), " ", profileData.location] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Building, { className: "h-3.5 w-3.5" }), " ", profileData.company] }), _jsx("span", { className: "hidden sm:inline", children: "\u00B7" }), _jsxs("span", { className: "hidden sm:inline-flex items-center gap-1", children: [_jsx(Calendar, { className: "h-3.5 w-3.5" }), " Joined ", profileData.joinDate] })] })] })] }), _jsx("div", { className: "mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3", children: [
                                            { value: profileData.stats.posts, label: 'Posts' },
                                            { value: profileData.stats.followers, label: 'Followers' },
                                            { value: profileData.stats.following, label: 'Following' },
                                            { value: profileData.stats.connections, label: 'Connections' },
                                        ].map((s) => (_jsxs("div", { className: "rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-center transition-all duration-200 hover:border-primary/20 hover:bg-card hover:shadow-xs", children: [_jsx("p", { className: "text-xl font-bold tabular-nums text-primary sm:text-2xl", children: s.value.toLocaleString() }), _jsx("p", { className: "mt-0.5 text-xs font-medium text-muted-foreground", children: s.label })] }, s.label))) }), _jsx("div", { className: "mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start", children: currentUser && currentUser.id !== userId && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", onClick: handleConnect, disabled: connectionStatus !== 'none', className: `app-btn-primary gap-2 ${connectionStatus === 'pending' ? 'opacity-80' : ''}`, children: [_jsx(UserPlus, { className: "h-4 w-4" }), connectionStatus === 'none' ? 'Connect' : connectionStatus === 'pending' ? 'Pending' : 'Connected'] }), _jsxs("button", { type: "button", onClick: handleMessage, className: "app-btn-secondary gap-2", children: [_jsx(MessageCircle, { className: "h-4 w-4" }), " Message"] })] })) })] })] }), _jsx("div", { className: "mt-6 border-b border-border/60", children: _jsx("nav", { className: "-mb-px flex gap-1 overflow-x-auto", children: tabs.map((tab) => (_jsx("button", { type: "button", onClick: () => setActiveTab(tab.key), className: `relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === tab.key ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary' : 'text-muted-foreground hover:text-foreground'}`, children: tab.label }, tab.key))) }) }), _jsxs("div", { className: "mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]", children: [_jsxs("div", { className: "space-y-6", children: [activeTab === 'overview' && (_jsxs(_Fragment, { children: [profileData.bio && (_jsxs("section", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-soft", children: [_jsxs("h2", { className: "mb-3 flex items-center gap-2.5 text-base font-semibold text-foreground", children: [_jsx(User, { className: "h-4.5 w-4.5 text-muted-foreground" }), " About"] }), _jsx("p", { className: "text-sm leading-relaxed text-foreground/80", children: profileData.bio })] })), profileData.academicInfo && Object.values(profileData.academicInfo).some(Boolean) && (_jsxs("section", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-soft", children: [_jsxs("h2", { className: "mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground", children: [_jsx(GraduationCap, { className: "h-4.5 w-4.5 text-muted-foreground" }), profileData.userType === 'teacher' ? 'Teaching Information' : 'Academic Information'] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3", children: [profileData.academicInfo.course && (_jsxs("div", { className: "rounded-xl bg-muted/50 px-4 py-3", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Course" }), _jsx("p", { className: "mt-1 text-sm font-semibold text-foreground", children: profileData.academicInfo.course })] })), profileData.academicInfo.department && (_jsxs("div", { className: "rounded-xl bg-muted/50 px-4 py-3", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Department" }), _jsx("p", { className: "mt-1 text-sm font-semibold text-foreground", children: profileData.academicInfo.department })] })), profileData.academicInfo.university && (_jsxs("div", { className: "rounded-xl bg-muted/50 px-4 py-3", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "University" }), _jsx("p", { className: "mt-1 text-sm font-semibold text-foreground", children: profileData.academicInfo.university })] })), profileData.academicInfo.gpa != null && (_jsxs("div", { className: "rounded-xl bg-muted/50 px-4 py-3", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "GPA" }), _jsx("p", { className: "mt-1 text-sm font-semibold text-foreground", children: profileData.academicInfo.gpa })] }))] })] })), profileData.professionalInfo && (profileData.professionalInfo.company || profileData.professionalInfo.position) && (_jsxs("section", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-soft", children: [_jsxs("div", { className: "mb-5 flex items-center justify-between", children: [_jsxs("h2", { className: "flex items-center gap-2.5 text-base font-semibold text-foreground", children: [_jsx(Briefcase, { className: "h-4.5 w-4.5 text-muted-foreground" }), " Experience"] }), _jsx(Plus, { className: "h-4 w-4 text-muted-foreground" })] }), _jsxs("div", { className: "flex gap-4", children: [_jsx("div", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10", children: _jsx(Briefcase, { className: "h-5 w-5 text-primary" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-foreground", children: profileData.professionalInfo.position || 'Position' }), _jsx("p", { className: "text-sm text-muted-foreground", children: profileData.professionalInfo.company }), profileData.professionalInfo.experience && _jsx("p", { className: "mt-2 text-sm leading-relaxed text-foreground/80", children: profileData.professionalInfo.experience })] })] })] })), profileData.skills && profileData.skills.length > 0 && (_jsxs("section", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-soft", children: [_jsxs("div", { className: "mb-5 flex items-center justify-between", children: [_jsxs("h2", { className: "flex items-center gap-2.5 text-base font-semibold text-foreground", children: [_jsx(Zap, { className: "h-4.5 w-4.5 text-amber-500" }), " Skills"] }), _jsx(Plus, { className: "h-4 w-4 text-muted-foreground" })] }), _jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: profileData.skills.slice(0, showAllSkills ? undefined : 8).map((skill, i) => {
                                                            const pct = 50 + Math.floor(Math.random() * 45);
                                                            return (_jsxs("div", { children: [_jsxs("div", { className: "mb-1.5 flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-medium text-foreground", children: skill }), _jsxs("span", { className: "text-xs tabular-nums text-muted-foreground", children: [pct, "%"] })] }), _jsx("div", { className: "h-1.5 w-full overflow-hidden rounded-full bg-muted", children: _jsx("div", { className: "h-full rounded-full bg-primary transition-all duration-700", style: { width: `${pct}%` } }) })] }, i));
                                                        }) }), profileData.skills.length > 8 && (_jsx("button", { type: "button", onClick: () => setShowAllSkills(!showAllSkills), className: "mt-4 text-sm font-semibold text-primary hover:text-primary/80", children: showAllSkills ? 'Show less' : `Show ${profileData.skills.length - 8} more` }))] })), profileData.achievements && profileData.achievements.length > 0 && (_jsxs("section", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-soft", children: [_jsxs("h2", { className: "mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground", children: [_jsx(Award, { className: "h-4.5 w-4.5 text-accent" }), " Achievements"] }), _jsx("div", { className: "space-y-3", children: profileData.achievements.map((achievement, i) => {
                                                            const IconComponent = getIconComponent(achievement.icon);
                                                            return (_jsxs("div", { className: "flex gap-3 rounded-xl border border-border/40 bg-muted/20 p-4 transition-colors hover:bg-muted/40", children: [_jsx("div", { className: `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r ${achievement.color}`, children: _jsx(IconComponent, { className: "h-5 w-5 text-white" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-foreground", children: achievement.title }), _jsx("p", { className: "text-sm text-muted-foreground", children: achievement.description }), _jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: achievement.date })] })] }, i));
                                                        }) })] }))] })), activeTab === 'projects' && (_jsx("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: profileData.projects.length === 0 ? (_jsxs("div", { className: "col-span-full rounded-2xl border border-dashed border-border bg-card py-14 text-center shadow-soft", children: [_jsx(Code, { className: "mx-auto mb-3 h-10 w-10 text-muted-foreground" }), _jsx("p", { className: "font-medium text-foreground", children: "No projects yet" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "This member has not added any projects." })] })) : (profileData.projects.map((project) => (_jsxs("div", { className: "flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition-shadow hover:shadow-professional", children: [project.image ? (_jsx("img", { src: project.image, alt: "", className: "h-36 w-full object-cover", onError: (e) => { e.target.style.display = 'none'; } })) : (_jsx("div", { className: "h-20 bg-gradient-to-br from-primary/10 to-accent/10" })), _jsxs("div", { className: "flex flex-1 flex-col p-5", children: [_jsx("h3", { className: "mb-1 text-base font-semibold text-foreground", children: project.title }), _jsx("p", { className: "mb-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-2", children: project.description }), _jsx("div", { className: "mb-3 flex flex-wrap gap-1.5", children: project.technologies.map((tech, i) => (_jsx("span", { className: "rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground", children: tech }, i))) }), _jsxs("div", { className: "mt-auto flex items-center justify-between border-t border-border/40 pt-3", children: [_jsx("span", { className: `rounded-full px-2.5 py-1 text-xs font-semibold ${project.status === 'Live' ? 'bg-emerald-100 text-emerald-800' : project.status === 'In Development' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}`, children: project.status }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [_jsx(Star, { className: "h-3.5 w-3.5" }), " ", project.stars, _jsx("span", { children: "\u00B7" }), " ", project.forks, " forks"] })] }), _jsxs("div", { className: "mt-3 flex gap-2", children: [project.github && _jsxs("a", { href: project.github, target: "_blank", rel: "noopener noreferrer", className: "app-btn-secondary flex-1 !py-2 !text-xs", children: [_jsx(Github, { className: "mr-1.5 h-3.5 w-3.5" }), " GitHub"] }), project.demo && _jsxs("a", { href: project.demo, target: "_blank", rel: "noopener noreferrer", className: "app-btn-primary flex-1 !py-2 !text-xs", children: [_jsx(ExternalLink, { className: "mr-1.5 h-3.5 w-3.5" }), " Demo"] })] })] })] }, project.id)))) })), activeTab === 'achievements' && (_jsxs("div", { className: "rounded-2xl border border-dashed border-border bg-card py-14 text-center shadow-soft", children: [_jsx(Trophy, { className: "mx-auto mb-3 h-10 w-10 text-muted-foreground" }), _jsx("p", { className: "font-medium text-foreground", children: "Achievements" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "More achievement tools are on the way." })] })), activeTab === 'connections' && (_jsxs("div", { className: "rounded-2xl border border-dashed border-border bg-card py-14 text-center shadow-soft", children: [_jsx(Users, { className: "mx-auto mb-3 h-10 w-10 text-muted-foreground" }), _jsx("p", { className: "font-medium text-foreground", children: "Connections" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Browse the Network page to discover mutual connections." })] }))] }), _jsxs("aside", { className: "hidden space-y-5 lg:block", children: [_jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5 shadow-soft", children: [_jsx("h3", { className: "mb-3 text-sm font-semibold text-foreground", children: "Profile Insights" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "rounded-lg bg-muted/40 p-3", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Profile views" }), _jsx("p", { className: "text-lg font-bold text-foreground", children: profileData.stats.profileViews.toLocaleString() })] }), _jsxs("div", { className: "rounded-lg bg-muted/40 p-3", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Post views" }), _jsx("p", { className: "text-lg font-bold text-foreground", children: profileData.stats.postViews.toLocaleString() })] })] })] }), _jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5 shadow-soft", children: [_jsx("h3", { className: "mb-3 text-sm font-semibold text-foreground", children: "Connect social profiles" }), _jsx("div", { className: "space-y-2", children: [{ icon: Linkedin, label: 'Connect LinkedIn', color: 'text-[#0A66C2]' }, { icon: Twitter, label: 'Connect Twitter', color: 'text-sky-500' }, { icon: Github, label: 'Connect GitHub', color: 'text-foreground' }].map((s) => (_jsxs("button", { type: "button", className: "flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/50 hover:shadow-xs", children: [_jsx(s.icon, { className: `h-4 w-4 ${s.color}` }), " ", s.label] }, s.label))) })] }), _jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5 shadow-soft", children: [_jsx("h3", { className: "mb-3 text-sm font-semibold text-foreground", children: "People you may know" }), _jsxs("div", { className: "space-y-3", children: [[1, 2, 3].map((n) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary", children: ["U", n] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("p", { className: "text-sm font-medium text-foreground truncate", children: ["User Name ", n] }), _jsx("p", { className: "text-xs text-muted-foreground truncate", children: "Developer at Company" })] }), _jsx("button", { className: "shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted", children: "Connect" })] }, n))), _jsx("button", { className: "w-full text-center text-xs font-semibold text-primary hover:underline", children: "See more connections" })] })] })] })] })] })] }));
};
export default ViewProfile;
