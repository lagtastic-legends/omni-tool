const fs = require('fs');

let ag = fs.readFileSync('src/components/auth/auth-gateway.tsx', 'utf8');
ag = ag.replace('referrerPolicy="no-referrer"', 'referrerPolicy={isNative ? undefined : "no-referrer"}');
fs.writeFileSync('src/components/auth/auth-gateway.tsx', ag, 'utf8');
