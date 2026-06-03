import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'uz', label: 'O‘zbekcha', flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = i18n.language?.split('-')[0];

  const current = LANGUAGES.find(l => l.code === currentLang);

  useEffect(() => {
    const saved = localStorage.getItem('app_language');
    if (saved && saved !== currentLang) {
      i18n.changeLanguage(saved);
    }
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (!ref.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-2 bg-bg-main border border-border-custom rounded-xl hover:border-primary transition-all"
      >
        <Globe size={16} className="text-text-muted" />
        <span className="text-xs font-semibold">
          {current?.code.toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 transition ${
                lang.code === currentLang ? 'bg-gray-50 font-semibold' : ''
              }`}
            >
              <span>{lang.flag} {lang.label}</span>
              {lang.code === currentLang && <Check size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;