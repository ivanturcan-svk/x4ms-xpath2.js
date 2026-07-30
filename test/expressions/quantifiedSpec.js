var xpath = require('./../../lib');
var expect = require('chai').expect;

describe("quantified", function() {
    describe("every satisfies", function() {
        // Not W3C tests
        it('', function() {
            expect(xpath.evaluate('every $a in (1, 2, 3, 4, 5) satisfies $a < 3'))
                .to.have.ordered.members([false]);
        });
        it('', function() {
            expect(xpath.evaluate('every $a in (1, 2, 3, 4, 5) satisfies $a < 6'))
                .to.have.ordered.members([true]);
        });
        it('', function() {
            expect(xpath.evaluate('every $a in (1, 2, 3, 4, 5) satisfies $a > 6'))
                .to.have.ordered.members([false]);
        });
        it('', function() {
            expect(xpath.evaluate('every $a in () satisfies $a < 3'))
                .to.have.ordered.members([true]);
        });
        it('', function() {
            expect(xpath.evaluate('every $a in 1 satisfies $a < 3'))
                .to.have.ordered.members([true]);
        });
        it('', function() {
            expect(xpath.evaluate('every $a in 5 satisfies $a < 3'))
                .to.have.ordered.members([false]);
        });
        // multi-binding (recursive binding walk)
        it('', function() {
            expect(xpath.evaluate('every $a in (1, 2), $b in (3, 4) satisfies $a < $b'))
                .to.have.ordered.members([true]);
        });
        it('', function() {
            expect(xpath.evaluate('every $a in (1, 2), $b in (3, 4) satisfies $a * $b < 8'))
                .to.have.ordered.members([false]);
        });
    });

    describe("some satisfies", function() {
        // Not W3C tests
        it('', function() {
            expect(xpath.evaluate('some $a in (1, 2, 3, 4, 5) satisfies $a < 3'))
                .to.have.ordered.members([true]);
        });
        it('', function() {
            expect(xpath.evaluate('some $a in (1, 2, 3, 4, 5) satisfies $a < 6'))
                .to.have.ordered.members([true]);
        });
        it('', function() {
            expect(xpath.evaluate('some $a in (1, 2, 3, 4, 5) satisfies $a > 6'))
                .to.have.ordered.members([false]);
        });
        it('', function() {
            expect(xpath.evaluate('some $a in () satisfies $a < 3'))
                .to.have.ordered.members([false]);
        });
        it('', function() {
            expect(xpath.evaluate('some $a in 1 satisfies $a < 3'))
                .to.have.ordered.members([true]);
        });
        it('', function() {
            expect(xpath.evaluate('some $a in 5 satisfies $a < 3'))
                .to.have.ordered.members([false]);
        });
        // multi-binding (recursive binding walk)
        it('', function() {
            expect(xpath.evaluate('some $a in (1, 2), $b in (3, 4) satisfies $a + $b = 6'))
                .to.have.ordered.members([true]);
        });
        it('', function() {
            expect(xpath.evaluate('some $a in (1, 2), $b in (3, 4) satisfies $a + $b = 9'))
                .to.have.ordered.members([false]);
        });
        // 3 bindings (recursion deeper than one level)
        it('', function() {
            expect(xpath.evaluate('some $a in (1, 2), $b in (3, 4), $c in (5, 6) satisfies $a + $b + $c = 12'))
                .to.have.ordered.members([true]);
        });
    });});