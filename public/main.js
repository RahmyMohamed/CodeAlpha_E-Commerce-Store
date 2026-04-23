function setMessage(text, isError = false) {
  const el = document.getElementById("message");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("error", Boolean(text) && isError);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Request failed");
  }
  return body;
}

async function renderUserInfo() {
  const info = document.getElementById("user-info");
  if (!info) return;
  const data = await request("/api/me");
  info.textContent = data.user ? `Logged in as ${data.user.name}` : "You are browsing as guest.";
}

async function loadProducts() {
  const container = document.getElementById("products");
  if (!container) return;
  try {
    const products = await request("/api/products");
    container.innerHTML = products
      .map(
        (product) => `
        <article class="card">
          <img src="${product.image_url}" alt="${product.name}" />
          <div class="card-body">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p class="price">$${Number(product.price).toFixed(2)}</p>
            <div class="row">
              <a class="btn secondary" href="/product.html?id=${product.id}">Details</a>
              <button onclick="addToCart(${product.id}, 1)">Add to Cart</button>
            </div>
          </div>
        </article>
      `
      )
      .join("");
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function loadProductDetails() {
  const wrap = document.getElementById("product-details");
  if (!wrap) return;
  try {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) throw new Error("No product selected.");
    const product = await request(`/api/products/${id}`);
    wrap.innerHTML = `
      <article class="card">
        <img src="${product.image_url}" alt="${product.name}" />
        <div class="card-body">
          <h2>${product.name}</h2>
          <p>${product.description}</p>
          <p class="price">$${Number(product.price).toFixed(2)}</p>
          <div class="row">
            <input id="qty" type="number" min="1" value="1" style="max-width: 90px" />
            <button onclick="addProductDetailsToCart(${product.id})">Add to Cart</button>
          </div>
        </div>
      </article>
    `;
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function addProductDetailsToCart(productId) {
  const qty = Number(document.getElementById("qty").value || 1);
  await addToCart(productId, qty);
}

async function addToCart(productId, quantity) {
  try {
    await request("/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantity })
    });
    setMessage("Added to cart.");
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function loadCart() {
  const wrap = document.getElementById("cart-wrap");
  if (!wrap) return;
  try {
    const cart = await request("/api/cart");
    if (cart.items.length === 0) {
      wrap.innerHTML = "<p>Your cart is empty.</p>";
      return;
    }

    wrap.innerHTML = `
      <table>
        <thead>
          <tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${cart.items
            .map(
              (item) => `
            <tr>
              <td>${item.name}</td>
              <td>$${Number(item.price).toFixed(2)}</td>
              <td>
                <input type="number" min="1" value="${item.quantity}" style="max-width:70px"
                  onchange="updateCartItem(${item.productId}, this.value)" />
              </td>
              <td>$${Number(item.subtotal).toFixed(2)}</td>
              <td><button class="secondary" onclick="removeCartItem(${item.productId})">Remove</button></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      <h3 style="margin-top:14px">Total: $${Number(cart.total).toFixed(2)}</h3>
    `;
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function updateCartItem(productId, quantity) {
  try {
    await request(`/api/cart/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: Number(quantity) })
    });
    await loadCart();
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function removeCartItem(productId) {
  try {
    await request(`/api/cart/${productId}`, { method: "DELETE" });
    await loadCart();
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function wireAuthForms() {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(registerForm);
    try {
      await request("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password")
        })
      });
      setMessage("Registration successful.");
      registerForm.reset();
    } catch (err) {
      setMessage(err.message, true);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(loginForm);
    try {
      await request("/api/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password")
        })
      });
      setMessage("Logged in successfully.");
      loginForm.reset();
    } catch (err) {
      setMessage(err.message, true);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await request("/api/logout", { method: "POST" });
    setMessage("Logged out.");
  });
}

async function placeOrder() {
  try {
    const result = await request("/api/orders", { method: "POST" });
    setMessage(`Order #${result.orderId} placed successfully.`);
    await loadCart();
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function loadOrders() {
  const wrap = document.getElementById("orders-wrap");
  if (!wrap) return;
  try {
    const orders = await request("/api/orders");
    if (orders.length === 0) {
      wrap.innerHTML = "<p>No orders yet.</p>";
      return;
    }

    wrap.innerHTML = orders
      .map(
        (order) => `
        <article class="card" style="margin-bottom:12px">
          <div class="card-body">
            <h3>Order #${order.id}</h3>
            <p>Status: ${order.status}</p>
            <p>Total: $${Number(order.total).toFixed(2)}</p>
            <p>Date: ${new Date(order.created_at).toLocaleString()}</p>
            <ul>
              ${order.items
                .map(
                  (item) =>
                    `<li>${item.name} - ${item.quantity} x $${Number(item.price).toFixed(2)}</li>`
                )
                .join("")}
            </ul>
          </div>
        </article>
      `
      )
      .join("");
  } catch (err) {
    setMessage(err.message, true);
  }
}
