import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User } from 'lucide-react';

interface Cliente {
  id?: string;
  nombre: string;
  apellido?: string;
  cliente_tipo: 'natural' | 'empresa';
  ruc?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  metadata?: any;
}

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cliente: Cliente) => Promise<void>;
  cliente?: Cliente | null;
  mode: 'create' | 'edit';
}

export function ClienteModal({ isOpen, onClose, onSave, cliente, mode }: ClienteModalProps) {
  const [formData, setFormData] = useState<Cliente>({
    nombre: '',
    apellido: '',
    cliente_tipo: 'natural',
    ruc: '',
    email: '',
    telefono: '',
    direccion: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cliente && mode === 'edit') {
      setFormData(cliente);
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        cliente_tipo: 'natural',
        ruc: '',
        email: '',
        telefono: '',
        direccion: '',
      });
    }
  }, [cliente, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.nombre) {
      setError('El nombre es obligatorio');
      return;
    }

    if (formData.cliente_tipo === 'empresa' && !formData.ruc) {
      setError('El RUC es obligatorio para empresas');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tipo de Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Cliente *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, cliente_tipo: 'natural', ruc: '' })}
                className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                  formData.cliente_tipo === 'natural'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Persona Natural</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, cliente_tipo: 'empresa' })}
                className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                  formData.cliente_tipo === 'empresa'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Empresa</span>
              </button>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.cliente_tipo === 'empresa' ? 'Razón Social *' : 'Nombre *'}
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={formData.cliente_tipo === 'empresa' ? 'Nombre de la empresa' : 'Nombre del cliente'}
              required
            />
          </div>

          {/* Apellido - solo para persona natural */}
          {formData.cliente_tipo === 'natural' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido
              </label>
              <input
                type="text"
                value={formData.apellido || ''}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Apellido del cliente"
              />
            </div>
          )}

          {/* RUC - solo para empresa */}
          {formData.cliente_tipo === 'empresa' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RUC *
              </label>
              <input
                type="text"
                value={formData.ruc || ''}
                onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Número de RUC"
                maxLength={20}
                required
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="correo@ejemplo.com"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono || ''}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+51 999 999 999"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <textarea
              value={formData.direccion || ''}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Dirección completa"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
