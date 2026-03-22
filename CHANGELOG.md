# Changelog

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
