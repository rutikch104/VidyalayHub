const db = require('../index');
const {
  Tenant,
  User,
  StudentDetails,
  TeacherDetails,
  AlluminiDetails,
  Post,
  PostMention,
  Attachment,
  Likes,
  Comments,
  Bookmark,
  Connection,
  JobPost,
  JobApplication,
  MessageThread,
  Message,
  Notification,
  ResourceLibrary,
  GlobalQuestion,
  GlobalAnswer,
  QuestionLike,
  QuestionComment,
  AnswerLike,
  AnswerComment
} = db;

// Helper function to generate random dates
const getRandomDate = (daysAgo = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
};

// Helper function to generate random IDs
const getRandomId = (min = 1, max = 10) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const insertDummyData = async () => {
  try {
    console.log('🚀 Starting dummy data insertion...');

    // 1. Insert Tenants (Colleges)
    console.log('📚 Inserting tenants...');
    const tenants = await Tenant.bulkCreate([
      {
        name: 'RCPIT - Rajarambapu Institute of Technology',
        type: 'Engineering',
        affiliation: 'Shivaji University',
        accreditation_status: 'NAAC A+',
        established_year: 1983,
        website: 'https://rcpit.edu.in',
        logo_url: 'https://rcpit.edu.in/logo.png',
        about: 'Premier engineering college in Maharashtra offering quality education in various engineering disciplines.',
        status: 'approved'
      },
      {
        name: 'MIT - Maharashtra Institute of Technology',
        type: 'Engineering',
        affiliation: 'Pune University',
        accreditation_status: 'NAAC A+',
        established_year: 1983,
        website: 'https://mit.edu.in',
        logo_url: 'https://mit.edu.in/logo.png',
        about: 'Leading technology institute known for innovation and excellence in engineering education.',
        status: 'approved'
      },
      {
        name: 'COEP - College of Engineering Pune',
        type: 'Engineering',
        affiliation: 'Pune University',
        accreditation_status: 'NAAC A+',
        established_year: 1854,
        website: 'https://coep.edu.in',
        logo_url: 'https://coep.edu.in/logo.png',
        about: 'Premier engineering college in Pune with a rich history of academic excellence.',
        status: 'approved'
      }
    ]);

    // 2. Insert Users
    console.log('👥 Inserting users...');
    const users = await User.bulkCreate([
      // Students
      {
        name: 'Rahul Sharma',
        email: 'rahul.sharma@rcpit.edu.in',
        password: '$2b$10$example_hash_1', // In real app, this would be properly hashed
        role: 'student',
        avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[0].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(7)
      },
      {
        name: 'Priya Patel',
        email: 'priya.patel@rcpit.edu.in',
        password: '$2b$10$example_hash_2',
        role: 'student',
        avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[0].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(3)
      },
      {
        name: 'Amit Kumar',
        email: 'amit.kumar@rcpit.edu.in',
        password: '$2b$10$example_hash_3',
        role: 'student',
        avatar_url: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[0].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(1)
      },
      {
        name: 'Sneha Gupta',
        email: 'sneha.gupta@mit.edu.in',
        password: '$2b$10$example_hash_4',
        role: 'student',
        avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[1].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(2)
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.singh@coep.edu.in',
        password: '$2b$10$example_hash_5',
        role: 'student',
        avatar_url: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[2].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(5)
      },
      // Teachers
      {
        name: 'Dr. Rajesh Verma',
        email: 'rajesh.verma@rcpit.edu.in',
        password: '$2b$10$example_hash_6',
        role: 'teacher',
        avatar_url: 'https://images.pexels.com/photos/1040882/pexels-photo-1040882.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[0].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(1)
      },
      {
        name: 'Prof. Sunita Joshi',
        email: 'sunita.joshi@rcpit.edu.in',
        password: '$2b$10$example_hash_7',
        role: 'teacher',
        avatar_url: 'https://images.pexels.com/photos/1040883/pexels-photo-1040883.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[0].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(2)
      },
      {
        name: 'Dr. Anil Deshmukh',
        email: 'anil.deshmukh@mit.edu.in',
        password: '$2b$10$example_hash_8',
        role: 'teacher',
        avatar_url: 'https://images.pexels.com/photos/1040884/pexels-photo-1040884.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[1].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(3)
      },
      // Alumni
      {
        name: 'Arjun Mehta',
        email: 'arjun.mehta@gmail.com',
        password: '$2b$10$example_hash_9',
        role: 'alumni',
        avatar_url: 'https://images.pexels.com/photos/1040885/pexels-photo-1040885.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[0].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(10)
      },
      {
        name: 'Kavya Reddy',
        email: 'kavya.reddy@gmail.com',
        password: '$2b$10$example_hash_10',
        role: 'alumni',
        avatar_url: 'https://images.pexels.com/photos/1040886/pexels-photo-1040886.jpeg?auto=compress&cs=tinysrgb&w=150',
        tenant_id: tenants[0].id,
        is_verified: true,
        is_active: true,
        last_login_at: getRandomDate(15)
      }
    ]);

    // 3. Insert Student Details
    console.log('🎓 Inserting student details...');
    const studentDetails = await StudentDetails.bulkCreate([
      {
        user_id: users[0].id,
        roll_number: 'RCPIT2021001',
        branch: 'Computer Engineering',
        year: 2024,
        semester: 8,
        cgpa: 8.5,
        phone: '+91-9876543210',
        address: 'Pune, Maharashtra',
        date_of_birth: new Date('2002-05-15'),
        parent_name: 'Mr. Ramesh Sharma',
        parent_phone: '+91-9876543211'
      },
      {
        user_id: users[1].id,
        roll_number: 'RCPIT2021002',
        branch: 'Information Technology',
        year: 2024,
        semester: 8,
        cgpa: 9.2,
        phone: '+91-9876543212',
        address: 'Mumbai, Maharashtra',
        date_of_birth: new Date('2002-08-20'),
        parent_name: 'Mrs. Sunita Patel',
        parent_phone: '+91-9876543213'
      },
      {
        user_id: users[2].id,
        roll_number: 'RCPIT2021003',
        branch: 'Electronics Engineering',
        year: 2024,
        semester: 8,
        cgpa: 8.8,
        phone: '+91-9876543214',
        address: 'Nashik, Maharashtra',
        date_of_birth: new Date('2002-03-10'),
        parent_name: 'Mr. Suresh Kumar',
        parent_phone: '+91-9876543215'
      },
      {
        user_id: users[3].id,
        roll_number: 'MIT2021001',
        branch: 'Computer Science',
        year: 2024,
        semester: 8,
        cgpa: 9.0,
        phone: '+91-9876543216',
        address: 'Pune, Maharashtra',
        date_of_birth: new Date('2002-07-25'),
        parent_name: 'Mr. Rajesh Gupta',
        parent_phone: '+91-9876543217'
      },
      {
        user_id: users[4].id,
        roll_number: 'COEP2021001',
        branch: 'Mechanical Engineering',
        year: 2024,
        semester: 8,
        cgpa: 8.7,
        phone: '+91-9876543218',
        address: 'Pune, Maharashtra',
        date_of_birth: new Date('2002-04-12'),
        parent_name: 'Mr. Vikram Singh Sr.',
        parent_phone: '+91-9876543219'
      }
    ]);

    // 4. Insert Teacher Details
    console.log('👨‍🏫 Inserting teacher details...');
    const teacherDetails = await TeacherDetails.bulkCreate([
      {
        user_id: users[5].id,
        employee_id: 'RCPIT_T001',
        department: 'Computer Engineering',
        designation: 'Professor',
        qualification: 'Ph.D. in Computer Science',
        experience_years: 15,
        specialization: 'Machine Learning, Data Structures',
        phone: '+91-9876543220',
        office_location: 'Block A, Room 101'
      },
      {
        user_id: users[6].id,
        employee_id: 'RCPIT_T002',
        department: 'Information Technology',
        designation: 'Associate Professor',
        qualification: 'M.Tech in Information Technology',
        experience_years: 12,
        specialization: 'Web Development, Database Systems',
        phone: '+91-9876543221',
        office_location: 'Block B, Room 205'
      },
      {
        user_id: users[7].id,
        employee_id: 'MIT_T001',
        department: 'Computer Science',
        designation: 'Professor',
        qualification: 'Ph.D. in Computer Science',
        experience_years: 18,
        specialization: 'Artificial Intelligence, Algorithms',
        phone: '+91-9876543222',
        office_location: 'Main Building, Room 301'
      }
    ]);

    // 5. Insert Alumni Details
    console.log('🎓 Inserting alumni details...');
    const alumniDetails = await AlluminiDetails.bulkCreate([
      {
        user_id: users[8].id,
        graduation_year: 2020,
        branch: 'Computer Engineering',
        current_company: 'Google',
        current_position: 'Software Engineer',
        current_location: 'Bangalore, India',
        work_experience: 4,
        linkedin_url: 'https://linkedin.com/in/arjun-mehta',
        github_url: 'https://github.com/arjun-mehta',
        phone: '+91-9876543223',
        achievements: ['Google Summer of Code 2019', 'ACM ICPC Regional Winner']
      },
      {
        user_id: users[9].id,
        graduation_year: 2019,
        branch: 'Information Technology',
        current_company: 'Microsoft',
        current_position: 'Senior Software Engineer',
        current_location: 'Hyderabad, India',
        work_experience: 5,
        linkedin_url: 'https://linkedin.com/in/kavya-reddy',
        github_url: 'https://github.com/kavya-reddy',
        phone: '+91-9876543224',
        achievements: ['Microsoft MVP', 'Women in Tech Award 2023']
      }
    ]);

    // 6. Insert Posts
    console.log('📝 Inserting posts...');
    const posts = await Post.bulkCreate([
      {
        user_id: users[0].id,
        content: "Just finished an amazing project on React! The component architecture is so clean and maintainable. #React #WebDevelopment #Programming",
        type: "text",
        visibility: "public",
        hashtags: ["React", "WebDevelopment", "Programming"],
        likes_count: 15,
        comments_count: 8,
        bookmarks_count: 3,
        views_count: 45,
        created_at: getRandomDate(1),
        updated_at: getRandomDate(1)
      },
      {
        user_id: users[1].id,
        content: "Excited to share my latest achievement! Just completed the AI Interview practice session and scored 95%! The AI feedback was incredibly helpful. #AI #Interview #Career",
        type: "text",
        visibility: "public",
        hashtags: ["AI", "Interview", "Career"],
        likes_count: 23,
        comments_count: 12,
        bookmarks_count: 7,
        views_count: 67,
        created_at: getRandomDate(2),
        updated_at: getRandomDate(2)
      },
      {
        user_id: users[5].id,
        content: "Great to see students actively participating in the coding competition! Remember, the key to success is consistent practice and never giving up. #Coding #Competition #Motivation",
        type: "text",
        visibility: "public",
        hashtags: ["Coding", "Competition", "Motivation"],
        likes_count: 31,
        comments_count: 18,
        bookmarks_count: 9,
        views_count: 89,
        created_at: getRandomDate(3),
        updated_at: getRandomDate(3)
      },
      {
        user_id: users[8].id,
        content: "Alumni here! Just wanted to share that our company is hiring for Software Engineer positions. If any current students are interested, feel free to reach out! #Jobs #Hiring #Alumni",
        type: "text",
        visibility: "public",
        hashtags: ["Jobs", "Hiring", "Alumni"],
        likes_count: 27,
        comments_count: 14,
        bookmarks_count: 6,
        views_count: 56,
        created_at: getRandomDate(4),
        updated_at: getRandomDate(4)
      },
      {
        user_id: users[2].id,
        content: "Found some amazing resources in the Library Center! The study materials are so well organized and comprehensive. Highly recommend checking out the new JavaScript course materials. #Study #Resources #Learning",
        type: "text",
        visibility: "public",
        hashtags: ["Study", "Resources", "Learning"],
        likes_count: 18,
        comments_count: 5,
        bookmarks_count: 12,
        views_count: 34,
        created_at: getRandomDate(5),
        updated_at: getRandomDate(5)
      }
    ]);

    // 7. Insert Likes
    console.log('❤️ Inserting likes...');
    const likes = await Likes.bulkCreate([
      { user_id: users[1].id, post_id: posts[0].id, created_at: getRandomDate(1) },
      { user_id: users[2].id, post_id: posts[0].id, created_at: getRandomDate(1) },
      { user_id: users[3].id, post_id: posts[0].id, created_at: getRandomDate(1) },
      { user_id: users[0].id, post_id: posts[1].id, created_at: getRandomDate(2) },
      { user_id: users[2].id, post_id: posts[1].id, created_at: getRandomDate(2) },
      { user_id: users[4].id, post_id: posts[1].id, created_at: getRandomDate(2) },
      { user_id: users[0].id, post_id: posts[2].id, created_at: getRandomDate(3) },
      { user_id: users[1].id, post_id: posts[2].id, created_at: getRandomDate(3) },
      { user_id: users[3].id, post_id: posts[2].id, created_at: getRandomDate(3) },
      { user_id: users[0].id, post_id: posts[3].id, created_at: getRandomDate(4) },
      { user_id: users[1].id, post_id: posts[3].id, created_at: getRandomDate(4) },
      { user_id: users[2].id, post_id: posts[3].id, created_at: getRandomDate(4) },
      { user_id: users[0].id, post_id: posts[4].id, created_at: getRandomDate(5) },
      { user_id: users[1].id, post_id: posts[4].id, created_at: getRandomDate(5) },
      { user_id: users[3].id, post_id: posts[4].id, created_at: getRandomDate(5) }
    ]);

    // 8. Insert Comments
    console.log('💬 Inserting comments...');
    const comments = await Comments.bulkCreate([
      {
        user_id: users[1].id,
        post_id: posts[0].id,
        content: "Great work! React is indeed amazing for building user interfaces.",
        created_at: getRandomDate(1)
      },
      {
        user_id: users[2].id,
        post_id: posts[0].id,
        content: "Could you share the GitHub repository? I'd love to see the code!",
        created_at: getRandomDate(1)
      },
      {
        user_id: users[0].id,
        post_id: posts[1].id,
        content: "Congratulations on the great score! AI interviews are the future.",
        created_at: getRandomDate(2)
      },
      {
        user_id: users[5].id,
        post_id: posts[1].id,
        content: "Excellent work! Keep up the great progress.",
        created_at: getRandomDate(2)
      },
      {
        user_id: users[0].id,
        post_id: posts[2].id,
        content: "Thank you for the motivation, Professor!",
        created_at: getRandomDate(3)
      },
      {
        user_id: users[1].id,
        post_id: posts[2].id,
        content: "We'll keep practicing and improving!",
        created_at: getRandomDate(3)
      }
    ]);

    // 9. Insert Bookmarks
    console.log('🔖 Inserting bookmarks...');
    const bookmarks = await Bookmark.bulkCreate([
      { user_id: users[1].id, post_id: posts[0].id, created_at: getRandomDate(1) },
      { user_id: users[2].id, post_id: posts[0].id, created_at: getRandomDate(1) },
      { user_id: users[0].id, post_id: posts[1].id, created_at: getRandomDate(2) },
      { user_id: users[3].id, post_id: posts[1].id, created_at: getRandomDate(2) },
      { user_id: users[0].id, post_id: posts[2].id, created_at: getRandomDate(3) },
      { user_id: users[1].id, post_id: posts[2].id, created_at: getRandomDate(3) },
      { user_id: users[2].id, post_id: posts[3].id, created_at: getRandomDate(4) },
      { user_id: users[4].id, post_id: posts[3].id, created_at: getRandomDate(4) },
      { user_id: users[0].id, post_id: posts[4].id, created_at: getRandomDate(5) },
      { user_id: users[1].id, post_id: posts[4].id, created_at: getRandomDate(5) }
    ]);

    // 10. Insert Connections
    console.log('🤝 Inserting connections...');
    const connections = await Connection.bulkCreate([
      { user_id: users[0].id, connected_user_id: users[1].id, status: 'accepted', created_at: getRandomDate(10) },
      { user_id: users[0].id, connected_user_id: users[2].id, status: 'accepted', created_at: getRandomDate(8) },
      { user_id: users[0].id, connected_user_id: users[5].id, status: 'accepted', created_at: getRandomDate(15) },
      { user_id: users[1].id, connected_user_id: users[2].id, status: 'accepted', created_at: getRandomDate(12) },
      { user_id: users[1].id, connected_user_id: users[3].id, status: 'accepted', created_at: getRandomDate(6) },
      { user_id: users[2].id, connected_user_id: users[4].id, status: 'accepted', created_at: getRandomDate(9) },
      { user_id: users[0].id, connected_user_id: users[8].id, status: 'accepted', created_at: getRandomDate(20) },
      { user_id: users[1].id, connected_user_id: users[9].id, status: 'accepted', created_at: getRandomDate(18) }
    ]);

    // 11. Insert Job Posts
    console.log('💼 Inserting job posts...');
    const jobPosts = await JobPost.bulkCreate([
      {
        user_id: users[8].id,
        title: 'Software Engineer - Frontend',
        company: 'Google',
        location: 'Bangalore, India',
        job_type: 'full-time',
        experience_level: 'entry',
        salary_range: '8-12 LPA',
        description: 'We are looking for a talented Frontend Developer to join our team. Must have experience with React, JavaScript, and modern web technologies.',
        requirements: ['React', 'JavaScript', 'HTML/CSS', 'Git'],
        benefits: ['Health Insurance', 'Flexible Hours', 'Learning Budget'],
        application_deadline: new Date('2024-03-31'),
        is_active: true,
        created_at: getRandomDate(5)
      },
      {
        user_id: users[9].id,
        title: 'Senior Software Engineer',
        company: 'Microsoft',
        location: 'Hyderabad, India',
        job_type: 'full-time',
        experience_level: 'mid',
        salary_range: '15-25 LPA',
        description: 'Join our team as a Senior Software Engineer working on cutting-edge cloud technologies.',
        requirements: ['C#', 'Azure', 'SQL Server', '5+ years experience'],
        benefits: ['Stock Options', 'Health Insurance', 'Remote Work'],
        application_deadline: new Date('2024-04-15'),
        is_active: true,
        created_at: getRandomDate(3)
      }
    ]);

    // 12. Insert Job Applications
    console.log('📋 Inserting job applications...');
    const jobApplications = await JobApplication.bulkCreate([
      {
        user_id: users[0].id,
        job_post_id: jobPosts[0].id,
        cover_letter: 'I am very interested in this position and believe my skills in React and JavaScript make me a great fit.',
        status: 'applied',
        applied_at: getRandomDate(2)
      },
      {
        user_id: users[1].id,
        job_post_id: jobPosts[0].id,
        cover_letter: 'I have been following Google\'s work and would love to contribute to your team.',
        status: 'applied',
        applied_at: getRandomDate(1)
      },
      {
        user_id: users[2].id,
        job_post_id: jobPosts[1].id,
        cover_letter: 'My experience with cloud technologies aligns well with this role.',
        status: 'applied',
        applied_at: getRandomDate(3)
      }
    ]);

    // 13. Insert Message Threads
    console.log('💬 Inserting message threads...');
    const messageThreads = await MessageThread.bulkCreate([
      {
        title: 'Study Group Discussion',
        type: 'group',
        created_by: users[0].id,
        created_at: getRandomDate(10)
      },
      {
        title: 'Project Collaboration',
        type: 'group',
        created_by: users[1].id,
        created_at: getRandomDate(8)
      },
      {
        title: 'Direct Message',
        type: 'direct',
        created_by: users[0].id,
        created_at: getRandomDate(5)
      }
    ]);

    // 14. Insert Messages
    console.log('📨 Inserting messages...');
    const messages = await Message.bulkCreate([
      {
        thread_id: messageThreads[0].id,
        sender_id: users[0].id,
        content: 'Hey everyone! Let\'s plan our study session for the upcoming exams.',
        message_type: 'text',
        created_at: getRandomDate(10)
      },
      {
        thread_id: messageThreads[0].id,
        sender_id: users[1].id,
        content: 'Great idea! I suggest we meet in the library tomorrow at 2 PM.',
        message_type: 'text',
        created_at: getRandomDate(9)
      },
      {
        thread_id: messageThreads[1].id,
        sender_id: users[1].id,
        content: 'I\'ve created a new branch for the React project. Please review the changes.',
        message_type: 'text',
        created_at: getRandomDate(8)
      },
      {
        thread_id: messageThreads[2].id,
        sender_id: users[0].id,
        content: 'Hi! I saw your post about the AI interview. Could you share some tips?',
        message_type: 'text',
        created_at: getRandomDate(5)
      }
    ]);

    // 15. Insert Notifications
    console.log('🔔 Inserting notifications...');
    const notifications = await Notification.bulkCreate([
      {
        user_id: users[0].id,
        type: 'like',
        title: 'New Like',
        message: 'Priya Patel liked your post',
        data: { post_id: posts[0].id, user_id: users[1].id },
        is_read: false,
        created_at: getRandomDate(1)
      },
      {
        user_id: users[0].id,
        type: 'comment',
        title: 'New Comment',
        message: 'Amit Kumar commented on your post',
        data: { post_id: posts[0].id, user_id: users[2].id },
        is_read: false,
        created_at: getRandomDate(1)
      },
      {
        user_id: users[1].id,
        type: 'connection_request',
        title: 'Connection Request',
        message: 'Sneha Gupta wants to connect with you',
        data: { user_id: users[3].id },
        is_read: false,
        created_at: getRandomDate(2)
      },
      {
        user_id: users[0].id,
        type: 'job_application',
        title: 'Job Application Update',
        message: 'Your application for Software Engineer at Google has been reviewed',
        data: { job_post_id: jobPosts[0].id },
        is_read: false,
        created_at: getRandomDate(3)
      }
    ]);

    // 16. Insert Resource Library
    console.log('📚 Inserting resource library...');
    const resources = await ResourceLibrary.bulkCreate([
      {
        user_id: users[5].id,
        title: 'React Complete Guide',
        description: 'Comprehensive guide to React development',
        type: 'document',
        subject: 'Computer Science',
        category: 'Programming',
        tags: ['React', 'JavaScript', 'Frontend'],
        file_url: '/uploads/react-guide.pdf',
        file_size: 2048000,
        download_count: 45,
        is_approved: true,
        created_at: getRandomDate(20)
      },
      {
        user_id: users[6].id,
        title: 'Database Design Principles',
        description: 'Learn the fundamentals of database design',
        type: 'document',
        subject: 'Information Technology',
        category: 'Database',
        tags: ['Database', 'SQL', 'Design'],
        file_url: '/uploads/database-design.pdf',
        file_size: 1536000,
        download_count: 32,
        is_approved: true,
        created_at: getRandomDate(15)
      },
      {
        user_id: users[7].id,
        title: 'Machine Learning Basics',
        description: 'Introduction to machine learning concepts',
        type: 'video',
        subject: 'Computer Science',
        category: 'AI/ML',
        tags: ['Machine Learning', 'AI', 'Python'],
        file_url: '/uploads/ml-basics.mp4',
        file_size: 51200000,
        download_count: 78,
        is_approved: true,
        created_at: getRandomDate(10)
      }
    ]);

    // 17. Insert Global Questions
    console.log('❓ Inserting global questions...');
    const globalQuestions = await GlobalQuestion.bulkCreate([
      {
        user_id: users[0].id,
        title: 'How to optimize React performance?',
        content: 'I\'m working on a large React application and experiencing performance issues. What are the best practices for optimization?',
        tags: ['React', 'Performance', 'Optimization'],
        views_count: 25,
        likes_count: 8,
        answers_count: 3,
        is_resolved: false,
        created_at: getRandomDate(7)
      },
      {
        user_id: users[1].id,
        title: 'Best practices for database indexing?',
        content: 'Can someone explain the best practices for database indexing? I want to improve query performance.',
        tags: ['Database', 'Indexing', 'Performance'],
        views_count: 18,
        likes_count: 5,
        answers_count: 2,
        is_resolved: false,
        created_at: getRandomDate(5)
      }
    ]);

    // 18. Insert Global Answers
    console.log('💡 Inserting global answers...');
    const globalAnswers = await GlobalAnswer.bulkCreate([
      {
        question_id: globalQuestions[0].id,
        user_id: users[5].id,
        content: 'Here are some key optimization techniques: 1) Use React.memo for components, 2) Implement useMemo and useCallback hooks, 3) Code splitting with lazy loading, 4) Optimize bundle size.',
        likes_count: 12,
        is_accepted: true,
        created_at: getRandomDate(6)
      },
      {
        question_id: globalQuestions[0].id,
        user_id: users[6].id,
        content: 'Also consider using React DevTools Profiler to identify performance bottlenecks and implement virtualization for large lists.',
        likes_count: 8,
        is_accepted: false,
        created_at: getRandomDate(5)
      },
      {
        question_id: globalQuestions[1].id,
        user_id: users[7].id,
        content: 'Database indexing best practices: 1) Index frequently queried columns, 2) Use composite indexes for multi-column queries, 3) Avoid over-indexing, 4) Monitor index usage.',
        likes_count: 10,
        is_accepted: true,
        created_at: getRandomDate(4)
      }
    ]);

    console.log('✅ Dummy data insertion completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Tenants: ${tenants.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Student Details: ${studentDetails.length}`);
    console.log(`   - Teacher Details: ${teacherDetails.length}`);
    console.log(`   - Alumni Details: ${alumniDetails.length}`);
    console.log(`   - Posts: ${posts.length}`);
    console.log(`   - Likes: ${likes.length}`);
    console.log(`   - Comments: ${comments.length}`);
    console.log(`   - Bookmarks: ${bookmarks.length}`);
    console.log(`   - Connections: ${connections.length}`);
    console.log(`   - Job Posts: ${jobPosts.length}`);
    console.log(`   - Job Applications: ${jobApplications.length}`);
    console.log(`   - Message Threads: ${messageThreads.length}`);
    console.log(`   - Messages: ${messages.length}`);
    console.log(`   - Notifications: ${notifications.length}`);
    console.log(`   - Resources: ${resources.length}`);
    console.log(`   - Global Questions: ${globalQuestions.length}`);
    console.log(`   - Global Answers: ${globalAnswers.length}`);

  } catch (error) {
    console.error('❌ Error inserting dummy data:', error);
    throw error;
  }
};

// Run the script
if (require.main === module) {
  insertDummyData()
    .then(() => {
      console.log('🎉 Dummy data insertion completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to insert dummy data:', error);
      process.exit(1);
    });
}

module.exports = { insertDummyData };
