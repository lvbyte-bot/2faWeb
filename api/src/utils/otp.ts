import { TOTP, HOTP } from 'otpauth';

// 创建TOTP实例
export function createTOTP(secret: string, options: {
  issuer?: string;
  label?: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
}) {
  return new TOTP({
    issuer: options.issuer || '',
    label: options.label || '',
    algorithm: options.algorithm || 'SHA1',
    digits: options.digits || 6,
    period: options.period || 30,
    secret: secret
  });
}

// 创建HOTP实例
export function createHOTP(secret: string, options: {
  issuer?: string;
  label?: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  counter?: number;
}) {
  return new HOTP({
    issuer: options.issuer || '',
    label: options.label || '',
    algorithm: options.algorithm || 'SHA1',
    digits: options.digits || 6,
    counter: options.counter || 0,
    secret: secret
  });
}

// 生成TOTP码
export function generateTOTP(secret: string, options: {
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
}) {
  const totp = createTOTP(secret, options);
  return totp.generate();
}

// 生成HOTP码
export function generateHOTP(secret: string, counter: number, options: {
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
}) {
  const hotp = createHOTP(secret, { ...options, counter });
  return hotp.generate();
}

// 验证TOTP码
export function verifyTOTP(secret: string, token: string, options: {
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
  window?: number;
}) {
  const totp = createTOTP(secret, options);
  return totp.validate({ token, window: options.window || 1 });
}

// 验证HOTP码
export function verifyHOTP(secret: string, token: string, counter: number, options: {
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  window?: number;
}) {
  const hotp = createHOTP(secret, { ...options, counter });
  return hotp.validate({ token, counter, window: options.window || 10 });
}

// 解析OTP URI
export function parseOtpUri(uri: string) {
  try {
    if (uri.startsWith('otpauth://totp/')) {
      return TOTP.parse(uri);
    } else if (uri.startsWith('otpauth://hotp/')) {
      return HOTP.parse(uri);
    }
    throw new Error('Unsupported OTP URI scheme');
  } catch (error) {
    throw new Error(`Failed to parse OTP URI: ${error.message}`);
  }
}
