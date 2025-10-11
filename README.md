# Store Rating System

A full-stack web application that allows users to submit ratings for stores registered on the platform. Built with Express.js, React.js, and MongoDB.

## Features

### User Roles
System Administrator: Can manage users, stores, and view platform statistics
Normal User: Can browse stores, submit ratings, and manage their profile
Store Owner: Can view ratings for their store and analytics

### Key Functionalities

#### System Administrator
- Dashboard with platform statistics
- Add/edit/delete users and stores
- View all users with filtering and sorting
- View all stores with ratings
- Role-based user management

#### Normal User
- User registration and authentication
- Browse all registered stores
- Submit ratings (1-5 stars) for stores
- Search stores by name and address
- View and modify their submitted ratings
- Update password

#### Store Owner
- Dashboard showing store statistics
- View users who rated their store
- See average rating and total ratings
- Rating analytics and distribution

## Tech Stack

### Backend
- **Express.js**: Web framework
- **MongoDB**: Database with Mongoose ODM
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **express-validator**: Input validation
- **helmet**: Security middleware
- **cors**: Cross-origin resource sharing

### Frontend
- **React.js**: Frontend framework
- **React Router**: Client-side routing
- **React Bootstrap**: UI components
- **Axios**: HTTP client
- **React Toastify**: Notifications
- **React Hook Form**: Form handling

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash

cp config.env .env


```

4. Update the `config.env` file with your database connection:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

5. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The client will run on `http://localhost:3000`

### Running Both Together

From the root directory:
```bash
npm run dev
```

This will start both the backend server and frontend client concurrently.

## Database Schema

### User Model
- `name`: String (20-60 characters)
- `email`: String (unique, validated)
- `password`: String (8-16 characters, with uppercase and special character)
- `address`: String (max 400 characters)
- `role`: Enum ['admin', 'user', 'store_owner']
- `isActive`: Boolean

### Store Model
- `name`: String
- `email`: String (unique)
- `address`: String (max 400 characters)
- `owner`: ObjectId (reference to User)
- `isActive`: Boolean

### Rating Model
- `user`: ObjectId (reference to User)
- `store`: ObjectId (reference to Store)
- `rating`: Number (1-5)
- `review`: String (optional, max 500 characters)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-password` - Update password
- `POST /api/auth/logout` - Logout

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - Get all users (with filtering/sorting)
- `POST /api/admin/users` - Create new user
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/stores` - Get all stores
- `POST /api/admin/stores` - Create new store
- `DELETE /api/admin/stores/:id` - Delete store

### User Routes
- `GET /api/user/stores` - Get all stores for browsing
- `GET /api/user/stores/:id` - Get store details
- `POST /api/user/stores/:id/rate` - Submit/update rating
- `GET /api/user/ratings` - Get user's ratings
- `DELETE /api/user/ratings/:id` - Delete rating

### Store Owner Routes
- `GET /api/store-owner/dashboard` - Store owner dashboard
- `GET /api/store-owner/ratings` - Get store ratings
- `GET /api/store-owner/users` - Get users who rated store
- `GET /api/store-owner/statistics` - Detailed statistics
- `GET /api/store-owner/store` - Get store information

## Form Validations

### Name
- Minimum 20 characters
- Maximum 60 characters

### Address
- Maximum 400 characters

### Password
- 8-16 characters
- At least one uppercase letter
- At least one special character

### Email
- Standard email validation

## Features Implemented

✅ User authentication and authorization  
✅ Role-based access control  
✅ User registration and login  
✅ Password update functionality  
✅ Admin dashboard with statistics  
✅ User management (CRUD operations)  
✅ Store management (CRUD operations)  
✅ Store browsing and search  
✅ Rating system (1-5 stars)  
✅ Store owner analytics  
✅ Form validations  
✅ Responsive design  
✅ Error handling  
✅ Loading states  
✅ Toast notifications  
✅ Pagination and sorting  
✅ Search and filtering  

## Demo Accounts

You can create demo accounts or use these sample credentials:

- **Admin**: admin@example.com / Admin123!
- **User**: user@example.com / User123!
- **Store Owner**: owner@example.com / Owner123!

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting
- Helmet security headers
- Role-based route protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request





