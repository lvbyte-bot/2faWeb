import { D1Database } from '@cloudflare/workers-types';

// 初始化数据库
export async function initializeDatabase(db: D1Database): Promise<void> {
  try {
    // 创建用户表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        last_login INTEGER,
        settings TEXT
      )
    `).run();

    // 创建分组表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // 创建账户表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        issuer TEXT NOT NULL,
        secret TEXT NOT NULL,
        type TEXT NOT NULL,
        algorithm TEXT NOT NULL DEFAULT 'SHA1',
        digits INTEGER NOT NULL DEFAULT 6,
        period INTEGER,
        counter INTEGER,
        group_id TEXT,
        icon TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
      )
    `).run();

    // 创建WebAuthn凭证表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_used INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // 创建索引
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_accounts_group_id ON accounts(group_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id)`).run();

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

// 用户相关数据库操作
export const userDb = {
  // 创建用户
  async createUser(db: D1Database, user: {
    id: string;
    username: string;
    password_hash: string;
    email: string;
    settings?: string;
  }): Promise<void> {
    const now = Date.now();
    await db.prepare(
      `INSERT INTO users (id, username, password_hash, email, created_at, settings)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(user.id, user.username, user.password_hash, user.email, now, user.settings || null)
    .run();
  },

  // 根据用户名查找用户
  async findUserByUsername(db: D1Database, username: string) {
    return await db.prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first();
  },

  // 根据ID查找用户
  async findUserById(db: D1Database, id: string) {
    return await db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first();
  },

  // 更新用户最后登录时间
  async updateLastLogin(db: D1Database, id: string): Promise<void> {
    const now = Date.now();
    await db.prepare('UPDATE users SET last_login = ? WHERE id = ?')
      .bind(now, id)
      .run();
  }
};

// 账户相关数据库操作
export const accountDb = {
  // 创建账户
  async createAccount(db: D1Database, account: {
    id: string;
    user_id: string;
    name: string;
    issuer: string;
    secret: string;
    type: 'TOTP' | 'HOTP';
    algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
    digits?: number;
    period?: number;
    counter?: number;
    group_id?: string;
    icon?: string;
  }): Promise<void> {
    const now = Date.now();
    await db.prepare(
      `INSERT INTO accounts (
        id, user_id, name, issuer, secret, type, algorithm,
        digits, period, counter, group_id, icon, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      account.id,
      account.user_id,
      account.name,
      account.issuer,
      account.secret,
      account.type,
      account.algorithm || 'SHA1',
      account.digits || 6,
      account.period || (account.type === 'TOTP' ? 30 : null),
      account.counter || (account.type === 'HOTP' ? 0 : null),
      account.group_id || null,
      account.icon || null,
      now,
      now
    )
    .run();
  },

  // 获取用户的所有账户
  async getAccountsByUserId(db: D1Database, userId: string) {
    return await db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY name')
      .bind(userId)
      .all();
  },

  // 根据ID获取账户
  async getAccountById(db: D1Database, id: string, userId: string) {
    return await db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();
  },

  // 更新账户
  async updateAccount(db: D1Database, id: string, userId: string, account: {
    name?: string;
    issuer?: string;
    secret?: string;
    type?: 'TOTP' | 'HOTP';
    algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
    digits?: number;
    period?: number;
    counter?: number;
    group_id?: string;
    icon?: string;
  }): Promise<void> {
    const now = Date.now();

    // 构建更新语句
    let sql = 'UPDATE accounts SET updated_at = ?';
    const params: any[] = [now];

    // 添加要更新的字段
    if (account.name !== undefined) {
      sql += ', name = ?';
      params.push(account.name);
    }
    if (account.issuer !== undefined) {
      sql += ', issuer = ?';
      params.push(account.issuer);
    }
    if (account.secret !== undefined) {
      sql += ', secret = ?';
      params.push(account.secret);
    }
    if (account.type !== undefined) {
      sql += ', type = ?';
      params.push(account.type);
    }
    if (account.algorithm !== undefined) {
      sql += ', algorithm = ?';
      params.push(account.algorithm);
    }
    if (account.digits !== undefined) {
      sql += ', digits = ?';
      params.push(account.digits);
    }
    if (account.period !== undefined) {
      sql += ', period = ?';
      params.push(account.period);
    }
    if (account.counter !== undefined) {
      sql += ', counter = ?';
      params.push(account.counter);
    }
    if (account.group_id !== undefined) {
      sql += ', group_id = ?';
      params.push(account.group_id);
    }
    if (account.icon !== undefined) {
      sql += ', icon = ?';
      params.push(account.icon);
    }

    // 添加条件
    sql += ' WHERE id = ? AND user_id = ?';
    params.push(id, userId);

    // 执行更新
    await db.prepare(sql).bind(...params).run();
  },

  // 删除账户
  async deleteAccount(db: D1Database, id: string, userId: string): Promise<void> {
    await db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
  },

  // 批量导入账户
  async importAccounts(db: D1Database, accounts: Array<{
    id: string;
    user_id: string;
    name: string;
    issuer: string;
    secret: string;
    type: 'TOTP' | 'HOTP';
    algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
    digits?: number;
    period?: number;
    counter?: number;
    group_id?: string;
    icon?: string;
  }>): Promise<void> {
    // 使用事务批量插入
    await db.batch(accounts.map(account => {
      const now = Date.now();
      return db.prepare(
        `INSERT INTO accounts (
          id, user_id, name, issuer, secret, type, algorithm,
          digits, period, counter, group_id, icon, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        account.id,
        account.user_id,
        account.name,
        account.issuer,
        account.secret,
        account.type,
        account.algorithm || 'SHA1',
        account.digits || 6,
        account.period || (account.type === 'TOTP' ? 30 : null),
        account.counter || (account.type === 'HOTP' ? 0 : null),
        account.group_id || null,
        account.icon || null,
        now,
        now
      );
    }));
  }
};

// 分组相关数据库操作
export const groupDb = {
  // 创建分组
  async createGroup(db: D1Database, group: {
    id: string;
    user_id: string;
    name: string;
    color?: string;
  }): Promise<void> {
    const now = Date.now();
    await db.prepare(
      `INSERT INTO groups (id, user_id, name, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(group.id, group.user_id, group.name, group.color || null, now, now)
    .run();
  },

  // 获取用户的所有分组
  async getGroupsByUserId(db: D1Database, userId: string) {
    return await db.prepare('SELECT * FROM groups WHERE user_id = ? ORDER BY name')
      .bind(userId)
      .all();
  },

  // 根据ID获取分组
  async getGroupById(db: D1Database, id: string, userId: string) {
    return await db.prepare('SELECT * FROM groups WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();
  },

  // 更新分组
  async updateGroup(db: D1Database, id: string, userId: string, group: {
    name?: string;
    color?: string;
  }): Promise<void> {
    const now = Date.now();

    // 构建更新语句
    let sql = 'UPDATE groups SET updated_at = ?';
    const params: any[] = [now];

    // 添加要更新的字段
    if (group.name !== undefined) {
      sql += ', name = ?';
      params.push(group.name);
    }
    if (group.color !== undefined) {
      sql += ', color = ?';
      params.push(group.color);
    }

    // 添加条件
    sql += ' WHERE id = ? AND user_id = ?';
    params.push(id, userId);

    // 执行更新
    await db.prepare(sql).bind(...params).run();
  },

  // 删除分组
  async deleteGroup(db: D1Database, id: string, userId: string): Promise<void> {
    // 首先将该分组下的账户的group_id设为null
    await db.prepare('UPDATE accounts SET group_id = NULL WHERE group_id = ? AND user_id = ?')
      .bind(id, userId)
      .run();

    // 然后删除分组
    await db.prepare('DELETE FROM groups WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
  }
};
