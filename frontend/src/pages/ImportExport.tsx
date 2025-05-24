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
import { useTranslation } from 'react-i18next';

export default function ImportExport() {
  const { t } = useTranslation();
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
    console.log('开始解析文件:', file.name, file.type, file.size);
    setParseError(null);
    setParsedAccounts([]);

    // 检查文件类型和大小
    if (file.size === 0) {
      setParseError(t('importExport.emptyFile'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB限制
      setParseError(t('importExport.fileTooLarge'));
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        if (!e.target || !e.target.result) {
          setParseError(t('importExport.readFileFailed'));
          return;
        }

        // 检查是否是图片文件（DataURL格式）
        const result = e.target.result as string;
        if (result.startsWith('data:image/')) {
          console.log('处理图片文件...');

          // 创建图片对象
          const img = new Image();

          img.onload = () => {
            try {
              console.log('图片加载成功，尺寸:', img.width, 'x', img.height);

              // 创建画布
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');

              if (!context) {
                setParseError(t('importExport.canvasContextFailed'));
                console.error(t('importExport.canvasContextFailed'));
                return;
              }

              // 设置画布大小
              canvas.width = img.width;
              canvas.height = img.height;

              // 绘制图片到画布
              context.drawImage(img, 0, 0, img.width, img.height);

              // 获取图像数据
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              console.log('获取图像数据成功，开始解析二维码');

              // 导入jsQR库
              import('jsqr').then(jsQRModule => {
                const jsQR = jsQRModule.default;

                // 尝试解析二维码
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'attemptBoth', // 尝试正常和反转颜色
                });

                console.log('二维码解析结果:', code ? '成功' : '失败');

                if (code && code.data.startsWith('otpauth://')) {
                  try {
                    console.log('检测到OTP二维码:', code.data.substring(0, 30) + '...');
                    // 尝试解析 OTP URI
                    const account = parseOtpUri(code.data);
                    console.log('OTP URI解析成功:', account.name, account.issuer);

                    // 设置解析结果
                    setParsedAccounts([account]);
                  } catch (err) {
                    setParseError(t('importExport.invalidOtpQrCode'));
                    console.error('解析 OTP URI 失败:', err);
                  }
                } else {
                  setParseError(t('importExport.noValidOtpQrCode'));
                  console.log('未检测到二维码或二维码不是OTP格式', code?.data);
                }
              }).catch(err => {
                console.error('加载jsQR库失败:', err);
                setParseError(t('importExport.loadQrLibFailed'));
              });
            } catch (err) {
              setParseError(t('importExport.processImageError'));
              console.error('处理图片失败:', err);
            }
          };

          img.onerror = () => {
            setParseError(t('importExport.cannotLoadImage'));
            console.error('图片加载失败');
          };

          // 设置图片源
          img.src = result;
          return;
        }

        // 处理文本内容
        let content = result;
        console.log('文件内容长度:', content.length);

        // 检查是否是加密的导出文件
        let isEncrypted = false;
        try {
          isEncrypted = encryptionService.isEncryptedExportData(content);
          console.log('文件是否加密:', isEncrypted);

          if (isEncrypted) {
            if (!importPassword) {
              setParseError(t('importExport.fileEncryptedNeedPassword'));
              return;
            }

            try {
              // 尝试解密文件
              content = await encryptionService.decryptImportData(content, importPassword);
              console.log('文件解密成功');
            } catch (decryptError) {
              console.error('解密文件失败:', decryptError);
              setParseError(t('importExport.decryptFileFailed'));
              return;
            }
          }
        } catch (encryptionCheckError) {
          // 不是加密文件，继续处理
          console.log('检查加密状态出错，继续处理:', encryptionCheckError);
        }

        // 尝试解析为 JSON
        try {
          const json = JSON.parse(content);
          console.log('成功解析为JSON');

          // 检查是否是 2FA Web 导出文件
          if (Array.isArray(json.accounts)) {
            console.log('检测到2FA Web导出文件格式');
            setParsedAccounts(json.accounts);
            return;
          }

          // 检查是否是 Google Authenticator 导出文件
          if (Array.isArray(json.otpauth_migration_entries)) {
            console.log('检测到Google Authenticator导出文件格式');
            // 这里需要实现 Google Authenticator 导出文件的解析
            setParseError('Google Authenticator 导出文件解析尚未实现');
            return;
          }

          // 其他JSON格式，但不是我们支持的格式
          console.log('未知的JSON格式');
          setParseError(t('importExport.unsupportedJsonFormat'));
        } catch (jsonError) {
          console.log('不是JSON格式，尝试解析为OTP URI列表');

          // 不是 JSON 文件，尝试解析为 otpauth URI 列表
          const lines = content.split(/\r?\n/);
          const accounts: OTPAccount[] = [];

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('otpauth://')) {
              try {
                const account = parseOtpUri(trimmedLine);
                accounts.push(account);
                console.log('成功解析OTP URI:', trimmedLine.substring(0, 20) + '...');
              } catch (error) {
                console.error('解析 OTP URI 失败:', error);
              }
            }
          }

          if (accounts.length > 0) {
            console.log('成功解析OTP URI列表，找到账户数:', accounts.length);
            setParsedAccounts(accounts);
            return;
          }

          // 如果没有找到任何有效的OTP URI，设置错误
          console.log('未找到有效的OTP URI');
          setParseError(t('importExport.noValidOtpData'));
        }
      } catch (error) {
        console.error('解析文件失败:', error);
        setParseError(t('importExport.parseFileFailed') + ': ' + (error instanceof Error ? error.message : String(error)));
      }
    };

    reader.onerror = (event) => {
      console.error('文件读取错误:', event);
      setParseError(t('importExport.readFileFailed') + ': ' + (event.target?.error?.message || t('importExport.unknownError')));
    };

    // 检查是否是图片文件
    const isImage = file.type.startsWith('image/') ||
                   ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].some(ext =>
                     file.name.toLowerCase().endsWith(ext));

    if (isImage) {
      console.log('检测到图片文件，尝试解析为二维码');
      // 对于图片文件，使用readAsDataURL读取
      reader.readAsDataURL(file);
    } else if (file.type === 'application/json' ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.txt')) {
      // 对于文本文件，使用readAsText读取
      reader.readAsText(file);
    } else {
      // 对于其他二进制文件，先尝试以文本方式读取
      reader.readAsText(file);
    }
  };

  // 处理文件选择
  const handleFileChange = (file: File | null) => {
    console.log('文件选择:', file);
    setImportFile(file);

    if (file) {
      // 清除之前的错误和解析结果
      setParseError(null);
      setParsedAccounts([]);

      // 解析文件
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
        title: t('common.error'),
        message: t('importExport.noAccountsToImport'),
        color: 'red',
      });
      return;
    }

    setIsImporting(true);

    try {
      console.log('开始导入账户，数量:', parsedAccounts.length);

      // 检查账户数据是否有效
      for (const account of parsedAccounts) {
        if (!account.name || !account.secret) {
          throw new Error(t('importExport.accountDataMissingFields', { account: JSON.stringify(account) }));
        }
      }

      // 尝试导入账户
      const importedAccounts = await importAccounts(parsedAccounts);
      console.log('导入成功，返回数据:', importedAccounts);

      notifications.show({
        title: t('importExport.importSuccess'),
        message: t('importExport.importSuccessMessage', { count: parsedAccounts.length }),
        color: 'green',
      });

      // 清除导入状态
      setImportFile(null);
      setImportPassword('');
      setParsedAccounts([]);

      // 延迟后跳转到仪表盘
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('导入失败:', error);

      // 改进错误消息处理
      let errorMessage = '导入账户失败';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          // 尝试将对象转换为JSON字符串
          errorMessage = JSON.stringify(error);
        } catch (e) {
          // 如果无法转换为JSON，使用Object.prototype.toString
          errorMessage = Object.prototype.toString.call(error);
        }
      } else if (error !== undefined && error !== null) {
        errorMessage = String(error);
      }

      console.log('格式化后的错误消息:', errorMessage);

      notifications.show({
        title: t('importExport.importFailed'),
        message: errorMessage,
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
        title: t('common.error'),
        message: t('auth.passwordMismatch'),
        color: 'red',
      });
      return;
    }

    if (encryptExport && exportPassword.length < 8) {
      notifications.show({
        title: t('common.error'),
        message: t('importExport.passwordTooShort'),
        color: 'red',
      });
      return;
    }

    if (encryptExport && passwordStrength.score < 30) {
      notifications.show({
        title: t('common.warning'),
        message: t('importExport.weakPasswordWarning'),
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
            title: t('importExport.encryptionFailed'),
            message: t('importExport.encryptionFailedExport'),
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
        title: t('importExport.exportSuccess'),
        message: t('importExport.exportSuccessMessage', { count: accounts.length }),
        color: 'green',
      });

      setExportPassword('');
      setConfirmExportPassword('');
    } catch (error) {
      notifications.show({
        title: t('importExport.exportFailed'),
        message: error instanceof Error ? error.message : t('importExport.exportAccountsFailed'),
        color: 'red',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Container size="sm">
      <Title order={3} mb="md">
        {t('importExport.title')}
      </Title>

      <Text c="dimmed" mb="xl">
        {t('importExport.description')}
      </Text>

      <Tabs defaultValue="import">
        <Tabs.List mb="md">
          <Tabs.Tab value="import">{t('importExport.import')}</Tabs.Tab>
          <Tabs.Tab value="export">{t('importExport.export')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="import">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Text>
                {t('importExport.importDescription')}
              </Text>

              <List spacing="xs" size="sm" center>
                <List.Item>{t('importExport.formatWebExport')}</List.Item>
                <List.Item>{t('importExport.formatGoogleAuth')}</List.Item>
                <List.Item>{t('importExport.formatAegis')}</List.Item>
                <List.Item>{t('importExport.formatAuthy')}</List.Item>
              </List>

              <Divider my="sm" />

              <FileInput
                label={t('importExport.selectImportFile')}
                placeholder={t('importExport.clickToSelectFile')}
                accept=".json,.txt,.bin,.png,.jpg,.jpeg"
                value={importFile}
                onChange={handleFileChange}
                clearable
                description={t('importExport.supportedFileTypes')}
                error={parseError}
              />

              {parseError && (
                <Alert color="red" title={t('importExport.parseError')}>
                  {parseError}
                </Alert>
              )}

              {parsedAccounts.length > 0 && (
                <Alert color="green" title={t('importExport.parsedAccounts')}>
                  {t('importExport.successfullyParsed', { count: parsedAccounts.length })}
                </Alert>
              )}

              <PasswordInput
                label={t('importExport.passwordIfEncrypted')}
                placeholder={t('importExport.enterPassword')}
                value={importPassword}
                onChange={(e) => setImportPassword(e.currentTarget.value)}
              />

              <Alert title={t('common.note')} color="yellow">
                {t('importExport.importNote')}
              </Alert>

              <Button
                onClick={handleImport}
                loading={isImporting || loading}
                disabled={!importFile || parsedAccounts.length === 0}
              >
                {t('importExport.import')}
              </Button>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="export">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Text>
                {t('importExport.exportDescription')}
              </Text>

              <Checkbox
                label={t('importExport.includeSecrets')}
                checked={includeSecrets}
                onChange={(e) => setIncludeSecrets(e.currentTarget.checked)}
              />

              <Checkbox
                label={t('importExport.encryptExportFile')}
                checked={encryptExport}
                onChange={(e) => setEncryptExport(e.currentTarget.checked)}
              />

              <Divider my="sm" />

              {encryptExport && (
                <>
                  <PasswordInput
                    label={t('importExport.encryptionPassword')}
                    description={t('importExport.encryptionPasswordDescription')}
                    placeholder={t('importExport.enterPassword')}
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
                    label={t('importExport.confirmPassword')}
                    placeholder={t('importExport.enterPasswordAgain')}
                    value={confirmExportPassword}
                    onChange={(e) => setConfirmExportPassword(e.currentTarget.value)}
                    error={
                      confirmExportPassword && exportPassword !== confirmExportPassword
                        ? t('auth.passwordMismatch')
                        : null
                    }
                  />
                </>
              )}

              <Alert title={t('importExport.securityTip')} color="blue">
                {t('importExport.securityMessage')}
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
                {t('importExport.export')}
              </Button>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
