import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell, Burger, Group, Text, Button, Box, useMantineTheme, Loader } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { lazy, Suspense } from 'react'

// 组件
import NavMenu from './components/NavMenu'
import EncryptionStatus from './components/EncryptionStatus'

// 懒加载性能监控组件
const PerformanceMonitor = lazy(() => import('./components/PerformanceMonitor'))

// 页面组件
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import AccountsManage from './pages/AccountsManage'
import Settings from './pages/Settings'
import ImportExport from './pages/ImportExport'
import WebAuthnSettings from './pages/WebAuthnSettings'
import WebAuthnCredentials from './pages/WebAuthnCredentials'
import ResetPassword from './pages/ResetPassword'
import SessionManagement from './pages/SessionManagement'
import EncryptionSettings from './pages/EncryptionSettings'
import BackupRestore from './pages/BackupRestore'

// 上下文
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AccountProvider } from './contexts/AccountContext'

// 受保护的路由组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// 应用布局组件
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [opened, { toggle }] = useDisclosure()
  const { isAuthenticated, logout } = useAuth()
  const theme = useMantineTheme()

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="lg" fw={700}>2FA Web</Text>
          </Group>

          {isAuthenticated && (
            <Group>
              <EncryptionStatus />
              <Button variant="subtle" onClick={logout}>
                退出登录
              </Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      {isAuthenticated && (
        <AppShell.Navbar p="md">
          <Box>
            <Text fw={500} size="sm" mb="xs">主菜单</Text>
            <NavMenu />
          </Box>
        </AppShell.Navbar>
      )}

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  )
}

function App() {
  // 判断是否为开发环境
  const isDevelopment = import.meta.env.DEV;

  return (
    <AuthProvider>
      <AccountProvider>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/accounts" element={
              <ProtectedRoute>
                <AccountsManage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/import-export" element={
              <ProtectedRoute>
                <ImportExport />
              </ProtectedRoute>
            } />
            <Route path="/webauthn" element={
              <ProtectedRoute>
                <WebAuthnSettings />
              </ProtectedRoute>
            } />
            <Route path="/webauthn/credentials" element={
              <ProtectedRoute>
                <WebAuthnCredentials />
              </ProtectedRoute>
            } />
            <Route path="/sessions" element={
              <ProtectedRoute>
                <SessionManagement />
              </ProtectedRoute>
            } />
            <Route path="/encryption" element={
              <ProtectedRoute>
                <EncryptionSettings />
              </ProtectedRoute>
            } />
            <Route path="/backup" element={
              <ProtectedRoute>
                <BackupRestore />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* 仅在开发环境中显示性能监控组件 */}
          {isDevelopment && (
            <Suspense fallback={null}>
              <PerformanceMonitor />
            </Suspense>
          )}
        </AppLayout>
      </AccountProvider>
    </AuthProvider>
  )
}

export default App
