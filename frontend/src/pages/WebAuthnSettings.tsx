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
import { useTranslation } from 'react-i18next';

export default function WebAuthnSettings() {
  const { t } = useTranslation();
  
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
        {t('settings.webauthn.title')}
      </Title>

      <Text c="dimmed" mb="xl">
        {t('settings.webauthn.description')}
      </Text>

      {!isWebAuthnSupported && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={t('settings.webauthn.notSupported')}
          color="red"
          mb="lg"
        >
          {t('settings.webauthn.notSupportedMessage')}
        </Alert>
      )}

      {isWebAuthnSupported && (
        <Card withBorder p="lg" radius="md" mb="lg">
          <Group mb="md">
            <IconFingerprint size={24} />
            <Title order={3}>{t('settings.webauthn.biometricsAndSecurityKeys')}</Title>
          </Group>

          <Text mb="md">
            {t('settings.webauthn.registerDescription')}
          </Text>

          {isPlatformAuthenticatorAvailable ? (
            <Alert
              icon={<IconCheck size={16} />}
              title={t('settings.webauthn.platformAuthenticatorSupported')}
              color="green"
              mb="lg"
            >
              {t('settings.webauthn.platformAuthenticatorSupportedMessage')}
            </Alert>
          ) : (
            <Alert
              icon={<IconX size={16} />}
              title={t('settings.webauthn.platformAuthenticatorNotSupported')}
              color="yellow"
              mb="lg"
            >
              {t('settings.webauthn.platformAuthenticatorNotSupportedMessage')}
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
              {t('settings.webauthn.registerNewCredential')}
            </Button>

            <Button
              component={Link}
              to="/webauthn/credentials"
              leftSection={<IconList size={16} />}
              variant="outline"
            >
              {t('settings.webauthn.manageRegisteredCredentials')}
            </Button>
          </Stack>
        </Card>
      )}

      <Alert
        icon={<IconAlertCircle size={16} />}
        title={t('settings.webauthn.securityTip')}
        color="blue"
        mb="lg"
      >
        <Text mb="xs">{t('settings.webauthn.securityTipMessage')}</Text>
        <ul>
          <li>{t('settings.webauthn.securityTip1')}</li>
          <li>{t('settings.webauthn.securityTip2')}</li>
          <li>{t('settings.webauthn.securityTip3')}</li>
        </ul>
      </Alert>

      {/* 添加WebAuthn使用指南 */}
      <WebAuthnGuide isRegistration={true} />
    </Container>
  );
}
