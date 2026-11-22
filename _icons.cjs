const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const ids = [...s.matchAll(/<symbol id="i-([^"]+)"/g)].map(m => m[1]);
const need = ['message', 'alert', 'flame', 'plus', 'refresh', 'info', 'search', 'wallet', 'candles', 'coin', 'book', 'sparkles', 'play', 'pie', 'money', 'briefcase'];
console.log('missing:', need.filter(n => !ids.includes(n)).join(',') || 'none');
console.log(ids.join(' '));
