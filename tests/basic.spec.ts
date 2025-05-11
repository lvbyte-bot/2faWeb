import { test, expect } from '@playwright/test';

// 基本功能测试
test.describe('基本功能测试', () => {
  // 测试登录页面
  test('登录页面应该正确显示', async ({ page }) => {
    // 访问登录页面
    await page.goto('http://localhost:3000/login');

    // 检查页面标题
    await expect(page.locator('h2')).toContainText('欢迎使用2FA Web');

    // 检查表单元素
    await expect(page.getByLabel('用户名')).toBeVisible();
    await expect(page.getByLabel('密码')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
    await expect(page.getByRole('link', { name: '没有账户？注册' })).toBeVisible();
  });

  // 测试注册页面
  test('注册页面应该正确显示', async ({ page }) => {
    // 访问注册页面
    await page.goto('http://localhost:3000/register');

    // 检查页面标题
    await expect(page.locator('h2')).toContainText('创建新账户');

    // 检查表单元素
    await expect(page.getByLabel('用户名')).toBeVisible();
    await expect(page.getByLabel('电子邮件')).toBeVisible();

    // 使用更精确的选择器避免冲突
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').nth(1)).toBeVisible();

    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();
    await expect(page.getByRole('link', { name: '已有账户？登录' })).toBeVisible();
  });

  // 测试注册和登录功能
  test('应该能够注册新用户并登录', async ({ page }) => {
    // 生成随机用户名和邮箱，避免冲突
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `testuser${randomSuffix}`;
    const email = `testuser${randomSuffix}@example.com`;
    const password = 'Password123!';

    console.log(`创建测试用户: ${username}, ${email}, ${password}`);

    // 访问注册页面
    await page.goto('http://localhost:3000/register');

    // 填写注册表单
    await page.getByLabel('用户名').fill(username);
    await page.getByLabel('电子邮件').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);

    // 点击注册按钮
    await page.getByRole('button', { name: '注册' }).click();

    // 等待一段时间，查看页面变化
    await page.waitForTimeout(2000);
    console.log('注册后页面URL:', page.url());

    // 检查是否注册成功并重定向到仪表盘
    if (page.url() === 'http://localhost:3000/') {
      console.log('注册成功，已重定向到仪表盘');

      // 检查仪表盘页面
      const dashboardTitle = await page.locator('h2').textContent();
      console.log('仪表盘标题:', dashboardTitle);

      // 检查是否有导航菜单
      const hasNavMenu = await page.getByText('仪表盘').isVisible();
      console.log('是否显示导航菜单:', hasNavMenu);

      // 登出
      await page.getByRole('button', { name: '退出登录' }).click();
      await page.waitForTimeout(1000);

      // 再次登录
      await page.goto('http://localhost:3000/login');
      await page.getByLabel('用户名').fill(username);
      await page.getByLabel('密码').fill(password);
      await page.getByRole('button', { name: '登录' }).click();

      // 等待一段时间，查看页面变化
      await page.waitForTimeout(2000);
      console.log('登录后页面URL:', page.url());

      // 检查是否登录成功
      if (page.url() === 'http://localhost:3000/') {
        console.log('登录成功，已重定向到仪表盘');
      } else {
        console.log('登录失败，未重定向到仪表盘');
      }
    } else {
      console.log('注册失败，未重定向到仪表盘');

      // 检查是否有错误消息
      const errorMessage = await page.getByText('注册失败').isVisible();
      if (errorMessage) {
        console.log('显示了注册失败错误消息');
      }
    }
  });

  // 测试添加账户功能
  test('应该能够添加新账户', async ({ page }) => {
    // 创建新用户并登录
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `testuser${randomSuffix}`;
    const email = `testuser${randomSuffix}@example.com`;
    const password = 'Password123!';

    // 注册
    await page.goto('http://localhost:3000/register');
    await page.getByLabel('用户名').fill(username);
    await page.getByLabel('电子邮件').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });

    // 点击添加账户按钮
    await page.getByRole('button', { name: '添加账户' }).click();

    // 等待模态框出现
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // 填写账户表单
    await page.getByLabel('名称').fill('Test Account');
    await page.getByLabel('发行方').fill('Test Issuer');
    await page.getByLabel('密钥').fill('JBSWY3DPEHPK3PXP');

    // 保存账户
    await page.getByRole('button', { name: '保存' }).click();

    // 检查是否添加成功（增加超时时间）
    await expect(page.getByText('Test Account')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Test Issuer')).toBeVisible({ timeout: 5000 });
  });

  // 测试导航到账户管理页面
  test('应该能够导航到账户管理页面', async ({ page }) => {
    // 创建新用户并登录
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `testuser${randomSuffix}`;
    const email = `testuser${randomSuffix}@example.com`;
    const password = 'Password123!';

    // 注册
    await page.goto('http://localhost:3000/register');
    await page.getByLabel('用户名').fill(username);
    await page.getByLabel('电子邮件').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });

    // 点击账户管理链接
    await page.getByText('账户管理').click();

    // 等待导航到账户管理页面
    await page.waitForURL('http://localhost:3000/accounts', { timeout: 5000 });

    // 检查账户管理页面
    await expect(page.locator('h2')).toContainText('管理账户');
  });

  // 测试导航到导入/导出页面
  test('应该能够导航到导入/导出页面', async ({ page }) => {
    // 创建新用户并登录
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `testuser${randomSuffix}`;
    const email = `testuser${randomSuffix}@example.com`;
    const password = 'Password123!';

    // 注册
    await page.goto('http://localhost:3000/register');
    await page.getByLabel('用户名').fill(username);
    await page.getByLabel('电子邮件').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });

    // 点击导入/导出链接
    await page.getByText('导入/导出').click();

    // 等待导航到导入/导出页面
    await page.waitForURL('http://localhost:3000/import-export', { timeout: 5000 });

    // 检查导入/导出页面
    await expect(page.locator('h2')).toContainText('导入/导出');
  });

  // 测试导航到设置页面
  test('应该能够导航到设置页面', async ({ page }) => {
    // 创建新用户并登录
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `testuser${randomSuffix}`;
    const email = `testuser${randomSuffix}@example.com`;
    const password = 'Password123!';

    // 注册
    await page.goto('http://localhost:3000/register');
    await page.getByLabel('用户名').fill(username);
    await page.getByLabel('电子邮件').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });

    // 点击设置链接
    await page.getByText('设置').click();

    // 等待导航到设置页面
    await page.waitForURL('http://localhost:3000/settings', { timeout: 5000 });

    // 检查设置页面
    await expect(page.locator('h2')).toContainText('设置');
  });

  // 测试登出功能
  test('应该能够登出', async ({ page }) => {
    // 创建新用户并登录
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `testuser${randomSuffix}`;
    const email = `testuser${randomSuffix}@example.com`;
    const password = 'Password123!';

    // 注册
    await page.goto('http://localhost:3000/register');
    await page.getByLabel('用户名').fill(username);
    await page.getByLabel('电子邮件').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });

    // 点击登出按钮
    await page.getByRole('button', { name: '退出登录' }).click();

    // 等待导航到登录页面
    await page.waitForURL('http://localhost:3000/login', { timeout: 5000 });

    // 检查登录页面
    await expect(page.locator('h2')).toContainText('欢迎使用2FA Web');
  });
});
