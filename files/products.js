let currentCategory = 'All';
let currentSort = '';
let currentSearch = '';
let detailQty = 1;

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

function getBadgeClass(badge) {
  if (!badge) return '';
  const b = badge.toLowerCase();
  if (b === 'sale') return 'sale';
  if (b === 'premium' || b === 'pro') return 'premium';
  return '';
}

function getSavePct(price, original) {
  if (!original || original <= price) return null;
  return Math.round((1 - price / original) * 100);
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div class="loading-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>';
  try {
    const params = {};
    if (currentCategory !== 'All') params.category = currentCategory;
    if (currentSort) params.sort = currentSort;
    if (currentSearch) params.search = currentSearch;
    const products = await API.getProducts(params);
    renderProducts(products);
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load products</h3><p>Make sure the server is running on port 3001</p></div>';
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!products.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>No products found</h3><p>Try a different search or category</p></div>';
    return;
  }
  grid.innerHTML = products.map(p => {
    const save = getSavePct(p.price, p.originalPrice);
    return `<div class="product-card" onclick="openProduct('${p._id}')">
      <div class="card-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
        ${p.badge ? `<span class="card-badge ${getBadgeClass(p.badge)}">${p.badge}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-category">${p.category}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-rating">
          <span class="stars">${renderStars(p.rating)}</span>
          <span class="rating-count">(${p.reviews.toLocaleString()})</span>
        </div>
        <div class="card-price">
          <span class="price-current">$${p.price.toFixed(2)}</span>
          ${p.originalPrice ? `<span class="price-original">$${p.originalPrice.toFixed(2)}</span>` : ''}
          ${save ? `<span class="price-save">-${save}%</span>` : ''}
        </div>
        <div class="card-footer">
          <button class="btn-add" onclick="event.stopPropagation();addToCart('${p._id}')">Add to Cart</button>
          <button class="btn-detail" onclick="event.stopPropagation();openProduct('${p._id}')">View</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function openProduct(id) {
  navigate('product');
  detailQty = 1;
  document.getElementById('productDetailContent').innerHTML = '<div class="loading-grid"><div class="skeleton-card" style="height:500px"></div><div class="skeleton-card" style="height:500px"></div></div>';
  try {
    const p = await API.getProduct(id);
    const save = getSavePct(p.price, p.originalPrice);
    document.getElementById('productDetailContent').innerHTML = `
      <div class="detail-img">
        <img src="${p.image}" alt="${p.name}" />
      </div>
      <div class="detail-info">
        <div class="detail-category">${p.category}</div>
        <h1 class="detail-name">${p.name}</h1>
        <div class="detail-rating">
          <span class="detail-stars">${renderStars(p.rating)}</span>
          <span style="color:var(--text2);font-size:14px">${p.rating} (${p.reviews.toLocaleString()} reviews)</span>
        </div>
        <p class="detail-desc">${p.description}</p>
        ${p.specs ? `<div class="detail-specs">${p.specs.map(s => `<span class="spec-tag">✓ ${s}</span>`).join('')}</div>` : ''}
        <div class="detail-price">
          <span class="detail-price-current">$${p.price.toFixed(2)}</span>
          ${p.originalPrice ? `<span class="detail-price-original">$${p.originalPrice.toFixed(2)}</span>` : ''}
        </div>
        ${save ? `<div class="detail-save">You save ${save}% ($${(p.originalPrice - p.price).toFixed(2)})</div>` : ''}
        <div class="detail-stock">✓ In Stock (${p.stock} available)</div>
        <div class="detail-qty">
          <button class="qty-btn" onclick="changeDetailQty(-1)">−</button>
          <span class="qty-val" id="detailQty">1</span>
          <button class="qty-btn" onclick="changeDetailQty(1)">+</button>
          <span style="color:var(--text3);font-size:13px">units</span>
        </div>
        <div class="detail-actions">
          <button class="btn-primary" onclick="addToCart('${p._id}', detailQty)" style="flex:1;padding:16px">Add to Cart</button>
          <button class="btn-ghost" onclick="addToCartAndCheckout('${p._id}')" style="flex:1;padding:16px">Buy Now</button>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('productDetailContent').innerHTML = '<div class="empty-state"><h3>Product not found</h3></div>';
  }
}

function changeDetailQty(delta) {
  detailQty = Math.max(1, detailQty + delta);
  const el = document.getElementById('detailQty');
  if (el) el.textContent = detailQty;
}

async function addToCartAndCheckout(productId) {
  await addToCart(productId, detailQty);
  navigate('checkout');
}

function filterCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadProducts();
}

function handleSort(val) {
  currentSort = val;
  loadProducts();
}

let searchTimeout;
function handleSearch(val) {
  clearTimeout(searchTimeout);
  currentSearch = val;
  searchTimeout = setTimeout(loadProducts, 400);
}

function scrollToProducts() {
  document.getElementById('shopSection').scrollIntoView({ behavior: 'smooth' });
}
