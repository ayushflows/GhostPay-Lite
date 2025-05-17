import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      message: 'Too many requests from this IP, please try again after 15 minutes',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Stricter limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      message: 'Too many login attempts, please try again after an hour',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Stricter limiter for card operations
export const cardOperationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: 'Too many card operations, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      message: 'Too many card operations, please try again after an hour',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Stricter limiter for charge operations
export const chargeOperationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many charge operations, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      message: 'Too many charge operations, please try again after an hour',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Analytics rate limiter
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many analytics requests, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      message: 'Too many analytics requests, please try again after 5 minutes',
      retryAfter: res.getHeader('Retry-After')
    });
  }
}); 