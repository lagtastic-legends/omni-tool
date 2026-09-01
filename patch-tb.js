const fs = require('fs');

let tb = fs.readFileSync('src/components/shell/top-bar.tsx', 'utf8');
tb = tb.replace('const { mode, user, signOut } = useAuth();', 'const { mode, user, signOut, isNative } = useAuth();');
tb = tb.replace('referrerPolicy="no-referrer"', 'referrerPolicy={isNative ? undefined : "no-referrer"}');
fs.writeFileSync('src/components/shell/top-bar.tsx', tb, 'utf8');
