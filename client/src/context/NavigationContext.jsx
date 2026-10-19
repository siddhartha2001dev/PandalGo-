import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  return (
    <NavigationContext.Provider
      value={{
        mobileMenuOpen,
        setMobileMenuOpen,
        openMobileMenu,
        closeMobileMenu,
        toggleMobileMenu,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    return {
      mobileMenuOpen: false,
      setMobileMenuOpen: () => {},
      openMobileMenu: () => {},
      closeMobileMenu: () => {},
      toggleMobileMenu: () => {},
    };
  }
  return context;
}
