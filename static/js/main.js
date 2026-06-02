// Variables globales para el estado de la reserva
let selectedDate = '';
let selectedSlot = '';

// Al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha minima en el input
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

/**
 * Muestra una notificación Toast
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Asignar icono según tipo
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    // Trigger reflow
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

/**
 * Cambia la sección visible en la UI.
 */
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Desactivar links
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    
    // Mostrar la seleccionada
    document.getElementById(sectionId).classList.add('active');
    
    // Activar el link correspondiente
    const activeLink = Array.from(document.querySelectorAll('.nav-links a'))
                            .find(a => a.getAttribute('onclick').includes(sectionId));
    if (activeLink) activeLink.classList.add('active');

    // Recargar horarios si volvemos a la vista de reserva
    if (sectionId === 'home' && selectedDate) {
        cargarHorarios(selectedDate);
    }

    // Cerrar sidebar en móvil después de navegar
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

/**
 * Maneja el inicio de sesión
 */
async function handleLogin(e) {
    e.preventDefault();
    const mail = document.getElementById('login-mail').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mail, password })
        });
        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast("¡Inicio de sesión exitoso!", "success");
            updateAuthUI();
            showSection('home');
        } else {
            showToast(data.message, "error");
        }
    } catch (err) {
        showToast("Error de conexión", "error");
    }
}

/**
 * Maneja el registro
 */
async function handleRegister(e) {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const apellido = document.getElementById('reg-apellido').value;
    const dni = document.getElementById('reg-dni').value;
    const mail = document.getElementById('reg-mail').value;
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellido, dni, mail, password })
        });
        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast("¡Cuenta creada exitosamente!", "success");
            updateAuthUI();
            showSection('home');
        } else {
            showToast(data.message, "error");
        }
    } catch (err) {
        showToast("Error de conexión", "error");
    }
}

/**
 * Llama al backend para obtener horarios ocupados y disponibles.
 */
async function cargarHorarios(fecha) {
    const container = document.getElementById('slots-container');
    container.innerHTML = '<p class="info-text">Cargando horarios...</p>';

    try {
        const response = await fetch(`/api/horarios?fecha=${fecha}`);
        const data = await response.json();
        
        container.innerHTML = ''; // Limpiar

        if (data.todos.length === 0) {
            container.innerHTML = '<p class="info-text">No hay horarios disponibles para esta fecha.</p>';
            return;
        }

        data.todos.forEach(hora => {
            const isOccupied = data.ocupados.includes(hora);
            const slotDiv = document.createElement('div');
            slotDiv.className = `slot ${isOccupied ? 'occupied' : ''}`;
            slotDiv.innerText = hora;
            
            if (!isOccupied) {
                slotDiv.onclick = () => openModal(hora);
            }
            
            container.appendChild(slotDiv);
        });
    } catch (error) {
        console.error('Error al cargar horarios:', error);
        container.innerHTML = '<p class="info-text">Error al cargar datos. Asegúrate de que el servidor esté corriendo.</p>';
    }
}

/**
 * Abre el modal para ingresar datos de reserva.
 */
function openModal(hora) {
    // Verificar si hay sesión iniciada antes de continuar
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showToast("Debes iniciar sesión para sacar un turno.", "error");
        showSection('auth');
        return;
    }

    selectedSlot = hora;
    document.getElementById('info-reserva-p').innerText = `Vas a reservar el día ${selectedDate} a las ${hora} hs.`;
    
    // Autocompletar y bloquear edicion
    const user = JSON.parse(userStr);
    const nombreInput = document.getElementById('nombre-input');
    const dniInput = document.getElementById('dni-input');
    
    nombreInput.value = user.nombre + ' ' + user.apellido;
    dniInput.value = user.dni;
    
    nombreInput.readOnly = true;
    dniInput.readOnly = true;
    
    // Cambiar estilo para que parezca de solo lectura
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
 * Envía la reserva al backend.
 */
async function confirmarReserva() {
    const nombre = document.getElementById('nombre-input').value;
    const dni = document.getElementById('dni-input').value;

    if (!nombre || !dni) {
        showToast("Por favor completa tu nombre y DNI.", "error");
        return;
    }

    try {
        const response = await fetch('/api/reservar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha: selectedDate,
                hora: selectedSlot,
                nombre: nombre,
                dni: dni
            })
        });

        const result = await response.json();
        if (result.success) {
            showToast("¡Turno reservado con éxito!", "success");
            closeModal();
            cargarHorarios(selectedDate); // Recargar grilla
        } else {
            showToast("Error: " + result.message, "error");
        }
    } catch (error) {
        showToast("Hubo un problema con la reserva.", "error");
    }
}

/**
 * Consulta turnos por DNI.
 */
async function buscarTurnos() {
    const dni = document.getElementById('consulta-dni').value;
    const container = document.getElementById('resultados-consulta');
    
    if (!dni) {
        showToast("Ingresa un DNI.", "error");
        return;
    }

    try {
        const response = await fetch(`/api/consultar?dni=${dni}`);
        const data = await response.json();
        
        container.innerHTML = '';

        if (data.length === 0) {
            container.innerHTML = '<p>No se encontraron turnos para este DNI.</p>';
            return;
        }

        data.forEach(t => {
            const card = document.createElement('div');
            card.className = 'turno-result-card';
            card.innerHTML = `
                <div>
                    <strong>${t.fecha}</strong> - ${t.hora} hs
                </div>
                <button class="btn btn-secondary" onclick="cancelarTurno('${t.fecha}', '${t.hora}', '${dni}')">Cancelar</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        showToast("Error al consultar.", "error");
    }
}

/**
 * Cancela un turno.
 */
async function cancelarTurno(fecha, hora, dni) {
    if (!confirm(`¿Estás seguro de cancelar el turno del ${fecha} a las ${hora}?`)) return;

    try {
        const response = await fetch('/api/cancelar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, hora, dni })
        });

        const result = await response.json();
        if (result.success) {
            showToast("Turno cancelado con éxito.", "success");
            buscarTurnos(); // Refrescar lista
            
            // Si la fecha cancelada es la que estamos viendo actualmente en la pestaña de reserva, actualizamos la grilla
            if (selectedDate === fecha) {
                cargarHorarios(selectedDate);
            }
        } else {
            showToast(result.message, "error");
        }
    } catch (error) {
        showToast("Error al cancelar.", "error");
    }
}

/**
 * Abre/cierra el submenú desplegable de Ayuda en el sidebar.
 */
function toggleAyudaMenu(e) {
    e.preventDefault();
    const item = e.currentTarget.closest('.nav-dropdown');
    item.classList.toggle('open');
}

/**
 * Navega a la sección de Ayuda y abre el FAQ correspondiente al ítem clickeado.
 */
function showFaq(faqId) {
    showSection('ayuda');

    // Cerrar todos los details primero
    document.querySelectorAll('.faq-item').forEach(d => d.removeAttribute('open'));

    // Abrir el seleccionado
    const target = document.getElementById(faqId);
    if (target) {
        target.setAttribute('open', '');
        // Scroll suave hacia la pregunta
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

