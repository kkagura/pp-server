import { createConnection } from 'typeorm';
import { config } from 'dotenv';
import { getVersion } from './version.mjs';
import { update1 } from './update1.mjs';
import { auth } from './auth.mjs';

config();

async function migrate() {
  const connection = await createConnection({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWD,
    database: process.env.DB_DATABASE,
  });
  await update1();
  await auth();
  connection.close();
  process.exit(0);
}

migrate().catch(console.error);
