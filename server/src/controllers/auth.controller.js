const Organization = require("../models/Organization");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Register Company + Owner
 */
exports.registerCompany = async (req, res) => {
  const { companyName, ownerName, email, password } = req.body;

  if (await User.findOne({ email }))
    return res.status(400).json({ message: "Email already exists" });

  const org = await Organization.create({
    name: companyName,
    ownerEmail: email
  });

  const hashed = await bcrypt.hash(password, 10);

  const owner = await User.create({
    orgId: org._id,
    name: ownerName,
    email,
    password: hashed,
    role: "owner"
  });

  res.json({ message: "Company registered", orgId: org._id });
};

/**
 * Login (Multi-Tenant)
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign(
    {
      userId: user._id,
      orgId: user.orgId,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    role: user.role,
    orgId: user.orgId,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

/**
 * Add Employee (Admin/Owner)
 */
exports.addEmployee = async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ email }))
    return res.status(400).json({ message: "Email exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    orgId: req.user.orgId,
    name,
    email,
    password: hashed,
    role: "employee"
  });

  res.json(user);
};
