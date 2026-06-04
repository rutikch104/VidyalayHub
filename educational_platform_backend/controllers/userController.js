const db = require('../database/index'); // Updated import

exports.createUser = async (req, res) => {
  try {
    const {
      tenant_id, user_type, first_name, last_name, gender, dob, email, phone_number,
      password_hash, profile_picture, student_details, teacher_details, alumni_details
    } = req.body;

    // Create the User
    const user = await db.User.create({
      tenant_id,
      user_type,
      first_name,
      last_name,
      gender,
      dob,
      email,
      phone_number,
      password_hash,
      profile_picture,
    });

    // Create respective details based on user type
    if (user_type === 'student') {
      await db.StudentDetail.create({
        user_id: user.id,
        ...student_details
      });
    }

    if (user_type === 'teacher') {
      await db.TeacherDetail.create({
        user_id: user.id,
        ...teacher_details
      });
    }

    if (user_type === 'alumni') {
      await db.AlumniDetail.create({
        user_id: user.id,
        ...alumni_details
      });
    }

    return res.status(201).json({
      status: true,
      message: 'User created successfully.',
      data: {
        user,
        student_details: student_details || null,
        teacher_details: teacher_details || null,
        alumni_details: alumni_details || null
      }
    });
  } catch (err) {
    console.error("Error creating user:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to create user.",
      error: err.message
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.User.findOne({
      where: { id },
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: db.StudentDetail, as: 'studentDetails' },
        { model: db.TeacherDetail, as: 'teacherDetails' },
        { model: db.AlumniDetail, as: 'alumniDetails' }
      ]
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found."
      });
    }

    return res.status(200).json({
      status: true,
      data: user
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch user.",
      error: err.message
    });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone_number, student_details, teacher_details, alumni_details } = req.body;

  try {
    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found."
      });
    }

    user.first_name = first_name || user.first_name;
    user.last_name = last_name || user.last_name;
    user.phone_number = phone_number || user.phone_number;
    await user.save();

    if (user.user_type === 'student') {
      const studentDetail = await db.StudentDetail.findOne({ where: { user_id: user.id } });
      if (studentDetail) {
        Object.assign(studentDetail, student_details);
        await studentDetail.save();
      }
    }

    if (user.user_type === 'teacher') {
      const teacherDetail = await db.TeacherDetail.findOne({ where: { user_id: user.id } });
      if (teacherDetail) {
        Object.assign(teacherDetail, teacher_details);
        await teacherDetail.save();
      }
    }

    if (user.user_type === 'alumni') {
      const alumniDetail = await db.AlumniDetail.findOne({ where: { user_id: user.id } });
      if (alumniDetail) {
        Object.assign(alumniDetail, alumni_details);
        await alumniDetail.save();
      }
    }

    return res.status(200).json({
      status: true,
      message: "User updated successfully.",
      data: user
    });
  } catch (err) {
    console.error("Error updating user:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to update user.",
      error: err.message
    });
  }
};

exports.getUsersByTenant = async (req, res) => {
  const { tenant_id } = req.query;

  try {
    const users = await db.User.findAll({
      where: { tenant_id },
      include: [
        { model: db.StudentDetail, as: 'studentDetails' },
        { model: db.TeacherDetail, as: 'teacherDetails' },
        { model: db.AlumniDetail, as: 'alumniDetails' }
      ]
    });

    return res.status(200).json({
      status: true,
      data: users
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch users.",
      error: err.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found."
      });
    }

    await user.destroy();

    return res.status(200).json({
      status: true,
      message: "User deleted successfully."
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to delete user.",
      error: err.message
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await db.User.findAll({
      include: [
        { model: db.StudentDetail, as: 'studentDetails' },
        { model: db.TeacherDetail, as: 'teacherDetails' },
        { model: db.AlumniDetail, as: 'alumniDetails' }
      ]
    });

    return res.status(200).json({
      status: true,
      data: users
    });
  } catch (err) {
    console.error("Error fetching all users:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch all users.",
      error: err.message
    });
  }
};


exports.getUserByEmail = async (req, res) => {
  const { email } = req.params;

  try {
    const user = await db.User.findOne({
      where: { email },
      include: [
        { model: db.StudentDetail, as: 'studentDetails' },
        { model: db.TeacherDetail, as: 'teacherDetails' },
        { model: db.AlumniDetail, as: 'alumniDetails' }
      ]
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found."
      });
    }

    return res.status(200).json({
      status: true,
      data: user
    });
  } catch (err) {
    console.error("Error fetching user by email:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch user by email.",
      error: err.message
    });
  }
};

exports.getUserByPhoneNumber = async (req, res) => {
  const { phone_number } = req.params;

  try {
    const user = await db.User.findOne({
      where: { phone_number },
      include: [
        { model: db.StudentDetail, as: 'studentDetails' },
        { model: db.TeacherDetail, as: 'teacherDetails' },
        { model: db.AlumniDetail, as: 'alumniDetails' }
      ]
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found."
      });
    }

    return res.status(200).json({
      status: true,
      data: user
    });
  } catch (err) {
    console.error("Error fetching user by phone number:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch user by phone number.",
      error: err.message
    });
  }
};

exports.getUserByFirstName = async (req, res) => {
  const { first_name } = req.params;

  try {
    const users = await db.User.findAll({
      where: { first_name },
      include: [
        { model: db.StudentDetail, as: 'studentDetails' },
        { model: db.TeacherDetail, as: 'teacherDetails' },
        { model: db.AlumniDetail, as: 'alumniDetails' }
      ]
    });

    if (!users.length) {
      return res.status(404).json({
        status: false,
        message: "No users found with the given first name."
      });
    }

    return res.status(200).json({
      status: true,
      data: users
    });
  } catch (err) {
    console.error("Error fetching users by first name:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch users by first name.",
      error: err.message
    });
  }
};