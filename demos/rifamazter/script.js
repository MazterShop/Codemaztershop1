const app = (() => {
  const STORAGE_KEY = 'AETHER_2050_DB_V3';
  const WHATSAPP_NUMBER = '573001234567'; // Cambia por tu WhatsApp real

  function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
  }

  function hashPass(pw) {
    return btoa(unescape(encodeURIComponent('AETHER_SALT_' + pw)));
  }

  const futureDate = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16);

  const defaultState = {
    users: [
      {
        id: 'usr-admin-01',
        name: 'Comandante Nexus',
        email: 'admin@aether2050.com',
        password: hashPass('Admin2050!'),
        gender: 'hombre',
        role: 'admin',
        status: 'activo'
      }
    ],
    raffles: [
      {
        id: 'raf-01',
        title: 'Cyber-Hypercar Neural VIP',
        description: 'Vehículo autónomo cuántico de edición exclusiva.',
        totalNumbers: 30,
        price: 10,
        endTime: futureDate,
        isVip: true,
        winnerNumber: null,
        winnerName: null,
        finishedAt: null,
        tickets: {}
      }
    ],
    history: [],
    activeRaffleId: 'raf-01',
    currentUserId: null,
    cart: []
  };

  let state = loadState();

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error cargando estado:', e);
    }
    return structuredClone(defaultState);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getCurrentUser() {
    if (!state.currentUserId) return null;
    const user = state.users.find(u => u.id === state.currentUserId);
    if (!user || user.status === 'suspendido') {
      state.currentUserId = null;
      saveState();
      return null;
    }
    return user;
  }

  function toast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function applyGenderTheme(user) {
    const html = document.documentElement;
    if (user && (user.gender === 'mujer' || user.gender === 'hombre')) {
      html.setAttribute('data-theme', user.gender);
    } else {
      html.setAttribute('data-theme', 'default');
    }
  }

  function navigate(viewName) {
    const user = getCurrentUser();

    if (viewName === 'user-panel' && !user) {
      openAuthModal('login');
      toast('Inicia sesión para acceder a tu Bóveda.');
      return;
    }

    if (viewName === 'admin-panel' && (!user || user.role !== 'admin')) {
      toast('Acceso denegado: Se requieren credenciales de Administrador.');
      return;
    }

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    const navBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (navBtn) navBtn.classList.add('active');

    renderAll();
  }

  function openAuthModal(mode = 'login') {
    document.getElementById('auth-modal').classList.remove('hidden');
    switchAuthMode(mode);
  }

  function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
  }

  function switchAuthMode(mode) {
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');
    const title = document.getElementById('auth-modal-title');

    if (!formLogin || !formReg) return;

    if (mode === 'login') {
      formLogin.classList.remove('hidden');
      formReg.classList.add('hidden');
      if (tabLogin) tabLogin.classList.add('active');
      if (tabReg) tabReg.classList.remove('active');
      if (title) title.textContent = 'ACCESO AL NÚCLEO';
    } else {
      formLogin.classList.add('hidden');
      formReg.classList.remove('hidden');
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabReg) tabReg.classList.add('active');
      if (title) title.textContent = 'NUEVA IDENTIDAD 2050';
    }
  }

  function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const gender = document.getElementById('reg-gender').value;
    const password = document.getElementById('reg-password').value;

    if (state.users.some(u => u.email === email)) {
      toast('Este correo ya está registrado.');
      return;
    }

    const newUser = {
      id: 'usr-' + Date.now(), name, email, password: hashPass(password), gender, role: 'cliente', status: 'activo'
    };

    state.users.push(newUser);
    state.currentUserId = newUser.id;
    saveState();
    closeAuthModal();
    e.target.reset();
    toast(`Identidad creada. Interfaz sincronizada (${gender.toUpperCase()}).`);
    renderAll();
  }

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    const user = state.users.find(u => u.email === email && u.password === hashPass(password));
    if (!user) {
      toast('Credenciales incorrectas.');
      return;
    }
    if (user.status === 'suspendido') {
      toast('Cuenta suspendida.');
      return;
    }

    state.currentUserId = user.id;
    saveState();
    closeAuthModal();
    e.target.reset();
    toast(`Bienvenido, ${user.name}.`);
    renderAll();
  }

  function logout() {
    state.currentUserId = null;
    state.cart = [];
    saveState();
    toast('Sesión cerrada.');
    navigate('vitrina');
  }

  function selectRaffle(raffleId) {
    state.activeRaffleId = raffleId;
    saveState();
    renderVitrina();
  }

  function formatNum(n, total) {
    const digits = total >= 100 ? 3 : 2;
    return String(n).padStart(digits, '0');
  }

  function handleTicketClick(raffleId, numStr) {
    const user = getCurrentUser();
    if (!user) {
      openAuthModal('login');
      toast('Inicia sesión para agregar números al carrito.');
      return;
    }

    const raffle = state.raffles.find(r => r.id === raffleId);
    if (!raffle || raffle.winnerNumber) return;

    const ticket = raffle.tickets[numStr];
    if (ticket && ticket.status === 'paid') {
      toast(`El número #${numStr} ya está pagado por otro usuario.`);
      return;
    }

    const cartIndex = state.cart.findIndex(item => item.raffleId === raffleId && item.numStr === numStr);
    if (cartIndex > -1) {
      state.cart.splice(cartIndex, 1);
      toast(`Número #${numStr} quitado del carrito.`);
    } else {
      state.cart.push({ raffleId, raffleTitle: raffle.title, numStr, price: raffle.price });
      toast(`Número #${numStr} agregado al carrito 🛒`);
    }

    saveState();
    renderVitrina();
    renderCartModal();
  }

  function openCartModal() {
    if (!getCurrentUser()) {
      openAuthModal('login');
      return;
    }
    document.getElementById('cart-modal').classList.remove('hidden');
    renderCartModal();
  }

  function closeCartModal() {
    document.getElementById('cart-modal').classList.add('hidden');
  }

  function removeFromCart(raffleId, numStr) {
    state.cart = state.cart.filter(item => !(item.raffleId === raffleId && item.numStr === numStr));
    saveState();
    renderVitrina();
    renderCartModal();
  }

  // Redirigir al WhatsApp y dejar los boletos en estado 'reserved' para aprobación admin
  function checkoutCartToWhatsApp() {
    const user = getCurrentUser();
    if (!user || state.cart.length === 0) return;

    let totalToPay = 0;
    let detailsText = '';
    const grouped = {};

    state.cart.forEach(item => {
      if (!grouped[item.raffleTitle]) grouped[item.raffleTitle] = [];
      grouped[item.raffleTitle].push(item.numStr);

      const raffle = state.raffles.find(r => r.id === item.raffleId);
      if (raffle) {
        // Marcamos como reservado pendiente de validación de pago por el administrador
        raffle.tickets[item.numStr] = {
          status: 'reserved', userId: user.id, userName: user.name, userEmail: user.email, updatedAt: new Date().toLocaleString()
        };
        totalToPay += item.price;
      }
    });

    Object.entries(grouped).forEach(([title, nums]) => {
      detailsText += `🎁 *Rifa:* ${title}\n🔢 *Números:* ${nums.map(n => '#' + n).join(', ')}\n\n`;
    });

    const message = `Hola! 👋 Deseo confirmar mis números en reserva:\n\n${detailsText}💲 *Total a Pagar:* $${totalToPay} USD\n👤 *Participante:* ${user.name}\n📧 *Correo:* ${user.email}\n\nQuedo atento(a) para enviar mi comprobante de pago. ¡Gracias!`;
    
    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    state.cart = [];
    saveState();
    closeCartModal();
    renderAll();

    window.open(whatsappURL, '_blank');
    toast('¡Boletos en reserva! Redirigiendo a WhatsApp...');
  }

  // Verificación automática de temporizadores
  function checkTimersAndDraws() {
    const now = new Date().getTime();
    let updated = false;

    state.raffles.forEach(raffle => {
      if (!raffle.winnerNumber && raffle.endTime) {
        const endTime = new Date(raffle.endTime).getTime();
        if (now >= endTime) {
          const paidTickets = Object.entries(raffle.tickets).filter(([k, v]) => v.status === 'paid');
          let winnerNum = '';
          let winnerName = 'Sin comprador (Casa)';

          if (paidTickets.length > 0) {
            const randomPick = paidTickets[Math.floor(Math.random() * paidTickets.length)];
            winnerNum = randomPick[0];
            winnerName = randomPick[1].userName;
          } else {
            const randomVal = Math.floor(Math.random() * raffle.totalNumbers) + 1;
            winnerNum = formatNum(randomVal, raffle.totalNumbers);
          }

          raffle.winnerNumber = winnerNum;
          raffle.winnerName = winnerName;
          raffle.finishedAt = new Date().getTime();
          updated = true;
        }
      }
    });

    state.raffles = state.raffles.filter(raffle => {
      if (raffle.winnerNumber && raffle.finishedAt) {
        const elapsed = now - raffle.finishedAt;
        if (elapsed > 5 * 60 * 1000) {
          state.history.unshift({
            id: raffle.id,
            title: raffle.title,
            winnerNumber: raffle.winnerNumber,
            winnerName: raffle.winnerName,
            finishedDate: new Date(raffle.finishedAt).toLocaleString()
          });
          updated = true;
          return false;
        }
      }
      return true;
    });

    if (updated) {
      saveState();
      renderAll();
    }
  }

  setInterval(checkTimersAndDraws, 1000);

  function createRaffle(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;

    const title = document.getElementById('raffle-title').value.trim();
    const description = document.getElementById('raffle-desc').value.trim();
    const totalNumbers = parseInt(document.getElementById('raffle-count').value, 10);
    const price = parseFloat(document.getElementById('raffle-price').value);
    const endTime = document.getElementById('raffle-endtime').value;
    const isVip = document.getElementById('raffle-type').value === 'vip';

    const newRaffle = {
      id: 'raf-' + Date.now(),
      title,
      description,
      totalNumbers,
      price,
      endTime,
      isVip,
      winnerNumber: null,
      winnerName: null,
      finishedAt: null,
      tickets: {}
    };

    state.raffles.unshift(newRaffle);
    state.activeRaffleId = newRaffle.id;
    saveState();
    e.target.reset();
    toast(`Rifa "${title}" desplegada con éxito.`);
    renderAll();
  }

  function deleteRaffle(raffleId) {
    if (!confirm('¿Eliminar esta rifa?')) return;
    state.raffles = state.raffles.filter(r => r.id !== raffleId);
    if (state.activeRaffleId === raffleId) state.activeRaffleId = state.raffles[0]?.id || null;
    saveState();
    renderAll();
  }

  function approveTicketPayment(raffleId, numStr) {
    const raffle = state.raffles.find(r => r.id === raffleId);
    if (!raffle || !raffle.tickets[numStr]) return;
    raffle.tickets[numStr].status = 'paid';
    saveState();
    toast(`Boleto #${numStr} aprobado como PAGADO.`);
    renderAll();
  }

  function releaseTicketReservation(raffleId, numStr) {
    const raffle = state.raffles.find(r => r.id === raffleId);
    if (!raffle || !raffle.tickets[numStr]) return;
    delete raffle.tickets[numStr];
    saveState();
    renderAll();
  }

  function openEditUserModal(userId) {
    const u = state.users.find(x => x.id === userId);
    if (!u) return;
    document.getElementById('edit-user-id').value = u.id;
    document.getElementById('edit-user-name').value = u.name;
    document.getElementById('edit-user-email').value = u.email;
    document.getElementById('edit-user-gender').value = u.gender;
    document.getElementById('edit-user-role').value = u.role;
    document.getElementById('edit-user-modal').classList.remove('hidden');
  }

  function closeEditUserModal() {
    document.getElementById('edit-user-modal').classList.add('hidden');
  }

  function saveEditedUser(e) {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const u = state.users.find(x => x.id === id);
    if (!u) return;
    u.name = document.getElementById('edit-user-name').value.trim();
    u.email = document.getElementById('edit-user-email').value.trim().toLowerCase();
    u.gender = document.getElementById('edit-user-gender').value;
    u.role = document.getElementById('edit-user-role').value;
    saveState();
    closeEditUserModal();
    renderAll();
    toast('Usuario actualizado.');
  }

  function toggleSuspendUser(userId) {
    const u = state.users.find(x => x.id === userId);
    if (!u || u.role === 'admin') return;
    u.status = u.status === 'activo' ? 'suspendido' : 'activo';
    saveState();
    renderAll();
  }

  function deleteUser(userId) {
    const u = state.users.find(x => x.id === userId);
    if (!u || u.role === 'admin' || !confirm('¿Eliminar usuario?')) return;
    state.users = state.users.filter(x => x.id !== userId);
    saveState();
    renderAll();
  }

  function switchAdminTab(tabName, btnEl) {
    document.querySelectorAll('.admin-subpanel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`admin-tab-${tabName}`).classList.remove('hidden');
    if (btnEl) btnEl.classList.add('active');
  }

  function renderHeader() {
    const user = getCurrentUser();
    applyGenderTheme(user);

    const authControls = document.getElementById('auth-controls');
    const userSession = document.getElementById('user-session');
    const btnUser = document.getElementById('btn-nav-user');
    const btnAdmin = document.getElementById('btn-nav-admin');
    const cartFloatingBtn = document.getElementById('cart-floating-btn');

    if (user) {
      authControls.classList.add('hidden');
      userSession.classList.remove('hidden');
      if (btnUser) btnUser.classList.remove('hidden');
      if (cartFloatingBtn) cartFloatingBtn.classList.remove('hidden');
      document.getElementById('header-username').textContent = user.name;
      document.getElementById('header-role').textContent = user.role;
      if (btnAdmin) btnAdmin.classList.toggle('hidden', user.role !== 'admin');
    } else {
      authControls.classList.remove('hidden');
      userSession.classList.add('hidden');
      if (btnUser) btnUser.classList.add('hidden');
      if (btnAdmin) btnAdmin.classList.add('hidden');
      if (cartFloatingBtn) cartFloatingBtn.classList.add('hidden');
    }

    const badge = document.getElementById('cart-badge-count');
    if (badge) badge.textContent = state.cart.length;
  }

  function renderVitrina() {
    let totalAvail = 0, totalRes = 0, totalSold = 0;
    state.raffles.forEach(r => {
      const tickets = Object.values(r.tickets);
      const resCount = tickets.filter(t => t.status === 'reserved').length;
      const soldCount = tickets.filter(t => t.status === 'paid').length;
      totalRes += resCount;
      totalSold += soldCount;
      totalAvail += (r.totalNumbers - resCount - soldCount);
    });

    document.getElementById('kpi-total-raffles').textContent = state.raffles.length;
    document.getElementById('kpi-avail-tickets').textContent = totalAvail;
    document.getElementById('kpi-reserved-tickets').textContent = totalRes;
    document.getElementById('kpi-sold-tickets').textContent = totalSold;

    const tabsContainer = document.getElementById('vitrina-raffle-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = state.raffles.map(r => `
        <button class="raffle-tab ${r.id === state.activeRaffleId ? 'active' : ''}" onclick="app.selectRaffle('${r.id}')">
          <strong>${escapeHTML(r.title)}</strong> · $${r.price} ${r.isVip ? '⭐ VIP' : ''}
        </button>
      `).join('');
    }

    const workspace = document.getElementById('vitrina-active-container');
    if (!workspace) return;

    const activeRaffle = state.raffles.find(r => r.id === state.activeRaffleId) || state.raffles[0];
    if (!activeRaffle) {
      workspace.innerHTML = `<div class="glass-panel vitrina-card"><p>No hay rifas activas en este momento.</p></div>`;
      return;
    }

    let timeLeftHTML = '';
    if (activeRaffle.endTime) {
      const diff = new Date(activeRaffle.endTime).getTime() - new Date().getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        timeLeftHTML = `
          <div class="countdown-box">
            <div class="countdown-item"><span class="countdown-num">${days}</span><span class="countdown-label">Días</span></div> :
            <div class="countdown-item"><span class="countdown-num">${hours}</span><span class="countdown-label">Hrs</span></div> :
            <div class="countdown-item"><span class="countdown-num">${mins}</span><span class="countdown-label">Min</span></div> :
            <div class="countdown-item"><span class="countdown-num">${secs}</span><span class="countdown-label">Seg</span></div>
          </div>
        `;
      } else {
        timeLeftHTML = `<div style="color:#facc15; font-weight:800; margin-top:6px;">⏳ Sorteo en proceso de cierre...</div>`;
      }
    }

    let gridHTML = '';
    for (let i = 1; i <= activeRaffle.totalNumbers; i++) {
      const numStr = formatNum(i, activeRaffle.totalNumbers);
      const t = activeRaffle.tickets[numStr];
      const inCart = state.cart.some(item => item.raffleId === activeRaffle.id && item.numStr === numStr);
      const isWinner = activeRaffle.winnerNumber === numStr;

      let cssClass = 'ticket-available';
      let label = 'LIBRE';

      if (t) {
        if (t.status === 'paid') { cssClass = 'ticket-sold'; label = 'PAGADO'; }
        else if (t.status === 'reserved') { cssClass = 'ticket-reserved'; label = 'RESERVADO'; }
      }
      if (inCart) { cssClass += ' ticket-selected'; label = 'EN CARRITO'; }
      if (isWinner) { cssClass += ' ticket-winner'; label = '🏆 GANADOR'; }

      gridHTML += `
        <button class="ticket-btn ${cssClass}" onclick="app.handleTicketClick('${activeRaffle.id}', '${numStr}')">
          <span>#${numStr}</span>
          <small>${label}</small>
        </button>
      `;
    }

    workspace.innerHTML = `
      <div class="glass-panel vitrina-card ${activeRaffle.isVip ? 'vip-raffle-card' : ''}">
        ${activeRaffle.isVip ? '<span class="vip-badge">⭐ VIP EXCLUSIVO</span>' : ''}
        <div class="vitrina-header">
          <div>
            <h3>${escapeHTML(activeRaffle.title)}</h3>
            <p style="color: var(--text-muted); margin-top:4px;">${escapeHTML(activeRaffle.description)}</p>
            ${timeLeftHTML}
          </div>
          <div style="text-align:right;">
            <span class="badge-year">VALOR: $${activeRaffle.price}</span>
            ${activeRaffle.winnerNumber ? `<div style="margin-top:8px; color:#facc15; font-weight:800;">🏆 GANADOR: #${activeRaffle.winnerNumber} (${escapeHTML(activeRaffle.winnerName)})</div>` : ''}
          </div>
        </div>

        <div class="legend-bar">
          <div class="legend-item"><span class="dot dot-avail"></span> Disponible</div>
          <div class="legend-item"><span class="dot dot-reserved"></span> Reservado (Reclamable)</div>
          <div class="legend-item"><span class="dot dot-sold"></span> Pagado</div>
        </div>

        <div class="tickets-grid">${gridHTML}</div>
      </div>
    `;
  }

  function renderHistory() {
    const tbody = document.getElementById('global-history-tbody');
    if (!tbody) return;

    tbody.innerHTML = state.history.map(h => `
      <tr>
        <td><strong>${escapeHTML(h.title)}</strong></td>
        <td><span class="badge-status status-paid">#${h.winnerNumber}</span></td>
        <td>${escapeHTML(h.winnerName)}</td>
        <td><span class="badge-status status-paid">FINALIZADO</span></td>
        <td>${escapeHTML(h.finishedDate)}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay rifas en el historial todavía.</td></tr>`;
  }

  function renderCartModal() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-modal-total');
    if (!container || !totalEl) return;

    if (state.cart.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Tu carrito está vacío.</p>`;
      totalEl.textContent = '$0 USD';
      return;
    }

    let total = 0;
    container.innerHTML = state.cart.map(item => {
      total += item.price;
      return `
        <div class="cart-item-row">
          <div>
            <strong>${escapeHTML(item.raffleTitle)}</strong>
            <div style="color:var(--primary); font-family:'Orbitron',sans-serif;">Número #${item.numStr} — $${item.price}</div>
          </div>
          <button class="btn-xs btn-del" onclick="app.removeFromCart('${item.raffleId}', '${item.numStr}')">Quitar</button>
        </div>
      `;
    }).join('');

    totalEl.textContent = `$${total} USD`;
  }

  function renderUserPanel() {
    const user = getCurrentUser();
    if (!user) return;
    let res = 0, paid = 0, won = 0, spent = 0, rows = '';

    state.raffles.forEach(r => {
      Object.entries(r.tickets).forEach(([numStr, t]) => {
        if (t.userId === user.id) {
          const isWon = r.winnerNumber === numStr;
          if (t.status === 'reserved') res++;
          if (t.status === 'paid') { paid++; spent += r.price; }
          if (isWon) won++;

          rows += `
            <tr>
              <td><strong>${escapeHTML(r.title)}</strong></td>
              <td>#${numStr}</td>
              <td>$${r.price}</td>
              <td><span class="badge-status ${t.status === 'paid' ? 'status-paid' : 'status-reserved'}">${t.status.toUpperCase()}</span></td>
              <td>${isWon ? '🏆 ¡GANADOR!' : (r.winnerNumber ? `Ganó #${r.winnerNumber}` : 'En curso')}</td>
              <td>${escapeHTML(t.updatedAt)}</td>
            </tr>
          `;
        }
      });
    });

    document.getElementById('user-stat-reserved').textContent = res;
    document.getElementById('user-stat-paid').textContent = paid;
    document.getElementById('user-stat-won').textContent = won;
    document.getElementById('user-stat-spent').textContent = `$${spent}`;
    document.getElementById('user-history-tbody').innerHTML = rows || `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Sin participaciones registradas.</td></tr>`;
  }

  function renderAdminPanel() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;

    let revenue = 0, sold = 0, pending = 0, approvals = '';

    state.raffles.forEach(r => {
      Object.entries(r.tickets).forEach(([numStr, t]) => {
        if (t.status === 'paid') { sold++; revenue += r.price; }
        else if (t.status === 'reserved') {
          pending++;
          approvals += `
            <tr>
              <td>${escapeHTML(r.title)}</td>
              <td><strong>#${numStr}</strong></td>
              <td>${escapeHTML(t.userName)}</td>
              <td>${escapeHTML(t.userEmail)}</td>
              <td>$${r.price}</td>
              <td class="action-group">
                <button class="btn-xs btn-approve" onclick="app.approveTicketPayment('${r.id}', '${numStr}')">Aceptar</button>
                <button class="btn-xs btn-del" onclick="app.releaseTicketReservation('${r.id}', '${numStr}')">Liberar</button>
              </td>
            </tr>
          `;
        }
      });
    });

    document.getElementById('admin-stat-revenue').textContent = `$${revenue}`;
    document.getElementById('admin-stat-sold').textContent = sold;
    document.getElementById('admin-stat-pending').textContent = pending;
    document.getElementById('admin-stat-users').textContent = state.users.length;

    document.getElementById('admin-raffles-tbody').innerHTML = state.raffles.map(r => `
      <tr>
        <td><strong>${escapeHTML(r.title)}</strong></td>
        <td>${r.isVip ? '⭐ VIP' : 'Estándar'}</td>
        <td>${r.totalNumbers}</td>
        <td>$${r.price}</td>
        <td class="action-group">
          <button class="btn-xs btn-del" onclick="app.deleteRaffle('${r.id}')">Borrar</button>
        </td>
      </tr>
    `).join('');

    document.getElementById('admin-approvals-tbody').innerHTML = approvals || `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No hay reservas pendientes.</td></tr>`;

    document.getElementById('admin-users-tbody').innerHTML = state.users.map(u => `
      <tr>
        <td><strong>${escapeHTML(u.name)}</strong></td>
        <td>${escapeHTML(u.email)}</td>
        <td style="text-transform:capitalize;">${escapeHTML(u.gender)}</td>
        <td><span class="role-tag">${escapeHTML(u.role)}</span></td>
        <td><span class="badge-status ${u.status === 'activo' ? 'status-paid' : 'status-suspended'}">${u.status.toUpperCase()}</span></td>
        <td class="action-group">
          <button class="btn-xs btn-edit" onclick="app.openEditUserModal('${u.id}')">Editar</button>
          ${u.role !== 'admin' ? `
            <button class="btn-xs btn-warn" onclick="app.toggleSuspendUser('${u.id}')">${u.status === 'activo' ? 'Suspender' : 'Activar'}</button>
            <button class="btn-xs btn-del" onclick="app.deleteUser('${u.id}')">Borrar</button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  }

  function renderAll() {
    renderHeader();
    renderVitrina();
    renderHistory();
    renderUserPanel();
    renderAdminPanel();
    renderCartModal();
  }

  document.addEventListener('DOMContentLoaded', renderAll);

  return {
    navigate, openAuthModal, closeAuthModal, switchAuthMode, handleRegister, handleLogin, logout,
    selectRaffle, handleTicketClick, openCartModal, closeCartModal, removeFromCart, checkoutCartToWhatsApp,
    switchAdminTab, createRaffle, deleteRaffle, approveTicketPayment, releaseTicketReservation,
    openEditUserModal, closeEditUserModal, saveEditedUser, toggleSuspendUser, deleteUser
  };
})();