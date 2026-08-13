/**
 * The boundary between the engine and its host.
 *
 * evaluate() converts every XML Schema value to a JavaScript one on the way
 * out. For numbers that conversion was valueOf(), which is a double — so an
 * exact decimal computed inside the engine was rounded on the doorstep and the
 * host had no way of knowing it. Everything the phases before this one bought
 * was spent here.
 *
 * The rule this file fixes: a value crosses as a plain number whenever a plain
 * number writes it out unchanged, and only otherwise as an object whose
 * toString() gives the exact decimal notation.
 */
var xpath = require('./../../lib');
var expect = require('chai').expect;

function firstOf(sExpression) {
    return xpath.evaluate(sExpression)[0];
}

describe("values crossing out of the engine", function() {

    // These are every result the engine could already write correctly. They
    // must stay plain numbers: a host that reads typeof, calls Number.isFinite
    // or hands the value to JSON has no reason to see anything new here, and
    // this is the assertion that holds the change to the cases that need it.
    describe("a value a double writes out unchanged stays a plain number", function() {
        [
            ["1 + 1", 2],
            ["1.005 * 100", 100.5],
            ['xs:double("0.1") + xs:double("0.2")', 0.30000000000000004],
            ["0.1 + 0.2", 0.3],
            ["129.14 * 1.2", 154.968],
            ["10 div 4", 2.5],
            ["-0.5", -0.5],
            ["1 div 0e0", Infinity]
        ].forEach(function(entry) {
            it(entry[0] + ' is the number ' + entry[1], function() {
                expect(typeof firstOf(entry[0])).to.equal("number");
                expect(firstOf(entry[0])).to.equal(entry[1]);
            });
        });
    });

    // A division carried to twenty places and a decimal wider than a double
    // are the two shapes a double cannot write. They cross as an object, and
    // String() of that object is what a form stores in its instance and sends
    // in a submission.
    describe("a value a double cannot write keeps its exact notation", function() {
        it('1 div 3 writes all twenty places', function() {
            expect(String(firstOf("1 div 3"))).to.equal("0.33333333333333333333");
        });

        it('a decimal wider than a double does not fall into exponent form', function() {
            expect(String(firstOf('xs:decimal("123456789012345678901234567890.5")')))
                .to.equal("123456789012345678901234567890.5");
        });

        it('nor does an integer wider than a double', function() {
            expect(String(firstOf('xs:integer("123456789012345678901")')))
                .to.equal("123456789012345678901");
        });

        it('and the sum of a money column keeps its cents', function() {
            expect(String(firstOf('xs:decimal("0.1") + xs:decimal("0.20000000000000000001")')))
                .to.equal("0.30000000000000000001");
        });
    });

    // The host must still be able to compute with it — that is the whole
    // reason this is an object and not a string.
    describe("and it still behaves as a number", function() {
        var vValue;
        beforeEach(function() { vValue = firstOf("1 div 3"); });

        it('takes part in arithmetic', function() {
            expect(vValue * 3).to.equal(1);
            expect(vValue + 0).to.be.closeTo(0.3333333333333333, 1e-15);
        });

        it('compares as a number', function() {
            expect(vValue > 0.3).to.equal(true);
            expect(vValue < 0.34).to.equal(true);
        });

        it('answers valueOf with a double', function() {
            expect(typeof vValue.valueOf()).to.equal("number");
        });

        it('and still has the Number methods a host may call', function() {
            expect(vValue.toFixed(2)).to.equal("0.33");
        });
    });

    // Nothing else about the boundary moves.
    describe("the other types cross as before", function() {
        it('a boolean is a boolean', function() {
            expect(firstOf("1 = 1")).to.equal(true);
        });

        it('a string is a string', function() {
            expect(firstOf('fn:concat("a", "b")')).to.equal("ab");
        });

        it('a date crosses as its written form', function() {
            expect(firstOf('fn:string(xs:date("2026-07-15"))')).to.equal("2026-07-15");
        });
    });
});
