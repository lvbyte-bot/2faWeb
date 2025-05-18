import { NavLink } from 'react-router-dom';
import { Box, Text, Stack, Group, ThemeIcon } from '@mantine/core';
import { IconFingerprint, IconDevices, IconLock, IconDownload } from '@tabler/icons-react';

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

// 导航项组件
const NavItem = ({ to, label, icon }: NavItemProps) => (
  <NavLink
    to={to}
    style={({ isActive }) => ({
      display: 'block',
      backgroundColor: isActive ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
      padding: '8px 12px',
      borderRadius: '4px',
      textDecoration: 'none',
      color: 'inherit',
    })}
  >
    <Group>
      <ThemeIcon variant="light" size="md">
        {icon}
      </ThemeIcon>
      <Text size="sm">{label}</Text>
    </Group>
  </NavLink>
);

// 导航菜单组件
export default function NavMenu() {
  return (
    <Box>
      <Stack gap="xs">
        <NavItem
          to="/"
          label="仪表盘"
          icon={<span>📊</span>}
        />
        <NavItem
          to="/accounts"
          label="账户管理"
          icon={<span>🔑</span>}
        />
        <NavItem
          to="/import-export"
          label="导入/导出"
          icon={<span>📤</span>}
        />
        <NavItem
          to="/settings"
          label="设置"
          icon={<span>⚙️</span>}
        />
        <NavItem
          to="/webauthn"
          label="生物识别登录"
          icon={<IconFingerprint size={16} />}
        />
        <NavItem
          to="/sessions"
          label="会话管理"
          icon={<IconDevices size={16} />}
        />
        <NavItem
          to="/encryption"
          label="端到端加密"
          icon={<IconLock size={16} />}
        />
        <NavItem
          to="/backup"
          label="备份与恢复"
          icon={<IconDownload size={16} />}
        />
      </Stack>
    </Box>
  );
}
