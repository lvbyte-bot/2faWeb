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

    // 检查accounts表是否存在group_id列，如果不存在则添加
    try {
      // 尝试查询accounts表中的group_id列
      await db.prepare(`SELECT group_id FROM accounts LIMIT 1`).run();
      console.log('accounts表中的group_id列已存在');
    } catch (err) {
      // 如果查询失败，说明列不存在，添加它
      console.log('accounts表中缺少group_id列，正在添加...');
      await db.prepare(`ALTER TABLE accounts ADD COLUMN group_id TEXT`).run();
      console.log('已成功添加group_id列');
    }

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
        name TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // 创建密码重置令牌表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        used INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // 创建会话表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // 创建索引
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_accounts_group_id ON accounts(group_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`).run();

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

  // 根据邮箱查找用户
  async findUserByEmail(db: D1Database, email: string) {
    return await db.prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
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
  },

  // 更新用户密码
  async updatePassword(db: D1Database, id: string, passwordHash: string): Promise<void> {
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(passwordHash, id)
      .run();
  },

  // 更新用户信息
  async updateUser(db: D1Database, id: string, updates: {
    username?: string;
    email?: string;
    settings?: string;
  }): Promise<void> {
    // 构建更新语句
    let sql = 'UPDATE users SET';
    const params: any[] = [];
    const updateParts: string[] = [];

    // 添加要更新的字段
    if (updates.username !== undefined) {
      updateParts.push(' username = ?');
      params.push(updates.username);
    }
    if (updates.email !== undefined) {
      updateParts.push(' email = ?');
      params.push(updates.email);
    }
    if (updates.settings !== undefined) {
      updateParts.push(' settings = ?');
      params.push(updates.settings);
    }

    // 如果没有要更新的字段，直接返回
    if (updateParts.length === 0) {
      return;
    }

    // 完成SQL语句
    sql += updateParts.join(',') + ' WHERE id = ?';
    params.push(id);

    // 执行更新
    await db.prepare(sql).bind(...params).run();
  },

  // 更新用户设置
  async updateUserSettings(db: D1Database, id: string, settings: string): Promise<void> {
    await db.prepare('UPDATE users SET settings = ? WHERE id = ?')
      .bind(settings, id)
      .run();
  }
};

// WebAuthn凭证相关数据库操作
export const webAuthnDb = {
  // 创建WebAuthn凭证
  async createCredential(db: D1Database, credential: {
    id: string;
    user_id: string;
    credential_id: string;
    public_key: string;
    counter: number;
    name?: string;
  }): Promise<void> {
    const now = Date.now();
    const name = credential.name || `凭证 ${credential.id.substring(0, 8)}`;
    await db.prepare(
      `INSERT INTO webauthn_credentials (id, user_id, credential_id, public_key, counter, created_at, name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(credential.id, credential.user_id, credential.credential_id, credential.public_key, credential.counter, now, name)
    .run();
  },

  // 获取用户的所有WebAuthn凭证
  async getCredentialsByUserId(db: D1Database, userId: string) {
    return await db.prepare('SELECT * FROM webauthn_credentials WHERE user_id = ?')
      .bind(userId)
      .all();
  },

  // 根据凭证ID获取凭证
  async getCredentialByCredentialId(db: D1Database, credentialId: string) {
    return await db.prepare('SELECT * FROM webauthn_credentials WHERE credential_id = ?')
      .bind(credentialId)
      .first();
  },

  // 更新凭证计数器和最后使用时间
  async updateCredentialCounter(db: D1Database, id: string, counter: number): Promise<void> {
    const now = Date.now();
    await db.prepare('UPDATE webauthn_credentials SET counter = ?, last_used = ? WHERE id = ?')
      .bind(counter, now, id)
      .run();
  },

  // 更新凭证名称
  async updateCredentialName(db: D1Database, id: string, name: string): Promise<void> {
    await db.prepare('UPDATE webauthn_credentials SET name = ? WHERE id = ?')
      .bind(name, id)
      .run();
  },

  // 删除凭证
  async deleteCredential(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM webauthn_credentials WHERE id = ?')
      .bind(id)
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

// 密码重置令牌相关数据库操作
export const passwordResetDb = {
  // 创建密码重置令牌
  async createResetToken(db: D1Database, resetToken: {
    id: string;
    user_id: string;
    token: string;
    expires_at: number;
  }): Promise<void> {
    const now = Date.now();
    await db.prepare(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at, used)
       VALUES (?, ?, ?, ?, ?, 0)`
    )
    .bind(resetToken.id, resetToken.user_id, resetToken.token, resetToken.expires_at, now)
    .run();
  },

  // 根据令牌查找密码重置记录
  async findResetTokenByToken(db: D1Database, token: string) {
    return await db.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?')
      .bind(token, Date.now())
      .first();
  },

  // 标记令牌为已使用
  async markTokenAsUsed(db: D1Database, id: string): Promise<void> {
    await db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?')
      .bind(id)
      .run();
  },

  // 清理过期的令牌
  async cleanupExpiredTokens(db: D1Database): Promise<void> {
    const now = Date.now();
    await db.prepare('DELETE FROM password_reset_tokens WHERE expires_at < ?')
      .bind(now)
      .run();
  }
};

// 会话相关数据库操作
export const sessionDb = {
  // 创建会话
  async createSession(db: D1Database, session: {
    id: string;
    user_id: string;
    token: string;
    ip_address?: string;
    user_agent?: string;
    expires_at: number;
  }): Promise<void> {
    const now = Date.now();
    await db.prepare(
      `INSERT INTO sessions (id, user_id, token, ip_address, user_agent, created_at, expires_at, last_active, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .bind(
      session.id,
      session.user_id,
      session.token,
      session.ip_address || null,
      session.user_agent || null,
      now,
      session.expires_at,
      now
    )
    .run();
  },

  // 根据令牌查找会话
  async findSessionByToken(db: D1Database, token: string) {
    return await db.prepare('SELECT * FROM sessions WHERE token = ? AND is_active = 1 AND expires_at > ?')
      .bind(token, Date.now())
      .first();
  },

  // 获取用户的所有活跃会话
  async getActiveSessions(db: D1Database, userId: string) {
    return await db.prepare('SELECT * FROM sessions WHERE user_id = ? AND is_active = 1 AND expires_at > ? ORDER BY last_active DESC')
      .bind(userId, Date.now())
      .all();
  },

  // 更新会话最后活跃时间
  async updateSessionActivity(db: D1Database, id: string): Promise<void> {
    const now = Date.now();
    await db.prepare('UPDATE sessions SET last_active = ? WHERE id = ?')
      .bind(now, id)
      .run();
  },

  // 撤销会话
  async revokeSession(db: D1Database, id: string): Promise<void> {
    await db.prepare('UPDATE sessions SET is_active = 0 WHERE id = ?')
      .bind(id)
      .run();
  },

  // 撤销用户的所有会话（除了当前会话）
  async revokeAllSessions(db: D1Database, userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ? AND id != ?')
        .bind(userId, exceptSessionId)
        .run();
    } else {
      await db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ?')
        .bind(userId)
        .run();
    }
  },

  // 清理过期的会话
  async cleanupExpiredSessions(db: D1Database): Promise<void> {
    const now = Date.now();
    await db.prepare('DELETE FROM sessions WHERE expires_at < ?')
      .bind(now)
      .run();
  }
};