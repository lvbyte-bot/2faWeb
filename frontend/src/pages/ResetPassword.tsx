import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Center,
  Stack,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../services/api';

// 密码重置请求表单
function RequestResetForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '请输入有效的电子邮件地址'),
    },
  });

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/password-reset/request', values) as Response;
      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        notifications.show({
          title: '请求已发送',
          message: '如果该邮箱存在，我们已发送密码重置邮件',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } else {
        throw new Error(data.error || '请求密码重置失败');
      }
    } catch (error) {
      notifications.show({
        title: '请求失败',
        message: error instanceof Error ? error.message : '请求密码重置失败，请稍后重试',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder p="xl" radius="md">
      {success ? (
        <Stack>
          <Alert
            icon={<IconCheck size={16} />}
            title="请求已发送"
            color="green"
          >
            如果该邮箱存在，我们已发送密码重置邮件。请检查您的邮箱，并按照邮件中的指示重置密码。
          </Alert>
          <Button component={Link} to="/login" variant="outline">
            返回登录
          </Button>
        </Stack>
      ) : (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Title order={3}>重置密码</Title>
            <Text c="dimmed" size="sm">
              请输入您的电子邮件地址，我们将向您发送密码重置链接。
            </Text>

            <TextInput
              label="电子邮件"
              placeholder="your@email.com"
              required
              {...form.getInputProps('email')}
            />

            <Button type="submit" loading={loading}>
              发送重置链接
            </Button>

            <Group justify="center">
              <Text size="sm">
                记起密码了？{' '}
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  返回登录
                </Link>
              </Text>
            </Group>
          </Stack>
        </form>
      )}
    </Paper>
  );
}

// 密码重置表单
function ResetPasswordForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) => (value.length >= 8 ? null : '密码必须至少包含8个字符'),
      confirmPassword: (value, values) =>
        value === values.password ? null : '两次输入的密码不匹配',
    },
  });

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/password-reset/reset', {
        token,
        password: values.password,
      }) as Response;
      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        notifications.show({
          title: '密码已重置',
          message: '您的密码已成功重置，请使用新密码登录',
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        // 3秒后重定向到登录页面
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        throw new Error(data.error || '重置密码失败');
      }
    } catch (error) {
      notifications.show({
        title: '重置失败',
        message: error instanceof Error ? error.message : '重置密码失败，请稍后重试',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder p="xl" radius="md">
      {success ? (
        <Stack>
          <Alert
            icon={<IconCheck size={16} />}
            title="密码已重置"
            color="green"
          >
            您的密码已成功重置，请使用新密码登录。正在跳转到登录页面...
          </Alert>
          <Button component={Link} to="/login" variant="outline">
            立即前往登录
          </Button>
        </Stack>
      ) : (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Title order={3}>设置新密码</Title>
            <Text c="dimmed" size="sm">
              请输入您的新密码。
            </Text>

            <PasswordInput
              label="新密码"
              placeholder="输入新密码"
              required
              {...form.getInputProps('password')}
            />

            <PasswordInput
              label="确认密码"
              placeholder="再次输入新密码"
              required
              {...form.getInputProps('confirmPassword')}
            />

            <Button type="submit" loading={loading}>
              重置密码
            </Button>

            <Group justify="center">
              <Text size="sm">
                记起密码了？{' '}
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  返回登录
                </Link>
              </Text>
            </Group>
          </Stack>
        </form>
      )}
    </Paper>
  );
}

// 密码重置页面
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  return (
    <Container size="xs" py="xl">
      <Center mb="xl">
        <Title order={2}>2FA Web</Title>
      </Center>

      {token ? <ResetPasswordForm token={token} /> : <RequestResetForm />}
    </Container>
  );
}
