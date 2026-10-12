import '@fontsource-variable/big-shoulders';
import '@fontsource-variable/onest';
import '@fontsource-variable/martian-mono';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { consumeSetupLink } from './lib/install';
import { startAutoSync } from './lib/sync';

consumeSetupLink();
// Uygulama açıkken kurulum bağlantısı yapıştırılırsa sayfa yeniden yüklenmez; onu da yakala.
window.addEventListener('hashchange', consumeSetupLink);
startAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
