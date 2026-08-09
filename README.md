# RentIQ — AI-Powered P2P Rental Platform

Live URL: [https://sanz1203-rentiq.hf.space/](https://sanz1203-rentiq.hf.space/)

A comprehensive peer-to-peer (P2P) rental marketplace with smart AI assistants, live chat, and a responsive single-page web interface tailored for India (in Indian Rupees, ₹).

---

## 🚀 Key Platform Features

### Real-Time Messaging & Chat
*   **Instant Message Delivery**: Fast, low-latency room communication using Socket.io.
*   **Persistent Chat History**: All messages are saved in the PostgreSQL database and loaded instantly when entering a room.
*   **Dedicated Booking Channels**: Chats are automatically created and restricted per active booking for renter-owner coordination.

### Listings & Date-Blocked Bookings
*   **Listing Creation with Photos**: Easy forms to upload item photos locally to the server (via Multer).
*   **Conflict-Free Calendar Booking**: Prevent overlaps and double-bookings using server-side SQL verification.
*   **Dynamic Price Breakdown**: Real-time invoice calculation on dates select, displaying rental cost, refundable deposit (30%), and total.

### Profile Verification & Security
*   **JWT Authentication**: Secure login sessions with cookies and custom Renter / Owner dashboards.
*   **Identity Document Verification**: Upload passport, license, or student ID to gain a verified user badge.

---

## 🤖 Gemini AI Features

### Smart Pricing Engine (Gemini 2.5)
*   **Competitor Comps Analysis**: Analyzes category averages in the database.
*   **Logical Pricing Guides**: Gemini reviews your item's condition, description, and location to return a recommended price and a brief written reasoning.
*   **Rupee Currency Adaptation**: Recommends optimized local Indian Rupees (₹) rates.

### AI Damage Inspection (Gemini Vision)
*   **Before/After Photo Comparison**: Renters upload check-in photos, and checkout photos on return.
*   **Automated Scratches/Dents Detection**: Gemini's vision model compares photos to spot new wear.
*   **Deposit Protection**: Suggests accurate repair deductions and automatically flags the deposit status as `disputed` if damage is found.

### Sentiment Analysis
*   **Text Sentiment Checking**: Automatically scans profile review comments and assigns a sentiment rating.

---

## 🛠️ Tech Stack

*   **Frontend**: HTML5, CSS3 (Teal design system, flexbox/grid layout, modal overlay layers), ES6 JavaScript.
*   **Backend**: Node.js, Express.js, Socket.io, Multer.
*   **Database**: PostgreSQL.
*   **AI Engine**: Google Gemini API (`@google/generative-ai` SDK).

---

## 💻 Local Setup Guide

1.  **Clone / Download** the project to your computer.
2.  Create a **PostgreSQL database** named `rentiq`.
3.  Create a **`.env`** file in the root directory:
    ```env
    PORT=5000
    NODE_ENV=development
    DB_USER=postgres
    DB_HOST=localhost
    DB_DATABASE=rentiq
    DB_PASSWORD=your_password
    DB_PORT=5432
    JWT_SECRET=secretjwtkey
    JWT_REFRESH_SECRET=refreshkey
    GEMINI_API_KEY=your_gemini_key
    ```
4.  Run commands:
    ```bash
    npm install
    npm run dev
    ```
5.  Open **`http://localhost:5000`** in your browser.
