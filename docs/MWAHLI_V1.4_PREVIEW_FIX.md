# MWAHLI v1.4 — Local Preview Fix

The `npm run preview` command previously served the legacy generic HTML preview even though the real Next.js source had been redesigned.

v1.4 fixes that mismatch:
- `preview/index.html`, `preview/styles.css` and `preview/app.js` are rebuilt to match the cinematic MWAHLI direction.
- `preview/server.mjs` now serves the same AI-derived brand imagery and bespoke SVG assets used by the real web app.
- Legacy generic preview screenshots were removed to avoid visual confusion.
- Preview caching is disabled.
- The real Next.js UI work from v1.2/v1.3 remains intact.
