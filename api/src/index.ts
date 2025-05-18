import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { accountRoutes } from './routes/accounts';
import { groupRoutes } from './routes/groups';
import { otpRoutes } from './routes/otp';
import { webAuthnRoutes } from './routes/webauthn';
import { backupRoutes } from './routes/backup';
import { initializeDatabase } from './models/db';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  FRONTEND_URL: string;
};

// 创建Hono应用
const app = new Hono<{ Bindings: Bindings }>();

// 添加CORS中间件
app.use('*', cors({
  origin: '*', // 在生产环境中应该限制为特定域名
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

// 初始化数据库
let initialized = false;
app.use('*', async (c, next) => {
  try {
    // 只在应用启动时初始化一次数据库
    if (!initialized) {
      await initializeDatabase(c.env.DB);
      initialized = true;
      console.log('数据库初始化完成');
    }
    await next();
  } catch (error) {
    console.error('初始化失败:', error);
    return c.json({ error: '服务器初始化失败' }, 500);
  }
});

// 健康检查路由
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: '2FA Web API is running',
  });
});

// 注册API路由
app.route('/api/auth', authRoutes);
app.route('/api/accounts', accountRoutes);
app.route('/api/groups', groupRoutes);
app.route('/api/otp', otpRoutes);
app.route('/api/webauthn', webAuthnRoutes);
app.route('/api/backup', backupRoutes);

export default app;
