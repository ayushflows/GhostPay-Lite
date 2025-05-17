# GhostCard API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Authentication Routes

### 1. Register User
Register a new user with a specific role.

**Endpoint:** `POST /auth/register/:role`

**URL Parameters:**
| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| role      | string | User role (admin/merchant/user) |

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```

**Validation Rules:**
- Email: Must be valid email format
- Password: Minimum 8 characters, must contain at least one number and one special character
- Name: Minimum 2 characters, maximum 50 characters

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "token": "string",
  "refreshToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string"
  }
}
```

**Error Responses:**
- 400 Bad Request
  ```json
  {
    "message": "Invalid role"
  }
  ```
  ```json
  {
    "message": "User already exists"
  }
  ```
  ```json
  {
    "message": "Invalid email format"
  }
  ```
  ```json
  {
    "message": "Password must be at least 8 characters"
  }
  ```
- 500 Internal Server Error
  ```json
  {
    "message": "Error in registration"
  }
  ```

### 2. Login
Authenticate a user and receive access and refresh tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "string",
  "refreshToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string"
  }
}
```

**Error Responses:**
- 400 Bad Request
  ```json
  {
    "message": "Email and password are required"
  }
  ```
- 401 Unauthorized
  ```json
  {
    "message": "Invalid credentials"
  }
  ```
- 429 Too Many Requests
  ```json
  {
    "message": "Too many login attempts. Please try again later"
  }
  ```
- 500 Internal Server Error
  ```json
  {
    "message": "Error in login"
  }
  ```

### 3. Refresh Token
Get a new access token using a refresh token.

**Endpoint:** `POST /auth/refresh-token`

**Headers:**
| Header          | Value            | Required |
|-----------------|------------------|----------|
| Authorization   | Bearer {token}   | Yes      |

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200 OK):**
```json
{
  "token": "string"
}
```

**Error Responses:**
- 400 Bad Request
  ```json
  {
    "message": "Refresh token required"
  }
  ```
- 401 Unauthorized
  ```json
  {
    "message": "Invalid refresh token"
  }
  ```
  ```json
  {
    "message": "Refresh token expired"
  }
  ```

## Card Management Routes

### 1. Issue New Card
Creates a new card for the authenticated user.

**Endpoint:** `POST /cards`

**Required Role:** USER

**Request Body:**
```json
{
  "cardHolderName": "string",
  "maxLimit": number  // Optional, defaults to 10000
}
```

**Validation Rules:**
- cardHolderName: Must match user's registered name
- maxLimit: Must be between 1000 and 10000

**Response (201 Created):**
```json
{
  "message": "Virtual card issued successfully",
  "card": {
    "id": "string",
    "cardNumber": "string",
    "cardHolderName": "string",
    "type": "credit",
    "expiryDate": "MM/YYYY",
    "cvv": "string",
    "maxLimit": number,
    "isActive": true
  }
}
```

**Error Responses:**
- 400 Bad Request
  ```json
  {
    "message": "Invalid card holder name"
  }
  ```
  ```json
  {
    "message": "Max limit must be between 1000 and 10000"
  }
  ```
  ```json
  {
    "message": "Maximum number of cards (3) reached"
  }
  ```
- 401 Unauthorized
  ```json
  {
    "message": "Invalid or missing token"
  }
  ```
- 403 Forbidden
  ```json
  {
    "message": "Only users can issue cards"
  }
  ```

### 2. Get Card Status
Retrieves the status and details of a specific card.

**Endpoint:** `GET /cards/:id`

**Required Role:** USER or ADMIN
- Users can only view their own cards
- Admins can view any card

**URL Parameters:**
| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| id        | string | Card ID (MongoDB ObjectId)     |

**Response (200 OK):**
```json
{
  "card": {
    "id": "string",
    "cardNumber": "string",
    "cardHolderName": "string",
    "type": "credit",
    "expiryDate": "MM/YYYY",
    "maxLimit": number,
    "currentBalance": number,
    "isActive": boolean,
    "isUsed": boolean,
    "transactions": [
      {
        "amount": number,
        "merchantId": "string",
        "timestamp": "ISO date string",
        "status": "completed",
        "description": "string"
      }
    ]
  }
}
```

**Error Responses:**
- 401 Unauthorized
  ```json
  {
    "message": "Invalid or missing token"
  }
  ```
- 403 Forbidden
  ```json
  {
    "message": "Access denied to this card"
  }
  ```
- 404 Not Found
  ```json
  {
    "message": "Card not found"
  }
  ```

### 3. Get Card Analytics
Get comprehensive analytics for user's cards.

**Endpoint:** `GET /cards/analytics/overview`

**Required Role:** USER

**Response (200 OK):**
```json
{
  "overview": {
    "totalCards": number,
    "activeCards": number,
    "usedCards": number,
    "totalSpent": number,
    "totalOutstanding": number
  },
  "spending": {
    "monthly": [
      {
        "month": "YYYY-MM",
        "amount": number
      }
    ],
    "byMerchant": [
      {
        "merchantId": "string",
        "merchantName": "string",
        "count": number,
        "total": number
      }
    ]
  },
  "cards": [
    {
      "cardId": "string",
      "cardNumber": "string",
      "cardHolderName": "string",
      "currentBalance": number,
      "maxLimit": number,
      "isActive": boolean,
      "isUsed": boolean,
      "totalTransactions": number,
      "totalSpent": number,
      "lastTransactionDate": "ISO date string",
      "topMerchants": [
        {
          "merchantId": "string",
          "merchantName": "string",
          "count": number,
          "total": number
        }
      ]
    }
  ]
}
```

## Transaction Routes

### 1. Get Transaction Details
Get detailed information about a specific transaction.

**Endpoint:** `GET /transactions/:transactionId`

**Required Role:** ADMIN, MERCHANT, or USER
- Admins get full transaction details including card information
- Merchants get transaction details with customer info but no card details
- Customers get transaction details with merchant info but no card details

**Response (200 OK):**
```json
{
  "transaction": {
    "id": "string",
    "amount": number,
    "status": "completed",
    "timestamp": "ISO date string",
    "description": "string",
    "cardId": {
      "cardNumber": "string",
      "cardHolderName": "string"
    },
    "merchantId": {
      "name": "string",
      "email": "string"
    },
    "customerId": {
      "name": "string",
      "email": "string"
    }
  }
}
```

## Charge Processing Routes

### 1. Process Card Charge
Processes a charge on a card (Merchant only).

**Endpoint:** `POST /charges`

**Required Role:** MERCHANT

**Request Body:**
```json
{
  "cardNumber": "string",
  "cvv": "string",
  "expiryDate": "MM/YYYY",
  "amount": number,
  "description": "string"
}
```

**Validation Rules:**
- cardNumber: Must be 12 digits
- cvv: Must be 3 digits
- expiryDate: Must be in MM/YYYY format and not expired
- amount: Must be positive and not exceed card limit
- description: Maximum 100 characters

**Response (200 OK):**
```json
{
  "message": "Charge processed successfully",
  "transaction": {
    "amount": number,
    "status": "completed",
    "timestamp": "ISO date string",
    "description": "string",
    "cardNumber": "string",
    "cardHolderName": "string"
  }
}
```

**Error Responses:**
- 400 Bad Request
  ```json
  {
    "message": "Invalid card number format"
  }
  ```
  ```json
  {
    "message": "Invalid CVV format"
  }
  ```
  ```json
  {
    "message": "Invalid expiry date format",
    "expectedFormat": "MM/YYYY"
  }
  ```
  ```json
  {
    "message": "Card has expired"
  }
  ```
  ```json
  {
    "message": "Charge amount exceeds card limit",
    "currentBalance": number,
    "maxLimit": number,
    "remainingLimit": number
  }
  ```
  ```json
  {
    "message": "Card is not active"
  }
  ```
- 401 Unauthorized
  ```json
  {
    "message": "Invalid or missing token"
  }
  ```
- 403 Forbidden
  ```json
  {
    "message": "Only merchants can process charges"
  }
  ```
- 404 Not Found
  ```json
  {
    "message": "Card not found"
  }
  ```
- 429 Too Many Requests
  ```json
  {
    "message": "Rate limit exceeded. Please try again later"
  }
  ```

## Rate Limiting
- Login attempts: 5 per minute per IP
- Card issuance: 3 cards per user
- Charges: 100 requests per minute per merchant
- Status checks: 60 requests per minute per user

## Security Notes
1. All passwords are hashed using bcrypt
2. JWT tokens expire after 1 hour
3. Refresh tokens expire after 7 days
4. Failed login attempts are tracked
5. All sensitive data is encrypted in transit
6. Card details are validated before processing
7. Role-based access control is enforced
8. All transactions are logged for audit purposes

## Best Practices
1. Always use HTTPS in production
2. Implement proper error handling
3. Monitor for suspicious activity
4. Keep audit logs of all operations
5. Regularly rotate secrets and keys
6. Implement proper input validation
7. Use rate limiting to prevent abuse

## Merchant Analytics Routes

### 1. Get Merchant Dashboard
Get comprehensive analytics for a merchant.

**Endpoint:** `GET /merchant/analytics`

**Required Role:** MERCHANT

**Query Parameters:**
| Parameter | Type   | Description                    | Required |
|-----------|--------|--------------------------------|----------|
| startDate | string | Start date (YYYY-MM-DD)        | No       |
| endDate   | string | End date (YYYY-MM-DD)          | No       |
| period    | string | Period (daily/weekly/monthly)  | No       |

**Response (200 OK):**
```json
{
  "summary": {
    "totalTransactions": number,
    "totalAmount": number,
    "averageTransactionValue": number,
    "uniqueCustomers": number,
    "successRate": number
  },
  "timeBasedAnalytics": {
    "period": "daily" | "weekly" | "monthly",
    "data": [
      {
        "period": "string",
        "transactionCount": number,
        "totalAmount": number,
        "uniqueCustomers": number
      }
    ]
  },
  "recentTransactions": [
    {
      "transactionId": "string",
      "amount": number,
      "customerId": "string",
      "timestamp": "ISO date string",
      "status": "completed" | "failed",
      "description": "string"
    }
  ],
  "customerMetrics": {
    "newCustomers": number,
    "returningCustomers": number,
    "averageCustomerValue": number
  }
}
```

**Error Responses:**
- 401 Unauthorized
  ```json
  {
    "message": "Invalid or missing token"
  }
  ```
- 403 Forbidden
  ```json
  {
    "message": "Only merchants can access analytics"
  }
  ```
- 400 Bad Request
  ```json
  {
    "message": "Invalid date format",
    "expectedFormat": "YYYY-MM-DD"
  }
  ```
  ```json
  {
    "message": "Invalid period. Must be daily, weekly, or monthly"
  }
  ```

### 2. Get Transaction History
Get detailed transaction history for a merchant.

**Endpoint:** `GET /merchant/transactions`

**Required Role:** MERCHANT

**Query Parameters:**
| Parameter | Type   | Description                    | Required |
|-----------|--------|--------------------------------|----------|
| page      | number | Page number (default: 1)       | No       |
| limit     | number | Items per page (default: 20)   | No       |
| startDate | string | Start date (YYYY-MM-DD)        | No       |
| endDate   | string | End date (YYYY-MM-DD)          | No       |
| status    | string | Filter by status               | No       |

**Response (200 OK):**
```json
{
  "transactions": [
    {
      "transactionId": "string",
      "amount": number,
      "customerId": "string",
      "customerName": "string",
      "timestamp": "ISO date string",
      "status": "completed" | "failed",
      "description": "string"
    }
  ],
  "pagination": {
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number
  },
  "summary": {
    "totalAmount": number,
    "successfulTransactions": number,
    "failedTransactions": number
  }
}
```

**Error Responses:**
- 401 Unauthorized
  ```json
  {
    "message": "Invalid or missing token"
  }
  ```
- 403 Forbidden
  ```json
  {
    "message": "Only merchants can access transactions"
  }
  ```
- 400 Bad Request
  ```json
  {
    "message": "Invalid page number"
  }
  ```
  ```json
  {
    "message": "Invalid limit value"
  }
  ```

### 3. Get Customer Analytics
Get analytics about customers who have made transactions.

**Endpoint:** `GET /merchant/customers/analytics`

**Required Role:** MERCHANT

**Query Parameters:**
| Parameter | Type   | Description                    | Required |
|-----------|--------|--------------------------------|----------|
| startDate | string | Start date (YYYY-MM-DD)        | No       |
| endDate   | string | End date (YYYY-MM-DD)          | No       |

**Response (200 OK):**
```json
{
  "customerMetrics": {
    "totalCustomers": number,
    "activeCustomers": number,
    "newCustomers": number,
    "returningCustomers": number
  },
  "customerSegments": [
    {
      "segment": "string",
      "count": number,
      "totalSpent": number,
      "averageSpent": number
    }
  ],
  "topCustomers": [
    {
      "customerId": "string",
      "customerName": "string",
      "totalSpent": number,
      "transactionCount": number,
      "lastTransactionDate": "ISO date string"
    }
  ],
  "customerRetention": {
    "retentionRate": number,
    "churnRate": number,
    "averageLifetime": number
  }
}
```

**Error Responses:**
- 401 Unauthorized
  ```json
  {
    "message": "Invalid or missing token"
  }
  ```
- 403 Forbidden
  ```json
  {
    "message": "Only merchants can access customer analytics"
  }
  ```
- 400 Bad Request
  ```json
  {
    "message": "Invalid date range"
  }
  ``` 