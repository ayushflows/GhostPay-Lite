import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      message: 'Too many requests from this IP, please try again after 15 minutes',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Stricter limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 5 requests per windowMs
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
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 10 requests per windowMs
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
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per windowMs
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
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
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