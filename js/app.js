// Clave para LocalStorage
const STORAGE_KEY = 'kanban_tasks_data';

// Estado inicial de la aplicación por defecto
let defaultTasks = [
    { id: 1, title: "Wireframe Bootstrap", desc: "Diseñar la estructura de bloques en escala de grises.", date: "2024-10-12", priority: "Media", status: "backlog" },
    { id: 2, title: "Pruebas de Integración", desc: "Verificar flujo completo de creación, edición y eliminación.", date: "2024-10-28", priority: "Alta", status: "backlog" },
    { id: 3, title: "Componentes UI Tarjetas", desc: "Diseñar e implementar tarjetas de tareas con variantes.", date: "2024-10-15", priority: "Alta", status: "todo" },
    { id: 4, title: "Estilos Bootstrap", desc: "Integrar CDN, definir variables CSS y aplicar paleta de colores.", date: "2024-10-18", priority: "Media", status: "todo" },
    { id: 5, title: "Sistema de Filtros", desc: "Implementar filtrado por estado, prioridad y búsqueda.", date: "2024-10-22", priority: "Baja", status: "todo" },
    { id: 6, title: "Validar Formularios", desc: "Agregar validación de campos requeridos con mensajes.", date: "2024-10-14", priority: "Alta", status: "inprogress" },
    { id: 7, title: "Setup Inicial del Proyecto", desc: "Configurar el repositorio, instalar dependencias.", date: "2024-10-08", priority: "Alta", status: "done" },
    { id: 8, title: "Responsive Móvil", desc: "Adaptar el tablero Kanban a dispositivos móviles.", date: "2024-10-20", priority: "Media", status: "done" },
    { id: 9, title: "Documentación Técnica", desc: "Escribir README con instrucciones de instalación.", date: "2024-10-25", priority: "Baja", status: "done" }
];

// Intentar cargar tareas desde LocalStorage, o usar las default
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultTasks;

// Función para guardar en LocalStorage
function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Función Helper para prevenir XSS sanitizando texto
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Mapeo de configuraciones para estilos
const statusConfig = {
    'backlog': { label: 'Backlog', color: 'bg-secondary' },
    'todo': { label: 'Por Hacer', color: 'bg-primary' },
    'inprogress': { label: 'En Proceso', color: 'bg-warning text-dark' },
    'done': { label: 'Finalizado', color: 'bg-success' }
};

const priorityConfig = {
    'Baja': { class: 'priority-baja', dot: '#198754' }, // Verde
    'Media': { class: 'priority-media', dot: '#ffc107' }, // Amarillo
    'Alta': { class: 'priority-alta', dot: '#dc3545' }   // Rojo
};

// Elementos del DOM
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
const taskForm = document.getElementById('taskForm');
let taskIdToDelete = null; // Variable para almacenar qué tarea se va a borrar

// Función principal para renderizar el tablero
function renderBoard() {
    // Limpiar columnas
    Object.keys(statusConfig).forEach(status => {
        document.getElementById(`col-${status}`).innerHTML = '';
    });

    // Contadores
    let counts = { backlog: 0, todo: 0, inprogress: 0, done: 0 };
    const today = new Date();
    today.setHours(0,0,0,0); // Normalizar a medianoche para comparar solo fechas

    tasks.forEach(task => {
        counts[task.status]++;

        // Determinar si está vencida
        const taskDateObj = new Date(task.date);
        const isOverdue = taskDateObj < today && task.status !== 'done';
        const dateColorClass = isOverdue ? 'text-danger' : 'text-secondary';
        const overdueText = isOverdue ? ' · Vencida' : '';
        const dateIcon = isOverdue ? 'bi-calendar-x' : 'bi-calendar2-event';

        // Formatear fecha (dd/mm/yyyy)
        const formattedDate = taskDateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Prevenir inyección de código limpiando título y descripción
        const safeTitle = escapeHTML(task.title);
        const safeDesc = escapeHTML(task.desc);

        // Crear HTML de la tarjeta
        const cardHtml = `
                    <div class="kanban-card p-3 ${task.status === 'done' ? 'opacity-75' : ''}">
                        <!-- Cabecera de tarjeta (Etiqueta y Menú 3 puntos) -->
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge ${statusConfig[task.status].color} tag-badge">${statusConfig[task.status].label}</span>

                            <div class="dropdown">
                                <button class="btn btn-link btn-options dropdown-toggle-custom" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="bi bi-three-dots"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm" style="font-size: 0.85rem;">
                                    <li><a class="dropdown-item" href="#" onclick="editTask(${task.id}); return false;"><i class="bi bi-pencil me-2"></i>Editar</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteTask(${task.id}); return false;"><i class="bi bi-trash me-2"></i>Eliminar</a></li>
                                </ul>
                            </div>
                        </div>

                        <!-- Contenido -->
                        <h6 class="fw-bold mb-2 text-dark">${safeTitle}</h6>
                        <p class="text-muted small mb-3 lh-sm">${safeDesc}</p>

                        <!-- Footer de la tarjeta -->
                        <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top border-light">
                            <span class="${dateColorClass} date-text d-flex align-items-center gap-1">
                                <i class="bi ${dateIcon}"></i> ${formattedDate}${overdueText}
                            </span>
                            <span class="priority-badge ${priorityConfig[task.priority].class}">
                                <i class="bi bi-circle-fill" style="font-size: 0.4rem; color: ${priorityConfig[task.priority].dot}"></i> ${task.priority}
                            </span>
                        </div>
                    </div>
                `;

        document.getElementById(`col-${task.status}`).insertAdjacentHTML('beforeend', cardHtml);
    });

    updateProgress(counts);
}

// Actualizar barras y textos de progreso
function updateProgress(counts) {
    const totalTasks = tasks.length;
    const doneTasks = counts.done;
    const percentage = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

    // Textos superiores
    document.getElementById('progress-text').textContent = `${doneTasks} de ${totalTasks} tareas completadas`;
    document.getElementById('progress-percentage').textContent = `${percentage}%`;

    // Barra
    document.getElementById('main-progress-bar').style.width = `${percentage}%`;
    document.getElementById('main-progress-bar').setAttribute('aria-valuenow', percentage);

    // Contadores inferiores y badges de columnas
    Object.keys(counts).forEach(status => {
        document.getElementById(`count-${status}`).textContent = counts[status];
        document.getElementById(`badge-${status}`).textContent = counts[status];
    });
}

// Abrir modal para nueva tarea
function openNewTaskModal(defaultStatus = 'backlog') {
    document.getElementById('taskModalLabel').textContent = 'Nueva Tarea';
    taskForm.reset();
    taskForm.classList.remove('was-validated'); // Reiniciar validación visual
    document.getElementById('taskId').value = '';
    document.getElementById('taskStatus').value = defaultStatus;

    // Fecha por defecto: Hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('taskDate').value = today;

    taskModal.show();
}

// Editar tarea
window.editTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        document.getElementById('taskModalLabel').textContent = 'Editar Tarea';
        taskForm.classList.remove('was-validated'); // Reiniciar validación visual
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDesc').value = task.desc;
        document.getElementById('taskDate').value = task.date;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskStatus').value = task.status;
        taskModal.show();
    }
}

// Preparar tarea para eliminar y abrir modal
window.deleteTask = function(id) {
    taskIdToDelete = id; // Guardamos el ID de la tarea seleccionada
    deleteConfirmModal.show(); // Mostramos el modal de Bootstrap
}

// Ejecutar eliminación cuando el usuario confirma en el modal
document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
    if (taskIdToDelete !== null) {
        // Filtramos el array para quitar la tarea
        tasks = tasks.filter(t => t.id !== taskIdToDelete);
        saveToLocalStorage(); // Actualizar storage
        renderBoard(); // Volvemos a dibujar la pantalla
        deleteConfirmModal.hide(); // Cerramos el modal
        taskIdToDelete = null; // Limpiamos la variable
    }
});

// Manejar envío de formulario (Crear o Actualizar)
taskForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // Validación nativa de HTML5 mediante Bootstrap
    if (!taskForm.checkValidity()) {
        e.stopPropagation();
        taskForm.classList.add('was-validated');
        return;
    }

    const id = document.getElementById('taskId').value;
    // Quitamos espacios en blanco al inicio y final
    const newTitle = document.getElementById('taskTitle').value.trim();
    const newDesc = document.getElementById('taskDesc').value.trim();

    // Si después del trim quedó vacío, no procesamos (evitar tareas con puros espacios)
    if (newTitle === '' || newDesc === '') {
        taskForm.classList.add('was-validated');
        return;
    }

    const newTask = {
        title: newTitle,
        desc: newDesc,
        date: document.getElementById('taskDate').value,
        priority: document.getElementById('taskPriority').value,
        status: document.getElementById('taskStatus').value
    };

    if (id) {
        // Editar existente
        const index = tasks.findIndex(t => t.id === parseInt(id));
        if(index !== -1) {
            tasks[index] = { ...tasks[index], ...newTask };
        }
    } else {
        // Crear nueva
        newTask.id = Date.now(); // ID único temporal
        tasks.push(newTask);
    }

    saveToLocalStorage(); // Guardar en el navegador
    taskModal.hide();
    renderBoard();
});

// Inicializar renderizado al cargar
document.addEventListener('DOMContentLoaded', renderBoard);