import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Button,
  Group,
  Stack,
  PasswordInput,
  Progress,
  Alert,
  Divider,
  Switch,
  Box,
  Stepper,
  Modal,
  List,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import * as keyManagement from '../services/keyManagementService';
import * as cryptoUtils from '../utils/crypto';
import { useAccounts } from '../contexts/AccountContext';

export default function EncryptionSettings() {
  // 状态
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionActive, setEncryptionActive] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
  const [setupStep, setSetupStep] = useState(0);
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
  }, []);

  // 检查密码强度
  useEffect(() => {
    if (masterPassword) {
      const strength = cryptoUtils.checkPasswordStrength(masterPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: '' });
    }
  }, [masterPassword]);

  // 密码强度颜色
  const getStrengthColor = (score: number) => {
    if (score < 30) return 'red';
    if (score < 60) return 'yellow';
    return 'green';
  };

  // 设置加密
  const handleSetupEncryption = async () => {
    if (masterPassword !== confirmPassword) {
      notifications.show({
        title: '错误',
        message: '密码不匹配',
        color: 'red',
      });
      return;
    }

    if (passwordStrength.score < 50) {
      notifications.show({
        title: '警告',
        message: '密码强度不足，建议使用更强的密码',
        color: 'yellow',
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await keyManagement.setupEncryption(masterPassword);

      if (success) {
        notifications.show({
          title: '成功',
          message: '加密已设置',
          color: 'green',
        });

        setEncryptionEnabled(true);
        setEncryptionActive(true);

        // 同步数据以应用加密
        await syncData();

        // 重置表单
        setMasterPassword('');
        setConfirmPassword('');
        setSetupStep(0);
      } else {
        notifications.show({
          title: '错误',
          message: '设置加密失败',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('设置加密失败:', error);
      notifications.show({
        title: '错误',
        message: '设置加密失败',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 解锁加密
  const handleUnlockEncryption = async () => {
    setIsLoading(true);

    try {
      const success = await keyManagement.unlockEncryption(currentPassword);

      if (success) {
        notifications.show({
          title: '成功',
          message: '加密已解锁',
          color: 'green',
        });

        setEncryptionActive(true);
        setCurrentPassword('');

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
  const handleLockEncryption = () => {
    keyManagement.lockEncryption();
    setEncryptionActive(false);
    notifications.show({
      title: '成功',
      message: '加密已锁定',
      color: 'blue',
    });
  };

  // 更改密码
  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      notifications.show({
        title: '错误',
        message: '新密码不匹配',
        color: 'red',
      });
      return;
    }

    const strength = cryptoUtils.checkPasswordStrength(newPassword);
    if (strength.score < 50) {
      notifications.show({
        title: '警告',
        message: '新密码强度不足，建议使用更强的密码',
        color: 'yellow',
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await keyManagement.changeMasterPassword(currentPassword, newPassword);

      if (success) {
        notifications.show({
          title: '成功',
          message: '密码已更改',
          color: 'green',
        });

        // 重置表单
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        close();
      } else {
        notifications.show({
          title: '错误',
          message: '当前密码错误',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('更改密码失败:', error);
      notifications.show({
        title: '错误',
        message: '更改密码失败',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 禁用加密
  const handleDisableEncryption = async () => {
    if (!window.confirm('确定要禁用加密吗？这将使您的数据不再受到保护。')) {
      return;
    }

    setIsLoading(true);

    try {
      const success = await keyManagement.disableEncryption(currentPassword);

      if (success) {
        notifications.show({
          title: '成功',
          message: '加密已禁用',
          color: 'yellow',
        });

        setEncryptionEnabled(false);
        setEncryptionActive(false);
        setCurrentPassword('');

        // 同步数据以解密所有数据
        await syncData();
      } else {
        notifications.show({
          title: '错误',
          message: '密码错误',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('禁用加密失败:', error);
      notifications.show({
        title: '错误',
        message: '禁用加密失败',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        加密设置
      </Title>

      <Text c="dimmed" mb="xl">
        管理端到端加密设置，保护您的敏感数据
      </Text>

      {encryptionEnabled ? (
        <Paper withBorder p="md" radius="md" mb="md">
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>端到端加密</Text>
              <Text color="green">已启用</Text>
            </Group>

            <Text size="sm" c="dimmed">
              您的数据在发送到服务器之前已加密，只有您知道解密密钥。
            </Text>

            <Group justify="space-between">
              <Text fw={500}>加密状态</Text>
              <Text color={encryptionActive ? 'green' : 'yellow'}>
                {encryptionActive ? '已解锁' : '已锁定'}
              </Text>
            </Group>

            <Divider my="sm" />

            {encryptionActive ? (
              <Button color="blue" onClick={handleLockEncryption}>
                锁定加密
              </Button>
            ) : (
              <Stack>
                <PasswordInput
                  label="主密码"
                  placeholder="输入您的主密码"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                />
                <Button
                  color="green"
                  onClick={handleUnlockEncryption}
                  loading={isLoading}
                  disabled={!currentPassword}
                >
                  解锁加密
                </Button>
              </Stack>
            )}

            <Divider my="sm" />

            <Group justify="space-between">
              <Button variant="outline" color="blue" onClick={open}>
                更改主密码
              </Button>
              <Button
                variant="outline"
                color="red"
                onClick={handleDisableEncryption}
                disabled={!encryptionActive}
              >
                禁用加密
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder p="md" radius="md" mb="md">
          <Stack>
            <Alert color="yellow" title="加密未启用">
              启用端到端加密可以保护您的敏感数据，即使在服务器上也是加密的。
            </Alert>

            <Stepper active={setupStep} onStepClick={setSetupStep}>
              <Stepper.Step label="设置密码" description="创建主密码">
                <Stack mt="md">
                  <PasswordInput
                    label="主密码"
                    placeholder="输入主密码"
                    description="这个密码将用于加密您的数据，请确保它足够强且您能记住"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.currentTarget.value)}
                  />

                  {masterPassword && (
                    <>
                      <Progress
                        value={passwordStrength.score}
                        color={getStrengthColor(passwordStrength.score)}
                        size="sm"
                      />
                      <Text size="sm" color={getStrengthColor(passwordStrength.score)}>
                        {passwordStrength.feedback}
                      </Text>
                    </>
                  )}

                  <PasswordInput
                    label="确认密码"
                    placeholder="再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    error={
                      confirmPassword && masterPassword !== confirmPassword
                        ? '密码不匹配'
                        : null
                    }
                  />

                  <Button
                    onClick={() => setSetupStep(1)}
                    disabled={
                      !masterPassword ||
                      masterPassword !== confirmPassword ||
                      passwordStrength.score < 30
                    }
                  >
                    下一步
                  </Button>
                </Stack>
              </Stepper.Step>

              <Stepper.Step label="确认" description="确认设置">
                <Stack mt="md">
                  <Alert color="blue" title="重要提示">
                    <Text>请记住以下几点：</Text>
                    <List>
                      <List.Item>如果您忘记了主密码，将无法恢复您的数据</List.Item>
                      <List.Item>密码不会存储在服务器上，只有您知道</List.Item>
                      <List.Item>每次打开应用时，您都需要输入主密码来解锁数据</List.Item>
                    </List>
                  </Alert>

                  <Group justify="space-between">
                    <Button variant="outline" onClick={() => setSetupStep(0)}>
                      返回
                    </Button>
                    <Button
                      color="green"
                      onClick={handleSetupEncryption}
                      loading={isLoading}
                    >
                      启用加密
                    </Button>
                  </Group>
                </Stack>
              </Stepper.Step>
            </Stepper>
          </Stack>
        </Paper>
      )}

      <Modal opened={opened} onClose={close} title="更改主密码">
        <Stack>
          <PasswordInput
            label="当前密码"
            placeholder="输入当前密码"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          />

          <PasswordInput
            label="新密码"
            placeholder="输入新密码"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
          />

          {newPassword && (
            <>
              <Progress
                value={cryptoUtils.checkPasswordStrength(newPassword).score}
                color={getStrengthColor(
                  cryptoUtils.checkPasswordStrength(newPassword).score
                )}
                size="sm"
              />
              <Text
                size="sm"
                color={getStrengthColor(
                  cryptoUtils.checkPasswordStrength(newPassword).score
                )}
              >
                {cryptoUtils.checkPasswordStrength(newPassword).feedback}
              </Text>
            </>
          )}

          <PasswordInput
            label="确认新密码"
            placeholder="再次输入新密码"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.currentTarget.value)}
            error={
              confirmNewPassword && newPassword !== confirmNewPassword
                ? '密码不匹配'
                : null
            }
          />

          <Group justify="flex-end">
            <Button variant="outline" onClick={close}>
              取消
            </Button>
            <Button
              color="blue"
              onClick={handleChangePassword}
              loading={isLoading}
              disabled={
                !currentPassword ||
                !newPassword ||
                newPassword !== confirmNewPassword ||
                cryptoUtils.checkPasswordStrength(newPassword).score < 30
              }
            >
              更改密码
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
