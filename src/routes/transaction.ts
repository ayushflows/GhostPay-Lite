import express, { Request, Response } from 'express';
import { auth, requireRole } from '../middleware/auth';
import Transaction from '../models/Transaction';
import { UserRole } from '../models/User';
import mongoose from 'mongoose';
import User from '../models/User';
import { generalLimiter, analyticsLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Apply general rate limiter to all routes
router.use(generalLimiter);

// Get transaction details with role-based access
router.get('/:transactionId', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const transaction = await Transaction.findOne({ transactionId: req.params.transactionId });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check access based on role
    const isAdmin = req.user.role === UserRole.ADMIN;
    const isMerchant = req.user.role === UserRole.MERCHANT && transaction.merchantId.toString() === req.user._id;
    const isCustomer = req.user.role === UserRole.USER && transaction.customerId.toString() === req.user._id;

    if (!isAdmin && !isMerchant && !isCustomer) {
      return res.status(403).json({ message: 'Access denied to this transaction' });
    }

    // Populate fields based on role
    let populatedTransaction;
    if (isAdmin) {
      // Admin gets full details
      populatedTransaction = await Transaction.findOne({ transactionId: req.params.transactionId })
        .populate('cardId', 'cardNumber cardHolderName')
        .populate('merchantId', 'name email')
        .populate('customerId', 'name email');
    } else if (isMerchant) {
      // Merchant gets customer details but not card details
      populatedTransaction = await Transaction.findOne({ transactionId: req.params.transactionId })
        .populate('customerId', 'name email')
        .select('-cardId');
    } else {
      // Customer gets merchant details but not card details
      populatedTransaction = await Transaction.findOne({ transactionId: req.params.transactionId })
        .populate('merchantId', 'name email')
        .select('-cardId');
    }

    res.json({ transaction: populatedTransaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ message: 'Error fetching transaction details' });
  }
});

// Get merchant analytics (for merchants and admins)
router.get('/analytics/merchant', auth, requireRole([UserRole.MERCHANT, UserRole.ADMIN]), analyticsLimiter, async (req: Request, res: Response) => {
  try {
    let merchantId: string | mongoose.Types.ObjectId;
    
    if (req.user?.role === UserRole.ADMIN) {
      if (!req.query.merchantId || typeof req.query.merchantId !== 'string') {
        return res.status(400).json({ message: 'Valid merchant ID required for admin' });
      }
      merchantId = new mongoose.Types.ObjectId(req.query.merchantId);
    } else {
      if (!req.user?._id) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      merchantId = new mongoose.Types.ObjectId(req.user._id);
    }

    // Get merchant details
    const merchant = await User.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // Get all transactions for the merchant
    const transactions = await Transaction.find({ merchantId })
      .sort({ timestamp: -1 });

    // Calculate analytics
    const analytics = {
      overview: {
        totalTransactions: transactions.length,
        totalAmount: 0,
        averageAmount: 0,
        successRate: 0,
        totalCustomers: new Set<string>().size
      },
      timeAnalysis: {
        daily: new Map<string, number>(),
        monthly: new Map<string, number>(),
        yearly: new Map<string, number>()
      },
      customerAnalysis: new Map<string, {
        customerId: string;
        customerName: string;
        totalTransactions: number;
        totalAmount: number;
        lastTransaction: Date;
        transactions: Array<{
          id: string;
          amount: number;
          timestamp: Date;
          status: string;
          description: string;
        }>;
      }>(),
      statusBreakdown: {
        completed: 0,
        failed: 0,
        pending: 0
      },
      recentTransactions: [] as Array<{
        id: string;
        amount: number;
        timestamp: Date;
        status: string;
        description: string;
        customerName: string;
      }>
    };

    // Process transactions
    for (const transaction of transactions) {
      // Update overview
      analytics.overview.totalAmount += transaction.amount;
      analytics.statusBreakdown[transaction.status]++;

      // Update time analysis
      const timestamp = transaction.timestamp;
      const dayKey = timestamp.toISOString().split('T')[0];
      const monthKey = timestamp.toISOString().slice(0, 7);
      const yearKey = timestamp.getFullYear().toString();

      analytics.timeAnalysis.daily.set(dayKey, (analytics.timeAnalysis.daily.get(dayKey) || 0) + transaction.amount);
      analytics.timeAnalysis.monthly.set(monthKey, (analytics.timeAnalysis.monthly.get(monthKey) || 0) + transaction.amount);
      analytics.timeAnalysis.yearly.set(yearKey, (analytics.timeAnalysis.yearly.get(yearKey) || 0) + transaction.amount);

      // Update customer analysis
      const customerId = transaction.customerId.toString();
      const customerData = analytics.customerAnalysis.get(customerId) || {
        customerId,
        customerName: transaction.customerName,
        totalTransactions: 0,
        totalAmount: 0,
        lastTransaction: timestamp,
        transactions: []
      };

      customerData.totalTransactions++;
      customerData.totalAmount += transaction.amount;
      if (timestamp > customerData.lastTransaction) {
        customerData.lastTransaction = timestamp;
      }

      customerData.transactions.push({
        id: transaction.transactionId,
        amount: transaction.amount,
        timestamp,
        status: transaction.status,
        description: transaction.description
      });

      analytics.customerAnalysis.set(customerId, customerData);

      // Add to recent transactions (last 10)
      if (analytics.recentTransactions.length < 10) {
        analytics.recentTransactions.push({
          id: transaction.transactionId,
          amount: transaction.amount,
          timestamp,
          status: transaction.status,
          description: transaction.description,
          customerName: transaction.customerName
        });
      }
    }

    // Calculate averages and rates
    analytics.overview.averageAmount = analytics.overview.totalAmount / (transactions.length || 1);
    analytics.overview.successRate = (analytics.statusBreakdown.completed / (transactions.length || 1)) * 100;
    analytics.overview.totalCustomers = analytics.customerAnalysis.size;

    // Convert maps to arrays and sort
    const timeAnalysis = {
      daily: Array.from(analytics.timeAnalysis.daily.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      monthly: Array.from(analytics.timeAnalysis.monthly.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      yearly: Array.from(analytics.timeAnalysis.yearly.entries())
        .map(([year, amount]) => ({ year, amount }))
        .sort((a, b) => a.year.localeCompare(b.year))
    };

    // Convert customer analysis to array and sort by total amount
    const customerAnalysis = Array.from(analytics.customerAnalysis.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({
      merchant: {
        id: merchant._id,
        name: merchant.name,
        email: merchant.email
      },
      overview: analytics.overview,
      timeAnalysis,
      customerAnalysis,
      statusBreakdown: analytics.statusBreakdown,
      recentTransactions: analytics.recentTransactions
    });
  } catch (error) {
    console.error('Error fetching merchant analytics:', error);
    res.status(500).json({ message: 'Error fetching merchant analytics' });
  }
});

// Get admin analytics (admin only)
router.get('/analytics/admin', auth, requireRole([UserRole.ADMIN]), analyticsLimiter, async (req: Request, res: Response) => {
  try {
    // Get all users, merchants, and transactions
    const [users, merchants, transactions] = await Promise.all([
      User.find({ role: UserRole.USER }),
      User.find({ role: UserRole.MERCHANT }),
      Transaction.find().sort({ timestamp: -1 })
    ]);

    // Calculate analytics
    const analytics = {
      overview: {
        totalUsers: users.length,
        totalMerchants: merchants.length,
        totalTransactions: transactions.length,
        totalAmount: 0,
        averageAmount: 0,
        successRate: 0,
        totalOutstanding: 0
      },
      userAnalysis: {
        totalActiveUsers: 0,
        totalInactiveUsers: 0,
        usersWithCards: 0,
        usersWithTransactions: new Set<string>().size,
        userOutstandingAmount: 0
      },
      merchantAnalysis: {
        totalActiveMerchants: 0,
        totalInactiveMerchants: 0,
        merchantsWithTransactions: new Set<string>().size,
        topMerchants: [] as Array<{
          merchantId: string;
          merchantName: string;
          totalTransactions: number;
          totalAmount: number;
          successRate: number;
          uniqueCustomers: number;
        }>
      },
      transactionAnalysis: {
        statusBreakdown: {
          completed: 0,
          failed: 0,
          pending: 0
        },
        timeAnalysis: {
          daily: new Map<string, number>(),
          monthly: new Map<string, number>(),
          yearly: new Map<string, number>()
        },
        recentTransactions: [] as Array<{
          id: string;
          amount: number;
          timestamp: Date;
          status: string;
          description: string;
          merchantName: string;
          customerName: string;
        }>
      },
      cardAnalysis: {
        totalCards: 0,
        activeCards: 0,
        usedCards: 0,
        averageCardsPerUser: 0
      }
    };

    // Process users
    for (const user of users) {
      if (user.isActive) analytics.userAnalysis.totalActiveUsers++;
      else analytics.userAnalysis.totalInactiveUsers++;
      
      analytics.userAnalysis.userOutstandingAmount += user.outstandingAmount || 0;
    }

    // Process merchants
    const merchantTransactionMap = new Map<string, {
      totalTransactions: number;
      totalAmount: number;
      completedTransactions: number;
      customerSet: Set<string>;
    }>();

    for (const merchant of merchants) {
      if (merchant.isActive) analytics.merchantAnalysis.totalActiveMerchants++;
      else analytics.merchantAnalysis.totalInactiveMerchants++;
    }

    // Process transactions
    for (const transaction of transactions) {
      // Update overview
      analytics.overview.totalAmount += transaction.amount;
      analytics.transactionAnalysis.statusBreakdown[transaction.status]++;

      // Update time analysis
      const timestamp = transaction.timestamp;
      const dayKey = timestamp.toISOString().split('T')[0];
      const monthKey = timestamp.toISOString().slice(0, 7);
      const yearKey = timestamp.getFullYear().toString();

      analytics.transactionAnalysis.timeAnalysis.daily.set(
        dayKey,
        (analytics.transactionAnalysis.timeAnalysis.daily.get(dayKey) || 0) + transaction.amount
      );
      analytics.transactionAnalysis.timeAnalysis.monthly.set(
        monthKey,
        (analytics.transactionAnalysis.timeAnalysis.monthly.get(monthKey) || 0) + transaction.amount
      );
      analytics.transactionAnalysis.timeAnalysis.yearly.set(
        yearKey,
        (analytics.transactionAnalysis.timeAnalysis.yearly.get(yearKey) || 0) + transaction.amount
      );

      // Update merchant analysis
      const merchantId = transaction.merchantId.toString();
      const merchantData = merchantTransactionMap.get(merchantId) || {
        totalTransactions: 0,
        totalAmount: 0,
        completedTransactions: 0,
        customerSet: new Set<string>()
      };

      merchantData.totalTransactions++;
      merchantData.totalAmount += transaction.amount;
      if (transaction.status === 'completed') {
        merchantData.completedTransactions++;
      }
      merchantData.customerSet.add(transaction.customerId.toString());
      merchantTransactionMap.set(merchantId, merchantData);

      // Add to recent transactions (last 10)
      if (analytics.transactionAnalysis.recentTransactions.length < 10) {
        analytics.transactionAnalysis.recentTransactions.push({
          id: transaction.transactionId,
          amount: transaction.amount,
          timestamp,
          status: transaction.status,
          description: transaction.description,
          merchantName: transaction.merchantName,
          customerName: transaction.customerName
        });
      }
    }

    // Calculate merchant statistics
    for (const [merchantId, data] of merchantTransactionMap.entries()) {
      const merchant = merchants.find(m => m._id.toString() === merchantId);
      if (merchant) {
        analytics.merchantAnalysis.topMerchants.push({
          merchantId,
          merchantName: merchant.name,
          totalTransactions: data.totalTransactions,
          totalAmount: data.totalAmount,
          successRate: (data.completedTransactions / data.totalTransactions) * 100,
          uniqueCustomers: data.customerSet.size
        });
      }
    }

    // Sort top merchants by total amount
    analytics.merchantAnalysis.topMerchants.sort((a, b) => b.totalAmount - a.totalAmount);

    // Calculate averages and rates
    analytics.overview.averageAmount = analytics.overview.totalAmount / (transactions.length || 1);
    analytics.overview.successRate = (analytics.transactionAnalysis.statusBreakdown.completed / (transactions.length || 1)) * 100;
    analytics.overview.totalOutstanding = analytics.userAnalysis.userOutstandingAmount;

    // Convert time analysis maps to arrays
    const timeAnalysis = {
      daily: Array.from(analytics.transactionAnalysis.timeAnalysis.daily.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      monthly: Array.from(analytics.transactionAnalysis.timeAnalysis.monthly.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      yearly: Array.from(analytics.transactionAnalysis.timeAnalysis.yearly.entries())
        .map(([year, amount]) => ({ year, amount }))
        .sort((a, b) => a.year.localeCompare(b.year))
    };

    res.json({
      overview: analytics.overview,
      userAnalysis: {
        ...analytics.userAnalysis,
        averageOutstandingPerUser: analytics.userAnalysis.userOutstandingAmount / (users.length || 1)
      },
      merchantAnalysis: {
        ...analytics.merchantAnalysis,
        averageTransactionsPerMerchant: transactions.length / (merchants.length || 1),
        averageAmountPerMerchant: analytics.overview.totalAmount / (merchants.length || 1)
      },
      transactionAnalysis: {
        ...analytics.transactionAnalysis,
        timeAnalysis
      }
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ message: 'Error fetching admin analytics' });
  }
});

export default router; 