import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole, IUser } from '../models/User';
import { generateToken, generateRefreshToken, JwtPayload } from '../utils/jwt';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = express.Router();

// Register route with role
router.post('/register/:role', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const role = req.params.role as UserRole;

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role
    });

    const savedUser = await user.save();

    // Generate tokens
    const token = generateToken({
      userId: savedUser._id.toString(),
      email: savedUser.email,
      role: savedUser.role
    });

    const refreshToken = generateRefreshToken({
      userId: savedUser._id.toString(),
      email: savedUser.email,
      role: savedUser.role
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken,
      user: {
        id: savedUser._id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error in registration' });
  }
});

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset failed attempts and update last login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    const updatedUser = await user.save();

    // Generate tokens
    const token = generateToken({
      userId: updatedUser._id.toString(),
      email: updatedUser.email,
      role: updatedUser.role
    });

    const refreshToken = generateRefreshToken({
      userId: updatedUser._id.toString(),
      email: updatedUser.email,
      role: updatedUser.role
    });

    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error in login' });
  }
});

// Refresh token route
router.post('/refresh-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
    const newToken = generateToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

export default router; 