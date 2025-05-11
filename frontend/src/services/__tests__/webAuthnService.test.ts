import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as webAuthnService from '../webAuthnService';
import * as api from '../api';
import { notifications } from '@mantine/notifications';

// 模拟依赖模块
vi.mock('../api');
vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// 从@simplewebauthn/browser导入模拟函数
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

describe('webAuthnService', () => {
  // 在每个测试前重置模拟
  beforeEach(() => {
    vi.resetAllMocks();

    // 模拟window.PublicKeyCredential
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: function() {},
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isWebAuthnSupported', () => {
    it('应该在浏览器支持WebAuthn时返回true', () => {
      // 确保PublicKeyCredential存在
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: function() {},
        writable: true,
      });

      expect(webAuthnService.isWebAuthnSupported()).toBe(true);
    });

    it('应该在浏览器不支持WebAuthn时返回false', () => {
      // 移除PublicKeyCredential
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
      });

      expect(webAuthnService.isWebAuthnSupported()).toBe(false);
    });
  });

  describe('registerWebAuthn', () => {
    it('应该成功注册WebAuthn凭证', async () => {
      // 模拟API响应
      const mockOptions = { challenge: 'challenge', rp: {}, user: {}, pubKeyCredParams: [] };
      const mockResponse = { json: vi.fn().mockResolvedValue(mockOptions), status: 200 };
      vi.mocked(api.post).mockResolvedValueOnce(mockResponse as any);

      // 模拟注册响应
      const mockRegistrationResponse = { id: 'credential-id', type: 'public-key' };
      vi.mocked(startRegistration).mockResolvedValueOnce(mockRegistrationResponse as any);

      // 模拟验证响应
      const mockVerification = { credentialID: 'credential-id' };
      const mockVerificationResponse = { json: vi.fn().mockResolvedValue(mockVerification), status: 200 };
      vi.mocked(api.post).mockResolvedValueOnce(mockVerificationResponse as any);

      // 调用注册函数
      const result = await webAuthnService.registerWebAuthn('testuser');

      // 验证调用
      expect(api.post).toHaveBeenCalledWith('/auth/webauthn/register/options', { username: 'testuser' });
      expect(startRegistration).toHaveBeenCalledWith(mockOptions);
      expect(api.post).toHaveBeenCalledWith('/auth/webauthn/register/verify', {
        response: mockRegistrationResponse,
      });

      // 验证结果
      expect(result).toEqual({ credentialID: 'credential-id' });
    });

    it('应该在获取选项失败时抛出错误', async () => {
      // 模拟API错误响应
      const mockErrorResponse = { json: vi.fn().mockResolvedValue({ error: '获取注册选项失败' }), status: 400 };
      vi.mocked(api.post).mockResolvedValueOnce(mockErrorResponse as any);

      // 调用注册函数并验证错误
      await expect(webAuthnService.registerWebAuthn('testuser')).rejects.toThrow('获取注册选项失败');
    });
  });

  describe('loginWithWebAuthn', () => {
    it('应该成功使用WebAuthn登录', async () => {
      // 模拟API响应
      const mockOptions = { challenge: 'challenge', allowCredentials: [] };
      const mockResponse = { json: vi.fn().mockResolvedValue(mockOptions), status: 200 };
      vi.mocked(api.post).mockResolvedValueOnce(mockResponse as any);

      // 模拟认证响应
      const mockAuthenticationResponse = { id: 'credential-id', type: 'public-key' };
      vi.mocked(startAuthentication).mockResolvedValueOnce(mockAuthenticationResponse as any);

      // 模拟验证响应
      const mockVerification = { 
        user: { id: 'user-id', username: 'testuser', email: 'test@example.com' },
        token: 'jwt-token'
      };
      const mockVerificationResponse = { json: vi.fn().mockResolvedValue(mockVerification), status: 200 };
      vi.mocked(api.post).mockResolvedValueOnce(mockVerificationResponse as any);

      // 调用登录函数
      const result = await webAuthnService.loginWithWebAuthn('testuser');

      // 验证调用
      expect(api.post).toHaveBeenCalledWith('/auth/webauthn/login/options', { username: 'testuser' });
      expect(startAuthentication).toHaveBeenCalledWith(mockOptions);
      expect(api.post).toHaveBeenCalledWith('/auth/webauthn/login/verify', {
        response: mockAuthenticationResponse,
      });

      // 验证结果
      expect(result).toEqual({
        user: { id: 'user-id', username: 'testuser', email: 'test@example.com' },
        token: 'jwt-token'
      });
    });

    it('应该在验证失败时抛出错误', async () => {
      // 模拟API响应
      const mockOptions = { challenge: 'challenge', allowCredentials: [] };
      const mockResponse = { json: vi.fn().mockResolvedValue(mockOptions), status: 200 };
      vi.mocked(api.post).mockResolvedValueOnce(mockResponse as any);

      // 模拟认证响应
      const mockAuthenticationResponse = { id: 'credential-id', type: 'public-key' };
      vi.mocked(startAuthentication).mockResolvedValueOnce(mockAuthenticationResponse as any);

      // 模拟验证错误响应
      const mockErrorResponse = { json: vi.fn().mockResolvedValue({ error: '验证登录响应失败' }), status: 400 };
      vi.mocked(api.post).mockResolvedValueOnce(mockErrorResponse as any);

      // 调用登录函数并验证错误
      await expect(webAuthnService.loginWithWebAuthn('testuser')).rejects.toThrow('验证登录响应失败');
    });
  });
});
