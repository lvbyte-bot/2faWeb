-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  last_login INTEGER,
  settings TEXT,
  CONSTRAINT username_length CHECK (length(username) >= 3 AND length(username) <= 50),
  CONSTRAINT email_format CHECK (email LIKE '%_@_%._%')
);

-- 分组表
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT name_length CHECK (length(name) >= 1 AND length(name) <= 50)
);

-- 2FA账户表
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  secret TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('TOTP', 'HOTP')),
  algorithm TEXT NOT NULL DEFAULT 'SHA1' CHECK (algorithm IN ('SHA1', 'SHA256', 'SHA512')),
  digits INTEGER NOT NULL DEFAULT 6 CHECK (digits >= 4 AND digits <= 10),
  period INTEGER CHECK (period >= 10 AND period <= 120),
  counter INTEGER CHECK (counter >= 0),
  group_id TEXT,
  icon TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
  CONSTRAINT name_length CHECK (length(name) >= 1 AND length(name) <= 100),
  CONSTRAINT issuer_length CHECK (length(issuer) >= 1 AND length(issuer) <= 100),
  CONSTRAINT totp_period CHECK ((type = 'TOTP' AND period IS NOT NULL) OR type = 'HOTP'),
  CONSTRAINT hotp_counter CHECK ((type = 'HOTP' AND counter IS NOT NULL) OR type = 'TOTP')
);

-- WebAuthn凭证表
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_group_id ON accounts(group_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
