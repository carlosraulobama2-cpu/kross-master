const API_BASE_URL = window.ENV?.API_BASE_URL || 'http://localhost:3000';

let authToken = localStorage.getItem('admin_token');

async function request(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
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
            // ignore parse error
        }
        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

const api = {
    login: (email, password) => {
        return request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    getKPIs: () => request('/api/admin/kpis'),

    getUsuarios: () => request('/api/admin/usuarios'),

    updateUsuarioRol: (usuarioId, rol) => {
        return request(`/api/admin/usuarios/${usuarioId}/rol`, {
            method: 'PATCH',
            body: JSON.stringify({ rol }),
        });
    },

    bloquearUsuario: (usuarioId, bloqueado) => {
        return request(`/api/admin/usuarios/${usuarioId}/bloquear`, {
            method: 'PATCH',
            body: JSON.stringify({ bloqueado }),
        });
    },

    getEventos: () => request('/api/admin/eventos'),

    updateEventoEstado: (eventoId, estado) => {
        return request(`/api/admin/eventos/${eventoId}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado }),
        });
    },

    destacarEvento: (eventoId, destacado) => {
        return request(`/api/admin/eventos/${eventoId}/destacar`, {
            method: 'PATCH',
            body: JSON.stringify({ destacado }),
        });
    },

    getComisiones: () => request('/api/admin/comisiones'),

    createComision: (data) => {
        return request('/api/admin/comisiones', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getAlertasFraude: () => request('/api/admin/fraude/alertas'),

    getConfiguracion: () => request('/api/admin/configuracion'),

    updateConfiguracion: (data) => {
        return request('/api/admin/configuracion', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    enviarNotificacionPush: (data) => {
        return request('/api/admin/notificaciones/push', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

window.AdminAPI = api;
