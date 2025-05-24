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
import { useTranslation } from 'react-i18next';

export default function EncryptionSettings() {
  const { t } = useTranslation();
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
        title: t('common.error'),
        message: t('auth.passwordMismatch'),
        color: 'red',
      });
      return;
    }

    if (passwordStrength.score < 50) {
      notifications.show({
        title: t('common.warning'),
        message: t('encryption.weakPasswordWarning'),
        color: 'yellow',
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await keyManagement.setupEncryption(masterPassword);

      if (success) {
        notifications.show({
          title: t('common.success'),
          message: t('encryption.setupSuccess'),
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
          title: t('common.error'),
          message: t('encryption.setupFailed'),
          color: 'red',
        });
      }
    } catch (error) {
      console.error('设置加密失败:', error);
      notifications.show({
        title: t('common.error'),
        message: t('encryption.setupFailed'),
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
          title: t('common.success'),
          message: t('encryption.unlockSuccess'),
          color: 'green',
        });

        setEncryptionActive(true);
        setCurrentPassword('');

        // 同步数据以解密现有数据
        await syncData();
      } else {
        notifications.show({
          title: t('common.error'),
          message: t('encryption.wrongPassword'),
          color: 'red',
        });
      }
    } catch (error) {
      console.error('解锁加密失败:', error);
      notifications.show({
        title: t('common.error'),
        message: t('encryption.unlockFailed'),
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
      title: t('common.success'),
      message: t('encryption.lockSuccess'),
      color: 'blue',
    });
  };

  // 更改密码
  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      notifications.show({
        title: t('common.error'),
        message: t('auth.passwordMismatch'),
        color: 'red',
      });
      return;
    }

    const strength = cryptoUtils.checkPasswordStrength(newPassword);
    if (strength.score < 50) {
      notifications.show({
        title: t('common.warning'),
        message: t('encryption.weakPasswordWarning'),
        color: 'yellow',
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await keyManagement.changeMasterPassword(currentPassword, newPassword);

      if (success) {
        notifications.show({
          title: t('common.success'),
          message: t('encryption.passwordChanged'),
          color: 'green',
        });

        // 重置表单
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        close();
      } else {
        notifications.show({
          title: t('common.error'),
          message: t('encryption.currentPasswordWrong'),
          color: 'red',
        });
      }
    } catch (error) {
      console.error('更改密码失败:', error);
      notifications.show({
        title: t('common.error'),
        message: t('encryption.changePasswordFailed'),
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 禁用加密
  const handleDisableEncryption = async () => {
    if (!window.confirm(t('encryption.disableConfirmation'))) {
      return;
    }

    setIsLoading(true);

    try {
      const success = await keyManagement.disableEncryption(currentPassword);

      if (success) {
        notifications.show({
          title: t('common.success'),
          message: t('encryption.disableSuccess'),
          color: 'yellow',
        });

        setEncryptionEnabled(false);
        setEncryptionActive(false);
        setCurrentPassword('');

        // 同步数据以解密所有数据
        await syncData();
      } else {
        notifications.show({
          title: t('common.error'),
          message: t('encryption.wrongPassword'),
          color: 'red',
        });
      }
    } catch (error) {
      console.error('禁用加密失败:', error);
      notifications.show({
        title: t('common.error'),
        message: t('encryption.disableFailed'),
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        {t('encryption.title')}
      </Title>

      <Text c="dimmed" mb="xl">
        {t('encryption.description')}
      </Text>

      {encryptionEnabled ? (
        <Paper withBorder p="md" radius="md" mb="md">
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>{t('encryption.e2eEncryption')}</Text>
              <Text color="green">{t('encryption.enabled')}</Text>
            </Group>

            <Text size="sm" c="dimmed">
              {t('encryption.dataProtectionDesc')}
            </Text>

            <Group justify="space-between">
              <Text fw={500}>{t('encryption.encryptionStatus')}</Text>
              <Text color={encryptionActive ? 'green' : 'yellow'}>
                {encryptionActive ? t('encryption.unlocked') : t('encryption.locked')}
              </Text>
            </Group>

            <Divider my="sm" />

            {encryptionActive ? (
              <Button color="blue" onClick={handleLockEncryption}>
                {t('encryption.lockEncryption')}
              </Button>
            ) : (
              <Stack>
                <PasswordInput
                  label={t('encryption.masterPassword')}
                  placeholder={t('encryption.enterMasterPassword')}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                />
                <Button
                  color="green"
                  onClick={handleUnlockEncryption}
                  loading={isLoading}
                  disabled={!currentPassword}
                >
                  {t('encryption.unlockEncryption')}
                </Button>
              </Stack>
            )}

            <Divider my="sm" />

            <Group justify="space-between">
              <Button variant="outline" color="blue" onClick={open}>
                {t('encryption.changeMasterPassword')}
              </Button>
              <Button
                variant="outline"
                color="red"
                onClick={handleDisableEncryption}
                disabled={!encryptionActive}
              >
                {t('encryption.disableEncryption')}
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder p="md" radius="md" mb="md">
          <Stack>
            <Alert color="yellow" title={t('encryption.notEnabled')}>
              {t('encryption.enablePrompt')}
            </Alert>

            <Stepper active={setupStep} onStepClick={setSetupStep}>
              <Stepper.Step label={t('encryption.setupPassword')} description={t('encryption.createMasterPassword')}>
                <Stack mt="md">
                  <PasswordInput
                    label={t('encryption.masterPassword')}
                    placeholder={t('encryption.enterMasterPassword')}
                    description={t('encryption.passwordDescription')}
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
                    label={t('encryption.confirmPassword')}
                    placeholder={t('encryption.reenterPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    error={
                      confirmPassword && masterPassword !== confirmPassword
                        ? t('auth.passwordMismatch')
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
                    {t('common.nextStep')}
                  </Button>
                </Stack>
              </Stepper.Step>

              <Stepper.Step label={t('common.confirm')} description={t('encryption.confirmSetup')}>
                <Stack mt="md">
                  <Alert color="blue" title={t('encryption.importantNote')}>
                    <Text>{t('encryption.rememberPoints')}</Text>
                    <List>
                      <List.Item>{t('encryption.forgotPasswordWarning')}</List.Item>
                      <List.Item>{t('encryption.passwordNotStored')}</List.Item>
                      <List.Item>{t('encryption.passwordNeededEachTime')}</List.Item>
                    </List>
                  </Alert>

                  <Group justify="space-between">
                    <Button variant="outline" onClick={() => setSetupStep(0)}>
                      {t('common.back')}
                    </Button>
                    <Button
                      color="green"
                      onClick={handleSetupEncryption}
                      loading={isLoading}
                    >
                      {t('encryption.enableEncryption')}
                    </Button>
                  </Group>
                </Stack>
              </Stepper.Step>
            </Stepper>
          </Stack>
        </Paper>
      )}

      <Modal opened={opened} onClose={close} title={t('encryption.changeMasterPassword')}>
        <Stack>
          <PasswordInput
            label={t('encryption.currentPassword')}
            placeholder={t('encryption.enterCurrentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          />

          <PasswordInput
            label={t('encryption.newPassword')}
            placeholder={t('encryption.enterNewPassword')}
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
            label={t('encryption.confirmNewPassword')}
            placeholder={t('encryption.reenterNewPassword')}
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.currentTarget.value)}
            error={
              confirmNewPassword && newPassword !== confirmNewPassword
                ? t('auth.passwordMismatch')
                : null
            }
          />

          <Group justify="flex-end">
            <Button variant="outline" onClick={close}>
              {t('common.cancel')}
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
              {t('encryption.changePassword')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
