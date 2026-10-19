import React, { useState, useEffect } from 'react';
import { DevBotLauncher } from './DevBotLauncher.jsx';
import { DevBotPanel } from './DevBotPanel.jsx';

/**
 * DevBot
 * Root assistant container managing visibility, global events, and responsive behavior.
 */
export function DevBot() {
  const [isOpen, setIsOpen] = useState(false);

  // Allow other components to trigger opening Dev Bot via custom event
  useEffect(() => {
    const handleOpenDevBot = () => setIsOpen(true);
    const handleToggleDevBot = () => setIsOpen((prev) => !prev);

    window.addEventListener('pandalgo:open-devbot', handleOpenDevBot);
    window.addEventListener('pandalgo:toggle-devbot', handleToggleDevBot);

    return () => {
      window.removeEventListener('pandalgo:open-devbot', handleOpenDevBot);
      window.removeEventListener('pandalgo:toggle-devbot', handleToggleDevBot);
    };
  }, []);

  return (
    <>
      <DevBotLauncher
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />
      <DevBotPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

export default DevBot;
