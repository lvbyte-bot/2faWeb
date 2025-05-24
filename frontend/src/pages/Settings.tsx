import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Switch,
  Stack,
  Group,
  Button,
  TextInput,
  PasswordInput,
  Divider,
  Select,
  NumberInput,
  Tabs,
  Anchor,
  Alert
} from '@mantine/core';
import { IconFingerprint, IconList, IconDevices, IconAlertCircle } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // 用户设置
  const [autoLock, setAutoLock] = useState(true);
  const [lockTimeout, setLockTimeout] = useState(5);
  const [hideOtpCodes, setHideOtpCodes] = useState(false);
  const [defaultAlgorithm, setDefaultAlgorithm] = useState('SHA1');
  const [defaultDigits, setDefaultDigits] = useState(6);
  const [defaultPeriod, setDefaultPeriod] = useState(30);

  // 账户设置
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 保存用户设置
  const saveUserSettings = () => {
    // 在实际应用中，这里应该调用API保存设置
    notifications.show({
      title: t('settings.settingsSaved'),
      message: t('settings.preferencesUpdated'),
      color: 'green',
    });
  };

  // 更新账户信息
  const updateAccount = () => {
    // 在实际应用中，这里应该调用API更新账户信息
    notifications.show({
      title: t('settings.accountUpdated'),
      message: t('settings.accountInfoUpdated'),
      color: 'green',
    });
  };

  // 更改密码
  const [changingPassword, setChangingPassword] = useState(false);

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      notifications.show({
        title: t('auth.passwordMismatch'),
        message: t('settings.passwordsDoNotMatch'),
        color: 'red',
      });
      return;
    }

    setChangingPassword(true);
    try {
      // 调用API更改密码
      const response = await api.post('/auth/password/update', {
        currentPassword,
        newPassword,
      }) as Response;

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('settings.passwordChangeFailed'));
      }

      notifications.show({
        title: t('settings.passwordChanged'),
        message: t('settings.passwordChangedSuccess'),
        color: 'green',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      notifications.show({
        title: t('settings.passwordChangeFailed'),
        message: error instanceof Error ? error.message : t('settings.passwordChangeFailedRetry'),
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        {t('settings.title')}
      </Title>

      <Text c="dimmed" mb="xl">
        {t('settings.customizeExperience')}
      </Text>

      <Tabs defaultValue="preferences">
        <Tabs.List mb="md">
          <Tabs.Tab value="preferences">{t('settings.preferences')}</Tabs.Tab>
          <Tabs.Tab value="account">{t('settings.accountSettings')}</Tabs.Tab>
          <Tabs.Tab value="security">{t('settings.securitySettings')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="preferences">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Group justify="space-between">
                <div>
                  <Text fw={500}>{t('settings.autoLock')}</Text>
                  <Text size="xs" c="dimmed">{t('settings.autoLockDescription')}</Text>
                </div>
                <Switch checked={autoLock} onChange={(e) => setAutoLock(e.currentTarget.checked)} />
              </Group>

              {autoLock && (
                <NumberInput
                  label={t('settings.lockTimeout')}
                  value={lockTimeout}
                  onChange={(value) => setLockTimeout(Number(value))}
                  min={1}
                  max={60}
                />
              )}

              <Divider />

              <Group justify="space-between">
                <div>
                  <Text fw={500}>{t('settings.hideOtpCodes')}</Text>
                  <Text size="xs" c="dimmed">{t('settings.hideOtpCodesDescription')}</Text>
                </div>
                <Switch checked={hideOtpCodes} onChange={(e) => setHideOtpCodes(e.currentTarget.checked)} />
              </Group>

              <Divider />

              <Select
                label={t('settings.defaultAlgorithm')}
                description={t('settings.defaultAlgorithmDescription')}
                data={[
                  { value: 'SHA1', label: 'SHA1' },
                  { value: 'SHA256', label: 'SHA256' },
                  { value: 'SHA512', label: 'SHA512' },
                ]}
                value={defaultAlgorithm}
                onChange={(value) => setDefaultAlgorithm(value || 'SHA1')}
              />

              <Select
                label={t('settings.defaultDigits')}
                description={t('settings.defaultDigitsDescription')}
                data={[
                  { value: '6', label: t('settings.digits', { count: 6 }) },
                  { value: '8', label: t('settings.digits', { count: 8 }) },
                ]}
                value={String(defaultDigits)}
                onChange={(value) => setDefaultDigits(Number(value) || 6)}
              />

              <NumberInput
                label={t('settings.defaultPeriod')}
                description={t('settings.defaultPeriodDescription')}
                value={defaultPeriod}
                onChange={(value) => setDefaultPeriod(Number(value))}
                min={10}
                max={120}
              />

              <Button onClick={saveUserSettings}>{t('settings.saveSettings')}</Button>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="account">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <TextInput
                label={t('auth.username')}
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
              />

              <TextInput
                label={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />

              <Button onClick={updateAccount}>{t('settings.updateAccountInfo')}</Button>

              <Divider label={t('settings.changePassword')} labelPosition="center" />

              <PasswordInput
                label={t('settings.currentPassword')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              />

              <PasswordInput
                label={t('settings.newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
              />

              <PasswordInput
                label={t('settings.confirmNewPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              />

              <Button onClick={changePassword} loading={changingPassword}>{t('settings.changePassword')}</Button>

              <Divider label={t('auth.forgotPassword')} labelPosition="center" />

              <Button component={Link} to="/reset-password" variant="outline">
                {t('auth.resetPassword')}
              </Button>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="security">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <div>
                <Text fw={500}>{t('settings.webauthnAuth')}</Text>
                <Text size="xs" c="dimmed" mb="md">{t('settings.webauthnDescription')}</Text>

                <Button
                  component={Link}
                  to="/webauthn"
                  variant="outline"
                  fullWidth
                  mb="md"
                  leftSection={<IconFingerprint size={16} />}
                >
                  {t('settings.setupBiometricLogin')}
                </Button>

                <Button
                  component={Link}
                  to="/webauthn/credentials"
                  variant="outline"
                  fullWidth
                  mb="md"
                  leftSection={<IconList size={16} />}
                >
                  {t('settings.manageBiometricCredentials')}
                </Button>
              </div>

              <Divider />

              <div>
                <Text fw={500}>{t('sessions.title')}</Text>
                <Text size="xs" c="dimmed" mb="md">{t('settings.sessionManagementDescription')}</Text>

                <Button
                  component={Link}
                  to="/sessions"
                  variant="outline"
                  fullWidth
                  mb="md"
                  leftSection={<IconDevices size={16} />}
                >
                  {t('settings.manageActiveSessions')}
                </Button>
              </div>

              <Divider />

              <div>
                <Text fw={500} c="red">{t('settings.dangerZone')}</Text>
                <Text size="xs" c="dimmed" mb="md">{t('settings.dangerZoneDescription')}</Text>

                <Button color="red" variant="outline" fullWidth>
                  {t('settings.deleteAccount')}
                </Button>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
