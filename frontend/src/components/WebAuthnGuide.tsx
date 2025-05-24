import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  List,
  ThemeIcon,
  Accordion,
  Alert,
  Group,
  Image,
  Stack,
  Divider,
  useMantineTheme,
  rem,
} from '@mantine/core';
import { IconCheck, IconAlertCircle, IconDeviceMobile, IconDeviceLaptop, IconFingerprint } from '@tabler/icons-react';
import { isPlatformAuthenticatorAvailable } from '../services/webAuthnService';
import { useTranslation } from 'react-i18next';

interface WebAuthnGuideProps {
  isRegistration?: boolean;
}

export default function WebAuthnGuide({ isRegistration = false }: WebAuthnGuideProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [hasPlatformAuthenticator, setHasPlatformAuthenticator] = useState(false);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
  }, []);

  // 检测是否支持平台认证器
  useEffect(() => {
    const checkPlatformAuthenticator = async () => {
      const supported = await isPlatformAuthenticatorAvailable();
      setHasPlatformAuthenticator(supported);
    };

    checkPlatformAuthenticator();
  }, []);

  return (
    <Paper withBorder p="md" radius="md">
      <Title order={3} mb="md">
        {isRegistration ? t('settings.webauthnGuide.registrationTitle') : t('settings.webauthnGuide.usageTitle')}
      </Title>

      {isMobile ? (
        <Alert
          icon={<IconDeviceMobile size={16} />}
          title={t('settings.webauthnGuide.mobileDeviceTip')}
          color="blue"
          mb="md"
        >
          {t('settings.webauthnGuide.mobileDeviceMessage')}
        </Alert>
      ) : hasPlatformAuthenticator ? (
        <Alert
          icon={<IconDeviceLaptop size={16} />}
          title={t('settings.webauthnGuide.desktopDeviceTip')}
          color="blue"
          mb="md"
        >
          {t('settings.webauthnGuide.desktopDeviceMessage')}
        </Alert>
      ) : (
        <Alert
          icon={<IconFingerprint size={16} />}
          title={t('settings.webauthnGuide.securityKeyTip')}
          color="blue"
          mb="md"
        >
          {t('settings.webauthnGuide.securityKeyMessage')}
        </Alert>
      )}

      <Accordion variant="separated" mb="md">
        <Accordion.Item value="what-is-webauthn">
          <Accordion.Control>{t('settings.webauthnGuide.whatIsWebauthn')}</Accordion.Control>
          <Accordion.Panel>
            <Text mb="sm">
              {t('settings.webauthnGuide.whatIsWebauthnContent1')}
            </Text>
            <Text>
              {t('settings.webauthnGuide.whatIsWebauthnContent2')}
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="how-to-use">
          <Accordion.Control>
            {isRegistration ? t('settings.webauthnGuide.howToRegister') : t('settings.webauthnGuide.howToUse')}
          </Accordion.Control>
          <Accordion.Panel>
            {isRegistration ? (
              <Stack>
                <Text>{t('settings.webauthnGuide.registrationStepsIntro')}</Text>
                <List spacing="xs" size="sm" center icon={
                  <ThemeIcon color="teal" size={24} radius="xl">
                    <IconCheck style={{ width: rem(16), height: rem(16) }} />
                  </ThemeIcon>
                }>
                  <List.Item>{t('settings.webauthnGuide.registrationStep1')}</List.Item>
                  <List.Item>
                    {isMobile
                      ? t('settings.webauthnGuide.registrationStep2Mobile')
                      : hasPlatformAuthenticator
                        ? t('settings.webauthnGuide.registrationStep2Desktop')
                        : t('settings.webauthnGuide.registrationStep2SecurityKey')}
                  </List.Item>
                  <List.Item>{t('settings.webauthnGuide.registrationStep3')}</List.Item>
                </List>
              </Stack>
            ) : (
              <Stack>
                <Text>{t('settings.webauthnGuide.usageStepsIntro')}</Text>
                <List spacing="xs" size="sm" center icon={
                  <ThemeIcon color="teal" size={24} radius="xl">
                    <IconCheck style={{ width: rem(16), height: rem(16) }} />
                  </ThemeIcon>
                }>
                  <List.Item>{t('settings.webauthnGuide.usageStep1')}</List.Item>
                  <List.Item>{t('settings.webauthnGuide.usageStep2')}</List.Item>
                  <List.Item>
                    {isMobile
                      ? t('settings.webauthnGuide.usageStep3Mobile')
                      : hasPlatformAuthenticator
                        ? t('settings.webauthnGuide.usageStep3Desktop')
                        : t('settings.webauthnGuide.usageStep3SecurityKey')}
                  </List.Item>
                </List>
              </Stack>
            )}
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="troubleshooting">
          <Accordion.Control>{t('settings.webauthnGuide.troubleshooting')}</Accordion.Control>
          <Accordion.Panel>
            <Stack>
              <Text>{t('settings.webauthnGuide.troubleshootingIntro')}</Text>
              <List>
                <List.Item>{t('settings.webauthnGuide.troubleshootingTip1')}</List.Item>
                <List.Item>{t('settings.webauthnGuide.troubleshootingTip2')}</List.Item>
                <List.Item>{t('settings.webauthnGuide.troubleshootingTip3')}</List.Item>
                <List.Item>{t('settings.webauthnGuide.troubleshootingTip4')}</List.Item>
                <List.Item>{t('settings.webauthnGuide.troubleshootingTip5')}</List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Divider my="md" />

      <Text size="sm" c="dimmed">
        {t('settings.webauthnGuide.securityNote')}
      </Text>
    </Paper>
  );
}
