const fs = require('fs');
let code = fs.readFileSync('src/components/auth/auth-gateway.tsx', 'utf8');
code = code.replace(
  'const { mode, user, busy, error, isNative, signInWithGoogle, signOut } =\n    useAuth();',
  'const { mode, user, busy, error, isNative, signInWithGoogle, signOut } = useAuth();\n  const [imgError, setImgError] = useState(false);'
);
fs.writeFileSync('src/components/auth/auth-gateway.tsx', code, 'utf8');
