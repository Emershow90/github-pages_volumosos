const fs = require('fs');
fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?gid=515870420&single=true&output=csv')
.then(r => r.text())
.then(csv => {
  const lines = csv.split('\n');
  lines.forEach((line, i) => {
    console.log(`Line ${i + 1}:`);
    line.split(',').forEach((col, j) => {
      console.log(`  Col ${j} (${String.fromCharCode(65 + j)}): ${col}`);
    });
  });
});
