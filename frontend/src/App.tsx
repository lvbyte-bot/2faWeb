import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell, Burger, Group, Text, Button, Box, useMantineTheme } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'

// 组件
import NavMenu from './components/NavMenu'

// 页面组件
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import AccountsManage from './pages/AccountsManage'
import Settings from './pages/Settings'
import ImportExport from './pages/ImportExport'

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
            <Button variant="subtle" onClick={logout}>
              退出登录
            </Button>
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
  return (
    <AuthProvider>
      <AccountProvider>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </AccountProvider>
    </AuthProvider>
  )
}

export default App
