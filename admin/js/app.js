(function () {
    'use strict';

    const ENV = window.ENV || {};
    const API_BASE_URL = ENV.API_BASE_URL || 'http://localhost:3000';

    let currentUser = null;
    let currentSection = 'dashboard';
    let kpis = [];
    let usuarios = [];
    let eventos = [];
    let comisiones = [];
    let alertas = [];
    let configuracion = null;
    let logs = [];
    let liquidaciones = [];
    let filtroRol = '';
    let eventoSeleccionado = null;

    function showError(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
        }
    }

    function hideError(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            el.style.display = 'none';
        }
    }

    function setButtonLoading(buttonId, spinnerId, textId, loading) {
        const button = document.getElementById(buttonId);
        const spinner = document.getElementById(spinnerId);
        const text = document.getElementById(textId);
        if (button) button.disabled = loading;
        if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
        if (text) text.style.display = loading ? 'none' : 'inline';
    }

    async function login(email, password) {
        setButtonLoading('loginButton', 'loginSpinner', 'loginButtonText', true);
        hideError('loginError');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.mensaje || data.error || 'Error de autenticación');
            }

            localStorage.setItem('admin_token', data.token);
            currentUser = data.usuario;

            if (currentUser.rol !== 'super_admin') {
                throw new Error('No tienes permisos de super administrador');
            }

            window.location.href = 'index.html';
        } catch (error) {
            showError('loginError', error.message);
            setButtonLoading('loginButton', 'loginSpinner', 'loginButtonText', false);
        }
    }

    function checkAuth() {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }

        const userData = localStorage.getItem('admin_user');
        if (userData) {
            currentUser = JSON.parse(userData);
            if (currentUser.rol !== 'super_admin') {
                window.location.href = 'login.html';
                return false;
            }
        }

        return true;
    }

    async function apiRequest(path, options = {}) {
        const token = localStorage.getItem('admin_token');

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            let message = 'Error en la petición';
            try {
                const data = await response.json();
                message = data.mensaje || data.error || message;
            } catch (e) {
                // ignore
            }
            throw new Error(message);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    async function loadDashboard() {
        const content = document.getElementById('sectionContent');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p class="loading-text">Cargando métricas...</p></div>';

        try {
            const [kpisData, eventosData, usuariosData] = await Promise.all([
                apiRequest('/api/admin/kpis'),
                apiRequest('/api/admin/eventos'),
                apiRequest('/api/admin/usuarios'),
            ]);

            kpis = kpisData.kpis || [];
            eventos = eventosData.eventos || [];
            usuarios = usuariosData.usuarios || [];

            renderDashboard();
        } catch (error) {
            content.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><p class="empty-state-text">${error.message}</p></div>`;
        }
    }

    function renderDashboard() {
        const content = document.getElementById('sectionContent');

        let kpisHtml = '<div class="kpi-grid">';
        kpis.forEach(kpi => {
            kpisHtml += `
                <div class="kpi-card">
                    <div class="kpi-icon">${kpi.icono}</div>
                    <div class="kpi-title">${kpi.titulo}</div>
                    <div class="kpi-value">${kpi.valor}</div>
                    ${kpi.variacion ? `<div class="kpi-change">${kpi.variacion}</div>` : ''}
                </div>
            `;
        });
        kpisHtml += '</div>';

        const eventosActivos = eventos.filter(e => e.estado === 'activo').length;
        const eventosFinalizados = eventos.filter(e => e.estado === 'finalizado').length;
        const eventosCancelados = eventos.filter(e => e.estado === 'cancelado').length;
        const totalUsuarios = usuarios.length;
        const totalArtistas = usuarios.filter(u => u.rol === 'artista').length;

        let resumenHtml = `
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">Resumen Rápido</h3>
                </div>
                <div style="padding: 20px;">
                    <div class="kpi-grid" style="margin-bottom: 0;">
                        <div class="kpi-card">
                            <div class="kpi-icon">👥</div>
                            <div class="kpi-title">Total Usuarios</div>
                            <div class="kpi-value">${totalUsuarios}</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon">🎵</div>
                            <div class="kpi-title">Artistas</div>
                            <div class="kpi-value">${totalArtistas}</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon">✅</div>
                            <div class="kpi-title">Eventos Activos</div>
                            <div class="kpi-value">${eventosActivos}</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon">🏁</div>
                            <div class="kpi-title">Finalizados</div>
                            <div class="kpi-value">${eventosFinalizados}</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon">❌</div>
                            <div class="kpi-title">Cancelados</div>
                            <div class="kpi-value">${eventosCancelados}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = kpisHtml + resumenHtml;
    }

    async function loadEventos() {
        const content = document.getElementById('sectionContent');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p class="loading-text">Cargando eventos...</p></div>';

        try {
            const data = await apiRequest('/api/admin/eventos');
            eventos = data.eventos || [];
            renderEventos();
        } catch (error) {
            content.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><p class="empty-state-text">${error.message}</p></div>`;
        }
    }

    function renderEventos() {
        const content = document.getElementById('sectionContent');

        if (eventos.length === 0) {
            content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Sin eventos</div><p class="empty-state-text">No hay eventos registrados</p></div>';
            return;
        }

        let rows = '';
        eventos.forEach(evento => {
            const badgeClass = `badge-${evento.estado}`;
            rows += `
                <tr>
                    <td><strong>${evento.titulo}</strong></td>
                    <td>${evento.organizador_nombre || 'N/A'}</td>
                    <td>${new Date(evento.fecha_evento).toLocaleDateString('es-ES')}</td>
                    <td><span class="badge ${badgeClass}">${evento.estado}</span></td>
                    <td>${evento.entradas_vendidas || 0}</td>
                    <td>
                        <div class="actions">
                            <button class="action-btn" onclick="app.verAforo('${evento.id}')" title="Aforo">👁️</button>
                            <button class="action-btn" onclick="app.destacarEvento('${evento.id}')" title="Destacar">⭐</button>
                            <button class="action-btn" onclick="app.cambiarEstadoEvento('${evento.id}')" title="Cambiar estado">🔄</button>
                            <button class="action-btn danger" onclick="app.reembolsarEvento('${evento.id}')" title="Reembolsar">💸</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">Todos los Eventos</h3>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Evento</th>
                                <th>Organizador</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Vendidas</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function loadUsuarios() {
        const content = document.getElementById('sectionContent');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p class="loading-text">Cargando usuarios...</p></div>';

        try {
            const data = await apiRequest('/api/admin/usuarios');
            usuarios = data.usuarios || [];
            renderUsuarios();
        } catch (error) {
            content.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><p class="empty-state-text">${error.message}</p></div>`;
        }
    }

    function renderUsuarios() {
        const content = document.getElementById('sectionContent');

        if (usuarios.length === 0) {
            content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Sin usuarios</div><p class="empty-state-text">No hay usuarios registrados</p></div>';
            return;
        }

        const filtrados = filtroRol ? usuarios.filter(u => u.rol === filtroRol) : usuarios;

        let rows = '';
        filtrados.forEach(usuario => {
            const badgeClass = `badge-${usuario.rol}`;
            const estado = usuario.estado || 'activo';
            rows += `
                <tr>
                    <td><strong>${usuario.nombre}</strong></td>
                    <td>${usuario.email}</td>
                    <td><span class="badge ${badgeClass}">${usuario.rol}</span></td>
                    <td>${estado}</td>
                    <td>${usuario.creado_en ? new Date(usuario.creado_en).toLocaleDateString('es-ES') : 'N/A'}</td>
                    <td>
                        <div class="actions">
                            <button class="action-btn" onclick="app.cambiarRol('${usuario.id}')" title="Cambiar rol">🔄</button>
                            <button class="action-btn danger" onclick="app.bloquearUsuario('${usuario.id}')" title="Bloquear/Desbloquear">🔒</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">Todos los Usuarios</h3>
                    <select class="form-select" id="filtroRol" onchange="app.filtrarUsuarios(this.value)" style="width: auto; min-width: 180px; margin-bottom: 0;">
                        <option value="">Todos los roles</option>
                        <option value="fan">Fan</option>
                        <option value="artista">Artista</option>
                        <option value="validador">Validador</option>
                        <option value="super_admin">Super Admin</option>
                    </select>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Registro</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function filtrarUsuarios(rol) {
        filtroRol = rol;
        renderUsuarios();
    }

    async function loadFinanzas() {
        const content = document.getElementById('sectionContent');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p class="loading-text">Cargando finanzas...</p></div>';

        try {
            const [comisionesData, liquidacionesData] = await Promise.all([
                apiRequest('/api/admin/comisiones'),
                apiRequest('/api/admin/liquidaciones'),
            ]);
            comisiones = comisionesData.comisiones || [];
            liquidaciones = liquidacionesData.liquidaciones || [];
            renderFinanzas();
        } catch (error) {
            content.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><p class="empty-state-text">${error.message}</p></div>`;
        }
    }

    function renderFinanzas() {
        const content = document.getElementById('sectionContent');

        let rows = '';
        comisiones.forEach(comision => {
            const valor = comision.tipo === 'porcentaje' ? `${comision.valor}%` : `${comision.valor} €`;
            const organizador = comision.organizador_nombre ? ` (${comision.organizador_nombre})` : '';
            rows += `
                <tr>
                    <td>${comision.descripcion || 'Sin descripción'}</td>
                    <td>${comision.tipo}</td>
                    <td><strong>${valor}</strong></td>
                    <td>${organizador}</td>
                </tr>
            `;
        });

        let liquidacionesRows = '';
        (liquidaciones || []).forEach(l => {
            liquidacionesRows += `
                <tr>
                    <td>${l.organizador_nombre || 'N/A'}</td>
                    <td>${l.amount ? (l.amount / 100).toFixed(2) + ' €' : '0 €'}</td>
                    <td>${l.estado || 'pendiente'}</td>
                    <td>${l.created_at ? new Date(l.created_at).toLocaleDateString('es-ES') : 'N/A'}</td>
                </tr>
            `;
        });

        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">Comisiones Configuradas</h3>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th>Tipo</th>
                                <th>Valor</th>
                                <th>Organizador</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="4" style="text-align: center; padding: 40px;">No hay comisiones configuradas</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button class="btn btn-primary" onclick="app.crearComisionFija()">+ Comisión fija 1,20 €</button>
                <button class="btn btn-secondary" onclick="app.crearComisionPorcentaje()">+ Comisión 5%</button>
            </div>
            <div class="table-container" style="margin-top: 24px;">
                <div class="table-header">
                    <h3 class="table-title">Historial de Liquidaciones</h3>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Organizador</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>${liquidacionesRows || '<tr><td colspan="4" style="text-align: center; padding: 40px;">Sin liquidaciones</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function loadSeguridad() {
        const content = document.getElementById('sectionContent');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p class="loading-text">Cargando alertas...</p></div>';

        try {
            const [alertasData, logsData] = await Promise.all([
                apiRequest('/api/admin/fraude/alertas'),
                apiRequest('/api/admin/logs'),
            ]);
            alertas = alertasData.alertas || [];
            logs = logsData.logs || [];
            renderSeguridad();
        } catch (error) {
            content.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><p class="empty-state-text">${error.message}</p></div>`;
        }
    }

    function renderSeguridad() {
        const content = document.getElementById('sectionContent');

        const nuevas = alertas.filter(a => a.estado === 'nueva').length;
        const resueltas = alertas.filter(a => a.estado === 'resuelta').length;

        let alertasHtml = `
            <div class="alert-summary">
                <div class="alert-card">
                    <span class="alert-icon">⚠️</span>
                    <span class="alert-text">${nuevas} nuevas</span>
                </div>
                <div class="alert-card">
                    <span class="alert-icon">✅</span>
                    <span class="alert-text">${resueltas} resueltas</span>
                </div>
            </div>
        `;

        if (alertas.length === 0) {
            alertasHtml += '<div class="empty-state"><div class="empty-state-icon">🛡️</div><div class="empty-state-title">Sin alertas</div><p class="empty-state-text">No hay alertas de fraude</p></div>';
        } else {
            let rows = '';
            alertas.forEach(alerta => {
                rows += `
                    <tr>
                        <td><strong>${alerta.tipo}</strong></td>
                        <td>${alerta.descripcion}</td>
                        <td><span class="badge badge-${alerta.estado === 'nueva' ? 'cancelado' : alerta.estado === 'resuelta' ? 'activo' : 'pausado'}">${alerta.estado}</span></td>
                        <td>${new Date(alerta.created_at).toLocaleDateString('es-ES')}</td>
                    </tr>
                `;
            });

            alertasHtml += `
                <div class="table-container">
                    <div class="table-header">
                        <h3 class="table-title">Alertas de Fraude</h3>
                    </div>
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Descripción</th>
                                    <th>Estado</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        let logsHtml = '<div class="table-container" style="margin-top: 24px;"><div class="table-header"><h3 class="table-title">Logs de Auditoría</h3></div><div class="table-wrapper"><table><thead><tr><th>Acción</th><th>Usuario</th><th>Fecha</th></tr></thead><tbody>';
        (logs || []).slice(0, 50).forEach(log => {
            logsHtml += `<tr><td>${log.accion || ''}</td><td>${log.usuario_email || 'Sistema'}</td><td>${log.created_at ? new Date(log.created_at).toLocaleDateString('es-ES') : 'N/A'}</td></tr>`;
        });
        logsHtml += '</tbody></table></div></div>';

        content.innerHTML = alertasHtml + logsHtml;
    }

    async function loadConfig() {
        const content = document.getElementById('sectionContent');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p class="loading-text">Cargando configuración...</p></div>';

        try {
            const data = await apiRequest('/api/admin/ajustes');
            configuracion = data.ajustes || {};
            renderConfig();
        } catch (error) {
            content.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><p class="empty-state-text">${error.message}</p></div>`;
        }
    }

    function renderConfig() {
        const content = document.getElementById('sectionContent');
        const c = configuracion || {};

        content.innerHTML = `
            <div class="config-section">
                <h3 class="config-section-title">🏷️ Marca y experiencia</h3>
                <p class="config-section-desc">Identidad visible de la plataforma</p>
                <div class="config-grid">
                    <div class="config-item">
                        <label class="config-item-label">Nombre de la plataforma</label>
                        <input type="text" class="config-item-input" data-key="nombre_plataforma" value="${c.nombre_plataforma || 'Kroos Master'}">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Logo URL</label>
                        <input type="text" class="config-item-input" data-key="logo_url" value="${c.logo_url || ''}" placeholder="https://...">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Color principal</label>
                        <input type="color" class="config-item-input" data-key="color_principal" value="${c.color_principal || '#00FF87'}">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Email de soporte</label>
                        <input type="email" class="config-item-input" data-key="email_soporte" value="${c.email_soporte || ''}" placeholder="soporte@kroos.local">
                    </div>
                </div>
            </div>

            <div class="config-section">
                <h3 class="config-section-title">👤 Registro y acceso</h3>
                <p class="config-section-desc">Control de cuentas y sesiones</p>
                <div class="config-grid">
                    <div class="config-item">
                        <label class="config-item-label">Registro abierto</label>
                        <select class="config-item-select" data-key="registro_abierto">
                            <option value="true" ${c.registro_abierto === false ? '' : 'selected'}>Abierto</option>
                            <option value="false" ${c.registro_abierto === false ? 'selected' : ''}>Cerrado</option>
                        </select>
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Límite intentos login</label>
                        <input type="number" class="config-item-input" data-key="limite_intentos_login" value="${c.limite_intentos_login || 5}" min="1">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Duración sesión (min)</label>
                        <input type="number" class="config-item-input" data-key="duracion_sesion_minutos" value="${c.duracion_sesion_minutos || 60}" min="5">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Código acceso por evento</label>
                        <select class="config-item-select" data-key="codigo_acceso_evento_activado">
                            <option value="true" ${c.codigo_acceso_evento_activado === false ? '' : 'selected'}>Activado</option>
                            <option value="false" ${c.codigo_acceso_evento_activado === false ? 'selected' : ''}>Desactivado</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="config-section">
                <h3 class="config-section-title">💰 Finanzas</h3>
                <p class="config-section-desc">Comisiones, moneda y pagos</p>
                <div class="config-grid">
                    <div class="config-item">
                        <label class="config-item-label">Comisión por defecto (%)</label>
                        <input type="number" class="config-item-input" data-key="comision_por_defecto" value="${c.comision_por_defecto || 10}" min="0" step="0.1">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Moneda</label>
                        <input type="text" class="config-item-input" data-key="moneda" value="${c.moneda || 'EUR'}" maxlength="3">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Mínimo retiro (€)</label>
                        <input type="number" class="config-item-input" data-key="minimo_retiro" value="${c.minimo_retiro || 50}" min="0" step="1">
                    </div>
                </div>
            </div>

            <div class="config-section">
                <h3 class="config-section-title">📣 Notificaciones</h3>
                <p class="config-section-desc">Alertas y comunicaciones</p>
                <div class="config-grid">
                    <div class="config-item">
                        <label class="config-item-label">Push globales</label>
                        <select class="config-item-select" data-key="push_globales_activadas">
                            <option value="true" ${c.push_globales_activadas === false ? '' : 'selected'}>Activadas</option>
                            <option value="false" ${c.push_globales_activadas === false ? 'selected' : ''}>Desactivadas</option>
                        </select>
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Email alertas críticas</label>
                        <input type="email" class="config-item-input" data-key="email_alertas_criticas" value="${c.email_alertas_criticas || ''}" placeholder="alertas@kroos.local">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Notificar comisiones al crear</label>
                        <select class="config-item-select" data-key="notificar_comisiones_creacion">
                            <option value="true" ${c.notificar_comisiones_creacion === false ? '' : 'selected'}>Sí</option>
                            <option value="false" ${c.notificar_comisiones_creacion === false ? 'selected' : ''}>No</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="config-section">
                <h3 class="config-section-title">🛡️ Sistema</h3>
                <p class="config-section-desc">Mantenimiento, logs y límites</p>
                <div class="config-grid">
                    <div class="config-item">
                        <label class="config-item-label">Modo mantenimiento</label>
                        <select class="config-item-select" data-key="modo_mantenimiento">
                            <option value="true" ${c.modo_mantenimiento ? 'selected' : ''}>Activado</option>
                            <option value="false" ${!c.modo_mantenimiento ? 'selected' : ''}>Desactivado</option>
                        </select>
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Retención logs (días)</label>
                        <input type="number" class="config-item-input" data-key="retencion_logs_dias" value="${c.retencion_logs_dias || 90}" min="1">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Validación automática entradas</label>
                        <select class="config-item-select" data-key="validacion_automatica_entradas">
                            <option value="true" ${c.validacion_automatica_entradas === false ? '' : 'selected'}>Activada</option>
                            <option value="false" ${c.validacion_automatica_entradas === false ? 'selected' : ''}>Desactivada</option>
                        </select>
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Límite eventos por organizador</label>
                        <input type="number" class="config-item-input" data-key="limite_eventos_organizador" value="${c.limite_eventos_organizador || 10}" min="1">
                    </div>
                </div>
            </div>

            <div class="config-section">
                <h3 class="config-section-title">🌍 Visualización</h3>
                <p class="config-section-desc">Idioma, zona horaria y aforo</p>
                <div class="config-grid">
                    <div class="config-item">
                        <label class="config-item-label">Zona horaria</label>
                        <input type="text" class="config-item-input" data-key="zona_horaria" value="${c.zona_horaria || 'Europe/Madrid'}">
                    </div>
                    <div class="config-item">
                        <label class="config-item-label">Idioma por defecto</label>
                        <input type="text" class="config-item-input" data-key="idioma_default" value="${c.idioma_default || 'es'}" maxlength="5">
                    </div>
                </div>
            </div>

            <button class="btn btn-primary" onclick="app.guardarConfiguracion()">Guardar cambios</button>
        `;
    }

    async function guardarConfiguracion() {
        const payload = {};
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            let value = el.value;

            if (el.type === 'number') {
                value = Number(value);
            } else if (el.tagName === 'SELECT') {
                value = value === 'true';
            }

            payload[key] = value;
        });

        try {
            await apiRequest('/api/admin/ajustes', {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });

            alert('Configuración guardada correctamente');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function verAforo(eventoId) {
        try {
            const data = await apiRequest(`/api/admin/eventos/${eventoId}/aforo`);
            alert(`Aforo usado: ${data.usados} / ${data.total}`);
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function reembolsarEvento(eventoId) {
        const confirmacion = confirm('¿Reembolsar todas las entradas de este evento?');
        if (!confirmacion) return;

        try {
            await apiRequest(`/api/admin/eventos/${eventoId}/reembolsos`, { method: 'POST' });
            alert('Reembolsos procesados');
            loadEventos();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    function filtrarUsuarios(rol) {
        filtroRol = rol;
        renderUsuarios();
    }

    async function loadAuditoria() {
        const content = document.getElementById('sectionContent');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p class="loading-text">Cargando auditoría...</p></div>';

        try {
            const data = await apiRequest('/api/admin/logs?limite=100');
            logs = data.logs || [];
            renderAuditoria();
        } catch (error) {
            content.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><p class="empty-state-text">${error.message}</p></div>`;
        }
    }

    function renderAuditoria() {
        const content = document.getElementById('sectionContent');
        if (!logs.length) {
            content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Sin logs</div><p class="empty-state-text">No hay registros de auditoría</p></div>';
            return;
        }

        let rows = '';
        logs.forEach(log => {
            rows += `<tr><td>${log.accion || ''}</td><td>${log.usuario_email || 'Sistema'}</td><td>${log.created_at ? new Date(log.created_at).toLocaleString('es-ES') : 'N/A'}</td></tr>`;
        });

        content.innerHTML = `
            <div class="table-container">
                <div class="table-header"><h3 class="table-title">Logs de Auditoría</h3></div>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Acción</th><th>Usuario</th><th>Fecha</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function cambiarRol(usuarioId) {
        const nuevoRol = prompt('Nuevo rol (fan, artista, validador, super_admin):');
        if (!nuevoRol) return;

        try {
            await apiRequest(`/api/admin/usuarios/${usuarioId}/rol`, {
                method: 'PATCH',
                body: JSON.stringify({ rol: nuevoRol }),
            });

            alert('Rol actualizado');
            loadUsuarios();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function bloquearUsuario(usuarioId) {
        const confirmacion = confirm('¿Bloquear/desbloquear este usuario?');
        if (!confirmacion) return;

        try {
            await apiRequest(`/api/admin/usuarios/${usuarioId}/bloquear`, {
                method: 'PATCH',
                body: JSON.stringify({ bloqueado: true }),
            });

            alert('Usuario actualizado');
            loadUsuarios();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function destacarEvento(eventoId) {
        try {
            await apiRequest(`/api/admin/eventos/${eventoId}/destacar`, {
                method: 'PATCH',
                body: JSON.stringify({ destacado: true }),
            });

            alert('Evento destacado');
            loadEventos();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function cambiarEstadoEvento(eventoId) {
        const estados = ['activo', 'pausado', 'cancelado'];
        const evento = eventos.find(e => e.id === eventoId);
        if (!evento) return;

        const idx = estados.indexOf(evento.estado);
        const siguiente = estados[(idx + 1) % estados.length];

        try {
            await apiRequest(`/api/admin/eventos/${eventoId}/estado`, {
                method: 'PATCH',
                body: JSON.stringify({ estado: siguiente }),
            });

            alert(`Evento actualizado a ${siguiente}`);
            loadEventos();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function crearComisionFija() {
        try {
            await apiRequest('/api/admin/comisiones', {
                method: 'POST',
                body: JSON.stringify({ tipo: 'fija', valor: 1.2, descripcion: 'Comisión estándar por entrada' }),
            });

            alert('Comisión guardada');
            loadFinanzas();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function crearComisionPorcentaje() {
        try {
            await apiRequest('/api/admin/comisiones', {
                method: 'POST',
                body: JSON.stringify({ tipo: 'porcentaje', valor: 5, descripcion: 'Comisión 5%' }),
            });

            alert('Comisión guardada');
            loadFinanzas();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    const sectionTitles = {
        dashboard: { title: 'Dashboard', subtitle: 'Visión general del negocio', loader: loadDashboard },
        eventos: { title: 'Gestión de Eventos', subtitle: 'Moderación y control de conciertos', loader: loadEventos },
        usuarios: { title: 'Gestión de Usuarios', subtitle: 'Filtros por rol y control de acceso', loader: loadUsuarios },
        finanzas: { title: 'Finanzas y Comisiones', subtitle: 'Configuración económica y control de pagos', loader: loadFinanzas },
        seguridad: { title: 'Seguridad y Fraude', subtitle: 'Alertas automáticas y logs del sistema', loader: loadSeguridad },
        config: { title: 'Configuración Global', subtitle: 'Ajustes de la plataforma', loader: loadConfig },
        auditoria: { title: 'Auditoría', subtitle: 'Historial de acciones del sistema', loader: loadAuditoria },
    };

    function navigateTo(section) {
        currentSection = section;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === section) {
                item.classList.add('active');
            }
        });

        const config = sectionTitles[section];
        if (config) {
            document.getElementById('sectionTitle').textContent = config.title;
            document.getElementById('sectionSubtitle').textContent = config.subtitle;
            config.loader();
        }
    }

    function init() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    navigateTo(section);
                }
            });
        });

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                login(email, password);
            });
        }

        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/admin')) {
            if (checkAuth()) {
                navigateTo('dashboard');
            }
        }
    }

    window.app = {
        navigateTo,
        cambiarRol,
        bloquearUsuario,
        destacarEvento,
        cambiarEstadoEvento,
        crearComisionFija,
        crearComisionPorcentaje,
        guardarConfiguracion,
        verAforo,
        reembolsarEvento,
        filtrarUsuarios,
        login,
        loadAuditoria,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
