# Secure Authentication Backend

A comprehensive, production-ready authentication system for React Native applications using Node.js, Express, and Supabase.

## 🚀 Features

- **Secure User Registration & Login** with comprehensive validation
- **JWT Token Management** with access and refresh tokens
- **Password Security** using bcrypt with configurable rounds
- **Rate Limiting** to prevent brute force attacks
- **Input Sanitization** to prevent XSS and injection attacks
- **Comprehensive Logging** for security monitoring
- **Session Management** with token revocation
- **Profile Management** with secure password changes
- **Account Lockout** after failed login attempts
- **Security Headers** with Helmet.js
- **CORS Configuration** for React Native apps

## 📋 Prerequisites

- Node.js (v16 or higher)
- Supabase account and project
- PostgreSQL database (provided by Supabase)

## 🛠️ Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

3. **Configure your `.env` file:**
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# Security Configuration
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=15
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

4. **Set up the database:**
   - Run the SQL commands in `database/schema.sql` in your Supabase SQL editor

5. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "expiresIn": "15m"
  }
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "identifier": "johndoe", // username or email
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "jwt_refresh_token"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer jwt_access_token
Content-Type: application/json

{
  "refreshToken": "jwt_refresh_token"
}
```

#### Check Availability
```http
GET /auth/check-availability?username=johndoe&email=john@example.com
```

#### Validate Token
```http
GET /auth/validate-token
Authorization: Bearer jwt_access_token
```

### User Management Endpoints

#### Get Profile
```http
GET /user/profile
Authorization: Bearer jwt_access_token
```

#### Update Profile
```http
PUT /user/profile
Authorization: Bearer jwt_access_token
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Change Password
```http
PUT /user/change-password
Authorization: Bearer jwt_access_token
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

#### Delete Account
```http
DELETE /user/account
Authorization: Bearer jwt_access_token
Content-Type: application/json

{
  "password": "SecurePass123!"
}
```

#### Get Active Sessions
```http
GET /user/sessions
Authorization: Bearer jwt_access_token
```

#### Revoke Session
```http
DELETE /user/sessions/:sessionId
Authorization: Bearer jwt_access_token
```

#### Revoke All Sessions
```http
DELETE /user/sessions
Authorization: Bearer jwt_access_token
Content-Type: application/json

{
  "currentTokenId": "optional_current_token_id_to_keep"
}
```

#### Get Authentication Logs
```http
GET /user/auth-logs?page=1&limit=20
Authorization: Bearer jwt_access_token
```

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes per IP
- General endpoints: 100 requests per 15 minutes per IP
- Progressive delays after 50 requests

### Account Security
- Account lockout after 5 failed login attempts
- 15-minute lockout duration (configurable)
- Password hashing with bcrypt (12 rounds)
- Secure JWT tokens with short expiration

### Input Validation & Sanitization
- Joi schema validation for all inputs
- XSS prevention through input sanitization
- SQL injection prevention
- CORS protection

## 🏗️ Project Structure

```
backend/
├── config/
│   ├── database.js          # Supabase configuration
│   └── logger.js            # Winston logger setup
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── userController.js    # User management logic
├── database/
│   └── schema.sql           # Database schema
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── security.js          # Security middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   └── user.js              # User management routes
├── services/
│   └── authService.js       # Authentication business logic
├── utils/
│   ├── jwt.js               # JWT utilities
│   ├── security.js          # Security utilities
│   └── validation.js        # Input validation schemas
├── .env.example             # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
├── README.md               # This file
└── server.js               # Express server setup
```

## 🧪 Testing

### Manual Testing with cURL

**Register a user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "TestPass123!"
  }'
```

**Access protected route:**
```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong, unique JWT secrets
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Configure reverse proxy (nginx)

### Security Checklist
- [ ] Strong JWT secrets (64+ characters)
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation active
- [ ] Logging configured
- [ ] Database backups scheduled
- [ ] Security headers enabled

## 🔧 Configuration

### JWT Configuration
- `JWT_EXPIRES_IN`: Access token expiration (default: 15m)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (default: 7d)

### Security Configuration
- `BCRYPT_ROUNDS`: Password hashing rounds (default: 12)
- `MAX_LOGIN_ATTEMPTS`: Failed attempts before lockout (default: 5)
- `LOCKOUT_TIME`: Lockout duration in minutes (default: 15)

### Rate Limiting
- `RATE_LIMIT_WINDOW`: Time window in minutes (default: 15)
- `RATE_LIMIT_MAX`: Max requests per window (default: 100)

## 📝 Logging

The system logs all authentication events including:
- User registrations
- Login attempts (successful and failed)
- Password changes
- Account lockouts
- Token refreshes
- Logouts

Logs are stored in the `logs/` directory and in the database `auth_logs` table.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Verify environment variables
3. Check Supabase connection
4. Review rate limiting settings

## 🔄 Changelog

### v1.0.0
- Initial release
- Complete authentication system
- JWT token management
- Security features
- Comprehensive logging
