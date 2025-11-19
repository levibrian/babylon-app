<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Babylon Portfolio App

Angular-based portfolio management application for tracking investments and transactions.

## Prerequisites

- Node.js (v18 or higher recommended)
- Backend API running at `https://localhost:7192`

## Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   The app will be available at `http://localhost:3000`

## Development

- **Build for production:**
  ```bash
  npm run build
  ```

- **Preview production build:**
  ```bash
  npm run preview
  ```

## Backend API

The app expects the backend API to be running at `https://localhost:7192` with the following endpoint:
- `GET /api/v1/portfolios/{userId}` - Fetch portfolio data with positions and transactions

Make sure your backend server is running and accessible before starting the frontend.
