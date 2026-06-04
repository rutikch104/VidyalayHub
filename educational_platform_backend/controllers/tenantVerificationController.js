const db = require('../database/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.createVerification = async (req, res) => {
  const { tenant_id, email, password } = req.body;
  try {
    const existingVerification = await db.TenantVerification.findOne({ where: { email } });
    if (existingVerification) {
      return res.status(400).json({ status: false, message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.TenantVerification.create({
      tenant_id,
      email,
      password: hashedPassword,
      role: 'admin',
      is_verified: false,
    });

    return res.status(201).json({ status: true, message: "Verification account created successfully." });
  } catch (err) {
    console.error("Error creating verification account:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.verifyLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const verification = await db.TenantVerification.findOne({ where: { email } });
    if (!verification) {
      return res.status(404).json({ status: false, message: "Account not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, verification.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ tenant_id: verification.tenant_id, role: verification.role }, 'your-secret-key', { expiresIn: '1h' });

    return res.status(200).json({ status: true, message: "Login successful", token });
  } catch (err) {
    console.error("Error verifying login:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
};