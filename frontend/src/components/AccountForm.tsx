import { useState } from 'react';
import {
  TextInput,
  Select,
  NumberInput,
  Button,
  Group,
  Stack,
  Paper,
  Text,
  Divider,
  Modal,
  PasswordInput,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { QRCodeSVG } from 'qrcode.react';
import type { OTPAccount } from '@/types';
import { generateRandomSecret, generateOtpUri, parseOtpUri } from '../utils/otp';
import QRCodeScanner from './QRCodeScanner';

interface AccountFormProps {
  initialValues?: Partial<OTPAccount>;
  groups?: { value: string; label: string }[];
  onSubmit: (values: Omit<OTPAccount, 'id'>) => void;
  onCancel: () => void;
  title?: string;
}

export default function AccountForm({
  initialValues,
  groups = [],
  onSubmit,
  onCancel,
  title = '添加账户',
}: AccountFormProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUri, setQrCodeUri] = useState<string>('');

  // 表单初始值
  const defaultValues: Omit<OTPAccount, 'id'> = {
    name: '',
    issuer: '',
    secret: generateRandomSecret(),
    type: 'TOTP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    ...initialValues,
  };

  // 创建表单
  const form = useForm<Omit<OTPAccount, 'id'>>({
    initialValues: defaultValues,
    validate: {
      name: (value) => (value.length < 1 ? '名称不能为空' : null),
      issuer: (value) => (value.length < 1 ? '发行方不能为空' : null),
      secret: (value) => (value.length < 16 ? '密钥长度不足' : null),
    },
  });

  // 处理表单提交
  const handleSubmit = (values: Omit<OTPAccount, 'id'>) => {
    // 根据类型处理特定字段
    if (values.type === 'TOTP') {
      // 确保 TOTP 账户有 period 字段
      values.period = values.period || 30;
      // 移除 counter 字段
      delete values.counter;
    } else {
      // 确保 HOTP 账户有 counter 字段
      values.counter = values.counter || 0;
      // 移除 period 字段
      delete values.period;
    }

    onSubmit(values);
  };

  // 处理二维码扫描
  const handleScan = (uri: string) => {
    try {
      // 解析 OTP URI
      const account = parseOtpUri(uri);

      // 更新表单值
      form.setValues({
        name: account.name,
        issuer: account.issuer,
        secret: account.secret,
        type: account.type,
        algorithm: account.algorithm,
        digits: account.digits,
        period: account.period,
        counter: account.counter,
      });

      // 关闭扫描器
      setShowScanner(false);
    } catch (error) {
      console.error('解析 OTP URI 失败:', error);
    }
  };

  // 生成 QR 码
  const generateQRCode = () => {
    try {
      // 创建临时账户对象
      const tempAccount: OTPAccount = {
        id: 'temp',
        ...form.values,
      };

      // 生成 OTP URI
      const uri = generateOtpUri(tempAccount);

      // 设置 QR 码 URI
      setQrCodeUri(uri);

      // 显示 QR 码
      setShowQRCode(true);
    } catch (error) {
      console.error('生成 QR 码失败:', error);
    }
  };

  return (
    <>
      <Paper p="md" radius="md" withBorder>
        <Text fw={500} size="lg" mb="md">{title}</Text>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Group grow>
              <TextInput
                label="名称"
                placeholder="例如：Gmail"
                required
                {...form.getInputProps('name')}
              />

              <TextInput
                label="发行方"
                placeholder="例如：Google"
                required
                {...form.getInputProps('issuer')}
              />
            </Group>

            <Group align="flex-end">
              <PasswordInput
                label="密钥"
                placeholder="Base32 编码的密钥"
                required
                style={{ flex: 1 }}
                {...form.getInputProps('secret')}
              />

              <CopyButton value={form.values.secret}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? '已复制' : '复制密钥'}>
                    <ActionIcon variant="filled" color={copied ? 'green' : 'blue'} onClick={copy}>
                      {copied ? '✓' : '📋'}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>

              <Button variant="outline" onClick={() => form.setFieldValue('secret', generateRandomSecret())}>
                生成新密钥
              </Button>
            </Group>

            <Divider label="高级设置" labelPosition="center" />

            <Group grow>
              <Select
                label="类型"
                data={[
                  { value: 'TOTP', label: 'TOTP (基于时间)' },
                  { value: 'HOTP', label: 'HOTP (基于计数器)' },
                ]}
                {...form.getInputProps('type')}
              />

              <Select
                label="算法"
                data={[
                  { value: 'SHA1', label: 'SHA1' },
                  { value: 'SHA256', label: 'SHA256' },
                  { value: 'SHA512', label: 'SHA512' },
                ]}
                {...form.getInputProps('algorithm')}
              />
            </Group>

            <Group grow>
              <Select
                label="位数"
                data={[
                  { value: '6', label: '6 位' },
                  { value: '8', label: '8 位' },
                ]}
                {...form.getInputProps('digits')}
                onChange={(value) => form.setFieldValue('digits', Number(value))}
              />

              {form.values.type === 'TOTP' ? (
                <NumberInput
                  label="周期（秒）"
                  min={10}
                  max={120}
                  {...form.getInputProps('period')}
                />
              ) : (
                <NumberInput
                  label="计数器"
                  min={0}
                  {...form.getInputProps('counter')}
                />
              )}
            </Group>

            {groups.length > 0 && (
              <Select
                label="分组"
                placeholder="选择分组（可选）"
                data={groups}
                clearable
                {...form.getInputProps('groupId')}
              />
            )}

            <Divider />

            <Group justify="space-between">
              <Button variant="outline" onClick={() => setShowScanner(true)}>
                扫描二维码
              </Button>

              <Button variant="outline" onClick={generateQRCode}>
                生成二维码
              </Button>
            </Group>

            <Group justify="flex-end">
              <Button variant="subtle" onClick={onCancel}>
                取消
              </Button>

              <Button
                type="submit"
                data-testid="save-account-button"
              >
                保存
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {/* 二维码扫描模态框 */}
      <Modal
        opened={showScanner}
        onClose={() => setShowScanner(false)}
        title="扫描二维码"
        centered
        size="md"
      >
        <QRCodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      </Modal>

      {/* 二维码显示模态框 */}
      <Modal
        opened={showQRCode}
        onClose={() => setShowQRCode(false)}
        title="账户二维码"
        centered
        size="sm"
      >
        <Stack align="center">
          <Text>使用其他 2FA 应用扫描此二维码</Text>

          <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
            <QRCodeSVG
              value={qrCodeUri}
              size={200}
              level="M"
              includeMargin
            />
          </div>

          <Text size="xs" c="dimmed" ta="center">
            {qrCodeUri}
          </Text>

          <Button onClick={() => setShowQRCode(false)}>
            关闭
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
