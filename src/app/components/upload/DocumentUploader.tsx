import { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Upload, Download, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploaderProps {
  onUpload: (base64: string, nombre: string, mimeType: string) => Promise<void>;
  label?: string;
  accept?: string;
}

export function DocumentUploader({
  onUpload,
  label = 'Subir Documento',
  accept = '.pdf,.doc,.docx,.xls,.xlsx',
}: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar 10MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await onUpload(base64, file.name, file.type);
        toast.success('Documento cargado exitosamente');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        toast.error('Error al leer el documento');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Error al cargar el documento');
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Cargando...' : label}
      </Button>
    </div>
  );
}

interface DocumentViewerProps {
  documento?: {
    id: string;
    nombre: string;
    base64Data: string;
    mimeType: string;
    uploadedBy?: string;
    uploadedAt?: string;
  };
  onDelete?: () => void;
  label: string;
}

export function DocumentViewer({ documento, onDelete, label }: DocumentViewerProps) {
  const handleDownload = () => {
    if (!documento) return;

    const link = document.createElement('a');
    link.href = documento.base64Data;
    link.download = documento.nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          documento ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          <FileText className={`w-5 h-5 ${
            documento ? 'text-green-600' : 'text-gray-400'
          }`} />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{label}</p>
          {documento ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-600">{documento.nombre}</p>
              {documento.uploadedBy && (
                <p className="text-xs text-gray-500">
                  Subido por: {documento.uploadedBy}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay documento cargado</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {documento ? (
          <>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
            {onDelete && (
              <Button variant="outline" size="sm" onClick={onDelete}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
