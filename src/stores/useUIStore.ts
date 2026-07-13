import { create } from 'zustand';
import { ScreensaverConfig } from '../types';

interface UIStoreState {
  activeTab: string;
  activeSectorId: string;
  showTerminal: boolean;
  terminalInput: string;
  terminalLogs: string[];
  notifications: any[];
  screensaver: ScreensaverConfig;

  setActiveTab: (tab: string) => void;
  setActiveSectorId: (id: string) => void;
  setShowTerminal: (show: boolean) => void;
  setTerminalInput: (input: string) => void;
  setTerminalLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
  setNotifications: (notifications: any[] | ((prev: any[]) => any[])) => void;
  setScreensaver: (screensaver: ScreensaverConfig | ((prev: ScreensaverConfig) => ScreensaverConfig)) => void;
}

const getLocalOrDefault = <T>(key: string, defaultValue: T): T => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const useUIStore = create<UIStoreState>((set) => ({
  activeTab: localStorage.getItem('active_tab') || 'dashboard',
  activeSectorId: localStorage.getItem('active_sector_id') || '87',
  showTerminal: false,
  terminalInput: '',
  terminalLogs: [
    "LOGS DO SISTEMA INICIALIZADOS...",
    `BRAZIL TIME (BRT): ${new Date().toLocaleTimeString("pt-BR")}`,
    "AMBAR V1.0 - PRONTO PARA OPERAÇÕES."
  ],
  notifications: getLocalOrDefault('sys_notifications', [
    {
      id: "1",
      title: "Lista Liberada",
      desc: "Setor 89: Novo lote de volumosos liberado para separação.",
      time: "16:40",
      type: "success",
      read: false,
    },
    {
      id: "2",
      title: "Alta Produtividade",
      desc: "Setor 87 superou a meta de UPH da tarde (550).",
      time: "16:32",
      type: "success",
      read: false,
    },
    {
      id: "3",
      title: "Atenção ao Corte",
      desc: "Corte das 17:00 da Loja Osasco próximo do vencimento.",
      time: "16:15",
      type: "warning",
      read: true,
    },
    {
      id: "4",
      title: "Divergência OCR",
      desc: "Erro detectado no volume da Loja 9999 - LOJA TESTE.",
      time: "15:30",
      type: "danger",
      read: true,
    }
  ]),
  screensaver: getLocalOrDefault('screensaver_config', {
    enabled: true,
    timeout: 120, // 2 minutes
    duration: 30,
    image: '',
  }),

  setActiveTab: (activeTab) => set(() => {
    localStorage.setItem('active_tab', activeTab);
    return { activeTab };
  }),

  setActiveSectorId: (activeSectorId) => set(() => {
    localStorage.setItem('active_sector_id', activeSectorId);
    return { activeSectorId };
  }),

  setShowTerminal: (showTerminal) => set({ showTerminal }),

  setTerminalInput: (terminalInput) => set({ terminalInput }),

  setTerminalLogs: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.terminalLogs) : val;
    return { terminalLogs: next };
  }),

  setNotifications: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.notifications) : val;
    localStorage.setItem('sys_notifications', JSON.stringify(next));
    return { notifications: next };
  }),

  setScreensaver: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.screensaver) : val;
    localStorage.setItem('screensaver_config', JSON.stringify(next));
    return { screensaver: next };
  }),
}));
