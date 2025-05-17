# GhostPay-Lite

A lightweight, microservice-based payment token API that issues single-use virtual cards and processes charges.

## Overview

GhostPay-Lite is a secure, scalable payment processing system that provides:
- Single-use virtual card issuance
- Secure card charging
- Role-based access control
- Real-time analytics
- High availability and zero-downtime deployments

## Live Demo
- Backend API: [https://q2m3apssmt.ap-south-1.awsapprunner.com/](https://q2m3apssmt.ap-south-1.awsapprunner.com/)
- Frontend Demo: [https://ghost-pay-frontend.vercel.app](https://ghost-pay-frontend.vercel.app)

## Architecture

### Core Components
- **Authentication Service**: JWT-based auth with role management
- **Card Service**: Virtual card issuance and management
- **Charge Service**: Payment processing and validation
- **Analytics Service**: Transaction analysis and reporting

### Technology Stack
- **Backend**: Node.js with TypeScript
- **Database**: MongoDB (for all data storage)
- **Infrastructure**: 
  - AWS App Runner (container hosting)
  - AWS ECR (container registry)
  - AWS Secrets Manager (key management)
- **Security**: 
  - AWS Secrets Manager (key management)
  - JWT with asymmetric signing
  - HTTPS enforcement

## Features

### 1. API Design
- RESTful API with comprehensive documentation
- Detailed error handling
- Role-based access control
- Rate limiting and throttling

### 2. Authentication & Security
- JWT-based authentication
- AWS Secrets Manager integration
- Role-based access (admin, merchant, user)
- Zero-downtime key rotation
- HTTPS enforcement
- Input validation and sanitization

### 3. Data Storage
- MongoDB for all data storage
- Encrypted data at rest and in transit
- Efficient indexing and querying

### 4. Rate Limiting
- Per-API-key rate limits
- Express rate limiter implementation
- 429 responses with Retry-After headers
- Configurable limits per endpoint:
  - General API: 100 requests/minute
  - Authentication: 10 requests/minute
  - Card Operations: 50 requests/minute
  - Charge Operations: 100 requests/minute
  - Analytics: 100 requests/minute

### 5. High Availability
- Containerized application
- AWS App Runner deployment
- Auto-scaling capabilities
- Load balancing
- Health checks

### 6. Security Features
- HTTPS enforcement
- AWS Secrets Manager for sensitive data
- OWASP Top 10 protection
- Input validation
- XSS protection
- Data encryption

### 7. Deployment
- GitHub Actions CI/CD
- AWS App Runner deployment
- Health checks
- Auto-rollback on failure
- Zero-downtime updates

### 8. Monitoring & Observability
- AWS CloudWatch integration
- Error tracking
- Performance monitoring
- Health status monitoring

## API Documentation

Detailed API documentation is available in [docs/api-documentation.md](docs/api-documentation.md)

## API Endpoints

### Authentication Routes

#### 1. Register User
- **Endpoint:** `POST /auth/register/:role`
- **Role:** Public
- **Description:** Register a new user with specific role (admin/merchant/user)
- **URL Parameters:** 
  - `role`: User role (admin/merchant/user)
- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string",
    "name": "string"
  }
  ```

#### 2. Login
- **Endpoint:** `POST /auth/login`
- **Role:** Public
- **Description:** Authenticate user and get access tokens
- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```

#### 3. Refresh Token
- **Endpoint:** `POST /auth/refresh-token`
- **Role:** Authenticated
- **Description:** Get new access token using refresh token
- **Request Body:**
  ```json
  {
    "refreshToken": "string"
  }
  ```

### Card Management Routes

#### 1. Issue New Card
- **Endpoint:** `POST /cards`
- **Role:** USER
- **Description:** Create a new virtual card
- **Rate Limit:** 50 requests/minute
- **Response:** Card details with number, CVV, and expiry

#### 2. Get Card Status
- **Endpoint:** `GET /cards/:id`
- **Role:** USER, ADMIN
- **Description:** Get card details and transaction history
- **Rate Limit:** 50 requests/minute
- **URL Parameters:**
  - `id`: Card ID

#### 3. Get Card Analytics
- **Endpoint:** `GET /cards/analytics/overview`
- **Role:** USER
- **Description:** Get comprehensive card usage analytics
- **Rate Limit:** 100 requests/minute
- **Response:** Spending patterns, merchant analysis, and card statistics

### Charge Processing Routes

#### 1. Process Card Charge
- **Endpoint:** `POST /charges`
- **Role:** MERCHANT
- **Description:** Process a payment using a virtual card
- **Rate Limit:** 100 requests/minute
- **Request Body:**
  ```json
  {
    "cardNumber": "string",
    "cvv": "string",
    "expiryDate": "MM/YYYY",
    "amount": number,
    "description": "string"
  }
  ```

### Transaction Routes

#### 1. Get Transaction Details
- **Endpoint:** `GET /transactions/:transactionId`
- **Role:** ADMIN, MERCHANT, USER
- **Description:** Get detailed transaction information
- **Rate Limit:** 100 requests/minute
- **URL Parameters:**
  - `transactionId`: Transaction ID

#### 2. Get Merchant Analytics
- **Endpoint:** `GET /transactions/analytics/merchant`
- **Role:** MERCHANT, ADMIN
- **Description:** Get merchant-specific transaction analytics
- **Rate Limit:** 100 requests/minute
- **Query Parameters:**
  - `merchantId`: Merchant ID (admin only)

#### 3. Get Admin Analytics
- **Endpoint:** `GET /transactions/analytics/admin`
- **Role:** ADMIN
- **Description:** Get system-wide analytics and metrics
- **Rate Limit:** 100 requests/minute
- **Response:** Comprehensive system analytics including user, merchant, and transaction statistics

### Rate Limiting
All endpoints are protected by rate limiting:
- General API: 100 requests/minute
- Authentication: 10 requests/minute
- Card Operations: 50 requests/minute
- Charge Operations: 100 requests/minute
- Analytics: 100 requests/minute

### Authentication
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Setup & Installation

### Prerequisites
- Node.js 16+
- Docker
- AWS CLI configured
- MongoDB instance

### Local Development
```bash
# Clone repository
git clone https://github.com/ayushflows/GhostPay-Lite.git

#navigate to the repo
cd GhostPay-Lite

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Production Deployment
```bash
# Build Docker image
docker build -t ghostpay-lite .

# Push to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin account.dkr.ecr.ap-south-1.amazonaws.com
docker push account.dkr.ecr.ap-south-1.amazonaws.com/ghostpay-lite

# Deploy to AWS App Runner
# Configure through AWS Console or CLI
```

## Performance

### Service Level Objectives (SLOs)
- 95th percentile latency < 100ms
- 99.9% uptime
- Error rate < 1%
- Throughput: 1000+ requests/second

## Security

### Key Management
- AWS Secrets Manager for key storage
- Automatic key rotation
- Zero-downtime key updates
- Role-based access control

### Data Protection
- Encryption at rest
- Encryption in transit
- Secure key storage
- Regular security audits

## Monitoring

### Metrics
- Request latency
- Error rates
- Throughput
- Resource utilization

### Alerts
- Error rate > 1%
- CPU usage > 80%
- Memory usage > 80%
- Latency > 100ms

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@ghostpay-lite.com or create an issue in the repository.