/**
 * 邮件发送工具函数
 * 
 * 使用Cloudflare Workers发送电子邮件
 */

/**
 * 发送电子邮件
 * @param to 收件人邮箱
 * @param subject 邮件主题
 * @param body 邮件内容（HTML格式）
 * @returns 是否发送成功
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    // 在实际应用中，这里应该调用邮件发送API
    // 例如使用Cloudflare Email Workers或第三方服务如SendGrid、Mailgun等
    
    // 目前仅模拟发送邮件，始终返回成功
    console.log(`发送邮件到 ${to}，主题：${subject}`);
    
    return true;
  } catch (error) {
    console.error('发送邮件失败:', error);
    return false;
  }
}

/**
 * 生成密码重置邮件内容
 * @param username 用户名
 * @param resetLink 重置链接
 * @returns HTML格式的邮件内容
 */
export function generatePasswordResetEmail(username: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>密码重置</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>密码重置请求</h2>
        </div>
        <p>尊敬的 ${username}，</p>
        <p>我们收到了重置您2FA Web账户密码的请求。如果这不是您发起的请求，请忽略此邮件。</p>
        <p>要重置您的密码，请点击下面的链接：</p>
        <p style="text-align: center;">
          <a href="${resetLink}" class="button">重置密码</a>
        </p>
        <p>或者复制以下链接到浏览器地址栏：</p>
        <p>${resetLink}</p>
        <p>此链接将在24小时内有效。</p>
        <p>如果您没有请求重置密码，请忽略此邮件，您的账户将保持安全。</p>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>&copy; 2FA Web</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
