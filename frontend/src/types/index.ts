// OTP账户类型定义
export interface OTPAccount {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  type: 'TOTP' | 'HOTP';
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period?: number; // TOTP 特有
  counter?: number; // HOTP 特有
  icon?: string;
  groupId?: string;
}
