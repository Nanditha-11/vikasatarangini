# Vikasatarangini – Online Attendance Management System (MERN)

## Features (matches your steps)
- Admin login (predefined username/password)
- Home page with date selection (year/month/date)
- Excel upload of student master list (SL.No, Name, Phone Number)
- Attendance page: mark Present via checkbox (unchecked = Absent)
- Quick mark present via SL.No or Phone search
- Present list and Absent list for selected date
- Download present/absent list as an Excel file

## Tech
- **Client**: React (Vite)
- **Server**: Node.js + Express
- **DB**: MongoDB (Mongoose)

## Setup

### 1) Backend env
Copy `server/.env.example` to `server/.env` and edit as needed:
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- `CLIENT_ORIGIN`

### 2) Frontend env (optional)
Copy `client/.env.example` to `client/.env` if your API is not on `http://localhost:5000`.

### 3) Install
Already installed if you used this workspace, otherwise:

```bash
cd server && npm install
cd ../client && npm install
```

## Run (development)

### Terminal 1 (MongoDB)
Start MongoDB locally (or use Atlas and set `MONGODB_URI`).

### Terminal 2 (server)
```bash
cd server
npm run dev
```

### Terminal 3 (client)
```bash
cd client
npm run dev
```

Open the UI at `http://localhost:5173`.

## Excel format
First sheet should contain columns like:
- `SL.No` (unique)
- `Name`
- `Phone Number`

