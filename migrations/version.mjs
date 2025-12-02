import { getConnection } from 'typeorm';

/**
 * 获取当前应用版本号：
 * 1. 判断数据库中是否存在 `app_info` 表；
 * 2. 若存在，则读取表中的 `version` 字段（取第一条记录）；
 * 3. 若表不存在或没有记录，则返回 0。
 */
async function getVersion() {
  const connection = getConnection();

  // 当前连接所使用的数据库名，用于 information_schema 查询
  const dbName =
    connection.options.database ||
    (connection.options.extra && connection.options.extra.database);

  if (!dbName) {
    // 未配置数据库名时，无法通过 information_schema 判断表是否存在，直接返回 0
    return 0;
  }

  // 1. 判断 app_info 表是否存在
  const tableResult = await connection.query(
    `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'app_info'
      LIMIT 1
    `,
    [dbName],
  );

  if (!Array.isArray(tableResult) || tableResult.length === 0) {
    // 表不存在
    return 0;
  }

  // 2. 查询 app_info 表中的 version 字段（取第一条记录）
  const rows = await connection.query(
    `
      SELECT version
      FROM app_info
      LIMIT 1
    `,
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const { version } = rows[0] ?? {};

  // 防御：null / undefined 时统一返回 0
  if (version === null || version === undefined) {
    return 0;
  }

  return version;
}

/**
 * 设置当前应用版本号（假定 `app_info` 表已存在）：
 * 1. 若表中没有记录，则插入一条新记录；
 * 2. 若已有记录，则更新第一条记录的 `version` 字段。
 */
async function setVersion(version) {
  const connection = getConnection();

  // 防御：将非法或缺失的版本号统一处理为 0
  const v = Number.isFinite(Number(version)) ? Number(version) : 0;

  // 判断表中是否已有记录
  const rows = await connection.query(`
    SELECT id
    FROM app_info
    ORDER BY id ASC
    LIMIT 1;
  `);

  if (!Array.isArray(rows) || rows.length === 0) {
    // 无记录时插入新记录
    await connection.query(
      `
        INSERT INTO app_info (version)
        VALUES (?);
      `,
      [v],
    );
  } else {
    // 已有记录时更新第一条记录
    const { id } = rows[0] ?? {};
    await connection.query(
      `
        UPDATE app_info
        SET version = ?
        WHERE id = ?;
      `,
      [v, id],
    );
  }
}

export { getVersion, setVersion };
