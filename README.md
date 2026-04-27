# NEXUS E-Commerce Store

[preview img](image.png)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/)

A full-stack e-commerce application with Express.js backend and vanilla JS frontend.

## Tech Stack
- **Backend**: Express.js (Node.js), NeDB (embedded SQLite-like database)
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Auth**: JWT tokens + bcrypt password hashing

## Features
- ✅ Product listings with filtering, search, and sorting
- ✅ Product detail pages with quantity selector
- ✅ Shopping cart (add, remove, update qty)
- ✅ User registration & login (JWT auth)
- ✅ Checkout with shipping address + payment selection
- ✅ Order placement and order history
- ✅ Order detail with tracking timeline
- ✅ Responsive design (mobile-friendly)

## Setup & Run

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Start the server
```bash
node server.js
```

### 3. Open in browser
Visit: **http://localhost:3001**

The database auto-seeds 8 products on first run.

## Project Structure
```
ecommerce/
├── backend/
│   ├── server.js          # Express server + all API routes
│   ├── data/              # NeDB database files (auto-created)
│   └── package.json
└── frontend/
    ├── index.html         # Single-page app
    ├── css/style.css      # All styles
    └── js/
        ├── api.js         # API client (fetch wrapper)
        ├── auth.js        # Login/register/logout
        ├── cart.js        # Cart management + checkout
        ├── products.js    # Product list + detail pages
        └── app.js         # Navigation + orders + toast
```

## API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register user |
| POST | /api/auth/login | No | Login user |
| GET | /api/auth/me | Yes | Get current user |
| GET | /api/products | No | List products (filter/sort/search) |
| GET | /api/products/:id | No | Product detail |
| GET | /api/cart | Yes | Get user's cart |
| POST | /api/cart | Yes | Add item to cart |
| PUT | /api/cart/:productId | Yes | Update cart item qty |
| DELETE | /api/cart/:productId | Yes | Remove cart item |
| POST | /api/orders | Yes | Place order |
| GET | /api/orders | Yes | List user's orders |
| GET | /api/orders/:id | Yes | Order detail |
