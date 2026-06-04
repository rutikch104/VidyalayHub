// Mock data for development
export const mockPosts = [
    {
        id: "1",
        content: "Just finished an amazing project on React! The component architecture is so clean and maintainable. #React #WebDevelopment #Programming",
        type: "text",
        visibility: "public",
        hashtags: ["React", "WebDevelopment", "Programming"],
        media_urls: [],
        mentioned_users: [],
        likes_count: 15,
        comments_count: 8,
        bookmarks_count: 3,
        views_count: 45,
        created_at: "2024-01-15T10:30:00Z",
        updated_at: "2024-01-15T10:30:00Z",
        user: {
            id: 1,
            name: "Development User",
            email: "dev@example.com",
            avatar_url: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150",
            role: "student"
        },
        is_liked: false,
        is_bookmarked: false
    },
    {
        id: "2",
        content: "Excited to share my latest achievement! Just completed the AI Interview practice session and scored 95%! The AI feedback was incredibly helpful. #AI #Interview #Career",
        type: "text",
        visibility: "public",
        hashtags: ["AI", "Interview", "Career"],
        media_urls: [],
        mentioned_users: [],
        likes_count: 23,
        comments_count: 12,
        bookmarks_count: 7,
        views_count: 67,
        created_at: "2024-01-15T09:15:00Z",
        updated_at: "2024-01-15T09:15:00Z",
        user: {
            id: 1,
            name: "Development User",
            email: "dev@example.com",
            avatar_url: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150",
            role: "student"
        },
        is_liked: true,
        is_bookmarked: false
    },
    {
        id: "3",
        content: "Found some amazing resources in the Library Center! The study materials are so well organized and comprehensive. Highly recommend checking out the new JavaScript course materials. #Study #Resources #Learning",
        type: "text",
        visibility: "public",
        hashtags: ["Study", "Resources", "Learning"],
        media_urls: [],
        mentioned_users: [],
        likes_count: 18,
        comments_count: 5,
        bookmarks_count: 12,
        views_count: 34,
        created_at: "2024-01-15T08:45:00Z",
        updated_at: "2024-01-15T08:45:00Z",
        user: {
            id: 1,
            name: "Development User",
            email: "dev@example.com",
            avatar_url: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150",
            role: "student"
        },
        is_liked: false,
        is_bookmarked: true
    },
    {
        id: "4",
        content: "Just had an incredible session with the AI English learning tool! My pronunciation improved significantly. The real-time feedback is game-changing. #English #AI #Learning #Improvement",
        type: "text",
        visibility: "public",
        hashtags: ["English", "AI", "Learning", "Improvement"],
        media_urls: [],
        mentioned_users: [],
        likes_count: 31,
        comments_count: 18,
        bookmarks_count: 9,
        views_count: 89,
        created_at: "2024-01-15T07:20:00Z",
        updated_at: "2024-01-15T07:20:00Z",
        user: {
            id: 1,
            name: "Development User",
            email: "dev@example.com",
            avatar_url: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150",
            role: "student"
        },
        is_liked: true,
        is_bookmarked: true
    },
    {
        id: "5",
        content: "The Teacher Center is amazing! Got instant help with my calculus problem. The Q&A system makes learning so much more interactive and engaging. #Math #Help #Teachers #Learning",
        type: "text",
        visibility: "public",
        hashtags: ["Math", "Help", "Teachers", "Learning"],
        media_urls: [],
        mentioned_users: [],
        likes_count: 27,
        comments_count: 14,
        bookmarks_count: 6,
        views_count: 56,
        created_at: "2024-01-15T06:30:00Z",
        updated_at: "2024-01-15T06:30:00Z",
        user: {
            id: 1,
            name: "Development User",
            email: "dev@example.com",
            avatar_url: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150",
            role: "student"
        },
        is_liked: false,
        is_bookmarked: false
    }
];
export const mockFeedItems = mockPosts.map(post => ({
    id: post.id,
    type: 'post',
    content: post,
    score: Math.random() * 100,
    created_at: post.created_at
}));
export const mockTrendingTopics = [
    { tag: "React", count: 45, type: "hashtag" },
    { tag: "AI", count: 38, type: "hashtag" },
    { tag: "JavaScript", count: 32, type: "hashtag" },
    { tag: "Interview", count: 28, type: "hashtag" },
    { tag: "Learning", count: 25, type: "hashtag" },
    { tag: "Career", count: 22, type: "hashtag" },
    { tag: "Programming", count: 20, type: "hashtag" },
    { tag: "Study", count: 18, type: "hashtag" }
];
