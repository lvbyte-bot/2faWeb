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
import { useTranslation } from 'react-i18next';

export default function WebAuthnCredentials() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('settings.webauthnCredentials.loadingErrorMessage'));
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
        title: t('settings.webauthnCredentials.deleteSuccess'),
        message: t('settings.webauthnCredentials.deleteSuccessMessage'),
        color: 'green',
      });
    } catch (err) {
      console.error('删除凭证失败:', err);
      notifications.show({
        title: t('settings.webauthnCredentials.deleteFailed'),
        message: err instanceof Error ? err.message : t('settings.webauthnCredentials.deleteFailed'),
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
        title: t('settings.webauthnCredentials.updateSuccess'),
        message: t('settings.webauthnCredentials.updateSuccessMessage'),
        color: 'green',
      });
    } catch (err) {
      console.error('更新凭证名称失败:', err);
      notifications.show({
        title: t('settings.webauthnCredentials.updateFailed'),
        message: err instanceof Error ? err.message : t('settings.webauthnCredentials.updateFailed'),
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
    if (!timestamp) return t('settings.webauthnCredentials.neverUsed');
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
        {t('settings.webauthnCredentials.title')}
      </Title>

      <Text c="dimmed" mb="xl">
        {t('settings.webauthnCredentials.description')}
      </Text>

      {!isWebAuthnSupported && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={t('settings.webauthn.notSupported')}
          color="red"
          mb="lg"
        >
          {t('settings.webauthn.notSupportedMessage')}
        </Alert>
      )}

      <Card withBorder p="lg" radius="md" mb="lg">
        <Group justify="space-between" mb="md">
          <Group>
            <IconFingerprint size={24} />
            <Title order={3}>{t('settings.webauthnCredentials.registeredCredentials')}</Title>
          </Group>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="outline"
            onClick={loadCredentials}
            loading={loading}
          >
            {t('settings.webauthnCredentials.refresh')}
          </Button>
        </Group>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title={t('settings.webauthnCredentials.loadingError')}
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
            title={t('settings.webauthnCredentials.noCredentials')}
            color="blue"
          >
            {t('settings.webauthnCredentials.noCredentialsMessage')}
          </Alert>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('settings.webauthnCredentials.nameColumn')}</Table.Th>
                <Table.Th>{t('settings.webauthnCredentials.createdAtColumn')}</Table.Th>
                <Table.Th>{t('settings.webauthnCredentials.lastUsedColumn')}</Table.Th>
                <Table.Th>{t('settings.webauthnCredentials.actionsColumn')}</Table.Th>
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
                          title={t('settings.webauthnCredentials.save')}
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
                          title={t('settings.webauthnCredentials.editName')}
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
                      <Badge color="gray">{t('settings.webauthnCredentials.neverUsed')}</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => openDeleteModal(credential)}
                      title={t('settings.webauthnCredentials.deleteCredential')}
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
        title={t('settings.webauthnCredentials.confirmDelete')}
        centered
      >
        <Text mb="lg">
          {t('settings.webauthnCredentials.confirmDeleteMessage', { name: selectedCredential?.name })}
        </Text>
        <Group justify="flex-end">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button color="red" onClick={handleDeleteCredential}>
            {t('common.delete')}
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
