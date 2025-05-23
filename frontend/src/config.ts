/**
 * 应用配置
 */

// API基础URL - 从环境变量中获取，或使用相对路径
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// 应用版本
export const APP_VERSION = '1.0.0';

// 默认设置
export const DEFAULT_SETTINGS = {
  // 显示设置
  display: {
    showIssuer: true,
    showCopyButton: true,
    groupByIssuer: false,
    darkMode: false,
  },

  // 安全设置
  security: {
    autoLockTimeout: 5 * 60 * 1000, // 5分钟自动锁定
    hideSecrets: true,
    confirmBeforeDelete: true,
  },

  // 同步设置
  sync: {
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5分钟同步一次
  },
};

// 本地存储键
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  LAST_SYNC: 'last_sync',
  SETTINGS: 'settings',
  ENCRYPTION_ENABLED: 'encryption_enabled',
  ENCRYPTION_VERSION: 'encryption_version',
  MASTER_KEY_HASH: 'master_key_hash',
  ENCRYPTED_DATA_KEY: 'encrypted_data_key',
};

// 加密设置
export const ENCRYPTION_SETTINGS = {
  PBKDF2_ITERATIONS: 100000,
  SALT_LENGTH: 16,
  KEY_LENGTH: 32, // 256 bits
  IV_LENGTH: 12,
  AUTH_TAG_LENGTH: 16,
  HASH_ALGO: 'SHA-256',
  ENC_ALGO: 'AES-GCM',
};

// 备份设置
export const BACKUP_SETTINGS = {
  VERSION: '1.0',
  DEFAULT_FILENAME: '2fa-web-backup',
};
