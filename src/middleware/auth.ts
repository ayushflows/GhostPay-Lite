import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement JWT verification
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // TODO: Verify token and attach user to request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}; 