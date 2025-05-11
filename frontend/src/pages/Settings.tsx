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
  Anchor
} from '@mantine/core';
import { IconFingerprint } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();

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
      title: '设置已保存',
      message: '您的偏好设置已成功更新',
      color: 'green',
    });
  };

  // 更新账户信息
  const updateAccount = () => {
    // 在实际应用中，这里应该调用API更新账户信息
    notifications.show({
      title: '账户已更新',
      message: '您的账户信息已成功更新',
      color: 'green',
    });
  };

  // 更改密码
  const changePassword = () => {
    if (newPassword !== confirmPassword) {
      notifications.show({
        title: '密码不匹配',
        message: '新密码和确认密码不匹配',
        color: 'red',
      });
      return;
    }

    // 在实际应用中，这里应该调用API更改密码
    notifications.show({
      title: '密码已更改',
      message: '您的密码已成功更改',
      color: 'green',
    });

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        设置
      </Title>

      <Text c="dimmed" mb="xl">
        自定义您的2FA Web体验
      </Text>

      <Tabs defaultValue="preferences">
        <Tabs.List mb="md">
          <Tabs.Tab value="preferences">偏好设置</Tabs.Tab>
          <Tabs.Tab value="account">账户设置</Tabs.Tab>
          <Tabs.Tab value="security">安全设置</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="preferences">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Group justify="space-between">
                <div>
                  <Text fw={500}>自动锁定</Text>
                  <Text size="xs" c="dimmed">在一段时间不活动后自动锁定应用</Text>
                </div>
                <Switch checked={autoLock} onChange={(e) => setAutoLock(e.currentTarget.checked)} />
              </Group>

              {autoLock && (
                <NumberInput
                  label="锁定超时（分钟）"
                  value={lockTimeout}
                  onChange={(value) => setLockTimeout(Number(value))}
                  min={1}
                  max={60}
                />
              )}

              <Divider />

              <Group justify="space-between">
                <div>
                  <Text fw={500}>隐藏OTP码</Text>
                  <Text size="xs" c="dimmed">默认隐藏OTP码，点击显示</Text>
                </div>
                <Switch checked={hideOtpCodes} onChange={(e) => setHideOtpCodes(e.currentTarget.checked)} />
              </Group>

              <Divider />

              <Select
                label="默认算法"
                description="新账户的默认哈希算法"
                data={[
                  { value: 'SHA1', label: 'SHA1' },
                  { value: 'SHA256', label: 'SHA256' },
                  { value: 'SHA512', label: 'SHA512' },
                ]}
                value={defaultAlgorithm}
                onChange={(value) => setDefaultAlgorithm(value || 'SHA1')}
              />

              <Select
                label="默认位数"
                description="新账户的默认OTP码位数"
                data={[
                  { value: '6', label: '6位' },
                  { value: '8', label: '8位' },
                ]}
                value={String(defaultDigits)}
                onChange={(value) => setDefaultDigits(Number(value) || 6)}
              />

              <NumberInput
                label="默认周期（秒）"
                description="新TOTP账户的默认周期"
                value={defaultPeriod}
                onChange={(value) => setDefaultPeriod(Number(value))}
                min={10}
                max={120}
              />

              <Button onClick={saveUserSettings}>保存设置</Button>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="account">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <TextInput
                label="用户名"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
              />

              <TextInput
                label="电子邮件"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />

              <Button onClick={updateAccount}>更新账户信息</Button>

              <Divider label="更改密码" labelPosition="center" />

              <PasswordInput
                label="当前密码"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              />

              <PasswordInput
                label="新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
              />

              <PasswordInput
                label="确认新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              />

              <Button onClick={changePassword}>更改密码</Button>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="security">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <div>
                <Text fw={500}>WebAuthn身份验证</Text>
                <Text size="xs" c="dimmed" mb="md">使用生物识别或安全密钥进行身份验证</Text>

                <Button
                  component={Link}
                  to="/webauthn"
                  variant="outline"
                  fullWidth
                  mb="md"
                  leftSection={<IconFingerprint size={16} />}
                >
                  设置生物识别登录
                </Button>
              </div>

              <Divider />

              <div>
                <Text fw={500}>会话管理</Text>
                <Text size="xs" c="dimmed" mb="md">管理您的活动会话</Text>

                <Button variant="outline" fullWidth mb="md">
                  查看活动会话
                </Button>
              </div>

              <Divider />

              <div>
                <Text fw={500} c="red">危险区域</Text>
                <Text size="xs" c="dimmed" mb="md">这些操作不可逆</Text>

                <Button color="red" variant="outline" fullWidth>
                  删除账户
                </Button>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
