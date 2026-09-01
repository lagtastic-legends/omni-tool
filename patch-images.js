const fs = require('fs');

// Patch top-bar.tsx
let tb = fs.readFileSync('src/components/shell/top-bar.tsx', 'utf8');
// Remove hidden class
tb = tb.replace('className="hidden items-center gap-2 rounded-full border border-pulse/30 bg-pulse/10 px-2.5 py-1.5 md:flex"', 'className="flex items-center gap-2 rounded-full border border-pulse/30 bg-pulse/10 px-2.5 py-1.5"');
// Add useState
if (!tb.includes('import { useState }')) {
    tb = tb.replace('import { motion }', 'import { useState } from "react";\nimport { motion }');
}
tb = tb.replace('const { mode, user, signOut } = useAuth();', 'const { mode, user, signOut } = useAuth();\n  const [imgError, setImgError] = useState(false);');
tb = tb.replace('{user.photoURL ? (', '{user.photoURL && !imgError ? (');
tb = tb.replace('className="size-4 rounded-full"', 'className="size-4 rounded-full"\n                      onError={() => setImgError(true)}');
fs.writeFileSync('src/components/shell/top-bar.tsx', tb, 'utf8');

// Patch auth-gateway.tsx
let ag = fs.readFileSync('src/components/auth/auth-gateway.tsx', 'utf8');
if (!ag.includes('import { useState }')) {
    ag = ag.replace('import { motion }', 'import { useState } from "react";\nimport { motion }');
}
ag = ag.replace('const { user, signInWithGoogle, signOut, mode } = useAuth();', 'const { user, signInWithGoogle, signOut, mode } = useAuth();\n  const [imgError, setImgError] = useState(false);');
ag = ag.replace('{user.photoURL ? (', '{user.photoURL && !imgError ? (');
ag = ag.replace('className="size-12 rounded-full border border-pulse/40"', 'className="size-12 rounded-full border border-pulse/40"\n                      onError={() => setImgError(true)}');
fs.writeFileSync('src/components/auth/auth-gateway.tsx', ag, 'utf8');
