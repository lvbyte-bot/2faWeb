import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 创建路由
const otpRoutes = new Hono<{ Bindings: Bindings }>();

// OTP验证模式
const otpVerifySchema = z.object({
  accountId: z.string().uuid(),
  otp: z.string().min(4).max(10),
});

// 获取特定账户的当前OTP码
otpRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  // 这里将实现获取OTP码的逻辑
  return c.json({ message: `Get OTP for account ${id} endpoint (to be implemented)` }, 501);
});

// 验证OTP码
otpRoutes.post('/verify', zValidator('json', otpVerifySchema), async (c) => {
  // 这里将实现验证OTP码的逻辑
  return c.json({ message: 'Verify OTP endpoint (to be implemented)' }, 501);
});

export { otpRoutes };
