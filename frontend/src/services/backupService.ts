/**
 * 备份服务
 * 负责创建和恢复应用数据备份
 */

import { notifications } from '@mantine/notifications';
import * as encryptionService from './encryptionService';
import * as keyManagement from './keyManagementService';
import { API_BASE_URL, BACKUP_SETTINGS } from '../config';

// 备份版本
const BACKUP_VERSION = BACKUP_SETTINGS.VERSION;

// 备份类型定义
export interface Backup {
  accounts: Array<{
    id?: string;
    name: string;
    issuer?: string;
    secret: string;
    type: 'TOTP' | 'HOTP';
    algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
    digits?: number;
    period?: number;
    counter?: number;
    groupId?: string;
    icon?: string;
  }>;
  groups?: Array<{
    id?: string;
    name: string;
    color?: string;
  }>;
  settings?: Record<string, any>;
  version: string;
  timestamp: number;
}

// 恢复选项
export interface RestoreOptions {
  overwriteExisting?: boolean;
  mergeSettings?: boolean;
}

/**
 * 创建完整备份
 * @returns 备份数据对象
 */
export async function createBackup(): Promise<Backup> {
  try {
    // 获取认证令牌
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录，无法创建备份');
    }

    // 调用API创建备份
    const response = await fetch(`${API_BASE_URL}/backup/create`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '创建备份失败');
    }

    // 解析备份数据
    const backupData = await response.json();
    return backupData;
  } catch (error) {
    console.error('创建备份失败:', error);
    throw error;
  }
}

/**
 * 下载备份文件
 * @param backup 备份数据
 * @param encryptBackup 是否加密备份
 * @param password 加密密码（如果加密）
 */
export async function downloadBackup(
  backup: Backup,
  encryptBackup: boolean = true,
  password?: string
): Promise<void> {
  try {
    // 准备备份数据
    let data = JSON.stringify(backup, null, 2);
    let fileName = `${BACKUP_SETTINGS.DEFAULT_FILENAME}-${new Date().toISOString().split('T')[0]}`;
    let fileType = 'application/json';

    // 如果启用加密，加密数据
    if (encryptBackup) {
      if (!password && keyManagement.hasActiveEncryptionSession()) {
        // 如果没有提供密码但有活跃的加密会话，使用主密码
        const masterPassword = keyManagement.getMasterPassword();
        if (masterPassword) {
          data = await encryptionService.encryptExportData(data, masterPassword);
        } else {
          throw new Error('加密会话未激活，无法使用主密码');
        }
      } else if (password) {
        // 使用提供的密码加密
        data = await encryptionService.encryptExportData(data, password);
      } else {
        throw new Error('需要密码来加密备份');
      }
      fileName += '.encrypted';
    }

    // 创建并下载文件
    const blob = new Blob([data], { type: fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return;
  } catch (error) {
    console.error('下载备份失败:', error);
    throw error;
  }
}

/**
 * 解析备份文件
 * @param file 备份文件
 * @param password 解密密码（如果文件已加密）
 * @returns 解析后的备份数据
 */
export async function parseBackupFile(file: File, password?: string): Promise<Backup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        if (!event.target || !event.target.result) {
          reject(new Error('读取文件失败'));
          return;
        }

        let content = event.target.result as string;
        console.log(`解析备份文件: 大小=${file.size}字节, 类型=${file.type}`);

        // 检查是否是加密的备份文件
        let isEncrypted = false;
        try {
          isEncrypted = encryptionService.isEncryptedExportData(content);
          console.log(`备份文件加密状态: ${isEncrypted ? '已加密' : '未加密'}`);

          if (isEncrypted) {
            if (!password) {
              reject(new Error('此文件已加密，请提供密码'));
              return;
            }

            try {
              // 尝试解密文件
              content = await encryptionService.decryptImportData(content, password);
              console.log('备份文件解密成功');
            } catch (decryptError) {
              console.error('解密文件失败:', decryptError);
              reject(new Error('解密文件失败，可能是密码错误'));
              return;
            }
          }
        } catch (encryptionCheckError) {
          // 不是加密文件，继续处理
          console.log('检查加密状态出错，继续处理:', encryptionCheckError);
        }

        // 尝试解析为 JSON
        try {
          const backup = JSON.parse(content);
          console.log('备份文件JSON解析成功');

          // 验证备份格式
          if (!backup.accounts) {
            reject(new Error('无效的备份文件格式: 缺少accounts字段'));
            return;
          }

          if (!Array.isArray(backup.accounts)) {
            reject(new Error('无效的备份文件格式: accounts不是数组'));
            return;
          }

          if (!backup.version) {
            reject(new Error('无效的备份文件格式: 缺少version字段'));
            return;
          }

          if (!backup.timestamp) {
            reject(new Error('无效的备份文件格式: 缺少timestamp字段'));
            return;
          }

          console.log(`备份文件验证成功: 包含${backup.accounts.length}个账户, 版本${backup.version}`);
          resolve(backup);
        } catch (jsonError) {
          console.error('JSON解析失败:', jsonError);
          reject(new Error('无法解析备份文件，不是有效的JSON格式'));
        }
      } catch (error) {
        console.error('解析备份文件时发生错误:', error);
        reject(error);
      }
    };

    reader.onerror = (event) => {
      console.error('读取文件时发生错误:', event);
      reject(new Error('读取文件时发生错误'));
    };

    reader.readAsText(file);
  });
}

/**
 * 恢复备份
 * @param backup 备份数据
 * @param options 恢复选项
 * @returns 恢复结果
 */
export async function restoreBackup(
  backup: Backup,
  options: RestoreOptions = {}
): Promise<{ success: boolean; message: string; restored: any }> {
  try {
    // 获取认证令牌
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录，无法恢复备份');
    }

    // 确保备份对象符合预期格式
    if (!backup.accounts || !Array.isArray(backup.accounts)) {
      throw new Error('备份数据格式无效：缺少账户数组');
    }

    if (!backup.version) {
      throw new Error('备份数据格式无效：缺少版本信息');
    }

    // 准备请求数据
    const requestData = {
      backup: {
        accounts: backup.accounts.map(account => ({
          ...account,
          // 确保所有可选字段都有合适的默认值
          issuer: account.issuer || null,
          algorithm: account.algorithm || 'SHA1',
          digits: account.digits || 6,
          period: account.period || 30,
          counter: account.counter === undefined ? null : account.counter,
          groupId: account.groupId || null,
          icon: account.icon || null
        })),
        groups: backup.groups || [],
        settings: backup.settings || {},
        version: backup.version,
        timestamp: backup.timestamp
      },
      options: {
        overwriteExisting: options.overwriteExisting || false,
        mergeSettings: options.mergeSettings !== false // 默认为true
      }
    };

    console.log('发送恢复请求数据:', JSON.stringify(requestData));

    // 调用API恢复备份
    const response = await fetch(`${API_BASE_URL}/backup/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      let errorMessage = `恢复备份失败 (HTTP ${response.status})`;
      try {
        const errorData = await response.json();
        console.error('服务器返回错误:', errorData);
        if (errorData && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        }
      } catch (e) {
        console.error('解析错误响应失败:', e);
      }
      throw new Error(errorMessage);
    }

    // 解析恢复结果
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('恢复备份失败:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('恢复备份时发生未知错误');
    }
  }
}
