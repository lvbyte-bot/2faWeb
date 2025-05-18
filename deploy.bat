@echo off
setlocal enabledelayedexpansion

:: 颜色定义
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: 打印带颜色的消息
:print_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:: 检查命令是否存在
:check_command
where %~1 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :print_error "%~1 命令未找到，请先安装。"
    exit /b 1
)
goto :eof

:: 检查wrangler是否已登录
:check_wrangler_login
call :print_info "检查 Wrangler 登录状态..."
wrangler whoami >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :print_error "Wrangler 未登录，请先运行 'wrangler login'"
    exit /b 1
)
call :print_success "Wrangler 已登录"
goto :eof

:: 主函数
:main
call :print_info "开始一键部署到Cloudflare..."

:: 检查必要的命令
call :check_command "wrangler"
call :check_command "npm"

:: 检查wrangler登录状态
call :check_wrangler_login

:: 设置D1数据库
call :print_info "设置 D1 数据库..."

:: 检查是否已有数据库ID
findstr /C:"database_id = \"placeholder\"" api\wrangler.toml >nul
if %ERRORLEVEL% equ 0 (
    call :print_info "创建新的 D1 数据库..."
    wrangler d1 create 2fa_web_db

    call :print_warning "请从上面的输出中复制D1数据库ID并输入："
    set /p DB_ID="D1数据库ID: "

    if defined DB_ID (
        call :print_success "D1 数据库创建成功，ID: !DB_ID!"

        :: 更新wrangler.toml
        powershell -Command "(Get-Content api\wrangler.toml) -replace 'database_id = \"placeholder\"', 'database_id = \"!DB_ID!\"' | Set-Content api\wrangler.toml"
        call :print_success "已更新 wrangler.toml 中的数据库ID"
    ) else (
        call :print_error "未提供有效的D1数据库ID"
        exit /b 1
    )
) else (
    call :print_info "使用现有的 D1 数据库配置"
    for /f "tokens=3 delims=\" %%a in ('findstr /C:"database_id" api\wrangler.toml') do (
        set "DB_ID=%%~a"
    )
    call :print_info "数据库ID: !DB_ID!"
)

:: 初始化数据库表
call :print_info "初始化数据库表..."
cd api
:: 获取数据库名称和ID
for /f "tokens=3 delims=\" %%a in ('findstr /C:"database_name" wrangler.toml') do (
    set "DB_NAME=%%~a"
)
for /f "tokens=3 delims=\" %%a in ('findstr /C:"database_id" wrangler.toml') do (
    set "DB_ID=%%~a"
)

:: 检查数据库ID是否为空
if "!DB_ID!"=="" (
    call :print_error "数据库ID无效，无法初始化数据库表"
    cd ..
    exit /b 1
)
if "!DB_ID!"=="placeholder" (
    call :print_error "数据库ID无效，无法初始化数据库表"
    cd ..
    exit /b 1
)

:: 执行SQL脚本
call :print_info "使用数据库名称: !DB_NAME!, ID: !DB_ID!"
wrangler d1 execute !DB_NAME! --file=./migrations/schema.sql
cd ..
call :print_success "数据库表初始化完成"

:: 设置KV命名空间
call :print_info "设置 KV 命名空间..."

:: 检查是否已有KV命名空间ID
findstr /C:"id = \"placeholder\"" api\wrangler.toml >nul
if %ERRORLEVEL% equ 0 (
    call :print_info "创建新的 KV 命名空间..."
    wrangler kv namespace create SESSIONS

    call :print_warning "请从上面的输出中复制KV命名空间ID并输入："
    set /p KV_ID="KV命名空间ID: "

    if defined KV_ID (
        call :print_success "KV 命名空间创建成功，ID: !KV_ID!"

        :: 更新wrangler.toml
        powershell -Command "(Get-Content api\wrangler.toml) -replace 'id = \"placeholder\"', 'id = \"!KV_ID!\"' | Set-Content api\wrangler.toml"
        call :print_success "已更新 wrangler.toml 中的KV命名空间ID"
    ) else (
        call :print_error "未提供有效的KV命名空间ID"
        exit /b 1
    )
) else (
    call :print_info "使用现有的 KV 命名空间配置"
    for /f "tokens=3 delims=\" %%a in ('findstr /C:"id = " api\wrangler.toml') do (
        set "KV_ID=%%~a"
    )
    call :print_info "KV命名空间ID: !KV_ID!"
)

:: 设置JWT密钥
call :print_info "设置 JWT 密钥..."

:: 检查是否使用默认JWT密钥
findstr /C:"JWT_SECRET = \"change_this_in_production\"" api\wrangler.toml >nul
if %ERRORLEVEL% equ 0 (
    :: 生成随机JWT密钥
    for /f "tokens=*" %%a in ('powershell -Command "[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"') do (
        set "JWT_SECRET=%%a"
    )
    call :print_success "生成了新的JWT密钥"

    :: 更新wrangler.toml
    powershell -Command "(Get-Content api\wrangler.toml) -replace 'JWT_SECRET = \"change_this_in_production\"', 'JWT_SECRET = \"!JWT_SECRET!\"' | Set-Content api\wrangler.toml"
    call :print_success "已更新 wrangler.toml 中的JWT密钥"
) else (
    call :print_info "使用现有的JWT密钥配置"
)

:: 部署API
call :print_info "部署后端API..."
cd api
call npm run deploy
if %ERRORLEVEL% neq 0 (
    call :print_error "API部署失败"
    exit /b 1
)

:: 获取API URL
for /f "tokens=*" %%a in ('wrangler whoami ^| findstr /C:"https://"') do (
    set "API_URL=%%a"
)
if not defined API_URL (
    set "API_URL=https://2fa-web-api.your-account.workers.dev"
)
cd ..
call :print_success "API部署成功: !API_URL!"

:: 更新前端环境变量
call :print_info "更新前端环境变量..."

:: 创建.env.production文件
echo VITE_API_URL=!API_URL!> frontend\.env.production
echo VITE_APP_NAME=2FA Web>> frontend\.env.production
echo VITE_ENABLE_PERFORMANCE_MONITORING=false>> frontend\.env.production
echo VITE_DEBUG_MODE=false>> frontend\.env.production

:: 确保.env.production不会被git跟踪
findstr /C:"frontend/.env.production" .gitignore >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :print_info "将 frontend/.env.production 添加到 .gitignore"
    echo.>> .gitignore
    echo # 本地环境配置文件>> .gitignore
    echo frontend/.env.production>> .gitignore
    echo api/.env>> .gitignore
)

call :print_success "前端环境变量已更新"

:: 部署前端
call :print_info "构建前端应用..."
call npm run build:frontend
if %ERRORLEVEL% neq 0 (
    call :print_error "前端构建失败"
    exit /b 1
)

call :print_success "前端构建成功"

call :print_info "部署前端到Cloudflare Pages..."

:: 检查是否已创建Pages项目
wrangler pages project list 2>&1 | findstr /C:"2fa-web" >nul
if %ERRORLEVEL% neq 0 (
    call :print_info "创建新的Pages项目..."
    wrangler pages project create 2fa-web --production-branch=main
)

:: 部署前端
wrangler pages deploy frontend\dist --project-name=2fa-web
if %ERRORLEVEL% neq 0 (
    call :print_error "前端部署失败"
    exit /b 1
)

:: 获取Pages URL
for /f "tokens=*" %%a in ('wrangler pages deployment list --project-name=2fa-web ^| findstr /C:"https://"') do (
    set "PAGES_URL=%%a"
    goto :got_pages_url
)
:got_pages_url
if not defined PAGES_URL (
    set "PAGES_URL=https://2fa-web.pages.dev"
)

call :print_success "前端部署成功: !PAGES_URL!"

:: 更新API的FRONTEND_URL
call :print_info "更新API的FRONTEND_URL..."
powershell -Command "(Get-Content api\wrangler.toml) -replace 'FRONTEND_URL = \"http://localhost:3000\"', 'FRONTEND_URL = \"!PAGES_URL!\"' | Set-Content api\wrangler.toml"

:: 重新部署API以更新FRONTEND_URL
call :print_info "重新部署API以更新CORS设置..."
cd api
call npm run deploy
cd ..

call :print_success "API CORS设置已更新"

call :print_success "部署完成！"
call :print_success "前端URL: !PAGES_URL!"
call :print_success "API URL: !API_URL!"
call :print_info "请访问前端URL注册账户并开始使用应用"

exit /b 0
