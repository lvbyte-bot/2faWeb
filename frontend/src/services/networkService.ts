import { notifications } from '@mantine/notifications';
import * as syncService from './syncService';

// 网络状态变化回调类型
type NetworkStatusCallback = (online: boolean) => void;

// 存储注册的回调
const callbacks: NetworkStatusCallback[] = [];

// 初始化网络状态监听
export function initNetworkListeners(): void {
  // 监听在线状态变化
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

// 移除网络状态监听
export function removeNetworkListeners(): void {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
}

// 处理在线状态
function handleOnline(): void {
  console.log('网络已连接');
  
  notifications.show({
    title: '网络已连接',
    message: '正在同步数据...',
    color: 'green',
    loading: true,
    autoClose: false,
    id: 'network-sync',
  });
  
  // 执行同步
  syncService.syncAccounts()
    .then(() => {
      notifications.update({
        id: 'network-sync',
        title: '同步完成',
        message: '数据已成功同步',
        color: 'green',
        loading: false,
        autoClose: 3000,
      });
    })
    .catch(error => {
      console.error('同步失败:', error);
      notifications.update({
        id: 'network-sync',
        title: '同步失败',
        message: '无法同步数据，请稍后重试',
        color: 'red',
        loading: false,
        autoClose: 3000,
      });
    });
  
  // 通知所有注册的回调
  callbacks.forEach(callback => callback(true));
}

// 处理离线状态
function handleOffline(): void {
  console.log('网络已断开');
  
  notifications.show({
    title: '网络已断开',
    message: '应用将在离线模式下运行',
    color: 'yellow',
  });
  
  // 通知所有注册的回调
  callbacks.forEach(callback => callback(false));
}

// 注册网络状态变化回调
export function registerNetworkCallback(callback: NetworkStatusCallback): void {
  callbacks.push(callback);
}

// 取消注册网络状态变化回调
export function unregisterNetworkCallback(callback: NetworkStatusCallback): void {
  const index = callbacks.indexOf(callback);
  if (index !== -1) {
    callbacks.splice(index, 1);
  }
}

// 获取当前网络状态
export function isOnline(): boolean {
  return navigator.onLine;
}
