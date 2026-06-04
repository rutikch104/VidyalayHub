const db = require('../database/index'); // Updated import

// Create College Admin
exports.createCollegeAdmin = async (req, res) => {
  try {
    const {
      tenant_id, // college ID
      first_name,
      last_name,
      email,
      phone_number,
      password_hash,
      profile_picture,
      role_title,
      alt_email,
      contact_number,
      notes,
    } = req.body;

    // College portal admin — staff role (matches Users.user_type ENUM)
    const user = await db.User.create({
      tenant_id,
      user_type: 'staff',
      first_name,
      last_name,
      email,
      phone_number,
      password_hash,
      profile_picture,
    });

    // Create CollegeAdmin detail
    await db.CollegeAdmin.create({
      user_id: user.id,
      college_id: tenant_id,
      role_title,
      alt_email,
      contact_number,
      notes,
    });

    return res.status(201).json({
      status: true,
      message: 'College Admin created successfully',
      data: user,
    });
  } catch (err) {
    console.error("Error creating college admin:", err);
    return res.status(500).json({ status: false, error: err.message });
  }
};

// Get College Admin by user ID
exports.getCollegeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await db.CollegeAdmin.findOne({
      where: { user_id: id },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Tenant, as: 'college' }
      ]
    });

    if (!admin) {
      return res.status(404).json({ status: false, message: "College Admin not found" });
    }

    return res.status(200).json({ status: true, data: admin });
  } catch (err) {
    console.error("Error fetching college admin:", err);
    return res.status(500).json({ status: false, error: err.message });
  }
};

// Update College Admin
exports.updateCollegeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      phone_number,
      profile_picture,
      role_title,
      alt_email,
      contact_number,
      notes,
    } = req.body;

    const user = await db.User.findByPk(id);
    if (!user || !['staff', 'college_admin'].includes(String(user.user_type))) {
      return res.status(404).json({ status: false, message: "User not found or not a college admin" });
    }

    // Update user basic info
    Object.assign(user, {
      first_name: first_name || user.first_name,
      last_name: last_name || user.last_name,
      phone_number: phone_number || user.phone_number,
      profile_picture: profile_picture || user.profile_picture,
    });
    await user.save();

    const admin = await db.CollegeAdmin.findOne({ where: { user_id: id } });
    if (admin) {
      Object.assign(admin, {
        role_title,
        alt_email,
        contact_number,
        notes,
      });
      await admin.save();
    }

    return res.status(200).json({ status: true, message: "College admin updated successfully" });
  } catch (err) {
    console.error("Error updating college admin:", err);
    return res.status(500).json({ status: false, error: err.message });
  }
};

// Delete College Admin
exports.deleteCollegeAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    await db.CollegeAdmin.destroy({ where: { user_id: id } });
    await db.User.destroy({ where: { id } });

    return res.status(200).json({ status: true, message: "College admin deleted successfully" });
  } catch (err) {
    console.error("Error deleting college admin:", err);
    return res.status(500).json({ status: false, error: err.message });
  }
};

// Get all college admins by college
exports.getCollegeAdminsByCollege = async (req, res) => {
  try {
    const { college_id } = req.params;
    const admins = await db.CollegeAdmin.findAll({
      where: { college_id },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Tenant, as: 'college' },
      ],
    });

    return res.status(200).json({ status: true, data: admins });
  } catch (err) {
    console.error("Error fetching college admins:", err);
    return res.status(500).json({ status: false, error: err.message });
  }
};

// Dashboard for College Admin - get all students
exports.getCollegeDashboard = async (req, res) => {
  try {
    const { college_id } = req.params;

    // Get all student users of this college
    const students = await db.User.findAll({
      where: {
        tenant_id: college_id,
        user_type: 'student',
      },
      include: [{
        model: db.StudentDetail,
        as: 'studentDetails',
      }]
    });

    return res.status(200).json({
      status: true,
      college_id,
      total_students: students.length,
      students
    });
  } catch (err) {
    console.error("Error in college dashboard:", err);
    return res.status(500).json({ status: false, error: err.message });
  }
};