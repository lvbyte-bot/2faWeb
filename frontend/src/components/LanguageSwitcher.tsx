import { Select, Box } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

// 支持的语言列表
const LANGUAGES = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' }
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  // 当语言变化时更新状态
  useEffect(() => {
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  // 处理语言变化
  const handleLanguageChange = (value: string | null) => {
    if (value) {
      i18n.changeLanguage(value);
      setCurrentLang(value);
    }
  };

  return (
    <Box>
      <Select
        size="sm"
        value={currentLang}
        onChange={handleLanguageChange}
        data={LANGUAGES}
        clearable={false}
      />
    </Box>
  );
};

export default LanguageSwitcher;
