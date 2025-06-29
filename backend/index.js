require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

// Configuración de CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_session_secret_aqui',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Importar y configurar passport
const { passport } = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Importar configuración de Supabase
const { supabase, isSupabaseConfigured } = require('./config/supabase');

// Crear directorio para uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de multer para subida de avatares
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rutas
const authRoutes = require('./routes/auth');
const supabaseAuthRoutes = require('./routes/supabaseAuth');
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes); // Mount auth routes at /api/auth as well
app.use('/api', supabaseAuthRoutes);

// Endpoint para subir avatar
app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó ningún archivo' });
    }

    // Verificar token de autenticación
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Token de autenticación requerido' });
    }

    // Verificar el token y obtener el usuario
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_jwt_secret_aqui');
    } catch (error) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Construir la URL del avatar
    const avatarUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/avatars/${req.file.filename}`;

    // Actualizar el avatar en la base de datos
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('email', decoded.email);

      if (error) {
        console.error('Error updating avatar in database:', error);
        // Eliminar el archivo subido si hay error en la base de datos
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ message: 'Error al actualizar el avatar en la base de datos' });
      }
    }

    res.json({
      message: 'Avatar subido exitosamente',
      avatar_url: avatarUrl
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    // Eliminar el archivo subido si hay error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '¡API de Freelancers está funcionando!',
    version: '1.0.0',
    endpoints: {
      auth: {
        google: '/auth/google',
        github: '/auth/github',
        me: '/auth/me',
        logout: '/auth/logout',
        users: '/auth/users'
      },
      supabase: {
        profile: '/api/profile',
        verify: '/api/verify',
        freelancers: '/api/freelancers',
        clients: '/api/clients',
        stats: '/api/stats'
      }
    },
    colors: {
      primary: process.env.PRIMARY_COLOR || '#4CAF50',
      secondary: process.env.SECONDARY_COLOR || '#2C5F7F'
    }
  });
});

// Frontend configuration endpoint
app.get('/config', (req, res) => {
  res.json({
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    colors: {
      primary: process.env.PRIMARY_COLOR || '#4CAF50',
      secondary: process.env.SECONDARY_COLOR || '#2C5F7F'
    },
    auth: {
      googleEnabled: !!process.env.GOOGLE_CLIENT_ID,
      githubEnabled: !!process.env.GITHUB_CLIENT_ID
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      configured: isSupabaseConfigured
    },
    availableEndpoints: {
      auth: {
        google: '/auth/google',
        github: '/auth/github',
        me: '/auth/me',
        verifyToken: '/auth/verify-token'
      },
      supabase: {
        profile: '/api/profile',
        freelancers: '/api/freelancers',
        clients: '/api/clients',
        verifyToken: '/api/verify-token',
        userStats: '/api/user-stats'
      }
    }
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${port}`);
  console.log(`🎨 Colores: Primary ${process.env.PRIMARY_COLOR}, Secondary ${process.env.SECONDARY_COLOR}`);
  console.log(`🔐 OAuth configurado: Google ${!!process.env.GOOGLE_CLIENT_ID}, GitHub ${!!process.env.GITHUB_CLIENT_ID}`);
});