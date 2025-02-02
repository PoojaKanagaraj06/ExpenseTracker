const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

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
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        req.session.user = user; // Store user in session
        res.status(200).json({ message: 'Login successful', name: user.name });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Middleware to authenticate user
const authenticateUser = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

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

// Fetch Income Route
app.get('/incomes', authenticateUser, async (req, res) => {
    const userId = req.session.user._id; // Get user ID from session
    try {
        const incomes = await Income.find({ userId });
        res.status(200).json(incomes);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Income Route
app.post('/add-income', authenticateUser, async (req, res) => {
    const { description, date, amount, category } = req.body;
    const userId = req.session.user._id; // Get user ID from session

    // Validate incoming data
    if (!description || !date || isNaN(amount) || !category) {
        return res.status(400).json({ message: 'Invalid data' });
    }

    try {
        const newIncome = new Income({ userId, description, date, amount, category });
        await newIncome.save();
        res.status(201).json({ message: 'Income added successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Fetch Expense Route
app.get('/expenses', authenticateUser, async (req, res) => {
    const userId = req.session.user._id; // Get user ID from session
    try {
        const expenses = await Expense.find({ userId });
        res.status(200).json(expenses);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Expense Route
// Add Expense Route
app.post('/add-expense', authenticateUser, async (req, res) => {
    const { description, date, amount, category } = req.body;
    const userId = req.session.user._id; // Get user ID from session

    // Validate incoming data
    if (!description || !date || isNaN(amount) || !category) {
        return res.status(400).json({ message: 'Invalid data' });
    }

    try {
        const newExpense = new Expense({ userId, description, date, amount, category });
        await newExpense.save();
       
        res.status(201).json({ message: 'Expense added successfully' });
    } catch (err) {
        
        res.status(500).json({ message: 'Server error' });
    }
}); 


if (typeof fetchIncomeData === 'function') {
    fetchIncomeData();
}

if (typeof fetchExpenseData === 'function') {
    fetchExpenseData();
}

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));