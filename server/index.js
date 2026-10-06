require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

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
  gymDates: [String],
  leaveDates: [String],
  restDates: [String],
  updatedAt: { type: Date, default: Date.now }
});

const FitnessData = mongoose.model('FitnessData', fitnessSchema);


// ── Admin auth ──────────────────────────────────────────
// The admin password is stored hashed (scrypt) in MongoDB and can be changed from the app.
// On first run, if no admin exists yet, it is seeded from ADMIN_PASSWORD in .env (optional,
// only used once). Login returns a signed, expiring token; every write route verifies it.
const adminSchema = new mongoose.Schema({
  key: { type: String, default: 'admin', unique: true },
  salt: String,
  hash: String,
  tokenSecret: String
});
const Admin = mongoose.model('Admin', adminSchema);

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

let adminCache = null; // { salt, hash, tokenSecret }
async function loadAdmin() {
  let doc = await Admin.findOne({ key: 'admin' });
  if (!doc && process.env.ADMIN_PASSWORD) {
    const salt = crypto.randomBytes(16).toString('hex');
    doc = await Admin.create({
      salt,
      hash: hashPassword(process.env.ADMIN_PASSWORD, salt),
      tokenSecret: crypto.randomBytes(32).toString('hex')
    });
    console.log('🔐 Admin password seeded from ADMIN_PASSWORD (now stored in MongoDB)');
  }
  adminCache = doc ? { salt: doc.salt, hash: doc.hash, tokenSecret: doc.tokenSecret } : null;
  if (!adminCache) console.warn('⚠️  No admin password set - editing is disabled.');
}
mongoose.connection.once('open', () => loadAdmin().catch(err => console.error('Admin load error:', err)));

const checkPassword = (password) =>
  !!adminCache && typeof password === 'string' &&
  safeEqual(hashPassword(password, adminCache.salt), adminCache.hash);

const sign = (payload) =>
  crypto.createHmac('sha256', adminCache ? adminCache.tokenSecret : '').update(payload).digest('hex');
const makeToken = () => {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp)}`;
};
const isValidToken = (token = '') => {
  const [exp, sig] = token.split('.');
  return !!adminCache && !!exp && !!sig && safeEqual(sig, sign(exp)) && Number(exp) > Date.now();
};
const requireAdmin = (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!isValidToken(token)) return res.status(401).json({ error: 'Admin login required' });
  next();
};

// Simple brute-force throttle: 5 failures per IP per 15 minutes
const failures = new Map();
const WINDOW = 15 * 60 * 1000;
const throttled = (ip) => {
  const rec = failures.get(ip);
  return !!rec && rec.count >= 5 && Date.now() - rec.first < WINDOW;
};
const recordFailure = (ip) => {
  const rec = failures.get(ip);
  const fresh = !rec || Date.now() - rec.first >= WINDOW;
  failures.set(ip, fresh ? { count: 1, first: Date.now() } : { ...rec, count: rec.count + 1 });
};

app.post('/api/login', (req, res) => {
  if (throttled(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  if (!checkPassword((req.body || {}).password)) {
    recordFailure(req.ip);
    return res.status(401).json({ error: 'Incorrect password' });
  }
  failures.delete(req.ip);
  res.json({ token: makeToken() });
});

app.get('/api/verify', requireAdmin, (req, res) => res.json({ ok: true }));

// Change the admin password (requires being logged in AND the current password).
// Rotating the token secret signs out every other session.
app.post('/api/change-password', requireAdmin, async (req, res) => {
  try {
    if (throttled(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    const { currentPassword, newPassword } = req.body || {};
    if (!checkPassword(currentPassword)) {
      recordFailure(req.ip);
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const tokenSecret = crypto.randomBytes(32).toString('hex');
    await Admin.findOneAndUpdate(
      { key: 'admin' },
      { salt, hash: hashPassword(newPassword, salt), tokenSecret },
      { upsert: true }
    );
    adminCache = { salt, hash: hashPassword(newPassword, salt), tokenSecret };
    res.json({ token: makeToken() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET route to fetch data (public, read-only)
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
app.post('/api/fitness', requireAdmin, async (req, res) => {
  try {
    // Whitelist fields so clients can't write arbitrary keys
    const allowed = ['personalInfo', 'progressData', 'gymDates', 'leaveDates', 'restDates'];
    const updateData = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
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
