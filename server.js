const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'ecommerce_secret_key_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));

const db = {
  users: new Datastore({ filename: path.join(__dirname, 'data/users.db'), autoload: true }),
  products: new Datastore({ filename: path.join(__dirname, 'data/products.db'), autoload: true }),
  orders: new Datastore({ filename: path.join(__dirname, 'data/orders.db'), autoload: true }),
  carts: new Datastore({ filename: path.join(__dirname, 'data/carts.db'), autoload: true }),
};

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

const seedProducts = () => {
  db.products.count({}, (err, count) => {
    if (count === 0) {
      const products = [
        { _id: uuidv4(), name: 'Wireless Noise-Cancelling Headphones', price: 299.99, originalPrice: 399.99, category: 'Electronics', stock: 42, rating: 4.8, reviews: 1283, description: 'Premium over-ear headphones with 30-hour battery life, adaptive noise cancellation, and Hi-Res Audio support. Perfect for audiophiles and commuters alike.', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', badge: 'Best Seller', specs: ['30hr battery', 'Active Noise Cancellation', 'Bluetooth 5.2', 'USB-C charging'] },
        { _id: uuidv4(), name: 'Mechanical Gaming Keyboard', price: 149.99, originalPrice: 189.99, category: 'Electronics', stock: 28, rating: 4.7, reviews: 892, description: 'RGB mechanical keyboard with Cherry MX switches, full N-key rollover, and customizable per-key lighting. Built for competitive gamers.', image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=600&q=80', badge: 'Gaming', specs: ['Cherry MX Red', 'Per-key RGB', 'Aluminum frame', 'USB passthrough'] },
        { _id: uuidv4(), name: 'Minimalist Leather Watch', price: 189.99, originalPrice: 249.99, category: 'Accessories', stock: 15, rating: 4.9, reviews: 567, description: 'Hand-crafted Italian leather strap with sapphire crystal glass and Swiss movement. Water resistant to 50m. Timeless elegance for every occasion.', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80', badge: 'Premium', specs: ['Swiss movement', 'Sapphire crystal', '50m water resistance', 'Italian leather'] },
        { _id: uuidv4(), name: '4K Ultra-Wide Monitor', price: 649.99, originalPrice: 799.99, category: 'Electronics', stock: 12, rating: 4.6, reviews: 445, description: '34-inch curved ultra-wide QHD display with 144Hz refresh rate and 1ms response time. IPS panel with 99% sRGB color coverage.', image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80', badge: 'New', specs: ['34" curved QHD', '144Hz refresh', '1ms response', '99% sRGB'] },
        { _id: uuidv4(), name: 'Smart Fitness Tracker', price: 89.99, originalPrice: 129.99, category: 'Wearables', stock: 63, rating: 4.5, reviews: 2341, description: 'Advanced fitness tracker with GPS, heart rate monitoring, sleep tracking, and 7-day battery. Swim-proof design.', image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&q=80', badge: 'Popular', specs: ['Built-in GPS', 'Heart rate monitor', '7-day battery', '5ATM waterproof'] },
        { _id: uuidv4(), name: 'Portable Bluetooth Speaker', price: 79.99, originalPrice: 99.99, category: 'Electronics', stock: 87, rating: 4.7, reviews: 1876, description: '360-degree omnidirectional sound with deep bass and 24-hour playtime. IP67 waterproof. Perfect for outdoor adventures.', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80', badge: 'Sale', specs: ['360° sound', '24hr playtime', 'IP67 waterproof', 'Wireless charging'] },
        { _id: uuidv4(), name: 'Ergonomic Office Chair', price: 449.99, originalPrice: 599.99, category: 'Furniture', stock: 8, rating: 4.8, reviews: 734, description: 'Full lumbar support with adjustable armrests, headrest, and seat depth. Breathable mesh back for all-day comfort.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80', badge: 'Top Rated', specs: ['Lumbar support', 'Adjustable armrests', 'Breathable mesh', '5-year warranty'] },
        { _id: uuidv4(), name: 'Mirrorless Camera Kit', price: 1299.99, originalPrice: 1599.99, category: 'Photography', stock: 6, rating: 4.9, reviews: 328, description: '24.2MP full-frame mirrorless camera with 4K video, in-body stabilization, and dual card slots. Includes 28-70mm kit lens.', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80', badge: 'Pro', specs: ['24.2MP full-frame', '4K 60fps video', 'In-body stabilization', 'Weather sealed'] },
      ];
      db.products.insert(products, () => console.log('Products seeded'));
    }
  });
};
setTimeout(seedProducts, 300);

// AUTH
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  db.users.findOne({ email }, async (err, existing) => {
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = { _id: uuidv4(), name, email, password: hashed, createdAt: new Date(), role: 'user' };
    db.users.insert(user, (err, u) => {
      const token = jwt.sign({ id: u._id, email, name, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: u._id, name, email, role: u.role } });
    });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.users.findOne({ email }, async (err, user) => {
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  db.users.findOne({ _id: req.user.id }, (err, user) => {
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
  });
});

// PRODUCTS
app.get('/api/products', (req, res) => {
  const { category, search, sort, minPrice, maxPrice } = req.query;
  let query = {};
  if (category && category !== 'All') query.category = category;
  if (search) query.name = new RegExp(search, 'i');
  db.products.find(query, (err, products) => {
    let result = products || [];
    if (minPrice) result = result.filter(p => p.price >= parseFloat(minPrice));
    if (maxPrice) result = result.filter(p => p.price <= parseFloat(maxPrice));
    if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
    res.json(result);
  });
});

app.get('/api/products/:id', (req, res) => {
  db.products.findOne({ _id: req.params.id }, (err, product) => {
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  });
});

// CART
app.get('/api/cart', authMiddleware, (req, res) => {
  db.carts.findOne({ userId: req.user.id }, (err, cart) => res.json(cart || { items: [] }));
});

app.post('/api/cart', authMiddleware, (req, res) => {
  const { productId, quantity = 1 } = req.body;
  db.products.findOne({ _id: productId }, (err, product) => {
    if (!product) return res.status(404).json({ error: 'Product not found' });
    db.carts.findOne({ userId: req.user.id }, (err, cart) => {
      if (cart) {
        const ex = cart.items.find(i => i.productId === productId);
        if (ex) ex.quantity += quantity;
        else cart.items.push({ productId, quantity, name: product.name, price: product.price, image: product.image });
        db.carts.update({ userId: req.user.id }, { $set: { items: cart.items } }, {}, () => {
          db.carts.findOne({ userId: req.user.id }, (e, u) => res.json(u));
        });
      } else {
        db.carts.insert({ userId: req.user.id, items: [{ productId, quantity, name: product.name, price: product.price, image: product.image }] }, (e, c) => res.json(c));
      }
    });
  });
});

app.put('/api/cart/:productId', authMiddleware, (req, res) => {
  const { quantity } = req.body;
  db.carts.findOne({ userId: req.user.id }, (err, cart) => {
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    if (quantity <= 0) cart.items = cart.items.filter(i => i.productId !== req.params.productId);
    else { const item = cart.items.find(i => i.productId === req.params.productId); if (item) item.quantity = quantity; }
    db.carts.update({ userId: req.user.id }, { $set: { items: cart.items } }, {}, () => {
      db.carts.findOne({ userId: req.user.id }, (e, u) => res.json(u));
    });
  });
});

app.delete('/api/cart/:productId', authMiddleware, (req, res) => {
  db.carts.findOne({ userId: req.user.id }, (err, cart) => {
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    cart.items = cart.items.filter(i => i.productId !== req.params.productId);
    db.carts.update({ userId: req.user.id }, { $set: { items: cart.items } }, {}, () => {
      db.carts.findOne({ userId: req.user.id }, (e, u) => res.json(u));
    });
  });
});

// ORDERS
app.post('/api/orders', authMiddleware, (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;
  db.carts.findOne({ userId: req.user.id }, (err, cart) => {
    if (!cart || !cart.items.length) return res.status(400).json({ error: 'Cart is empty' });
    const total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const order = {
      _id: uuidv4(), userId: req.user.id, userName: req.user.name, items: cart.items,
      total: total.toFixed(2), shippingAddress, paymentMethod, status: 'Processing',
      createdAt: new Date(), estimatedDelivery: new Date(Date.now() + 5 * 864e5),
      trackingNumber: 'TRK' + Math.random().toString(36).substr(2, 9).toUpperCase()
    };
    db.orders.insert(order, (err, o) => {
      if (err) return res.status(500).json({ error: 'Order failed' });
      db.carts.update({ userId: req.user.id }, { $set: { items: [] } }, {});
      res.json(o);
    });
  });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const query = req.user.role === 'admin' ? {} : { userId: req.user.id };
  db.orders.find(query).sort({ createdAt: -1 }).exec((err, orders) => res.json(orders || []));
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  db.orders.findOne({ _id: req.params.id }, (err, order) => {
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (order.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    res.json(order);
  });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
