import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Button,
  Group,
  FileInput,
  Stack,
  Tabs,
  Divider,
  PasswordInput,
  Checkbox,
  Alert,
  List,
  Loader,
  Center,
  Progress,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAccounts } from '../contexts/AccountContext';
import type { OTPAccount } from '@/types';
import { parseOtpUri } from '../utils/otp';
import * as encryptionService from '../services/encryptionService';
import * as cryptoUtils from '../utils/crypto';

export default function ImportExport() {
  const { importAccounts, exportAccounts, loading } = useAccounts();

  // 导入状态
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [parsedAccounts, setParsedAccounts] = useState<OTPAccount[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // 导出状态
  const [exportPassword, setExportPassword] = useState('');
  const [confirmExportPassword, setConfirmExportPassword] = useState('');
  const [includeSecrets, setIncludeSecrets] = useState(true);
  const [encryptExport, setEncryptExport] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });

  // 解析导入文件
  const parseImportFile = (file: File) => {
    setParseError(null);
    setParsedAccounts([]);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        let content = e.target?.result as string;

        // 检查是否是加密的导出文件
        try {
          if (encryptionService.isEncryptedExportData(content)) {
            if (!importPassword) {
              setParseError('此文件已加密，请提供密码');
              return;
            }

            try {
              // 尝试解密文件
              content = await encryptionService.decryptImportData(content, importPassword);
            } catch (decryptError) {
              console.error('解密文件失败:', decryptError);
              setParseError('解密文件失败，可能是密码错误');
              return;
            }
          }
        } catch (encryptionCheckError) {
          // 不是加密文件，继续处理
          console.log('不是加密文件，继续处理');
        }

        // 尝试解析为 JSON
        try {
          const json = JSON.parse(content);

          // 检查是否是 2FA Web 导出文件
          if (Array.isArray(json.accounts)) {
            setParsedAccounts(json.accounts);
            return;
          }

          // 检查是否是 Google Authenticator 导出文件
          if (Array.isArray(json.otpauth_migration_entries)) {
            // 这里需要实现 Google Authenticator 导出文件的解析
            setParseError('Google Authenticator 导出文件解析尚未实现');
            return;
          }
        } catch (jsonError) {
          // 不是 JSON 文件，尝试解析为 otpauth URI 列表
          const lines = content.split(/\r?\n/);
          const accounts: OTPAccount[] = [];

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('otpauth://')) {
              try {
                const account = parseOtpUri(trimmedLine);
                accounts.push(account);
              } catch (error) {
                console.error('解析 OTP URI 失败:', error);
              }
            }
          }

          if (accounts.length > 0) {
            setParsedAccounts(accounts);
            return;
          }
        }

        setParseError('无法识别的文件格式');
      } catch (error) {
        console.error('解析文件失败:', error);
        setParseError('解析文件失败');
      }
    };

    reader.onerror = () => {
      setParseError('读取文件失败');
    };

    reader.readAsText(file);
  };

  // 处理文件选择
  const handleFileChange = (file: File | null) => {
    setImportFile(file);

    if (file) {
      parseImportFile(file);
    } else {
      setParsedAccounts([]);
      setParseError(null);
    }
  };

  // 处理导入
  const handleImport = async () => {
    if (!importFile || parsedAccounts.length === 0) {
      notifications.show({
        title: '错误',
        message: '没有可导入的账户',
        color: 'red',
      });
      return;
    }

    setIsImporting(true);

    try {
      await importAccounts(parsedAccounts);

      notifications.show({
        title: '导入成功',
        message: `已成功导入 ${parsedAccounts.length} 个账户`,
        color: 'green',
      });

      setImportFile(null);
      setImportPassword('');
      setParsedAccounts([]);
    } catch (error) {
      notifications.show({
        title: '导入失败',
        message: error instanceof Error ? error.message : '导入账户失败',
        color: 'red',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // 检查密码强度
  const checkPasswordStrength = (password: string) => {
    if (password) {
      const strength = cryptoUtils.checkPasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: '' });
    }
  };

  // 密码强度颜色
  const getStrengthColor = (score: number) => {
    if (score < 30) return 'red';
    if (score < 60) return 'yellow';
    return 'green';
  };

  // 处理导出
  const handleExport = async () => {
    if (exportPassword !== confirmExportPassword) {
      notifications.show({
        title: '错误',
        message: '密码不匹配',
        color: 'red',
      });
      return;
    }

    if (encryptExport && exportPassword.length < 8) {
      notifications.show({
        title: '错误',
        message: '密码长度应至少为8个字符',
        color: 'red',
      });
      return;
    }

    if (encryptExport && passwordStrength.score < 30) {
      notifications.show({
        title: '警告',
        message: '密码强度较弱，建议使用更强的密码',
        color: 'yellow',
      });
    }

    setIsExporting(true);

    try {
      // 获取账户数据
      const accounts = await exportAccounts();

      // 如果不包含密钥，则移除密钥
      const exportData = includeSecrets
        ? accounts
        : accounts.map(({ secret, ...rest }) => rest);

      // 创建导出数据
      let data = JSON.stringify({
        accounts: exportData,
        includeSecrets,
        exportDate: new Date().toISOString(),
        version: '1.0',
      }, null, 2);

      // 如果启用加密，加密数据
      let fileName = `2fa-web-export-${new Date().toISOString().split('T')[0]}`;
      let fileType = 'application/json';

      if (encryptExport && exportPassword) {
        try {
          data = await encryptionService.encryptExportData(data, exportPassword);
          fileName += '.encrypted';
        } catch (error) {
          console.error('加密导出数据失败:', error);
          notifications.show({
            title: '加密失败',
            message: '加密导出数据失败，将以未加密方式导出',
            color: 'red',
          });
        }
      }

      // 创建并下载文件
      const blob = new Blob([data], { type: fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notifications.show({
        title: '导出成功',
        message: `已成功导出 ${accounts.length} 个账户`,
        color: 'green',
      });

      setExportPassword('');
      setConfirmExportPassword('');
    } catch (error) {
      notifications.show({
        title: '导出失败',
        message: error instanceof Error ? error.message : '导出账户失败',
        color: 'red',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        导入/导出
      </Title>

      <Text c="dimmed" mb="xl">
        导入或导出您的2FA账户
      </Text>

      <Tabs defaultValue="import">
        <Tabs.List mb="md">
          <Tabs.Tab value="import">导入</Tabs.Tab>
          <Tabs.Tab value="export">导出</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="import">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Text>
                您可以从其他2FA应用导入账户。支持以下格式：
              </Text>

              <List spacing="xs" size="sm" center>
                <List.Item>2FA Web导出文件 (.json)</List.Item>
                <List.Item>Google Authenticator导出文件</List.Item>
                <List.Item>Aegis备份文件</List.Item>
                <List.Item>Authy备份文件</List.Item>
              </List>

              <Divider my="sm" />

              <FileInput
                label="选择导入文件"
                placeholder="点击选择文件"
                accept=".json,.txt,.bin"
                value={importFile}
                onChange={handleFileChange}
              />

              {parseError && (
                <Alert color="red" title="解析错误">
                  {parseError}
                </Alert>
              )}

              {parsedAccounts.length > 0 && (
                <Alert color="green" title="已解析账户">
                  成功解析 {parsedAccounts.length} 个账户
                </Alert>
              )}

              <PasswordInput
                label="密码（如果文件已加密）"
                placeholder="输入密码"
                value={importPassword}
                onChange={(e) => setImportPassword(e.currentTarget.value)}
              />

              <Alert title="注意" color="yellow">
                导入将添加新账户，但不会覆盖现有账户。如果导入的账户与现有账户具有相同的名称和发行方，您将需要手动解决冲突。
              </Alert>

              <Button
                onClick={handleImport}
                loading={isImporting || loading}
                disabled={!importFile || parsedAccounts.length === 0}
              >
                导入
              </Button>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="export">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Text>
                导出您的2FA账户以便备份或迁移到其他设备。
              </Text>

              <Checkbox
                label="包含密钥（不安全，但允许完全迁移）"
                checked={includeSecrets}
                onChange={(e) => setIncludeSecrets(e.currentTarget.checked)}
              />

              <Checkbox
                label="加密导出文件（推荐）"
                checked={encryptExport}
                onChange={(e) => setEncryptExport(e.currentTarget.checked)}
              />

              <Divider my="sm" />

              {encryptExport && (
                <>
                  <PasswordInput
                    label="加密密码"
                    description="用于加密导出文件的密码"
                    placeholder="输入密码"
                    value={exportPassword}
                    onChange={(e) => {
                      setExportPassword(e.currentTarget.value);
                      checkPasswordStrength(e.currentTarget.value);
                    }}
                  />

                  {exportPassword && (
                    <Progress
                      value={passwordStrength.score}
                      color={getStrengthColor(passwordStrength.score)}
                      size="sm"
                      mb="xs"
                    />
                  )}

                  {exportPassword && (
                    <Text size="sm" color={getStrengthColor(passwordStrength.score)} mb="md">
                      {passwordStrength.feedback}
                    </Text>
                  )}

                  <PasswordInput
                    label="确认密码"
                    placeholder="再次输入密码"
                    value={confirmExportPassword}
                    onChange={(e) => setConfirmExportPassword(e.currentTarget.value)}
                    error={
                      confirmExportPassword && exportPassword !== confirmExportPassword
                        ? '密码不匹配'
                        : null
                    }
                  />
                </>
              )}

              <Alert title="安全提示" color="blue">
                如果您选择包含密钥，请确保使用强密码加密导出文件，并在安全的地方保存该密码。
              </Alert>

              <Button
                onClick={handleExport}
                loading={isExporting || loading}
                disabled={
                  encryptExport && (
                    !exportPassword ||
                    exportPassword !== confirmExportPassword ||
                    exportPassword.length < 8
                  )
                }
              >
                导出
              </Button>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
