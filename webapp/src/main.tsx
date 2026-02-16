import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n/index.tsx'
import resources from './i18n/resources.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider defaultLang="es" resources={resources}>
      <App />
    </I18nProvider>
  </StrictMode>,
)
