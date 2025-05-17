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
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  cardId: {
    type: Schema.Types.ObjectId,
    ref: 'Card',
    required: true,
    index: true
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
    required: true,
    index: true
  },
  merchantName: {
    type: String,
    required: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
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

export default mongoose.model<ITransaction>('Transaction', TransactionSchema); 