# Card Management API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Issue New Card
Creates a new card for the authenticated user.

**Endpoint:** `POST /cards`

**Required Role:** USER

**Request Body:**
```json
{
  "cardHolderName": "John Doe",
  "maxLimit": 5000  // Optional, defaults to 10000
}
```

**Response (201 Created):**
```json
{
  "message": "Card issued successfully",
  "card": {
    "id": "65f2e8b7c261e6001234abcd",
    "cardNumber": "123456789012",
    "cardHolderName": "John Doe",
    "type": "credit",
    "expiryDate": "03/2027",  // Format: MM/YYYY
    "cvv": "123",
    "maxLimit": 5000,
    "currentBalance": 0,
    "isActive": true
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User role not authorized
- `500 Internal Server Error`: Server error

### 2. Get Card Status
Retrieves the status and details of a specific card.

**Endpoint:** `GET /cards/:id`

**Required Role:** USER or ADMIN
- Users can only view their own cards
- Admins can view any card

**URL Parameters:**
- `id`: Card ID (MongoDB ObjectId)

**Response (200 OK):**
```json
{
  "card": {
    "id": "65f2e8b7c261e6001234abcd",
    "cardNumber": "123456789012",
    "cardHolderName": "John Doe",
    "type": "credit",
    "expiryDate": "03/2027",  // Format: MM/YYYY
    "maxLimit": 5000,
    "currentBalance": 1000,
    "isActive": true,
    "transactions": [
      {
        "amount": 1000,
        "merchantId": "65f2e8b7c261e6001234efgh",
        "timestamp": "2024-03-15T10:30:00.000Z",
        "status": "completed",
        "description": "Purchase at Store XYZ"
      }
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User role not authorized
- `404 Not Found`: Card not found
- `500 Internal Server Error`: Server error

### 3. Process Card Charge
Processes a charge on a card (Merchant only).

**Endpoint:** `POST /charges`

**Required Role:** MERCHANT

**Request Body:**
```json
{
  "cardNumber": "123456789012",
  "cvv": "123",
  "expiryDate": "03/2027",  // Format: MM/YYYY
  "amount": 1000,
  "description": "Purchase at Store XYZ"
}
```

**Response (200 OK):**
```json
{
  "message": "Charge processed successfully",
  "transaction": {
    "amount": 1000,
    "status": "completed",
    "timestamp": "2024-03-15T10:30:00.000Z",
    "description": "Purchase at Store XYZ",
    "remainingBalance": 4000
  }
}
```

**Error Responses:**
- `400 Bad Request`: 
  - Missing required fields
  - Invalid expiry date format
  - Invalid CVV
  - Invalid expiry date
  - Card is not active
  - Card has expired
  - Charge amount exceeds card limit
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User role not authorized
- `404 Not Found`: Card not found
- `500 Internal Server Error`: Server error

**Error Response Examples:**

1. Invalid Expiry Date Format:
```json
{
  "message": "Invalid expiry date format",
  "expectedFormat": "MM/YYYY"
}
```

2. Exceeded Card Limit:
```json
{
  "message": "Charge amount exceeds card limit",
  "currentBalance": 4000,
  "maxLimit": 5000,
  "remainingLimit": 1000
}
```

## Card Properties

### Card Object
```typescript
{
  cardNumber: string;      // 12-digit unique number
  cardHolderName: string;  // Name of cardholder
  type: string;           // Always "credit"
  expiryDate: string;     // Format: "MM/YYYY" (e.g., "03/2027")
  cvv: string;           // 3-digit security code
  userId: ObjectId;      // Reference to card owner
  maxLimit: number;      // Maximum spending limit
  currentBalance: number; // Current balance
  isActive: boolean;     // Card status
  transactions: Array<{
    amount: number;
    merchantId: ObjectId;
    timestamp: Date;
    status: 'pending' | 'completed' | 'failed';
    description: string;
  }>;
}
```

## Security Notes
1. CVV is only returned once during card creation
2. Card numbers are randomly generated and unique
3. Cards automatically expire after 3 years (expiry date in MM/YYYY format)
4. All transactions are logged with merchant details
5. Balance checks are performed before each charge
6. Role-based access control is enforced on all endpoints
7. Card details (number, CVV, expiry) are validated before processing charges

## Rate Limiting
- Card issuance: 3 cards per user
- Charges: 100 requests per minute per merchant
- Status checks: 60 requests per minute per user

## Best Practices
1. Always validate card expiry before processing charges
2. Keep card details secure and never log sensitive information
3. Monitor transaction patterns for suspicious activity
4. Implement proper error handling for failed transactions
5. Maintain audit logs for all card operations 