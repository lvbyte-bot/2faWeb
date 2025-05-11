import { TOTP, HOTP, Secret, URI } from 'otpauth';
import type { OTPAccount } from '@/types';

// 创建 TOTP 实例
export function createTOTP(account: OTPAccount) {
  return new TOTP({
    issuer: account.issuer,
    label: account.name,
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period || 30,
    secret: Secret.fromBase32(account.secret)
  });
}

// 创建 HOTP 实例
export function createHOTP(account: OTPAccount) {
  if (account.counter === undefined) {
    throw new Error('HOTP 账户必须提供计数器值');
  }

  return new HOTP({
    issuer: account.issuer,
    label: account.name,
    algorithm: account.algorithm,
    digits: account.digits,
    counter: account.counter,
    secret: Secret.fromBase32(account.secret)
  });
}

// 生成 TOTP 码
export function generateTOTP(account: OTPAccount): string {
  if (account.type !== 'TOTP') {
    throw new Error('账户类型必须是 TOTP');
  }

  const totp = createTOTP(account);
  return totp.generate();
}

// 生成 HOTP 码
export function generateHOTP(account: OTPAccount): string {
  if (account.type !== 'HOTP') {
    throw new Error('账户类型必须是 HOTP');
  }

  const hotp = createHOTP(account);
  return hotp.generate();
}

// 验证 TOTP 码
export function verifyTOTP(account: OTPAccount, token: string, window: number = 1): boolean {
  if (account.type !== 'TOTP') {
    throw new Error('账户类型必须是 TOTP');
  }

  const totp = createTOTP(account);
  return totp.validate({ token, window }) !== null;
}

// 验证 HOTP 码
export function verifyHOTP(account: OTPAccount, token: string, window: number = 10): boolean {
  if (account.type !== 'HOTP') {
    throw new Error('账户类型必须是 HOTP');
  }

  const hotp = createHOTP(account);
  return hotp.validate({ token, window }) !== null;
}

// 生成 OTP 码（自动判断类型）
export function generateOTP(account: OTPAccount): string {
  return account.type === 'TOTP' ? generateTOTP(account) : generateHOTP(account);
}

// 验证 OTP 码（自动判断类型）
export function verifyOTP(account: OTPAccount, token: string): boolean {
  return account.type === 'TOTP'
    ? verifyTOTP(account, token)
    : verifyHOTP(account, token);
}

// 解析 OTP URI
export function parseOtpUri(uri: string): OTPAccount {
  try {
    const otp = URI.parse(uri);

    // 提取标签和发行方
    let name = otp.label || '';
    let issuer = otp.issuer || '';

    // 如果标签包含发行方（格式：issuer:name），则分离它们
    if (name.includes(':') && !issuer) {
      const parts = name.split(':');
      issuer = parts[0].trim();
      name = parts[1].trim();
    }

    // 创建账户对象
    const account: OTPAccount = {
      id: crypto.randomUUID(),
      name,
      issuer,
      secret: otp.secret.base32,
      type: otp instanceof TOTP ? 'TOTP' : 'HOTP',
      algorithm: otp.algorithm as 'SHA1' | 'SHA256' | 'SHA512',
      digits: otp.digits,
    };

    // 添加特定类型的属性
    if (otp instanceof TOTP) {
      account.period = otp.period;
    } else if (otp instanceof HOTP) {
      account.counter = otp.counter;
    }

    return account;
  } catch (error: any) {
    throw new Error(`解析 OTP URI 失败: ${error.message}`);
  }
}

// 生成 OTP URI
export function generateOtpUri(account: OTPAccount): string {
  if (account.type === 'TOTP') {
    const totp = createTOTP(account);
    return totp.toString();
  } else {
    const hotp = createHOTP(account);
    return hotp.toString();
  }
}

// 生成随机密钥
export function generateRandomSecret(): string {
  const secret = new Secret();
  return secret.base32;
}

// 计算 TOTP 剩余时间（秒）
export function getRemainingSeconds(period: number = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}

// 获取当前 TOTP 周期的开始时间戳
export function getCurrentPeriodStart(period: number = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return now - (now % period);
}
