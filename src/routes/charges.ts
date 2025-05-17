import express, { Request, Response } from 'express';
import { auth, requireRole } from '../middleware/auth';
import { UserRole } from '../models/User';
import Card, { ICard } from '../models/Card';
import User from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// Process card charge (only for merchants)
router.post('/', auth, requireRole([UserRole.MERCHANT]), async (req: Request, res: Response) => {
  try {
    const { cardNumber, cvv, expiryDate, amount, description } = req.body;
    const merchantId = req.user?._id;

    if (!cardNumber || !cvv || !expiryDate || !amount || !description || !merchantId) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['cardNumber', 'cvv', 'expiryDate', 'amount', 'description']
      });
    }

    // Validate expiry date format (MM/YYYY)
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!expiryRegex.test(expiryDate)) {
      return res.status(400).json({ 
        message: 'Invalid expiry date format',
        expectedFormat: 'MM/YYYY'
      });
    }

    // Find card by number
    const cardDoc = await Card.findOne({ 
      cardNumber,
      isActive: true,
      isUsed: false
    });

    if (!cardDoc) {
      return res.status(404).json({ 
        message: 'Card not found or invalid',
        details: 'The card may be expired, used, or inactive'
      });
    }

    // Type assertion after null check
    const card = cardDoc as unknown as ICard & { isExpired(): boolean };

    // Verify CVV
    if (card.cvv !== cvv) {
      return res.status(400).json({ message: 'Invalid CVV' });
    }

    // Verify expiry date
    if (card.expiryDate !== expiryDate) {
      return res.status(400).json({ message: 'Invalid expiry date' });
    }

    // Check if card has expired using the helper method
    if (card.isExpired()) {
      return res.status(400).json({ message: 'Card has expired' });
    }

    // Check if amount exceeds max limit
    if (amount > card.maxLimit) {
      return res.status(400).json({ 
        message: 'Charge amount exceeds card limit',
        maxLimit: card.maxLimit
      });
    }

    // Add transaction
    card.transactions.push({
      amount,
      merchantId: new mongoose.Types.ObjectId(merchantId),
      timestamp: new Date(),
      status: 'completed',
      description
    });

    // Update card status
    card.currentBalance = amount;
    card.isUsed = true;
    card.isActive = false;

    await cardDoc.save();

    // Update user's outstanding amount
    const user = await User.findById(card.userId);
    if (user) {
      user.outstandingAmount = (user.outstandingAmount || 0) + amount;
      await user.save();
    }

    res.status(200).json({
      message: 'Charge processed successfully',
      transaction: {
        amount,
        status: 'completed',
        timestamp: new Date(),
        description,
        cardNumber: card.cardNumber,
        cardHolderName: card.cardHolderName
      }
    });
  } catch (error) {
    console.error('Charge processing error:', error);
    res.status(500).json({ message: 'Error processing charge' });
  }
});

export default router; 