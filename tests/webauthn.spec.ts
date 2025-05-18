import { test, expect } from '@playwright/test';

// 增加测试超时时间
test.setTimeout(120000);

test.describe('WebAuthn功能测试', () => {
  // 跳过WebAuthn测试，因为它需要真实的浏览器环境和用户交互
  test.skip('WebAuthn注册和登录测试', async ({ page, browserName }) => {
    // 这个测试需要在支持WebAuthn的浏览器中运行
    // 并且需要用户交互来确认WebAuthn操作
    // 因此我们将其标记为跳过，并在需要时手动运行

    // 访问登录页面
    await page.goto('http://localhost:3000/login', { timeout: 30000 });

    // 检查WebAuthn登录按钮是否存在
    const webAuthnButton = page.getByRole('button', { name: /使用生物识别或安全密钥登录/ });
    await expect(webAuthnButton).toBeVisible();

    // 注意：以下步骤需要用户交互，无法在自动化测试中完成
    // 因此我们只检查相关元素是否存在
  });

  // 测试WebAuthn支持检测
  test('应该正确检测WebAuthn支持', async ({ page }) => {
    // 访问登录页面
    await page.goto('http://localhost:3000/login', { timeout: 30000 });

    // 检查是否显示WebAuthn登录按钮或不支持提示
    const webAuthnButton = page.getByRole('button', { name: /使用生物识别或安全密钥登录/ });
    const unsupportedAlert = page.getByText(/不支持生物识别登录/);

    // 至少应该显示其中一个（取决于浏览器是否支持WebAuthn）
    const buttonVisible = await webAuthnButton.isVisible();
    const alertVisible = await unsupportedAlert.isVisible();

    expect(buttonVisible || alertVisible).toBeTruthy();
  });

  // 测试WebAuthn设置页面
  test('应该能够访问WebAuthn设置页面', async ({ page }) => {
    // 创建新用户并登录
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `testuser${randomSuffix}`;
    const email = `testuser${randomSuffix}@example.com`;
    const password = 'Password123!';

    // 注册
    await page.goto('http://localhost:3000/register', { timeout: 30000 });
    await page.getByLabel('用户名').fill(username);
    await page.getByLabel('电子邮件').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL('http://localhost:3000/', { timeout: 30000 });

    // 导航到设置页面
    const viewportSize = page.viewportSize();
    const isMobile = viewportSize ? viewportSize.width < 768 : false;

    if (isMobile) {
      // 点击汉堡菜单按钮
      await page.locator('button.mantine-Burger-root').first().click();
      await page.waitForTimeout(500);
    }

    // 点击设置链接
    const settingsLink = page.getByText('设置');
    await settingsLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // 等待滚动完成
    await settingsLink.click();

    // 等待导航到设置页面
    await page.waitForURL('http://localhost:3000/settings', { timeout: 15000 });

    // 点击WebAuthn设置链接
    await page.getByRole('button', { name: '设置生物识别登录' }).click();

    // 等待导航到WebAuthn设置页面
    await page.waitForURL('http://localhost:3000/webauthn', { timeout: 15000 });

    // 检查WebAuthn设置页面
    await expect(page.locator('h2')).toContainText('WebAuthn 设置');

    // 检查注册按钮是否存在
    const registerButton = page.getByRole('button', { name: '注册新凭证' });

    // 根据浏览器支持情况，按钮可能启用或禁用
    await expect(registerButton).toBeVisible();
  });
});
