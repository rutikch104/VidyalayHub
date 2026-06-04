const db = require('../database/index'); // Updated import

exports.getAllColleges = async (req, res) => {
  try {
    const colleges = await db.Tenant.findAll();
    return res.status(200).json({ status: true, data: colleges });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Error fetching colleges.', error: err.message });
  }
};

exports.approveCollege = async (req, res) => {
  const { tenant_id } = req.params;
  try {
    await db.Tenant.update({ status: 'approved' }, { where: { tenant_id } });
    return res.status(200).json({ status: true, message: 'College approved.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Approval failed.', error: err.message });
  }
};

exports.rejectCollege = async (req, res) => {
  const { tenant_id } = req.params;
  try {
    await db.Tenant.update({ status: 'rejected' }, { where: { tenant_id } });
    return res.status(200).json({ status: true, message: 'College rejected.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Rejection failed.', error: err.message });
  }
};

exports.getPendingColleges = async (req, res) => {
  try {
    const pending = await db.Tenant.findAll({ where: { status: 'pending' } });
    return res.status(200).json({ status: true, data: pending });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Error fetching notifications.', error: err.message });
  }
};

exports.getCollegeUsers = async (req, res) => {
  const { tenant_id } = req.params;
  try {
    const users = await db.User.findAll({ where: { tenant_id } });
    return res.status(200).json({ status: true, data: users });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Error fetching users.', error: err.message });
  }
};

exports.toggleCollegeStatus = async (req, res) => {
  const { tenant_id } = req.params;
  const { status } = req.body; // true or false
  try {
    await db.Tenant.update({ is_active: status }, { where: { tenant_id } });
    return res.status(200).json({ status: true, message: `College ${status ? 'activated' : 'deactivated'}` });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Status change failed.', error: err.message });
  }
};

exports.createTenant = async (req, res) => {
  const { name, email, phone, address, status } = req.body;
  try {
    const newTenant = await db.Tenant.create({ name, email, phone, address, status });
    return res.status(201).json({ status: true, message: 'College created successfully.', data: newTenant });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'College creation failed.', error: err.message });
  }
};

exports.getCollegeDetails = async (req, res) => {
  const { tenant_id } = req.params;
  try {
    const college = await db.Tenant.findByPk(tenant_id);
    if (!college) {
      return res.status(404).json({ status: false, message: 'College not found.' });
    }
    return res.status(200).json({ status: true, data: college });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Error fetching college details.', error: err.message });
  }
};