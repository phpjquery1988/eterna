import { ConfigFactory } from '@nestjs/config';
import { join } from 'path';

const configFactory: ConfigFactory = () => ({
  app: {
    isProduction: process.env.NODE_ENV === 'production',
    enableCors: true,
    corsOrigins: ['http://localhost:5100', 'http://localhost:5200', 'http://108.161.138.142:5100'],
    port: parseInt(process.env.PORT, 10) || 8200,
    enableTasks: true,
    uploadsDir: join(process.cwd(), '/uploads'),
  },
  db: {
    mongoUri: `${process.env.MONGODB_URL}/${process.env.MONGODB_DB}`,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    encryptJwtSecret: process.env.ENCRYPT_JWT_SECRET,
    jwtExpirationTime: process.env.JWT_EXPIRES,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    encryptJwtRefreshSecret: process.env.ENCRYPT_JWT_REFRESH_SECRET,
    jwtRefreshExpirationTime: process.env.JWT_REFRESH_EXPIRES,
    userBlockTime: Number(process.env.USER_BLOCK_TIME) || 300,
    loginAttempts: 10,
  },
})

export default configFactory