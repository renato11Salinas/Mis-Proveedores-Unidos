import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.ts';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Create Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
};

// Workaround for trigger issue: use raw SQL instead of ORM
const setKV = async (key: string, value: any): Promise<void> => {
  const supabase = getSupabaseClient();
  
  // Use raw SQL to insert/update without triggering the problematic trigger
  const { error } = await supabase.rpc('exec', {
    sql: `
      INSERT INTO kv_store_89c63dd1 (key, value)
      VALUES ('${key}', '${JSON.stringify(value)}'::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `
  });
  
  if (error) {
    // If RPC doesn't work, try using a direct delete + insert
    console.log('RPC failed, trying delete+insert workaround...');
    
    // First delete the old key
    await supabase.from('kv_store_89c63dd1').delete().eq('key', key);
    
    // Then insert the new one
    const { error: insertError } = await supabase
      .from('kv_store_89c63dd1')
      .insert({ key, value });
    
    if (insertError) {
      throw new Error(`Failed to save to KV store: ${insertError.message}`);
    }
  }
};

// Initialize storage bucket on server startup
const initializeStorage = async () => {
  try {
    const supabase = getSupabaseClient();
    const bucketName = 'make-89c63dd1-photos';
    
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${bucketName}`);
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
      
      if (error) {
        console.log(`Error creating bucket: ${error.message}`);
      } else {
        console.log(`Bucket ${bucketName} created successfully`);
      }
    } else {
      console.log(`Bucket ${bucketName} already exists`);
    }
  } catch (error) {
    console.log(`Error initializing storage: ${error}`);
  }
};

// Initialize on startup
initializeStorage();

// In-memory cache for ordenes list
let ordenesCache: {
  data: any[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 30000; // 30 seconds cache

// Helper to invalidate cache
const invalidateOrdenesCache = () => {
  ordenesCache = null;
};

// Cliente endpoints
app.get('/make-server-89c63dd1/clientes', async (c) => {
  try {
    const clientes = await kv.getByPrefix('cliente:');
    return c.json({ clientes });
  } catch (error) {
    console.error(`Error fetching clientes: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/make-server-89c63dd1/clientes/search', async (c) => {
  try {
    const query = c.req.query('q')?.toLowerCase() || '';
    const clientes = await kv.getByPrefix('cliente:');
    
    // Filter clientes by search query
    const filtered = clientes.filter(cliente => 
      cliente.nombre?.toLowerCase().includes(query) ||
      cliente.apellido?.toLowerCase().includes(query) ||
      cliente.ruc?.toLowerCase().includes(query) ||
      cliente.email?.toLowerCase().includes(query)
    ).slice(0, 10);
    
    return c.json({ clientes: filtered });
  } catch (error) {
    console.error(`Error searching clientes: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/make-server-89c63dd1/clientes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const cliente = await kv.get(`cliente:${id}`);
    
    if (!cliente) {
      return c.json({ error: 'Cliente not found' }, 404);
    }
    
    return c.json({ cliente });
  } catch (error) {
    console.error(`Error fetching cliente: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/make-server-89c63dd1/clientes', async (c) => {
  try {
    const clienteData = await c.req.json();
    
    // Validate required fields
    if (!clienteData.nombre || !clienteData.cliente_tipo) {
      return c.json({ error: 'Nombre y tipo de cliente son obligatorios' }, 400);
    }
    
    // Validate empresa must have RUC
    if (clienteData.cliente_tipo === 'empresa' && !clienteData.ruc) {
      return c.json({ error: 'RUC es obligatorio para empresas' }, 400);
    }
    
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cliente = {
      ...clienteData,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await setKV(`cliente:${id}`, cliente);
    return c.json({ cliente });
  } catch (error) {
    console.error(`Error creating cliente: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.patch('/make-server-89c63dd1/clientes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const cliente = await kv.get(`cliente:${id}`);
    if (!cliente) {
      return c.json({ error: 'Cliente not found' }, 404);
    }
    
    // Validate empresa must have RUC
    if (updates.cliente_tipo === 'empresa' && !updates.ruc) {
      return c.json({ error: 'RUC es obligatorio para empresas' }, 400);
    }
    
    const updatedCliente = {
      ...cliente,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    await setKV(`cliente:${id}`, updatedCliente);
    return c.json({ cliente: updatedCliente });
  } catch (error) {
    console.error(`Error updating cliente: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/make-server-89c63dd1/clientes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const cliente = await kv.get(`cliente:${id}`);
    
    if (!cliente) {
      return c.json({ error: 'Cliente not found' }, 404);
    }
    
    await kv.del(`cliente:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error(`Error deleting cliente: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Auth endpoints
app.post('/make-server-89c63dd1/auth/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true, // Automatically confirm email since email server hasn't been configured
    });

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/make-server-89c63dd1/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Error signing in user: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({
      session: data.session,
      user: data.user,
    });
  } catch (error) {
    console.log(`Server error during signin: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/make-server-89c63dd1/auth/session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error) {
      return c.json({ error: error.message }, 401);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Error getting session: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Orden de Trabajo endpoints
app.get('/make-server-89c63dd1/ordenes', async (c) => {
  try {
    // Check cache first
    const now = Date.now();
    if (ordenesCache && (now - ordenesCache.timestamp) < CACHE_TTL) {
      console.log('Returning cached ordenes');
      return c.json({ ordenes: ordenesCache.data });
    }

    console.log('Fetching ordenes from database...');
    const startTime = Date.now();
    
    const ordenes = await kv.getByPrefix('orden:');
    
    console.log(`Fetched ${ordenes.length} ordenes in ${Date.now() - startTime}ms`);

    // Sort by correlative number (descending) for chronological display
    ordenes.sort((a, b) => {
      const aNum = a.numeroOTCorrelativo || 0;
      const bNum = b.numeroOTCorrelativo || 0;
      return bNum - aNum; // Descending order (newest first)
    });

    // Optimize: Remove heavy data (base64 images) from list response
    // Only send essential fields for the dashboard
    const ordenesOptimized = ordenes.map(orden => ({
      id: orden.id,
      numeroOT: orden.numeroOT,
      nombreComponente: orden.nombreComponente,
      numeroGuia: orden.numeroGuia,
      fechaCreacion: orden.fechaCreacion,
      estado: orden.estado,
      clienteNombre: orden.clienteNombre,
      clienteNumero: orden.clienteNumero,
      dpObra: orden.dpObra,
      edoObra: orden.edoObra,
      servicioSolicitado: orden.servicioSolicitado,
      // Send count instead of full photo arrays
      fotografiasIncluyeOTCount: orden.fotografiasIncluyeOT?.length || 0,
      fotografiasPiezasCount: orden.fotografiasPiezas?.length || 0,
      fotografiasLimpiezaEmbalajeCount: orden.fotografiasLimpiezaEmbalaje?.length || 0,
      // Include historial for timeline display (it's lightweight)
      historialCambios: orden.historialCambios || [],
    }));
    
    // Update cache
    ordenesCache = {
      data: ordenesOptimized,
      timestamp: now
    };
    
    console.log(`Optimized and cached ${ordenesOptimized.length} ordenes`);
    
    return c.json({ ordenes: ordenesOptimized });
  } catch (error) {
    console.log(`Error fetching ordenes: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get next correlative number for multiple orders
app.get('/make-server-89c63dd1/ordenes/next-correlative', async (c) => {
  try {
    console.log('Fetching next correlative number...');
    const existingOrdenes = await kv.getByPrefix('orden:');

    let maxNumero = 0;
    existingOrdenes.forEach(orden => {
      if (orden.numeroOTCorrelativo && typeof orden.numeroOTCorrelativo === 'number') {
        maxNumero = Math.max(maxNumero, orden.numeroOTCorrelativo);
      }
    });

    const nextCorrelativo = maxNumero + 1;
    console.log(`Next correlative number: ${nextCorrelativo}`);

    return c.json({ nextCorrelativo });
  } catch (error) {
    console.error(`Error getting next correlative: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/make-server-89c63dd1/ordenes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const orden = await kv.get(`orden:${id}`);
    
    if (!orden) {
      return c.json({ error: 'Orden not found' }, 404);
    }

    return c.json({ orden });
  } catch (error) {
    console.log(`Error fetching orden: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/make-server-89c63dd1/ordenes', async (c) => {
  try {
    console.log('Creating new orden - parsing request body...');
    const ordenData = await c.req.json();

    console.log('Generating orden ID...');
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if a specific correlative number was provided (for multiple orders)
    let nuevoNumeroCorrelativo;
    if (ordenData.numeroCorrelativoEspecifico && typeof ordenData.numeroCorrelativoEspecifico === 'number') {
      // Use the provided correlative number
      nuevoNumeroCorrelativo = ordenData.numeroCorrelativoEspecifico;
      console.log(`Using provided correlative number: ${nuevoNumeroCorrelativo}`);
    } else {
      // Generate correlative OT number
      console.log('Fetching existing ordenes to generate correlative OT number...');
      const existingOrdenes = await kv.getByPrefix('orden:');

      // Extract existing OT numbers and find the highest correlative number
      let maxNumero = 0;
      existingOrdenes.forEach(orden => {
        if (orden.numeroOTCorrelativo && typeof orden.numeroOTCorrelativo === 'number') {
          maxNumero = Math.max(maxNumero, orden.numeroOTCorrelativo);
        }
      });

      nuevoNumeroCorrelativo = maxNumero + 1;
      console.log(`Generated new correlative number: ${nuevoNumeroCorrelativo}`);
    }

    // Determine if this is part of a multiple order set and generate appropriate OT number
    let numeroOT;
    if (ordenData.esOrdenMultiple && typeof ordenData.ordenMultipleIndice === 'number') {
      // Generate sub-identifier for multiple orders (A, B, C, etc.)
      const subIdentificador = String.fromCharCode(65 + ordenData.ordenMultipleIndice); // 65 = 'A'
      numeroOT = `OT-${String(nuevoNumeroCorrelativo).padStart(4, '0')}${subIdentificador}`;
      console.log(`Generated correlative OT number for multiple order: ${numeroOT} (${nuevoNumeroCorrelativo}, sub: ${subIdentificador})`);
    } else {
      // Single order, no sub-identifier
      numeroOT = `OT-${String(nuevoNumeroCorrelativo).padStart(4, '0')}`;
      console.log(`Generated correlative OT number: ${numeroOT} (${nuevoNumeroCorrelativo})`);
    }

    console.log(`Creating orden with ID: ${id}`);
    const orden = {
      ...ordenData,
      id,
      numeroOT, // Override with correlative number
      numeroOTCorrelativo: nuevoNumeroCorrelativo, // Store numeric value for sorting
      fechaCreacion: new Date().toISOString(),
      estado: 'arribo',
      historialCambios: [],
    };

    console.log(`Saving orden to KV store...`);
    await setKV(`orden:${id}`, orden);

    // Invalidate cache since we created a new orden
    invalidateOrdenesCache();

    console.log(`Orden ${id} created successfully with OT number ${numeroOT}`);

    // Return a simpler response to avoid timeout issues
    const response = {
      orden: {
        ...orden,
        // Don't send back base64 photos in the response to reduce payload size
        fotografiasIncluyeOT: orden.fotografiasIncluyeOT?.map(f => ({
          id: f.id,
          nombre: f.nombre,
          // base64Data is stored but not returned in the initial response
        })) || [],
      }
    };

    return c.json(response);
  } catch (error) {
    console.error(`Error creating orden - Details: ${error}`);
    console.error(`Error stack: ${error.stack}`);
    return c.json({ error: `Error creating orden: ${error.message || error}` }, 500);
  }
});

app.patch('/make-server-89c63dd1/ordenes/:id/avanzar', async (c) => {
  try {
    console.log('Advancing orden state - parsing request...');
    const id = c.req.param('id');
    const { nuevoEstado, dni } = await c.req.json();

    console.log(`Advancing orden ${id} to state: ${nuevoEstado}, dni: ${dni}`);

    const orden = await kv.get(`orden:${id}`);
    if (!orden) {
      console.log(`Orden ${id} not found`);
      return c.json({ error: 'Orden not found' }, 404);
    }

    console.log(`Current orden state: ${orden.estado}`);

    const cambio = {
      fecha: new Date().toISOString(),
      usuario: dni || 'Sistema',
      dni: dni,
      tipo: 'avance',
      estadoAnterior: orden.estado,
      estadoNuevo: nuevoEstado,
    };

    // Update orden with new state
    const updatedOrden = {
      ...orden,
      estado: nuevoEstado,
      historialCambios: [...(orden.historialCambios || []), cambio],
    };

    // Si avanza a "liberacion-ot" y no tiene estadoAperturaOT, inicializar como Pendiente
    if (nuevoEstado === 'liberacion-ot' && !updatedOrden.estadoAperturaOT) {
      updatedOrden.estadoAperturaOT = {
        estado: 'Pendiente',
        fecha: new Date().toISOString(),
      };
      console.log('Initialized estadoAperturaOT as Pendiente for liberacion-ot');
    }

    console.log(`Saving orden with new state: ${nuevoEstado}`);

    try {
      await setKV(`orden:${id}`, updatedOrden);
      console.log(`Orden ${id} advanced successfully to ${nuevoEstado}`);
    } catch (kvError) {
      console.error(`KV Store error: ${kvError}`);
      console.error(`KV Error details: ${kvError.message}`);
      throw new Error(`Database error: ${kvError.message}`);
    }
    
    // Return lightweight response without base64 data
    const lightweightResponse = {
      orden: {
        ...updatedOrden,
        fotografiasIncluyeOT: updatedOrden.fotografiasIncluyeOT?.map(f => ({
          id: f.id,
          nombre: f.nombre,
          uploadedAt: f.uploadedAt,
        })) || [],
        fotografiasPiezas: updatedOrden.fotografiasPiezas?.map(f => ({
          id: f.id,
          nombre: f.nombre,
          uploadedAt: f.uploadedAt,
        })) || [],
        fotografiasLimpiezaEmbalaje: updatedOrden.fotografiasLimpiezaEmbalaje?.map(f => ({
          id: f.id,
          nombre: f.nombre,
          uploadedAt: f.uploadedAt,
        })) || [],
        ordenServicio: updatedOrden.ordenServicio ? {
          id: updatedOrden.ordenServicio.id,
          nombre: updatedOrden.ordenServicio.nombre,
          mimeType: updatedOrden.ordenServicio.mimeType,
          uploadedAt: updatedOrden.ordenServicio.uploadedAt,
        } : undefined,
        guiaSalida: updatedOrden.guiaSalida ? {
          id: updatedOrden.guiaSalida.id,
          nombre: updatedOrden.guiaSalida.nombre,
          mimeType: updatedOrden.guiaSalida.mimeType,
          uploadedAt: updatedOrden.guiaSalida.uploadedAt,
        } : undefined,
        informeComercial: updatedOrden.informeComercial ? {
          id: updatedOrden.informeComercial.id,
          nombre: updatedOrden.informeComercial.nombre,
          mimeType: updatedOrden.informeComercial.mimeType,
          uploadedAt: updatedOrden.informeComercial.uploadedAt,
        } : undefined,
        fichaComponente: updatedOrden.fichaComponente ? {
          id: updatedOrden.fichaComponente.id,
          nombre: updatedOrden.fichaComponente.nombre,
          mimeType: updatedOrden.fichaComponente.mimeType,
          uploadedAt: updatedOrden.fichaComponente.uploadedAt,
        } : undefined,
      }
    };
    
    return c.json(lightweightResponse);
  } catch (error) {
    console.error(`Error advancing orden state: ${error}`);
    console.error(`Error stack: ${error.stack}`);
    return c.json({ error: `Error advancing orden: ${error.message || error}` }, 500);
  }
});

app.patch('/make-server-89c63dd1/ordenes/:id/retroceder', async (c) => {
  try {
    const id = c.req.param('id');
    const { nuevoEstado, dni, motivo } = await c.req.json();
    
    const orden = await kv.get(`orden:${id}`);
    if (!orden) {
      return c.json({ error: 'Orden not found' }, 404);
    }

    const cambio = {
      fecha: new Date().toISOString(),
      usuario: dni || 'Sistema',
      dni: dni,
      tipo: 'retroceso',
      motivo: motivo,
      estadoAnterior: orden.estado,
      estadoNuevo: nuevoEstado,
    };

    const updatedOrden = {
      ...orden,
      estado: nuevoEstado,
      historialCambios: [...(orden.historialCambios || []), cambio],
    };
    
    await setKV(`orden:${id}`, updatedOrden);
    
    // Invalidate cache since we updated an orden
    invalidateOrdenesCache();
    
    return c.json({ orden: updatedOrden });
  } catch (error) {
    console.log(`Error retreating orden state: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.patch('/make-server-89c63dd1/ordenes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const orden = await kv.get(`orden:${id}`);
    if (!orden) {
      return c.json({ error: 'Orden not found' }, 404);
    }

    const updatedOrden = {
      ...orden,
      ...updates,
      ultimaActualizacion: new Date().toISOString(),
    };

    await setKV(`orden:${id}`, updatedOrden);
    
    // Invalidate cache
    invalidateOrdenesCache();
    
    return c.json({ orden: updatedOrden });
  } catch (error) {
    console.log(`Error updating orden: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Endpoints para imágenes (base64)
app.post('/make-server-89c63dd1/ordenes/:id/imagenes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();

    // Try to get user, but make it optional
    let uploadedBy = 'Sistema';
    try {
      const { data: { user } } = await supabase.auth.getUser(accessToken!);
      if (user) {
        uploadedBy = user.user_metadata?.name || user.email || 'Usuario';
      }
    } catch (authError) {
      console.log(`Auth warning (continuing anyway): ${authError}`);
    }

    const id = c.req.param('id');
    const { tipo, base64Data, nombre, descripcion } = await c.req.json();

    console.log(`Uploading image for orden ${id}, tipo: ${tipo}, nombre: ${nombre}`);

    const orden = await kv.get(`orden:${id}`);
    if (!orden) {
      console.log(`Orden ${id} not found`);
      return c.json({ error: 'Orden not found' }, 404);
    }

    // Convert base64 to buffer
    const base64String = base64Data.split(',')[1] || base64Data;
    const buffer = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const bucketName = 'make-89c63dd1-photos';
    const fileName = `${id}/${tipo}/${Date.now()}-${nombre}`;

    console.log(`Uploading to storage: ${bucketName}/${fileName}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: base64Data.match(/^data:(.*?);/)?.[1] || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.log(`Error uploading to storage: ${uploadError.message}`);
      return c.json({ error: `Error uploading image to storage: ${uploadError.message}` }, 500);
    }

    console.log(`Image uploaded successfully, creating signed URL...`);

    // Generate signed URL (valid for 1 year)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000); // 1 year in seconds

    if (urlError) {
      console.log(`Error creating signed URL: ${urlError.message}`);
      return c.json({ error: `Error creating signed URL: ${urlError.message}` }, 500);
    }

    console.log(`Signed URL created: ${urlData.signedUrl}`);

    const imagen = {
      id: `img-${Date.now()}`,
      nombre,
      descripcion: descripcion || '',
      tipo, // 'ot' | 'pieza' | 'limpiezaEmbalaje' | 'revisionCalidad'
      url: urlData.signedUrl,
      storagePath: fileName,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
    };

    if (tipo === 'ot') {
      orden.fotografiasIncluyeOT = [...(orden.fotografiasIncluyeOT || []), imagen];
    } else if (tipo === 'pieza') {
      orden.fotografiasPiezas = [...(orden.fotografiasPiezas || []), imagen];
    } else if (tipo === 'limpiezaEmbalaje') {
      orden.fotografiasLimpiezaEmbalaje = [...(orden.fotografiasLimpiezaEmbalaje || []), imagen];
    } else if (tipo === 'revisionCalidad') {
      orden.fotografiasRevisionCalidad = [...(orden.fotografiasRevisionCalidad || []), imagen];
    }

    console.log(`Saving orden with new image...`);
    await setKV(`orden:${id}`, orden);

    // Invalidate cache since we updated an orden
    invalidateOrdenesCache();

    console.log(`Image upload complete for orden ${id}`);

    return c.json({ imagen, orden });
  } catch (error) {
    console.log(`Error uploading image: ${error}`);
    console.log(`Error stack: ${error.stack}`);
    return c.json({ error: `Internal server error: ${error.message || error}` }, 500);
  }
});

// Endpoints para documentos (base64)
app.post('/make-server-89c63dd1/ordenes/:id/documentos', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    console.log('Uploading document - parsing request...');
    const id = c.req.param('id');
    const { tipo, base64Data, nombre, mimeType } = await c.req.json();
    
    console.log(`Document upload for orden ${id}, tipo: ${tipo}, nombre: ${nombre}`);
    
    const orden = await kv.get(`orden:${id}`);
    if (!orden) {
      console.log(`Orden ${id} not found`);
      return c.json({ error: 'Orden not found' }, 404);
    }

    // Convert base64 to buffer to save in Storage instead of JSON database string (OOM Fix)
    const base64String = base64Data.split(',')[1] || base64Data;
    const buffer = Uint8Array.from(atob(base64String), char => char.charCodeAt(0));

    // Upload to Supabase Storage
    const bucketName = 'make-89c63dd1-photos';
    const fileName = `${id}/documentos/${tipo}/${Date.now()}-${nombre}`;

    console.log(`Uploading document to storage: ${bucketName}/${fileName}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: mimeType || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.log(`Error uploading document to storage: ${uploadError.message}`);
      return c.json({ error: `Error storage: ${uploadError.message}` }, 500);
    }

    // Generate signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000); // 1 year

    const documento = {
      id: `doc-${Date.now()}`,
      nombre,
      mimeType,
      url: urlData?.signedUrl || '',
      storagePath: fileName,
      uploadedAt: new Date().toISOString(),
    };

    if (tipo === 'ordenServicio') {
      orden.ordenServicio = documento;
    } else if (tipo === 'guiaSalida') {
      orden.guiaSalida = documento;
    } else if (tipo === 'informeComercial') {
      orden.informeComercial = documento;
    } else if (tipo === 'fichaComponente') {
      orden.fichaComponente = documento;
    }

    console.log(`Saving orden with new document structure...`);
    await setKV(`orden:${id}`, orden);
    
    // Invalidate cache
    invalidateOrdenesCache();
    
    // Return a lightweight response
    const lightweightResponse = {
      documento: {
        id: documento.id,
        nombre: documento.nombre,
        mimeType: documento.mimeType,
        url: documento.url,
        uploadedAt: documento.uploadedAt,
      },
      orden: {
        ...orden,
        fotografiasIncluyeOT: orden.fotografiasIncluyeOT?.map(f => ({
          id: f.id,
          nombre: f.nombre,
          uploadedAt: f.uploadedAt,
        })) || [],
        fotografiasPiezas: orden.fotografiasPiezas?.map(f => ({
          id: f.id,
          nombre: f.nombre,
          uploadedAt: f.uploadedAt,
        })) || [],
        fotografiasLimpiezaEmbalaje: orden.fotografiasLimpiezaEmbalaje?.map(f => ({
          id: f.id,
          nombre: f.nombre,
          uploadedAt: f.uploadedAt,
        })) || [],
        ordenServicio: orden.ordenServicio ? {
          id: orden.ordenServicio.id,
          nombre: orden.ordenServicio.nombre,
          mimeType: orden.ordenServicio.mimeType,
          uploadedAt: orden.ordenServicio.uploadedAt,
        } : undefined,
        guiaSalida: orden.guiaSalida ? {
          id: orden.guiaSalida.id,
          nombre: orden.guiaSalida.nombre,
          mimeType: orden.guiaSalida.mimeType,
          uploadedAt: orden.guiaSalida.uploadedAt,
        } : undefined,
        informeComercial: orden.informeComercial ? {
          id: orden.informeComercial.id,
          nombre: orden.informeComercial.nombre,
          mimeType: orden.informeComercial.mimeType,
          uploadedAt: orden.informeComercial.uploadedAt,
        } : undefined,
        fichaComponente: orden.fichaComponente ? {
          id: orden.fichaComponente.id,
          nombre: orden.fichaComponente.nombre,
          mimeType: orden.fichaComponente.mimeType,
          uploadedAt: orden.fichaComponente.uploadedAt,
        } : undefined,
      }
    };
    
    return c.json(lightweightResponse);
  } catch (error) {
    console.log(`Error uploading document: ${error}`);
    return c.json({ error: `Error uploading document: ${error.message || error}` }, 500);
  }
});

Deno.serve(app.fetch);