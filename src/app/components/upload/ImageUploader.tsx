import { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { PhotoUploader } from '../ui/photo-uploader';
import { ZoomableImage } from '../ui/zoomable-image';

interface ImageUploaderProps {
  onUpload: (base64: string, nombre: string) => Promise<void>;
  label?: string;
}

export function ImageUploader({ onUpload, label = 'Cargar Fotografía' }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await onUpload(base64, file.name);
        toast.success('Imagen cargada exitosamente');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        toast.error('Error al leer la imagen');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Error al cargar la imagen');
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="max-w-sm w-full">
        {uploading ? (
          <Button
            type="button"
            variant="outline"
            disabled={true}
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            Cargando...
          </Button>
        ) : (
          <PhotoUploader onChange={handleFileSelect} multiple={false} />
        )}
      </div>
    </div>
  );
}

interface ImageGalleryProps {
  images: Array<{ id: string; nombre: string; base64Data: string; uploadedBy?: string; uploadedAt?: string }>;
  onDelete?: (id: string) => void;
}

export function ImageGallery({ images, onDelete }: ImageGalleryProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((image) => (
        <div key={image.id} className="relative group">
          <ZoomableImage
            src={image.base64Data}
            alt={image.nombre}
            className="w-full aspect-square object-cover rounded-lg border block"
          />
          {onDelete && (
            <button
              onClick={() => onDelete(image.id)}
              className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="mt-1 text-xs text-gray-600 truncate">
            {image.nombre}
          </div>
          {image.uploadedBy && (
            <div className="text-xs text-gray-500">
              Por: {image.uploadedBy}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
