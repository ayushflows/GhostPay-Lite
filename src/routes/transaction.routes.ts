import express from 'express';
import { auth } from '../middleware/auth';
import Transaction from '../models/Transaction';
import { UserRole } from '../models/User';

const router = express.Router();

// Get transaction details with role-based access
router.get('/:transactionId', auth, async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const transaction = await Transaction.findById(req.params.transactionId);

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
      populatedTransaction = await Transaction.findById(req.params.transactionId)
        .populate('cardId', 'cardNumber cardHolderName')
        .populate('merchantId', 'name email')
        .populate('customerId', 'name email');
    } else if (isMerchant) {
      // Merchant gets customer details but not card details
      populatedTransaction = await Transaction.findById(req.params.transactionId)
        .populate('customerId', 'name email')
        .select('-cardId');
    } else {
      // Customer gets merchant details but not card details
      populatedTransaction = await Transaction.findById(req.params.transactionId)
        .populate('merchantId', 'name email')
        .select('-cardId');
    }

    res.json({ transaction: populatedTransaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ message: 'Error fetching transaction details' });
  }
});

export default router; 