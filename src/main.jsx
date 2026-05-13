import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import 'katex/dist/katex.min.css'
import './i18n';
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// 🛡️ Mermaid global xatolarini (bombalarni) butunlay yo'q qilish skripti
if (typeof window !== 'undefined') {
  const cleanup = () => {
    const selectors = ['.mermaid-error-p', '.mermaid-error', '.mermaidTooltip', '[id^="dmermaid"]'];
    selectors.forEach(s => {
      document.querySelectorAll(s).forEach(el => el.remove());
    });
    // Bomba va xatolik matnlarini topib o'chirish
    document.querySelectorAll('div').forEach(el => {
      if (el.textContent?.includes('Syntax error in text') && el.textContent?.includes('mermaid version')) {
        el.remove();
      }
    });
  };
  
  const observer = new MutationObserver(cleanup);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(cleanup, 500);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
