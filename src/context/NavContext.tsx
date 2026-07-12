import React, { createContext, useContext, useState, useCallback } from 'react';

export type AppTab =
  | 'analytics'
  | 'invoices'
  | 'quotations'
  | 'statements'
  | 'inventory'
  | 'clients'
  | 'settings';

interface NavContextType {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  goTo: (tab: AppTab) => void;
  openQuickCreate: boolean;
  setOpenQuickCreate: (open: boolean) => void;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<AppTab>('analytics');
  const [openQuickCreate, setOpenQuickCreate] = useState(false);

  const goTo = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    setOpenQuickCreate(false);
  }, []);

  return (
    <NavContext.Provider
      value={{ activeTab, setActiveTab, goTo, openQuickCreate, setOpenQuickCreate }}
    >
      {children}
    </NavContext.Provider>
  );
};

export const useNav = () => {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
};
