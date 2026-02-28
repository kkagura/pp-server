import { getConnection } from 'typeorm';
import { getVersion, setVersion } from './version.mjs';

export async function auth() {
  const connection = getConnection();
  const version = await getVersion();
  if (version < 2) {
    // 角色表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS role (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(64) NOT NULL COMMENT '角色名称',
        code VARCHAR(32) NULL COMMENT '角色编码',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // 角色用户关联表（多对多）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS role_user (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        role_id INT UNSIGNED NOT NULL COMMENT '角色ID',
        user_id INT UNSIGNED NOT NULL COMMENT '用户ID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_role_user (role_id, user_id),
        KEY idx_role_id (role_id),
        KEY idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // 菜单表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        parent_id INT UNSIGNED NULL COMMENT '父级菜单ID',
        name VARCHAR(64) NOT NULL COMMENT '菜单名称',
        path VARCHAR(255) NULL COMMENT '前端路由/路径',
        icon VARCHAR(64) NULL COMMENT '图标',
        sort INT NOT NULL DEFAULT 0 COMMENT '排序值，越大越靠前',
        type TINYINT NOT NULL DEFAULT 1 COMMENT '1-菜单 2-按钮',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_parent_id (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // 菜单角色关联表（多对多）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_role (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        menu_id INT UNSIGNED NOT NULL COMMENT '菜单ID',
        role_id INT UNSIGNED NOT NULL COMMENT '角色ID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_menu_role (menu_id, role_id),
        KEY idx_menu_id (menu_id),
        KEY idx_role_id (role_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await setVersion(2);
  }
}
