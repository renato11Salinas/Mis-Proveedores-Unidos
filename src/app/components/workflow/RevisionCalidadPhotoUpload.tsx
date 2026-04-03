import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Camera, X } from 'lucide-react';
import { api } from '../../lib/supabase';
import { toast } from 'sonner';
import { PhotoUploader } from '../ui/photo-uploader';
import { ZoomableImage } from '../ui/zoomable-image';

interface RevisionCalidadPhotoUploadProps {
  ordenId: string;
  onUploadComplete: () => void;
  tipo?: 'revisionCalidad' | 'limpiezaEmbalaje';
}

interface PhotoWithDescription {
  id: string;
  file: File;
  preview: string;
  descripcion: string;
}

export function RevisionCalidadPhotoUpload({ ordenId, onUploadComplete, tipo = 'revisionCalidad' }: RevisionCalidadPhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoWithDescription[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoWithDescription[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newPhotos.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        descripcion: '',
      });
    }

    setPhotos([...photos, ...newPhotos]);
  };

  const handleDescripcionChange = (id: string, descripcion: string) => {
    setPhotos(prevPhotos => {
      const updatedPhotos = prevPhotos.map(photo =>
        photo.id === id ? { ...photo, descripcion } : photo
      );
      return updatedPhotos;
    });
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== id));
  };

  const handleUploadAll = async () => {
    if (photos.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const photo of photos) {
      try {
        const textarea = document.getElementById(`desc-${photo.id}`) as HTMLTextAreaElement;
        const textoReal = textarea ? textarea.value : photo.descripcion;
        
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const base64 = e.target?.result as string;
              const response = await api.uploadImagen(
                ordenId,
                tipo,
                base64,
                photo.file.name,
                textoReal.trim()
              );

              if (response.orden || response.imagen) {
                successCount++;
                resolve(response);
              } else if (response.error) {
                toast.error(`Error al cargar ${photo.file.name}: ${response.error}`);
                reject(response.error);
              }
            } catch (error) {
              toast.error(`Error al cargar ${photo.file.name}`);
              reject(error);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(photo.file);
        });
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} ${successCount === 1 ? 'fotografía cargada' : 'fotografías cargadas'} exitosamente`);
      setPhotos([]);
      onUploadComplete();
    }
  };

  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <div className="space-y-3">
          {photos.map((photo) => (
            <div key={photo.id} className="flex gap-4 items-center border rounded-lg p-4">
              <ZoomableImage
                src={photo.preview}
                alt={photo.file.name}
                className="w-32 h-32 object-cover rounded-lg flex-shrink-0 block"
              />
              <div className="flex-1 space-y-2">
                <textarea
                  id={`desc-${photo.id}`}
                  placeholder="Descripción de la fotografía..."
                  defaultValue={photo.descripcion}
                  onChange={(e) => handleDescripcionChange(photo.id, e.target.value)}
                  className="w-full min-h-[80px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">{photo.file.name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePhoto(photo.id)}
                className="text-red-600 hover:text-red-700 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button
            onClick={handleUploadAll}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? 'Subiendo...' : `Subir ${photos.length} ${photos.length === 1 ? 'fotografía' : 'fotografías'}`}
          </Button>
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-2 mt-4">
        <span className="font-medium text-gray-700">
          {photos.length > 0 ? 'Agregar más fotografías' : 'Agregar fotografías con descripción'}
        </span>
        <div className="max-w-sm w-full">
          <PhotoUploader
            multiple
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
}
