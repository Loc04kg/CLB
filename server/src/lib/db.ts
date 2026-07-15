import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

// Create connection pool using the DATABASE_URL connection string
const pool = databaseUrl ? mysql.createPool(databaseUrl) : mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '0919324589',
  database: 'hutech_clb_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
