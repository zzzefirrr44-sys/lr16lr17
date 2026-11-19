const STORAGE_KEY = "productflow_catalog_v1";

const starterProducts = [
  { id: 1, name: "Ноутбук Lenovo IdeaPad", category: "Ноутбуки", price: 28999, inStock: 8 },
  { id: 2, name: "Смартфон Samsung Galaxy", category: "Смартфони", price: 21999, inStock: 12 },
  { id: 3, name: "Навушники Sony WH-CH720N", category: "Аксесуари", price: 4499, inStock: 4 },
  { id: 4, name: "Монітор LG UltraWide", category: "Монітори", price: 11999, inStock: 6 },
  { id: 5, name: "Клавіатура Logitech MX Keys", category: "Аксесуари", price: 5299, inStock: 0 },
  { id: 6, name: "Планшет Apple iPad", category: "Планшети", price: 24999, inStock: 3 }
];

let products = loadProducts();
let toastTimer;

const tableBody = document.getElementById("productsTable");
const modalBackdrop = document.getElementById("modalBackdrop");
const productForm = document.getElementById("productForm");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");

function loadProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : starterProducts.map(product => ({ ...product }));
  } catch {
    return starterProducts.map(product => ({ ...product }));
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function formatPrice(value) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency", currency: "UAH", maximumFractionDigits: 0
  }).format(value);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function getProductIcon(category) {
  const normalized = category.toLowerCase();
  if (normalized.includes("ноут")) return "💻";
  if (normalized.includes("смартф")) return "📱";
  if (normalized.includes("планш")) return "📲";
  if (normalized.includes("монітор")) return "🖥️";
  if (normalized.includes("аксес")) return "🎧";
  return "📦";
}

function getStatus(stock) {
  if (stock === 0) return { text: "Немає в наявності", className: "out" };
  if (stock <= 5) return { text: "Закінчується", className: "low-status" };
  return { text: "У наявності", className: "available" };
}

function updateStatistics() {
  document.getElementById("totalProducts").textContent = products.length;
  const totalValue = products.reduce((sum, product) => sum + product.price * product.inStock, 0);
  document.getElementById("totalValue").textContent = formatPrice(totalValue);
  document.getElementById("totalCategories").textContent = new Set(products.map(p => p.category.toLowerCase())).size;
  document.getElementById("lowStock").textContent = products.filter(p => p.inStock <= 5).length;
}

function updateCategoryFilter() {
  const selected = categoryFilter.value;
  const categories = [...new Set(products.map(product => product.category))].sort((a, b) => a.localeCompare(b, "uk"));
  categoryFilter.innerHTML = '<option value="all">Усі категорії</option>' +
    categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("");
  categoryFilter.value = categories.includes(selected) ? selected : "all";
}

function getVisibleProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase("uk");
  const category = categoryFilter.value;
  const visible = products.filter(product => {
    const matchesSearch = product.name.toLocaleLowerCase("uk").includes(query) ||
      product.category.toLocaleLowerCase("uk").includes(query);
    return matchesSearch && (category === "all" || product.category === category);
  });

  switch (sortSelect.value) {
    case "name": visible.sort((a, b) => a.name.localeCompare(b.name, "uk")); break;
    case "priceAsc": visible.sort((a, b) => a.price - b.price); break;
    case "priceDesc": visible.sort((a, b) => b.price - a.price); break;
    default: visible.sort((a, b) => b.id - a.id);
  }
  return visible;
}

function renderProducts() {
  updateStatistics();
  updateCategoryFilter();
  const visible = getVisibleProducts();
  document.getElementById("resultsCount").textContent = `${visible.length} ${pluralize(visible.length)}`;
  document.getElementById("footerCount").textContent = `Показано ${visible.length} з ${products.length} товарів`;
  document.getElementById("emptyState").hidden = visible.length !== 0;
  tableBody.innerHTML = visible.map(product => {
    const status = getStatus(product.inStock);
    return `
      <tr>
        <td>
          <div class="product-cell">
            <div class="product-thumb">${getProductIcon(product.category)}</div>
            <div><div class="product-name">${escapeHTML(product.name)}</div><div class="product-id">ID: ${product.id}</div></div>
          </div>
        </td>
        <td><span class="category-pill">${escapeHTML(product.category)}</span></td>
        <td class="price">${formatPrice(product.price)}</td>
        <td><span class="stock ${product.inStock <= 5 ? "low" : "ok"}">${product.inStock} шт.</span></td>
        <td><span class="status-pill ${status.className}"><span>●</span>${status.text}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="edit" data-id="${product.id}" title="Редагувати" aria-label="Редагувати ${escapeHTML(product.name)}">✎</button>
            <button class="icon-btn delete" data-action="delete" data-id="${product.id}" title="Видалити" aria-label="Видалити ${escapeHTML(product.name)}">⌫</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function pluralize(number) {
  const mod10 = number % 10, mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "товари";
  return "товарів";
}

function openModal(product = null) {
  productForm.reset();
  document.getElementById("formError").textContent = "";
  document.getElementById("productId").value = product ? product.id : "";
  document.getElementById("modalTitle").textContent = product ? "Редагувати товар" : "Додати товар";
  document.getElementById("saveProductBtn").textContent = product ? "Зберегти зміни" : "Зберегти товар";
  if (product) {
    document.getElementById("productName").value = product.name;
    document.getElementById("productCategory").value = product.category;
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productStock").value = product.inStock;
  }
  modalBackdrop.hidden = false;
  document.getElementById("productName").focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  productForm.reset();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function handleSave(event) {
  event.preventDefault();
  const idValue = document.getElementById("productId").value;
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const inStock = Number(document.getElementById("productStock").value);
  const error = document.getElementById("formError");

  if (!name || !category || !Number.isFinite(price) || price <= 0 ||
      !Number.isInteger(inStock) || inStock < 0) {
    error.textContent = "Перевірте введені дані. Ціна має бути більшою за 0, залишок — цілим невід’ємним числом.";
    return;
  }

  if (idValue) {
    const index = products.findIndex(product => product.id === Number(idValue));
    if (index !== -1) products[index] = { ...products[index], name, category, price, inStock };
    showToast("Інформацію про товар оновлено");
  } else {
    const newId = products.length ? Math.max(...products.map(product => product.id)) + 1 : 1;
    products.push({ id: newId, name, category, price, inStock });
    showToast("Новий товар успішно додано");
  }

  saveProducts();
  closeModal();
  renderProducts();
}

function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const product = products.find(item => item.id === id);
  if (!product) return;

  if (button.dataset.action === "edit") {
    openModal(product);
  } else if (button.dataset.action === "delete") {
    const confirmed = confirm(`Видалити товар «${product.name}»?`);
    if (!confirmed) return;
    products = products.filter(item => item.id !== id);
    saveProducts();
    renderProducts();
    showToast("Товар видалено з каталогу");
  }
}

document.getElementById("addProductBtn").addEventListener("click", () => openModal());
document.getElementById("emptyAddBtn").addEventListener("click", () => openModal());
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);
document.getElementById("productForm").addEventListener("submit", handleSave);
tableBody.addEventListener("click", handleTableAction);
searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
sortSelect.addEventListener("change", renderProducts);
modalBackdrop.addEventListener("click", event => {
  if (event.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modalBackdrop.hidden) closeModal();
});

renderProducts();
