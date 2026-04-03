const fs = require('fs');

// OrdenDetail.tsx
let ordenDetail = fs.readFileSync('src/app/pages/OrdenDetail.tsx', 'utf8');

// Imports
ordenDetail = ordenDetail.replace(
  "import { RevisionCalidadPhotoUpload } from '../components/workflow/RevisionCalidadPhotoUpload';",
  "import { RevisionCalidadPhotoUpload } from '../components/workflow/RevisionCalidadPhotoUpload';\nimport { PhotoUploader } from '../components/ui/photo-uploader';\nimport { ZoomableImage } from '../components/ui/zoomable-image';"
);

// ZoomableImage
ordenDetail = ordenDetail.replace(
  /<img\s+src=\{foto\.url \|\| foto\.base64Data\}\s+alt=\{foto\.nombre \|\| \Foto \\\$\{index \+ 1\}\\}\s+className="w-full aspect-square object-cover rounded-lg border"\s*\/>/g,
  '<ZoomableImage src={foto.url || foto.base64Data} alt={foto.nombre || Foto } className="w-full aspect-square object-cover rounded-lg border block" />'
);

// Arribo
ordenDetail = ordenDetail.replace(
  /<p className="text-gray-500 mb-3">No hay fotograf?as de arribo<\/p>\s*<Input\s*type="file"\s*multiple\s*accept="image\/\*"\s*onChange=\{\(e\) => handleUploadImage\('ot', e\.target\.files\)\}\s*className="max-w-xs mx-auto cursor-pointer"\s*\/>/s,
  '<p className="text-gray-500 mb-3">No hay fotograf?as de arribo</p>\\n                      <div className="max-w-sm mx-auto">\\n                        <PhotoUploader\\n                          multiple\\n                          onChange={(e) => handleUploadImage(\\'ot\\', e.target.files)}\\n                        />\\n                      </div>'
);

// Pieza (Add more)
ordenDetail = ordenDetail.replace(
  /<label className="cursor-pointer flex flex-col items-center justify-center gap-2 text-blue-600 hover:text-blue-700">\s*<Camera className="w-8 h-8" \/>\s*<span className="font-medium">Agregar m?s fotograf?as<\/span>\s*<Input\s*type="file"\s*multiple\s*accept="image\/\*"\s*onChange=\{\(e\) => handleUploadImage\('pieza', e\.target\.files\)\}\s*className="hidden"\s*\/>\s*<\/label>/s,
  '<div className="flex flex-col items-center justify-center gap-2">\\n                          <span className="font-medium text-gray-700 mb-2">Agregar m?s fotograf?as</span>\\n                          <PhotoUploader\\n                            multiple\\n                            onChange={(e) => handleUploadImage(\\'pieza\\', e.target.files)}\\n                          />\\n                        </div>'
);

// Pieza (Empty)
ordenDetail = ordenDetail.replace(
  /<div className="flex flex-col items-center justify-center cursor-pointer">\s*<Upload className="w-10 h-10 text-gray-400 mb-2" \/>\s*<p className="text-gray-600 font-medium mb-1">No hay fotograf?as del servicio<\/p>\s*<p className="text-sm text-gray-500">Haga clic para seleccionar m?ltiples fotos<\/p>\s*<\/div>\s*<Input\s*type="file"\s*multiple\s*accept="image\/\*"\s*onChange=\{\(e\) => handleUploadImage\('pieza', e\.target\.files\)\}\s*className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"\s*\/>/s,
  '<div className="flex flex-col items-center justify-center w-full">\\n                          <Upload className="w-10 h-10 text-gray-400 mb-2" />\\n                          <p className="text-gray-600 font-medium mb-4">No hay fotograf?as del servicio</p>\\n                          <div className="max-w-sm w-full">\\n                            <PhotoUploader\\n                              multiple\\n                              onChange={(e) => handleUploadImage(\\'pieza\\', e.target.files)}\\n                            />\\n                          </div>\\n                        </div>'
);

// Limpieza (Add more)
ordenDetail = ordenDetail.replace(
  /<label className="cursor-pointer flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700">\s*<Camera className="w-5 h-5" \/>\s*<span className="font-medium">Agregar m?s fotograf?as<\/span>\s*<Input\s*type="file"\s*multiple\s*accept="image\/\*"\s*onChange=\{\(e\) => handleUploadImage\('limpiezaEmbalaje', e\.target\.files\)\}\s*className="hidden"\s*\/>\s*<\/label>/s,
  '<div className="mt-4">\\n                            <span className="block text-sm font-medium text-gray-700 mb-2 text-center">Agregar m?s fotograf?as</span>\\n                            <div className="max-w-sm mx-auto">\\n                              <PhotoUploader\\n                                multiple\\n                                onChange={(e) => handleUploadImage(\\'limpiezaEmbalaje\\', e.target.files)}\\n                              />\\n                            </div>\\n                          </div>'
);

// Limpieza (Empty)
ordenDetail = ordenDetail.replace(
  /<label className="cursor-pointer flex flex-col items-center justify-center">\s*<Camera className="w-12 h-12 text-gray-400 mb-3" \/>\s*<p className="text-gray-600 mb-4">No hay fotograf?as de la limpieza y embalaje<\/p>\s*<span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">\s*Subir Fotograf?as\s*<\/span>\s*<Input\s*type="file"\s*multiple\s*accept="image\/\*"\s*onChange=\{\(e\) => handleUploadImage\('limpiezaEmbalaje', e\.target\.files\)\}\s*className="hidden"\s*\/>\s*<\/label>/s,
  '<div className="flex flex-col items-center justify-center w-full">\\n                          <Camera className="w-12 h-12 text-gray-400 mb-3" />\\n                          <p className="text-gray-600 mb-4">No hay fotograf?as de la limpieza y embalaje</p>\\n                          <div className="max-w-sm w-full">\\n                            <PhotoUploader\\n                              multiple\\n                              onChange={(e) => handleUploadImage(\\'limpiezaEmbalaje\\', e.target.files)}\\n                            />\\n                          </div>\\n                        </div>'
);

fs.writeFileSync('src/app/pages/OrdenDetail.tsx', ordenDetail, 'utf8');
console.log("OrdenDetail.tsx modified successfully");
