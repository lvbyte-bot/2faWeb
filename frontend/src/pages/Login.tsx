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

interface LoginFormValues {
  username: string;
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [webAuthnLoading, setWebAuthnLoading] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
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
      username: (value) => (value.length < 3 ? '用户名至少需要3个字符' : null),
      password: (value) => (value.length < 8 ? '密码至少需要8个字符' : null),
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
          欢迎使用2FA Web
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          登录您的账户以管理二步验证
        </Text>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="用户名"
            placeholder="您的用户名"
            required
            {...form.getInputProps('username')}
          />

          <PasswordInput
            label="密码"
            placeholder="您的密码"
            required
            mt="md"
            {...form.getInputProps('password')}
          />

          <Group justify="space-between" mt="lg">
            <Anchor component={Link} to="/register" size="sm">
              没有账户？注册
            </Anchor>
          </Group>

          <Button fullWidth mt="xl" type="submit" loading={loading}>
            使用密码登录
          </Button>
        </form>

        {isWebAuthnSupported && (
          <>
            <Divider label="或" labelPosition="center" my="lg" />

            <Button
              fullWidth
              variant="outline"
              leftSection={<IconFingerprint size={16} />}
              onClick={handleWebAuthnLogin}
              loading={webAuthnLoading}
            >
              使用生物识别或安全密钥登录
            </Button>

            {isPlatformAuthenticatorAvailable && (
              <Text size="xs" c="dimmed" ta="center" mt="sm">
                您的设备支持生物识别登录（如指纹或面部识别）
              </Text>
            )}
          </>
        )}

        {!isWebAuthnSupported && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="不支持生物识别登录"
            color="yellow"
            mt="lg"
          >
            您的浏览器不支持WebAuthn。请使用最新版本的Chrome、Firefox、Safari或Edge浏览器以启用生物识别登录。
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
