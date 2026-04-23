const path = require("path");
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "store.db");
const db = new sqlite3.Database(dbPath);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    store: new SQLiteStore({ db: "sessions.db", dir: __dirname }),
    secret: "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);
app.use(express.static(path.join(__dirname, "public")));

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });

async function initializeDatabase() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    image_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PLACED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  const existing = await get("SELECT COUNT(*) AS count FROM products");
  if (!existing || existing.count === 0) {
    const products = [
      {
        name: "Classic T-Shirt",
        description: "Soft cotton t-shirt for everyday comfort.",
        price: 19.99,
        image_url: "https://picsum.photos/seed/shirt/400/260"
      },
      {
        name: "Blue Denim Jeans",
        description: "Slim-fit denim jeans with stretch fabric.",
        price: 49.5,
        image_url: "https://picsum.photos/seed/jeans/400/260"
      },
      {
        name: "Running Sneakers",
        description: "Lightweight sneakers with breathable mesh.",
        price: 79.0,
        image_url: "https://picsum.photos/seed/sneakers/400/260"
      },
      {
        name: "Minimal Backpack",
        description: "Water-resistant backpack for work and travel.",
        price: 59.99,
        image_url: "https://picsum.photos/seed/backpack/400/260"
      }
    ];

    for (const product of products) {
      await run(
        "INSERT INTO products (name, description, price, image_url) VALUES (?, ?, ?, ?)",
        [product.name, product.description, product.price, product.image_url]
      );
    }
  }
}

function ensureCart(req) {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  return req.session.cart;
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    res.status(401).json({ error: "Please log in first." });
    return;
  }
  next();
}

app.get("/api/products", async (req, res) => {
  const products = await all("SELECT * FROM products ORDER BY id DESC");
  res.json(products);
});

app.get("/api/products/:id", async (req, res) => {
  const product = await get("SELECT * FROM products WHERE id = ?", [req.params.id]);
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json(product);
});

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = await run(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email.toLowerCase().trim(), passwordHash]
    );
    req.session.user = { id: result.lastID, name, email };
    res.status(201).json({ message: "Registration successful.", user: req.session.user });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      res.status(409).json({ error: "Email is already registered." });
      return;
    }
    throw err;
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const user = await get("SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.json({ message: "Login successful.", user: req.session.user });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out." });
  });
});

app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get("/api/cart", async (req, res) => {
  const cart = ensureCart(req);
  if (cart.length === 0) {
    res.json({ items: [], total: 0 });
    return;
  }
  const ids = cart.map((item) => item.productId);
  const placeholders = ids.map(() => "?").join(",");
  const products = await all(`SELECT * FROM products WHERE id IN (${placeholders})`, ids);
  const productMap = new Map(products.map((product) => [product.id, product]));

  const items = cart
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        return null;
      }
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity: item.quantity,
        subtotal: product.price * item.quantity
      };
    })
    .filter(Boolean);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  res.json({ items, total: Number(total.toFixed(2)) });
});

app.post("/api/cart", async (req, res) => {
  const { productId, quantity } = req.body;
  const parsedId = Number(productId);
  const parsedQty = Number(quantity || 1);
  if (!parsedId || parsedQty < 1) {
    res.status(400).json({ error: "Invalid product or quantity." });
    return;
  }

  const product = await get("SELECT id FROM products WHERE id = ?", [parsedId]);
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }

  const cart = ensureCart(req);
  const existing = cart.find((item) => item.productId === parsedId);
  if (existing) {
    existing.quantity += parsedQty;
  } else {
    cart.push({ productId: parsedId, quantity: parsedQty });
  }
  req.session.cart = cart;
  res.status(201).json({ message: "Item added to cart." });
});

app.patch("/api/cart/:productId", (req, res) => {
  const cart = ensureCart(req);
  const id = Number(req.params.productId);
  const quantity = Number(req.body.quantity);
  const item = cart.find((entry) => entry.productId === id);

  if (!item) {
    res.status(404).json({ error: "Item not found in cart." });
    return;
  }

  if (!quantity || quantity < 1) {
    req.session.cart = cart.filter((entry) => entry.productId !== id);
    res.json({ message: "Item removed from cart." });
    return;
  }

  item.quantity = quantity;
  res.json({ message: "Cart updated." });
});

app.delete("/api/cart/:productId", (req, res) => {
  const cart = ensureCart(req);
  const id = Number(req.params.productId);
  req.session.cart = cart.filter((item) => item.productId !== id);
  res.json({ message: "Item removed from cart." });
});

app.post("/api/orders", requireAuth, async (req, res) => {
  const cart = ensureCart(req);
  if (cart.length === 0) {
    res.status(400).json({ error: "Your cart is empty." });
    return;
  }

  const ids = cart.map((item) => item.productId);
  const placeholders = ids.map(() => "?").join(",");
  const products = await all(`SELECT * FROM products WHERE id IN (${placeholders})`, ids);
  const map = new Map(products.map((product) => [product.id, product]));

  const orderItems = cart
    .map((item) => {
      const product = map.get(item.productId);
      if (!product) {
        return null;
      }
      return {
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      };
    })
    .filter(Boolean);

  if (orderItems.length === 0) {
    res.status(400).json({ error: "No valid products in cart." });
    return;
  }

  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderResult = await run(
    "INSERT INTO orders (user_id, total, status) VALUES (?, ?, 'PLACED')",
    [req.session.user.id, Number(total.toFixed(2))]
  );
  const orderId = orderResult.lastID;

  for (const item of orderItems) {
    await run(
      "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
      [orderId, item.productId, item.quantity, item.price]
    );
  }

  req.session.cart = [];
  res.status(201).json({ message: "Order placed successfully.", orderId });
});

app.get("/api/orders", requireAuth, async (req, res) => {
  const orders = await all(
    "SELECT id, total, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC",
    [req.session.user.id]
  );

  const detailedOrders = [];
  for (const order of orders) {
    const items = await all(
      `SELECT oi.quantity, oi.price, p.name
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    detailedOrders.push({ ...order, items });
  }
  res.json(detailedOrders);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
