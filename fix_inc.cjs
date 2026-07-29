const fs = require('fs');
let content = fs.readFileSync('src/stores/useSectorStore.ts', 'utf8');

const oldMethod = `  incrementActivityCategory: async (sectorId, activityDate, userId, category, quantity) => {
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
  },`;

const newMethod = `  incrementActivityCategory: async (sectorId, activityDate, userId, category, quantity) => {
    const { SupabaseService } = await import('../lib/supabaseService');
    
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate && e.userId === userId
    );

    const now = new Date().toISOString();
    const entryData: any = existing ? { ...existing } : {
      // NÃO gera id fake; deixa o banco gerar via default gen_random_uuid()
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

    entryData[category] = (entryData[category] || 0) + quantity;
    entryData.updatedAt = now;

    const returnedEntry = await SupabaseService.upsertRecord(
      'activity_entries',
      entryData,
      'sector_id,activity_date,user_id' as any
    ) as ActivityEntry;

    get().setActivityEntries((prev) => {
      // Usa o ID retornado se disponível, ou busca por composite keys em cenários offline extremos
      const matchIdx = prev.findIndex(
        e => (returnedEntry.id && e.id === returnedEntry.id) || 
             (e.sectorId === sectorId && e.activityDate === activityDate && e.userId === userId)
      );
      
      if (matchIdx >= 0) {
        const updated = [...prev];
        updated[matchIdx] = returnedEntry;
        return updated;
      }
      return [...prev, returnedEntry];
    });
  },`;

content = content.replace(oldMethod, newMethod);
fs.writeFileSync('src/stores/useSectorStore.ts', content);
