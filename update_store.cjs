const fs = require('fs');
let content = fs.readFileSync('src/stores/useSectorStore.ts', 'utf8');

// Imports
content = content.replace(
  "UniversoMix, ReferenteSemana } from '../types';",
  "UniversoMix, ReferenteSemana, ActivityEntry } from '../types';"
);

// State
content = content.replace(
  "  bolsaoData: BolsaoData;\n",
  "  bolsaoData: BolsaoData;\n  activityEntries: ActivityEntry[];\n"
);

// Actions interface
content = content.replace(
  "  setBolsaoData: (bolsaoData: BolsaoData | ((prev: BolsaoData) => BolsaoData)) => void;\n",
  `  setBolsaoData: (bolsaoData: BolsaoData | ((prev: BolsaoData) => BolsaoData)) => void;
  setActivityEntries: (entries: ActivityEntry[] | ((prev: ActivityEntry[]) => ActivityEntry[])) => void;
  incrementActivityCategory: (
    sectorId: string,
    activityDate: string,
    userId: string,
    category: keyof Omit<ActivityEntry, 'id' | 'sectorId' | 'activityDate' | 'userId' | 'adhocCategories' | 'createdAt' | 'updatedAt'>,
    quantity: number
  ) => Promise<void>;\n`
);

// Initial state
content = content.replace(
  "  bolsaoData: initialBolsao,\n",
  "  bolsaoData: initialBolsao,\n  activityEntries: [],\n"
);

// Action implementations
content = content.replace(
  "  setBolsaoData: (val) => set((state) => {\n    const next = typeof val === 'function' ? val(state.bolsaoData) : val;\n    return { bolsaoData: next };\n  }),\n",
  `  setBolsaoData: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.bolsaoData) : val;
    return { bolsaoData: next };
  }),

  setActivityEntries: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.activityEntries) : val;
    return { activityEntries: next };
  }),

  incrementActivityCategory: async (sectorId, activityDate, userId, category, quantity) => {
    const { SupabaseService } = await import('../lib/supabaseService');
    
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate && e.userId === userId
    );

    const now = new Date().toISOString();
    const entry = existing ? { ...existing } : {
      id: crypto.randomUUID ? crypto.randomUUID() : \`activity_\${Date.now()}_\${Math.random()}\`,
      sectorId,
      activityDate,
      userId,
      alimento: 0,
      montanha: 0,
      l7Mochila: 0,
      elog: '',
      reapro: '',
      colis: 0,
      adhocCategories: {},
      createdAt: now,
      updatedAt: now
    };

    entry[category] = (entry[category] || 0) + quantity;
    entry.updatedAt = now;

    await SupabaseService.upsertRecord('activity_entries', entry);

    get().setActivityEntries((prev) => {
      const idx = prev.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  },\n`
);

fs.writeFileSync('src/stores/useSectorStore.ts', content);
