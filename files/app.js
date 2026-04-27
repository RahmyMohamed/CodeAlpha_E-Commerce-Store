function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);

  if (page === 'cart') renderCart();
  if (page === 'checkout') {
    if (!currentUser) { toggleAuthModal(); navigate('cart'); return; }
    renderCheckout();
  }
  if (page === 'orders') loadOrders();
  if (page === 'home') loadProducts();
}

async function loadOrders() {
  if (!currentUser) { navigate('home'); toggleAuthModal(); return; }
  const list = document.getElementById('ordersList');
  list.innerHTML = '<div style="color:var(--text2);text-align:center;padding:40px">Loading orders…</div>';
  try {
    const orders = await API.getOrders();
    if (!orders.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><h3>No orders yet</h3><p>Your orders will appear here after checkout</p><button class="btn-primary" onclick="navigate(\'home\')" style="margin-top:16px">Start Shopping</button></div>';
      return;
    }
    list.innerHTML = orders.map(o => {
      const statusClass = 'status-' + o.status.toLowerCase();
      return `<div class="order-card" onclick="openOrder('${o._id}')">
        <div class="order-header">
          <span class="order-id">#${o._id.slice(0, 8).toUpperCase()}</span>
          <span class="order-status ${statusClass}">${o.status}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="order-meta">
            <span>📅 ${new Date(o.createdAt).toLocaleDateString()}</span>
            <span>📦 ${o.items.length} item${o.items.length > 1 ? 's' : ''}</span>
            <span>🚚 ${o.trackingNumber}</span>
          </div>
          <span class="order-total">$${o.total}</span>
        </div>
      </div>`;
    }).join('');
  } catch (e) { list.innerHTML = '<div class="empty-state"><h3>Failed to load orders</h3></div>'; }
}

async function openOrder(id) {
  navigate('order-detail');
  const content = document.getElementById('orderDetailContent');
  content.innerHTML = '<div style="color:var(--text2);text-align:center;padding:60px">Loading…</div>';
  try {
    const o = await API.getOrder(id);
    const steps = ['Placed', 'Processing', 'Shipped', 'Delivered'];
    const stepIdx = steps.indexOf(o.status === 'Processing' ? 'Processing' : o.status);
    content.innerHTML = `
      <div class="order-detail-header">
        <div><div class="order-detail-title">Order #${o._id.slice(0,8).toUpperCase()}</div><div style="color:var(--text2);font-size:13px;margin-top:4px">${new Date(o.createdAt).toLocaleString()}</div></div>
        <span class="order-status status-${o.status.toLowerCase()}">${o.status}</span>
      </div>
      <div class="track-steps">
        ${steps.map((s, i) => `<div class="track-step ${i <= stepIdx ? 'done' : ''}"><div class="track-dot">${i <= stepIdx ? '✓' : (i+1)}</div><div class="track-label">${s}</div></div>`).join('')}
      </div>
      <div class="order-detail-grid" style="margin-top:28px">
        <div class="info-card"><h4>Shipping Address</h4><p>${o.shippingAddress}</p><p style="margin-top:8px;color:var(--accent);font-size:13px">Est. Delivery: ${new Date(o.estimatedDelivery).toLocaleDateString()}</p></div>
        <div class="info-card"><h4>Payment</h4><p style="text-transform:capitalize">${o.paymentMethod}</p><p style="margin-top:4px">Total: <strong style="color:var(--accent)">$${o.total}</strong></p><p style="margin-top:4px;font-size:13px">Tracking: <span style="color:var(--text2)">${o.trackingNumber}</span></p></div>
      </div>
      <div class="order-items-list">
        <h4 style="font-size:12px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">Items (${o.items.length})</h4>
        ${o.items.map(i => `<div class="order-item-row">
          <img class="order-item-img" src="${i.image}" alt="${i.name}" />
          <div class="order-item-info"><div class="order-item-name">${i.name}</div><div class="order-item-price">$${i.price.toFixed(2)} × ${i.quantity}</div></div>
          <div class="order-item-total">$${(i.price * i.quantity).toFixed(2)}</div>
        </div>`).join('')}
        <div style="display:flex;justify-content:flex-end;margin-top:16px;font-family:var(--font-display);font-size:20px;font-weight:700">Total: <span style="color:var(--accent);margin-left:10px">$${o.total}</span></div>
      </div>`;
  } catch (e) { content.innerHTML = '<div class="empty-state"><h3>Order not found</h3></div>'; }
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : '') + msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.className = 'toast', 3000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  loadProducts();
  loadCart();
  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      document.getElementById('userDropdown').classList.remove('open');
    }
  });
});
