import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Button,
  Group,
  Tabs,
  FileInput,
  Checkbox,
  PasswordInput,
  Alert,
  Divider,
  List,
  Progress,
  Box,
  Card,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconDownload, IconUpload, IconDatabase } from '@tabler/icons-react';
import * as backupService from '../services/backupService';
import * as keyManagement from '../services/keyManagementService';
import * as cryptoUtils from '../utils/crypto';
import { BACKUP_SETTINGS } from '../config';

export default function BackupRestore() {
  // 备份状态
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmBackupPassword, setConfirmBackupPassword] = useState('');
  const [encryptBackup, setEncryptBackup] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
  const [useEncryptionPassword, setUseEncryptionPassword] = useState(true);

  // 恢复状态
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<backupService.Backup | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [mergeSettings, setMergeSettings] = useState(true);

  // 处理密码强度检查
  const handlePasswordChange = (password: string) => {
    setBackupPassword(password);
    if (password) {
      const strength = cryptoUtils.checkPasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: '' });
    }
  };

  // 创建并下载备份
  const handleCreateBackup = async () => {
    // 验证密码（如果启用加密）
    if (encryptBackup && !useEncryptionPassword) {
      if (!backupPassword) {
        notifications.show({
          title: '错误',
          message: '请输入密码',
          color: 'red',
        });
        return;
      }

      if (backupPassword !== confirmBackupPassword) {
        notifications.show({
          title: '错误',
          message: '两次输入的密码不匹配',
          color: 'red',
        });
        return;
      }

      if (passwordStrength.score < 40) {
        const confirm = window.confirm(
          '您的密码强度较弱，这可能会降低备份的安全性。确定要继续吗？'
        );
        if (!confirm) return;
      }
    }

    setIsCreatingBackup(true);

    try {
      // 创建备份
      const backup = await backupService.createBackup();

      // 下载备份文件
      if (encryptBackup) {
        if (useEncryptionPassword && keyManagement.hasActiveEncryptionSession()) {
          // 使用当前加密会话的主密码
          await backupService.downloadBackup(backup, true);
        } else {
          // 使用用户输入的密码
          await backupService.downloadBackup(backup, true, backupPassword);
        }
      } else {
        // 不加密
        await backupService.downloadBackup(backup, false);
      }

      notifications.show({
        title: '成功',
        message: '备份已创建并下载',
        color: 'green',
      });

      // 重置表单
      setBackupPassword('');
      setConfirmBackupPassword('');
    } catch (error) {
      notifications.show({
        title: '备份失败',
        message: error instanceof Error ? error.message : '创建备份失败',
        color: 'red',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // 处理文件选择
  const handleFileChange = async (file: File | null) => {
    setBackupFile(file);
    setParseError(null);
    setParsedBackup(null);

    if (file) {
      try {
        // 尝试解析文件（不提供密码，如果是加密文件会失败）
        const backup = await backupService.parseBackupFile(file);
        setParsedBackup(backup);
      } catch (error) {
        // 如果解析失败，可能是加密文件或无效文件
        if (error instanceof Error && error.message.includes('已加密')) {
          setParseError(error.message);
        } else {
          setParseError(error instanceof Error ? error.message : '无法解析备份文件');
        }
      }
    }
  };

  // 解析加密备份
  const handleParseEncrypted = async () => {
    if (!backupFile || !restorePassword) {
      notifications.show({
        title: '错误',
        message: '请选择文件并输入密码',
        color: 'red',
      });
      return;
    }

    try {
      const backup = await backupService.parseBackupFile(backupFile, restorePassword);
      setParsedBackup(backup);
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : '解析备份文件失败');
    }
  };

  // 恢复备份
  const handleRestoreBackup = async () => {
    if (!parsedBackup) {
      notifications.show({
        title: '错误',
        message: '没有有效的备份数据',
        color: 'red',
      });
      return;
    }

    // 验证备份数据格式
    if (!parsedBackup.accounts || !Array.isArray(parsedBackup.accounts) || parsedBackup.accounts.length === 0) {
      notifications.show({
        title: '错误',
        message: '备份数据格式无效或不包含任何账户',
        color: 'red',
      });
      return;
    }

    if (!parsedBackup.version || !parsedBackup.timestamp) {
      notifications.show({
        title: '错误',
        message: '备份数据缺少版本信息或时间戳',
        color: 'red',
      });
      return;
    }

    setIsRestoring(true);

    try {
      console.log('开始恢复备份:', {
        accountsCount: parsedBackup.accounts.length,
        hasGroups: !!parsedBackup.groups && parsedBackup.groups.length > 0,
        hasSettings: !!parsedBackup.settings && Object.keys(parsedBackup.settings).length > 0,
        options: { overwriteExisting, mergeSettings }
      });

      const result = await backupService.restoreBackup(parsedBackup, {
        overwriteExisting,
        mergeSettings,
      });

      console.log('恢复备份成功:', result);

      notifications.show({
        title: '恢复成功',
        message: `已恢复 ${result.restored.accounts} 个账户、${result.restored.groups} 个分组${
          result.restored.settings ? '和用户设置' : ''
        }`,
        color: 'green',
      });

      // 重置表单
      setBackupFile(null);
      setParsedBackup(null);
      setRestorePassword('');
    } catch (error) {
      console.error('恢复备份失败:', error);

      notifications.show({
        title: '恢复失败',
        message: error instanceof Error ? error.message : '恢复备份失败',
        color: 'red',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        备份与恢复
      </Title>

      <Text c="dimmed" mb="xl">
        创建应用数据备份或从备份文件恢复
      </Text>

      <Tabs defaultValue="backup">
        <Tabs.List mb="md">
          <Tabs.Tab value="backup" leftSection={<IconDatabase size={16} />}>
            创建备份
          </Tabs.Tab>
          <Tabs.Tab value="restore" leftSection={<IconUpload size={16} />}>
            恢复备份
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="backup">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Text>
                创建应用数据的完整备份，包括所有账户、分组和设置。
              </Text>

              <Alert icon={<IconAlertCircle size={16} />} title="安全提示" color="blue">
                强烈建议对备份文件进行加密，以保护您的敏感数据。
              </Alert>

              <Checkbox
                label="加密备份文件（推荐）"
                checked={encryptBackup}
                onChange={(e) => setEncryptBackup(e.currentTarget.checked)}
              />

              {encryptBackup && keyManagement.isEncryptionSet() && (
                <Checkbox
                  label="使用当前加密密码（如果已解锁）"
                  checked={useEncryptionPassword}
                  onChange={(e) => setUseEncryptionPassword(e.currentTarget.checked)}
                  disabled={!keyManagement.hasActiveEncryptionSession()}
                />
              )}

              {encryptBackup && (!useEncryptionPassword || !keyManagement.isEncryptionSet()) && (
                <>
                  <PasswordInput
                    label="备份密码"
                    placeholder="输入强密码保护您的备份"
                    value={backupPassword}
                    onChange={(e) => handlePasswordChange(e.currentTarget.value)}
                  />

                  {backupPassword && (
                    <>
                      <Progress
                        value={passwordStrength.score}
                        color={
                          passwordStrength.score < 30
                            ? 'red'
                            : passwordStrength.score < 60
                            ? 'yellow'
                            : 'green'
                        }
                        size="sm"
                      />

                      <Text size="xs" c="dimmed">
                        {passwordStrength.feedback}
                      </Text>

                      <PasswordInput
                        label="确认密码"
                        placeholder="再次输入密码"
                        value={confirmBackupPassword}
                        onChange={(e) => setConfirmBackupPassword(e.currentTarget.value)}
                        error={
                          confirmBackupPassword &&
                          backupPassword !== confirmBackupPassword
                            ? '密码不匹配'
                            : undefined
                        }
                      />
                    </>
                  )}
                </>
              )}

              <Button
                onClick={handleCreateBackup}
                loading={isCreatingBackup}
                leftSection={<IconDownload size={16} />}
                disabled={
                  encryptBackup &&
                  !useEncryptionPassword &&
                  (!backupPassword ||
                    backupPassword !== confirmBackupPassword)
                }
              >
                创建并下载备份
              </Button>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="restore">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Text>
                从备份文件恢复应用数据。
              </Text>

              <Alert icon={<IconAlertCircle size={16} />} title="注意" color="yellow">
                恢复备份将添加备份中的账户和分组，可以选择是否覆盖现有数据。
              </Alert>

              <FileInput
                label="选择备份文件"
                placeholder="点击选择文件"
                accept=".json"
                value={backupFile}
                onChange={handleFileChange}
                clearable
              />

              {parseError && parseError.includes('已加密') && (
                <>
                  <PasswordInput
                    label="备份密码"
                    placeholder="输入备份文件的密码"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.currentTarget.value)}
                  />

                  <Button onClick={handleParseEncrypted} disabled={!restorePassword || !backupFile}>
                    解密备份
                  </Button>
                </>
              )}

              {parseError && !parseError.includes('已加密') && (
                <Alert color="red" title="解析错误">
                  {parseError}
                </Alert>
              )}

              {parsedBackup && (
                <Card withBorder>
                  <Stack>
                    <Group>
                      <ThemeIcon color="green" variant="light">
                        <IconCheck size={16} />
                      </ThemeIcon>
                      <Text fw={500}>备份解析成功</Text>
                    </Group>

                    <Text size="sm">
                      备份版本: {parsedBackup.version}
                    </Text>
                    <Text size="sm">
                      创建时间: {new Date(parsedBackup.timestamp).toLocaleString()}
                    </Text>
                    <Text size="sm">
                      包含 {parsedBackup.accounts.length} 个账户
                      {parsedBackup.groups ? `、${parsedBackup.groups.length} 个分组` : ''}
                      {parsedBackup.settings ? '和用户设置' : ''}
                    </Text>

                    <Divider my="xs" />

                    <Checkbox
                      label="覆盖现有数据（如果存在相同名称的账户或分组）"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.currentTarget.checked)}
                    />

                    <Checkbox
                      label="合并用户设置（而不是完全替换）"
                      checked={mergeSettings}
                      onChange={(e) => setMergeSettings(e.currentTarget.checked)}
                    />

                    <Button
                      onClick={handleRestoreBackup}
                      loading={isRestoring}
                      color="green"
                    >
                      恢复备份
                    </Button>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
