import { test, expect } from '@playwright/test';

// 增加测试超时时间
test.setTimeout(60000);

test.describe('数据同步功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问登录页面
    await page.goto('http://localhost:3000/login', { timeout: 30000 });

    console.log('已加载登录页面');

    // 等待登录表单加载完成
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    // 输入用户名和密码
    await page.getByLabel('用户名').fill('lvbyte');
    await page.getByLabel('密码').fill('Byte20071021Byte');

    console.log('已填写登录信息');

    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click();

    console.log('已点击登录按钮');

    // 等待一段时间，确保登录请求有时间处理
    await page.waitForTimeout(3000);

    // 等待导航到仪表盘
    await page.waitForURL('http://localhost:3000/dashboard', { timeout: 30000 });

    console.log('已导航到仪表盘');
  });

  test('应该显示网络状态指示器', async ({ page }) => {
    // 检查在线状态指示器是否存在
    await expect(page.getByText('在线模式')).toBeVisible();

    // 检查同步按钮是否存在
    await expect(page.locator('[data-testid="sync-button"]')).toBeVisible();
  });

  test('应该能够手动同步数据', async ({ page }) => {
    // 点击同步按钮
    await page.locator('[data-testid="sync-button"]').click();

    // 检查同步成功通知是否出现
    await expect(page.getByText('同步完成')).toBeVisible({ timeout: 5000 });
  });

  test('应该在账户管理页面显示网络状态', async ({ page }) => {
    // 点击账户管理链接
    const viewportSize = page.viewportSize();
    const isMobile = viewportSize ? viewportSize.width < 768 : false;

    if (isMobile) {
      // 点击汉堡菜单按钮
      await page.locator('button.mantine-Burger-root').first().click();
      await page.waitForTimeout(500);
    }

    // 然后点击账户管理链接
    const accountsLink = page.getByText('账户管理');
    await accountsLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // 等待滚动完成
    await accountsLink.click();

    // 检查在线状态指示器是否存在
    await expect(page.getByText('在线模式')).toBeVisible();

    // 检查同步按钮是否存在
    await expect(page.locator('[data-testid="sync-button"]')).toBeVisible();
  });

  test('应该能够在离线模式下添加账户', async ({ page, context }) => {
    // 模拟离线状态
    await context.setOffline(true);

    // 刷新页面以应用离线状态
    await page.reload();

    // 检查离线状态指示器是否存在
    await expect(page.getByText('离线模式')).toBeVisible();

    // 点击添加账户按钮
    await page.locator('[data-testid="add-account-button"]').click({ timeout: 10000 });

    // 等待一段时间，确保模态框有时间打开
    await page.waitForTimeout(2000);

    // 等待模态框内的表单元素出现
    await page.waitForSelector('input[placeholder="例如：Gmail"]', { timeout: 10000 });

    // 填写表单
    await page.getByLabel('名称').fill('离线测试账户');
    await page.getByLabel('发行方').fill('离线测试');
    await page.getByLabel('密钥').fill('JBSWY3DPEHPK3PXP');

    // 保存账户
    await page.locator('[data-testid="save-account-button"]').click();

    // 检查离线模式通知是否出现
    await expect(page.getByText('离线模式')).toBeVisible();
    await expect(page.getByText('账户已保存到本地，将在网络恢复时同步')).toBeVisible({ timeout: 5000 });

    // 恢复在线状态
    await context.setOffline(false);

    // 刷新页面以应用在线状态
    await page.reload();

    // 检查在线状态指示器是否存在
    await expect(page.getByText('在线模式')).toBeVisible();

    // 点击同步按钮
    await page.locator('[data-testid="sync-button"]').click();

    // 检查同步成功通知是否出现
    await expect(page.getByText('同步完成')).toBeVisible({ timeout: 5000 });

    // 检查离线创建的账户是否存在
    await expect(page.getByText('离线测试账户')).toBeVisible();
  });
});
