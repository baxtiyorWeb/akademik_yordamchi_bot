import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  uz: {
    translation: {
      "home": "Asosiy",
      "chat": "Chat",
      "profile": "Profil",
      "login": "Kirish",
      "logout": "Chiqish",
      "kids_mode": "Bolalar rejimi",
      "kids_mode_desc": "O'yinqaroq va sodda javoblar",
      "standard_mode": "Standart rejim",
      "standard_mode_desc": "Akademik va rasmiy javoblar",
      "welcome_kids": "Salom, do'stim! Nima haqida o'rganamiz bugun?",
      "welcome_standard": "Assalomu alaykum! Sizga qanday akademik yordam bera olaman?",
      "type_message": "Xabar yozing...",
      "send": "Yuborish",
      "settings": "Sozlamalar",
      "language": "Til"
    }
  },
  ru: {
    translation: {
      "home": "Главная",
      "chat": "Чат",
      "profile": "Профиль",
      "login": "Войти",
      "logout": "Выйти",
      "kids_mode": "Детский режим",
      "kids_mode_desc": "Веселые и простые ответы",
      "standard_mode": "Стандартный режим",
      "standard_mode_desc": "Академические и официальные ответы",
      "welcome_kids": "Привет, друг! Что мы сегодня будем изучать?",
      "welcome_standard": "Здравствуйте! Какую академическую помощь я могу вам оказать?",
      "type_message": "Введите сообщение...",
      "send": "Отправить",
      "settings": "Настройки",
      "language": "Язык"
    }
  },
  en: {
    translation: {
      "home": "Home",
      "chat": "Chat",
      "profile": "Profile",
      "login": "Login",
      "logout": "Logout",
      "kids_mode": "Kids Mode",
      "kids_mode_desc": "Playful and simple answers",
      "standard_mode": "Standard Mode",
      "standard_mode_desc": "Academic and formal answers",
      "welcome_kids": "Hello friend! What shall we learn today?",
      "welcome_standard": "Hello! How can I assist you academically today?",
      "type_message": "Type a message...",
      "send": "Send",
      "settings": "Settings",
      "language": "Language"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('app_language') || 'uz',
    fallbackLng: 'uz',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
