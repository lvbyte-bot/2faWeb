import { D1Database } from '@cloudflare/workers-types';
import schemaSQL from './schema.sql';

// 初始化数据库
export async function initializeDatabase(db: D1Database): Promise<void> {
  try {
    // 执行schema.sql中的所有语句
    await db.exec(schemaSQL);
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
  }
};
