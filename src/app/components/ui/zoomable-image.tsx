import { useState } from 'react';
import { X } from 'lucide-react';

export function ZoomableImage({ src, alt, className }: { src: string, alt: string, className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <img 
        src={src} 
        alt={alt} 
        className={`${className} cursor-pointer hover:opacity-90 transition-opacity`} 
        onClick={() => setIsOpen(true)} 
      />
      
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setIsOpen(false)}>
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-50 bg-black/50 rounded-full"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-[95vh] object-contain rounded-lg" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}
