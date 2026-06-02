// Variables globales para el estado de la reserva
let selectedDate = '';
let selectedSlot = '';

// Horarios disponibles por defecto (simulados)
const HORARIOS_DISPONIBLES = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

// ─── Utilidades de localStorage ───────────────────────────────────────────────

function getUsers() {
    return JSON.parse(localStorage.getItem('usuarios') || '[]');
}

function saveUsers(users) {
    localStorage.setItem('usuarios', JSON.stringify(users));
}

function getTurnos() {
    return JSON.parse(localStorage.getItem('turnos') || '[]');
}

function saveTurnos(turnos) {
    localStorage.setItem('turnos', JSON.stringify(turnos));
}

// ─── Al cargar el documento ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha mínima en el input (hoy)
    const dateInput = document.getElementById('fecha-turno');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }

    // Escuchar cambio de fecha
    const datePicker = document.getElementById('fecha-turno');
    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            selectedDate = e.target.value;
            cargarHorarios(selectedDate);
        });
    }

    // Lógica del menú hamburguesa
    const menuOpen = document.getElementById('mobile-menu-open');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
    };

    if (menuOpen) menuOpen.addEventListener('click', toggleSidebar);
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);

    // Cerrar menú al hacer clic fuera (en móvil)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            !menuOpen.contains(e.target) &&
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });

    // Inicializar UI de usuario si está logueado
    updateAuthUI();
});

// ─── Auth UI ──────────────────────────────────────────────────────────────────

/**
 * Actualiza la UI superior dependiendo de si hay un usuario logueado o no
 */
function updateAuthUI() {
    const greetingContainer = document.getElementById('user-greeting');
    if (!greetingContainer) return;

    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        greetingContainer.innerHTML = `Hola, <strong>${user.nombre} ${user.apellido}</strong> | <a href="#" onclick="logout()">Cerrar sesión</a>`;
    } else {
        greetingContainer.innerHTML = `<a href="#" onclick="showSection('auth')">Ingresá</a> | <a href="#" onclick="showAuthMode('register')">Creá tu cuenta</a>`;
    }
}

/**
 * Cierra la sesión
 */
function logout() {
    localStorage.removeItem('user');
    showToast("Sesión cerrada", "info");
    updateAuthUI();
    showSection('home');
}

/**
 * Cambia entre formulario de login y registro
 */
function showAuthMode(mode) {
    showSection('auth');
    if (mode === 'register') {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('register-container').style.display = 'block';
    } else {
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('register-container').style.display = 'none';
    }
}

// ─── Toasts ───────────────────────────────────────────────────────────────────

/**
 * Muestra una notificación Toast
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    void toast.offsetWidth; // Trigger reflow
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ─── Navegación ───────────────────────────────────────────────────────────────

/**
 * Cambia la sección visible en la UI.
 */
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    const activeLink = Array.from(document.querySelectorAll('.nav-links a'))
        .find(a => a.getAttribute('onclick') && a.getAttribute('onclick').includes(sectionId));
    if (activeLink) activeLink.classList.add('active');

    if (sectionId === 'turnos' && selectedDate) {
        cargarHorarios(selectedDate);
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// ─── Login / Registro (localStorage) ─────────────────────────────────────────

/**
 * Maneja el inicio de sesión (sin backend)
 */
function handleLogin(e) {
    e.preventDefault();
    const mail = document.getElementById('login-mail').value.trim();
    const password = document.getElementById('login-password').value;

    const users = getUsers();
    const user = users.find(u => u.mail === mail && u.password === password);

    if (user) {
        // Guardar sin la contraseña en la sesión activa
        const { password: _, ...safeUser } = user;
        localStorage.setItem('user', JSON.stringify(safeUser));
        showToast("¡Inicio de sesión exitoso!", "success");
        updateAuthUI();
        showSection('home');
    } else {
        showToast("Email o contraseña incorrectos.", "error");
    }
}

/**
 * Maneja el registro (sin backend)
 */
function handleRegister(e) {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value.trim();
    const apellido = document.getElementById('reg-apellido').value.trim();
    const dni = document.getElementById('reg-dni').value.trim();
    const mail = document.getElementById('reg-mail').value.trim();
    const password = document.getElementById('reg-password').value;

    const users = getUsers();

    // Verificar si el email ya existe
    if (users.find(u => u.mail === mail)) {
        showToast("Ya existe una cuenta con ese email.", "error");
        return;
    }

    // Verificar si el DNI ya existe
    if (users.find(u => u.dni === dni)) {
        showToast("Ya existe una cuenta con ese DNI.", "error");
        return;
    }

    const newUser = { nombre, apellido, dni, mail, password };
    users.push(newUser);
    saveUsers(users);

    // Iniciar sesión automáticamente (sin contraseña en sesión)
    const { password: _, ...safeUser } = newUser;
    localStorage.setItem('user', JSON.stringify(safeUser));
    showToast("¡Cuenta creada exitosamente!", "success");
    updateAuthUI();
    showSection('home');
}

// ─── Turnos ───────────────────────────────────────────────────────────────────

/**
 * Carga los horarios disponibles para una fecha dada (sin backend).
 */
function cargarHorarios(fecha) {
    const container = document.getElementById('slots-container');
    container.innerHTML = '<p class="info-text">Cargando horarios...</p>';

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
        const turnos = getTurnos();
        const ocupados = turnos
            .filter(t => t.fecha === fecha)
            .map(t => t.hora);

        container.innerHTML = '';

        if (HORARIOS_DISPONIBLES.length === 0) {
            container.innerHTML = '<p class="info-text">No hay horarios disponibles para esta fecha.</p>';
            return;
        }

        HORARIOS_DISPONIBLES.forEach(hora => {
            const isOccupied = ocupados.includes(hora);
            const slotDiv = document.createElement('div');
            slotDiv.className = `slot ${isOccupied ? 'occupied' : ''}`;
            slotDiv.innerText = hora;

            if (!isOccupied) {
                slotDiv.onclick = () => openModal(hora);
            }

            container.appendChild(slotDiv);
        });
    }, 200);
}

/**
 * Abre el modal para ingresar datos de reserva.
 */
function openModal(hora) {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showToast("Debes iniciar sesión para sacar un turno.", "error");
        showSection('auth');
        return;
    }

    selectedSlot = hora;
    document.getElementById('info-reserva-p').innerText = `Vas a reservar el día ${selectedDate} a las ${hora} hs.`;

    const user = JSON.parse(userStr);
    const nombreInput = document.getElementById('nombre-input');
    const dniInput = document.getElementById('dni-input');

    nombreInput.value = user.nombre + ' ' + user.apellido;
    dniInput.value = user.dni;
    nombreInput.readOnly = true;
    dniInput.readOnly = true;
    nombreInput.style.backgroundColor = '#f5f5f5';
    dniInput.style.backgroundColor = '#f5f5f5';

    document.getElementById('reserva-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('reserva-modal').style.display = 'none';
    document.getElementById('nombre-input').value = '';
    document.getElementById('dni-input').value = '';
}

/**
 * Confirma y guarda la reserva en localStorage.
 */
function confirmarReserva() {
    const nombre = document.getElementById('nombre-input').value;
    const dni = document.getElementById('dni-input').value;

    if (!nombre || !dni) {
        showToast("Por favor completa tu nombre y DNI.", "error");
        return;
    }

    const turnos = getTurnos();

    // Verificar si ya existe ese horario reservado
    const yaReservado = turnos.find(t => t.fecha === selectedDate && t.hora === selectedSlot);
    if (yaReservado) {
        showToast("Ese horario ya fue reservado.", "error");
        closeModal();
        cargarHorarios(selectedDate);
        return;
    }

    // Verificar si el DNI ya tiene turno ese día
    const turnoDelDia = turnos.find(t => t.fecha === selectedDate && t.dni === dni);
    if (turnoDelDia) {
        showToast("Ya tenés un turno para ese día.", "error");
        return;
    }

    turnos.push({ fecha: selectedDate, hora: selectedSlot, nombre, dni });
    saveTurnos(turnos);

    showToast("¡Turno reservado con éxito!", "success");
    closeModal();
    cargarHorarios(selectedDate);
}

/**
 * Consulta turnos por DNI (desde localStorage).
 */
function buscarTurnos() {
    const dni = document.getElementById('consulta-dni').value.trim();
    const container = document.getElementById('resultados-consulta');

    if (!dni) {
        showToast("Ingresa un DNI.", "error");
        return;
    }

    const turnos = getTurnos();
    const resultados = turnos.filter(t => t.dni === dni);

    container.innerHTML = '';

    if (resultados.length === 0) {
        container.innerHTML = '<p>No se encontraron turnos para este DNI.</p>';
        return;
    }

    resultados.forEach(t => {
        const card = document.createElement('div');
        card.className = 'turno-result-card';
        card.innerHTML = `
            <div>
                <strong>${t.fecha}</strong> - ${t.hora} hs &nbsp;|&nbsp; ${t.nombre}
            </div>
            <button class="btn btn-secondary" onclick="cancelarTurno('${t.fecha}', '${t.hora}', '${dni}')">Cancelar</button>
        `;
        container.appendChild(card);
    });
}

/**
 * Cancela un turno (en localStorage).
 */
function cancelarTurno(fecha, hora, dni) {
    if (!confirm(`¿Estás seguro de cancelar el turno del ${fecha} a las ${hora}?`)) return;

    let turnos = getTurnos();
    const antes = turnos.length;
    turnos = turnos.filter(t => !(t.fecha === fecha && t.hora === hora && t.dni === dni));

    if (turnos.length < antes) {
        saveTurnos(turnos);
        showToast("Turno cancelado con éxito.", "success");
        buscarTurnos();
        if (selectedDate === fecha) {
            cargarHorarios(selectedDate);
        }
    } else {
        showToast("No se pudo cancelar el turno.", "error");
    }
}

// ─── Menú desplegable Ayuda ───────────────────────────────────────────────────

/**
 * Abre/cierra el submenú desplegable de Ayuda en el sidebar.
 */
function toggleAyudaMenu(e) {
    e.preventDefault();
    const item = e.currentTarget.closest('.nav-dropdown');
    item.classList.toggle('open');
}

/**
 * Navega a la sección de Ayuda y abre el FAQ correspondiente.
 */
function showFaq(faqId) {
    showSection('ayuda');

    document.querySelectorAll('.faq-item').forEach(d => d.removeAttribute('open'));

    const target = document.getElementById(faqId);
    if (target) {
        target.setAttribute('open', '');
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}
