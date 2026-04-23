async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

function imageSrc(product) {
  return product.image || product.image_url || "https://picsum.photos/seed/default/500/300";
}

function currentProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function renderSessionLabel() {
  const userLabel = document.getElementById("userLabel");
  if (!userLabel) return;
  try {
    const data = await api("/api/session");
    userLabel.textContent = data.user ? `Hi, ${data.user.username}` : "Guest";
  } catch {
    userLabel.textContent = "";
  }
}

async function loadProducts() {
  const list = document.getElementById("products");
  if (!list) return;
  const products = await api("/api/products");
  list.innerHTML = products
    .map(
      (p) => `
      <article class="card">
        <img src="${imageSrc(p)}" alt="${p.name}" />
        <div class="card-content">
          <h3>${p.name}</h3>
          <p>${p.description}</p>
          <p class="price">${formatPrice(p.price)}</p>
          <button class="primary" onclick="addToCart(${p.id})">Add to Cart</button>
          <a class="primary" href="/product.html?id=${p.id}" style="margin-top:8px;">View Details</a>
        </div>
      </article>
    `
    )
    .join("");
}

async function loadProductDetails() {
  const container = document.getElementById("productDetails");
  const id = currentProductId();
  if (!container || !id) return;
  const p = await api(`/api/products/${id}`);
  container.innerHTML = `
    <img src="${imageSrc(p)}" alt="${p.name}" style="width:100%;max-height:320px;object-fit:cover;border-radius:10px;" />
    <h2>${p.name}</h2>
    <p>${p.description}</p>
    <p class="price">${formatPrice(p.price)}</p>
    <button class="primary" onclick="addToCart(${p.id})">Add to Cart</button>
  `;
}

async function addToCart(productId) {
  try {
    await api("/api/cart/add", {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1 })
    });
    alert("Added to cart.");
  } catch (err) {
    alert(err.message);
  }
}

async function loadCart() {
  const cartItems = document.getElementById("cartItems");
  if (!cartItems) return;
  const cartMessage = document.getElementById("cartMessage");
  try {
    const { items } = await api("/api/cart");
    if (!items.length) {
      cartItems.innerHTML = `<p class="muted">Your cart is empty.</p>`;
      return;
    }

    let total = 0;
    cartItems.innerHTML = items
      .map((item) => {
        const line = item.price * item.quantity;
        total += line;
        return `
          <div class="cart-row">
            <div>
              <strong>${item.name}</strong><br />
              <span class="muted">Qty: ${item.quantity}</span>
            </div>
            <div>
              <span class="price">${formatPrice(line)}</span>
              <button class="danger" onclick="removeFromCart(${item.productId})">Remove</button>
            </div>
          </div>
        `;
      })
      .join("");

    cartItems.innerHTML += `
      <div style="padding-top:12px;">
        <h3>Total: ${formatPrice(total)}</h3>
        <button class="primary" onclick="checkout()">Place Order</button>
      </div>
    `;
    if (cartMessage) cartMessage.textContent = "";
  } catch (err) {
    if (cartMessage) cartMessage.textContent = err.message;
  }
}

async function removeFromCart(productId) {
  await api("/api/cart/remove", {
    method: "POST",
    body: JSON.stringify({ productId })
  });
  await loadCart();
}

async function checkout() {
  const cartMessage = document.getElementById("cartMessage");
  try {
    const result = await api("/api/orders", { method: "POST" });
    if (cartMessage) cartMessage.textContent = `Order #${result.orderId} placed.`;
    await loadCart();
  } catch (err) {
    if (cartMessage) cartMessage.textContent = err.message;
  }
}

async function setupAuthForms() {
  const authMessage = document.getElementById("authMessage");
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api("/api/register", {
          method: "POST",
          body: JSON.stringify({
            username: document.getElementById("regUsername").value.trim(),
            password: document.getElementById("regPassword").value
          })
        });
        authMessage.textContent = "Registration successful.";
        await renderSessionLabel();
      } catch (err) {
        authMessage.textContent = err.message;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api("/api/login", {
          method: "POST",
          body: JSON.stringify({
            username: document.getElementById("loginUsername").value.trim(),
            password: document.getElementById("loginPassword").value
          })
        });
        authMessage.textContent = "Login successful.";
        await renderSessionLabel();
      } catch (err) {
        authMessage.textContent = err.message;
      }
    });
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" });
    await renderSessionLabel();
    alert("Logged out.");
  });
}

async function init() {
  await renderSessionLabel();
  await loadProducts();
  await loadProductDetails();
  await loadCart();
  await setupAuthForms();
  setupLogout();
}

init();
