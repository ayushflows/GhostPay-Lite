import express, { Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '../models/User';
import Card from '../models/Card';

const router = express.Router();

// Issue new card (only for users)
router.post('/', authMiddleware, requireRole([UserRole.USER]), async (req: Request, res: Response) => {
  try {
    const { cardHolderName, maxLimit } = req.body;
    const userId = req.user?.userId;

    const card = new Card({
      cardHolderName,
      maxLimit: maxLimit || 10000,
      userId
    });

    await card.save();

    res.status(201).json({
      message: 'Card issued successfully',
      card: {
        id: card._id,
        cardNumber: card.cardNumber,
        cardHolderName: card.cardHolderName,
        type: card.type,
        expiryDate: card.expiryDate,
        cvv: card.cvv,
        maxLimit: card.maxLimit,
        currentBalance: card.currentBalance,
        isActive: card.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error issuing card' });
  }
});

// Get card status (for users and admins)
router.get('/:id', authMiddleware, requireRole([UserRole.USER, UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const cardId = req.params.id;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const query = userRole === UserRole.ADMIN 
      ? { _id: cardId }
      : { _id: cardId, userId };

    const card = await Card.findOne(query);

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    res.json({
      card: {
        id: card._id,
        cardNumber: card.cardNumber,
        cardHolderName: card.cardHolderName,
        type: card.type,
        expiryDate: card.expiryDate,
        maxLimit: card.maxLimit,
        currentBalance: card.currentBalance,
        isActive: card.isActive,
        transactions: card.transactions
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving card' });
  }
});

export default router; 