#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
  if ! command -v $1 &> /dev/null; then
    print_error "$1 命令未找到，请先安装。"
    exit 1
  fi
}

# 检查wrangler是否已登录
check_wrangler_login() {
  print_info "检查 Wrangler 登录状态..."
  if ! wrangler whoami &> /dev/null; then
    print_error "Wrangler 未登录，请先运行 'wrangler login'"
    exit 1
  fi
  print_success "Wrangler 已登录"
}

# 创建或获取D1数据库ID
setup_d1_database() {
  print_info "设置 D1 数据库..."

  # 检查是否已有数据库ID
  if grep -q "database_id = \"placeholder\"" api/wrangler.toml; then
    print_info "创建新的 D1 数据库..."
    DB_RESULT=$(wrangler d1 create 2fa_web_db 2>&1)
    echo "$DB_RESULT"

    # 使用正则表达式提取ID
    if [[ $DB_RESULT =~ \"uuid\"\:\ \"([a-zA-Z0-9-]+)\" ]]; then
      DB_ID="${BASH_REMATCH[1]}"
      print_success "D1 数据库创建成功，ID: $DB_ID"

      # 更新wrangler.toml
      sed -i "s/database_id = \"placeholder\"/database_id = \"$DB_ID\"/" api/wrangler.toml
      print_success "已更新 wrangler.toml 中的数据库ID"
    else
      # 尝试从输出中提取ID（备用方法）
      DB_ID=$(echo "$DB_RESULT" | grep -o '"uuid": "[a-zA-Z0-9-]*"' | grep -o '[a-zA-Z0-9-]\{36\}' || echo "")

      if [[ -n "$DB_ID" ]]; then
        print_success "D1 数据库创建成功，ID: $DB_ID"

        # 更新wrangler.toml
        sed -i "s/database_id = \"placeholder\"/database_id = \"$DB_ID\"/" api/wrangler.toml
        print_success "已更新 wrangler.toml 中的数据库ID"
      else
        # 手动输入ID
        print_warning "无法自动提取D1数据库ID，请从上面的输出中复制ID并输入："
        read -p "D1数据库ID: " DB_ID

        if [[ -n "$DB_ID" ]]; then
          # 更新wrangler.toml
          sed -i "s/database_id = \"placeholder\"/database_id = \"$DB_ID\"/" api/wrangler.toml
          print_success "已更新 wrangler.toml 中的数据库ID"
        else
          print_error "未提供有效的D1数据库ID"
          exit 1
        fi
      fi
    fi
  else
    print_info "使用现有的 D1 数据库配置"
    DB_ID=$(grep -o "database_id = \"[a-zA-Z0-9-]*\"" api/wrangler.toml | cut -d'"' -f2)
    print_info "数据库ID: $DB_ID"
  fi

  # 初始化数据库表
  print_info "初始化数据库表..."
  cd api
  # 获取数据库名称和ID
  DB_NAME=$(grep -o "database_name = \"[a-zA-Z0-9_]*\"" wrangler.toml | cut -d'"' -f2)
  DB_ID=$(grep -o "database_id = \"[a-zA-Z0-9-]*\"" wrangler.toml | cut -d'"' -f2)

  # 检查数据库ID是否为空
  if [[ -z "$DB_ID" || "$DB_ID" == "placeholder" ]]; then
    print_error "数据库ID无效，无法初始化数据库表"
    cd ..
    exit 1
  fi

  # 执行SQL脚本
  print_info "使用数据库名称: $DB_NAME, ID: $DB_ID"
  wrangler d1 execute $DB_NAME --file=./migrations/schema.sql
  cd ..
  print_success "数据库表初始化完成"
}

# 创建或获取KV命名空间ID
setup_kv_namespace() {
  print_info "设置 KV 命名空间..."

  # 检查是否已有KV命名空间ID
  if grep -q "id = \"placeholder\"" api/wrangler.toml; then
    print_info "创建新的 KV 命名空间..."
    KV_RESULT=$(wrangler kv namespace create SESSIONS 2>&1)
    echo "$KV_RESULT"

    # 使用正则表达式提取ID
    if [[ $KV_RESULT =~ \"id\"\:\ \"([a-zA-Z0-9-]+)\" ]]; then
      KV_ID="${BASH_REMATCH[1]}"
      print_success "KV 命名空间创建成功，ID: $KV_ID"

      # 更新wrangler.toml
      sed -i "s/id = \"placeholder\"/id = \"$KV_ID\"/" api/wrangler.toml
      print_success "已更新 wrangler.toml 中的KV命名空间ID"
    else
      # 尝试从输出中提取ID（备用方法）
      KV_ID=$(echo "$KV_RESULT" | grep -o '"id": "[a-zA-Z0-9-]*"' | grep -o '[a-zA-Z0-9-]\{32\}' || echo "")

      if [[ -n "$KV_ID" ]]; then
        print_success "KV 命名空间创建成功，ID: $KV_ID"

        # 更新wrangler.toml
        sed -i "s/id = \"placeholder\"/id = \"$KV_ID\"/" api/wrangler.toml
        print_success "已更新 wrangler.toml 中的KV命名空间ID"
      else
        # 手动输入ID
        print_warning "无法自动提取KV命名空间ID，请从上面的输出中复制ID并输入："
        read -p "KV命名空间ID: " KV_ID

        if [[ -n "$KV_ID" ]]; then
          # 更新wrangler.toml
          sed -i "s/id = \"placeholder\"/id = \"$KV_ID\"/" api/wrangler.toml
          print_success "已更新 wrangler.toml 中的KV命名空间ID"
        else
          print_error "未提供有效的KV命名空间ID"
          exit 1
        fi
      fi
    fi
  else
    print_info "使用现有的 KV 命名空间配置"
    KV_ID=$(grep -o "id = \"[a-zA-Z0-9-]*\"" api/wrangler.toml | cut -d'"' -f2)
    print_info "KV命名空间ID: $KV_ID"
  fi
}

# 设置JWT密钥
setup_jwt_secret() {
  print_info "设置 JWT 密钥..."

  # 检查是否使用默认JWT密钥
  if grep -q "JWT_SECRET = \"change_this_in_production\"" api/wrangler.toml; then
    # 生成随机JWT密钥
    JWT_SECRET=$(openssl rand -base64 32)
    print_success "生成了新的JWT密钥"

    # 更新wrangler.toml，处理MacOS和Linux的sed差异
    if [[ "$(uname)" == "Darwin" ]]; then
      # MacOS需要空的-i参数
      sed -i "" "s/JWT_SECRET = \"change_this_in_production\"/JWT_SECRET = \"$JWT_SECRET\"/" api/wrangler.toml
    else
      # Linux版本
      sed -i "s/JWT_SECRET = \"change_this_in_production\"/JWT_SECRET = \"$JWT_SECRET\"/" api/wrangler.toml
    fi
    print_success "已更新 wrangler.toml 中的JWT密钥"
  else
    print_info "使用现有的JWT密钥配置"
  fi
}

# 部署API
deploy_api() {
  print_info "部署后端API..."
  cd api

  # 捕获部署输出
  DEPLOY_OUTPUT=$(npm run deploy 2>&1)
  echo "$DEPLOY_OUTPUT"

  # 检查部署是否成功
  if [ $? -ne 0 ]; then
    print_error "API部署失败"
    exit 1
  fi

  # 从输出中提取完整的URL
  API_URL=$(echo "$DEPLOY_OUTPUT" | grep -o "https://[a-zA-Z0-9.-]*.workers.dev" | tail -1)

  # 如果无法从部署输出获取URL，尝试其他方法
  if [ -z "$API_URL" ]; then
    # 尝试从wrangler.toml获取
    WORKER_NAME=$(grep -o "name = \"[a-zA-Z0-9-]*\"" wrangler.toml | cut -d'"' -f2)
    ACCOUNT_ID=$(grep -o "account_id = \"[a-zA-Z0-9-]*\"" wrangler.toml | cut -d'"' -f2)

    if [ -n "$WORKER_NAME" ] && [ -n "$ACCOUNT_ID" ]; then
      API_URL="https://$WORKER_NAME.$ACCOUNT_ID.workers.dev"
    else
      # 最后的备用选项
      API_URL="https://2fa-web-api.workers.dev"
    fi
  fi

  cd ..
  print_success "API部署成功: $API_URL"

  return 0
}

# 更新前端环境变量
update_frontend_env() {
  print_info "更新前端环境变量..."

  # 创建.env.production文件
  echo "VITE_API_URL=$API_URL/api" > frontend/.env.production
  echo "VITE_APP_NAME=2FA Web" >> frontend/.env.production
  echo "VITE_ENABLE_PERFORMANCE_MONITORING=false" >> frontend/.env.production
  echo "VITE_DEBUG_MODE=false" >> frontend/.env.production

  # 确保.env.production不会被git跟踪
  if ! grep -q "frontend/.env.production" .gitignore 2>/dev/null; then
    print_info "将 frontend/.env.production 添加到 .gitignore"
    echo "" >> .gitignore
    echo "# 本地环境配置文件" >> .gitignore
    echo "frontend/.env.production" >> .gitignore
    echo "api/.env" >> .gitignore
  fi

  print_success "前端环境变量已更新"
}

# 部署前端
deploy_frontend() {
  print_info "构建前端应用..."
  npm run build:frontend

  if [ $? -ne 0 ]; then
    print_error "前端构建失败"
    exit 1
  fi

  print_success "前端构建成功"

  print_info "部署前端到Cloudflare Pages..."

  # 检查是否已创建Pages项目
  PAGES_PROJECT=$(wrangler pages project list 2>&1 | grep -o "2fa-web" || echo "")

  if [ -z "$PAGES_PROJECT" ]; then
    print_info "创建新的Pages项目..."
    wrangler pages project create 2fa-web --production-branch=main
  fi

  # 部署前端
  wrangler pages deploy frontend/dist --project-name=2fa-web

  if [ $? -ne 0 ]; then
    print_error "前端部署失败"
    exit 1
  fi

  # 获取Pages URL
  PAGES_URL=$(wrangler pages deployment list --project-name=2fa-web | grep -o "https://[a-zA-Z0-9.-]*.pages.dev" | head -1 || echo "https://2fa-web.pages.dev")

  print_success "前端部署成功: $PAGES_URL"

  # 更新API的FRONTEND_URL
  print_info "更新API的FRONTEND_URL..."
  sed -i "s|FRONTEND_URL = \"http://localhost:3000\"|FRONTEND_URL = \"$PAGES_URL\"|" api/wrangler.toml

  # 重新部署API以更新FRONTEND_URL
  print_info "重新部署API以更新CORS设置..."
  cd api
  npm run deploy
  cd ..

  print_success "API CORS设置已更新"
}

# 主函数
main() {
  print_info "开始一键部署到Cloudflare..."

  # 检查必要的命令
  check_command "wrangler"
  check_command "npm"
  check_command "sed"

  # 检查wrangler登录状态
  check_wrangler_login

  # 设置D1数据库
  setup_d1_database

  # 设置KV命名空间
  setup_kv_namespace

  # 设置JWT密钥
  setup_jwt_secret

  # 部署API
  deploy_api

  # 更新前端环境变量
  update_frontend_env

  # 部署前端
  deploy_frontend

  print_success "部署完成！"
  print_success "前端URL: $PAGES_URL"
  print_success "API URL: $API_URL"
  print_info "请访问前端URL注册账户并开始使用应用"
}

# 执行主函数
main
