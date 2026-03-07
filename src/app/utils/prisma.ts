import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { envVars } from '../config/env';
import { PrismaClient } from '../../generated/prisma/client';

const pool = new pg.Pool({
  connectionString: envVars.DB_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
});

export default prisma;
