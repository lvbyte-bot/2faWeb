import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Card,
  Group,
  Alert,
  Divider,
  Stack,
  Loader,
  Center,
} from '@mantine/core';
import { IconFingerprint, IconAlertCircle, IconCheck, IconX, IconList } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import WebAuthnGuide from '../components/WebAuthnGuide';

export default function WebAuthnSettings() {
  const {
    user,
    isWebAuthnSupported,
    isPlatformAuthenticatorAvailable,
    registerWebAuthn,
  } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);

  // 处理WebAuthn注册
  const handleRegisterWebAuthn = async () => {
    if (!user) return;

    setIsRegistering(true);
    try {
      await registerWebAuthn(user.username);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!user) {
    return (
      <Container size="sm" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="md">
        WebAuthn 设置
      </Title>

      <Text c="dimmed" mb="xl">
        使用 WebAuthn 可以通过指纹、面部识别或安全密钥进行登录，无需输入密码。
      </Text>

      {!isWebAuthnSupported && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="不支持 WebAuthn"
          color="red"
          mb="lg"
        >
          您的浏览器不支持 WebAuthn。请使用最新版本的 Chrome、Firefox、Safari 或 Edge 浏览器。
        </Alert>
      )}

      {isWebAuthnSupported && (
        <Card withBorder p="lg" radius="md" mb="lg">
          <Group mb="md">
            <IconFingerprint size={24} />
            <Title order={3}>生物识别和安全密钥</Title>
          </Group>

          <Text mb="md">
            您可以注册您的设备上的生物识别器（如指纹或面部识别）或安全密钥（如 YubiKey）来进行无密码登录。
          </Text>

          {isPlatformAuthenticatorAvailable ? (
            <Alert
              icon={<IconCheck size={16} />}
              title="支持平台认证器"
              color="green"
              mb="lg"
            >
              您的设备支持平台认证器（如指纹或面部识别）。
            </Alert>
          ) : (
            <Alert
              icon={<IconX size={16} />}
              title="不支持平台认证器"
              color="yellow"
              mb="lg"
            >
              您的设备不支持平台认证器。您仍然可以使用安全密钥（如 YubiKey）进行注册。
            </Alert>
          )}

          <Divider my="md" />

          <Stack>
            <Button
              leftSection={<IconFingerprint size={16} />}
              onClick={handleRegisterWebAuthn}
              loading={isRegistering}
              disabled={!isWebAuthnSupported}
            >
              注册新凭证
            </Button>

            <Button
              component={Link}
              to="/webauthn/credentials"
              leftSection={<IconList size={16} />}
              variant="outline"
            >
              管理已注册凭证
            </Button>
          </Stack>
        </Card>
      )}

      <Alert
        icon={<IconAlertCircle size={16} />}
        title="安全提示"
        color="blue"
        mb="lg"
      >
        <Text mb="xs">使用 WebAuthn 时请注意以下事项：</Text>
        <ul>
          <li>WebAuthn 凭证与您的设备绑定，无法在其他设备上使用</li>
          <li>请确保您的设备安全，不要让他人访问您的生物识别数据</li>
          <li>建议同时注册多种登录方式，以防某种方式不可用</li>
        </ul>
      </Alert>

      {/* 添加WebAuthn使用指南 */}
      <WebAuthnGuide isRegistration={true} />
    </Container>
  );
}
