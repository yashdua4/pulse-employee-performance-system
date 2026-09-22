import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import helmet from 'helmet';
import apiRouter from './routes/index.js';
import { trackRequestVolume } from './middleware/security.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Security: Enable CORS
app.use(cors({
  origin: '*', // For local testing. In production, configure specific allowed domains.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security: Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Relaxed global limit (1000 requests per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again after 15 minutes' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Strict limit (10 attempts per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again after 15 minutes' },
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Lightweight anti-spam limit (50 attempts per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many account creation attempts, please try again after 15 minutes' },
});

app.post('/api/auth/login', authLimiter);
app.post('/api/auth/signup', signupLimiter);
app.post('/api/auth/forgot-password', authLimiter);
app.use('/api/', globalLimiter, trackRequestVolume);

// API Routes
app.use('/api', apiRouter);

// Base route for connectivity checks
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware fallback
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Boot server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});