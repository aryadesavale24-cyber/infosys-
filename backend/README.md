# Electrologix - Intelligent Inventory Management System

A full-stack inventory management system with JWT-based authentication and role-based access control.

## 🚀 Features

### Authentication & Authorization
- ✅ JWT-based authentication
- ✅ Role-based access control (ADMIN, MANAGER, STAFF)
- ✅ Secure password encryption with BCrypt
- ✅ Protected routes on frontend and backend

### User Management (Admin Only)
- ✅ Create, Read, Update, Delete users
- ✅ Toggle user status (enable/disable)
- ✅ Filter users by role
- ✅ Search users by name, username, or email

### Tech Stack

#### Backend
- Java 17
- Spring Boot 3.2.1
- Spring Security
- Spring Data JPA
- MySQL Database
- JWT (JSON Web Tokens)
- Maven

## 📋 Prerequisites

- Java 17 or higher
- Maven 3.6+
- Node.js 18+ and npm
- MySQL 8.0+

## 🎯 API Endpoints

### Authentication Endpoints (Public)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires JWT)

### Admin Endpoints (ADMIN role only)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/role/{role}` - Get users by role
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user
- `PATCH /api/admin/users/{id}/toggle-status` - Toggle user status

### Manager Endpoints (ADMIN, MANAGER)
- `GET /api/manager/dashboard` - Manager dashboard

### Staff Endpoints (All authenticated users)
- `GET /api/staff/dashboard` - Staff dashboard

## 🎨 Frontend Routes

- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Main dashboard (protected)
- `/admin/users` - User management (ADMIN only)
- `/unauthorized` - Access denied page

## 🔒 Security Features

1. **JWT Authentication**: Stateless authentication using JSON Web Tokens
2. **Password Encryption**: BCrypt hashing for secure password storage
3. **Role-Based Access Control**: Three-tier permission system
4. **CORS Configuration**: Configured for local development
5. **Request Validation**: Input validation on both frontend and backend
6. **Protected Routes**: Frontend route guards and backend endpoint security

## 📁 Project Structure

### Backend
```
src/main/java/com/inventra/inventory/
├── config/          # Configuration classes
├── controller/      # REST controllers
├── dto/            # Data Transfer Objects
├── exception/      # Exception handlers
├── model/          # Entity classes
├── repository/     # JPA repositories
├── security/       # Security configuration
└── service/        # Business logic
```
## 👨‍💻 Author

Created as part of the Inventra Intelligent Inventory Management System project by Team B.
