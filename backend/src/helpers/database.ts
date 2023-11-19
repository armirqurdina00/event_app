import { Repository, EntityTarget, DataSource, DataSourceOptions, ObjectLiteral } from 'typeorm';
import { join } from 'path';
import fs from 'fs';

// ########################################
// ########################################

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env/.dev_env' });

export class Database {
  static data_source: DataSource;
  static is_initializing: Promise<DataSource>;

  static default_config: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: false,
    ssl: {
      rejectUnauthorized: false,
      ca: fs.readFileSync(__dirname + '/ca-certificate.crt').toString(),
    },
    // dropSchema: process.env.NODE_ENV === 'DEVELOPMENT' ? true : false, // does not work due to lack of permissions
    entities: [join(__dirname, '..', 'commons', '/typeorm_entities/**/*')],
    extra: { max: Number(process.env.NUMBER_OF_DB_CONNECTIONS) },
  };

  // ########################################
  // ########################################

  static async get_repo<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Promise<Repository<Entity>> {
    await Database.init();
    return Database.data_source.getRepository<Entity>(target);
  }

  static async get_data_source(): Promise<DataSource> {
    await Database.init();
    return Database.data_source;
  }

  static async init() {
    await Database.is_initializing;

    if (!Database.data_source) {
      Database.data_source = new DataSource(Database.default_config);
      Database.is_initializing = Database.data_source.initialize();
      await Database.is_initializing;
    }
  }
}
