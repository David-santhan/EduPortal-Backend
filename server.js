require("dotenv").config(); // load .env variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,  // frontend URL from .env
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET;

// Connect to MongoDB
const ConnectToMDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB ✅");
    } catch (error) {
        console.log("Failed to connect to MongoDB ❌", error);    
    }
}
ConnectToMDB();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.GMAIL_USER,      
    pass: process.env.GMAIL_PASS,   
  },
});

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  designation: { type: String, enum: ["Admin", "Teacher", "Student"], required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const submissionSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  answer: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  reviewed: { type: Boolean, default: false },
  studentEmail: { type: String, required: true },
});

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  status: { type: String, enum: ["Draft", "Published", "Completed"], default: "Draft" },
  submissions: [submissionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model("User", userSchema);
const Assignment = mongoose.model("Assignment", assignmentSchema);

// Routes

// Add new user
app.post("/addNewUser", async (req, res) => {
  try {
    const { name, email, phone, designation, password } = req.body;

    if (!name || !email || !designation || !password) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already present" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, phone, designation, password: hashedPassword });
    await newUser.save();

    const mailOptions = {
      from: `"EduPortal" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Welcome to EduPortal!",
      html: `<h3>Hello ${name},</h3>
             <p>Your account has been successfully created as <strong>${designation}</strong> in EduPortal.</p>
             <p><strong>Login Credentials:</strong></p>
             <p>Email: ${email}</p>
             <p>Password: ${password}</p>
             <br>
             <p>Please change your password after first login.</p>
             <br>
             <p>EduPortal Team</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("Email send error:", error);
      else console.log("Email sent:", info.response);
    });

    const { password: _, ...userWithoutPassword } = newUser._doc;
    res.status(201).json({ message: "User added successfully", user: userWithoutPassword });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
app.get("/getAllUsers", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    if (!users || users.length === 0) return res.status(404).json({ message: "No users found" });

    res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Provide email and password." });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials." });

    const token = jwt.sign(
      { id: user._id, role: user.designation, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ token, role: user.designation, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// Create assignment
app.post("/assignments", async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const newAssignment = new Assignment({ title, description, dueDate });
    await newAssignment.save();

    res.status(201).json({ message: "Assignment created successfully", assignment: newAssignment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all assignments
app.get("/assignments", async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    res.status(200).json({ assignments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update assignment
app.put("/assignments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined) assignment.dueDate = dueDate;
    if (status !== undefined) assignment.status = status;

    await assignment.save();
    res.status(200).json({ message: "Assignment updated successfully", assignment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete assignment
app.delete("/assignments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAssignment = await Assignment.findByIdAndDelete(id);
    if (!deletedAssignment) return res.status(404).json({ message: "Assignment not found" });

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get published assignments
app.get("/assignments/published", async (req, res) => {
  try {
    const assignments = await Assignment.find({ status: { $in: ["Published", "Completed"] } }).sort({ createdAt: -1 });
    res.status(200).json({ assignments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Student submits assignment
app.post("/assignments/:id/submit", authMiddleware, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    const studentName = req.user.name;
    const studentEmail = req.user.email;
    const { answer } = req.body;
    if (!answer) return res.status(400).json({ message: "Answer is required" });

    assignment.submissions.push({ studentName, studentEmail, answer });
    await assignment.save();

    res.status(201).json({ message: "Submitted successfully", submission: { studentName, studentEmail, answer } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark submission as reviewed
app.put("/assignments/:assignmentId/review/:submissionId", async (req, res) => {
  try {
    const { assignmentId, submissionId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    const submission = assignment.submissions.id(submissionId);
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    submission.reviewed = true;
    assignment.updatedAt = new Date();
    await assignment.save();

    res.status(200).json({ message: "Submission marked as reviewed successfully", submission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Start server
app.listen(process.env.PORT || 8000, () => {
    console.log(`Server running on port ${process.env.PORT || 8000}`);
});
