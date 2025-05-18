import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './index.css'
import App from './App'

// 初始化性能监控
import { initializeIndexedDB } from './services/indexedDBService'
import { setCacheConfig } from './services/apiCache'
import { setRetryConfig } from './services/apiRetry'

// 初始化IndexedDB
initializeIndexedDB().catch(error => {
  console.error('初始化IndexedDB失败:', error);
});

// 配置API缓存
setCacheConfig({
  enabled: true,
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxSize: 100,
});

// 配置API重试
setRetryConfig({
  maxRetries: 3,
  initialDelay: 300,
  maxDelay: 5000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
});

// 创建Mantine主题
const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme}>
        <Notifications position="top-right" />
        <App />
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
)
