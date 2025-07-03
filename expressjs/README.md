# Node.js REST API with TypeScript

A complete TypeScript Node.js REST API with authentication, user management, and MongoDB integration.

## 🚀 Features

- **Complete Authentication System**: Registration, login, JWT tokens, refresh tokens
- **User Management**: CRUD operations, role-based access control
- **Modular Architecture**: Organized into Auth, Auth-User, and User modules
- **TypeScript**: Full type safety throughout the application
- **MongoDB Integration**: Using Mongoose ODM with proper schemas
- **Security**: Password hashing, JWT tokens, input validation, security headers
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Validation**: Request validation using express-validator
- **Pagination**: Built-in pagination for list endpoints
- **Logging**: Request logging with Morgan

## 📁 Project Structure

\`\`\`
src/
├── config/
│   └── database.ts          # MongoDB connection
├── middleware/
│   ├── auth.ts              # Authentication middleware
│   ├── errorHandler.ts      # Error handling middleware
│   └── validation.ts        # Input validation middleware
├── modules/
│   ├── auth/                # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.routes.ts
│   ├── auth-user/           # User-specific auth operations
│   │   ├── auth-user.controller.ts
│   │   ├── auth-user.service.ts
│   │   └── auth-user.routes.ts
│   └── user/                # User management module
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.model.ts
│       └── user.routes.ts
├── types/
│   └── index.ts             # TypeScript type definitions
└── server.ts                # Main server file
\`\`\`

## 🛠️ Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd nodejs-rest-api
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
   Update the `.env` file with your configuration:
   \`\`\`env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/nodejs-rest-api
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   \`\`\`

4. **Build the project**
   \`\`\`bash
   npm run build
   \`\`\`

5. **Start the server**
   \`\`\`bash
   # Development
   npm run dev
   
   # Production
   npm start
   \`\`\`

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify` - Verify token
- `POST /api/auth/logout` - Logout user

### Auth-User (`/api/auth-user`)
- `PUT /api/auth-user/change-password` - Change password
- `PUT /api/auth-user/profile` - Update profile
- `POST /api/auth-user/deactivate` - Deactivate account
- `GET /api/auth-user/activity` - Get user activity
- `GET /api/auth-user/sessions` - Get user sessions
- `POST /api/auth-user/verify-email` - Request email verification

### Users (`/api/users`)
- `GET /api/users/me` - Get current user
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/stats` - Get user statistics (admin only)
- `GET /api/users/:id` - Get user by ID (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

## 🧪 Testing

Test the API using the included test script:

\`\`\`bash
node scripts/test-api.js
\`\`\`

Or use tools like Postman, Insomnia, or curl to test the endpoints.

### Example Requests

**Register a user:**
\`\`\`bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
\`\`\`

**Login:**
\`\`\`bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
\`\`\`

**Get current user (requires token):**
\`\`\`bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

## 🗄️ Database

The application uses MongoDB with Mongoose ODM. Make sure MongoDB is running and accessible via the connection string in your `.env` file.

## 🚀 Deployment

1. Build the project: `npm run build`
2. Set environment variables for production
3. Start the server: `npm start`

## 📝 License

MIT License
\`\`\`

Now let me create a simple health check endpoint file:
