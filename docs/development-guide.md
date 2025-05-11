# 在线二步验证器开发文档

## 项目概述

本项目旨在创建一个基于Web的二步验证器应用，使用serverless技术部署在Cloudflare上。该应用允许用户管理多个二步验证账户，支持批量导入，并提供安全的数据存储和访问机制。

## 技术栈

- **前端**：React + Vite
- **后端**：Cloudflare Workers (Serverless)
- **数据存储**：Cloudflare KV 和 D1 (SQLite)
- **认证**：WebAuthn + 密码认证
- **部署**：Cloudflare Pages

## 核心功能

1. **TOTP/HOTP 生成**
   - 符合RFC 4226 (HOTP)和RFC 6238 (TOTP)标准
   - 支持多种算法 (SHA-1, SHA-256, SHA-512)
   - 可配置的时间间隔和位数

2. **账户管理**
   - 添加、编辑、删除2FA账户
   - 分组和标签功能
   - 搜索和筛选

3. **二维码功能**
   - 扫描二维码添加账户
   - 解析非标准二维码
   - 生成二维码用于迁移

4. **数据导入/导出**
   - 支持从其他2FA应用导入 (Google Authenticator, Authy等)
   - 批量导入功能
   - 加密导出功能

5. **安全特性**
   - 端到端加密
   - WebAuthn身份验证
   - 自动锁定功能
   - OTP混淆

6. **多用户支持**
   - 用户账户管理
   - 权限控制
   - 共享实例

## 数据模型

### 用户表 (Users)
```
- id: UUID (主键)
- username: 字符串
- password_hash: 字符串 (加密存储)
- email: 字符串
- created_at: 时间戳
- last_login: 时间戳
- settings: JSON (用户偏好设置)
```

### 2FA账户表 (Accounts)
```
- id: UUID (主键)
- user_id: UUID (外键)
- name: 字符串 (账户名称)
- issuer: 字符串 (发行方)
- secret: 字符串 (加密存储)
- type: 枚举 (TOTP/HOTP)
- algorithm: 枚举 (SHA1/SHA256/SHA512)
- digits: 整数 (验证码位数)
- period: 整数 (TOTP周期，默认30秒)
- counter: 整数 (HOTP计数器)
- group_id: UUID (分组ID)
- icon: 字符串 (图标URL或Base64)
- created_at: 时间戳
- updated_at: 时间戳
```

### 分组表 (Groups)
```
- id: UUID (主键)
- user_id: UUID (外键)
- name: 字符串
- color: 字符串
- created_at: 时间戳
- updated_at: 时间戳
```

## API设计

### 认证API
- `POST /api/auth/register` - 注册新用户
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/webauthn/register` - 注册WebAuthn设备
- `POST /api/auth/webauthn/login` - WebAuthn登录

### 账户API
- `GET /api/accounts` - 获取用户所有2FA账户
- `POST /api/accounts` - 创建新2FA账户
- `GET /api/accounts/:id` - 获取单个账户详情
- `PUT /api/accounts/:id` - 更新账户信息
- `DELETE /api/accounts/:id` - 删除账户
- `POST /api/accounts/import` - 批量导入账户
- `GET /api/accounts/export` - 导出账户数据

### 分组API
- `GET /api/groups` - 获取所有分组
- `POST /api/groups` - 创建新分组
- `PUT /api/groups/:id` - 更新分组
- `DELETE /api/groups/:id` - 删除分组

### OTP API
- `GET /api/otp/:id` - 获取特定账户的当前OTP码
- `POST /api/otp/verify` - 验证OTP码

## 前端架构

### 页面结构
- 登录/注册页面
- 主面板 (显示所有2FA账户和当前码)
- 账户管理页面
- 设置页面
- 导入/导出页面
- 用户管理页面 (管理员)

### 组件设计
- OTP显示组件 (倒计时、复制功能)
- 二维码扫描组件
- 账户表单组件
- 分组管理组件
- 导入/导出向导组件
- 设置面板组件

## 安全考虑

1. **数据加密**
   - 所有敏感数据使用AES-256加密存储
   - 密钥派生使用PBKDF2或Argon2
   - 考虑使用客户端加密

2. **认证安全**
   - 支持WebAuthn作为主要认证方式
   - 密码认证作为备选
   - 实现暴力破解保护

3. **传输安全**
   - 所有API通信使用HTTPS
   - 实现CSRF保护
   - 考虑使用API密钥认证

4. **其他安全措施**
   - 自动会话超时
   - 活动日志记录
   - 可配置的安全策略

## 部署架构

1. **Cloudflare Pages**
   - 托管静态前端资源
   - 配置自定义域名和SSL

2. **Cloudflare Workers**
   - 实现无服务器API
   - 处理认证和业务逻辑

3. **Cloudflare D1**
   - 存储结构化数据
   - 用户和账户信息

4. **Cloudflare KV**
   - 存储会话信息
   - 缓存常用数据

## 开发路线图

### 阶段1: 基础架构
- 设置项目结构
- 实现基本的前端UI
- 创建核心API
- 设置数据库模型

### 阶段2: 核心功能
- 实现TOTP/HOTP生成
- 开发账户管理功能
- 添加二维码扫描
- 实现基本认证

### 阶段3: 高级功能
- 添加WebAuthn支持
- 实现数据导入/导出
- 开发分组和标签功能
- 添加搜索和筛选

### 阶段4: 安全和优化
- 实现端到端加密
- 添加自动锁定功能
- 性能优化
- 安全审计

### 阶段5: 多用户和部署
- 添加多用户支持
- 实现用户权限
- 部署到Cloudflare
- 最终测试和发布

## 开发环境设置

1. **本地开发环境**
   - Node.js 18+
   - npm 或 yarn
   - Wrangler CLI (Cloudflare Workers开发工具)

2. **开发工具**
   - VS Code 或其他IDE
   - Git 版本控制
   - ESLint 和 Prettier 代码格式化
   - Jest 测试框架

3. **本地测试**
   - 使用Wrangler进行本地Worker开发
   - 使用Vite进行前端开发
   - 模拟Cloudflare环境进行集成测试

## 下一步行动

1. 初始化项目结构
2. 设置开发环境
3. 创建基本的前端UI框架
4. 实现TOTP/HOTP生成算法
5. 设计和实现数据库模型
