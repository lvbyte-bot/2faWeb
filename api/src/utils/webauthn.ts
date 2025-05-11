import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';

// 应用的域名和来源
const rpID = 'localhost';
const rpName = '2FA Web';
const rpOrigin = 'http://localhost:3000';

// WebAuthn凭证相关数据库操作
export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialID: string;
  publicKey: string;
  counter: number;
  createdAt: number;
  lastUsed?: number;
  name?: string;
}

/**
 * 生成注册选项
 */
export async function generateWebAuthnRegistrationOptions(
  userId: string,
  username: string,
  existingCredentials: WebAuthnCredential[] = []
) {
  // 转换现有凭证为SimpleWebAuthn格式
  const userExistingCredentials = existingCredentials.map(cred => ({
    id: Buffer.from(cred.credentialID, 'base64url'),
    type: 'public-key' as const,
  }));

  // 生成注册选项
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: username,
    // 防止用户注册已有的凭证
    excludeCredentials: userExistingCredentials,
    // 要求用户验证（例如指纹、PIN等）
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    // 支持多种凭证类型
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  });

  return options;
}

/**
 * 验证注册响应
 */
export async function verifyWebAuthnRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  // 验证注册响应
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
  });

  return verification;
}

/**
 * 生成认证选项
 */
export async function generateWebAuthnAuthenticationOptions(
  existingCredentials: WebAuthnCredential[] = []
) {
  // 转换现有凭证为SimpleWebAuthn格式
  const allowCredentials = existingCredentials.map(cred => ({
    id: Buffer.from(cred.credentialID, 'base64url'),
    type: 'public-key' as const,
  }));

  // 生成认证选项
  const options = await generateAuthenticationOptions({
    rpID,
    // 只允许使用已注册的凭证
    allowCredentials,
    userVerification: 'preferred',
  });

  return options;
}

/**
 * 验证认证响应
 */
export async function verifyWebAuthnAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: WebAuthnCredential
): Promise<VerifiedAuthenticationResponse> {
  // 验证认证响应
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: Buffer.from(credential.credentialID, 'base64url'),
      credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
      counter: credential.counter,
    },
  });

  return verification;
}
