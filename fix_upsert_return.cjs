const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');

content = content.replace(
  /const \{ error \} = await client\n\s*\.from\(realTableName\)\n\s*\.upsert\(filteredRecord, \{ onConflict: String\(keyField\) \}\);/g,
  `const { data, error } = await client
          .from(realTableName)
          .upsert(filteredRecord, { onConflict: String(keyField) })
          .select()
          .maybeSingle();
        
        if (data) {
          const dbRet = this.fromDbRecord(tableName, data) as unknown as T;
          await IndexedDBService.put(tableName, dbRet);
          return dbRet;
        }`
);

fs.writeFileSync('src/lib/supabaseService.ts', content);
