import { getConnection } from 'typeorm';
import { getVersion, setVersion } from './version.mjs';

export async function update2() {
  const connection = getConnection();
  const version = await getVersion();
  if (version < 2) {
    // 版本号小于 2 时，创建 file 表（若不存在）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS file (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL COMMENT '文件名',
        path VARCHAR(500) NOT NULL COMMENT '文件路径',
        md5 VARCHAR(64) NULL UNIQUE COMMENT '文件MD5值',
        size BIGINT NOT NULL COMMENT '文件大小（字节）',
        mimeType VARCHAR(100) NULL COMMENT 'MIME类型',
        parentId VARCHAR(500) NULL COMMENT '父文件夹id',
        isDirectory TINYINT NOT NULL DEFAULT 0 COMMENT '是否为文件夹：0-文件，1-文件夹',
        userId INT NULL COMMENT '上传用户ID',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_md5 (md5),
        INDEX idx_userId (userId),
        INDEX idx_isDirectory (isDirectory)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await setVersion(2);
  }
}

