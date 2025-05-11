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
    await expect(page.getByLabel('密码')).toBeVisible();
    await expect(page.getByLabel('确认密码')).toBeVisible();
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();
    await expect(page.getByRole('link', { name: '已有账户？登录' })).toBeVisible();
  });
  
  // 测试登录功能
  test('应该能够登录并访问仪表盘', async ({ page }) => {
    // 访问登录页面
    await page.goto('http://localhost:3000/login');
    
    // 填写登录表单
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');
    
    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click();
    
    // 等待导航到仪表盘
    await page.waitForURL('http://localhost:3000/');
    
    // 检查仪表盘页面
    await expect(page.locator('h2')).toContainText('欢迎回来');
    
    // 检查导航菜单
    await expect(page.getByText('仪表盘')).toBeVisible();
    await expect(page.getByText('账户管理')).toBeVisible();
    await expect(page.getByText('导入/导出')).toBeVisible();
    await expect(page.getByText('设置')).toBeVisible();
  });
  
  // 测试添加账户功能
  test('应该能够添加新账户', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('http://localhost:3000/');
    
    // 点击添加账户按钮
    await page.getByRole('button', { name: '添加账户' }).click();
    
    // 等待模态框出现
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // 填写账户表单
    await page.getByLabel('名称').fill('Test Account');
    await page.getByLabel('发行方').fill('Test Issuer');
    
    // 保存账户
    await page.getByRole('button', { name: '保存' }).click();
    
    // 检查是否添加成功
    await expect(page.getByText('Test Account')).toBeVisible();
    await expect(page.getByText('Test Issuer')).toBeVisible();
  });
  
  // 测试导航到账户管理页面
  test('应该能够导航到账户管理页面', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('http://localhost:3000/');
    
    // 点击账户管理链接
    await page.getByText('账户管理').click();
    
    // 等待导航到账户管理页面
    await page.waitForURL('http://localhost:3000/accounts');
    
    // 检查账户管理页面
    await expect(page.locator('h2')).toContainText('管理账户');
  });
  
  // 测试导航到导入/导出页面
  test('应该能够导航到导入/导出页面', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('http://localhost:3000/');
    
    // 点击导入/导出链接
    await page.getByText('导入/导出').click();
    
    // 等待导航到导入/导出页面
    await page.waitForURL('http://localhost:3000/import-export');
    
    // 检查导入/导出页面
    await expect(page.locator('h2')).toContainText('导入/导出');
  });
  
  // 测试导航到设置页面
  test('应该能够导航到设置页面', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('http://localhost:3000/');
    
    // 点击设置链接
    await page.getByText('设置').click();
    
    // 等待导航到设置页面
    await page.waitForURL('http://localhost:3000/settings');
    
    // 检查设置页面
    await expect(page.locator('h2')).toContainText('设置');
  });
  
  // 测试登出功能
  test('应该能够登出', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('http://localhost:3000/');
    
    // 点击登出按钮
    await page.getByRole('button', { name: '退出登录' }).click();
    
    // 等待导航到登录页面
    await page.waitForURL('http://localhost:3000/login');
    
    // 检查登录页面
    await expect(page.locator('h2')).toContainText('欢迎使用2FA Web');
  });
});
