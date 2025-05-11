import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as networkService from '../networkService';
import * as syncService from '../syncService';
import { notifications } from '@mantine/notifications';

// 模拟依赖模块
vi.mock('../syncService');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    update: vi.fn(),
  },
}));

describe('networkService', () => {
  // 保存原始的 window.addEventListener 和 window.removeEventListener
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  // 模拟事件监听器
  let onlineHandler: EventListener | null = null;
  let offlineHandler: EventListener | null = null;

  beforeEach(() => {
    // 重置所有模拟
    vi.resetAllMocks();

    // 使用假计时器
    vi.useFakeTimers();

    // 模拟 window.addEventListener
    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'online') {
        onlineHandler = handler as EventListener;
      } else if (event === 'offline') {
        offlineHandler = handler as EventListener;
      }
    });

    // 模拟 window.removeEventListener
    window.removeEventListener = vi.fn();

    // 模拟 navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    // 模拟 syncService.syncAccounts 返回一个 Promise
    vi.mocked(syncService.syncAccounts).mockResolvedValue();
  });

  afterEach(() => {
    // 恢复原始的 window.addEventListener 和 window.removeEventListener
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;

    // 清除事件处理程序
    onlineHandler = null;
    offlineHandler = null;
  });

  describe('initNetworkListeners', () => {
    it('应该添加网络状态监听器', () => {
      networkService.initNetworkListeners();

      // 验证调用
      expect(window.addEventListener).toHaveBeenCalledTimes(2);
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('removeNetworkListeners', () => {
    it('应该移除网络状态监听器', () => {
      // 先初始化监听器
      networkService.initNetworkListeners();

      // 然后移除监听器
      networkService.removeNetworkListeners();

      // 验证调用
      expect(window.removeEventListener).toHaveBeenCalledTimes(2);
      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('handleOnline', () => {
    it('应该在网络连接时显示通知并同步数据', () => {
      // 初始化监听器
      networkService.initNetworkListeners();

      // 模拟同步成功
      vi.mocked(syncService.syncAccounts).mockResolvedValue();

      // 触发在线事件
      if (onlineHandler) {
        onlineHandler(new Event('online'));
      }

      // 验证调用
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
        title: '网络已连接',
        message: '正在同步数据...',
        color: 'green',
        loading: true,
        autoClose: false,
        id: 'network-sync',
      }));

      expect(syncService.syncAccounts).toHaveBeenCalled();
    });

    it('应该在同步成功时更新通知', async () => {
      // 初始化监听器
      networkService.initNetworkListeners();

      // 模拟同步成功
      vi.mocked(syncService.syncAccounts).mockResolvedValue();

      // 触发在线事件
      if (onlineHandler) {
        onlineHandler(new Event('online'));
      }

      // 等待同步完成
      await vi.runAllTimersAsync();

      // 验证调用
      expect(notifications.update).toHaveBeenCalledWith(expect.objectContaining({
        id: 'network-sync',
        title: '同步完成',
        message: '数据已成功同步',
        color: 'green',
        loading: false,
        autoClose: 3000,
      }));
    });

    it('应该在同步失败时更新通知', async () => {
      // 初始化监听器
      networkService.initNetworkListeners();

      // 模拟同步失败
      vi.mocked(syncService.syncAccounts).mockRejectedValue(new Error('同步失败'));

      // 触发在线事件
      if (onlineHandler) {
        onlineHandler(new Event('online'));
      }

      // 等待同步完成
      await vi.runAllTimersAsync();

      // 验证调用
      expect(notifications.update).toHaveBeenCalledWith(expect.objectContaining({
        id: 'network-sync',
        title: '同步失败',
        message: '无法同步数据，请稍后重试',
        color: 'red',
        loading: false,
        autoClose: 3000,
      }));
    });
  });

  describe('handleOffline', () => {
    it('应该在网络断开时显示通知', () => {
      // 初始化监听器
      networkService.initNetworkListeners();

      // 触发离线事件
      if (offlineHandler) {
        offlineHandler(new Event('offline'));
      }

      // 验证调用
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
        title: '网络已断开',
        message: '应用将在离线模式下运行',
        color: 'yellow',
      }));
    });
  });

  describe('registerNetworkCallback', () => {
    it('应该注册网络状态变化回调', () => {
      // 创建一个模拟回调
      const mockCallback = vi.fn();

      // 注册回调
      networkService.registerNetworkCallback(mockCallback);

      // 初始化监听器
      networkService.initNetworkListeners();

      // 触发在线事件
      if (onlineHandler) {
        onlineHandler(new Event('online'));
      }

      // 验证调用
      expect(mockCallback).toHaveBeenCalledWith(true);

      // 触发离线事件
      if (offlineHandler) {
        offlineHandler(new Event('offline'));
      }

      // 验证调用
      expect(mockCallback).toHaveBeenCalledWith(false);
    });
  });

  describe('unregisterNetworkCallback', () => {
    it('应该取消注册网络状态变化回调', () => {
      // 创建一个模拟回调
      const mockCallback = vi.fn();

      // 注册回调
      networkService.registerNetworkCallback(mockCallback);

      // 取消注册回调
      networkService.unregisterNetworkCallback(mockCallback);

      // 初始化监听器
      networkService.initNetworkListeners();

      // 触发在线事件
      if (onlineHandler) {
        onlineHandler(new Event('online'));
      }

      // 验证调用
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('isOnline', () => {
    it('应该返回当前的网络状态', () => {
      // 在线状态
      Object.defineProperty(navigator, 'onLine', { value: true });
      expect(networkService.isOnline()).toBe(true);

      // 离线状态
      Object.defineProperty(navigator, 'onLine', { value: false });
      expect(networkService.isOnline()).toBe(false);
    });
  });
});
