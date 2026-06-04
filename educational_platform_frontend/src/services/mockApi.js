// Mock API layer — returns realistic dummy data for every endpoint
// so the entire UI can be reviewed without a running backend.
// Set VITE_USE_MOCK=true in .env to use mocks; otherwise the real backend is used.
export const MOCK_MODE = import.meta.env.VITE_USE_MOCK === 'true';
const AVATAR = 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';
const AVATAR2 = 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150';
const AVATAR3 = 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150';
const AVATAR4 = 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150';
export const MOCK_USER = {
    id: '1',
    email: 'demo@rcpit.edu',
    name: 'Rahul Sharma',
    first_name: 'Rahul',
    last_name: 'Sharma',
    role: 'student',
    user_type: 'student',
    tenant_id: '1',
    tenant_name: 'RCPIT Shirpur',
    tenant_logo_url: null,
    avatar_url: AVATAR,
    title: 'Computer Science Student',
    location: 'Shirpur, Maharashtra',
};
/** Used by GET/PUT /users/profile — must not depend on loose regex matching (trailing slash, base path). */
const MOCK_PROFILE_DETAIL = {
    ...MOCK_USER,
    bio: 'Passionate about building scalable web applications. Currently exploring AI/ML and cloud computing. Open to collaboration! 🚀',
    followers_count: 156,
    following_count: 89,
    likes_count: 312,
    posts_count: 28,
    connections_count: 45,
    profile_views: 1200,
    post_views: 4500,
    is_verified: true,
    is_premium: false,
    enrollment_year: 2023,
    current_semester: 6,
    course: 'B.Tech CSE',
    department: 'Computer Science',
    university: 'RCPIT Shirpur',
    graduation_year: 2027,
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker'],
    linkedin_url: '#',
    github_url: '#',
    twitter_url: '#',
    website_url: '#',
    achievements: [{ id: 'a1', title: "Dean's List", description: 'Maintained GPA above 9.0', icon: 'Trophy', date: '2025-06' }],
    certifications: ['AWS Cloud Practitioner', 'Meta React Developer'],
    clubs: ['Coding Club', 'IEEE Student Branch'],
    events: ['TechFest 2025', 'SIH 2025'],
    projects: [
        {
            id: '1',
            title: 'Campus Connect',
            description: 'Social networking platform',
            technologies: ['React', 'Node.js'],
            status: 'Completed',
            image_url: '',
            github_url: '#',
            live_url: '#',
        },
    ],
    profile_completion: 85,
};
/** Mutable copy for mock profile section edits (GET /users/profile returns this). */
let mockProfileMutable = {
    ...MOCK_PROFILE_DETAIL,
    headline: 'Final-year CSE · Full-stack & cloud',
    experience_list: [
        { id: 'ex-m1', title: 'Summer Intern', company: 'Campus Labs', duration: 'May – Jul 2025', description: 'Built internal dashboards with React and Node.' },
    ],
    skills_detailed: [
        { id: 'sk-m1', name: 'React', level: 8 },
        { id: 'sk-m2', name: 'Node.js', level: 7 },
    ],
    teaching_info: { subjects: ['Data Structures', 'Web Programming'], experience_years: 4, notes: 'Office hours: Tue 4–6pm' },
};
let mockProjectsStore = [
    {
        id: '1',
        title: 'Campus Connect',
        description: 'Social networking platform for colleges',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
        status: 'Completed',
        image_url: '',
        github_url: '#',
        live_url: '#',
    },
];
let mockPublicationsStore = [
    {
        id: 'pub-m1',
        title: 'Adaptive scheduling for campus networks',
        venue: 'NCCC 2025',
        year: '2025',
        description: 'Short paper on load-aware timetabling.',
        url: '#',
    },
];
const now = new Date().toISOString();
const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();
const mockPosts = [
    {
        id: '101', content: 'Just completed my final year project on AI-powered campus management! 🎓 So grateful for the guidance from Prof. Patil. #FinalYear #AI #RCPIT',
        type: 'text', visibility: 'public', hashtags: ['FinalYear', 'AI', 'RCPIT'], media_urls: [], mentioned_users: [],
        likes_count: 42, comments_count: 8, views_count: 230, is_liked: false, is_bookmarked: false,
        created_at: ago(2), updated_at: ago(2),
        user: { id: '2', name: 'Priya Deshmukh', avatar_url: AVATAR3, title: 'CSE Final Year' },
    },
    {
        id: '102', content: 'Looking for team members for Smart India Hackathon 2026. Need: 1 ML dev, 1 UI/UX designer, 1 backend dev. DM me! 💪\n\n#SIH2026 #Hackathon #TeamUp',
        type: 'text', visibility: 'public', hashtags: ['SIH2026', 'Hackathon', 'TeamUp'], media_urls: [], mentioned_users: [],
        likes_count: 67, comments_count: 15, views_count: 510, is_liked: true, is_bookmarked: true,
        created_at: ago(5), updated_at: ago(5),
        user: { id: '3', name: 'Amit Patel', avatar_url: AVATAR2, title: 'IT Department, 3rd Year' },
    },
    {
        id: '103', content: 'Today\'s workshop on "Cloud Computing with AWS" was incredible! Thanks to the CSE department for organizing. Here are my notes and key takeaways... 📝',
        type: 'image', visibility: 'college_only', hashtags: ['AWS', 'CloudComputing', 'Workshop'], media_urls: ['https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800'], mentioned_users: [],
        likes_count: 89, comments_count: 12, views_count: 420, is_liked: false, is_bookmarked: false,
        created_at: ago(8), updated_at: ago(8),
        user: { id: '4', name: 'Sneha Joshi', avatar_url: AVATAR4, title: 'Cloud Enthusiast | CSE' },
    },
    {
        id: '104', content: 'Can anyone help me with this React hook issue? I\'m getting an infinite re-render loop when using useEffect with an object dependency.\n\n```jsx\nuseEffect(() => {\n  fetchData(filters);\n}, [filters]); // filters is an object\n```\n\nWhat\'s the best approach?',
        type: 'question', visibility: 'public', hashtags: ['React', 'JavaScript', 'Help'], media_urls: [], mentioned_users: [],
        likes_count: 23, comments_count: 19, views_count: 380, is_liked: false, is_bookmarked: false,
        created_at: ago(12), updated_at: ago(12),
        user: { id: '5', name: 'Vikram Singh', avatar_url: AVATAR2, title: 'Full Stack Developer' },
    },
];
const mockComments = [
    {
        id: 'c1',
        text: 'Great work! Would love to see a demo.',
        created_at: ago(1),
        user: { id: '3', name: 'Amit Patel', avatar_url: AVATAR2 },
        replies: [
            { id: 'c1-r1', text: 'Thanks! I will upload one soon.', created_at: ago(0.8), parent_comment_id: 'c1', user: { id: '1', name: 'Rutik Chaudhari', avatar_url: AVATAR } },
        ],
    },
    { id: 'c2', text: 'This is really inspiring! Keep it up 🔥', created_at: ago(2), user: { id: '4', name: 'Sneha Joshi', avatar_url: AVATAR4 }, replies: [] },
    { id: 'c3', text: 'I had the same issue. Try useMemo for the filters object.', created_at: ago(3), user: { id: '2', name: 'Priya Deshmukh', avatar_url: AVATAR3 }, replies: [] },
];
const mockNotifications = [
    { id: 'n1', type: 'like', title: 'New Like', message: 'Priya Deshmukh liked your post', is_read: false, priority: 'medium', created_at: ago(1), sender: { id: '2', name: 'Priya Deshmukh', avatar_url: AVATAR3 } },
    { id: 'n2', type: 'comment', title: 'New Comment', message: 'Amit Patel commented on your post', is_read: false, priority: 'medium', created_at: ago(3), sender: { id: '3', name: 'Amit Patel', avatar_url: AVATAR2 } },
    { id: 'n3', type: 'connection', title: 'Connection Request', message: 'Sneha Joshi wants to connect', is_read: true, priority: 'low', created_at: ago(6), read_at: ago(5), sender: { id: '4', name: 'Sneha Joshi', avatar_url: AVATAR4 } },
    { id: 'n4', type: 'mention', title: 'Mentioned You', message: 'You were mentioned in a post by Vikram', is_read: true, priority: 'low', created_at: ago(24), read_at: ago(20), sender: { id: '5', name: 'Vikram Singh', avatar_url: AVATAR2 } },
];
const mockThreads = [
    {
        id: 't1', thread_type: 'direct', created_by: '1', created_at: ago(2), updated_at: ago(0.5),
        name: null, avatar_url: AVATAR3, display_name: 'Priya Deshmukh',
        participants: [
            { id: 'p1', thread_id: 't1', user_id: '1', role: 'member', joined_at: ago(48), is_muted: false, last_read_at: ago(1), unread_count: 2, user: MOCK_USER },
            { id: 'p2', thread_id: 't1', user_id: '2', role: 'member', joined_at: ago(48), is_muted: false, last_read_at: ago(2), unread_count: 0, user: { id: '2', name: 'Priya Deshmukh', first_name: 'Priya', last_name: 'Deshmukh', avatar_url: AVATAR3 } },
        ],
        last_message: { id: 'm3', thread_id: 't1', sender_id: '2', message: 'Sure, let\'s meet at the library at 4 PM!', message_type: 'text', created_at: ago(0.5), is_edited: false, sender: { id: '2', name: 'Priya Deshmukh', avatar_url: AVATAR3 } },
        unread_count: 2,
    },
    {
        id: 't2', thread_type: 'direct', created_by: '3', created_at: ago(24), updated_at: ago(3),
        name: null, avatar_url: AVATAR2, display_name: 'Amit Patel',
        participants: [
            { id: 'p3', thread_id: 't2', user_id: '1', role: 'member', joined_at: ago(24), is_muted: false, last_read_at: ago(3), unread_count: 0, user: MOCK_USER },
            { id: 'p4', thread_id: 't2', user_id: '3', role: 'member', joined_at: ago(24), is_muted: false, last_read_at: ago(3), unread_count: 0, user: { id: '3', name: 'Amit Patel', first_name: 'Amit', last_name: 'Patel', avatar_url: AVATAR2 } },
        ],
        last_message: { id: 'm5', thread_id: 't2', sender_id: '1', message: 'I\'ll send you the project repo link tonight.', message_type: 'text', created_at: ago(3), is_edited: false, sender: MOCK_USER },
        unread_count: 0,
    },
];
const mockMessagesSeed = [
    { id: 'm1', thread_id: 't1', sender_id: '1', receiver_id: '2', message: 'Hey Priya! Are you free to study for the DBMS exam?', message_type: 'text', created_at: ago(2), is_edited: false, is_read: true, sender: MOCK_USER },
    { id: 'm2', thread_id: 't1', sender_id: '2', receiver_id: '1', message: 'Yes! I was just about to message you about that.', message_type: 'text', created_at: ago(1.5), is_edited: false, is_read: true, sender: { id: '2', name: 'Priya Deshmukh', first_name: 'Priya', last_name: 'Deshmukh', avatar_url: AVATAR3 } },
    { id: 'm3', thread_id: 't1', sender_id: '2', receiver_id: '1', message: 'Sure, let\'s meet at the library at 4 PM!', message_type: 'text', created_at: ago(0.5), is_edited: false, is_read: false, sender: { id: '2', name: 'Priya Deshmukh', first_name: 'Priya', last_name: 'Deshmukh', avatar_url: AVATAR3 } },
];
let mockChatMessages = [...mockMessagesSeed];
const mockCommunities = [
    { id: 'cm1', name: 'CSE Department', description: 'Official community for Computer Science & Engineering students', member_count: 345, category: 'Academic', is_member: true, is_admin: false, avatar_url: '', privacy: 'public', created_at: ago(720) },
    { id: 'cm2', name: 'Coding Club RCPIT', description: 'Weekly coding challenges, hackathon prep, and competitive programming', member_count: 210, category: 'Club', is_member: true, is_admin: true, avatar_url: '', privacy: 'public', created_at: ago(480) },
    { id: 'cm3', name: 'Placement Prep 2026', description: 'Resources, mock interviews, and tips for campus placements', member_count: 580, category: 'Career', is_member: false, is_admin: false, avatar_url: '', privacy: 'public', created_at: ago(240) },
    { id: 'cm4', name: 'Research & Innovation', description: 'Collaborate on research papers and innovative projects', member_count: 89, category: 'Research', is_member: false, is_admin: false, avatar_url: '', privacy: 'public', created_at: ago(360) },
];
const mockJobs = [
    { id: 'j1', title: 'Frontend Developer Intern', company: 'TechCorp India', location: 'Mumbai, Remote', job_type: 'internship', salary_range: { min: 15000, max: 25000, currency: 'INR' }, description: 'Looking for a passionate React developer to join our team for a 6-month internship.', requirements: ['React', 'JavaScript', 'CSS'], skills_required: ['React', 'TypeScript'], posted_by: '10', status: 'active', created_at: ago(24), deadline: new Date(Date.now() + 30 * 86400000).toISOString(), applications_count: 23 },
    { id: 'j2', title: 'Full Stack Developer', company: 'StartupXYZ', location: 'Pune', job_type: 'full-time', salary_range: { min: 500000, max: 800000, currency: 'INR' }, description: 'Join our fast-growing startup as a full stack developer working with MERN stack.', requirements: ['Node.js', 'React', 'MongoDB'], skills_required: ['Node.js', 'React'], posted_by: '11', status: 'active', created_at: ago(48), deadline: new Date(Date.now() + 15 * 86400000).toISOString(), applications_count: 45 },
    { id: 'j3', title: 'ML Research Assistant', company: 'RCPIT Research Lab', location: 'Shirpur', job_type: 'part-time', salary_range: { min: 10000, max: 15000, currency: 'INR' }, description: 'Assist in ongoing machine learning research projects under Prof. Kulkarni.', requirements: ['Python', 'TensorFlow', 'Research'], skills_required: ['Python', 'ML'], posted_by: '12', status: 'active', created_at: ago(72), deadline: new Date(Date.now() + 7 * 86400000).toISOString(), applications_count: 12 },
];
const mockEvents = [
    { id: 'e1', title: 'TechFest 2026', description: 'Annual technical festival with competitions, workshops, and guest lectures', date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), start_date: new Date(Date.now() + 7 * 86400000).toISOString(), start_time: '09:00', end_time: '18:00', location: 'RCPIT Main Auditorium', organizer: 'Student Council', category: 'Technical', max_participants: 500, current_participants: 312, status: 'upcoming', created_at: ago(168) },
    { id: 'e2', title: 'Resume Building Workshop', description: 'Learn how to create an impactful resume for campus placements', date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), start_date: new Date(Date.now() + 3 * 86400000).toISOString(), start_time: '14:00', end_time: '16:00', location: 'Seminar Hall B', organizer: 'Training & Placement Cell', category: 'Career', max_participants: 100, current_participants: 78, status: 'upcoming', created_at: ago(96) },
    { id: 'e3', title: 'Hackathon: Code for Change', description: '24-hour hackathon focused on social impact projects', date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), start_date: new Date(Date.now() + 14 * 86400000).toISOString(), start_time: '08:00', end_time: '08:00', location: 'CSE Lab Complex', organizer: 'Coding Club', category: 'Competition', max_participants: 200, current_participants: 156, status: 'upcoming', created_at: ago(48) },
];
const mockBookmarks = [
    { id: 'b1', content_type: 'post', content_id: '101', created_at: ago(5), content: mockPosts[0] },
    { id: 'b2', content_type: 'post', content_id: '102', created_at: ago(10), content: mockPosts[1] },
];
const mockResources = [
    { id: 'r1', title: 'Data Structures & Algorithms Notes', description: 'Comprehensive DSA notes covering arrays, trees, graphs, and dynamic programming', file_url: '#', file_type: 'pdf', file_size: 2500000, subject: 'CSE', tags: ['DSA', 'Algorithms'], uploaded_by: '2', uploader: { id: '2', name: 'Priya Deshmukh', avatar_url: AVATAR3 }, likes_count: 156, downloads_count: 892, views_count: 2100, comments_count: 23, is_featured: true, created_at: ago(720) },
    { id: 'r2', title: 'DBMS Previous Year Question Papers', description: 'Collection of DBMS question papers from 2020-2025 with solutions', file_url: '#', file_type: 'pdf', file_size: 5200000, subject: 'CSE', tags: ['DBMS', 'ExamPrep'], uploaded_by: '3', uploader: { id: '3', name: 'Amit Patel', avatar_url: AVATAR2 }, likes_count: 234, downloads_count: 1340, views_count: 3200, comments_count: 45, is_featured: true, created_at: ago(480) },
    { id: 'r3', title: 'Machine Learning with Python - Lab Manual', description: 'Step-by-step ML experiments with scikit-learn and TensorFlow', file_url: '#', file_type: 'pdf', file_size: 3800000, subject: 'AI/ML', tags: ['ML', 'Python'], uploaded_by: '4', uploader: { id: '4', name: 'Sneha Joshi', avatar_url: AVATAR4 }, likes_count: 89, downloads_count: 567, views_count: 1500, comments_count: 12, is_featured: false, created_at: ago(240) },
];
const mockNetworkUsers = [
    { id: '2', connection_id: 'cn1', first_name: 'Priya', last_name: 'Deshmukh', profile_picture: AVATAR3, user_type: 'student' },
    { id: '3', connection_id: 'cn2', first_name: 'Amit', last_name: 'Patel', profile_picture: AVATAR2, user_type: 'student' },
    { id: '4', connection_id: 'cn3', first_name: 'Sneha', last_name: 'Joshi', profile_picture: AVATAR4, user_type: 'student' },
];
const mockSuggestions = [
    { id: '6', first_name: 'Raj', last_name: 'Kulkarni', profile_picture: AVATAR2, user_type: 'teacher' },
    { id: '7', first_name: 'Anita', last_name: 'More', profile_picture: AVATAR4, user_type: 'student' },
    { id: '8', first_name: 'Deepak', last_name: 'Thakur', profile_picture: AVATAR, user_type: 'alumni' },
];
const mockTeachers = [
    { id: '10', first_name: 'Dr. Rajesh', last_name: 'Patil', email: 'rajesh.patil@rcpit.edu', department: 'CSE', designation: 'Professor & HOD', specialization: 'AI & ML', avatar_url: AVATAR2, rating: 4.8, total_reviews: 45, subjects: ['Machine Learning', 'Artificial Intelligence', 'Deep Learning'] },
    { id: '11', first_name: 'Prof. Smita', last_name: 'Kulkarni', email: 'smita.k@rcpit.edu', department: 'CSE', designation: 'Associate Professor', specialization: 'Database Systems', avatar_url: AVATAR4, rating: 4.5, total_reviews: 38, subjects: ['DBMS', 'Data Warehousing', 'Big Data'] },
    { id: '12', first_name: 'Dr. Vikram', last_name: 'Desai', email: 'vikram.d@rcpit.edu', department: 'IT', designation: 'Assistant Professor', specialization: 'Cloud Computing', avatar_url: AVATAR, rating: 4.6, total_reviews: 29, subjects: ['Cloud Computing', 'DevOps', 'Microservices'] },
];
const mockAdminStats = {
    total_users: 2450, active_users: 1890, total_posts: 12560, total_communities: 24,
    total_jobs: 156, total_events: 45, total_resources: 890, pending_reports: 12,
    new_users_today: 15, new_posts_today: 87, storage_used: '45.2 GB', uptime: '99.97%',
};

/** Shapes mirror `educational_platform_backend/controllers/superAdminCompatController.js` + `superAdminService.js`. */
const MOCK_SUPER_COLLEGES = [
    {
        id: 'mock-tenant-1',
        name: 'RCPIT Shirpur',
        type: 'University',
        location: 'Shirpur, Maharashtra',
        domain: 'https://rcpit.edu.in',
        admin: { name: 'Registrar Office', email: 'registrar@rcpit.edu', phone: '' },
        users: { students: 1850, teachers: 48, staff: 6 },
        subscription: { plan: 'Premium', status: 'Active', expiryDate: '2026-12-31', monthlyFee: 49999 },
        status: 'Active',
        joined: ago(2000),
        lastActivity: ago(3),
        storage: { used: 38, limit: 100 },
        features: ['Core platform', 'Communities', 'Jobs', 'Events'],
        revenue: 0,
        growth: 0,
    },
    {
        id: 'mock-tenant-2',
        name: 'Demo Engineering College',
        type: 'Engineering',
        location: 'Pune, Maharashtra',
        domain: 'https://demo-college.edu',
        admin: { name: 'IT Admin', email: 'admin@demo-college.edu', phone: '' },
        users: { students: 320, teachers: 22, staff: 2 },
        subscription: { plan: 'Basic', status: 'Trial', expiryDate: '2025-08-01', monthlyFee: 9999 },
        status: 'Trial',
        joined: ago(500),
        lastActivity: ago(24),
        storage: { used: 12, limit: 50 },
        features: ['Core platform'],
        revenue: 0,
        growth: 0,
    },
];
const MOCK_SUPER_USERS = [
    { id: 'su-1', name: 'Rahul Sharma', email: 'demo@rcpit.edu', user_type: 'student', tenant_id: 'mock-tenant-1', status: 'Active', created_at: ago(400) },
    { id: 'su-2', name: 'Priya Deshmukh', email: 'priya.d@rcpit.edu', user_type: 'student', tenant_id: 'mock-tenant-1', status: 'Active', created_at: ago(300) },
    { id: 'su-3', name: 'Dr. Rajesh Patil', email: 'rajesh.patil@rcpit.edu', user_type: 'teacher', tenant_id: 'mock-tenant-1', status: 'Active', created_at: ago(2000) },
    { id: 'su-4', name: 'Amit Kulkarni', email: 'amit@demo-college.edu', user_type: 'alumni', tenant_id: 'mock-tenant-2', status: 'Inactive', created_at: ago(800) },
];

function matchSuperAdmin(method, u, _body) {
    if (!u.includes('/super-admin'))
        return undefined;

    if (method === 'GET' && /\/super-admin\/metrics(?:\?|$)/.test(u)) {
        return {
            status: true,
            data: {
                totalColleges: 2,
                totalStudents: 2170,
                totalTeachers: 70,
                activeUsers: 2300,
                revenue: 0,
                storageUsed: 18,
                serverLoad: 12,
                uptime: 99.9,
                growth: { colleges: 1, students: 45, revenue: 0 },
            },
        };
    }
    if (method === 'GET' && /\/super-admin\/users(?:\?|$)/.test(u)) {
        return {
            status: true,
            data: {
                users: MOCK_SUPER_USERS,
                pagination: { total: MOCK_SUPER_USERS.length, page: 1, pages: 1 },
            },
        };
    }
    if (method === 'GET' && /\/super-admin\/colleges\/[^/]+\/stats(?:\?|$)/.test(u)) {
        const id = u.match(/\/super-admin\/colleges\/([^/]+)\/stats/)?.[1] || 'mock-tenant-1';
        const c = MOCK_SUPER_COLLEGES.find((x) => x.id === id) || MOCK_SUPER_COLLEGES[0];
        return {
            status: true,
            data: {
                users: c.users,
                status: c.status,
                subscription: c.subscription,
            },
        };
    }
    if (method === 'GET' && /\/super-admin\/colleges\/[^/?]+$/.test(u) && !u.includes('/stats')) {
        const id = u.match(/\/super-admin\/colleges\/([^/?]+)/)?.[1];
        const c = MOCK_SUPER_COLLEGES.find((x) => x.id === id) || MOCK_SUPER_COLLEGES[0];
        return { status: true, data: { ...c } };
    }
    if (method === 'GET' && /\/super-admin\/colleges(?:\?|$)/.test(u)) {
        return {
            status: true,
            data: {
                colleges: MOCK_SUPER_COLLEGES,
                pagination: { total: MOCK_SUPER_COLLEGES.length, page: 1, pages: 1 },
            },
        };
    }
    if (method === 'GET' && /\/super-admin\/analytics(?:\?|$)/.test(u)) {
        return {
            status: true,
            data: {
                userGrowth: {
                    labels: ['student', 'teacher', 'alumni', 'staff'],
                    datasets: [
                        {
                            label: 'Users by role',
                            data: [1800, 65, 120, 8],
                            borderColor: '#2563EB',
                            backgroundColor: 'rgba(37, 99, 235, 0.25)',
                        },
                    ],
                },
                revenueChart: {
                    labels: ['Billing not configured'],
                    datasets: [{ label: 'Revenue', data: [0], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.2)' }],
                },
                collegeDistribution: {
                    labels: ['Approved', 'Pending'],
                    datasets: [{ data: [2, 1], backgroundColor: ['#4F46E5', '#F59E0B'] }],
                },
                activityMetrics: {
                    dailyActiveUsers: 0,
                    weeklyActiveUsers: 0,
                    monthlyActiveUsers: 52,
                    engagementRate: 2.3,
                },
            },
        };
    }
    if (method === 'GET' && /\/super-admin\/revenue(?:\?|$)/.test(u)) {
        return { status: true, data: { series: [], total: 0 } };
    }
    if (method === 'GET' && /\/super-admin\/health(?:\?|$)/.test(u)) {
        return { status: true, data: { serverLoad: 8, storageUsed: 15, uptime: 99.9, db: 'connected' } };
    }
    if (method === 'GET' && /\/super-admin\/activities(?:\?|$)/.test(u)) {
        return {
            status: true,
            data: {
                activities: [
                    { id: 'a1', message: 'New student', details: 'demo@rcpit.edu joined RCPIT', timestamp: ago(2) },
                    { id: 'a2', message: 'Tenant / college', details: 'Demo Engineering College (pending)', timestamp: ago(8) },
                    { id: 'a3', message: 'New teacher', details: 'rajesh.patil@rcpit.edu', timestamp: ago(24) },
                ],
            },
        };
    }
    if (method === 'GET' && /\/super-admin\/settings(?:\?|$)/.test(u)) {
        return { status: true, data: { maintenance_mode: false, signup_open: true } };
    }
    if (method === 'PUT' && /\/super-admin\/settings(?:\?|$)/.test(u)) {
        return { status: true, message: 'Mock: settings saved.' };
    }
    if (method === 'POST' && /\/super-admin\/colleges\/[^/]+\/notify/.test(u)) {
        return { status: true, message: 'Mock: notification queued.' };
    }
    if (method === 'POST' && /\/super-admin\/colleges(?:\?|$)/.test(u)) {
        const newRow = {
            ...MOCK_SUPER_COLLEGES[1],
            id: `mock-tenant-${Date.now()}`,
            name: 'New institution (mock)',
            status: 'Pending',
        };
        return { status: true, data: newRow };
    }
    if (method === 'PUT' && /\/super-admin\/colleges\/[^/]+\/status/.test(u)) {
        const c = { ...MOCK_SUPER_COLLEGES[0] };
        return { status: true, data: c };
    }
    if (method === 'PUT' && /\/super-admin\/colleges\/[^/]+\/subscription/.test(u)) {
        return { status: true, message: 'Mock: subscription updated.' };
    }
    if (method === 'PUT' && /\/super-admin\/colleges\/[^/]+/.test(u) && !u.includes('/status') && !u.includes('/subscription')) {
        return { status: true, data: { ...MOCK_SUPER_COLLEGES[0] } };
    }
    if (method === 'DELETE' && /\/super-admin\/colleges\/[^/]+/.test(u)) {
        return { status: true, message: 'Deleted (mock).' };
    }
    return undefined;
}

const MOCK_RBAC_ROLES = [
    { id: 'r-super', name: 'SUPER_ADMIN', description: 'Platform super administrator', permissions: [] },
    { id: 'r-user', name: 'USER', description: 'Default role', permissions: [] },
];
const MOCK_RBAC_PERMISSIONS = [
    { id: 'rp1', resource: 'users', action: 'read', key: 'users:read', description: 'Read users' },
    { id: 'rp2', resource: 'users', action: 'write', key: 'users:write', description: 'Write users' },
    { id: 'rp3', resource: 'roles', action: 'read', key: 'roles:read', description: 'Read roles' },
    { id: 'rp4', resource: 'roles', action: 'write', key: 'roles:write', description: 'Write roles' },
    { id: 'rp5', resource: 'permissions', action: 'read', key: 'permissions:read', description: 'Read permissions' },
    { id: 'rp6', resource: 'permissions', action: 'write', key: 'permissions:write', description: 'Write permissions' },
];
MOCK_RBAC_ROLES[0].permissions = [...MOCK_RBAC_PERMISSIONS];

function matchRbac(method, u, body) {
    if (!u.includes('/rbac'))
        return undefined;
    if (method === 'GET' && /\/rbac\/me-access(?:\?|$)/.test(u)) {
        return {
            status: true,
            data: {
                role: { id: 'r-super', name: 'SUPER_ADMIN' },
                permissions: MOCK_RBAC_PERMISSIONS.map((x) => x.key),
                canAccessAdminPanel: true,
            },
        };
    }
    if (method === 'GET' && /\/rbac\/users(?:\?|$)/.test(u)) {
        return {
            status: true,
            data: {
                users: [
                    { id: 'u1', email: 'super@local.dev', name: 'Super Admin', role_id: 'r-super', role_name: 'SUPER_ADMIN' },
                    { id: 'u2', email: 'demo@rcpit.edu', name: 'Demo User', role_id: 'r-user', role_name: 'USER' },
                ],
                total: 2,
            },
        };
    }
    if (method === 'PUT' && /\/rbac\/users\/[^/]+\/role/.test(u)) {
        const role = MOCK_RBAC_ROLES.find((r) => r.id === body?.role_id) || MOCK_RBAC_ROLES[1];
        return { status: true, data: { user_id: 'u2', role_id: role.id, role_name: role.name } };
    }
    if (method === 'GET' && /\/rbac\/roles(?:\?|$)/.test(u))
        return { status: true, data: MOCK_RBAC_ROLES };
    if (method === 'POST' && /\/rbac\/roles(?:\?|$)/.test(u)) {
        const name = String(body?.name || '').trim().toUpperCase();
        return { status: true, data: { id: `r-${Date.now()}`, name, description: null, permissions: [] } };
    }
    if (method === 'PUT' && /\/rbac\/roles\/[^/]+\/permissions/.test(u))
        return { status: true, data: MOCK_RBAC_ROLES[0] };
    if (method === 'GET' && /\/rbac\/permissions(?:\?|$)/.test(u))
        return { status: true, data: MOCK_RBAC_PERMISSIONS };
    if (method === 'POST' && /\/rbac\/permissions(?:\?|$)/.test(u)) {
        const resource = String(body?.resource || '').trim().toLowerCase();
        const action = String(body?.action || '').trim().toLowerCase();
        return {
            status: true,
            data: {
                id: `rp-${Date.now()}`,
                resource,
                action,
                key: `${resource}:${action}`,
                description: body?.description || null,
            },
        };
    }
    return undefined;
}

// Route matcher
function matchRoute(method, url, body = {}) {
    const u = url.replace(/\?.*$/, '');
    /** Path without trailing slash — reliable suffix checks for /users/profile */
    const pathNoTrailing = u.replace(/\/+$/, '');
    // Auth
    if (u.includes('/auth/signin'))
        return { data: { token: 'mock-token-123', user: MOCK_USER } };
    if (u.includes('/super-admin-auth/login'))
        return { data: { token: 'mock-super-admin-token', user: { ...MOCK_USER, role_name: 'SUPER_ADMIN', name: 'Super Admin Owner' } } };
    if (u.includes('/super-admin-auth/me'))
        return { status: true, data: { ...MOCK_USER, role_name: 'SUPER_ADMIN', name: 'Super Admin Owner' } };
    if (u.includes('/super-admin-auth/owners') && method === 'GET')
        return {
            status: true,
            data: {
                owners: [
                    { id: 'sa-1', first_name: 'Platform', last_name: 'Owner', email: 'owner@vidhyalayhub.dev', access: true, created_at: now },
                    { id: 'sa-2', first_name: 'Ops', last_name: 'Admin', email: 'ops@vidhyalayhub.dev', access: true, created_at: now },
                ],
            },
        };
    if (u.includes('/super-admin-auth/owners') && method === 'POST')
        return {
            status: true,
            data: {
                id: `sa-${Date.now()}`,
                first_name: body?.first_name || 'New',
                last_name: body?.last_name || 'Owner',
                email: body?.email || `owner-${Date.now()}@vidhyalayhub.dev`,
                access: true,
                role_name: 'SUPER_ADMIN',
            },
        };
    if (u.includes('/auth/register'))
        return { data: { token: 'mock-token-123', user: MOCK_USER } };
    if (u.includes('/tenants/public/approved-colleges'))
        return {
            status: true,
            data: {
                colleges: [
                    { tenant_id: '1', name: 'RCPIT Shirpur (mock)', type: 'University', city: 'Shirpur', state: 'MH' },
                ],
            },
        };
    if (u.includes('/tenants/createtenants') && method === 'POST')
        return {
            status: true,
            message: 'Application received (mock).',
            data: { tenant_id: `mock-${Date.now()}`, name: body?.name || 'College' },
        };
    if (u.includes('/branding/institution'))
        return {
            status: true,
            data: {
                branding: {
                    tenant_id: MOCK_USER.tenant_id,
                    name: MOCK_USER.tenant_name,
                    logo_url: MOCK_USER.tenant_logo_url,
                    type: 'University',
                    status: 'approved',
                },
            },
        };
    if (u.includes('/auth/me'))
        return { data: MOCK_USER };
    if (u.includes('/auth/logout'))
        return { status: true };
    // Posts
    if (u.includes('/posts/trending-hashtags'))
        return {
            status: true,
            data: [
                { tag: 'fitness' },
                { tag: 'finance' },
                { tag: 'film' },
                { tag: 'RCPIT' },
                { tag: 'Placements' },
                { tag: 'Hackathon' },
                { tag: 'AI' },
                { tag: 'React' },
            ],
        };
    if (u.includes('/posts') && method === 'GET' && !u.includes('/comments'))
        return { status: true, data: { posts: mockPosts, pagination: { total: mockPosts.length, page: 1, pages: 1 } } };
    if (u.match(/\/posts\/[^/]+\/comments/) && method === 'GET')
        return { status: true, data: { comments: mockComments, pagination: { total: 3, page: 1, pages: 1 } } };
    if (u.match(/\/posts\/[^/]+\/comments/) && method === 'POST') {
        const text = String(body?.text || '').trim();
        if (!text)
            return { status: false, message: 'Comment text is required.' };
        const parentId = body?.parent_comment_id;
        const comment = {
            id: 'c-new-' + Date.now(),
            text,
            created_at: now,
            parent_comment_id: parentId || null,
            user: { ...MOCK_USER, avatar_url: MOCK_USER.avatar_url || AVATAR },
            replies: [],
        };
        return { status: true, data: comment };
    }
    if (u.match(/\/posts\/[^/]+\/like/))
        return { status: true, data: { is_liked: true, likes_count: 43 } };
    if (u.includes('/posts') && method === 'POST')
        return { status: true, data: { ...mockPosts[0], id: 'p-new-' + Date.now(), content: 'New post created!', created_at: now } };
    if (u.includes('/posts') && method === 'PUT')
        return { status: true, data: mockPosts[0] };
    if (u.includes('/posts') && method === 'DELETE')
        return { status: true };
    // Feed
    if (u.includes('/feed/trending-detailed'))
        return { status: true, data: { hashtags: [{ tag: 'RCPIT', count: 45.2 }, { tag: 'Placements', count: 38.1 }, { tag: 'Hackathon', count: 29.5 }], skills: [{ skill: 'React', count: 23 }, { skill: 'Python', count: 19 }, { skill: 'AWS', count: 12 }] } };
    if (u.includes('/feed/trending'))
        return { status: true, data: { topics: [{ type: 'hashtag', name: 'RCPIT', count: 45 }] } };
    if (u.includes('/feed/sidebar/notices') || u.includes('/feed/tenant-notices')) {
        const mockCollegeNotice = {
            id: 'tn-mock-1',
            source: 'college',
            title: 'Mid-semester examination schedule',
            body: 'Theory papers begin next week. Check room allocation on the academics portal.',
            body_full:
                'Theory papers begin next week. Check room allocation on the academics portal. Bring your college ID and hall ticket. Contact the exam cell for clashes.',
            college_name: 'RCPIT Shirpur',
            author_name: 'Examination Cell',
            starts_at: new Date(Date.now() - 2 * 86400000).toISOString(),
            ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
            is_pinned: true,
            created_at: ago(12),
            community_id: null,
            community_name: null,
        };
        return { status: true, data: { notices: [mockCollegeNotice] } };
    }
    if (u.includes('/feed'))
        return { status: true, data: { items: [], total: 0 } };
    // Notifications
    if (u.includes('/notifications/stats'))
        return { status: true, data: { total: mockNotifications.length, unread: 2, by_type: { like: { read: 1, unread: 1 }, comment: { read: 0, unread: 1 } }, by_read_status: { read: mockNotifications.length - 2, unread: 2 } } };
    if (u.includes('/notifications/settings'))
        return { status: true, data: { user_id: 'u1', email_notifications: true, push_notifications: true, in_app_notifications: true, sms_notifications: false, notification_types: { social: true, professional: true, messages: true, learning: true, system: true }, email_frequency: 'daily', quiet_hours: { enabled: false, start_time: '22:00', end_time: '07:00', timezone: 'Asia/Kolkata' }, do_not_disturb: false, created_at: ago(30), updated_at: ago(1) } };
    if (u.includes('/notifications/unread-count'))
        return { status: true, data: { unread_count: 3 } };
    if (u.includes('/notifications') && method === 'GET')
        return { status: true, data: { notifications: mockNotifications, pagination: { total: mockNotifications.length, page: 1, pages: 1 }, unread_count: 2 } };
    if (u.includes('/notifications') && (method === 'PUT' || method === 'PATCH' || method === 'POST' || method === 'DELETE'))
        return { status: true, data: {} };
    // Messages (order: specific paths before POST /messages and GET /messages/:userId)
    if (u.includes('/messages/unread-count'))
        return { status: true, data: { total_unread: 2, threads: [] } };
    if (pathNoTrailing.endsWith('/messages/conversations') && method === 'GET') {
        return {
            status: true,
            data: {
                threads: mockThreads,
                conversations: mockThreads,
                pagination: { total: mockThreads.length, page: 1, pages: 1, totalPages: 1 },
            },
        };
    }
    if (u.includes('/messages/threads/direct') && method === 'POST') {
        const uid = String(body?.user2_id || body?.user_id || '2');
        const thread = uid === '3' ? mockThreads[1] : mockThreads[0];
        return { status: true, data: { ...thread } };
    }
    if (u.match(/\/messages\/threads\/[^/]+\/messages/) && method === 'GET') {
        const tid = u.match(/\/messages\/threads\/([^/]+)\/messages/)?.[1];
        const msgs = mockChatMessages.filter((m) => m.thread_id === tid);
        return { status: true, data: { messages: msgs, pagination: { total: msgs.length, page: 1, pages: 1, totalPages: 1 } } };
    }
    if (u.includes('/messages/threads') && !u.match(/\/threads\/[^/]+\/messages/))
        return { status: true, data: { threads: mockThreads, pagination: { total: mockThreads.length, page: 1, pages: 1, totalPages: 1 } } };
    if (pathNoTrailing.endsWith('/messages') && method === 'POST' && !u.includes('/threads')) {
        const rid = String(body?.recipient_id || body?.user_id || '');
        const text = String(body?.content || body?.message || '').trim();
        if (!rid || !text)
            return { status: false, message: 'Message cannot be empty.' };
        const nm = {
            id: `m-${Date.now()}`,
            thread_id: 't1',
            sender_id: MOCK_USER.id,
            receiver_id: rid,
            message: text,
            message_type: 'text',
            created_at: now,
            sender: MOCK_USER,
            is_read: false,
        };
        mockChatMessages = [...mockChatMessages, nm];
        return { status: true, message: 'ok', data: nm, thread_id: 't1' };
    }
    if (method === 'GET' && /\/messages\/[^/]+$/.test(pathNoTrailing)) {
        const seg = pathNoTrailing.split('/').pop();
        if (['threads', 'unread-count', 'conversations'].includes(seg))
            return undefined;
        const msgs = mockChatMessages.filter((m) => m.thread_id === 't1');
        return {
            status: true,
            data: {
                thread: mockThreads[0],
                other_user_id: seg,
                messages: msgs,
                pagination: { total: msgs.length, page: 1, pages: 1, totalPages: 1 },
            },
        };
    }
    // Communities
    if (u.includes('/communities') && method === 'GET')
        return { status: true, data: { communities: mockCommunities, pagination: { total: mockCommunities.length, page: 1, pages: 1 } } };
    if (u.includes('/communities/my'))
        return { status: true, data: { communities: mockCommunities.filter(c => c.is_member) } };
    if (u.includes('/communities') && method === 'POST')
        return { status: true, data: mockCommunities[0] };
    // Jobs
    if (u.includes('/jobs') && method === 'GET')
        return { status: true, data: { jobs: mockJobs, pagination: { total: mockJobs.length, page: 1, pages: 1 } } };
    // Events
    if (u.includes('/events') && method === 'GET')
        return { status: true, data: { events: mockEvents, pagination: { total: mockEvents.length, page: 1, pages: 1 } } };
    // Bookmarks
    if (u.includes('/bookmarks/stats'))
        return { status: true, data: { total: 2, by_type: { post: 2, question: 0, answer: 0, resource: 0, course: 0, event: 0 } } };
    if (u.includes('/bookmarks/check'))
        return { status: true, data: { is_bookmarked: false, bookmark_id: null } };
    if (u.includes('/bookmarks') && method === 'GET')
        return { status: true, data: { bookmarks: mockBookmarks, pagination: { total: 2, page: 1, pages: 1 } } };
    if (u.includes('/bookmarks') && method === 'POST')
        return { status: true, data: { id: 'b-new', content_type: 'post', content_id: '101', created_at: now } };
    // Connections / Network
    if (u.includes('/connections/stats'))
        return { status: true, data: { total: 45, accepted: 42, pending_received: 2, pending_sent: 1, declined: 0, withdrawn: 0, removed: 0 } };
    if (u.includes('/connections/network'))
        return { status: true, data: { connections: mockNetworkUsers, pagination: { total: 3, page: 1, pages: 1 } } };
    if (u.includes('/connections/suggestions'))
        return { status: true, data: { suggestions: mockSuggestions, pagination: { total: 3, page: 1, pages: 1 } } };
    if (u.includes('/connections/discover'))
        return { status: true, data: { users: mockSuggestions, pagination: { total: 3, page: 1, pages: 1 } } };
    if (u.includes('/connections/follow/stats'))
        return { status: true, data: { following_count: 12, followers_count: 8 } };
    if (u.includes('/connections/following'))
        return { status: true, data: { users: mockSuggestions.slice(0, 2), pagination: { total: 2, page: 1, pages: 1 } } };
    if (u.includes('/connections/follow/') && method === 'POST')
        return { status: true, data: { following: true } };
    if (u.includes('/connections/follow/') && method === 'DELETE')
        return { status: true, data: { following: false } };
    if (u.includes('/connections/pending'))
        return { status: true, data: { requests: [], pagination: { total: 0, page: 1, pages: 1 } } };
    if (u.includes('/connections/sent'))
        return { status: true, data: { requests: [], pagination: { total: 0, page: 1, pages: 1 } } };
    if (u.includes('/connections/blocked'))
        return { status: true, data: { users: [] } };
    if (u.includes('/connections/mutual'))
        return { status: true, data: { users: [] } };
    if (u.includes('/connections/status'))
        return { status: true, data: { status: 'none' } };
    if (u.includes('/connections/request') && method === 'POST')
        return { status: true, data: { id: 'cr-new', sender_id: '1', receiver_id: '6', status: 'pending', created_at: now } };
    if (u.includes('/connections'))
        return { status: true, data: {} };
    // Resources / Library
    if (u.includes('/resources') && method === 'GET')
        return { status: true, data: { resources: mockResources, pagination: { total: mockResources.length, page: 1, pages: 1 } } };
    if (u.includes('/resources/featured'))
        return { status: true, data: { resources: mockResources.filter(r => r.is_featured) } };
    if (u.includes('/resources') && method === 'POST')
        return { status: true, data: mockResources[0] };
    // Users
    if (u.includes('/users/me/sidebar-summary'))
        return { status: true, data: { posts_count: 28, connections_count: 45, likes_received: 312, location: 'Shirpur, Maharashtra' } };
    if (u.includes('/users/profile/avatar') && method === 'POST')
        return { status: true, data: { avatar_url: AVATAR2 } };
    if (u.includes('/users/profile/cover') && method === 'POST')
        return {
            status: true,
            data: {
                cover_image_url:
                    'https://images.pexels.com/photos/2422585/pexels-photo-2422585.jpeg?auto=compress&cs=tinysrgb&w=1200',
            },
        };
    if (pathNoTrailing.endsWith('/users/profile/about') && method === 'PUT') {
        mockProfileMutable = {
            ...mockProfileMutable,
            bio: body?.bio ?? mockProfileMutable.bio,
            location: body?.location ?? mockProfileMutable.location,
            headline: body?.headline ?? mockProfileMutable.headline,
            website_url: body?.website ?? mockProfileMutable.website_url,
        };
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (pathNoTrailing.endsWith('/users/profile/experience') && method === 'POST') {
        const row = {
            id: `ex-${Date.now()}`,
            title: body?.title || 'Role',
            company: body?.company || null,
            duration: body?.duration || null,
            description: body?.description || null,
        };
        mockProfileMutable.experience_list = [...(mockProfileMutable.experience_list || []), row];
        return { status: true, message: 'ok', item: row, data: { ...mockProfileMutable } };
    }
    if (u.match(/\/users\/profile\/experience\/[^/]+$/) && method === 'PUT') {
        const id = u.split('/').pop();
        mockProfileMutable.experience_list = (mockProfileMutable.experience_list || []).map((e) =>
            e.id === id ? { ...e, ...body, id } : e,
        );
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (u.match(/\/users\/profile\/experience\/[^/]+$/) && method === 'DELETE') {
        const id = u.split('/').pop();
        mockProfileMutable.experience_list = (mockProfileMutable.experience_list || []).filter((e) => e.id !== id);
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (pathNoTrailing.endsWith('/users/profile/achievements') && method === 'POST') {
        const row = { id: `ach-${Date.now()}`, title: body?.title || 'Achievement', description: body?.description || '' };
        const prev = Array.isArray(mockProfileMutable.achievements) ? mockProfileMutable.achievements : [];
        mockProfileMutable.achievements = [...prev, row];
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (u.match(/\/users\/profile\/achievements\/[^/]+$/) && method === 'PUT') {
        const id = u.split('/').pop();
        mockProfileMutable.achievements = (mockProfileMutable.achievements || []).map((a) =>
            typeof a === 'object' && a.id === id ? { ...a, ...body, id } : a,
        );
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (u.match(/\/users\/profile\/achievements\/[^/]+$/) && method === 'DELETE') {
        const id = u.split('/').pop();
        mockProfileMutable.achievements = (mockProfileMutable.achievements || []).filter((a) => (typeof a === 'object' ? a.id !== id : true));
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (pathNoTrailing.endsWith('/users/profile/skills') && method === 'POST') {
        let lvl = body?.level;
        if (lvl != null && lvl !== '') {
            const n = parseInt(String(lvl), 10);
            if (Number.isNaN(n) || n < 0 || n > 10)
                return { status: false, message: 'level must be between 0 and 10.' };
            lvl = n;
        } else {
            lvl = undefined;
        }
        const row = { id: `sk-${Date.now()}`, name: body?.skill_name || 'Skill', level: lvl };
        mockProfileMutable.skills_detailed = [...(mockProfileMutable.skills_detailed || []), row];
        mockProfileMutable.skills = mockProfileMutable.skills_detailed.map((s) => s.name);
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (u.match(/\/users\/profile\/skills\/[^/]+$/) && method === 'PUT') {
        const id = u.split('/').pop();
        const list = [...(mockProfileMutable.skills_detailed || [])];
        const i = list.findIndex((s) => s.id === id);
        if (i === -1)
            return { status: false, message: 'Skill not found.' };
        if (body?.skill_name !== undefined) {
            const nm = String(body.skill_name || '').trim();
            if (!nm)
                return { status: false, message: 'skill_name cannot be empty.' };
            list[i] = { ...list[i], name: nm };
        }
        if (body?.level !== undefined) {
            if (body.level === '' || body.level === null) {
                const { level: _omit, ...rest } = list[i];
                list[i] = rest;
            } else {
                const n = parseInt(String(body.level), 10);
                if (Number.isNaN(n) || n < 0 || n > 10)
                    return { status: false, message: 'level must be between 0 and 10.' };
                list[i] = { ...list[i], level: n };
            }
        }
        mockProfileMutable = { ...mockProfileMutable, skills_detailed: list, skills: list.map((s) => s.name) };
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (u.match(/\/users\/profile\/skills\/[^/]+$/) && method === 'DELETE') {
        const id = u.split('/').pop();
        mockProfileMutable.skills_detailed = (mockProfileMutable.skills_detailed || []).filter((s) => s.id !== id);
        mockProfileMutable.skills = (mockProfileMutable.skills_detailed || []).map((s) => s.name);
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (pathNoTrailing.endsWith('/users/profile/publications') && method === 'POST') {
        const row = {
            id: `pub-${Date.now()}`,
            title: body?.title || 'Publication',
            venue: body?.venue || '',
            year: body?.year || '',
            description: body?.description || '',
            url: body?.url || '',
        };
        mockPublicationsStore = [...mockPublicationsStore, row];
        return { status: true, message: 'ok', publication: row };
    }
    if (u.match(/\/users\/profile\/publications\/[^/]+$/) && method === 'PUT') {
        const id = u.split('/').pop();
        mockPublicationsStore = mockPublicationsStore.map((p) =>
            p.id === id ? { ...p, ...body, id } : p,
        );
        const pub = mockPublicationsStore.find((p) => p.id === id);
        return { status: true, publication: pub || {} };
    }
    if (u.match(/\/users\/profile\/publications\/[^/]+$/) && method === 'DELETE') {
        const id = u.split('/').pop();
        mockPublicationsStore = mockPublicationsStore.filter((p) => p.id !== id);
        return { status: true, message: 'removed' };
    }
    if (pathNoTrailing.endsWith('/users/projects') && method === 'POST') {
        const tech = Array.isArray(body?.technologies)
            ? body.technologies
            : String(body?.technologies || '')
                .split(/[,|]/)
                .map((s) => s.trim())
                .filter(Boolean);
        const row = {
            id: `proj-${Date.now()}`,
            title: body?.title || 'Project',
            description: body?.description || '',
            technologies: tech,
            status: body?.status || 'Completed',
            image_url: body?.image_url || '',
            github_url: body?.github_url || '',
            live_url: body?.live_url || '',
        };
        mockProjectsStore = [...mockProjectsStore, row];
        return { status: true, message: 'ok', project: row };
    }
    if (u.match(/\/users\/projects\/[^/]+$/) && method === 'PUT') {
        const id = u.split('/').pop();
        mockProjectsStore = mockProjectsStore.map((p) => {
            if (p.id !== id)
                return p;
            const tech =
                body?.technologies !== undefined
                    ? (Array.isArray(body.technologies)
                        ? body.technologies
                        : String(body.technologies || '')
                            .split(/[,|]/)
                            .map((s) => s.trim())
                            .filter(Boolean))
                    : p.technologies;
            return { ...p, ...body, id, technologies: tech };
        });
        const proj = mockProjectsStore.find((p) => p.id === id);
        return { status: true, project: proj || {} };
    }
    if (u.match(/\/users\/projects\/[^/]+$/) && method === 'DELETE') {
        const id = u.split('/').pop();
        mockProjectsStore = mockProjectsStore.filter((p) => p.id !== id);
        return { status: true, message: 'removed' };
    }
    if (pathNoTrailing.endsWith('/users/profile/teaching-info') && method === 'PUT') {
        mockProfileMutable.teaching_info = {
            subjects: Array.isArray(body?.subjects) ? body.subjects : mockProfileMutable.teaching_info?.subjects || [],
            experience_years: body?.experience_years != null ? Number(body.experience_years) : mockProfileMutable.teaching_info?.experience_years,
            notes: body?.notes ?? mockProfileMutable.teaching_info?.notes ?? '',
        };
        return { status: true, data: { ...mockProfileMutable } };
    }
    if (
        (method === 'GET' || method === 'PUT' || method === 'PATCH') &&
        pathNoTrailing.endsWith('/users/profile')
    ) {
        if (method === 'PUT' || method === 'PATCH') {
            mockProfileMutable = { ...mockProfileMutable, ...body };
        }
        return { status: true, data: { ...mockProfileMutable } };
    }
    const userPostsMatch = u.match(/\/users\/([^/]+)\/posts/);
    if (userPostsMatch) {
        const uid = userPostsMatch[1];
        const filtered = mockPosts.filter((p) => String(p.user?.id || MOCK_USER.id) === String(uid));
        return {
            status: true,
            data: {
                posts: filtered,
                pagination: { total: filtered.length, page: 1, pages: 1 },
            },
        };
    }
    if (u.match(/\/users\/[^/]+\/publications/))
        return { status: true, data: { publications: mockPublicationsStore } };
    if (u.match(/\/users\/[^/]+\/projects/))
        return { status: true, data: { projects: mockProjectsStore } };
    if (u.match(/\/users\/[^/]+\/profile/) || u.match(/\/users\/[^/]+$/)) {
        return { status: true, data: { ...MOCK_PROFILE_DETAIL } };
    }
    if (u.includes('/users/directory') || u.includes('/users/search'))
        return { status: true, data: { users: mockNetworkUsers, pagination: { total: 3, page: 1, pages: 1 } } };
    // Teachers
    if (u.includes('/teachers'))
        return { status: true, data: { teachers: mockTeachers, pagination: { total: mockTeachers.length, page: 1, pages: 1 } } };
    // Admin
    if (u.includes('/admin/stats') || u.includes('/admin/dashboard'))
        return { status: true, data: mockAdminStats };
    if (u.includes('/admin/notices') && method === 'GET') {
        const mockCollegeNotice = {
            id: 'tn-mock-1',
            tenant_id: MOCK_USER.tenant_id || '1',
            title: 'Mid-semester examination schedule',
            body: 'Theory papers begin next week.',
            starts_at: new Date(Date.now() - 2 * 86400000).toISOString(),
            ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
            is_pinned: true,
            is_archived: false,
            created_at: ago(12),
            updated_at: ago(12),
            author_name: 'Examination Cell',
        };
        return { status: true, data: { notices: [mockCollegeNotice] } };
    }
    if (u.includes('/admin/notices') && method === 'POST')
        return {
            status: true,
            data: {
                notice: {
                    id: `tn-${Date.now()}`,
                    tenant_id: body?.tenant_id || MOCK_USER.tenant_id || '1',
                    title: String(body?.title || 'Notice'),
                    body: String(body?.body || ''),
                    starts_at: body?.starts_at || new Date().toISOString(),
                    ends_at: body?.ends_at || null,
                    is_pinned: Boolean(body?.is_pinned),
                    is_archived: false,
                    created_at: new Date().toISOString(),
                },
            },
        };
    if (method === 'PUT' && /\/admin\/notices\/[^/]+$/.test(u))
        return { status: true, data: { notice: { ...body, id: u.split('/').pop() } } };
    if (method === 'DELETE' && /\/admin\/notices\/[^/]+$/.test(u))
        return { status: true, data: { id: u.split('/').pop(), is_archived: true } };
    if (u.includes('/admin/users'))
        return { status: true, data: { users: [MOCK_USER], pagination: { total: 1, page: 1, pages: 1 } } };
    if (u.includes('/admin/reports'))
        return { status: true, data: { reports: [], pagination: { total: 0, page: 1, pages: 1 } } };
    if (u.includes('/admin'))
        return { status: true, data: {} };
    // RBAC
    {
        const rbac = matchRbac(method, u, body);
        if (rbac !== undefined)
            return rbac;
    }
    // Super Admin (must match before catch-all; shapes align with superAdminCompatController)
    {
        const sa = matchSuperAdmin(method, u, body);
        if (sa !== undefined)
            return sa;
    }
    // AI Interview
    if (u.includes('/ai-interview/types'))
        return {
            status: true,
            data: {
                types: [
                    { id: 't-technical', title: 'Technical Interview', description: 'Practice DSA and system design', type: 'technical', difficulty: 'medium', duration: '30 min', questions: 5 },
                    { id: 't-hr', title: 'HR Interview', description: 'Behavioral and HR questions', type: 'hr', difficulty: 'easy', duration: '25 min', questions: 5 },
                    { id: 't-mock', title: 'Mock Interview', description: 'Full mock interview simulation', type: 'mock', difficulty: 'medium', duration: '30 min', questions: 5 },
                ],
            },
        };
    if (u.includes('/ai-interview/sessions/recent'))
        return { status: true, data: { sessions: [] } };
    if (u.includes('/ai-interview/stats'))
        return { status: true, data: { totalSessions: 0, averageScore: 0, totalQuestions: 0, improvementRate: 0 } };
    if (method === 'POST' && u.includes('/ai-interview/start'))
        return {
            status: true,
            data: {
                session_id: 'mock-session-1',
                message: 'Interview started.',
                total_questions: 2,
                first_question: { id: 'q1', prompt: 'Tell me about a challenging project you shipped.', question_type: 'technical', difficulty: 'medium', sort_order: 0 },
            },
        };
    if (u.match(/\/ai-interview\/sessions\/[^/]+\/questions$/) && method === 'GET')
        return {
            status: true,
            data: {
                session_status: 'in_progress',
                questions: [
                    { id: 'q1', prompt: 'Tell me about a challenging project you shipped.', question_type: 'technical', difficulty: 'medium', sort_order: 0, answered: false },
                    { id: 'q2', prompt: 'How do you handle conflicting priorities?', question_type: 'hr', difficulty: 'medium', sort_order: 1, answered: false },
                ],
            },
        };
    if (method === 'POST' && u.includes('/answer'))
        return {
            status: true,
            data: {
                feedback: 'Good structure. Add a measurable outcome.',
                score: 78,
                strengths: ['Clear communication'],
                improvements: ['Quantify impact'],
                session_complete: false,
                next_question_id: 'q2',
                answered_count: 1,
                total_questions: 2,
            },
        };
    if (method === 'POST' && u.includes('/complete'))
        return { status: true, data: { score: 78, feedback: 'Solid practice session.' } };
    if (u.includes('/ai-interview/sessions/') && u.includes('/report'))
        return {
            status: true,
            data: {
                session: { id: 'mock-session-1', status: 'completed', overall_score: 78, summary_feedback: 'Solid practice session.', interview_type: 'Technical Interview' },
                questions: [],
                analysis: { strengths: ['Clear communication'], weaknesses: ['More metrics'], recommendations: ['Practice timed answers'] },
            },
        };
    if (u.includes('/ai-interview/history'))
        return { status: true, data: { sessions: [], total: 0, page: 1, limit: 20 } };
    if (u.includes('/ai-interview'))
        return { status: true, data: {} };
    // AI English
    if (u.includes('/ai-english'))
        return { status: true, data: {} };
    // RCPIT ChatGPT
    if (u.includes('/chatgpt') || u.includes('/chat'))
        return { status: true, data: { message: 'Hello! I\'m the RCPIT ChatGPT assistant. How can I help you today?' } };
    // Settings
    if (u.includes('/settings') || u.includes('/preferences'))
        return { status: true, data: { theme: 'light', notifications_enabled: true, email_notifications: true, language: 'en' } };
    // Global search
    if (u.includes('/search'))
        return { status: true, data: { users: [{ id: '2', name: 'Priya Deshmukh', avatar_url: AVATAR3, user_type: 'student' }], posts: [mockPosts[0]], communities: [mockCommunities[0]], jobs: [mockJobs[0]], events: [mockEvents[0]] } };
    // Catch-all
    return { status: true, data: {} };
}
// Fake Axios-like response wrapper
function mockAxiosResponse(data) {
    return { data, status: 200, statusText: 'OK', headers: {}, config: {} };
}
// Create mock API that mimics axios
export const mockApi = {
    get: async (url, config = {}) => {
        await delay();
        if (config.responseType === 'blob' && String(url).includes('/super-admin/export/')) {
            const csv = 'id,name,status,students,teachers,staff,type\nmock-tenant-1,RCPIT Shirpur,Active,1850,48,6,University\nmock-tenant-2,Demo Engineering College,Trial,320,22,2,Engineering\n';
            return {
                data: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/csv; charset=utf-8' },
                config,
            };
        }
        return mockAxiosResponse(matchRoute('GET', url));
    },
    post: async (url, body, config) => {
        await delay();
        return mockAxiosResponse(matchRoute('POST', url, body));
    },
    put: async (url, body, config) => {
        await delay();
        return mockAxiosResponse(matchRoute('PUT', url, body));
    },
    patch: async (url, body, config) => {
        await delay();
        return mockAxiosResponse(matchRoute('PATCH', url, body));
    },
    delete: async (url, config) => {
        await delay();
        return mockAxiosResponse(matchRoute('DELETE', url));
    },
    interceptors: {
        request: { use: () => { }, eject: () => { } },
        response: { use: () => { }, eject: () => { } },
    },
    defaults: { headers: { common: {} } },
};
function delay(ms = 200 + Math.random() * 300) {
    return new Promise(r => setTimeout(r, ms));
}
