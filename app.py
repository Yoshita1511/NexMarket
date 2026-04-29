"""
NexMarket Backend Server

This module provides the REST API for the NexMarket application using Flask and SQLite.
It manages the central database, handling user authentication, store management, 
product discovery, and order processing capabilities.
"""
import os
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import datetime

app = Flask(__name__)
CORS(app) # Enable CORS for all routes so the frontend can easily communicate

DB_FILE = 'marketplace.db'

def get_db():
    """Returns a connection to the SQLite database with dictionary-like row access."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row # Returns dictionaries instead of tuples
    return conn

def init_db():
    """Initializes the database schema if tables do not exist."""
    with app.app_context():
        db = get_db()
        # Create Users Table
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            )
        ''')
        # Create Stores Table
        db.execute('''
            CREATE TABLE IF NOT EXISTS stores (
                id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                city TEXT NOT NULL,
                desc TEXT,
                image TEXT,
                is_premium BOOLEAN DEFAULT 0,
                FOREIGN KEY (vendor_id) REFERENCES users (id)
            )
        ''')
        # Create Products Table
        db.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                image TEXT,
                FOREIGN KEY (store_id) REFERENCES stores (id)
            )
        ''')
        # Create Orders Table
        db.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                total REAL NOT NULL,
                method TEXT NOT NULL,
                date TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        # Create OrderItems Table
        db.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                product_id TEXT,
                product_name TEXT NOT NULL,
                store_name TEXT NOT NULL,
                price REAL NOT NULL,
                qty INTEGER NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id)
            )
        ''')
        # Create Wishlist Table
        db.execute('''
            CREATE TABLE IF NOT EXISTS wishlist (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                store_name TEXT NOT NULL,
                price REAL NOT NULL,
                image TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        db.commit()

# --- AUTH ENDPOINTS ---

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    db = get_db()
    
    # Check if exists
    existing = db.execute('SELECT id, role FROM users WHERE email = ?', (data.get('email', '').strip(),)).fetchone()
    if existing:
        current_role = existing['role']
        requested_role = data.get('role', '')
        
        if current_role != 'both' and requested_role == 'both':
            try:
                db.execute('UPDATE users SET role = ? WHERE id = ?', ('both', existing['id']))
                db.commit()
                return jsonify({"message": "Account upgraded successfully", "userId": existing['id'], "role": 'both'}), 200
            except Exception as e:
                return jsonify({"message": f"Upgrade failed: {str(e)}"}), 500
        else:
            msg = f"User with that email already exists as a {current_role}."
            if current_role != 'both':
                msg += " To add another role, please register again and choose 'Both'."
            return jsonify({"message": msg}), 400

    new_id = str(uuid.uuid4())
    try:
        db.execute(
            'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            (new_id, data['name'], data['email'], data['password'], data['role'])
        )
        db.commit()
        return jsonify({"message": "Registration successful", "userId": new_id, "role": data['role']}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    db = get_db()
    user = db.execute(
        'SELECT id, name, role FROM users WHERE email = ? AND password = ?',
        (data.get('email', '').strip(), data.get('password', ''))
    ).fetchone()

    if user:
        return jsonify({"message": "Login successful", "userId": user['id'], "role": user['role'], "name": user['name']}), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401


# --- STORE ENDPOINTS ---

@app.route('/api/stores', methods=['GET'])
def get_all_stores():
    city = request.args.get('city')
    db = get_db()
    
    if city:
        stores = db.execute('SELECT * FROM stores WHERE LOWER(city) = ?', (city.lower(),)).fetchall()
    else:
        stores = db.execute('SELECT * FROM stores').fetchall()
    
    # We also need to fetch products for these stores
    store_list = []
    for s in stores:
        s_dict = dict(s)
        items = db.execute('SELECT * FROM products WHERE store_id = ?', (s['id'],)).fetchall()
        s_dict['items'] = [dict(i) for i in items]
        store_list.append(s_dict)
        
    return jsonify(store_list), 200

@app.route('/api/vendor/<vendor_id>/stores', methods=['GET'])
def get_vendor_stores(vendor_id):
    db = get_db()
    stores = db.execute('SELECT * FROM stores WHERE vendor_id = ?', (vendor_id,)).fetchall()
    
    store_list = []
    for s in stores:
        s_dict = dict(s)
        items = db.execute('SELECT * FROM products WHERE store_id = ?', (s['id'],)).fetchall()
        s_dict['items'] = [dict(i) for i in items]
        store_list.append(s_dict)
        
    return jsonify(store_list), 200

@app.route('/api/stores', methods=['POST'])
def create_store():
    data = request.json
    db = get_db()
    
    store_id = data.get('id', str(uuid.uuid4()))
    vendor_id = data.get('vendor_id')
    
    # Check if updating or inserting
    existing = db.execute('SELECT id FROM stores WHERE id = ?', (store_id,)).fetchone()
    
    if existing:
        db.execute(
            '''UPDATE stores SET name = ?, category = ?, city = ?, desc = ?, image = ?, is_premium = ?
               WHERE id = ?''',
            (data['name'], data['category'], data['city'], data.get('desc', ''), data.get('image', ''), data.get('is_premium', 0), store_id)
        )
        # Clear old products and re-insert
        db.execute('DELETE FROM products WHERE store_id = ?', (store_id,))
    else:
        db.execute(
            '''INSERT INTO stores (id, vendor_id, name, category, city, desc, image, is_premium)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (store_id, vendor_id, data['name'], data['category'], data['city'], data.get('desc', ''), data.get('image', ''), data.get('is_premium', 0))
        )
    
    # Insert new products
    items = data.get('items', [])
    for item in items:
        prod_id = str(uuid.uuid4())
        db.execute(
            'INSERT INTO products (id, store_id, name, price, image) VALUES (?, ?, ?, ?, ?)',
            (prod_id, store_id, item['name'], item['price'], item.get('image', ''))
        )
        
    db.commit()
    return jsonify({"message": "Store saved successfully", "store_id": store_id}), 201


# --- ORDER ENDPOINTS ---

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    db = get_db()
    
    order_id = 'ORD' + str(int(datetime.datetime.now().timestamp()))
    user_id = data.get('user_id')
    total = data.get('total', 0)
    method = data.get('method', 'UPI')
    date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    db.execute(
        'INSERT INTO orders (id, user_id, total, method, date) VALUES (?, ?, ?, ?, ?)',
        (order_id, user_id, total, method, date)
    )
    
    for item in data.get('items', []):
        item_id = str(uuid.uuid4())
        db.execute(
            '''INSERT INTO order_items (id, order_id, product_name, store_name, price, qty)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (item_id, order_id, item['name'], item.get('store', ''), item['price'], item['qty'])
        )
        
    db.commit()
    return jsonify({"message": "Order placed", "order_id": order_id}), 201

@app.route('/api/users/<user_id>/orders', methods=['GET'])
def get_user_orders(user_id):
    db = get_db()
    orders = db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC', (user_id,)).fetchall()
    
    order_list = []
    for o in orders:
        o_dict = dict(o)
        items = db.execute('SELECT * FROM order_items WHERE order_id = ?', (o['id'],)).fetchall()
        o_dict['items'] = [dict(i) for i in items]
        order_list.append(o_dict)
        
    return jsonify(order_list), 200


# --- WISHLIST ENDPOINTS ---

@app.route('/api/users/<user_id>/wishlist', methods=['GET'])
def get_wishlist(user_id):
    db = get_db()
    items = db.execute('SELECT * FROM wishlist WHERE user_id = ?', (user_id,)).fetchall()
    return jsonify([dict(i) for i in items]), 200

@app.route('/api/users/<user_id>/wishlist', methods=['POST'])
def add_to_wishlist(user_id):
    data = request.json
    db = get_db()
    
    w_id = str(uuid.uuid4())
    db.execute(
        '''INSERT INTO wishlist (id, user_id, product_name, store_name, price, image)
           VALUES (?, ?, ?, ?, ?, ?)''',
        (w_id, user_id, data['name'], data['store'], data['price'], data.get('image', ''))
    )
    db.commit()
    return jsonify({"message": "Added to wishlist"}), 201

@app.route('/api/users/<user_id>/wishlist', methods=['DELETE'])
def remove_from_wishlist(user_id):
    product_name = request.args.get('name')
    store_name = request.args.get('store')
    db = get_db()
    
    db.execute('DELETE FROM wishlist WHERE user_id = ? AND product_name = ? AND store_name = ?', (user_id, product_name, store_name))
    db.commit()
    return jsonify({"message": "Removed from wishlist"}), 200



if __name__ == '__main__':
    if not os.path.exists(DB_FILE):
        print("Initializing database...")
        init_db()
    print("Starting Flask server on port 5000...")
    app.run(debug=True, port=5000, host="0.0.0.0")
