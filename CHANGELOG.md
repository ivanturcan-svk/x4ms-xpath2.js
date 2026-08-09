# Changelog

## [Unreleased]

### Build and release

- Added a project-level `.npmrc` that pins the registry to
  `https://registry.npmjs.org/`. This repository was the only one in the
  platform without one, and the gap was not theoretical: a machine-level
  `~/.npmrc` on the release machine points at a local mirror, so npm commands
  run from this directory resolved against the mirror and reported success
  there. `npm dist-tag add` moved the tag on the mirror while the public
  registry was left untouched, and nothing failed or warned. Measured after
  adding the file: `npm config get registry` in this directory now answers
  `https://registry.npmjs.org/` instead of the mirror. No credentials are in
  the file, and none belong there.

## 1.0.0-beta.3 (2026-08-06)

**No code changes. `1.0.0-beta.3` and `1.0.0-beta.2` contain byte-identical
library code** — nothing under `lib/` was touched between them. If you already
run `1.0.0-beta.2`, upgrading changes nothing about how this package behaves,
and there is no functional reason to do it.

What this release exists for is the documentation npm ships inside the package
and displays on its package page: the README was corrected after
`1.0.0-beta.2` was already published, and npm renders whatever README was in
the tarball at publish time. Without a new release the package page keeps
showing the superseded text, and no further release of this package is
expected for some months.

### Documentation

- The README no longer cites a specification section by number, and now states
  plainly that this package implements XPath 2.0 as a frozen W3C
  Recommendation — as opposed to the living XForms 2.0 Community Group
  document the surrounding project tracks, whose section numbers shift.
- The changelog's own reference style is documented, and unresolvable
  references in older entries were replaced with plain descriptions — see
  "Changed — how this file references things" below.

### Release infrastructure

- **The publish workflow now publishes under the `latest` dist-tag** instead of
  deriving the tag from the version suffix. `npm publish` sets exactly one
  dist-tag, and deriving it meant every prerelease landed under `beta` while
  `latest` — the tag `npm install @xformado/xpath2` actually resolves to —
  stayed behind on an older version.
- **Removed the manually dispatched job that moved a dist-tag.** It could not
  work: the OIDC identity used for trusted publishing is scoped to publishing,
  so `npm dist-tag add` is rejected with `E401`. A workflow that always fails
  is worse than no workflow.
- **CI actions updated** to `actions/checkout@v7` and `actions/setup-node@v7`
  across all workflows; the v4 line runs on a Node version GitHub has
  deprecated for actions.

### Changed — how this file references things

- **`§` references in older entries below did not mean specification
  sections.** They referred to numbered sections of an internal planning
  document that is not published with this package, so they were not
  resolvable by anyone reading the changelog. They have been replaced with
  plain descriptions of what changed, and are no longer used.
- References to the XForms 2.0 specification now name the section rather than
  numbering it (`XForms 2.0 → Expressions → Model functions`). XForms 2.0 is a
  living Community Group document whose sections get renumbered, so a number
  fails silently — it points nowhere, or resolves to a different section while
  still looking valid.

## 1.0.0-beta.2 (2026-07-30)

Strict mode compatibility release. The library ships as CommonJS, but ESM
bundlers that inline it into an ES module output run the code in strict mode
(ES modules are always strict); three places relied on sloppy-mode-only
constructs and broke there. Sloppy-mode behavior is unchanged.

### Fixed

- **`lib/expressions/for/ForExpr.js:21`, `lib/expressions/quantified/QuantifiedExpr.js:27`**:
  the recursive binding walk used `arguments.callee`, which throws a
  `TypeError` in strict mode — `for` / `some` / `every` expressions with two
  or more bindings failed under strict-mode consumers. Replaced with a named
  function expression (semantically identical recursion).
- **`lib/functions/numeric.js:50, :57`**: `nDecimal` in both branches of
  `fn:round-half-to-even()` was assigned without a declaration (the preceding
  `var` list ended one line early) — an implicit global in sloppy mode, a
  `ReferenceError` on every `round-half-to-even()` call in strict mode. Now
  part of the `var` declaration list; the value no longer leaks into the
  global scope.

### Test infrastructure

- **`npm run test:strict`**: runs the same full suite with every `lib/`
  module recompiled under a prepended `"use strict"` directive
  (`test/strict-preload.js`), reproducing what an ESM bundler does. On the
  unfixed code this failed with 36 errors; both modes now pass identically
  (930 passing). Added to CI.
- **New specs**: multi-binding `some`/`every` (two bindings) and
  three-binding `for`/`some` cases — the recursive binding walk was
  previously only covered for `for` with two bindings.
- **ESLint**: `no-caller` (error) added to the config, plus a focused
  `npm run lint:no-caller` script enforced in CI so `arguments.callee` /
  `arguments.caller` cannot come back.

## 1.0.0-beta.1 (2026-07-28)

First release published to the public npm registry. No runtime changes since
`1.0.0-alpha-13` — this release covers packaging, CI and release
infrastructure only.

### Release infrastructure

- **Publishing**: added `.github/workflows/publish.yml` — publishes to the
  public npm registry from GitHub Actions with npm provenance
  (`npm publish --provenance --access public`), designed for npm trusted
  publishing (OIDC, `id-token: write`). Triggered by `v*` tags or manual
  dispatch. The dist-tag is derived from the version (prerelease suffix →
  e.g. `beta`, stable → `latest`) because npm requires an explicit `--tag`
  for prerelease versions.
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

  Motivated by preview-time simulated-date support in the form designer. Previously consumers had to mutate `dynCtx.dateTime` fields post-construction, which fought the broken prototype chain (`cXSDateTime.prototype = new cXSAnyAtomicType` wipes `.constructor`). A single-point hook keeps every derived accessor consistent.

## 1.0.0-alpha-11 (2026-03-28)

### Fixes — Cross-instance namespace resolution & XForms-compatible value comparison

- **DynamicContext.js**: `defaultElementNamespace` default changed from `null` to `undefined` — `null` now means "explicitly no namespace", `undefined` means "no override, use compile-time value"
- **NameTest.js**: `test()` checks `!== undefined` instead of `!= null` for runtime namespace override detection, enabling correct namespace switching when `instance()` navigates to instances with `null` (no) default namespace
- **ComparisonExpr.js**: Value comparison operators (`eq`, `ne`, `lt`, `gt`, `le`, `ge`) now cast `xs:untypedAtomic` to the other operand's type (matching GeneralComp behavior) instead of always casting to `xs:string`. Fixes `Page eq 1` comparisons in schema-less XForms instances where all values are `xs:untypedAtomic`

## 1.0.0-alpha-10 (2026-03-22)

### Features — Per-instance function override & runtime namespace

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
