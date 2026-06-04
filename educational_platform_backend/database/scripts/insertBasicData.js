const db = require('../index');
const { Tenant, User, Post, Likes, Comments } = db;

// Helper function to generate random dates
const getRandomDate = (daysAgo = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
};

const insertBasicData = async () => {
  try {
    console.log('🚀 Starting basic data insertion...');

    // 1. Insert one Tenant
    console.log('📚 Inserting tenant...');
    const tenant = await Tenant.create({
      name: 'RCPIT - Rajarambapu Institute of Technology',
      type: 'Engineering',
      affiliation: 'Shivaji University',
      accreditation_status: 'NAAC A+',
      established_year: 1983,
      website: 'https://rcpit.edu.in',
      logo_url: 'https://rcpit.edu.in/logo.png',
      about: 'Premier engineering college in Maharashtra offering quality education in various engineering disciplines.',
      status: 'approved'
    });

    // 2. Insert a few Users
    console.log('👥 Inserting users...');
    const users = await User.bulkCreate([
      {
        tenant_id: tenant.tenant_id,
        user_type: 'student',
        first_name: 'Rahul',
        last_name: 'Sharma',
        email: 'rahul.sharma@rcpit.edu.in',
        password_hash: '$2b$10$example_hash_1',
        profile_picture: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
        is_approved: true
      },
      {
        tenant_id: tenant.tenant_id,
        user_type: 'student',
        first_name: 'Priya',
        last_name: 'Patel',
        email: 'priya.patel@rcpit.edu.in',
        password_hash: '$2b$10$example_hash_2',
        profile_picture: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
        is_approved: true
      },
      {
        tenant_id: tenant.tenant_id,
        user_type: 'teacher',
        first_name: 'Dr. Rajesh',
        last_name: 'Verma',
        email: 'rajesh.verma@rcpit.edu.in',
        password_hash: '$2b$10$example_hash_3',
        profile_picture: 'https://images.pexels.com/photos/1040882/pexels-photo-1040882.jpeg?auto=compress&cs=tinysrgb&w=150',
        is_approved: true
      }
    ]);

    // 3. Insert some Posts
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
        user_id: users[2].id,
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
      }
    ]);

    // 4. Insert some Likes
    console.log('❤️ Inserting likes...');
    const likes = await Likes.bulkCreate([
      { user_id: users[1].id, post_id: posts[0].id, created_at: getRandomDate(1) },
      { user_id: users[2].id, post_id: posts[0].id, created_at: getRandomDate(1) },
      { user_id: users[0].id, post_id: posts[1].id, created_at: getRandomDate(2) },
      { user_id: users[2].id, post_id: posts[1].id, created_at: getRandomDate(2) },
      { user_id: users[0].id, post_id: posts[2].id, created_at: getRandomDate(3) },
      { user_id: users[1].id, post_id: posts[2].id, created_at: getRandomDate(3) }
    ]);

    // 5. Insert some Comments
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
        user_id: users[2].id,
        post_id: posts[1].id,
        content: "Excellent work! Keep up the great progress.",
        created_at: getRandomDate(2)
      }
    ]);

    console.log('✅ Basic data insertion completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Tenants: 1`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Posts: ${posts.length}`);
    console.log(`   - Likes: ${likes.length}`);
    console.log(`   - Comments: ${comments.length}`);

    // Return the data for testing
    return {
      tenant,
      users,
      posts,
      likes,
      comments
    };

  } catch (error) {
    console.error('❌ Error inserting basic data:', error);
    throw error;
  }
};

// Run the script
if (require.main === module) {
  insertBasicData()
    .then(() => {
      console.log('🎉 Basic data insertion completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to insert basic data:', error);
      process.exit(1);
    });
}

module.exports = { insertBasicData };

