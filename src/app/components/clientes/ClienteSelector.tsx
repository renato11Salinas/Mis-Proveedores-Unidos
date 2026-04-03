import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Building2, User, ChevronDown } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface Cliente {
  id: string;
  nombre: string;
  apellido?: string;
  cliente_tipo: 'natural' | 'empresa';
  ruc?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

interface ClienteSelectorProps {
  value: string | null;
  onChange: (clienteId: string | null, clienteData?: Cliente) => void;
  onAddNew: () => void;
  required?: boolean;
}

export function ClienteSelector({ value, onChange, onAddNew, required = false }: ClienteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar clientes
  useEffect(() => {
    loadClientes();
  }, []);

  // Buscar cliente seleccionado
  useEffect(() => {
    if (value && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === value);
      if (cliente) {
        setSelectedCliente(cliente);
      }
    }
  }, [value, clientes]);

  // Filtrar clientes por búsqueda
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClientes(clientes);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clientes.filter(c => 
        c.nombre.toLowerCase().includes(query) ||
        c.apellido?.toLowerCase().includes(query) ||
        c.ruc?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
      setFilteredClientes(filtered);
    }
  }, [searchQuery, clientes]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const loadClientes = async () => {
    setLoading(true);
    try {
      // Use the server endpoint for clientes
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-89c63dd1/clientes`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar clientes');
      }

      const data = await response.json();
      setClientes(data.clientes || []);
    } catch (error) {
      console.error('Error loading clientes:', error);
      // Set empty array on error to avoid UI issues
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    onChange(cliente.id, cliente);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCliente(null);
    onChange(null);
    setSearchQuery('');
  };

  const getDisplayName = (cliente: Cliente) => {
    if (cliente.cliente_tipo === 'empresa') {
      return cliente.nombre;
    }
    return `${cliente.nombre} ${cliente.apellido || ''}`.trim();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Cliente {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* Selector Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-full px-3 py-2 border rounded-lg cursor-pointer transition-all ${
          isOpen 
            ? 'border-blue-500 ring-2 ring-blue-500/20' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedCliente ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedCliente.cliente_tipo === 'empresa' ? (
                <Building2 className="w-4 h-4 text-blue-600" />
              ) : (
                <User className="w-4 h-4 text-green-600" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{getDisplayName(selectedCliente)}</span>
                {selectedCliente.ruc && (
                  <span className="text-xs text-gray-500">RUC: {selectedCliente.ruc}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Seleccionar cliente...</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[500px]">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, RUC, email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Nuevo Cliente Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              onAddNew();
            }}
            className="w-full px-3 py-2 flex items-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors border-b"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Nuevo Cliente</span>
          </button>

          {/* Lista de Clientes */}
          <div className="overflow-y-auto max-h-96 pb-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Cargando clientes...
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No se encontraron clientes
              </div>
            ) : (
              filteredClientes.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => handleSelect(cliente)}
                  className={`w-full px-3 py-2.5 flex items-start gap-2 hover:bg-gray-50 transition-colors text-left ${
                    selectedCliente?.id === cliente.id ? 'bg-blue-50' : ''
                  }`}
                >
                  {cliente.cliente_tipo === 'empresa' ? (
                    <Building2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <User className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{getDisplayName(cliente)}</div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {cliente.ruc && <div>RUC: {cliente.ruc}</div>}
                      {cliente.email && <div>{cliente.email}</div>}
                      {cliente.telefono && <div>{cliente.telefono}</div>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}