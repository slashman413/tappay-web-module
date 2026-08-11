# Publishing Strategy — tappay-web-module

Status: **first publish pending npm credential fix** (see §1).
This file is the living strategy for how this package reaches npm and stays
publishable as npm tightens its security model.

## 0. Why this exists (context)

npm is deprecating the most sensitive uses of **2FA-bypass granular access
tokens (GATs)**:

| Milestone | Date | Effect |
| :--- | :--- | :--- |
| Install-time security defaults (npm v12) | GA 2026-07-08 | `allowScripts` off by default; git/remote deps opt-in |
| GAT bypass-2FA: account/package-management actions | Retired 2026-07-31 | Creating tokens, changing maintainers/access, configuring trusted publishing → interactive 2FA only |
| GAT bypass-2FA: **direct publish** | ~January 2027 | Publish reduces to staging + human 2FA approval |

Sources: https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/
and https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens/

**Impact on this package:** `tappay-web-module` is zero-dependency with no
install/lifecycle scripts, so npm v12's `allowScripts` default does not affect
consumers. The publishing path is what must evolve.

## 1. Current state (2026-08-11)

- Account: **slashman413** (slashman413@gmail.com), 2FA enabled (npm requires
  it for publishing).
- Token at `~/.priv/npm-token` is an `npm_`-prefixed GAT **without** bypass-2FA
  → `npm publish` fails with E403
  ("Two-factor authentication or granular access token with bypass 2fa enabled
  is required to publish packages").
- Name `tappay-web-module` is **available** on the public registry (verified
  E404 on `npm view`).
- Build/tests/pack verified: 9/9 tests pass, tarball 26.9 kB / 16 files.
- Docs site live: GitHub Pages on `main` `/docs` →
  https://slashmantools.us/tappay-web-module/ (canonical, README badge).

## 2. Unblock the first publish (pick ONE)

**Option A — regenerate the GAT with Bypass 2FA ticked (fastest, valid until ~Jan 2027).**
npmjs.com → *Access Tokens → Generate New Token → Granular Access Token* →
scope: *tappay-web-module*, permission *Read and write* → tick
**"Bypass 2FA"** → save to `~/.priv/npm-token` (one line, raw token).
Then `npm publish` from this repo works directly.

**Option B — one-time OTP (no token change).**
`npm publish --otp=<6-digit code>` within 30 s of generating the code in the
authenticator app.

**Option C — trusted publishing (OIDC) for the first publish too.**
Not possible for a package that doesn't exist yet — npm's Trusted Publishing
config lives on the package's settings page. Do A or B once, then §3.

## 3. Durable path: Trusted Publishing (OIDC) — recommended by January 2027

`.github/workflows/publish.yml` already implements the npm-documented pattern:
`permissions: id-token: write` + `npm publish --provenance --access public`,
triggered by `v*` tags or manual dispatch. No token in secrets.

One-time setup (interactive 2FA required, npm web UI):
1. First publish done (§2).
2. npmjs.com → **tappay-web-module → Settings → Access → Trusted Publishing** →
   *Add GitHub repository*: `slashman413/tappay-web-module`, workflow
   `publish.yml`.
3. Release flow from then on: bump `version` in package.json, `git tag vX.Y.Z
   && git push --tags` → GitHub Actions tests and publishes tokenlessly with
   SLSA provenance.

Fallback (until ~Jan 2027): token in `NPM_TOKEN` secret + same workflow.

## 4. Release checklist

1. `npm test` — all green (prepack gate runs it again).
2. `npm pack --dry-run` — confirm file list (src/, types/, README, LICENSE).
3. Bump version (`npm version patch|minor|major` — do NOT use `npm version`
   with git tag if publishing via tag-triggered workflow; keep them in sync).
4. Publish (token/OTP now; tag-push after §3).
5. Verify: `npm view tappay-web-module` shows the version; README badge updates
   automatically; docs Pages rebuilds on push.

## 5. Security posture

- `~/.priv/npm-token` never printed or committed; `.npmrc` in repo is absent
  (global `~/.npmrc` holds registry auth).
- Zero runtime dependencies → no supply-chain surface for consumers.
- Provenance (once §3 done) lets consumers verify builds came from this repo.
