# Changelog

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
