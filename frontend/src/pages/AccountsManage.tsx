import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Table,
  Button,
  Group,
  ActionIcon,
  TextInput,
  Select,
  Modal,
  Stack,
  Loader,
  Center,
  Badge,
  Tooltip,
  Popover,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconRefresh, IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useAccounts } from '../contexts/AccountContext';
import AccountForm from '../components/AccountForm';
import type { OTPAccount } from '@/types';
import { useTranslation } from 'react-i18next';

// 模拟分组数据
const getGroups = (t: any) => [
  { value: '工作', label: t('accounts.groups.work') },
  { value: '个人', label: t('accounts.groups.personal') },
  { value: '开发', label: t('accounts.groups.development') },
  { value: '金融', label: t('accounts.groups.finance') },
];

export default function AccountsManage() {
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
  
  // 获取本地化的分组数据
  const mockGroups = getGroups(t);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingAccount, setEditingAccount] = useState<OTPAccount | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 过滤账户
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch =
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.issuer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGroup = !selectedGroup || account.groupId === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  // 编辑账户
  const handleEdit = (account: OTPAccount) => {
    setEditingAccount(account);
    open();
  };

  // 添加账户
  const handleAdd = () => {
    setEditingAccount(null);
    open();
  };

  // 删除账户
  const handleDelete = (id: string) => {
    deleteAccount(id).then(() => {
      setDeleteConfirmId(null);
    });
  };

  // 保存编辑
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

  // 获取算法标签
  const getAlgorithmLabel = (algorithm: string) => {
    switch (algorithm) {
      case 'SHA1':
        return <Badge color="blue">SHA1</Badge>;
      case 'SHA256':
        return <Badge color="green">SHA256</Badge>;
      case 'SHA512':
        return <Badge color="purple">SHA512</Badge>;
      default:
        return <Badge>{algorithm}</Badge>;
    }
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'TOTP':
        return <Badge color="cyan">TOTP</Badge>;
      case 'HOTP':
        return <Badge color="orange">HOTP</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" align="center" mb="md">
        <Title order={2}>
          {t('accounts.manageAccounts')}
        </Title>

        <Group>
          {isOnline ? (
            <Badge color="green" leftSection={<IconWifi size={14} />}>
              {t('dashboard.onlineMode')}
            </Badge>
          ) : (
            <Badge color="yellow" leftSection={<IconWifiOff size={14} />}>
              {t('dashboard.offlineMode')}
            </Badge>
          )}

          <Tooltip label={t('dashboard.syncData')}>
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
        {t('accounts.manageDescription')}
        {!isOnline && t('dashboard.offlineWarning')}
      </Text>

      <Group mb="md">
        <TextInput
          placeholder={t('accounts.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          style={{ flex: 1 }}
        />

        <Select
          placeholder={t('accounts.filterByGroup')}
          data={mockGroups}
          value={selectedGroup}
          onChange={setSelectedGroup}
          clearable
        />

        <Button
          onClick={handleAdd}
          data-testid="add-account-button"
        >
          {t('accounts.addAccount')}
        </Button>
      </Group>

      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : error ? (
        <Text c="red" ta="center" py="xl">
          {t('accounts.loadingError')}: {error}
        </Text>
      ) : filteredAccounts.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t('accounts.noMatchingAccounts')}
        </Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('accounts.name')}</Table.Th>
              <Table.Th>{t('accounts.issuer')}</Table.Th>
              <Table.Th>{t('accounts.type')}</Table.Th>
              <Table.Th>{t('accounts.algorithm')}</Table.Th>
              <Table.Th>{t('accounts.digits')}</Table.Th>
              <Table.Th>{t('accounts.periodCounter')}</Table.Th>
              <Table.Th>{t('accounts.group')}</Table.Th>
              <Table.Th>{t('accounts.actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredAccounts.map((account) => (
              <Table.Tr key={account.id}>
                <Table.Td>{account.name}</Table.Td>
                <Table.Td>{account.issuer}</Table.Td>
                <Table.Td>{getTypeLabel(account.type)}</Table.Td>
                <Table.Td>{getAlgorithmLabel(account.algorithm)}</Table.Td>
                <Table.Td>{account.digits}</Table.Td>
                <Table.Td>
                  {account.type === 'TOTP' ? `${account.period} ${t('accounts.seconds')}` : `${account.counter}`}
                </Table.Td>
                <Table.Td>
                  {account.groupId ?
                    mockGroups.find(g => g.value === account.groupId)?.label || account.groupId
                    : '-'}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label={t('common.edit')}>
                      <ActionIcon variant="light" color="blue" onClick={() => handleEdit(account)}>
                        ✏️
                      </ActionIcon>
                    </Tooltip>

                    <Popover
                      width={200}
                      position="bottom"
                      withArrow
                      shadow="md"
                      opened={deleteConfirmId === account.id}
                    >
                      <Popover.Target>
                        <Tooltip label={t('common.delete')}>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => setDeleteConfirmId(account.id)}
                          >
                            🗑️
                          </ActionIcon>
                        </Tooltip>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Stack>
                          <Text size="sm">{t('accounts.confirmDelete')}</Text>
                          <Group>
                            <Button
                              size="xs"
                              variant="outline"
                              color="gray"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              onClick={() => handleDelete(account.id)}
                            >
                              {t('common.delete')}
                            </Button>
                          </Group>
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
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
          groups={mockGroups}
          onSubmit={handleSubmit}
          onCancel={close}
          title={editingAccount ? t('accounts.editAccount') : t('accounts.addNewAccount')}
        />
      </Modal>
    </Container>
  );
}
