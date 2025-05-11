// 生成随机字符串
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 生成UUID
export function generateUUID(): string {
  return crypto.randomUUID();
}

// 哈希密码（使用Web Crypto API）
export async function hashPassword(password: string): Promise<string> {
  // 在实际实现中，应该使用更安全的密码哈希算法，如Argon2
  // 这里使用SHA-256作为简单示例
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 生成JWT令牌（简化版，实际应用中应使用完整的JWT库）
export function generateJWT(payload: object, secret: string, expiresIn: number = 3600): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresIn;
  
  const tokenPayload = {
    ...payload,
    iat: now,
    exp
  };
  
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(tokenPayload));
  
  // 注意：这是一个简化的JWT实现，不包含实际的签名逻辑
  // 在生产环境中，应使用完整的JWT库
  return `${base64Header}.${base64Payload}.signature`;
}

// 验证JWT令牌（简化版）
export function verifyJWT(token: string, secret: string): object | null {
  try {
    const [headerB64, payloadB64] = token.split('.');
    
    if (!headerB64 || !payloadB64) {
      return null;
    }
    
    const payload = JSON.parse(atob(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      return null; // 令牌已过期
    }
    
    // 注意：这是一个简化的JWT验证，不包含实际的签名验证逻辑
    // 在生产环境中，应使用完整的JWT库
    return payload;
  } catch (error) {
    return null;
  }
}

// 加密数据（使用AES-GCM）
export async function encryptData(data: string, key: string): Promise<string> {
  // 在实际实现中，应该使用更安全的密钥派生函数
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const keyHash = await crypto.subtle.digest('SHA-256', keyData);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(data);
  
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    cryptoKey,
    encodedData
  );
  
  const encryptedArray = new Uint8Array(encryptedData);
  const result = new Uint8Array(iv.length + encryptedArray.length);
  result.set(iv);
  result.set(encryptedArray, iv.length);
  
  return Array.from(result, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 解密数据（使用AES-GCM）
export async function decryptData(encryptedData: string, key: string): Promise<string> {
  // 在实际实现中，应该使用更安全的密钥派生函数
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const keyData = encoder.encode(key);
  const keyHash = await crypto.subtle.digest('SHA-256', keyData);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const encryptedBytes = new Uint8Array(encryptedData.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const iv = encryptedBytes.slice(0, 12);
  const data = encryptedBytes.slice(12);
  
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    cryptoKey,
    data
  );
  
  return decoder.decode(decryptedData);
}
