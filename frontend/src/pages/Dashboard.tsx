import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Card,
  SimpleGrid,
  Modal,
  Loader,
  Center,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconRefresh, IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts } from '../contexts/AccountContext';
import OTPDisplay from '../components/OTPDisplay';
import AccountForm from '../components/AccountForm';
import type { OTPAccount } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const {
    accounts,
    loading,
    error,
    isOnline,
    updateAccount,
    deleteAccount,
    createAccount,
    syncData
  } = useAccounts();
  const [opened, { open, close }] = useDisclosure(false);
  const [editingAccount, setEditingAccount] = useState<OTPAccount | null>(null);

  // 处理编辑账户
  const handleEdit = (account: OTPAccount) => {
    setEditingAccount(account);
    open();
  };

  // 处理添加账户
  const handleAdd = () => {
    setEditingAccount(null);
    open();
  };

  // 处理删除账户
  const handleDelete = (id: string) => {
    deleteAccount(id);
  };

  // 处理表单提交
  const handleSubmit = (values: Omit<OTPAccount, 'id'>) => {
    if (editingAccount) {
      // 更新现有账户
      updateAccount(editingAccount.id, values);
    } else {
      // 创建新账户
      createAccount(values);
    }

    close();
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" align="center" mb="md">
        <Title order={2}>
          欢迎回来，{user?.username || '用户'}
        </Title>

        <Group>
          {isOnline ? (
            <Badge color="green" leftSection={<IconWifi size={14} />}>
              在线模式
            </Badge>
          ) : (
            <Badge color="yellow" leftSection={<IconWifiOff size={14} />}>
              离线模式
            </Badge>
          )}

          <Tooltip label="同步数据">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={syncData}
              disabled={!isOnline}
              data-testid="sync-button"
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Text c="dimmed" mb="xl">
        您的二步验证码都在这里。点击验证码可以复制。
        {!isOnline && ' 当前处于离线模式，部分功能可能不可用。'}
      </Text>

      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : error ? (
        <Card withBorder p="xl" radius="md">
          <Text ta="center" fw={500} mb="md" c="red">
            加载账户时出错
          </Text>
          <Text ta="center" c="dimmed">
            {error}
          </Text>
        </Card>
      ) : accounts.length === 0 ? (
        <Card withBorder p="xl" radius="md">
          <Text ta="center" fw={500} mb="md">
            您还没有添加任何账户
          </Text>
          <Button
            fullWidth
            onClick={handleAdd}
            data-testid="add-account-button"
          >
            添加新账户
          </Button>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {accounts.map((account) => (
            <OTPDisplay
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          <Card withBorder shadow="sm" radius="md" p="md">
            <Card.Section withBorder inheritPadding py="xs">
              <Text fw={500} ta="center">添加新账户</Text>
            </Card.Section>

            <Button
              fullWidth
              variant="outline"
              mt="xl"
              onClick={handleAdd}
              data-testid="add-account-button"
            >
              添加账户
            </Button>
          </Card>
        </SimpleGrid>
      )}

      {/* 账户表单模态框 */}
      <Modal
        opened={opened}
        onClose={close}
        title={editingAccount ? '编辑账户' : '添加新账户'}
        centered
        size="lg"
        data-testid="account-modal"
      >
        <AccountForm
          initialValues={editingAccount || undefined}
          onSubmit={handleSubmit}
          onCancel={close}
          title={editingAccount ? '编辑账户' : '添加新账户'}
        />
      </Modal>
    </Container>
  );
}
