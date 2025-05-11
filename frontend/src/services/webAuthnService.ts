import * as api from './api';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

/**
 * 开始WebAuthn注册流程
 * @param username 用户名
 * @returns 注册结果
 */
export async function registerWebAuthn(username: string): Promise<{ credentialID: string }> {
  try {
    // 1. 从服务器获取注册选项
    const optionsResponse = await api.post('/auth/webauthn/register/options', { username });
    const options = await optionsResponse.json();

    if (!options || optionsResponse.status !== 200) {
      throw new Error(options.error || '获取注册选项失败');
    }

    // 2. 使用浏览器API开始注册
    const registrationResponse = await startRegistration(options);

    // 3. 将注册响应发送到服务器进行验证
    const verificationResponse = await api.post('/auth/webauthn/register/verify', {
      response: registrationResponse,
    });
    const verification = await verificationResponse.json();

    if (!verification || verificationResponse.status !== 200) {
      throw new Error(verification.error || '验证注册响应失败');
    }

    return verification;
  } catch (error) {
    console.error('WebAuthn注册失败:', error);
    throw error;
  }
}

/**
 * 开始WebAuthn登录流程
 * @param username 用户名（可选，如果已登录可以不提供）
 * @returns 登录结果，包含用户信息和令牌
 */
export async function loginWithWebAuthn(username?: string): Promise<{
  user: { id: string; username: string; email: string };
  token: string;
}> {
  try {
    // 1. 从服务器获取登录选项
    const optionsResponse = await api.post('/auth/webauthn/login/options', { username });
    const options = await optionsResponse.json();

    if (!options || optionsResponse.status !== 200) {
      throw new Error(options.error || '获取登录选项失败');
    }

    // 2. 使用浏览器API开始认证
    const authenticationResponse = await startAuthentication(options);

    // 3. 将认证响应发送到服务器进行验证
    const verificationResponse = await api.post('/auth/webauthn/login/verify', {
      response: authenticationResponse,
    });
    const verification = await verificationResponse.json();

    if (!verification || verificationResponse.status !== 200) {
      throw new Error(verification.error || '验证登录响应失败');
    }

    return verification;
  } catch (error) {
    console.error('WebAuthn登录失败:', error);
    throw error;
  }
}

/**
 * 检查浏览器是否支持WebAuthn
 * @returns 是否支持WebAuthn
 */
export function isWebAuthnSupported(): boolean {
  return (
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * 检查浏览器是否支持WebAuthn平台认证器（例如指纹识别器）
 * @returns 是否支持平台认证器
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('检查平台认证器可用性失败:', error);
    return false;
  }
}

/**
 * WebAuthn凭证类型
 */
export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  createdAt: number;
  lastUsed: number | null;
  name: string;
}

/**
 * 获取用户的WebAuthn凭证列表
 * @returns 凭证列表
 */
export async function getCredentials(): Promise<WebAuthnCredential[]> {
  try {
    const response = await api.get('/webauthn/credentials');
    const data = await response.json();

    if (!data || response.status !== 200) {
      throw new Error(data.error || '获取凭证列表失败');
    }

    return data.credentials;
  } catch (error) {
    console.error('获取WebAuthn凭证列表失败:', error);
    throw error;
  }
}

/**
 * 更新WebAuthn凭证名称
 * @param id 凭证ID
 * @param name 新名称
 * @returns 更新后的凭证
 */
export async function updateCredentialName(id: string, name: string): Promise<WebAuthnCredential> {
  try {
    const response = await api.put(`/webauthn/credentials/${id}/name`, { name });
    const data = await response.json();

    if (!data || response.status !== 200) {
      throw new Error(data.error || '更新凭证名称失败');
    }

    return data.credential;
  } catch (error) {
    console.error('更新WebAuthn凭证名称失败:', error);
    throw error;
  }
}

/**
 * 删除WebAuthn凭证
 * @param id 凭证ID
 * @returns 是否删除成功
 */
export async function deleteCredential(id: string): Promise<boolean> {
  try {
    const response = await api.delete_(`/webauthn/credentials/${id}`);
    const data = await response.json();

    if (!data || response.status !== 200) {
      throw new Error(data.error || '删除凭证失败');
    }

    return true;
  } catch (error) {
    console.error('删除WebAuthn凭证失败:', error);
    throw error;
  }
}
