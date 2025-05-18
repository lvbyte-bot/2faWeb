import { useState, useEffect } from 'react';
import { Box, Text, Button, Group, Badge, Accordion, Tooltip, ActionIcon } from '@mantine/core';
import { IconX, IconRefresh, IconChartLine } from '@tabler/icons-react';
import { getMarks, clearMarks, printPerformanceReport } from '../utils/performance';
import { getApiCacheStats } from '../services/api';

interface PerformanceData {
  name: string;
  count: number;
  avgDuration: number;
  maxDuration: number;
  totalDuration: number;
}

export default function PerformanceMonitor() {
  const [visible, setVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  // 更新性能数据
  const updatePerformanceData = () => {
    const marks = getMarks() as Record<string, any[]>;
    const data: PerformanceData[] = [];
    
    Object.entries(marks).forEach(([name, markArray]) => {
      if (markArray.length === 0) return;
      
      const totalDuration = markArray.reduce((sum, mark) => sum + mark.duration, 0);
      const avgDuration = totalDuration / markArray.length;
      const maxDuration = Math.max(...markArray.map(mark => mark.duration));
      
      data.push({
        name,
        count: markArray.length,
        avgDuration,
        maxDuration,
        totalDuration,
      });
    });
    
    // 按总时间排序
    data.sort((a, b) => b.totalDuration - a.totalDuration);
    
    setPerformanceData(data);
    
    // 更新缓存统计
    try {
      setCacheStats(getApiCacheStats());
    } catch (error) {
      console.error('获取缓存统计失败:', error);
    }
  };
  
  // 定期更新性能数据
  useEffect(() => {
    if (!visible) return;
    
    updatePerformanceData();
    const interval = setInterval(updatePerformanceData, 2000);
    
    return () => clearInterval(interval);
  }, [visible]);
  
  // 获取性能等级
  const getPerformanceLevel = (duration: number): 'success' | 'warning' | 'error' => {
    if (duration < 50) return 'success';
    if (duration < 200) return 'warning';
    return 'error';
  };
  
  if (!visible) {
    return (
      <Tooltip label="性能监控">
        <ActionIcon
          variant="filled"
          color="blue"
          radius="xl"
          size="lg"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
          }}
          onClick={() => setVisible(true)}
        >
          <IconChartLine size={20} />
        </ActionIcon>
      </Tooltip>
    );
  }
  
  return (
    <Box
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '80vh',
        overflowY: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <Group position="apart" mb="md">
        <Text fw={700}>性能监控</Text>
        <Group spacing="xs">
          <ActionIcon size="sm" variant="light" onClick={updatePerformanceData}>
            <IconRefresh size={16} />
          </ActionIcon>
          <ActionIcon size="sm" variant="light" color="red" onClick={() => setVisible(false)}>
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </Group>
      
      <Group mb="md">
        <Button size="xs" variant="light" onClick={() => {
          clearMarks();
          updatePerformanceData();
        }}>
          清除数据
        </Button>
        <Button size="xs" variant="light" onClick={() => {
          printPerformanceReport();
        }}>
          打印报告
        </Button>
      </Group>
      
      {cacheStats && (
        <Box mb="md">
          <Text fw={500} size="sm" mb="xs">API缓存统计</Text>
          <Group spacing="xs">
            <Badge color={cacheStats.enabled ? 'green' : 'gray'}>
              {cacheStats.enabled ? '已启用' : '已禁用'}
            </Badge>
            <Badge color="blue">
              {cacheStats.size} / {cacheStats.maxSize}
            </Badge>
            <Badge color="teal">
              命中: {cacheStats.hitCount}
            </Badge>
            <Badge color="orange">
              未命中: {cacheStats.missCount}
            </Badge>
          </Group>
        </Box>
      )}
      
      <Text fw={500} size="sm" mb="xs">操作性能</Text>
      
      {performanceData.length === 0 ? (
        <Text c="dimmed" size="sm">暂无性能数据</Text>
      ) : (
        <Accordion>
          {performanceData.map((data) => (
            <Accordion.Item key={data.name} value={data.name}>
              <Accordion.Control>
                <Group position="apart">
                  <Text size="sm">{data.name}</Text>
                  <Badge 
                    color={getPerformanceLevel(data.avgDuration)}
                    size="sm"
                  >
                    {data.avgDuration.toFixed(2)}ms
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Box>
                  <Text size="xs">调用次数: {data.count}</Text>
                  <Text size="xs">平均耗时: {data.avgDuration.toFixed(2)}ms</Text>
                  <Text size="xs">最大耗时: {data.maxDuration.toFixed(2)}ms</Text>
                  <Text size="xs">总耗时: {data.totalDuration.toFixed(2)}ms</Text>
                </Box>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Box>
  );
}
