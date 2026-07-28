# Changelog

## 1.0.0-beta.1 (2026-07-28)

First release published to the public npm registry. No runtime changes since
`1.0.0-alpha-13` — this release covers packaging, CI and release
infrastructure only.

### Release infrastructure

- **Publishing**: added `.github/workflows/publish.yml` — publishes to the
  public npm registry from GitHub Actions with npm provenance
  (`npm publish --provenance --access public`), designed for npm trusted
  publishing (OIDC, `id-token: write`). Triggered by `v*` tags or manual
  dispatch.
- **CI**: CodeQL workflow migrated from the deprecated
  `github/codeql-action@v1` (unsupported since 2023, failing on current
  runners) to `@v3` with `actions/checkout@v4` and an explicit
  `security-events: write` permission block.

### Chore — npm pre-publish hygiene (no runtime changes)

- **package.json**: added `files` allowlist (`lib` only) so the published
  tarball no longer carries the test suite; normalized `repository.url` to the
  `git+https://` form npm expects.
- **package.json / test**: the test suite now runs with a fixed timezone
  (`TZ=UTC` in the `test` script) — the `implicit-timezone()` spec previously
  depended on the machine's local timezone and failed outside UTC. Test-only
  change; runtime code untouched.
- **CI**: Node.js workflow matrix updated from EOL Node 8–15 to current LTS
  (22.x, 24.x); `actions/checkout` and `actions/setup-node` bumped to v4.

## 1.0.0-alpha-13 (2026-07-26)

### Rebrand — x4ms-xpath2.js is now @xformado/xpath2

- Package renamed from `x4ms-xpath2.js` to `@xformado/xpath2` as part of the
  x4ms → xformado rebrand. No functional changes.
- Repository transferred to [xformado/xformado-xpath2.js](https://github.com/xformado/xformado-xpath2.js)
  (fork lineage to [ilinsky/xpath2.js](https://github.com/ilinsky/xpath2.js) preserved).
- Historical changelog entries below intentionally keep the old package name.

## 1.0.0-alpha-12 (2026-04-24)

### Feature — Pluggable date provider on DynamicContext

- **DynamicContext.js**: added static `cDynamicContext.dateProvider` hook. Consumers can override this to steer the baseline returned by `fn:current-date()`, `fn:current-dateTime()`, `fn:current-time()` and `fn:implicit-timezone()`. Default behaviour is unchanged (`new Date()`).

  ```js
  var xpath = require('x4ms-xpath2.js');
  xpath.DynamicContext.dateProvider = function() {
      return getSimulatedDate() || new Date();
  };
  ```

  Motivated by x4ms §Fáza F (preview-time simulated date). Previously consumers had to mutate `dynCtx.dateTime` fields post-construction, which fought the broken prototype chain (`cXSDateTime.prototype = new cXSAnyAtomicType` wipes `.constructor`). A single-point hook keeps every derived accessor consistent.

## 1.0.0-alpha-11 (2026-03-28)

### Fixes — Cross-instance namespace resolution & XForms-compatible value comparison

- **DynamicContext.js**: `defaultElementNamespace` default changed from `null` to `undefined` — `null` now means "explicitly no namespace", `undefined` means "no override, use compile-time value"
- **NameTest.js**: `test()` checks `!== undefined` instead of `!= null` for runtime namespace override detection, enabling correct namespace switching when `instance()` navigates to instances with `null` (no) default namespace
- **ComparisonExpr.js**: Value comparison operators (`eq`, `ne`, `lt`, `gt`, `le`, `ge`) now cast `xs:untypedAtomic` to the other operand's type (matching GeneralComp behavior) instead of always casting to `xs:string`. Fixes `Page eq 1` comparisons in schema-less XForms instances where all values are `xs:untypedAtomic`

## 1.0.0-alpha-10 (2026-03-22)

### Features — §8.1 Phase 1: Per-instance function override & runtime namespace

- **StaticContext.js**: Allow fn: namespace functions in `setFunction()` (removed NS_XPF guard); `getFunction()` now checks per-instance override before global
- **FunctionCall.js**: fn: namespace dispatch checks per-instance `staticContext.functions` before falling back to global `cStaticContext.functions`
- **DynamicContext.js**: Added `defaultElementNamespace` property for runtime namespace override
- **NameTest.js**: `test()` prefers runtime `defaultElementNamespace` over compile-time namespace when no explicit prefix was used
- **PathExpr.js**: Save/restore `defaultElementNamespace` across path expression evaluation

## 1.0.0-alpha-8 (2026-03-22)

### Bug Fixes

- **MultiplicativeExpr.js**: Add missing `require()` for `cXSDouble` — multiplication operations (`*`, `div`, `idiv`, `mod`) on untyped atomic values failed with "Can't find variable: cXSDouble"
- **UnaryExpr.js**: Add missing `require()` for `cXSDouble` — unary `+`/`-` on untyped atomic values failed with the same error

## 1.0.0-alpha-7 (2026-03-22)

### Bug Fixes

- **XSInteger.js**: Add missing `require()` for `cXSUntypedAtomic` — integer casting from untyped values failed with "Can't find variable: cXSUntypedAtomic" (upstream issue [#18](https://github.com/ilinsky/xpath2.js/issues/18))

## 1.0.0-alpha-6

- Initial fork from [ilinsky/xpath2.js](https://github.com/ilinsky/xpath2.js) as `x4ms-xpath2.js`
- Package renamed for publication to local Verdaccio registry
