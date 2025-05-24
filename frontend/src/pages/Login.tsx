import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Group,
  Box,
  Title,
  Text,
  Container,
  Paper,
  Anchor,
  Divider,
  Alert
} from '@mantine/core';
import { IconFingerprint, IconAlertCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useAuth } from '../contexts/AuthContext';
import WebAuthnGuide from '../components/WebAuthnGuide';
import { useTranslation } from 'react-i18next';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [webAuthnLoading, setWebAuthnLoading] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    login,
    loginWithWebAuthn,
    isWebAuthnSupported,
    isPlatformAuthenticatorAvailable
  } = useAuth();

  const form = useForm<LoginFormValues>({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) => (value.length < 3 ? t('auth.usernameMinLength') : null),
      password: (value) => (value.length < 8 ? t('auth.passwordMinLength') : null),
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setUsername(values.username);

    try {
      const success = await login(values.username, values.password);

      if (success) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理WebAuthn登录
  const handleWebAuthnLogin = async () => {
    if (!isWebAuthnSupported) return;

    setWebAuthnLoading(true);

    try {
      // 如果用户已经输入了用户名，使用它进行WebAuthn登录
      const usernameToUse = form.values.username || username;
      const success = await loginWithWebAuthn(usernameToUse || undefined);

      if (success) {
        navigate('/');
      }
    } finally {
      setWebAuthnLoading(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mt="md" mb="md">
          {t('auth.welcomeMessage')}
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          {t('auth.loginDescription')}
        </Text>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label={t('auth.username')}
            placeholder={t('auth.usernamePlaceholder')}
            required
            {...form.getInputProps('username')}
          />

          <PasswordInput
            label={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
            required
            mt="md"
            {...form.getInputProps('password')}
          />

          <Group justify="space-between" mt="lg">
            <Anchor component={Link} to="/register" size="sm">
              {t('auth.noAccountRegister')}
            </Anchor>
            <Anchor component={Link} to="/reset-password" size="sm">
              {t('auth.forgotPassword')}
            </Anchor>
          </Group>

          <Button fullWidth mt="xl" type="submit" loading={loading}>
            {t('auth.loginWithPassword')}
          </Button>
        </form>

        {isWebAuthnSupported && (
          <>
            <Divider label={t('common.or')} labelPosition="center" my="lg" />

            <Button
              fullWidth
              variant="outline"
              leftSection={<IconFingerprint size={16} />}
              onClick={handleWebAuthnLogin}
              loading={webAuthnLoading}
            >
              {t('auth.loginWithBiometrics')}
            </Button>

            {isPlatformAuthenticatorAvailable && (
              <Text size="xs" c="dimmed" ta="center" mt="sm">
                {t('auth.biometricsSupported')}
              </Text>
            )}
          </>
        )}

        {!isWebAuthnSupported && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title={t('auth.biometricsNotSupported')}
            color="yellow"
            mt="lg"
          >
            {t('auth.webAuthnNotSupported')}
          </Alert>
        )}
      </Paper>

      {/* 添加WebAuthn使用指南 */}
      {isWebAuthnSupported && (
        <Box mt="xl">
          <WebAuthnGuide isRegistration={false} />
        </Box>
      )}
    </Container>
  );
}
