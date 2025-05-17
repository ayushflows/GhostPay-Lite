import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '../models/User';

// Use a consistent secret key
const JWT_SECRET = process.env.JWT_SECRET || 'ghostcard-secret-key-2024';

export interface JwtPayload {
  userId: string;
  _id: string;
  email: string;
  role: UserRole;
}

export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: '1h' };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, JWT_SECRET, options);
}; 