import '@fontsource-variable/big-shoulders';
import '@fontsource-variable/onest';
import '@fontsource-variable/martian-mono';
import './index.css';

import { MotionConfig } from 'motion/react';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { consumeSetupLink } from './lib/install';
import { isUnlocked } from './lib/lock';
import { startAutoSync } from './lib/sync';
import { LockScreen } from './views/LockScreen';

consumeSetupLink();
// Uygulama açıkken kurulum bağlantısı yapıştırılırsa sayfa yeniden yüklenmez; onu da yakala.
window.addEventListener('hashchange', consumeSetupLink);
startAutoSync();

function Root() {
  const [open, setOpen] = useState(isUnlocked);
  if (open) return <App />;
  return (
    <MotionConfig reducedMotion="user">
      <LockScreen onUnlock={() => setOpen(true)} />
    </MotionConfig>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
