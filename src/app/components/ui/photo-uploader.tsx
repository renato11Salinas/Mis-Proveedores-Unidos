import { useRef } from 'react';
import { Button } from './button';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiple?: boolean;
  className?: string;
  id?: string;
}

export function PhotoUploader({ onChange, multiple = false, className = '', id }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`flex flex-col sm:flex-row gap-3 w-full ${className}`}>
      <Button type="button" variant="outline" className="flex-1 border-dashed border-2 h-14 bg-gray-50 hover:bg-gray-100" onClick={() => fileInputRef.current?.click()}>
         <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
         <span className="font-medium text-gray-700">Subir de Galería</span>
      </Button>
      <Button type="button" variant="outline" className="flex-1 border-dashed border-2 h-14 bg-gray-50 hover:bg-gray-100" onClick={() => cameraInputRef.current?.click()}>
         <Camera className="w-5 h-5 mr-2 text-green-600" />
         <span className="font-medium text-gray-700">Tomar Foto</span>
      </Button>
      <input id={id ? `${id}-file` : undefined} ref={fileInputRef} type="file" accept="image/*" multiple={multiple} onChange={onChange} className="hidden" />
      <input id={id ? `${id}-camera` : undefined} ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple={multiple} onChange={onChange} className="hidden" />
    </div>
  );
}
