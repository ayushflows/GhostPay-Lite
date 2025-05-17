import express, { Request, Response } from 'express';
import { auth, requireRole } from '../middleware/auth';
import { UserRole } from '../models/User';
import Card, { ICard } from '../models/Card';
import User from '../models/User';
import mongoose from 'mongoose';
import { cardOperationLimiter, analyticsLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Issue new card (only for users)
router.post('/', auth, requireRole([UserRole.USER]), cardOperationLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find user to get their name
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user can issue new card
    const canIssueCard = await Card.canIssueNewCard(new mongoose.Types.ObjectId(userId));
    if (!canIssueCard) {
      return res.status(400).json({ 
        message: 'Maximum active cards limit reached',
        details: 'You can only have a maximum of 5 active cards at a time'
      });
    }

    // Generate card details
    const cardDetails = await Card.generateCardDetails();

    // Create new card with generated details
    const card = new Card({
      ...cardDetails,
      cardHolderName: user.name,
      userId: new mongoose.Types.ObjectId(userId)
    });

    await card.save();

    res.status(201).json({
      message: 'Virtual card issued successfully',
      card: {
        id: card._id,
        cardNumber: card.cardNumber,
        cardHolderName: card.cardHolderName,
        type: card.type,
        expiryDate: card.expiryDate,
        cvv: card.cvv,
        maxLimit: card.maxLimit,
        isActive: card.isActive
      }
    });
  } catch (error) {
    console.error('Error issuing card:', error);
    res.status(500).json({ message: 'Error issuing card' });
  }
});

// Get card status (for users and admins)
router.get('/:id', auth, requireRole([UserRole.USER, UserRole.ADMIN]), cardOperationLimiter, async (req: Request, res: Response) => {
  try {
    const cardId = req.params.id;
    const userId = req.user?._id;
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
      isUsed: card.isUsed,
      transactions: card.transactions
    };

    // Include CVV only for the card owner (user) and if card is not used
    if (userRole === UserRole.USER && !card.isUsed) {
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

// Get user analytics (only for users)
router.get('/analytics/overview', auth, requireRole([UserRole.USER]), analyticsLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get all cards for the user
    const cards = await Card.find({ userId: new mongoose.Types.ObjectId(userId) }).exec() as (ICard & { _id: mongoose.Types.ObjectId })[];

    // Calculate total analytics
    const totalAnalytics = {
      totalCards: cards.length,
      activeCards: 0,
      usedCards: 0,
      totalSpent: 0,
      totalOutstanding: 0,
      merchantTransactions: new Map<string, { count: number; total: number }>(),
      monthlySpending: new Map<string, number>(),
      cardDetails: [] as Array<{
        cardId: string;
        cardNumber: string;
        cardHolderName: string;
        currentBalance: number;
        maxLimit: number;
        isActive: boolean;
        isUsed: boolean;
        totalTransactions: number;
        totalSpent: number;
        lastTransactionDate: Date | null;
        topMerchants: Array<{
          merchantId: string;
          count: number;
          total: number;
        }>;
        transactions: Array<{
          id: string;
          amount: number;
          timestamp: Date;
          status: string;
          description: string;
        }>;
      }>
    };

    // Process each card
    for (const card of cards) {
      const cardAnalytics = {
        cardId: card._id.toString(),
        cardNumber: card.cardNumber,
        cardHolderName: card.cardHolderName,
        currentBalance: card.currentBalance,
        maxLimit: card.maxLimit,
        isActive: card.isActive,
        isUsed: card.isUsed,
        totalTransactions: card.transactions.length,
        totalSpent: 0,
        lastTransactionDate: null as Date | null,
        topMerchants: [] as Array<{
          merchantId: string;
          count: number;
          total: number;
        }>,
        transactions: [] as Array<{
          id: string;
          amount: number;
          timestamp: Date;
          status: string;
          description: string;
        }>
      };

      const merchantMap = new Map<string, { count: number; total: number }>();

      // Process transactions
      for (const transaction of card.transactions) {
        if (transaction.status === 'completed') {
          // Update card analytics
          cardAnalytics.totalSpent += transaction.amount;
          if (!cardAnalytics.lastTransactionDate || transaction.timestamp > cardAnalytics.lastTransactionDate) {
            cardAnalytics.lastTransactionDate = transaction.timestamp;
          }

          // Update merchant analytics
          const merchantId = transaction.merchantId.toString();
          const merchantData = merchantMap.get(merchantId) || { count: 0, total: 0 };
          merchantData.count++;
          merchantData.total += transaction.amount;
          merchantMap.set(merchantId, merchantData);

          // Update global merchant analytics
          const globalMerchantData = totalAnalytics.merchantTransactions.get(merchantId) || { count: 0, total: 0 };
          globalMerchantData.count++;
          globalMerchantData.total += transaction.amount;
          totalAnalytics.merchantTransactions.set(merchantId, globalMerchantData);

          // Update monthly spending
          const monthYear = transaction.timestamp.toISOString().slice(0, 7);
          totalAnalytics.monthlySpending.set(
            monthYear,
            (totalAnalytics.monthlySpending.get(monthYear) || 0) + transaction.amount
          );

          // Add transaction to card analytics
          cardAnalytics.transactions.push({
            id: transaction.transactionId,
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            status: transaction.status,
            description: transaction.description
          });
        }
      }

      // Update total analytics
      totalAnalytics.totalSpent += cardAnalytics.totalSpent;
      if (card.isActive && !card.isUsed) totalAnalytics.activeCards++;
      if (card.isUsed) totalAnalytics.usedCards++;

      // Convert merchant map to array and sort by total spent
      cardAnalytics.topMerchants = Array.from(merchantMap.entries())
        .map(([merchantId, data]) => ({ merchantId, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Add transaction IDs to card analytics
      cardAnalytics.transactions = card.transactions.map(t => ({
        id: t.transactionId,
        amount: t.amount,
        timestamp: t.timestamp,
        status: t.status,
        description: t.description
      }));

      totalAnalytics.cardDetails.push(cardAnalytics);
    }

    // Get user's outstanding amount
    const user = await User.findById(userId);
    if (user) {
      totalAnalytics.totalOutstanding = user.outstandingAmount || 0;
    }

    // Convert merchant transactions to array and sort by total spent
    const merchantAnalytics = Array.from(totalAnalytics.merchantTransactions.entries())
      .map(([merchantId, data]) => ({ merchantId, ...data }))
      .sort((a, b) => b.total - a.total);

    // Convert monthly spending to array and sort by date
    const monthlySpending = Array.from(totalAnalytics.monthlySpending.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Get merchant names
    const merchantIds = merchantAnalytics.map(m => new mongoose.Types.ObjectId(m.merchantId));
    const merchants = await User.find({ _id: { $in: merchantIds } }, 'name');
    const merchantMap = new Map(merchants.map(m => [m._id.toString(), m.name]));

    // Add merchant names to analytics
    const merchantAnalyticsWithNames = merchantAnalytics.map(merchant => ({
      ...merchant,
      merchantName: merchantMap.get(merchant.merchantId) || 'Unknown Merchant'
    }));

    res.json({
      overview: {
        totalCards: totalAnalytics.totalCards,
        activeCards: totalAnalytics.activeCards,
        usedCards: totalAnalytics.usedCards,
        totalSpent: totalAnalytics.totalSpent,
        totalOutstanding: totalAnalytics.totalOutstanding
      },
      spending: {
        monthly: monthlySpending,
        byMerchant: merchantAnalyticsWithNames
      },
      cards: totalAnalytics.cardDetails.map(card => ({
        ...card,
        topMerchants: card.topMerchants.map(merchant => ({
          ...merchant,
          merchantName: merchantMap.get(merchant.merchantId) || 'Unknown Merchant'
        }))
      }))
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: 'Error fetching user analytics' });
  }
});

export default router; 