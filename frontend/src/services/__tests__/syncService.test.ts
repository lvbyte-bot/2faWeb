import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as syncService from '../syncService';
import * as indexedDBService from '../indexedDBService';
import * as accountService from '../accountService';
import { SyncStatus } from '../indexedDBService';
import type { OTPAccount } from '@/types';

// 模拟依赖模块
vi.mock('../indexedDBService');
vi.mock('../accountService');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    update: vi.fn(),
  },
}));

// 模拟syncAccounts函数
vi.mock('../syncService', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    syncAccounts: vi.fn().mockResolvedValue(undefined),
  };
});

describe('syncService', () => {
  // 测试数据
  const mockAccount: OTPAccount = {
    id: 'test-id-1',
    name: 'Test Account',
    issuer: 'Test Issuer',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    type: 'TOTP',
    period: 30,
    counter: 0,
  };

  const mockSyncedAccount = {
    ...mockAccount,
    lastModified: 1234567890,
    syncStatus: SyncStatus.SYNCED,
  };

  const mockPendingAccount = {
    ...mockAccount,
    lastModified: 1234567890,
    syncStatus: SyncStatus.PENDING,
  };

  // 在每个测试前重置模拟
  beforeEach(() => {
    vi.resetAllMocks();

    // 模拟navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOnline', () => {
    it('应该返回当前的网络状态', () => {
      // 在线状态
      Object.defineProperty(navigator, 'onLine', { value: true });
      expect(syncService.isOnline()).toBe(true);

      // 离线状态
      Object.defineProperty(navigator, 'onLine', { value: false });
      expect(syncService.isOnline()).toBe(false);
    });
  });

  describe('toSyncedAccount', () => {
    it('应该将普通账户转换为带同步信息的账户', () => {
      const result = syncService.toSyncedAccount(mockAccount);

      expect(result).toEqual({
        ...mockAccount,
        lastModified: expect.any(Number),
        syncStatus: SyncStatus.SYNCED,
      });
    });

    it('应该使用提供的同步状态', () => {
      const result = syncService.toSyncedAccount(mockAccount, SyncStatus.PENDING);

      expect(result).toEqual({
        ...mockAccount,
        lastModified: expect.any(Number),
        syncStatus: SyncStatus.PENDING,
      });
    });
  });

  describe('toOTPAccount', () => {
    it('应该将带同步信息的账户转换为普通账户', () => {
      const result = syncService.toOTPAccount(mockSyncedAccount);

      expect(result).toEqual(mockAccount);
      expect(result).not.toHaveProperty('lastModified');
      expect(result).not.toHaveProperty('syncStatus');
    });
  });

  describe('initializeLocalDB', () => {
    it('应该在本地数据库为空时从服务器获取数据', async () => {
      // 模拟本地数据库为空
      vi.mocked(indexedDBService.getAllLocalAccounts).mockResolvedValue([]);

      // 模拟服务器数据
      vi.mocked(accountService.getAllAccounts).mockResolvedValue([mockAccount]);

      await syncService.initializeLocalDB();

      // 验证调用
      expect(indexedDBService.getAllLocalAccounts).toHaveBeenCalled();
      expect(accountService.getAllAccounts).toHaveBeenCalled();
      expect(indexedDBService.saveAccount).toHaveBeenCalledWith(expect.objectContaining({
        ...mockAccount,
        lastModified: expect.any(Number),
        syncStatus: SyncStatus.SYNCED,
      }));
      expect(indexedDBService.saveLastSyncTime).toHaveBeenCalled();
    });

    it('应该在本地数据库不为空时不从服务器获取数据', async () => {
      // 模拟本地数据库不为空
      vi.mocked(indexedDBService.getAllLocalAccounts).mockResolvedValue([mockSyncedAccount]);

      await syncService.initializeLocalDB();

      // 验证调用
      expect(indexedDBService.getAllLocalAccounts).toHaveBeenCalled();
      expect(accountService.getAllAccounts).not.toHaveBeenCalled();
      expect(indexedDBService.saveAccount).not.toHaveBeenCalled();
      expect(indexedDBService.saveLastSyncTime).not.toHaveBeenCalled();
    });
  });

  describe('getAllAccounts', () => {
    it('应该从本地数据库获取账户', async () => {
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', { value: true });

      // 模拟本地数据库数据
      vi.mocked(indexedDBService.getAllLocalAccounts).mockResolvedValue([mockSyncedAccount]);

      const result = await syncService.getAllAccounts();

      // 验证调用
      expect(indexedDBService.getAllLocalAccounts).toHaveBeenCalled();

      // 验证结果
      expect(result).toEqual([mockAccount]);
    });

    it('应该在离线状态下只从本地数据库获取账户', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', { value: false });

      // 模拟本地数据库数据
      vi.mocked(indexedDBService.getAllLocalAccounts).mockResolvedValue([mockSyncedAccount]);

      const result = await syncService.getAllAccounts();

      // 验证调用
      expect(indexedDBService.getAllLocalAccounts).toHaveBeenCalled();

      // 验证结果
      expect(result).toEqual([mockAccount]);
    });
  });

  describe('createAccount', () => {
    it('应该在在线状态下创建账户到服务器并保存到本地', async () => {
      // 模拟服务器创建账户
      vi.mocked(accountService.createAccount).mockResolvedValue(mockAccount);

      const { id, ...accountData } = mockAccount;

      const result = await syncService.createAccount(accountData);

      // 验证调用
      expect(accountService.createAccount).toHaveBeenCalledWith(accountData);
      expect(indexedDBService.saveAccount).toHaveBeenCalledWith(expect.objectContaining({
        ...mockAccount,
        lastModified: expect.any(Number),
        syncStatus: SyncStatus.SYNCED,
      }));

      // 验证结果
      expect(result).toEqual(mockAccount);
    });

    it('应该在离线状态下创建临时账户并保存到本地', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', { value: false });

      const { id, ...accountData } = mockAccount;

      const result = await syncService.createAccount(accountData);

      // 验证调用
      expect(accountService.createAccount).not.toHaveBeenCalled();
      expect(indexedDBService.saveAccount).toHaveBeenCalledWith(expect.objectContaining({
        ...accountData,
        id: expect.stringContaining('temp_'),
        lastModified: expect.any(Number),
        syncStatus: SyncStatus.PENDING,
      }));

      // 验证结果
      expect(result.id).toContain('temp_');
      expect(result).toMatchObject(accountData);
    });
  });
});
