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
function formatUserAgent(userAgent: string): string {
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
    return '未知浏览器';
  }
}

export default function SessionManagement() {
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
        throw new Error(data.error || '获取会话列表失败');
      }

      const data = await response.json();
      setSessions(data.sessions);
    } catch (error) {
      console.error('获取会话列表失败:', error);
      setError(error instanceof Error ? error.message : '获取会话列表失败');
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
        throw new Error(data.error || '撤销会话失败');
      }

      // 更新会话列表
      setSessions(sessions.filter(session => session.id !== sessionId));

      notifications.show({
        title: '会话已撤销',
        message: '会话已成功撤销',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('撤销会话失败:', error);
      notifications.show({
        title: '撤销失败',
        message: error instanceof Error ? error.message : '撤销会话失败',
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
        throw new Error(data.error || '撤销所有会话失败');
      }

      // 更新会话列表，只保留当前会话
      setSessions(sessions.filter(session => session.isCurrent));

      notifications.show({
        title: '所有其他会话已撤销',
        message: '所有其他设备的会话已成功撤销',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      closeRevokeAll();
    } catch (error) {
      console.error('撤销所有会话失败:', error);
      notifications.show({
        title: '撤销失败',
        message: error instanceof Error ? error.message : '撤销所有会话失败',
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
        会话管理
      </Title>

      <Text c="dimmed" mb="xl">
        管理您的活跃会话和登录设备
      </Text>

      <Paper withBorder p="md" radius="md" mb="xl">
        <Group justify="space-between" mb="md">
          <Group>
            <IconDevices size={24} />
            <Title order={3}>活跃会话</Title>
          </Group>
          <Group>
            <Button
              leftSection={<IconLogout size={16} />}
              color="red"
              variant="outline"
              onClick={openRevokeAll}
              disabled={sessions.filter(s => !s.isCurrent).length === 0}
            >
              撤销所有其他会话
            </Button>
            <Button
              leftSection={<IconCheck size={16} />}
              variant="outline"
              onClick={loadSessions}
              loading={loading}
            >
              刷新
            </Button>
          </Group>
        </Group>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="加载失败"
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
            title="没有活跃会话"
            color="blue"
          >
            您当前没有活跃的会话。
          </Alert>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>设备</Table.Th>
                <Table.Th>IP地址</Table.Th>
                <Table.Th>最后活跃时间</Table.Th>
                <Table.Th>创建时间</Table.Th>
                <Table.Th>状态</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.map((session) => (
                <Table.Tr key={session.id}>
                  <Table.Td>{formatUserAgent(session.userAgent)}</Table.Td>
                  <Table.Td>{session.ipAddress}</Table.Td>
                  <Table.Td>{formatDate(session.lastActive)}</Table.Td>
                  <Table.Td>{formatDate(session.createdAt)}</Table.Td>
                  <Table.Td>
                    {session.isCurrent ? (
                      <Badge color="green">当前会话</Badge>
                    ) : (
                      <Badge color="blue">活跃</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {session.isCurrent ? (
                      <Text size="sm" c="dimmed">当前会话</Text>
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
        title="撤销所有其他会话"
        centered
      >
        <Stack>
          <Text>
            您确定要撤销所有其他设备上的会话吗？这将导致所有其他设备上的登录状态失效，需要重新登录。
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={closeRevokeAll}>
              取消
            </Button>
            <Button color="red" onClick={revokeAllSessions} loading={revokingAll}>
              确认撤销
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
