require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Basic schema for Fitness Data
const fitnessSchema = new mongoose.Schema({
  userId: { type: String, default: "user_1" },
  personalInfo: Object,
  bodyComponent: Object,
  obesityAnalysis: Object,
  fatAnalysis: Object,
  muscleAnalysis: Object,
  segmentalAnalysis: Object,
  edemaAnalysis: Object,
  weightManagement: Object,
  bodyType: String,
  progressData: [Object],
  updatedAt: { type: Date, default: Date.now }
});

const FitnessData = mongoose.model('FitnessData', fitnessSchema);

// GET route to fetch data
app.get('/api/fitness', async (req, res) => {
  try {
    const data = await FitnessData.findOne({ userId: "user_1" });
    if (!data) {
      return res.status(404).json({ message: "No data found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST/PUT route to update data
app.post('/api/fitness', async (req, res) => {
  try {
    const updateData = req.body;
    updateData.updatedAt = Date.now();
    
    // Update or create if it doesn't exist (upsert)
    const result = await FitnessData.findOneAndUpdate(
      { userId: "user_1" },
      updateData,
      { new: true, upsert: true }
    );
    
    res.json({ message: "Data updated successfully", data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const path = require('path');
// Serve static frontend files from the React build (../dist)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Catch-all route to serve the React app
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
