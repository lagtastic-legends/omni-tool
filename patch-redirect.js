const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/auth-context.tsx', 'utf8');

// Replace signInWithPopup import with signInWithRedirect and getRedirectResult
code = code.replace(
  'signInWithPopup,',
  'signInWithRedirect,\n  getRedirectResult,'
);

// Add getRedirectResult to useEffect
code = code.replace(
  'const auth = getFirebaseAuth();\n      if (!auth) {\n        setMode("unconfigured");\n        return;\n      }\n\n      unsubscribeWeb = onAuthStateChanged',
  'const auth = getFirebaseAuth();\n      if (!auth) {\n        setMode("unconfigured");\n        return;\n      }\n      \n      try {\n        await getRedirectResult(auth);\n      } catch (err) {\n        console.error("Redirect sign-in error:", err);\n      }\n\n      unsubscribeWeb = onAuthStateChanged'
);

// Replace signInWithPopup with signInWithRedirect in signInWithGoogle
code = code.replace(
  'const credential = await signInWithPopup(auth, new GoogleAuthProvider());\n        setUser(toAuthUser(credential.user));\n      } catch (err) {\n        const message =\n          err instanceof Error ? err.message : String(err ?? "sign-in failed");\n        setError(\n          /popup/i.test(message)\n            ? "Sign-in popup was blocked or closed before finishing."\n            : message,\n        );\n      } finally {\n        setBusy(false);\n      }',
  'await signInWithRedirect(auth, new GoogleAuthProvider());\n      } catch (err) {\n        const message =\n          err instanceof Error ? err.message : String(err ?? "sign-in failed");\n        setError(message);\n        setBusy(false);\n      }'
);

fs.writeFileSync('src/lib/auth/auth-context.tsx', code, 'utf8');
