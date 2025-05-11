import { sha256 } from 'hono/utils/crypto';

// 哈希密码
export async function hashPassword(password: string): Promise<string> {
  // 在实际应用中，应该使用更强的哈希算法和盐值
  // 这里使用简单的SHA-256作为示例
  return await sha256(password);
}

// 验证密码
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // 计算密码的哈希值并与存储的哈希值比较
  const passwordHash = await sha256(password);
  return passwordHash === hashedPassword;
}
