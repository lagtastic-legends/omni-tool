const fs = require('fs');

let tb = fs.readFileSync('src/components/shell/top-bar.tsx', 'utf8');
tb = tb.replace('onError={() => setImgError(true)}', 'onError={() => setImgError(true)}\n                      referrerPolicy="no-referrer"');
fs.writeFileSync('src/components/shell/top-bar.tsx', tb, 'utf8');

let ag = fs.readFileSync('src/components/auth/auth-gateway.tsx', 'utf8');
ag = ag.replace('onError={() => setImgError(true)}', 'onError={() => setImgError(true)}\n                      referrerPolicy="no-referrer"');
fs.writeFileSync('src/components/auth/auth-gateway.tsx', ag, 'utf8');
