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

interface WebAuthnGuideProps {
  isRegistration?: boolean;
}

export default function WebAuthnGuide({ isRegistration = false }: WebAuthnGuideProps) {
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
        {isRegistration ? '如何注册生物识别登录' : '如何使用生物识别登录'}
      </Title>

      {isMobile ? (
        <Alert
          icon={<IconDeviceMobile size={16} />}
          title="移动设备提示"
          color="blue"
          mb="md"
        >
          您正在使用移动设备。请确保您的设备支持生物识别功能（如指纹识别或面部识别）。
        </Alert>
      ) : hasPlatformAuthenticator ? (
        <Alert
          icon={<IconDeviceLaptop size={16} />}
          title="桌面设备提示"
          color="blue"
          mb="md"
        >
          您的设备支持内置生物识别功能。您可以使用指纹识别器、面部识别或Windows Hello进行认证。
        </Alert>
      ) : (
        <Alert
          icon={<IconFingerprint size={16} />}
          title="安全密钥提示"
          color="blue"
          mb="md"
        >
          您的设备不支持内置生物识别功能。您可以使用外部安全密钥（如YubiKey）进行认证。
        </Alert>
      )}

      <Accordion variant="separated" mb="md">
        <Accordion.Item value="what-is-webauthn">
          <Accordion.Control>什么是WebAuthn？</Accordion.Control>
          <Accordion.Panel>
            <Text mb="sm">
              WebAuthn（Web Authentication）是一种新的网络标准，允许用户使用生物识别（如指纹、面部识别）或安全密钥（如YubiKey）登录网站，而不需要输入密码。
            </Text>
            <Text>
              这种方式比传统的密码登录更安全，因为它可以防止钓鱼攻击，并且生物识别数据永远不会离开您的设备。
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="how-to-use">
          <Accordion.Control>
            {isRegistration ? '如何注册生物识别登录？' : '如何使用生物识别登录？'}
          </Accordion.Control>
          <Accordion.Panel>
            {isRegistration ? (
              <Stack>
                <Text>注册生物识别登录只需几个简单步骤：</Text>
                <List spacing="xs" size="sm" center icon={
                  <ThemeIcon color="teal" size={24} radius="xl">
                    <IconCheck style={{ width: rem(16), height: rem(16) }} />
                  </ThemeIcon>
                }>
                  <List.Item>点击"注册新凭证"按钮</List.Item>
                  <List.Item>
                    {isMobile
                      ? '按照设备提示使用您的指纹或面部识别进行验证'
                      : hasPlatformAuthenticator
                        ? '按照系统提示使用您的指纹、面部识别或Windows Hello进行验证'
                        : '插入您的安全密钥并按下按钮，或按照提示操作'}
                  </List.Item>
                  <List.Item>完成注册后，您可以在凭证管理页面查看和管理您的凭证</List.Item>
                </List>
              </Stack>
            ) : (
              <Stack>
                <Text>使用生物识别登录只需几个简单步骤：</Text>
                <List spacing="xs" size="sm" center icon={
                  <ThemeIcon color="teal" size={24} radius="xl">
                    <IconCheck style={{ width: rem(16), height: rem(16) }} />
                  </ThemeIcon>
                }>
                  <List.Item>在登录页面输入您的用户名</List.Item>
                  <List.Item>点击"使用生物识别或安全密钥登录"按钮</List.Item>
                  <List.Item>
                    {isMobile
                      ? '按照设备提示使用您的指纹或面部识别进行验证'
                      : hasPlatformAuthenticator
                        ? '按照系统提示使用您的指纹、面部识别或Windows Hello进行验证'
                        : '插入您的安全密钥并按下按钮，或按照提示操作'}
                  </List.Item>
                </List>
              </Stack>
            )}
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="troubleshooting">
          <Accordion.Control>常见问题解决</Accordion.Control>
          <Accordion.Panel>
            <Stack>
              <Text>如果您在使用生物识别登录时遇到问题，请尝试以下解决方案：</Text>
              <List>
                <List.Item>确保您的浏览器是最新版本</List.Item>
                <List.Item>确保您的设备支持生物识别功能</List.Item>
                <List.Item>如果使用安全密钥，确保它已正确插入</List.Item>
                <List.Item>尝试刷新页面后重试</List.Item>
                <List.Item>如果问题仍然存在，您可以使用密码登录</List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Divider my="md" />

      <Text size="sm" c="dimmed">
        生物识别数据永远不会离开您的设备。我们只存储用于验证的公钥，而私钥和生物识别数据保留在您的设备上。
      </Text>
    </Paper>
  );
}
