# NexMarket - Local Vendor Marketplace

## Project Overview
NexMarket is a web-based marketplace application designed to connect local vendors with customers. It provides an intuitive platform where vendors can set up digital storefronts, and customers can browse, filter, wish-list, and purchase items from multiple localized stores. 

It supports three types of user accounts:
- **Customers**: Can browse stores based on city location, view categories, filter items, manage a wishlist, and place orders.
- **Vendors**: Can create stores, add products with images, set descriptions, and manage their storefront.
- **Both**: Have access to both Customer and Vendor capabilities within a single account.

---

## System Architecture

The application is built using a simple yet robust client-server architecture.

### Frontend
- **Languages**: HTML5, CSS3, Vanilla JavaScript.
- **State Management**: Utilizes `localStorage` to manage active sessions and roles (`userId`, `userRole`, etc.), temporary UI states, and the user's shopping cart list.
- **Structure**: Designed as a multi-page application. The authentication logic and main entry point are handled by `index.html` and `script.js`. Post-login, users are instantly navigated to role-specific dashboard views (`customer.html`, `vendor.html`).

### Backend
- **Environment**: Python using the Flask web framework.
- **Database**: SQLite (`marketplace.db`). The relational schema maps the core logic via tables: `users`, `stores`, `products`, `orders`, `order_items`, and `wishlist`. 
- **Communication**: The frontend communicates asynchronously with the backend via RESTful JSON API endpoints handled by Flask, utilizing the native browser `fetch()` API.

---

## Setup Instructions

### Running the Backend

Ensure you have Python installed. The backend requires `Flask` and `Flask-CORS` to operate.

1. Navigate to the `backend` directory.
   ```bash
   cd backend
   ```
2. Activate the virtual environment (if you are using one).
   ```bash
   # Windows
   .\venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```
3. Install the required dependencies.
   ```bash
   pip install flask flask-cors
   ```
4. Start the Flask server.
   ```bash
   python app.py
   ```
   > The server will initialize the SQLite database if it doesn't exist and run on `http://127.0.0.1:5000`.

### Running the Frontend

The frontend consists of static files. Since they make asynchronous network calls, it is highly recommended to run them through a local web server to avoid CORS/Origin issues.

1. Start a simple web server in the project root directory:
   ```bash
   python -m http.server 8000
   ```
2. Open your web browser and navigate to `http://localhost:8000`.

---

## Developer Guide & Key Workflows

### 1. User Authentication (`script.js` & `app.py`)
- Handled by `/api/auth/register` and `/api/auth/login`.
- Stores the successful session's returned User ID and Role inside the browser's `localStorage` to persist state across pages.

### 2. Store & Product Management (`vendor.js`)
- Vendors interact with `/api/stores` (`GET` and `POST`) to retrieve existing dashboards or push new store configurations.
- The UI handles reading local image files via `FileReader` and converting them to Base64 strings, which are then stored in the SQLite DB.

### 3. Customer Discovery (`customer.js`)
- Fetches all stores by querying `/api/stores?city=<city>`.
- Displays dynamic DOM elements categorizing items by store, handles search bars, and generates dynamic horizontal swiping UI filters.
- Connects wishlist items to the backend via `/api/users/<user_id>/wishlist`.

### 4. Checkout System (`cart.js`)
- Merges selected items from `localStorage` (`cartItems`).
- Pushes the final payload to `/api/orders` via a `POST` request. Once the server confirms the insertion into the `orders` and `order_items` tables, the cart is cleared locally.
