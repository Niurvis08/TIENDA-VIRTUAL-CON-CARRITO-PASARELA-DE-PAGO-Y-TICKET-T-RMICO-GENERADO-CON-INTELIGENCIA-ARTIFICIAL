// Constantes para elementos del DOM
const productsContainer = document.getElementById('products-container');
const cartList = document.getElementById('cart-list');
const cartTotalElement = document.getElementById('cart-total');
const cartCountElement = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const paymentForm = document.getElementById('payment-form');
const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));

// Array para almacenar el carrito (se inicializa desde localStorage si existe)
let cart = JSON.parse(localStorage.getItem('shopmasterCart')) || [];

// URL de la API
const API_URL = 'https://fakestoreapi.com/products';

// Función para inicializar el proyecto
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts(); // Cargar productos al inicio
    renderCart();   // Cargar y dibujar el carrito guardado
});

// --- FUNCIONES DE PRODUCTOS Y RENDERIZADO ---

/**
 * Carga los productos desde la API y los renderiza en la página.
 */
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error('Error al cargar los productos:', error);
        productsContainer.innerHTML = '<div class="alert alert-danger" role="alert">Error al cargar productos. Inténtelo de nuevo más tarde.</div>';
    }
}

/**
 * Dibuja las cards de productos en el contenedor.
 * @param {Array} products - Lista de productos.
 */
function renderProducts(products) {
    productsContainer.innerHTML = products.map(product => `
        <div class="col">
            <div class="card h-100">
                <img src="${product.image}" class="card-img-top" alt="${product.title}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.title}</h5>
                    <p class="card-text text-success fw-bold">$${product.price.toFixed(2)}</p>
                    <button class="mt-auto btn btn-outline-primary btn-sm" data-bs-toggle="modal" data-bs-target="#productModal" data-product='${JSON.stringify(product).replace(/'/g, '&#39;')}'>
                        <i class="fas fa-search"></i> Ver más
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Asignar evento a cada botón "Ver más"
    productsContainer.querySelectorAll('[data-product]').forEach(button => {
        button.addEventListener('click', showProductModal);
    });
}

/**
 * Muestra el contenido detallado del producto en una ventana modal.
 * @param {Event} event - El evento click del botón.
 */
function showProductModal(event) {
    // Obtener los datos del producto desde el atributo data-product
    const product = JSON.parse(event.currentTarget.dataset.product);
    const modalContent = document.querySelector('#productModal .modal-content');

    // 1. Renderiza el modal con un ID para el botón y el input de cantidad
    modalContent.innerHTML = `
        <div class="modal-header">
            <h5 class="modal-title" id="productModalLabel">${product.title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body row">
            <div class="col-md-5 text-center">
                <img src="${product.image}" class="img-fluid" alt="${product.title}" style="max-height: 300px;">
            </div>
            <div class="col-md-7">
                <p class="text-secondary">Categoría: ${product.category}</p>
                <p>${product.description}</p>
                <h3 class="text-success fw-bold">$${product.price.toFixed(2)}</h3>
                <div class="input-group mb-3" style="width: 150px;">
                    <span class="input-group-text">Cantidad</span>
                    <input type="number" id="quantity-${product.id}" class="form-control text-center" value="1" min="1" max="100">
                </div>
                <button class="btn btn-success" id="add-to-cart-btn" data-product-id="${product.id}">
                    <i class="fas fa-cart-plus"></i> Agregar al Carrito
                </button>
            </div>
        </div>
    `;

    // 2. Asignamos el Event Listener DESPUÉS de que el HTML del modal se ha insertado
    const cartButton = document.getElementById('add-to-cart-btn');
    
    if (cartButton) {
        cartButton.addEventListener('click', () => {
            // Obtenemos los valores de forma segura en el momento del clic
            const productId = parseInt(cartButton.dataset.productId);
            const quantityInput = document.getElementById(`quantity-${productId}`);
            const quantity = parseInt(quantityInput.value);

            addToCart(productId, quantity);
        });
    }
}

// --- FUNCIONES DEL CARRITO ---

/**
 * Agrega un producto al carrito o incrementa su cantidad.
 * @param {number} productId - ID del producto.
 * @param {number|string} quantity - Cantidad a añadir.
 */
async function addToCart(productId, quantity = 1) {
    quantity = parseInt(quantity);
    if (isNaN(quantity) || quantity < 1) return;

    // Buscar el producto en la API (o en un caché local si fuera más complejo)
    const product = await fetch(`${API_URL}/${productId}`).then(res => res.json());

    // Verificar si el producto ya está en el carrito
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity: quantity });
    }

    // Cerrar el modal y actualizar el carrito
    const modalElement = document.getElementById('productModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();

    saveCart();
    renderCart();
    showToast('Producto agregado', `${product.title} x${quantity} añadido al carrito.`, 'success');
}

/**
 * Guarda el carrito en LocalStorage para persistencia.
 */
function saveCart() {
    localStorage.setItem('shopmasterCart', JSON.stringify(cart));
}

/**
 * Dibuja la lista de productos en el offcanvas del carrito y calcula el total.
 */
function renderCart() {
    cartList.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartList.innerHTML = '<div class="alert alert-warning text-center">Tu carrito está vacío. 🛍️</div>';
        checkoutBtn.disabled = true;
    } else {
        checkoutBtn.disabled = false;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const cartItemHTML = `
                <div class="cart-item border-bottom pb-2 mb-2" id="cart-item-${item.id}">
                    <div class="cart-item-details">
                        <p class="mb-0 fw-bold">${item.title}</p>
                        <p class="mb-0 text-muted">Precio: $${item.price.toFixed(2)}</p>
                    </div>
                    <div class="d-flex align-items-center me-3">
                        <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${item.id}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="mx-2">${item.quantity}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${item.id}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div>
                        <span class="fw-bold me-3">$${itemTotal.toFixed(2)}</span>
                        <button class="btn btn-sm btn-danger" onclick="removeItem(${item.id})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            cartList.insertAdjacentHTML('beforeend', cartItemHTML);
        });
    }

    // Actualizar los elementos de total y contador
    cartTotalElement.textContent = `$${total.toFixed(2)}`;
    cartCountElement.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('payment-total-display').textContent = `$${total.toFixed(2)}`;
}

/**
 * Modifica la cantidad de un producto en el carrito.
 * @param {number} productId - ID del producto.
 * @param {number} change - Cambio de cantidad (+1 o -1).
 */
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeItem(productId);
        } else {
            saveCart();
            renderCart();
        }
    }
}

/**
 * Elimina un producto del carrito.
 * @param {number} productId - ID del producto a eliminar.
 */
function removeItem(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
    showToast('Producto eliminado', 'El artículo ha sido retirado del carrito.', 'danger');
}

// --- FUNCIÓN DE CHECKOUT Y PAGO ---

// Evento para abrir el modal de pago al hacer clic en "Ir a Pagar"
checkoutBtn.addEventListener('click', () => {
    // Esconde el offcanvas del carrito
    const offcanvasElement = document.getElementById('cartOffcanvas');
    const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
    if (offcanvas) offcanvas.hide();

    // Muestra el modal de pago
    paymentModal.show();
});

// Evento para simular el pago
paymentForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // Validación básica del formulario (Bootstrap ya ayuda, pero añadimos una capa de JS)
    const fullName = document.getElementById('fullName').value.trim();
    const cardNumber = document.getElementById('cardNumber').value.trim();
    const expiryDate = document.getElementById('expiryDate').value.trim();

    if (!fullName || cardNumber.length !== 16 || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
        alert('Por favor, complete todos los campos de pago correctamente.');
        return;
    }

    // 1. Ocultar el modal de pago
    paymentModal.hide();

    // 2. Generar el ticket de compra
    generatePdfTicket(fullName);

    // 3. Simular el éxito y vaciar el carrito
    showToast('✅ Pago Exitoso', '¡Gracias por su compra! Su ticket se ha descargado.', 'success', 6000);
    
    // 4. Vaciar el carrito y actualizar la interfaz
    cart = [];
    saveCart();
    renderCart();

    // 5. Resetear el formulario (opcional)
    paymentForm.reset();
});


// --- FUNCIÓN DE GENERACIÓN DE TICKET CON jsPDF ---

/**
 * Genera un ticket de compra en formato PDF tipo recibo térmico.
 * @param {string} customerName - Nombre del cliente para el ticket.
 */
function generatePdfTicket(customerName) {
    // Configuración para usar la librería
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 200] // Formato pequeño: 80mm de ancho, 200mm de alto (ajustable)
    });

    let y = 5; // Posición vertical inicial
    const lineHeight = 4; // Espacio entre líneas
    const margin = 3; // Margen lateral
    const lineCharLimit = 35; // Caracteres por línea para simular un recibo pequeño

    // Configurar fuente monoespaciada para simular impresión térmica
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);

    // --- ENCABEZADO ---
    doc.text('SHOPMASTER', 40, y, { align: 'center' });
    y += lineHeight;
    doc.text('RIF: J-0000000-0', 40, y, { align: 'center' });
    y += lineHeight;
    doc.text('Tel: 0212-0000000', 40, y, { align: 'center' });
    y += lineHeight * 2;
    
    // --- DATOS DE LA VENTA ---
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, y);
    doc.text(`Hora: ${new Date().toLocaleTimeString()}`, 80 - margin, y, { align: 'right' });
    y += lineHeight;
    doc.text('Vendedor: IA Developer', margin, y);
    y += lineHeight;
    doc.text(`Cliente: ${customerName}`, margin, y);
    y += lineHeight * 2;

    // --- DETALLE DE PRODUCTOS ---
    doc.text('-----------------------------------', 40, y, { align: 'center' });
    y += lineHeight;
    doc.text('Cant.  Descripcion         Precio', margin, y);
    y += lineHeight;
    doc.text('-----------------------------------', 40, y, { align: 'center' });
    y += lineHeight;

    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        // Formatear la línea (simulación de espaciado fijo con espacios)
        const qty = String(item.quantity).padStart(5, ' ');
        const price = item.price.toFixed(2).padStart(6, ' ');
        // Acortar el título
        const title = item.title.substring(0, lineCharLimit - 12); // Título acortado
        
        doc.text(`${qty} ${title}`, margin, y);
        doc.text(price, 80 - margin, y, { align: 'right' });
        y += lineHeight;
    });

    // --- TOTALES ---
    y += lineHeight;
    doc.text('-----------------------------------', 40, y, { align: 'center' });
    y += lineHeight;
    doc.text('SUBTOTAL', margin, y);
    doc.text(`$${subtotal.toFixed(2)}`, 80 - margin, y, { align: 'right' });
    y += lineHeight;

    // Simular impuestos
    const taxRate = 0.16;
    const taxAmount = subtotal * taxRate;
    const finalTotal = subtotal + taxAmount;

    doc.text('IMPUESTO (16%)', margin, y);
    doc.text(`$${taxAmount.toFixed(2)}`, 80 - margin, y, { align: 'right' });
    y += lineHeight;
    doc.text('-----------------------------------', 40, y, { align: 'center' });
    y += lineHeight;

    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL A PAGAR', margin, y);
    doc.text(`$${finalTotal.toFixed(2)}`, 80 - margin, y, { align: 'right' });
    y += lineHeight * 2;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);

    // --- PIE DE PÁGINA ---
    doc.text('¡GRACIAS POR SU COMPRA!', 40, y, { align: 'center' });
    y += lineHeight;
    doc.text('Vuelva pronto.', 40, y, { align: 'center' });

    // Guardar el PDF
    doc.save(`ticket_shopmaster_${Date.now()}.pdf`);
}

// --- FUNCIONES DE UTILIDAD (TOAST) ---

/**
 * Muestra un mensaje de notificación (simulado con alert para simplicidad).
 * En un entorno real, usaría un Toast de Bootstrap.
 */
function showToast(title, message, type = 'info', duration = 3000) {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    // Simulación con alerta, se recomienda implementar un Toast de Bootstrap real.
    // alert(`${title}\n${message}`);
}