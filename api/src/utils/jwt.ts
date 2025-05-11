import { sign, verify } from 'hono/jwt';

// 用户类型
export interface User {
  id: string;
  username: string;
  email: string;
}

// 生成JWT令牌
export async function generateToken(user: User, secret: string, expiresIn: number = 24 * 60 * 60): Promise<string> {
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };

  return await sign(payload, secret);
}

// 验证JWT令牌
export async function verifyToken(token: string, secret: string): Promise<User> {
  try {
    const payload = await verify(token, secret);
    
    return {
      id: payload.sub as string,
      username: payload.username as string,
      email: payload.email as string,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}
