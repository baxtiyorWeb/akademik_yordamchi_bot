import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg-main border border-border-custom rounded-xl transition-all hover:border-primary group">
      <Globe size={16} className="text-text-muted group-hover:text-primary transition-colors" />
      <select 
        value={i18n.language} 
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-transparent border-none outline-none text-xs font-bold text-text-main cursor-pointer appearance-none"
      >
        <option value="uz">UZ</option>
        <option value="ru">RU</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;
