import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface ICard extends Document {
  cardNumber: string;
  cardHolderName: string;
  type: string;
  expiryDate: string; // Format: "MM/YYYY"
  cvv: string;
  userId: Types.ObjectId;
  maxLimit: number;
  currentBalance: number;
  isActive: boolean;
  isUsed: boolean;  // New field to track if card has been used
  transactions: Array<{
    amount: number;
    merchantId: Types.ObjectId;
    timestamp: Date;
    status: 'pending' | 'completed' | 'failed';
    description: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface ICardModel extends Model<ICard> {
  generateCardDetails(): Promise<{ cardNumber: string; cvv: string; expiryDate: string }>;
  canIssueNewCard(userId: Types.ObjectId): Promise<boolean>;
}

const CardSchema: Schema = new Schema({
  cardNumber: {
    type: String,
    required: true,
    unique: true
  },
  cardHolderName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'virtual',
    enum: ['virtual']
  },
  expiryDate: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        // Validate MM/YYYY format
        const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
        if (!regex.test(v)) return false;
        
        // Check if date is in future
        const [month, year] = v.split('/');
        const expiryDate = new Date(parseInt(year), parseInt(month) - 1);
        return expiryDate > new Date();
      },
      message: 'Expiry date must be in MM/YYYY format and in the future'
    }
  },
  cvv: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maxLimit: {
    type: Number,
    required: true,
    default: 10000 // Fixed max limit of 10,000
  },
  currentBalance: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  transactions: [{
    amount: {
      type: Number,
      required: true
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    description: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Static method to check if user can issue new card
CardSchema.statics.canIssueNewCard = async function(userId: Types.ObjectId): Promise<boolean> {
  const activeCardsCount = await this.countDocuments({
    userId,
    isActive: true,
    isUsed: false
  });
  return activeCardsCount < 5;
};

// Static method to generate card details
CardSchema.statics.generateCardDetails = async function(): Promise<{ cardNumber: string; cvv: string; expiryDate: string }> {
  const Card = mongoose.model('Card');
  let cardNumber = '';
  let isUnique = false;
  
  while (!isUnique) {
    cardNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const existingCard = await Card.findOne({ cardNumber });
    if (!existingCard) {
      isUnique = true;
    }
  }

  const cvv = Math.floor(100 + Math.random() * 900).toString();
  
  // Set expiry date to 1 year from now in MM/YYYY format
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
  const year = expiryDate.getFullYear();
  
  return {
    cardNumber,
    cvv,
    expiryDate: `${month}/${year}`
  };
};

// Helper method to check if card is expired
CardSchema.methods.isExpired = function(): boolean {
  const [month, year] = this.expiryDate.split('/');
  const expiryDate = new Date(parseInt(year), parseInt(month) - 1);
  return expiryDate < new Date();
};

// Pre-save middleware to ensure maxLimit is fixed
CardSchema.pre('save', function(next) {
  this.maxLimit = 10000; // Force maxLimit to be 10000
  next();
});

const Card = mongoose.model<ICard, ICardModel>('Card', CardSchema);
export default Card; 