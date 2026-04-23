const express = require("express");
const path = require("path");
const session = require("express-session");
const SQLiteStoreFactory = require("connect-sqlite3");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const app = express();
const SQLiteStore = SQLiteStoreFactory(session);
const PORT = 3000;

const db = new sqlite3.Database(path.join(__dirname, "store.db"));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT DEFAULT ''
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  db.run("ALTER TABLE products ADD COLUMN image TEXT DEFAULT ''", () => {});

  db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
    if (err) return;
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)");
      const seedProducts = [
        ["Wireless Headphones", "Noise-cancelling over-ear headphones with 30-hour battery.", 79.99, "https://picsum.photos/seed/headphones/500/300"],
        ["Smart Watch", "Fitness tracking smartwatch with heart-rate monitor and GPS.", 129.99, "https://picsum.photos/seed/watch/500/300"],
        ["Mechanical Keyboard", "RGB mechanical keyboard with tactile switches.", 59.99, "https://picsum.photos/seed/keyboard/500/300"],
        ["Portable Speaker", "Compact Bluetooth speaker with deep bass and 12-hour playtime.", 49.99, "https://picsum.photos/seed/speaker/500/300"]
      ];
      seedProducts.forEach((product) => stmt.run(product));
      stmt.finalize();
    }
  });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    store: new SQLiteStore({ db: "sessions.db", dir: __dirname }),
    secret: "dev-ecommerce-secret",
    resave: false,
    saveUninitialized: false
  })
);

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in first." });
  }
  next();
}

app.get("/api/products", (_req, res) => {
  db.all("SELECT id, name, description, price, COALESCE(NULLIF(image, ''), image_url, '') AS image FROM products ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to load products." });
    res.json(rows);
  });
});

app.get("/api/products/:id", (req, res) => {
  db.get(
    "SELECT id, name, description, price, COALESCE(NULLIF(image, ''), image_url, '') AS image FROM products WHERE id = ?",
    [req.params.id],
    (err, row) => {
    if (err) return res.status(500).json({ error: "Failed to load product details." });
    if (!row) return res.status(404).json({ error: "Product not found." });
    res.json(row);
    }
  );
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password are required." });

  const passwordHash = bcrypt.hashSync(password, 10);
  db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, passwordHash], function (err) {
    if (err) return res.status(400).json({ error: "Username already exists." });
    req.session.user = { id: this.lastID, username };
    req.session.cart = req.session.cart || [];
    res.json({ message: "Registration successful.", user: req.session.user });
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ error: "Login failed." });
    if (!user) return res.status(400).json({ error: "Invalid username or password." });
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    req.session.user = { id: user.id, username: user.username };
    req.session.cart = req.session.cart || [];
    res.json({ message: "Login successful.", user: req.session.user });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out." });
  });
});

app.get("/api/session", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get("/api/cart", (req, res) => {
  res.json({ items: req.session.cart || [] });
});

app.post("/api/cart/add", (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: "productId is required." });

  db.get("SELECT id, name, price, COALESCE(NULLIF(image, ''), image_url, '') AS image FROM products WHERE id = ?", [productId], (err, product) => {
    if (err) return res.status(500).json({ error: "Failed to add item to cart." });
    if (!product) return res.status(404).json({ error: "Product not found." });

    const cart = req.session.cart || [];
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      existing.quantity += Number(quantity);
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: Number(quantity)
      });
    }

    req.session.cart = cart;
    res.json({ message: "Item added to cart.", items: cart });
  });
});

app.post("/api/cart/remove", (req, res) => {
  const { productId } = req.body;
  const cart = req.session.cart || [];
  req.session.cart = cart.filter((item) => item.productId !== Number(productId));
  res.json({ message: "Item removed.", items: req.session.cart });
});

app.post("/api/orders", requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) return res.status(400).json({ error: "Cart is empty." });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  db.run("INSERT INTO orders (user_id, total) VALUES (?, ?)", [req.session.user.id, total], function (err) {
    if (err) return res.status(500).json({ error: "Failed to process order." });

    const orderId = this.lastID;
    const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
    cart.forEach((item) => stmt.run(orderId, item.productId, item.quantity, item.price));
    stmt.finalize((finalizeErr) => {
      if (finalizeErr) return res.status(500).json({ error: "Failed to save order items." });
      req.session.cart = [];
      res.json({ message: "Order placed successfully.", orderId, total: total.toFixed(2) });
    });
  });
});

app.get("/api/orders", requireAuth, (req, res) => {
  db.all(
    `
      SELECT o.id, o.total, o.created_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `,
    [req.session.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to fetch orders." });
      res.json(rows);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
