import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-89c63dd1`;

let _ordenesCache: any = null;

export const api = {
  invalidateCache() {
    _ordenesCache = null;
  },
  
  // Auth
  async signin(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  async signup(email: string, password: string, name: string) {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });
    return response.json();
  },

  async getSession(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/session`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.json();
  },

  // Ordenes
  async getOrdenes(forceRefresh = false) {
    if (_ordenesCache && !forceRefresh) {
      return Promise.resolve({ ordenes: _ordenesCache });
    }

    const response = await fetch(`${API_URL}/ordenes`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    const data = await response.json();
    if (data.ordenes) {
      _ordenesCache = data.ordenes;
    }
    return data;
  },

  async getOrden(id: string) {
    const response = await fetch(`${API_URL}/ordenes/${id}`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    return response.json();
  },

  async createOrden(ordenData: any) {
    const response = await fetch(`${API_URL}/ordenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(ordenData),
    });
    this.invalidateCache();
    return response.json();
  },

  async updateOrden(id: string, updates: any) {
    const response = await fetch(`${API_URL}/ordenes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(updates),
    });
    this.invalidateCache();
    return response.json();
  },

  async avanzarEtapa(id: string, nuevoEstado: string, dni: string) {
    const response = await fetch(`${API_URL}/ordenes/${id}/avanzar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ nuevoEstado, dni }),
    });
    this.invalidateCache();
    return response.json();
  },

  async retrocederEtapa(id: string, nuevoEstado: string, dni: string, motivo: string) {
    const response = await fetch(`${API_URL}/ordenes/${id}/retroceder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ nuevoEstado, dni, motivo }),
    });
    this.invalidateCache();
    return response.json();
  },

  // Imágenes
  async uploadImagen(ordenId: string, tipo: 'ot' | 'pieza' | 'limpiezaEmbalaje' | 'revisionCalidad', base64Data: string, nombre: string, descripcion?: string) {
    // Get the access token from localStorage if available
    const accessToken = localStorage.getItem('accessToken') || publicAnonKey;

    const response = await fetch(`${API_URL}/ordenes/${ordenId}/imagenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ tipo, base64Data, nombre, descripcion }),
    });
    this.invalidateCache();
    return response.json();
  },

  // Documentos
  async uploadDocumento(
    ordenId: string,
    tipo: 'ordenServicio' | 'guiaSalida' | 'informeComercial' | 'fichaComponente',
    base64Data: string,
    nombre: string,
    mimeType: string
  ) {
    const response = await fetch(`${API_URL}/ordenes/${ordenId}/documentos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ tipo, base64Data, nombre, mimeType }),
    });
    this.invalidateCache();
    return response.json();
  },
};