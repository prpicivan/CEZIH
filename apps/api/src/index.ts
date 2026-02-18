import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'CEZIH Healthcare API' });
});

// API Routes
app.use('/api', apiRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CEZIH Healthcare API listening on http://localhost:${PORT}`);
});
