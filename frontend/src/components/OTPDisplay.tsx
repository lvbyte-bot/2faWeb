import { useState, useEffect } from 'react';
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
import { OTPAccount, generateOTP, getRemainingSeconds } from '../utils/otp';

interface OTPDisplayProps {
  account: OTPAccount;
  onEdit: (account: OTPAccount) => void;
  onDelete: (id: string) => void;
}

export default function OTPDisplay({ account, onEdit, onDelete }: OTPDisplayProps) {
  const [code, setCode] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [showCode, setShowCode] = useState<boolean>(true);
  
  // 生成 OTP 码
  const generateCode = () => {
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
    }
  };
  
  // 复制代码到剪贴板
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(
      () => {
        notifications.show({
          title: '已复制',
          message: '验证码已复制到剪贴板',
          color: 'green',
        });
      },
      () => {
        notifications.show({
          title: '复制失败',
          message: '无法复制验证码',
          color: 'red',
        });
      }
    );
  };
  
  // 增加 HOTP 计数器
  const incrementCounter = async () => {
    if (account.type === 'HOTP' && account.counter !== undefined) {
      // 这里应该调用 API 更新计数器
      // 暂时只在本地更新
      onEdit({
        ...account,
        counter: account.counter + 1,
      });
      
      // 生成新的 OTP 码
      generateCode();
    }
  };
  
  // 初始生成 OTP 码
  useEffect(() => {
    generateCode();
  }, [account]);
  
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
  }, [account]);
  
  // 获取进度条颜色
  const getProgressColor = () => {
    if (account.type !== 'TOTP') return 'blue';
    
    if (timeRemaining < 5) return 'red';
    if (timeRemaining < 10) return 'orange';
    return 'blue';
  };
  
  // 获取进度百分比
  const getProgressValue = () => {
    if (account.type !== 'TOTP' || !account.period) return 0;
    return (timeRemaining / account.period) * 100;
  };
  
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
