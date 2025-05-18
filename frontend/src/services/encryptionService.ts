/**
 * 加密服务
 * 负责加密和解密应用数据，特别是OTP账户信息
 */

import { notifications } from '@mantine/notifications';
import type { OTPAccount } from '@/types';
import * as keyManagement from './keyManagementService';

// 需要加密的字段
const SENSITIVE_FIELDS = ['secret', 'name', 'issuer', 'notes'];

// 加密标记前缀
const ENCRYPTION_PREFIX = 'ENC:';

/**
 * 检查字符串是否已加密
 * @param value 要检查的字符串
 * @returns 是否已加密
 */
function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * 加密账户对象
 * @param account 要加密的账户对象
 * @returns 加密后的账户对象
 */
export async function encryptAccount(account: OTPAccount): Promise<OTPAccount> {
  try {
    // 如果加密未设置或未激活，返回原始账户
    if (!keyManagement.isEncryptionSet() || !keyManagement.hasActiveEncryptionSession()) {
      return { ...account };
    }

    const encryptedAccount = { ...account };

    // 加密敏感字段
    for (const field of SENSITIVE_FIELDS) {
      if (account[field as keyof OTPAccount] !== undefined) {
        const value = account[field as keyof OTPAccount] as string;
        
        // 如果字段已经加密，跳过
        if (isEncrypted(value)) {
          continue;
        }
        
        // 加密字段值
        const encryptedValue = ENCRYPTION_PREFIX + await keyManagement.encrypt(value);
        (encryptedAccount as any)[field] = encryptedValue;
      }
    }

    return encryptedAccount;
  } catch (error) {
    console.error('加密账户失败:', error);
    // 如果加密失败，返回原始账户
    return { ...account };
  }
}

/**
 * 解密账户对象
 * @param account 要解密的账户对象
 * @returns 解密后的账户对象
 */
export async function decryptAccount(account: OTPAccount): Promise<OTPAccount> {
  try {
    // 如果加密未设置或未激活，返回原始账户
    if (!keyManagement.isEncryptionSet() || !keyManagement.hasActiveEncryptionSession()) {
      return { ...account };
    }

    const decryptedAccount = { ...account };

    // 解密敏感字段
    for (const field of SENSITIVE_FIELDS) {
      if (account[field as keyof OTPAccount] !== undefined) {
        const value = account[field as keyof OTPAccount] as string;
        
        // 如果字段未加密，跳过
        if (!isEncrypted(value)) {
          continue;
        }
        
        // 解密字段值
        const encryptedPart = value.substring(ENCRYPTION_PREFIX.length);
        const decryptedValue = await keyManagement.decrypt(encryptedPart);
        (decryptedAccount as any)[field] = decryptedValue;
      }
    }

    return decryptedAccount;
  } catch (error) {
    console.error('解密账户失败:', error);
    // 如果解密失败，返回原始账户（可能部分字段仍然加密）
    return { ...account };
  }
}

/**
 * 批量加密账户对象
 * @param accounts 要加密的账户对象数组
 * @returns 加密后的账户对象数组
 */
export async function encryptAccounts(accounts: OTPAccount[]): Promise<OTPAccount[]> {
  const encryptedAccounts: OTPAccount[] = [];
  
  for (const account of accounts) {
    const encryptedAccount = await encryptAccount(account);
    encryptedAccounts.push(encryptedAccount);
  }
  
  return encryptedAccounts;
}

/**
 * 批量解密账户对象
 * @param accounts 要解密的账户对象数组
 * @returns 解密后的账户对象数组
 */
export async function decryptAccounts(accounts: OTPAccount[]): Promise<OTPAccount[]> {
  const decryptedAccounts: OTPAccount[] = [];
  
  for (const account of accounts) {
    const decryptedAccount = await decryptAccount(account);
    decryptedAccounts.push(decryptedAccount);
  }
  
  return decryptedAccounts;
}

/**
 * 加密导出数据
 * @param data 要加密的数据
 * @param password 加密密码
 * @returns 加密后的数据
 */
export async function encryptExportData(data: string, password: string): Promise<string> {
  try {
    // 使用提供的密码直接加密数据
    const encryptedData = await import('../utils/crypto').then(crypto => 
      crypto.encryptData(data, password)
    );
    
    // 返回带有版本信息的加密数据
    return JSON.stringify({
      version: '1',
      encrypted: true,
      data: encryptedData
    });
  } catch (error) {
    console.error('加密导出数据失败:', error);
    throw new Error('加密导出数据失败');
  }
}

/**
 * 解密导入数据
 * @param encryptedData 加密的数据
 * @param password 解密密码
 * @returns 解密后的数据
 */
export async function decryptImportData(encryptedData: string, password: string): Promise<string> {
  try {
    // 解析加密数据
    const parsed = JSON.parse(encryptedData);
    
    // 检查是否是加密数据
    if (!parsed.encrypted || !parsed.data) {
      throw new Error('无效的加密数据格式');
    }
    
    // 解密数据
    return await import('../utils/crypto').then(crypto => 
      crypto.decryptData(parsed.data, password)
    );
  } catch (error) {
    console.error('解密导入数据失败:', error);
    throw new Error('解密导入数据失败，可能是密码错误或数据已损坏');
  }
}

/**
 * 检查数据是否是加密的导出数据
 * @param data 要检查的数据
 * @returns 是否是加密的导出数据
 */
export function isEncryptedExportData(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return parsed.encrypted === true && typeof parsed.data === 'string';
  } catch (error) {
    return false;
  }
}
