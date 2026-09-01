const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/auth-context.tsx', 'utf8');

const popupCodeOld =         const credential = await signInWithPopup(auth, new GoogleAuthProvider());
        setUser(toAuthUser(credential.user));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err ?? "sign-in failed");
        setError(
          /popup/i.test(message)
            ? "Sign-in popup was blocked or closed before finishing."
            : message,
        );
      } finally {;

const popupCodeNew =         // Web fallback: Use redirect instead of popup to bypass COOP/COEP isolation blocks
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err ?? "sign-in failed");
        setError(message);
      } finally {;

code = code.replace(popupCodeOld, popupCodeNew);

fs.writeFileSync('src/lib/auth/auth-context.tsx', code, 'utf8');
