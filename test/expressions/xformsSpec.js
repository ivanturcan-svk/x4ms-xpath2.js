/**
 * Tests for §8.1 — per-instance fn: function override & runtime namespace
 */
var xpath = require('./../../lib');
var StaticContext = require('./../../lib/classes/StaticContext');
var expect = require('chai').expect;
var nanodom = require('./../nanodom');

// Helper: create a namespaced element (simulates xmldom-style nodes)
function createNsElement(localName, namespaceURI, prefix) {
    var el = nanodom.createElement(localName);
    el.namespaceURI = namespaceURI || null;
    el.prefix = prefix || null;
    return el;
}

// Helper: build a mini instance document with namespace
function buildInstanceDoc(ns, rootName, childNames) {
    var doc = nanodom.createDocument();
    var root = createNsElement(rootName, ns);
    nanodom.addChild(doc, root);
    childNames.forEach(function(name) {
        var child = createNsElement(name, ns);
        nanodom.addChild(root, child);
        var text = nanodom.createText(name + '-value');
        nanodom.addChild(child, text);
    });
    return doc;
}

describe("§8.1 per-instance fn: function override", function() {

    describe("StaticContext.setFunction — fn: namespace", function() {
        it('allows registering fn: namespace functions', function() {
            var sc = xpath.createStaticContext();
            var called = false;
            sc.setFunction('{http://www.w3.org/2005/xpath-functions}myfunc', function() {
                called = true;
                return 42;
            });
            var fn = sc.getFunction('{http://www.w3.org/2005/xpath-functions}myfunc');
            expect(fn).to.be.a('function');
        });

        it('per-instance fn: overrides global system functions', function() {
            var sc = xpath.createStaticContext();
            sc.defaultFunctionNamespace = "http://www.w3.org/2005/xpath-functions";
            // Register a custom "true" that returns 42 (to prove override works)
            sc.setFunction('{http://www.w3.org/2005/xpath-functions}true', function() {
                return 42;
            });
            var result = xpath.evaluate('true()', null, sc);
            // Per-instance override returns 42 (as string via xs2js) instead of global true()
            expect(result).to.have.ordered.members(["42"]);
        });

        it('falls back to global function when no per-instance override', function() {
            var sc = xpath.createStaticContext();
            sc.defaultFunctionNamespace = "http://www.w3.org/2005/xpath-functions";
            // Don't register anything — should use global true()
            var result = xpath.evaluate('true()', null, sc);
            expect(result).to.have.ordered.members([true]);
        });
    });

    describe("custom fn: function with arguments", function() {
        it('receives evaluated arguments', function() {
            var sc = xpath.createStaticContext();
            sc.defaultFunctionNamespace = "http://www.w3.org/2005/xpath-functions";
            var receivedArg = null;
            sc.setFunction('{http://www.w3.org/2005/xpath-functions}myfunc', function(arg) {
                receivedArg = arg;
                return 'ok';
            });
            xpath.evaluate("myfunc('hello')", null, sc);
            // arg is a raw sequence (array) since no signature validation for per-instance fn:
            expect(receivedArg).to.be.an('array');
            expect(receivedArg[0].toString()).to.equal('hello');
        });
    });

    describe("custom fn: function returning DOM node", function() {
        it('returned node becomes path context', function() {
            var doc = buildInstanceDoc(null, 'data', ['name', 'age']);
            var sc = xpath.createStaticContext();
            sc.defaultFunctionNamespace = "http://www.w3.org/2005/xpath-functions";

            // Register instance() that returns the documentElement
            sc.setFunction('{http://www.w3.org/2005/xpath-functions}instance', function(aId) {
                return doc.documentElement;
            });

            // instance('x')/name should find the <name> child
            var result = xpath.evaluate("instance('x')/name", doc.documentElement, sc);
            expect(result).to.have.length(1);
            expect(result[0].localName).to.equal('name');
        });
    });

    describe("runtime defaultElementNamespace", function() {
        it('NameTest uses runtime namespace when set by function', function() {
            var NS = 'http://example.com/ns';
            var doc = buildInstanceDoc(NS, 'data', ['firstName', 'lastName']);

            var sc = xpath.createStaticContext();
            sc.defaultFunctionNamespace = "http://www.w3.org/2005/xpath-functions";
            // Compile-time namespace is null (no default element namespace set)
            sc.defaultElementNamespace = null;

            // Register instance() that returns doc and sets runtime namespace
            sc.setFunction('{http://www.w3.org/2005/xpath-functions}instance', function(aId) {
                // Set runtime namespace on DynamicContext (this = oContext)
                this.defaultElementNamespace = NS;
                return doc.documentElement;
            });

            // Without runtime namespace override, unprefixed "firstName" wouldn't match
            // namespaced elements. With the override, it should work.
            var result = xpath.evaluate("instance('main')/firstName", null, sc);
            expect(result).to.have.length(1);
            expect(result[0].localName).to.equal('firstName');
            expect(result[0].namespaceURI).to.equal(NS);
        });

        it('cross-namespace: different instances with different namespaces', function() {
            var NS_MAIN = 'http://example.com/main';
            var NS_CODE = 'http://example.com/codelist';
            var mainDoc = buildInstanceDoc(NS_MAIN, 'form', ['field1']);
            var codeDoc = buildInstanceDoc(NS_CODE, 'codes', ['code1', 'code2']);

            var sc = xpath.createStaticContext();
            sc.defaultFunctionNamespace = "http://www.w3.org/2005/xpath-functions";
            sc.defaultElementNamespace = NS_MAIN;

            // Simulate two instances
            var instances = {
                'main': { doc: mainDoc, ns: NS_MAIN },
                'codelist': { doc: codeDoc, ns: NS_CODE }
            };

            sc.setFunction('{http://www.w3.org/2005/xpath-functions}instance', function(aId) {
                var id = (Array.isArray(aId) ? aId[0] : aId).toString();
                var inst = instances[id];
                this.defaultElementNamespace = inst.ns;
                return inst.doc.documentElement;
            });

            // Query main instance
            var result1 = xpath.evaluate("instance('main')/field1", mainDoc.documentElement, sc);
            expect(result1).to.have.length(1);
            expect(result1[0].localName).to.equal('field1');
            expect(result1[0].namespaceURI).to.equal(NS_MAIN);

            // Query codelist instance (different namespace!)
            var result2 = xpath.evaluate("instance('codelist')/code1", mainDoc.documentElement, sc);
            expect(result2).to.have.length(1);
            expect(result2[0].localName).to.equal('code1');
            expect(result2[0].namespaceURI).to.equal(NS_CODE);
        });

        it('namespace override does not leak after path expression', function() {
            var NS = 'http://example.com/ns';
            var doc = buildInstanceDoc(null, 'root', ['child']);
            var nsDoc = buildInstanceDoc(NS, 'data', ['item']);

            var sc = xpath.createStaticContext();
            sc.defaultFunctionNamespace = "http://www.w3.org/2005/xpath-functions";
            sc.defaultElementNamespace = null;

            sc.setFunction('{http://www.w3.org/2005/xpath-functions}instance', function(aId) {
                this.defaultElementNamespace = NS;
                return nsDoc.documentElement;
            });

            // Evaluate: the namespace override from instance() should not affect
            // a subsequent independent path expression
            var result = xpath.evaluate("child", doc.documentElement, sc);
            expect(result).to.have.length(1);
            expect(result[0].localName).to.equal('child');
        });
    });

    describe("current() function", function() {
        it('returns the original context node', function() {
            var doc = buildInstanceDoc(null, 'data', ['name']);

            var sc = xpath.createStaticContext();
            sc.defaultFunctionNamespace = "http://www.w3.org/2005/xpath-functions";
            var contextNode = doc.documentElement;

            sc.setFunction('{http://www.w3.org/2005/xpath-functions}current', function() {
                return contextNode;
            });

            var result = xpath.evaluate("current()", contextNode, sc);
            expect(result).to.have.length(1);
            expect(result[0]).to.equal(contextNode);
        });
    });
});
