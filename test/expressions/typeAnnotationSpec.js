/**
 * Type annotation on nodes — cases 6 and 7 of the target behaviour.
 *
 * The engine learns nothing about XForms here. It asks the DOM adapter one
 * question — "what type does this node carry" — and the host answers. Without
 * a host that answers, every node stays xs:untypedAtomic, which is what the
 * engine did unconditionally before.
 *
 * XForms 2.0, chapter "Expressions", section "Typed Values" is what requires
 * this: a bind's type MIP makes the bound node's value carry that type when an
 * expression reads it.
 */
var xpath = require('./../../lib');
var expect = require('chai').expect;
var nanodom = require('./../nanodom');

var NS_XSD = 'http://www.w3.org/2001/XMLSchema';

// A document of same-named leaves under one root, which is the shape a repeat
// over a form field has.
function leaves(sName, aValues) {
    var doc = nanodom.createDocument();
    var root = nanodom.createElement('data');
    nanodom.addChild(doc, root);
    aValues.forEach(function(sValue) {
        var el = nanodom.createElement(sName);
        nanodom.addChild(root, el);
        nanodom.addChild(el, nanodom.createText(sValue));
        el.textContent = sValue;
    });
    return root;
}

// Stands in for what the host will answer from its register of binds. The
// engine takes an expanded QName — the same key the static context's data type
// registry uses — or null for "no type", which is the default.
function adapterTyping(hTypes) {
    var oAdapter = new xpath.DOMAdapter();
    oAdapter.getTypeAnnotation = function(oNode) {
        var sName = oNode.localName || oNode.nodeName;
        return Object.hasOwnProperty.call(hTypes, sName) ? '{' + NS_XSD + '}' + hTypes[sName] : null;
    };
    return oAdapter;
}

function stringOf(sExpression, oContext, oAdapter) {
    return String(xpath.evaluate('fn:string(' + sExpression + ')', oContext, null, null, oAdapter)[0]);
}

function answerOf(sExpression, oContext, oAdapter) {
    return xpath.evaluate(sExpression, oContext, null, null, oAdapter)[0];
}

describe("type annotation from the host", function() {

    // Case 6 — the textbook money case. Under the default typing both values
    // are untyped, fn:sum casts them to xs:double, and 2.01 + 0.01 is
    // 2.0199999999999996 in IEEE-754. That is not a defect of this engine, it
    // is what xs:double means; the answer only changes when the node carries
    // an exact type.
    describe("fn:sum over two money fields", function() {
        var oData = leaves('n', ['2.01', '0.01']);

        it('stays binary while the fields have no type', function() {
            expect(stringOf("fn:sum(n)", oData)).to.equal("2.0199999999999996");
        });

        it('is exactly 2.02 once the bind says decimal', function() {
            expect(stringOf("fn:sum(n)", oData, adapterTyping({n: 'decimal'})))
                .to.equal("2.02");
        });

        it('and the value itself is a decimal, not a double', function() {
            expect(answerOf("fn:data(n[1]) instance of xs:decimal", oData, adapterTyping({n: 'decimal'})))
                .to.equal(true);
            expect(answerOf("fn:data(n[1]) instance of xs:untypedAtomic", oData))
                .to.equal(true);
        });
    });

    // Case 7 — the example the specification gives for section "Typed Values".
    // As text, "00:00:00" and "24:00:00" are two different strings. As
    // xs:time they are the same instant, which is the whole point of the
    // example.
    describe("the example from the specification: two times", function() {
        var oData = leaves('t', ['00:00:00', '24:00:00']);

        it('compares as text while the fields have no type', function() {
            expect(answerOf("t[1] = t[2]", oData)).to.equal(false);
        });

        it('compares as time once the bind says time', function() {
            expect(answerOf("t[1] = t[2]", oData, adapterTyping({t: 'time'})))
                .to.equal(true);
        });
    });

    // XForms 2.0, section "Typed Values" speaks about types in general and its
    // own example is a time, so mapping only the numeric types would leave the
    // example out. The whole set goes through one registry lookup.
    describe("the whole type set, not only numbers", function() {
        // "1" is a lexical xs:boolean and its value written back out is
        // "true", so the round trip shows whether the cast happened. The
        // effective boolean value of a node is true either way — XPath 2.0,
        // section "Effective Boolean Value" — so `b[1] and b[2]` would prove
        // nothing here and is deliberately not the assertion.
        it('takes a boolean', function() {
            var oData = leaves('b', ['1']);
            expect(answerOf("fn:data(b[1]) instance of xs:boolean", oData,
                    adapterTyping({b: 'boolean'}))).to.equal(true);
            expect(stringOf("fn:data(b[1])", oData, adapterTyping({b: 'boolean'})))
                .to.equal("true");
            expect(stringOf("fn:data(b[1])", oData)).to.equal("1");
        });

        // Two spellings of the same day. As text they differ, so this only
        // answers true if the values really went through xs:date — a date
        // written the ordinary way sorts the same as text and would prove
        // nothing.
        it('takes a date and reads it as a date', function() {
            expect(answerOf("d[1] = d[2]", leaves('d', ['2026-09-01Z', '2026-09-01+00:00']),
                    adapterTyping({d: 'date'}))).to.equal(true);
            expect(answerOf("d[1] = d[2]", leaves('d', ['2026-09-01Z', '2026-09-01+00:00'])))
                .to.equal(false);
        });

        it('takes an integer subtype', function() {
            expect(answerOf("fn:data(i[1]) instance of xs:integer", leaves('i', ['42']),
                    adapterTyping({i: 'integer'}))).to.equal(true);
        });

        it('takes a duration', function() {
            expect(stringOf("p[1] + p[2]", leaves('p', ['PT1H', 'PT30M']),
                    adapterTyping({p: 'dayTimeDuration'}))).to.equal("PT1H30M");
        });
    });

    // Every type the XForms type MIP can name, taken through one node each.
    // Twelve of these came back untyped before this phase: their cast() named
    // cXSUntypedAtomic — and five of them cXSDate, two of them each other —
    // without ever bringing the identifier into the file, so the cast raised
    // a ReferenceError that the soft-failure path then swallowed. Same defect
    // class as the xs:integer() one; the whole class is closed here, not the
    // one node that showed it.
    describe("every type in the set atomizes, none is silently skipped", function() {
        [
            ['anyURI', 'http://example.org/a'],
            ['base64Binary', 'YWJj'],
            ['hexBinary', '0FB7'],
            ['duration', 'P1Y2M3DT4H'],
            ['dayTimeDuration', 'P1DT2H'],
            ['yearMonthDuration', 'P1Y2M'],
            ['gDay', '---15'],
            ['gMonth', '--07'],
            ['gMonthDay', '--07-15'],
            ['gYear', '2026'],
            ['gYearMonth', '2026-07'],
            ['QName', 'name'],
            ['string', 'abc'],
            ['decimal', '1.5'],
            ['integer', '42'],
            ['boolean', 'true'],
            ['date', '2026-07-15'],
            ['time', '12:30:00'],
            ['dateTime', '2026-07-15T12:30:00'],
            ['double', '1.5'],
            ['float', '1.5']
        ].forEach(function(entry) {
            var sType = entry[0], sValue = entry[1];
            it('carries xs:' + sType, function() {
                var oData = leaves('v', [sValue]);
                var oAdapter = adapterTyping({v: sType});
                expect(answerOf("fn:data(v[1]) instance of xs:" + sType, oData, oAdapter))
                    .to.equal(true);
                expect(answerOf("fn:data(v[1]) instance of xs:untypedAtomic", oData, oAdapter))
                    .to.equal(false);
            });
        });
    });

    // XForms 2.0, section "Validity": a value that does not match the declared
    // type may still be stored in the node. Annotation must therefore never be
    // forced with an exception, or a half-filled form would stop evaluating.
    describe("a value that does not match the declared type", function() {
        var oData = leaves('n', ['abc']);
        var oAdapter = adapterTyping({n: 'decimal'});

        it('does not raise', function() {
            expect(function() { stringOf("n[1]", oData, oAdapter); }).to.not.throw();
        });

        it('leaves the node untyped and readable', function() {
            expect(stringOf("n[1]", oData, oAdapter)).to.equal("abc");
            expect(answerOf("fn:data(n[1]) instance of xs:untypedAtomic", oData, oAdapter))
                .to.equal(true);
        });

        it('and a type name the engine does not know is ignored too', function() {
            expect(answerOf("fn:data(n[1]) instance of xs:untypedAtomic",
                    leaves('n', ['1']), adapterTyping({n: 'notAType'}))).to.equal(true);
        });
    });

    // The default implementation answers null, so an embedder that knows
    // nothing about types keeps the behaviour it had.
    describe("the default adapter", function() {
        it('carries no type annotation', function() {
            expect(xpath.defaultDOMAdapter.getTypeAnnotation(leaves('n', ['1'])))
                .to.equal(null);
        });

        it('so untyped stays untyped', function() {
            expect(answerOf("fn:data(n[1]) instance of xs:untypedAtomic", leaves('n', ['1'])))
                .to.equal(true);
        });
    });
});
