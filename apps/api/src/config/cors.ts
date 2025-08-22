import { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:19006', // React Native development
      process.env.CLIENT_URL,
      process.env.ADMIN_URL,
      process.env.NEXT_PUBLIC_API_URL,
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Request-ID',
    'X-Language'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
  maxAge: 86400, // 24 hours
};

export default corsOptions;