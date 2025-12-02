import { getConnection } from 'typeorm';
import { getVersion, setVersion } from './version.mjs';

export async function update1() {
  const connection = getConnection();
  const version = await getVersion();
  if (version < 1) {
    // 版本号小于 1 时，创建 app_info 表（若不存在）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_info (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        version INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // 创建用户表（user），如果不存在
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        username VARCHAR(64) NOT NULL UNIQUE,
        nickname VARCHAR(64) NOT NULL,
        hash VARCHAR(255) NOT NULL,
        salt VARCHAR(64) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await setVersion(1);
  }
}
