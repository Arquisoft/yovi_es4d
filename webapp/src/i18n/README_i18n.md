Tutorial de como usar internacionalización con I18n

Uso
-----

1. Envuelve la app con el I18nProvider en `src/main.tsx` de la siguiente forma:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import I18nProvider from './i18n';
import resources from './i18n/resources';

createRoot(document.getElementById('root')!).render(
  <I18nProvider defaultLang="es" resources={resources}>
    <App />
  </I18nProvider>
);
```

2. Para clases concretas hay que usar el `useTranslation()` en los sitios donde queramos cambiar de idioma:

```tsx
import { useTranslation } from './i18n';

function StartScreen() {
  const { t, setLang, lang } = useTranslation();
  return <h1>{t('startScreen.title')}</h1>;
}
```
