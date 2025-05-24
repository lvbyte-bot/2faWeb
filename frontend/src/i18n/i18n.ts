import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言文件
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

// 配置i18next
i18n
  // 自动检测用户语言
  .use(LanguageDetector)
  // 初始化react-i18next
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        translation: zhCN
      },
      'en-US': {
        translation: enUS
      }
    },
    fallbackLng: 'en-US',
    debug: true,
    saveMissing: true,
    saveMissingTo: 'all',
    interpolation: {
      escapeValue: false // React已经安全地转义了输出
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    returnNull: false,
    returnEmptyString: false,
    keySeparator: '.',
    nsSeparator: ':'
  });

// 使用语言检测器自动检测用户语言
// 可以通过 i18n.changeLanguage() 手动切换语言

export default i18n;
