const https = require('https');

https.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pubhtml?gid=515870420&single=true', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // very basic extraction of table cells
    const regex = /<td.*?>(.*?)<\/td>/g;
    let match;
    let count = 0;
    while ((match = regex.exec(data)) !== null && count < 100) {
      // strip html tags from inner content
      const text = match[1].replace(/<[^>]*>?/gm, '');
      console.log(`${count}: ${text}`);
      count++;
    }
  });
});
