import { join } from 'path';
import { DataSource } from 'typeorm';
import fs from 'fs';

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: process.env.NODE_ENV === 'development' ? true : false,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync(__dirname + '/ca-certificate.crt').toString(),
  },
  entities: [join(__dirname, '..', 'commons', '/typeorm_entities/**/*')],
  extra: { max: Number(process.env.NUMBER_OF_DB_CONNECTIONS) },
});
