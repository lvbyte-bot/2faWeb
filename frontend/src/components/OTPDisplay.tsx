import { useState, useEffect, useCallback, memo } from 'react';
import {
  Card,
  Text,
  Button,
  Group,
  Badge,
  Progress,
  ActionIcon,
  Menu,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { OTPAccount } from '@/types';
import { generateOTP, getRemainingSeconds } from '../utils/otp';
import { usePerformanceMonitoring } from '../utils/performance';

interface OTPDisplayProps {
  account: OTPAccount;
  onEdit: (account: OTPAccount) => void;
  onDelete: (id: string) => void;
}

function OTPDisplay({ account, onEdit, onDelete }: OTPDisplayProps) {
  const performance = usePerformanceMonitoring('OTPDisplay');
  const [code, setCode] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [showCode, setShowCode] = useState<boolean>(true);

  // 生成 OTP 码
  const generateCode = useCallback(() => {
    const perfId = performance.start();
    try {
      // 生成新的 OTP 码
      const newCode = generateOTP(account);
      setCode(newCode);

      // 如果是 TOTP，更新剩余时间
      if (account.type === 'TOTP') {
        setTimeRemaining(getRemainingSeconds(account.period));
      }
    } catch (error) {
      console.error('生成 OTP 码失败:', error);
      setCode('错误');
    } finally {
      performance.end(perfId);
    }
  }, [account, performance]);

  // 复制代码到剪贴板
  const copyToClipboard = useCallback(() => {
    const perfId = performance.start();
    navigator.clipboard.writeText(code).then(
      () => {
        notifications.show({
          title: '已复制',
          message: '验证码已复制到剪贴板',
          color: 'green',
        });
        performance.end(perfId);
      },
      () => {
        notifications.show({
          title: '复制失败',
          message: '无法复制验证码',
          color: 'red',
        });
        performance.end(perfId);
      }
    );
  }, [code, performance]);

  // 增加 HOTP 计数器
  const incrementCounter = useCallback(async () => {
    if (account.type === 'HOTP' && account.counter !== undefined) {
      const perfId = performance.start();
      // 这里应该调用 API 更新计数器
      // 暂时只在本地更新
      onEdit({
        ...account,
        counter: account.counter + 1,
      });

      // 生成新的 OTP 码
      generateCode();
      performance.end(perfId);
    }
  }, [account, onEdit, generateCode, performance]);

  // 初始生成 OTP 码
  useEffect(() => {
    const perfId = performance.start();
    generateCode();
    performance.end(perfId);
  }, [generateCode]);

  // TOTP 倒计时
  useEffect(() => {
    if (account.type !== 'TOTP') return;

    const timer = setInterval(() => {
      const remaining = getRemainingSeconds(account.period);
      setTimeRemaining(remaining);

      // 当时间归零时，生成新的 OTP 码
      if (remaining === account.period) {
        generateCode();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [account.type, account.period, generateCode]);

  // 获取进度条颜色
  const getProgressColor = useCallback(() => {
    if (account.type !== 'TOTP') return 'blue';

    if (timeRemaining < 5) return 'red';
    if (timeRemaining < 10) return 'orange';
    return 'blue';
  }, [account.type, timeRemaining]);

  // 获取进度百分比
  const getProgressValue = useCallback(() => {
    if (account.type !== 'TOTP' || !account.period) return 0;
    return (timeRemaining / account.period) * 100;
  }, [account.type, account.period, timeRemaining]);

  return (
    <Card withBorder shadow="sm" radius="md" p="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500}>{account.name}</Text>

          <Group gap="xs">
            <Badge>{account.type}</Badge>

            <Menu position="bottom-end" withArrow>
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm">⋮</ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item onClick={() => onEdit(account)}>
                  编辑
                </Menu.Item>

                <Menu.Item color="red" onClick={() => onDelete(account.id)}>
                  删除
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Card.Section>

      <Text size="xs" c="dimmed" mt="md">
        {account.issuer}
      </Text>

      <Button
        fullWidth
        variant="light"
        size="xl"
        mt="md"
        onClick={copyToClipboard}
        className="otp-code"
      >
        {showCode ? code : '••••••'}
      </Button>

      <Group mt="xs" position="apart">
        <Tooltip label={showCode ? '隐藏验证码' : '显示验证码'}>
          <ActionIcon onClick={() => setShowCode(!showCode)}>
            {showCode ? '👁️' : '👁️‍🗨️'}
          </ActionIcon>
        </Tooltip>

        {account.type === 'HOTP' && (
          <Tooltip label="生成新验证码">
            <ActionIcon onClick={incrementCounter}>
              🔄
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {account.type === 'TOTP' && (
        <>
          <Progress
            value={getProgressValue()}
            mt="md"
            size="sm"
            color={getProgressColor()}
          />

          <Text size="xs" ta="center" mt="xs" className={`countdown-${getProgressColor()}`}>
            {timeRemaining}秒后刷新
          </Text>
        </>
      )}
    </Card>
  );
}

// 使用React.memo包装组件，避免不必要的重渲染
export default memo(OTPDisplay, (prevProps, nextProps) => {
  // 只有当账户数据发生变化时才重新渲染
  return (
    prevProps.account.id === nextProps.account.id &&
    prevProps.account.name === nextProps.account.name &&
    prevProps.account.issuer === nextProps.account.issuer &&
    prevProps.account.type === nextProps.account.type &&
    prevProps.account.counter === nextProps.account.counter
  );
});
