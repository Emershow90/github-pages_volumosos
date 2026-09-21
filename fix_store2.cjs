const fs = require('fs');
let content = fs.readFileSync('src/stores/useSectorStore.ts', 'utf8');

const typeRegex = /incrementActivityCategory: \(\s+sectorId: string,\s+activityDate: string,\s+userId: string,\s+category: keyof Omit<ActivityEntry, [^>]+>,\s+quantity: number\s+\) => Promise<void>;/;

const newType = `incrementActivityCategory: (
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
  ) => Promise<void>;`;

content = content.replace(typeRegex, newType);

const endOfFileRegex = /incrementActivityCategory: async \([\s\S]*\}\)\);/m;

let match = content.match(/incrementActivityCategory: async \([\s\S]*\}\)\);/m);

const newImpl = `incrementActivityCategory: async (sectorId, activityDate, userId, category, quantity) => {
    const { SupabaseService } = await import('../lib/supabaseService');
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate && e.userId === userId
    );
    const now = new Date().toISOString();
    
    if (existing) {
      const updated: ActivityEntry = {
        ...existing,
        [category]: (existing[category] as number) + quantity,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        updated,
        'id' as keyof ActivityEntry
      );
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
        [category]: quantity,
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

content = content.replace(endOfFileRegex, newImpl);
fs.writeFileSync('src/stores/useSectorStore.ts', content);
