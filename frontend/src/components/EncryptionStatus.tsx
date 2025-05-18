import { useState, useEffect } from 'react';
import { Group, Badge, Tooltip, ActionIcon, Modal, Stack, PasswordInput, Button, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import * as keyManagement from '../services/keyManagementService';
import { useAccounts } from '../contexts/AccountContext';

/**
 * 加密状态组件
 * 显示当前加密状态并提供解锁功能
 */
export default function EncryptionStatus() {
  // 状态
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionActive, setEncryptionActive] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);

  // 账户上下文
  const { syncData } = useAccounts();

  // 检查加密状态
  useEffect(() => {
    const checkEncryptionStatus = () => {
      const isSet = keyManagement.isEncryptionSet();
      const isActive = keyManagement.hasActiveEncryptionSession();

      setEncryptionEnabled(isSet);
      setEncryptionActive(isActive);
    };

    checkEncryptionStatus();

    // 定期检查加密状态
    const interval = setInterval(checkEncryptionStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // 解锁加密
  const handleUnlock = async () => {
    setIsLoading(true);

    try {
      const success = await keyManagement.unlockEncryption(password);

      if (success) {
        notifications.show({
          title: '成功',
          message: '加密已解锁',
          color: 'green',
        });

        setEncryptionActive(true);
        setPassword('');
        close();

        // 同步数据以解密现有数据
        await syncData();
      } else {
        notifications.show({
          title: '错误',
          message: '密码错误',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('解锁加密失败:', error);
      notifications.show({
        title: '错误',
        message: '解锁加密失败',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 锁定加密
  const handleLock = () => {
    keyManagement.lockEncryption();
    setEncryptionActive(false);
    notifications.show({
      title: '成功',
      message: '加密已锁定',
      color: 'blue',
    });
  };

  // 如果加密未启用，不显示任何内容
  if (!encryptionEnabled) {
    return null;
  }

  return (
    <>
      <Tooltip
        label={encryptionActive ? '加密已解锁' : '加密已锁定，点击解锁'}
        position="bottom"
      >
        <Group gap="xs">
          <Badge
            color={encryptionActive ? 'green' : 'yellow'}
            variant="filled"
            size="sm"
            style={{ cursor: 'pointer' }}
            onClick={encryptionActive ? handleLock : open}
          >
            {encryptionActive ? '已加密' : '已锁定'}
          </Badge>
        </Group>
      </Tooltip>

      <Modal opened={opened} onClose={close} title="解锁加密" size="sm">
        <Stack>
          <Text size="sm">
            您的数据已加密。请输入主密码解锁。
          </Text>

          <PasswordInput
            label="主密码"
            placeholder="输入您的主密码"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password) {
                handleUnlock();
              }
            }}
          />

          <Group justify="flex-end">
            <Button variant="outline" onClick={close}>
              取消
            </Button>
            <Button
              color="green"
              onClick={handleUnlock}
              loading={isLoading}
              disabled={!password}
            >
              解锁
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
