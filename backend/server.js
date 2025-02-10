const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Middleware (Allow frontend requests)
app.use(cors({
    origin: 'https://thespendsmart.netlify.app', // Replace with your Netlify frontend domain
    credentials: true
}));

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Verify environment variables
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('SESSION_SECRET:', process.env.SESSION_SECRET);

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/yourdbname'
    }),
    cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 } // 1-day session expiry
}));

// Disable caching
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

// Authentication Middleware
const authenticateUser = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// Signup Route
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Signup successful' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

        req.session.user = user; // Store user in session
        res.status(200).json({ message: 'Login successful', name: user.name });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).send("Failed to log out");
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logout successful' });
    });
});

// Income Schema
const incomeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: String,
    date: Date,
    amount: Number,
    category: String
});

const Income = mongoose.model('Income', incomeSchema);

// Expense Schema
const expenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: String,
    date: Date,
    amount: Number,
    category: String
});

const Expense = mongoose.model('Expense', expenseSchema);

// Fetch Income
app.get('/incomes', authenticateUser, async (req, res) => {
    try {
        const incomes = await Income.find({ userId: req.session.user._id });
        res.status(200).json(incomes);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Income
app.post('/add-income', authenticateUser, async (req, res) => {
    const { description, date, amount, category } = req.body;
    if (!description || !date || isNaN(amount) || !category) {
        return res.status(400).json({ message: 'Invalid data' });
    }
    try {
        const newIncome = new Income({ userId: req.session.user._id, description, date, amount, category });
        await newIncome.save();
        res.status(201).json({ message: 'Income added successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Fetch Expenses
app.get('/expenses', authenticateUser, async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.session.user._id });
        res.status(200).json(expenses);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Expense
app.post('/add-expense', authenticateUser, async (req, res) => {
    const { description, date, amount, category } = req.body;
    if (!description || !date || isNaN(amount) || !category) {
        return res.status(400).json({ message: 'Invalid data' });
    }
    try {
        const newExpense = new Expense({ userId: req.session.user._id, description, date, amount, category });
        await newExpense.save();
        res.status(201).json({ message: 'Expense added successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Chatbot Route
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const AED_TO_INR = 20;

app.post('/chat', async (req, res) => {
    try {
        const { userMessage } = req.body;
        if (!userMessage) return res.status(400).json({ error: "Message cannot be empty" });

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const response = await model.generateContent(userMessage);
        let botReply = response.response.candidates[0]?.content.parts[0]?.text || "I couldn't process that request.";

        botReply = botReply.replace(/AED\s*([\d,]+)/g, (match, p1) => INR ${(parseFloat(p1.replace(/,/g, '')) * AED_TO_INR).toFixed(2)});
        botReply = botReply.replace(/["*]/g, '');

        res.json({ botReply });
    } catch (error) {
        res.status(500).json({ error: "Failed to get response from Gemini" });
    }
});

// Start Server
app.listen(PORT, () => console.log(Server running on port ${PORT}));
