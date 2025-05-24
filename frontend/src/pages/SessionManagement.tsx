import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Button,
  Table,
  Badge,
  Group,
  Stack,
  Alert,
  Loader,
  Center,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCheck,
  IconDevices,
  IconLogout,
  IconTrash,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { useTranslation } from 'react-i18next';

// 会话类型
interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActive: number;
  expiresAt: number;
  isActive: boolean;
  isCurrent: boolean;
}

// 格式化日期
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// 格式化用户代理
function formatUserAgent(userAgent: string, t: any): string {
  // 简化用户代理字符串
  if (userAgent.includes('Chrome')) {
    return 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox';
  } else if (userAgent.includes('Safari')) {
    return 'Safari';
  } else if (userAgent.includes('Edge')) {
    return 'Edge';
  } else if (userAgent.includes('Opera')) {
    return 'Opera';
  } else {
    return t('sessionManagement.unknownBrowser');
  }
}

export default function SessionManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeAllOpened, { open: openRevokeAll, close: closeRevokeAll }] = useDisclosure(false);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // 加载会话列表
  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/auth/sessions') as Response;

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error ? t(`errors.${data.error}`) || data.error : t('sessionManagement.fetchSessionsFailed');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSessions(data.sessions);
    } catch (error) {
      console.error('获取会话列表失败:', error);
      setError(error instanceof Error ? error.message : t('sessionManagement.fetchSessionsFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 撤销单个会话
  const revokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      const response = await api.delete_(`/auth/sessions/${sessionId}`) as Response;

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error ? t(`errors.${data.error}`) || data.error : t('sessionManagement.revokeSessionFailed');
        throw new Error(errorMessage);
      }

      // 更新会话列表
      setSessions(sessions.filter(session => session.id !== sessionId));

      notifications.show({
        title: t('sessionManagement.sessionRevoked'),
        message: t('sessionManagement.sessionRevokedSuccess'),
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('撤销会话失败:', error);
      notifications.show({
        title: t('sessionManagement.revokeFailed'),
        message: error instanceof Error ? error.message : t('sessionManagement.revokeSessionFailed'),
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setRevokingSession(null);
    }
  };

  // 撤销所有其他会话
  const revokeAllSessions = async () => {
    setRevokingAll(true);
    try {
      const response = await api.delete_('/auth/sessions') as Response;

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error ? t(`errors.${data.error}`) : t('sessionManagement.revokeAllSessionsFailed');
        throw new Error(errorMessage);
      }

      // 更新会话列表，只保留当前会话
      setSessions(sessions.filter(session => session.isCurrent));

      notifications.show({
        title: t('sessionManagement.allOtherSessionsRevoked'),
        message: t('sessionManagement.allOtherSessionsRevokedSuccess'),
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      closeRevokeAll();
    } catch (error) {
      console.error('撤销所有会话失败:', error);
      notifications.show({
        title: t('sessionManagement.revokeFailed'),
        message: error instanceof Error ? error.message : t('sessionManagement.revokeAllSessionsFailed'),
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setRevokingAll(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="md">
        {t('sessionManagement.title')}
      </Title>

      <Text c="dimmed" mb="xl">
        {t('sessionManagement.description')}
      </Text>

      <Paper withBorder p="md" radius="md" mb="xl">
        <Group justify="space-between" mb="md">
          <Group>
            <IconDevices size={24} />
            <Title order={3}>{t('sessionManagement.activeSessions')}</Title>
          </Group>
          <Group>
            <Button
              leftSection={<IconLogout size={16} />}
              color="red"
              variant="outline"
              onClick={openRevokeAll}
              disabled={sessions.filter(s => !s.isCurrent).length === 0}
            >
              {t('sessionManagement.revokeAllOtherSessions')}
            </Button>
            <Button
              leftSection={<IconCheck size={16} />}
              variant="outline"
              onClick={loadSessions}
              loading={loading}
            >
              {t('sessionManagement.refresh')}
            </Button>
          </Group>
        </Group>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title={t('sessionManagement.loadingFailed')}
            color="red"
            mb="md"
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : sessions.length === 0 ? (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title={t('sessionManagement.noActiveSessions')}
            color="blue"
          >
            {t('sessionManagement.noActiveSessionsMessage')}
          </Alert>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('sessionManagement.device')}</Table.Th>
                <Table.Th>{t('sessionManagement.ipAddress')}</Table.Th>
                <Table.Th>{t('sessionManagement.lastActive')}</Table.Th>
                <Table.Th>{t('sessionManagement.createdAt')}</Table.Th>
                <Table.Th>{t('sessionManagement.status')}</Table.Th>
                <Table.Th>{t('sessionManagement.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.map((session) => (
                <Table.Tr key={session.id}>
                  <Table.Td>{formatUserAgent(session.userAgent, t)}</Table.Td>
                  <Table.Td>{session.ipAddress}</Table.Td>
                  <Table.Td>{formatDate(session.lastActive)}</Table.Td>
                  <Table.Td>{formatDate(session.createdAt)}</Table.Td>
                  <Table.Td>
                    {session.isCurrent ? (
                      <Badge color="green">{t('sessionManagement.currentSession')}</Badge>
                    ) : (
                      <Badge color="blue">{t('sessionManagement.active')}</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {session.isCurrent ? (
                      <Text size="sm" c="dimmed">{t('sessionManagement.currentSession')}</Text>
                    ) : (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => revokeSession(session.id)}
                        loading={revokingSession === session.id}
                        disabled={!session.isActive}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* 撤销所有会话确认对话框 */}
      <Modal
        opened={revokeAllOpened}
        onClose={closeRevokeAll}
        title={t('sessionManagement.revokeAllOtherSessions')}
        centered
      >
        <Stack>
          <Text>
            {t('sessionManagement.confirmRevokeAllMessage')}
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={closeRevokeAll}>
              {t('common.cancel')}
            </Button>
            <Button color="red" onClick={revokeAllSessions} loading={revokingAll}>
              {t('sessionManagement.confirmRevoke')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
