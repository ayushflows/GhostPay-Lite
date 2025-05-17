import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  transactionId: string;
  amount: number;
  cardId: Types.ObjectId;
  cardNumber: string;
  cardHolderName: string;
  merchantId: Types.ObjectId;
  merchantName: string;
  customerId: Types.ObjectId;
  customerName: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  timestamp: Date;
  metadata: {
    ipAddress?: string;
    location?: string;
    deviceInfo?: string;
  };
}

const TransactionSchema: Schema = new Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  cardId: {
    type: Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  cardNumber: {
    type: String,
    required: true
  },
  cardHolderName: {
    type: String,
    required: true
  },
  merchantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  merchantName: {
    type: String,
    required: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    ipAddress: String,
    location: String,
    deviceInfo: String
  }
}, {
  timestamps: true
});

// Generate unique transaction ID
TransactionSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.transactionId = `TXN${timestamp}${random}`;
  }
  next();
});

// Indexes for better query performance
TransactionSchema.index({ transactionId: 1 });
TransactionSchema.index({ cardId: 1 });
TransactionSchema.index({ merchantId: 1 });
TransactionSchema.index({ customerId: 1 });
TransactionSchema.index({ timestamp: -1 });
TransactionSchema.index({ status: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema); 