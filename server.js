require("dotenv").config();
const path = require('path');
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// --- NEW CODE STARTS HERE ---

// 1. Serve static files (CSS, Images, JS) from the frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

// 2. Serve the HTML file when someone visits the homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// --- NEW CODE ENDS HERE ---

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});