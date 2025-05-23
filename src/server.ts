import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import cardRoutes from './routes/cards';
import chargeRoutes from './routes/charges';
import connectDB from './config/database';
import transactionRoutes from './routes/transaction';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app: Express = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: ['https://ghost-pay-frontend.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/cards', cardRoutes);
app.use('/charges', chargeRoutes);
app.use('/transactions', transactionRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to GhostPay Lite API backend' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
}); 