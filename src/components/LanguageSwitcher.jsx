import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import './LanguageSwitcher.css';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
  };

  return (
    <div className="language-switcher">
      <Globe size={18} className="lang-icon" />
      <select 
        value={i18n.language} 
        onChange={(e) => changeLanguage(e.target.value)}
        className="lang-select"
      >
        <option value="uz">UZ</option>
        <option value="ru">RU</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;
