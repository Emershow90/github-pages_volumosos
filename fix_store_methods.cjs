const fs = require('fs');
let content = fs.readFileSync('src/stores/useSectorStore.ts', 'utf8');

// Add types for the new methods
const typeString = `  incrementActivityCategory: (
    sectorId: string,
    activityDate: string,
    userId: string,
    category: 'alimento' | 'montanha' | 'l7Mochila' | 'colis',
    quantity: number
  ) => Promise<void>;
  updateActivityTextField: (
    sectorId: string,
    activityDate: string,
    userId: string,
    field: 'elog' | 'reapro',
    value: string
  ) => Promise<void>;
  updateAdhocCategory: (
    sectorId: string,
    activityDate: string,
    userId: string,
    categoryName: string,
    value: string | number
  ) => Promise<void>;
}
`;

content = content.replace(/  incrementActivityCategory: \(\n    sectorId: string,\n    activityDate: string,\n    userId: string,\n    category: 'alimento' \| 'montanha' \| 'l7Mochila' \| 'colis',\n    quantity: number\n  \) => Promise<void>;\n\}/, typeString);


// Add the implementation of the new methods right after incrementActivityCategory
const implString = `
  updateActivityTextField: async (sectorId, activityDate, userId, field, value) => {
    const { SupabaseService } = await import('../lib/supabaseService');
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate && e.userId === userId
    );
    const now = new Date().toISOString();
    
    if (existing) {
      const updated: ActivityEntry = {
        ...existing,
        [field]: value,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord('activity_entries', updated, 'id' as keyof ActivityEntry);
      get().setActivityEntries((prev) => {
        const idx = prev.findIndex(e => e.id === result.id);
        if (idx >= 0) {
          const updatedList = [...prev];
          updatedList[idx] = result;
          return updatedList;
        }
        return [...prev, result];
      });
    } else {
      const newEntry: Omit<ActivityEntry, 'id'> = {
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
        [field]: value,
        createdAt: now,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        newEntry as ActivityEntry,
        undefined,
        'sector_id,activity_date,user_id'
      );
      get().setActivityEntries((prev) => [...prev, result]);
    }
  },

  updateAdhocCategory: async (sectorId, activityDate, userId, categoryName, value) => {
    const { SupabaseService } = await import('../lib/supabaseService');
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate && e.userId === userId
    );
    const now = new Date().toISOString();
    
    if (existing) {
      const updated: ActivityEntry = {
        ...existing,
        adhocCategories: {
          ...(existing.adhocCategories || {}),
          [categoryName]: value
        },
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord('activity_entries', updated, 'id' as keyof ActivityEntry);
      get().setActivityEntries((prev) => {
        const idx = prev.findIndex(e => e.id === result.id);
        if (idx >= 0) {
          const updatedList = [...prev];
          updatedList[idx] = result;
          return updatedList;
        }
        return [...prev, result];
      });
    } else {
      const newEntry: Omit<ActivityEntry, 'id'> = {
        sectorId,
        activityDate,
        userId,
        alimento: 0,
        montanha: 0,
        l7Mochila: 0,
        elog: '',
        reapro: '',
        colis: 0,
        adhocCategories: {
          [categoryName]: value
        },
        createdAt: now,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        newEntry as ActivityEntry,
        undefined,
        'sector_id,activity_date,user_id'
      );
      get().setActivityEntries((prev) => [...prev, result]);
    }
  }
}));`;

content = content.replace(/\n  }\n\}\)\);/, implString);
fs.writeFileSync('src/stores/useSectorStore.ts', content);
