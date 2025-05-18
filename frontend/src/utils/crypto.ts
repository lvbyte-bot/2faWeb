/**
 * 加密工具函数
 * 提供基于Web Crypto API的加密和解密功能
 */

// 密钥派生参数
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// 算法参数
const HASH_ALGO = 'SHA-256';
const ENC_ALGO = 'AES-GCM';

/**
 * 从密码派生加密密钥
 * @param password 用户密码
 * @param salt 盐值（如果不提供，将生成新的盐值）
 * @returns 派生的密钥和使用的盐值
 */
export async function deriveKey(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  // 如果没有提供盐值，生成新的随机盐值
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }

  // 从密码中派生密钥
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // 导入密码作为原始密钥材料
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 使用PBKDF2派生AES-GCM密钥
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO
    },
    baseKey,
    { name: ENC_ALGO, length: KEY_LENGTH * 8 },
    true,
    ['encrypt', 'decrypt']
  );

  return { key, salt };
}

/**
 * 加密数据
 * @param data 要加密的数据
 * @param password 用于加密的密码
 * @returns 加密后的数据（包含盐值和IV）
 */
export async function encryptData(data: string, password: string): Promise<string> {
  // 从密码派生密钥
  const { key, salt } = await deriveKey(password);

  // 生成随机IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // 加密数据
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ENC_ALGO,
      iv
    },
    key,
    dataBuffer
  );

  // 将盐值、IV和加密数据组合成一个数组
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(encryptedArray, salt.length + iv.length);

  // 转换为Base64字符串
  return btoa(String.fromCharCode(...result));
}

/**
 * 解密数据
 * @param encryptedData Base64编码的加密数据
 * @param password 用于解密的密码
 * @returns 解密后的数据
 */
export async function decryptData(encryptedData: string, password: string): Promise<string> {
  try {
    // 将Base64字符串转换为Uint8Array
    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // 提取盐值、IV和加密数据
    const salt = encryptedBytes.slice(0, SALT_LENGTH);
    const iv = encryptedBytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const data = encryptedBytes.slice(SALT_LENGTH + IV_LENGTH);

    // 从密码和盐值派生密钥
    const { key } = await deriveKey(password, salt);

    // 解密数据
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ENC_ALGO,
        iv
      },
      key,
      data
    );

    // 将解密后的数据转换为字符串
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error('解密失败，可能是密码错误或数据已损坏');
  }
}

/**
 * 生成随机密钥
 * @returns 随机生成的Base64编码密钥
 */
export function generateRandomKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  return btoa(String.fromCharCode(...keyBytes));
}

/**
 * 检查密码强度
 * @param password 要检查的密码
 * @returns 密码强度评分（0-100）和反馈信息
 */
export function checkPasswordStrength(password: string): { score: number; feedback: string } {
  if (!password) {
    return { score: 0, feedback: '请输入密码' };
  }

  let score = 0;
  const feedback: string[] = [];

  // 长度检查
  if (password.length < 8) {
    feedback.push('密码太短');
  } else if (password.length >= 12) {
    score += 25;
  } else {
    score += 10;
  }

  // 复杂性检查
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  // 多样性检查
  const uniqueChars = new Set(password.split('')).size;
  score += Math.min(20, uniqueChars * 2);

  // 反馈
  if (!/[a-z]/.test(password)) feedback.push('添加小写字母');
  if (!/[A-Z]/.test(password)) feedback.push('添加大写字母');
  if (!/[0-9]/.test(password)) feedback.push('添加数字');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('添加特殊字符');

  // 确保分数在0-100范围内
  score = Math.min(100, Math.max(0, score));

  return {
    score,
    feedback: feedback.length > 0 ? feedback.join('，') : '密码强度良好'
  };
}

/**
 * 哈希数据（用于非敏感数据）
 * @param data 要哈希的数据
 * @returns 哈希值（十六进制字符串）
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest(HASH_ALGO, dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
