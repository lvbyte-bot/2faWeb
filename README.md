# 2FA Web - 在线二步验证器

一个基于Web的二步验证器应用，使用serverless技术部署在Cloudflare上。

## 特性

- **生成密码**: 提供TOTP/HOTP安全码（一次性密码）
- **随时随地工作**: 作为Web应用，可在任何设备上使用
- **二维码扫描**: 扫描和解码二维码以添加2FA账户
- **2FA管理**: 管理您的2FA账户，使用群组组织和分类
- **数据安全**: 通过隐私、自托管、加密、WebAuthn身份验证等保护数据
- **多用户**: 支持多个用户账户
- **导入/导出**: 支持从其他2FA应用导入或导出数据

## 技术栈

- **前端**: React + Vite
- **后端**: Cloudflare Workers (Serverless)
- **数据存储**: Cloudflare KV 和 D1 (SQLite)
- **认证**: WebAuthn + 密码认证
- **部署**: Cloudflare Pages

## 开发环境设置

### 前提条件

- Node.js 18+
- npm 或 yarn
- Wrangler CLI (Cloudflare Workers开发工具)

### 安装

1. 克隆仓库:
   ```
   git clone https://github.com/yourusername/2fa-web.git
   cd 2fa-web
   ```

2. 安装依赖:
   ```
   npm install
   cd frontend && npm install
   cd ../api && npm install
   ```

3. 配置环境变量:
   - 复制`api/.env.example`为`api/.env`并填写必要的环境变量
   - 复制`frontend/.env.example`为`frontend/.env`并填写必要的环境变量

### 开发

1. 启动开发服务器:
   ```
   npm run dev
   ```

   这将同时启动前端和API服务器。

2. 访问应用:
   - 前端: http://localhost:3000
   - API: http://localhost:8787

## 部署

### Cloudflare部署

1. 登录到Cloudflare Dashboard

2. 创建D1数据库和KV命名空间

3. 更新`api/wrangler.toml`文件中的数据库ID和KV命名空间ID

4. 部署应用:
   ```
   npm run deploy
   ```

## 项目结构

```
2fa-web/
├── api/                  # 后端API (Cloudflare Workers)
│   ├── src/              # 源代码
│   │   ├── index.ts      # 入口文件
│   │   ├── routes/       # API路由
│   │   ├── models/       # 数据模型
│   │   ├── middleware/   # 中间件
│   │   └── utils/        # 工具函数
│   └── wrangler.toml     # Cloudflare配置
│
├── frontend/             # 前端应用 (React)
│   ├── public/           # 静态资源
│   └── src/              # 源代码
│       ├── components/   # 组件
│       ├── contexts/     # 上下文
│       ├── pages/        # 页面
│       ├── types/        # 类型定义
│       └── utils/        # 工具函数
│
└── docs/                 # 文档
    └── development-guide.md  # 开发指南
```

## 许可证

MIT
