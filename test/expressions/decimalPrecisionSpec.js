/**
 * Decimal precision and typed evaluation — target behaviour.
 *
 * One case per requirement item. Each case states the typing it runs under,
 * because the same expression has different correct answers under xs:decimal
 * and under xs:double, and swapping the two silently invalidates the case.
 */
var xpath = require('./../../lib');
var expect = require('chai').expect;

// The written form of the value, which is what a form stores in its instance
// and sends in a submission. fn:string() is the engine's own answer; reading
// evaluate()[0] instead would measure the JavaScript boundary, which is a
// separate concern with its own conversion.
function stringOf(sExpression) {
    return String(xpath.evaluate('fn:string(' + sExpression + ')')[0]);
}

describe("decimal precision", function() {

    // Case 1 — typed by the expression itself: a decimal literal is
    // xs:decimal, an integer literal is xs:integer. Neither side is a double,
    // so the product must be exact.
    //
    // XQuery 1.0 and XPath 2.0 Functions and Operators, section
    // "Operators on Numeric Values": op:numeric-multiply on two xs:decimal
    // operands returns an xs:decimal.
    describe("xs:decimal literal times xs:integer literal", function() {
        it('1.005 * 100 is exactly 100.5', function() {
            expect(stringOf("1.005 * 100"))
                .to.equal("100.5");
        });

        it('does not fall back to binary floating point', function() {
            expect(stringOf("1.005 * 100"))
                .to.not.equal("100.49999999999999");
        });
    });

    // XML Schema Part 2: Datatypes, section "decimal": a conforming processor
    // must support at least 18 decimal digits. An exponent-form result proves
    // the value went through a double on the way.
    describe("decimal range", function() {
        it('keeps 31 significant digits without falling into exponent form', function() {
            expect(stringOf('xs:decimal("123456789012345678901234567890.5")'))
                .to.equal("123456789012345678901234567890.5");
        });

        it('still adds exactly at that width', function() {
            expect(stringOf('xs:decimal("123456789012345678901234567890.5") + 1'))
                .to.equal("123456789012345678901234567891.5");
        });

        it('keeps an integer too large for a double exact', function() {
            expect(stringOf('xs:integer("123456789012345678901")'))
                .to.equal("123456789012345678901");
        });
    });

    // Decided 2026-08-13 and declared in EXTENSIONS.md. The specification
    // leaves the digit count to the implementation — Functions and Operators,
    // section "Operators on Numeric Values" — but not the notation.
    describe("canonical notation", function() {
        it('drops trailing zeros rather than keeping the written scale', function() {
            expect(stringOf("0.10 + 0.20")).to.equal("0.3");
        });

        it('does not grow a fraction on a whole number', function() {
            expect(stringOf("1.0")).to.equal("1");
            expect(stringOf("2")).to.equal("2");
        });

        it('carries a division that does not come out even to 20 places', function() {
            expect(stringOf("100 div 3")).to.equal("33.33333333333333333333");
        });

        it('rounds the last place half away from zero', function() {
            expect(stringOf("2 div 3")).to.equal("0.66666666666666666667");
        });
    });

    // Functions and Operators, section "Casting to numeric types": casting to
    // xs:integer truncates towards zero. This path raised a ReferenceError
    // before the type was rewritten, because three identifiers it used were
    // never brought into the file.
    describe("cast to xs:integer from a double", function() {
        it('truncates instead of failing', function() {
            expect(stringOf("xs:integer(xs:double(3.7))")).to.equal("3");
        });

        it('truncates towards zero for negatives', function() {
            expect(stringOf("xs:integer(xs:double(-3.7))")).to.equal("-3");
        });
    });
});
