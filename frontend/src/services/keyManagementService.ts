/**
 * 密钥管理服务
 * 负责管理加密密钥、主密码和密钥派生
 */

import { notifications } from '@mantine/notifications';
import * as cryptoUtils from '../utils/crypto';

// 密钥存储名称
const MASTER_KEY_HASH = 'master_key_hash';
const ENCRYPTED_DATA_KEY = 'encrypted_data_key';
const ENCRYPTION_ENABLED = 'encryption_enabled';
const ENCRYPTION_VERSION = 'encryption_version';

// 当前加密版本
const CURRENT_VERSION = '1';

// 会话存储（内存中）
let sessionMasterPassword: string | null = null;
let sessionDataKey: string | null = null;

/**
 * 获取当前会话的主密码（仅用于内部操作，如备份加密）
 * @returns 当前会话的主密码，如果未解锁则返回空字符串
 */
export function getMasterPassword(): string {
  return sessionMasterPassword || '';
}

/**
 * 检查加密是否已设置
 * @returns 加密是否已设置
 */
export function isEncryptionSet(): boolean {
  return localStorage.getItem(ENCRYPTION_ENABLED) === 'true' &&
         localStorage.getItem(MASTER_KEY_HASH) !== null &&
         localStorage.getItem(ENCRYPTED_DATA_KEY) !== null;
}

/**
 * 检查是否有活跃的加密会话
 * @returns 是否有活跃的加密会话
 */
export function hasActiveEncryptionSession(): boolean {
  return sessionMasterPassword !== null && sessionDataKey !== null;
}

/**
 * 设置主密码并初始化加密
 * @param masterPassword 主密码
 * @returns 是否成功设置
 */
export async function setupEncryption(masterPassword: string): Promise<boolean> {
  try {
    // 生成随机数据密钥
    const dataKey = cryptoUtils.generateRandomKey();

    // 使用主密码加密数据密钥
    const encryptedDataKey = await cryptoUtils.encryptData(dataKey, masterPassword);

    // 计算主密码哈希（用于验证）
    const masterKeyHash = await cryptoUtils.hashData(masterPassword);

    // 存储加密信息
    localStorage.setItem(MASTER_KEY_HASH, masterKeyHash);
    localStorage.setItem(ENCRYPTED_DATA_KEY, encryptedDataKey);
    localStorage.setItem(ENCRYPTION_ENABLED, 'true');
    localStorage.setItem(ENCRYPTION_VERSION, CURRENT_VERSION);

    // 设置会话变量
    sessionMasterPassword = masterPassword;
    sessionDataKey = dataKey;

    return true;
  } catch (error) {
    console.error('设置加密失败:', error);
    return false;
  }
}

/**
 * 验证主密码
 * @param masterPassword 要验证的主密码
 * @returns 密码是否正确
 */
export async function verifyMasterPassword(masterPassword: string): Promise<boolean> {
  try {
    const storedHash = localStorage.getItem(MASTER_KEY_HASH);
    if (!storedHash) return false;

    const inputHash = await cryptoUtils.hashData(masterPassword);
    return inputHash === storedHash;
  } catch (error) {
    console.error('验证主密码失败:', error);
    return false;
  }
}

/**
 * 解锁加密（使用主密码）
 * @param masterPassword 主密码
 * @returns 是否成功解锁
 */
export async function unlockEncryption(masterPassword: string): Promise<boolean> {
  try {
    // 验证主密码
    const isValid = await verifyMasterPassword(masterPassword);
    if (!isValid) {
      return false;
    }

    // 解密数据密钥
    const encryptedDataKey = localStorage.getItem(ENCRYPTED_DATA_KEY);
    if (!encryptedDataKey) {
      return false;
    }

    const dataKey = await cryptoUtils.decryptData(encryptedDataKey, masterPassword);

    // 设置会话变量
    sessionMasterPassword = masterPassword;
    sessionDataKey = dataKey;

    return true;
  } catch (error) {
    console.error('解锁加密失败:', error);
    return false;
  }
}

/**
 * 锁定加密（清除会话密钥）
 */
export function lockEncryption(): void {
  sessionMasterPassword = null;
  sessionDataKey = null;
}

/**
 * 更改主密码
 * @param currentPassword 当前密码
 * @param newPassword 新密码
 * @returns 是否成功更改
 */
export async function changeMasterPassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    // 验证当前密码
    const isValid = await verifyMasterPassword(currentPassword);
    if (!isValid) {
      return false;
    }

    // 确保数据密钥已加载
    if (!sessionDataKey) {
      const unlocked = await unlockEncryption(currentPassword);
      if (!unlocked || !sessionDataKey) {
        return false;
      }
    }

    // 使用新密码加密数据密钥
    const encryptedDataKey = await cryptoUtils.encryptData(sessionDataKey, newPassword);

    // 计算新密码哈希
    const masterKeyHash = await cryptoUtils.hashData(newPassword);

    // 更新存储
    localStorage.setItem(MASTER_KEY_HASH, masterKeyHash);
    localStorage.setItem(ENCRYPTED_DATA_KEY, encryptedDataKey);

    // 更新会话变量
    sessionMasterPassword = newPassword;

    return true;
  } catch (error) {
    console.error('更改主密码失败:', error);
    return false;
  }
}

/**
 * 禁用加密
 * @param masterPassword 主密码（用于验证）
 * @returns 是否成功禁用
 */
export async function disableEncryption(masterPassword: string): Promise<boolean> {
  try {
    // 验证主密码
    const isValid = await verifyMasterPassword(masterPassword);
    if (!isValid) {
      return false;
    }

    // 清除加密信息
    localStorage.removeItem(MASTER_KEY_HASH);
    localStorage.removeItem(ENCRYPTED_DATA_KEY);
    localStorage.setItem(ENCRYPTION_ENABLED, 'false');

    // 清除会话变量
    sessionMasterPassword = null;
    sessionDataKey = null;

    return true;
  } catch (error) {
    console.error('禁用加密失败:', error);
    return false;
  }
}

/**
 * 加密数据
 * @param data 要加密的数据
 * @returns 加密后的数据
 */
export async function encrypt(data: string): Promise<string> {
  try {
    if (!sessionDataKey) {
      throw new Error('加密会话未激活');
    }

    return await cryptoUtils.encryptData(data, sessionDataKey);
  } catch (error) {
    console.error('加密数据失败:', error);
    throw error;
  }
}

/**
 * 解密数据
 * @param encryptedData 加密的数据
 * @returns 解密后的数据
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    if (!sessionDataKey) {
      throw new Error('加密会话未激活');
    }

    return await cryptoUtils.decryptData(encryptedData, sessionDataKey);
  } catch (error) {
    console.error('解密数据失败:', error);
    throw error;
  }
}
