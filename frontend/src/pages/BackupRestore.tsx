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
import { useTranslation } from 'react-i18next';

export default function BackupRestore() {
  const { t } = useTranslation();
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
          title: t('common.error'),
          message: t('backup.pleaseEnterPassword'),
          color: 'red',
        });
        return;
      }

      if (backupPassword !== confirmBackupPassword) {
        notifications.show({
          title: t('common.error'),
          message: t('auth.passwordMismatch'),
          color: 'red',
        });
        return;
      }

      if (passwordStrength.score < 40) {
        const confirm = window.confirm(
          t('backup.weakPasswordConfirmation')
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
        title: t('common.success'),
        message: t('backup.backupCreatedAndDownloaded'),
        color: 'green',
      });

      // 重置表单
      setBackupPassword('');
      setConfirmBackupPassword('');
    } catch (error) {
      notifications.show({
        title: t('backup.backupFailed'),
        message: error instanceof Error ? error.message : t('backup.createBackupFailed'),
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
          setParseError(error instanceof Error ? error.message : t('backup.cannotParseBackupFile'));
        }
      }
    }
  };

  // 解析加密备份
  const handleParseEncrypted = async () => {
    if (!backupFile || !restorePassword) {
      notifications.show({
        title: t('common.error'),
        message: t('backup.selectFileAndEnterPassword'),
        color: 'red',
      });
      return;
    }

    try {
      const backup = await backupService.parseBackupFile(backupFile, restorePassword);
      setParsedBackup(backup);
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : t('backup.parseBackupFileFailed'));
    }
  };

  // 恢复备份
  const handleRestoreBackup = async () => {
    if (!parsedBackup) {
      notifications.show({
        title: t('common.error'),
        message: t('backup.noValidBackupData'),
        color: 'red',
      });
      return;
    }

    // 验证备份数据格式
    if (!parsedBackup.accounts || !Array.isArray(parsedBackup.accounts) || parsedBackup.accounts.length === 0) {
      notifications.show({
        title: t('common.error'),
        message: t('backup.invalidFormatOrNoAccounts'),
        color: 'red',
      });
      return;
    }

    if (!parsedBackup.version || !parsedBackup.timestamp) {
      notifications.show({
        title: t('common.error'),
        message: t('backup.missingVersionOrTimestamp'),
        color: 'red',
      });
      return;
    }

    setIsRestoring(true);

    try {
      console.log(t('backup.startingRestore'), {
        accountsCount: parsedBackup.accounts.length,
        hasGroups: !!parsedBackup.groups && parsedBackup.groups.length > 0,
        hasSettings: !!parsedBackup.settings && Object.keys(parsedBackup.settings).length > 0,
        options: { overwriteExisting, mergeSettings }
      });

      const result = await backupService.restoreBackup(parsedBackup, {
        overwriteExisting,
        mergeSettings,
      });

      console.log(t('backup.restoreSuccessLog'), result);

      notifications.show({
        title: t('backup.restoreSuccess'),
        message: t('backup.restoredItems', {
          accounts: result.restored.accounts,
          groups: result.restored.groups,
          settings: result.restored.settings ? t('backup.andSettings') : ''
        }),
        color: 'green',
      });

      // 重置表单
      setBackupFile(null);
      setParsedBackup(null);
      setRestorePassword('');
    } catch (error) {
      console.error(t('backup.restoreFailedLog'), error);

      notifications.show({
        title: t('backup.restoreFailed'),
        message: error instanceof Error ? error.message : t('backup.restoreBackupFailed'),
        color: 'red',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        {t('backup.title')}
      </Title>

      <Text c="dimmed" mb="xl">
        {t('backup.description')}
      </Text>

      <Tabs defaultValue="backup">
        <Tabs.List mb="md">
          <Tabs.Tab value="backup" leftSection={<IconDatabase size={16} />}>
            {t('backup.createBackup')}
          </Tabs.Tab>
          <Tabs.Tab value="restore" leftSection={<IconUpload size={16} />}>
            {t('backup.restoreBackup')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="backup">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Text>
                {t('backup.createBackupDescription')}
              </Text>

              <Alert icon={<IconAlertCircle size={16} />} title={t('backup.securityTip')} color="blue">
                {t('backup.encryptionRecommendation')}
              </Alert>

              <Checkbox
                label={t('backup.encryptBackupFile')}
                checked={encryptBackup}
                onChange={(e) => setEncryptBackup(e.currentTarget.checked)}
              />

              {encryptBackup && keyManagement.isEncryptionSet() && (
                <Checkbox
                  label={t('backup.useCurrentEncryptionPassword')}
                  checked={useEncryptionPassword}
                  onChange={(e) => setUseEncryptionPassword(e.currentTarget.checked)}
                  disabled={!keyManagement.hasActiveEncryptionSession()}
                />
              )}

              {encryptBackup && (!useEncryptionPassword || !keyManagement.isEncryptionSet()) && (
                <>
                  <PasswordInput
                    label={t('backup.backupPassword')}
                    placeholder={t('backup.enterStrongPassword')}
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
                        label={t('backup.confirmPassword')}
                        placeholder={t('backup.reenterPassword')}
                        value={confirmBackupPassword}
                        onChange={(e) => setConfirmBackupPassword(e.currentTarget.value)}
                        error={
                          confirmBackupPassword &&
                          backupPassword !== confirmBackupPassword
                            ? t('auth.passwordMismatch')
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
                {t('backup.createAndDownload')}
              </Button>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="restore">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Text>
                {t('backup.restoreDescription')}
              </Text>

              <Alert icon={<IconAlertCircle size={16} />} title={t('common.notice')} color="yellow">
                {t('backup.restoreWarning')}
              </Alert>

              <FileInput
                label={t('backup.selectBackupFile')}
                placeholder={t('backup.clickToSelectFile')}
                accept=".json"
                value={backupFile}
                onChange={handleFileChange}
                clearable
              />

              {parseError && parseError.includes('已加密') && (
                <>
                  <PasswordInput
                    label={t('backup.backupPassword')}
                    placeholder={t('backup.enterBackupPassword')}
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.currentTarget.value)}
                  />

                  <Button onClick={handleParseEncrypted} disabled={!restorePassword || !backupFile}>
                    {t('backup.decryptBackup')}
                  </Button>
                </>
              )}

              {parseError && !parseError.includes('已加密') && (
                <Alert color="red" title={t('backup.parseError')}>
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
                      <Text fw={500}>{t('backup.parseSuccess')}</Text>
                    </Group>

                    <Text size="sm">
                      {t('backup.backupVersion')}: {parsedBackup.version}
                    </Text>
                    <Text size="sm">
                      {t('backup.createdTime')}: {new Date(parsedBackup.timestamp).toLocaleString()}
                    </Text>
                    <Text size="sm">
                      {t('backup.contains', { accounts: parsedBackup.accounts.length })}
                      {parsedBackup.groups ? t('backup.containsGroups', { groups: parsedBackup.groups.length }) : ''}
                      {parsedBackup.settings ? t('backup.containsSettings') : ''}
                    </Text>

                    <Divider my="xs" />

                    <Checkbox
                      label={t('backup.overwriteExisting')}
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.currentTarget.checked)}
                    />

                    <Checkbox
                      label={t('backup.mergeSettings')}
                      checked={mergeSettings}
                      onChange={(e) => setMergeSettings(e.currentTarget.checked)}
                    />

                    <Button
                      onClick={handleRestoreBackup}
                      loading={isRestoring}
                      color="green"
                    >
                      {t('backup.restoreBackup')}
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
