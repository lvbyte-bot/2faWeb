import { NavLink } from 'react-router-dom';
import { Box, Text, Stack, Group, ThemeIcon } from '@mantine/core';
import { IconFingerprint, IconDevices, IconLock, IconDownload } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <Box>
      <Stack gap="xs">
        <NavItem
          to="/"
          label={t('dashboard.title')}
          icon={<span>📊</span>}
        />
        <NavItem
          to="/accounts"
          label={t('accounts.title')}
          icon={<span>🔑</span>}
        />
        <NavItem
          to="/import-export"
          label={t('importExport.title')}
          icon={<span>📤</span>}
        />
        <NavItem
          to="/settings"
          label={t('settings.title')}
          icon={<span>⚙️</span>}
        />
        <NavItem
          to="/webauthn"
          label={t('webauthn.title')}
          icon={<IconFingerprint size={16} />}
        />
        <NavItem
          to="/sessions"
          label={t('sessions.title')}
          icon={<IconDevices size={16} />}
        />
        <NavItem
          to="/encryption"
          label={t('encryption.title')}
          icon={<IconLock size={16} />}
        />
        <NavItem
          to="/backup"
          label={t('backup.title')}
          icon={<IconDownload size={16} />}
        />
      </Stack>
    </Box>
  );
}
