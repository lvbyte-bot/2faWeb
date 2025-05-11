import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Card,
  Group,
  Stack,
  Loader,
  Center,
  Table,
  ActionIcon,
  Alert,
  Modal,
  Badge,
  TextInput,
} from '@mantine/core';
import { IconFingerprint, IconAlertCircle, IconTrash, IconRefresh, IconEdit, IconCheck } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import * as webAuthnService from '../services/webAuthnService';
import { notifications } from '@mantine/notifications';

export default function WebAuthnCredentials() {
  const { user, isWebAuthnSupported } = useAuth();
  const [credentials, setCredentials] = useState<webAuthnService.WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<webAuthnService.WebAuthnCredential | null>(null);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [newCredentialName, setNewCredentialName] = useState('');

  // 加载凭证列表
  const loadCredentials = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await webAuthnService.getCredentials();
      setCredentials(data);
    } catch (err) {
      console.error('加载凭证失败:', err);
      setError(err instanceof Error ? err.message : '加载凭证失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (user) {
      loadCredentials();
    }
  }, [user]);

  // 处理删除凭证
  const handleDeleteCredential = async () => {
    if (!selectedCredential) return;

    try {
      await webAuthnService.deleteCredential(selectedCredential.id);

      // 更新凭证列表
      setCredentials(prev => prev.filter(cred => cred.id !== selectedCredential.id));

      notifications.show({
        title: '删除成功',
        message: '凭证已成功删除',
        color: 'green',
      });
    } catch (err) {
      console.error('删除凭证失败:', err);
      notifications.show({
        title: '删除失败',
        message: err instanceof Error ? err.message : '删除凭证失败',
        color: 'red',
      });
    } finally {
      setDeleteModalOpen(false);
      setSelectedCredential(null);
    }
  };

  // 打开删除确认对话框
  const openDeleteModal = (credential: webAuthnService.WebAuthnCredential) => {
    setSelectedCredential(credential);
    setDeleteModalOpen(true);
  };

  // 开始编辑凭证名称
  const startEditingName = (credential: webAuthnService.WebAuthnCredential) => {
    setEditingCredentialId(credential.id);
    setNewCredentialName(credential.name);
  };

  // 保存凭证名称
  const saveCredentialName = async (credentialId: string) => {
    try {
      const updatedCredential = await webAuthnService.updateCredentialName(credentialId, newCredentialName);

      // 更新凭证列表
      setCredentials(prev => prev.map(cred =>
        cred.id === credentialId ? { ...cred, name: updatedCredential.name } : cred
      ));

      notifications.show({
        title: '更新成功',
        message: '凭证名称已成功更新',
        color: 'green',
      });
    } catch (err) {
      console.error('更新凭证名称失败:', err);
      notifications.show({
        title: '更新失败',
        message: err instanceof Error ? err.message : '更新凭证名称失败',
        color: 'red',
      });
    } finally {
      setEditingCredentialId(null);
      setNewCredentialName('');
    }
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingCredentialId(null);
    setNewCredentialName('');
  };

  // 格式化日期
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '从未使用';
    return new Date(timestamp).toLocaleString();
  };

  if (!user) {
    return (
      <Container size="sm" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        WebAuthn 凭证管理
      </Title>

      <Text c="dimmed" mb="xl">
        管理您的生物识别和安全密钥凭证。
      </Text>

      {!isWebAuthnSupported && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="不支持 WebAuthn"
          color="red"
          mb="lg"
        >
          您的浏览器不支持 WebAuthn。请使用最新版本的 Chrome、Firefox、Safari 或 Edge 浏览器。
        </Alert>
      )}

      <Card withBorder p="lg" radius="md" mb="lg">
        <Group justify="space-between" mb="md">
          <Group>
            <IconFingerprint size={24} />
            <Title order={3}>已注册的凭证</Title>
          </Group>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="outline"
            onClick={loadCredentials}
            loading={loading}
          >
            刷新
          </Button>
        </Group>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="加载失败"
            color="red"
            mb="lg"
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : credentials.length === 0 ? (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="没有凭证"
            color="blue"
          >
            您还没有注册任何WebAuthn凭证。请前往WebAuthn设置页面注册新凭证。
          </Alert>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>名称</Table.Th>
                <Table.Th>创建时间</Table.Th>
                <Table.Th>最后使用</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {credentials.map((credential) => (
                <Table.Tr key={credential.id}>
                  <Table.Td>
                    {editingCredentialId === credential.id ? (
                      <Group gap="xs">
                        <TextInput
                          value={newCredentialName}
                          onChange={(e) => setNewCredentialName(e.target.value)}
                          size="xs"
                          style={{ width: '150px' }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveCredentialName(credential.id);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                        />
                        <ActionIcon
                          color="green"
                          variant="subtle"
                          onClick={() => saveCredentialName(credential.id)}
                          title="保存"
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Group>
                    ) : (
                      <Group gap="xs">
                        <IconFingerprint size={16} />
                        <Text>{credential.name}</Text>
                        <ActionIcon
                          color="blue"
                          variant="subtle"
                          onClick={() => startEditingName(credential)}
                          title="编辑名称"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Group>
                    )}
                  </Table.Td>
                  <Table.Td>{formatDate(credential.createdAt)}</Table.Td>
                  <Table.Td>
                    {credential.lastUsed ? (
                      formatDate(credential.lastUsed)
                    ) : (
                      <Badge color="gray">从未使用</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => openDeleteModal(credential)}
                      title="删除"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* 删除确认对话框 */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="确认删除"
        centered
      >
        <Text mb="lg">
          您确定要删除凭证 "{selectedCredential?.name}" 吗？此操作不可撤销。
        </Text>
        <Group justify="flex-end">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
            取消
          </Button>
          <Button color="red" onClick={handleDeleteCredential}>
            删除
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
