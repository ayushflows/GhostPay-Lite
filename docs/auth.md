# Authentication API Documentation

## Base URL
```
http://localhost:3000/auth
```

## Register User
Register a new user with a specific role (admin, merchant, or user).

### Endpoint
```
POST /register/:role
```

### URL Parameters
| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| role      | string | User role (admin/merchant/user) |

### Request Body
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```

### Request Body Schema
| Field    | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| email    | string | Yes      | Valid email address           |
| password | string | Yes      | Min 8 characters              |
| name     | string | Yes      | User's full name              |

### Response (201 Created)
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

### Error Responses
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
- 500 Internal Server Error
  ```json
  {
    "message": "Error in registration"
  }
  ```

## Login
Authenticate a user and receive access and refresh tokens.

### Endpoint
```
POST /login
```

### Request Body
```json
{
  "email": "string",
  "password": "string"
}
```

### Request Body Schema
| Field    | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| email    | string | Yes      | User's email address          |
| password | string | Yes      | User's password               |

### Response (200 OK)
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

### Error Responses
- 401 Unauthorized
  ```json
  {
    "message": "Invalid credentials"
  }
  ```
- 500 Internal Server Error
  ```json
  {
    "message": "Error in login"
  }
  ```

## Refresh Token
Get a new access token using a refresh token.

### Endpoint
```
POST /refresh-token
```

### Headers
| Header          | Value            | Required |
|-----------------|------------------|----------|
| Authorization   | Bearer {token}   | Yes      |

### Request Body
```json
{
  "refreshToken": "string"
}
```

### Request Body Schema
| Field        | Type   | Required | Description                    |
|--------------|--------|----------|--------------------------------|
| refreshToken | string | Yes      | Valid refresh token           |

### Response (200 OK)
```json
{
  "token": "string"
}
```

### Error Responses
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

## Token Information
- Access Token: Valid for 7 days
- Refresh Token: Valid for 30 days

## Security Notes
1. All passwords are hashed using bcrypt before storage
2. Failed login attempts are tracked
3. Tokens are signed using JWT_SECRET
4. HTTPS is recommended for all API calls
5. Rate limiting is applied to prevent brute force attacks 