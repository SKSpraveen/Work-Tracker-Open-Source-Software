# Work Tracker - Open Source Employee Monitoring System

A comprehensive work tracking and employee monitoring system built with Electron, React, Node.js, and MongoDB. This application provides both web and desktop interfaces for tracking employee work hours, attendance, breaks, and system activity.

![Alt Text](https://github.com/SKSpraveen/Work-Tracker-Open-Source-Software/blob/main/app.jpeg?raw=true)


## 🌟 Features

- **Employee Time Tracking**: Automatic clock-in/clock-out with real-time tracking
- **System Activity Monitoring**: Track active application usage and idle time
- **Break Management**: Record and monitor break times
- **Dashboard Analytics**: Visual charts and statistics for work hours and attendance
- **Role-Based Access**: Separate dashboards for admins and employees
- **Desktop Application**: Cross-platform Electron app for Windows, Mac, and Linux
- **Automated Attendance**: Cron jobs for automatic attendance management
- **Real-time Statistics**: Live updates on active time, idle time, and break duration

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)

## 🔧 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community) or use MongoDB Atlas
- **Git** - [Download](https://git-scm.com/)

### Optional:
- **MongoDB Atlas Account** - For cloud database (recommended for production)
- **Electron Builder Dependencies** - For building desktop applications

## 📥 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/SKSpraveen/Work-Tracker-Open-Source-Software.git
cd Work-Tracker-Open-Source-Software
```

### 2. Install Server Dependencies

```bash
cd server
npm install
```

**Server Dependencies:**
- express - Web framework
- mongoose - MongoDB ODM
- bcryptjs - Password hashing
- jsonwebtoken - JWT authentication
- cors - CORS middleware
- dotenv - Environment variables
- node-cron - Scheduled tasks

### 3. Install Client Dependencies

```bash
cd ../client
npm install
```

**Client Dependencies:**
- react - UI framework
- vite - Build tool
- electron - Desktop application framework
- axios - HTTP client
- tailwindcss - CSS framework
- recharts - Charting library
- lucide-react - Icons
- react-toastify - Notifications

## ⚙️ Configuration

### Server Configuration

1. Navigate to the server directory:
```bash
cd server
```

2. Create a `.env` file in the `server` directory:
```bash
# On Windows PowerShell
New-Item -Path .env -ItemType File

# On Mac/Linux
touch .env
```

3. Add the following environment variables to `.env`:

```env
# Server Configuration
PORT=5000

# MongoDB Configuration
# Option 1: Local MongoDB
MONGO_URI=mongodb://localhost:27017/work_tracker

# Option 2: MongoDB Atlas (Cloud)
# MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/work_tracker?retryWrites=true&w=majority

# JWT Secret (Change this to a strong random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**Important Security Notes:**
- Change `JWT_SECRET` to a strong, random string for production
- Never commit `.env` file to version control
- For MongoDB Atlas, replace `<username>`, `<password>`, and `<cluster>` with your credentials

### Client Configuration

The client connects to the server via the API. By default, it connects to `http://localhost:5000`.

To change the API base URL, edit `client/src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### MongoDB Setup

#### Option A: Local MongoDB

1. Install MongoDB Community Server
2. Start MongoDB service:
   - **Windows**: MongoDB should start automatically as a service
   - **Mac**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`

3. Verify MongoDB is running:
```bash
mongosh
```

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Add a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string and update `MONGO_URI` in `.env`

## 🚀 Running the Application

### Development Mode

#### 1. Start the Server (Backend)

Open a terminal and run:

```bash
cd server
npm run dev
```

The server will start on `http://localhost:5000` with auto-reload enabled.

**Expected Output:**
```
==================================================
🚀 Server running on port 5000
Current date: 2026-02-02
Server time (Asia/Colombo): 2/2/2026, 10:30:00 AM
API Base URL: http://localhost:5000/api
==================================================
MongoDB Connected: <your-mongodb-connection>
⏰ Cron job scheduled for end of day at 23:59
```

#### 2. Start the Client (Desktop App)

Open a **new terminal** and run:

```bash
cd client
npm run dev
```

This will:
- Start the Vite development server on `http://localhost:5173`
- Launch the Electron desktop application
- Enable hot module replacement (HMR)

**Expected Output:**
```
REACT |   VITE v7.2.4  ready in 500 ms
REACT |   ➜  Local:   http://localhost:5173/
REACT |   ➜  Network: use --host to expose
ELECTRON | Electron app started
```

#### Alternative: Run Client Web-Only (Without Electron)

```bash
cd client
npm run dev:react
```

Access at `http://localhost:5173` in your browser.

### Production Mode

#### 1. Start the Server

```bash
cd server
npm start
```

#### 2. Build and Run the Client

```bash
cd client
npm run build
npm run electron:dev
```

## 📦 Building for Production

### Build Desktop Applications

#### Windows

```bash
cd client
npm run electron:build:win
```

Output: `client/dist/TimeFlow-Setup-1.0.0.exe`

#### macOS

```bash
cd client
npm run electron:build:mac
```

Output: `client/dist/TimeFlow-1.0.0.dmg`

#### Linux

```bash
cd client
npm run electron:build:linux
```

Output: `client/dist/TimeFlow-1.0.0.AppImage`

### Build Web Application

```bash
cd client
npm run build
```

Output: `client/dist/` (static files ready for deployment)

## 📁 Project Structure

```
Work-Tracker-Open-Source-Software/
├── client/                          # Frontend application
│   ├── electron/                   # Electron main process
│   │   ├── main.js                # Main process entry
│   │   ├── preload.js             # Preload script
│   │   └── system-monitor.js      # System monitoring utilities
│   ├── src/
│   │   ├── pages/                 # React pages
│   │   │   ├── LandingPage.jsx   # Landing/login page
│   │   │   ├── Login.jsx         # Login component
│   │   │   ├── AdminDashboard.jsx # Admin dashboard
│   │   │   └── EmployeeDashboard.jsx # Employee dashboard
│   │   ├── components/            # Reusable components
│   │   │   ├── DateFilter.jsx    # Date filtering
│   │   │   └── StatCard.jsx      # Statistics card
│   │   ├── charts/                # Chart components
│   │   │   ├── WorkHoursChart.jsx # Work hours visualization
│   │   │   └── AttendancePie.jsx  # Attendance pie chart
│   │   ├── services/              # API services
│   │   │   └── api.js            # API configuration
│   │   ├── hooks/                 # Custom React hooks
│   │   │   └── useElectron.js    # Electron integration
│   │   └── layouts/               # Layout components
│   │       └── DashboardLayout.jsx
│   ├── package.json               # Client dependencies
│   └── vite.config.js            # Vite configuration
│
├── server/                         # Backend application
│   ├── src/
│   │   ├── controllers/           # Route controllers
│   │   │   ├── auth.controller.js        # Authentication
│   │   │   ├── admin.controller.js       # Admin operations
│   │   │   ├── employee.controller.js    # Employee operations
│   │   │   ├── attendance.controller.js  # Attendance tracking
│   │   │   └── time.controller.js        # Time logging
│   │   ├── models/                # Database models
│   │   │   ├── User.js           # User model
│   │   │   ├── Attendance.js     # Attendance model
│   │   │   ├── TimeLog.js        # Time log model
│   │   │   ├── BreakLog.js       # Break log model
│   │   │   └── Organization.js   # Organization model
│   │   ├── routes/                # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── admin.routes.js
│   │   │   ├── employee.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   └── time.routes.js
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.js           # Authentication middleware
│   │   │   └── role.js           # Role-based access control
│   │   ├── config/                # Configuration
│   │   │   └── db.js             # Database connection
│   │   └── utils/                 # Utility functions
│   │       └── dateUtils.js      # Date manipulation
│   ├── cronJobs.js                # Scheduled tasks
│   ├── server.js                  # Server entry point
│   └── package.json               # Server dependencies
│
└── README.md                       # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Admin
- `GET /api/admin/employees` - Get all employees
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/attendance` - Get attendance records

### Employee
- `GET /api/employee/stats` - Get employee statistics
- `GET /api/employee/work-hours` - Get work hours

### Attendance
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/status` - Get attendance status
- `GET /api/attendance/history` - Get attendance history

### Time Tracking
- `POST /api/time/start-break` - Start break
- `POST /api/time/end-break` - End break
- `POST /api/time/log-activity` - Log system activity
- `GET /api/time/current-session` - Get current session data

## 🛠️ Technologies Used

### Frontend
- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **Electron 40** - Desktop application framework
- **TailwindCSS 4** - Utility-first CSS framework
- **Recharts 3** - Chart library
- **Axios** - HTTP client
- **React Toastify** - Toast notifications
- **Lucide React** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express 5** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose 9** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **node-cron** - Task scheduling

## 👥 Default Users

For testing purposes, you can create users with the following roles:

**Admin Account:**
- Create via registration with role: "admin"

**Employee Account:**
- Create via registration with role: "employee"

## 🔍 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error

**Error**: `MongooseServerSelectionError`

**Solution**:
- Verify MongoDB is running: `mongosh`
- Check `MONGO_URI` in `.env`
- For Atlas, whitelist your IP address

#### 2. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

#### 3. Electron App Won't Start

**Solution**:
- Ensure Vite dev server is running first
- Check `http://localhost:5173` is accessible
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

#### 4. JWT Token Issues

**Error**: `JsonWebTokenError: invalid token`

**Solution**:
- Clear browser localStorage
- Ensure `JWT_SECRET` is set in `.env`
- Re-login to get a new token

## 📝 Development Notes

### Cron Jobs

The server runs automated tasks:
- **End of Day**: Runs at 23:59 to finalize attendance records
- Configured in `server/cronJobs.js`

### Time Zone

Default timezone is set to `Asia/Colombo`. To change:
- Edit `server/src/utils/dateUtils.js`
- Update timezone in cron jobs

### System Monitoring

The Electron app monitors:
- Active application usage
- Idle time detection
- Mouse/keyboard activity
- Implemented in `client/electron/system-monitor.js`

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a pull request

## 👨‍💻 Author

**SKSpraveen**
- GitHub: [@SKSpraveen](https://github.com/SKSpraveen)

## 🙏 Acknowledgments

- React and Electron communities
- MongoDB and Node.js teams
- All contributors and users

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Contact: sasindupraveen705@gmail.com

---

Made with ❤️ by SKSpraveen
