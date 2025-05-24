import { useState, useCallback, useMemo } from 'react';
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
import { usePerformanceMonitoring } from '../utils/performance';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const performance = usePerformanceMonitoring('Dashboard');
  const { user } = useAuth();
  const { t } = useTranslation();
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
  const handleEdit = useCallback((account: OTPAccount) => {
    const perfId = performance.start();
    setEditingAccount(account);
    open();
    performance.end(perfId);
  }, [open, performance]);

  // 处理添加账户
  const handleAdd = useCallback(() => {
    const perfId = performance.start();
    setEditingAccount(null);
    open();
    performance.end(perfId);
  }, [open, performance]);

  // 处理删除账户
  const handleDelete = useCallback((id: string) => {
    const perfId = performance.start();
    deleteAccount(id);
    performance.end(perfId);
  }, [deleteAccount, performance]);

  // 处理表单提交
  const handleSubmit = useCallback((values: Omit<OTPAccount, 'id'>) => {
    const perfId = performance.start();
    if (editingAccount) {
      // 更新现有账户
      updateAccount(editingAccount.id, values);
    } else {
      // 创建新账户
      createAccount(values);
    }
    close();
    performance.end(perfId);
  }, [editingAccount, updateAccount, createAccount, close, performance]);

  // 使用useMemo优化同步按钮
  const syncButton = useMemo(() => (
    <Tooltip label={t('dashboard.syncData')}>
      <ActionIcon
        variant="light"
        color="blue"
        onClick={() => {
          const perfId = performance.start();
          syncData().finally(() => performance.end(perfId));
        }}
        disabled={!isOnline}
        data-testid="sync-button"
      >
        <IconRefresh size={18} />
      </ActionIcon>
    </Tooltip>
  ), [isOnline, syncData, performance]);

  // 使用useMemo优化网络状态显示
  const networkStatus = useMemo(() => (
    isOnline ? (
      <Badge color="green" leftSection={<IconWifi size={14} />}>
        {t('dashboard.onlineMode')}
      </Badge>
    ) : (
      <Badge color="yellow" leftSection={<IconWifiOff size={14} />}>
        {t('dashboard.offlineMode')}
      </Badge>
    )
  ), [isOnline, t]);

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" align="center" mb="md">
        <Title order={2}>
          {t('dashboard.welcomeBack')}, {user?.username || t('dashboard.user')}
        </Title>

        <Group>
          {networkStatus}
          {syncButton}
        </Group>
      </Group>

      <Text c="dimmed" mb="xl">
        {t('dashboard.otpCodeDescription')}
        {!isOnline && t('dashboard.offlineWarning')}
      </Text>

      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : error ? (
        <Card withBorder p="xl" radius="md">
          <Text ta="center" fw={500} mb="md" c="red">
            {t('dashboard.loadingError')}
          </Text>
          <Text ta="center" c="dimmed">
            {error}
          </Text>
        </Card>
      ) : accounts.length === 0 ? (
        <Card withBorder p="xl" radius="md">
          <Text ta="center" fw={500} mb="md">
            {t('dashboard.noAccounts')}
          </Text>
          <Button
            fullWidth
            onClick={handleAdd}
            data-testid="add-account-button"
          >
            {t('accounts.addAccount')}
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
              <Text fw={500} ta="center">{t('accounts.addNewAccount')}</Text>
            </Card.Section>

            <Button
              fullWidth
              variant="outline"
              mt="xl"
              onClick={handleAdd}
              data-testid="add-account-button"
            >
              {t('accounts.addAccount')}
            </Button>
          </Card>
        </SimpleGrid>
      )}

      {/* 账户表单模态框 */}
      <Modal
        opened={opened}
        onClose={close}
        title={editingAccount ? t('accounts.editAccount') : t('accounts.addNewAccount')}
        centered
        size="lg"
        data-testid="account-modal"
      >
        <AccountForm
          initialValues={editingAccount || undefined}
          onSubmit={handleSubmit}
          onCancel={close}
          title={editingAccount ? t('accounts.editAccount') : t('accounts.addNewAccount')}
        />
      </Modal>
    </Container>
  );
}
