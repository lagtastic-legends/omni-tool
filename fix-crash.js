const fs = require('fs');
let ag = fs.readFileSync('src/components/auth/auth-gateway.tsx', 'utf8');
ag = ag.replace('useAuth();\n\n  const configured', 'useAuth();\n  const [imgError, setImgError] = useState(false);\n\n  const configured');
fs.writeFileSync('src/components/auth/auth-gateway.tsx', ag, 'utf8');
