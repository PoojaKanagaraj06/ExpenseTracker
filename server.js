const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    
}));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

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

// Logout Route
// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("Failed to log out");
        }
        // Clear the cookie
        res.clearCookie('connect.sid'); // Assuming 'connect.sid' is your session cookie
        // Send a response indicating successful logout
        res.status(200).json({ message: 'Logout successful' });
    });
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

app.get('/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});
app.use(express.static('public'));
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

// Chatbot route
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Conversion rate from AED to INR (example rate, you may need to update it)
const AED_TO_INR = 20;

app.post('/chat', async (req, res) => {
    try {
        const { userMessage } = req.body;

        if (!userMessage) {
            return res.status(400).json({ error: "Message cannot be empty" });
        }

        // Check if the message is a greeting
        const greetings = ["hello", "hi", "hey","hlo"];
        const isGreeting = greetings.some(greeting => userMessage.toLowerCase().includes(greeting));

        if (isGreeting) {
            return res.json({ botReply: "How can I assist you?" });
        }
         // Check if the message is budget-related
         const budgetKeywords = ["budget", "expense", "spending", "cost", "finance", "money","income","salary","inr"];
         const isBudgetRelated = budgetKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
 
         if (!isBudgetRelated) {
             return res.json({ botReply: "Sorry, I can't assist with that." });
         }
 
         const model = genAI.getGenerativeModel({ model: "gemini-pro" });
         const response = await model.generateContent(userMessage);
         let botReply = response.response.candidates[0]?.content.parts[0]?.text;
 
         if (!botReply) {
             return res.status(500).json({ error: "Failed to get a valid response from the bot." });
         }
 
         // Convert AED amounts to INR in the bot reply
         botReply = botReply.replace(/AED\s*([\d,]+)/g, (match, p1) => {
             const amountInAED = parseFloat(p1.replace(/,/g, ''));
             const amountInINR = (amountInAED * AED_TO_INR).toFixed(2);
             return `INR ${amountInINR}`;
         });
         res.json({ botReply });
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            res.status(500).json({ error: "Failed to get response from Gemini" });
        }
    });
    
// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));