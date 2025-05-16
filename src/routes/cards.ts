import express, { Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '../models/User';
import Card from '../models/Card';
import User from '../models/User';

const router = express.Router();

// Issue new card (only for users)
router.post('/', authMiddleware, requireRole([UserRole.USER]), async (req: Request, res: Response) => {
  try {
    const { maxLimit } = req.body;
    const userId = req.user?.userId;

    // Find user to get their name
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check number of existing cards for the user
    const existingCardsCount = await Card.countDocuments({ userId });
    if (existingCardsCount >= 5) {
      return res.status(400).json({ 
        message: 'Maximum card limit reached',
        details: 'You can only have a maximum of 5 cards'
      });
    }

    // Generate card details
    const cardDetails = await Card.generateCardDetails();

    // Create new card with generated details
    const card = new Card({
      ...cardDetails,
      cardHolderName: user.name,
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
      },
      cardsRemaining: 5 - (existingCardsCount + 1)
    });
  } catch (error) {
    console.error('Error issuing card:', error);
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

    // Prepare card response based on user role
    const cardResponse = {
      id: card._id,
      cardNumber: card.cardNumber,
      cardHolderName: card.cardHolderName,
      type: card.type,
      expiryDate: card.expiryDate,
      maxLimit: card.maxLimit,
      currentBalance: card.currentBalance,
      isActive: card.isActive,
      transactions: card.transactions
    };

    // Include CVV only for the card owner (user)
    if (userRole === UserRole.USER) {
      Object.assign(cardResponse, { cvv: card.cvv });
    }

    res.json({
      card: cardResponse
    });
  } catch (error) {
    console.error('Error retrieving card:', error);
    res.status(500).json({ message: 'Error retrieving card' });
  }
});

export default router; 