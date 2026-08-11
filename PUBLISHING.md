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
| GAT bypass-2FA: account/package-management actions | Effective early Aug 2026 | Creating tokens, changing maintainers/access, configuring trusted publishing → interactive 2FA only |
| GAT bypass-2FA: **direct publish** | ~January 2027 | Publish reduces to staging + human 2FA approval |

Sources: https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/
and https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens/

**Impact on this package:** `tappay-web-module` is zero-dependency with no
install/lifecycle scripts, so npm v12's `allowScripts` default does not affect
consumers. The publishing path is what must evolve.

## 1. Current state (2026-08-11, update after user decision)

- Account: **slashman413** (slashman413@gmail.com), 2FA enabled (npm requires
  it for publishing). Token `tappay-token` at `~/.priv/npm-token` is an `npm_`
  GAT (scope: package write, expires 2026-11-09) **without bypass-2FA** →
  `npm publish` fails with E403 (re-verified 2026-08-11): "Two-factor
  authentication or granular access token with bypass 2fa enabled is required
  to publish packages."
- **Decision (user, 2026-08-11): do NOT regenerate the token with "Bypass 2FA".**
  npm is actively restricting bypass-2FA GATs — the registry now returns a
  deprecation notice (`npm tokens that bypass 2FA are being restricted for
  account changes and direct publishing`) on every authenticated request. The
  durable path below is trusted publishing (OIDC), which needs no token at all.
- Name `tappay-web-module` is **available** on the public registry (verified
  E404 on `npm view` today) — no fallback name needed.
- Build/tests/pack verified: 9/9 tests pass, tarball 26.9 kB / 16 files.
- Docs site live: GitHub Pages on `main` `/docs` →
  https://slashmantools.us/tappay-web-module/ (canonical, README badge).

## 2. Unblock the first publish

**Option A (chosen) — one-time OTP; no token change, no bypass-2FA.**
1. `npm test` is green; then from the repo root
   (`/home/wayne/workspace/github/slashman413/tappay-web-module`) run
   `npm publish --otp=<6-digit code>` **within 30 s** of generating the code in
   the authenticator app. A stale code fails with EOTP — retry with a fresh
   one (npm's OTP check has a short grace window).
2. Verify: `npm view tappay-web-module` shows `1.1.0`.
3. Then do §3 once (1 minute, npm web UI + interactive 2FA) and every future
   release publishes tokenlessly from GitHub Actions.

**Option B — bypass-2FA GAT (DEPRECATED — do not use).** npm is restricting
these: account/package-management 2FA skip was removed in early Aug 2026, and
direct publish is slated for removal ~Jan 2027 — the surface reduces to staged
publishes + human 2FA approval. The registry already warns on every request.

**Option C — trusted publishing (OIDC) for the first publish too.**
Not possible for a package that doesn't exist yet — npm's Trusted Publishing
config lives on the package's settings page. Do A once, then §3.

**Option D — staged publishing.** `npm stage publish` + maintainer approval
(2FA) is the post-Jan-2027 manual flow, but npm explicitly forbids staging a
**brand-new** package ("The package already exists on the npm registry — you
cannot stage a brand-new package"), so it cannot bootstrap this first publish.
Requires npm CLI ≥ 11.15.0 / Node ≥ 22.14.0. Useful later if you want a human
review gate on releases.

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

For maximum security, npm recommends configuring the trusted publisher with
**stage-only** permissions (`npm stage publish` only) so every release needs a
maintainer's 2FA approval before going live, and then setting the package
Settings → Publishing access to *"Require two-factor authentication and
disallow tokens"*.

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
