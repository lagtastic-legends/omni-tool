const fs = require('fs');
const file = 'src/components/tools/studio-recorder.tsx';
let code = fs.readFileSync(file, 'utf8');
const effect =   useEffect(() => {
    return () => {
      setOutput((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return null;
      });
    };
  }, []);
;
code = code.replace(effect, '');
fs.writeFileSync(file, code);
