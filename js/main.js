document.addEventListener('DOMContentLoaded', () => {
    const contenedor = document.getElementById('contenedor-productos');
    const telefonoWhatsApp = "573017856314";

    function formatearPrecio(precio) {
        return '$ ' + precio.toLocaleString('es-CO');
    }

    function renderizarProductos() {
        contenedor.innerHTML = "";
        
        if (productosStore.length === 0) {
            contenedor.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color:var(--text-muted); padding:3rem;">No hay sistemas disponibles en este momento.</p>`;
            return;
        }

        productosStore.forEach((p, index) => {
            const mensajeWhatsApp = `¡Hola! Me interesa comprar el sistema ${p.nombre} que vi en CodeMazter Store. Quiero saber cómo proceder con la compra. ¡Gracias!`;
            const linkWp = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensajeWhatsApp)}`;

            const card = document.createElement('div');
            card.className = 'card';
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

            let tagsHtml = '';
            if (p.etiquetas && p.etiquetas.length > 0) {
                tagsHtml = `<div class="tags">` + p.etiquetas.map(t => `<span class="tag">${t.trim()}</span>`).join('') + `</div>`;
            }

            card.innerHTML = `
                <div class="card-img-container">
                    <img src="${p.imagen}" alt="${p.nombre}">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${p.nombre}</h3>
                    <p class="card-desc">${p.descripcionCorta}</p>
                    ${tagsHtml}
                    <div class="card-price">${formatearPrecio(p.precio)}</div>
                    <div class="card-actions">
                        <button class="btn btn-demo" onclick="abrirDemo('${p.enlaceDemo}', '${p.nombre}', '${linkWp}')">🔮 Ver Demo</button>
                        <a href="${linkWp}" target="_blank" class="btn btn-buy">🛒 Comprar</a>
                    </div>
                </div>
            `;

            contenedor.appendChild(card);
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    renderizarProductos();
});

// Función global para abrir el visor de Demo
function abrirDemo(urlDemo, nombreSistema, linkWp) {
    let modal = document.getElementById('modal-demo');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-demo';
        modal.innerHTML = `
            <div class="demo-bar">
                <div style="display:flex; align-items:center; gap:15px; font-size:0.9rem;">
                    <span style="color:var(--cyan-glow); font-weight:600;">🔮 MODO DEMO</span>
                    <span style="color:var(--text-muted);">|</span>
                    <span id="demo-titulo-sis">Sistema</span>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <a id="demo-btn-comprar" href="#" target="_blank" class="btn btn-buy" style="padding:6px 14px; font-size:0.85rem;">🛒 Comprar Versión Completa</a>
                    <button onclick="cerrarDemo()" class="btn btn-demo" style="padding:6px 14px; font-size:0.85rem;">✕ Salir</button>
                </div>
            </div>
            <iframe id="iframe-demo" class="demo-frame"></iframe>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('demo-titulo-sis').innerHTML = `Sistema: <strong>${nombreSistema}</strong>`;
    document.getElementById('demo-btn-comprar').href = linkWp;
    document.getElementById('iframe-demo').src = urlDemo;
    modal.style.display = 'flex';
}

function cerrarDemo() {
    const modal = document.getElementById('modal-demo');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('iframe-demo').src = '';
    }
}