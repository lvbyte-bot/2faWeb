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

// 模拟分组数据
const mockGroups = [
  { value: '工作', label: '工作' },
  { value: '个人', label: '个人' },
  { value: '开发', label: '开发' },
  { value: '金融', label: '金融' },
];

export default function AccountsManage() {
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
          管理账户
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
        在这里管理您的所有二步验证账户
        {!isOnline && ' 当前处于离线模式，部分功能可能不可用。'}
      </Text>

      <Group mb="md">
        <TextInput
          placeholder="搜索账户..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          style={{ flex: 1 }}
        />

        <Select
          placeholder="按分组筛选"
          data={mockGroups}
          value={selectedGroup}
          onChange={setSelectedGroup}
          clearable
        />

        <Button
          onClick={handleAdd}
          data-testid="add-account-button"
        >
          添加账户
        </Button>
      </Group>

      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : error ? (
        <Text c="red" ta="center" py="xl">
          加载账户时出错: {error}
        </Text>
      ) : filteredAccounts.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          没有找到匹配的账户
        </Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>名称</Table.Th>
              <Table.Th>发行方</Table.Th>
              <Table.Th>类型</Table.Th>
              <Table.Th>算法</Table.Th>
              <Table.Th>位数</Table.Th>
              <Table.Th>周期/计数器</Table.Th>
              <Table.Th>分组</Table.Th>
              <Table.Th>操作</Table.Th>
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
                  {account.type === 'TOTP' ? `${account.period}秒` : `${account.counter}`}
                </Table.Td>
                <Table.Td>
                  {account.groupId ?
                    mockGroups.find(g => g.value === account.groupId)?.label || account.groupId
                    : '-'}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="编辑">
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
                        <Tooltip label="删除">
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
                          <Text size="sm">确定要删除此账户吗？</Text>
                          <Group>
                            <Button
                              size="xs"
                              variant="outline"
                              color="gray"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              取消
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              onClick={() => handleDelete(account.id)}
                            >
                              删除
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
        title={editingAccount ? '编辑账户' : '添加新账户'}
        centered
        size="lg"
        data-testid="account-modal"
      >
        <AccountForm
          initialValues={editingAccount || undefined}
          groups={mockGroups}
          onSubmit={handleSubmit}
          onCancel={close}
          title={editingAccount ? '编辑账户' : '添加新账户'}
        />
      </Modal>
    </Container>
  );
}
