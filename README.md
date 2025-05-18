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

本项目使用Cloudflare的三个主要服务进行部署：
- **Cloudflare Pages**: 用于部署前端应用
- **Cloudflare Workers**: 用于部署后端API
- **Cloudflare D1**: 用于数据库存储
- **Cloudflare KV**: 用于会话管理

#### 前提条件

1. 拥有Cloudflare账户
2. 安装Wrangler CLI工具
   ```bash
   npm install -g wrangler
   ```
3. 登录到Wrangler
   ```bash
   wrangler login
   ```

#### 步骤1: 创建Cloudflare D1数据库

1. 登录到Cloudflare Dashboard
2. 导航到"Workers & Pages" > "D1"
3. 点击"创建数据库"按钮
4. 输入数据库名称，例如"2fa_web_db"
5. 记下生成的数据库ID

或者，使用Wrangler CLI创建:
```bash
wrangler d1 create 2fa_web_db
```

#### 步骤2: 创建Cloudflare KV命名空间

1. 登录到Cloudflare Dashboard
2. 导航到"Workers & Pages" > "KV"
3. 点击"创建命名空间"按钮
4. 输入命名空间名称，例如"2fa_web_sessions"
5. 记下生成的命名空间ID

或者，使用Wrangler CLI创建:
```bash
wrangler kv:namespace create "SESSIONS"
```

#### 步骤3: 更新配置文件

1. 编辑`api/wrangler.toml`文件，更新以下内容:
   ```toml
   [vars]
   JWT_SECRET = "your_secure_jwt_secret"  # 生成一个安全的随机字符串
   FRONTEND_URL = "https://your-app-name.pages.dev"  # 你的Cloudflare Pages URL

   [[d1_databases]]
   binding = "DB"
   database_name = "2fa_web_db"
   database_id = "your_d1_database_id"  # 步骤1中获取的ID

   [[kv_namespaces]]
   binding = "SESSIONS"
   id = "your_kv_namespace_id"  # 步骤2中获取的ID
   ```

2. 创建`frontend/.env.production`文件，添加以下内容:
   ```
   VITE_API_URL=https://your-api-name.workers.dev
   ```

#### 步骤4: 初始化数据库

运行以下命令创建数据库表:
```bash
cd api
wrangler d1 execute 2fa_web_db --file=./migrations/schema.sql
```

#### 步骤5: 部署后端API

```bash
cd api
wrangler deploy
```

部署成功后，记下生成的Workers URL（例如`https://2fa-web-api.your-account.workers.dev`）。

#### 步骤6: 部署前端应用

1. 更新`frontend/.env.production`中的`VITE_API_URL`为你的Workers URL
2. 运行以下命令部署前端:
   ```bash
   # 在项目根目录
   npm run build:frontend
   ```

3. 使用Cloudflare Pages部署:
   ```bash
   # 安装Cloudflare Pages插件
   npm install -g @cloudflare/wrangler

   # 创建新的Pages项目
   wrangler pages project create 2fa-web

   # 部署
   wrangler pages deploy frontend/dist --project-name=2fa-web
   ```

或者，你可以通过Cloudflare Dashboard手动部署:
1. 登录到Cloudflare Dashboard
2. 导航到"Pages"
3. 点击"创建应用程序"
4. 选择"直接上传"选项
5. 上传`frontend/dist`目录的内容
6. 设置项目名称，例如"2fa-web"
7. 点击"保存并部署"

#### 步骤7: 配置环境变量

在Cloudflare Pages的项目设置中:
1. 导航到"设置" > "环境变量"
2. 添加以下环境变量:
   - `VITE_API_URL`: 你的Workers URL

#### 步骤8: 一键部署

配置完成后，你可以使用项目根目录的部署脚本进行一键部署:
```bash
npm run deploy
```

#### 步骤9: 验证部署

1. 访问你的Cloudflare Pages URL (例如 `https://2fa-web.pages.dev`)
2. 注册一个新账户并登录
3. 测试添加和管理2FA账户的功能
4. 验证WebAuthn认证功能是否正常工作

#### 故障排除

1. **API连接问题**:
   - 确保CORS设置正确
   - 检查`FRONTEND_URL`环境变量是否正确设置
   - 验证API URL是否正确配置在前端环境变量中

2. **数据库问题**:
   - 使用`wrangler d1 execute 2fa_web_db --command="SELECT * FROM users LIMIT 5"`检查数据库连接
   - 确保数据库ID正确配置在`wrangler.toml`中

3. **KV存储问题**:
   - 确保KV命名空间ID正确配置
   - 检查会话管理功能是否正常工作

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

## 安全特性

本项目实现了多种安全特性，以保护用户的敏感2FA数据：

### 端到端加密

- 所有敏感数据（如2FA密钥）在客户端加密后再存储到服务器
- 使用用户密码派生的密钥进行加密，服务器无法访问原始数据
- 支持加密导出和解密导入功能

### WebAuthn认证

- 支持使用生物识别（如指纹、面部识别）和安全密钥进行登录
- 遵循FIDO2标准，提供无密码认证选项
- 支持多设备注册和凭证管理

### 离线支持与数据同步

- 支持在离线状态下使用应用
- 实现了数据同步机制，在网络恢复后自动同步
- 提供冲突解决策略，确保数据一致性

### 数据备份与恢复

- 支持创建加密备份文件
- 允许选择性恢复数据
- 提供数据验证机制，确保备份完整性

## 最佳实践

### 安全建议

1. **使用强密码**：由于密码用于派生加密密钥，强密码对数据安全至关重要
2. **启用WebAuthn**：尽可能使用WebAuthn作为主要认证方式
3. **定期备份**：创建定期备份并安全存储
4. **使用私有部署**：对于高安全需求，考虑在自己控制的Cloudflare账户下部署

### 性能优化

1. **使用PWA功能**：应用支持PWA安装，提供接近原生的体验
2. **预缓存常用数据**：应用会智能缓存常用数据，提高离线性能
3. **批量操作**：对于大量账户，使用批量导入功能而非单个添加

## 贡献指南

欢迎为本项目做出贡献！以下是参与项目的一些方式：

1. **报告问题**：如果你发现bug或有功能建议，请提交issue
2. **提交PR**：欢迎提交Pull Request来修复问题或添加新功能
3. **改进文档**：帮助改进文档或添加翻译
4. **分享项目**：帮助更多人了解这个项目

### 开发指南

1. Fork仓库并克隆到本地
2. 安装依赖：`npm install`
3. 创建新分支：`git checkout -b feature/your-feature-name`
4. 进行更改并测试
5. 提交更改：`git commit -m "Add your feature"`
6. 推送到你的Fork：`git push origin feature/your-feature-name`
7. 创建Pull Request

## 路线图

以下是未来计划实现的功能：

- [ ] 多语言支持
- [ ] 高级数据分析和安全审计
- [ ] 企业级功能（团队管理、共享账户等）
- [ ] 移动应用集成
- [ ] 更多认证方式支持
- [ ] 高级备份策略（自动备份、云存储集成等）

## 许可证

MIT
