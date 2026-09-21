const fs = require('fs');
let content = fs.readFileSync('src/services/realtimeSyncService.ts', 'utf8');

// Imports
content = content.replace(
  "  Usuario\n} from '../types';",
  "  Usuario,\n  ActivityEntry\n} from '../types';"
);

// Method
content = content.replace(
  "  public stopAll() {",
  `  public startListeningActivityEntries() {
    const key = 'activity_entries_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;
      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) { existing(); this.unsubscribes.delete(key); }
        return;
      }
      if (this.unsubscribes.has(key)) return;

      let channel = null;
      let cancelled = false;

      SupabaseService.fetchTable('activity_entries')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useSectorStore.getState().setActivityEntries(rows);
          }
          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_entries' }, async () => {
              const fresh = await SupabaseService.fetchTable('activity_entries');
              if (fresh.length > 0) {
                useSectorStore.getState().setActivityEntries(fresh);
              }
            })
            .subscribe();

          this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
        })
        .catch((err) => console.error("[RealtimeSyncService] Erro activity_entries:", err));

      this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
    });
    this.authObservers.set(key, unsubscribeAuth);
  }

  public stopAll() {`
);

fs.writeFileSync('src/services/realtimeSyncService.ts', content);
