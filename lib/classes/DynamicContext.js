var cDOMAdapter = require('./DOMAdapter');

var cXSDateTime = require('./../types/schema/simple/atomic/XSDateTime');
var cXSDayTimeDuration = require('./../types/schema/simple/atomic/duration/XSDayTimeDuration');
var cXSAnyAtomicType = require('./../types/schema/simple/XSAnyAtomicType');
var cXSString = require('./../types/schema/simple/atomic/XSString');
var cXSDouble = require('./../types/schema/simple/atomic/XSDouble');
var cXSDecimal = require('./../types/schema/simple/atomic/XSDecimal');
var cXSBoolean = require('./../types/schema/simple/atomic/XSBoolean');
var cXSInteger = require('./../types/schema/simple/atomic/integer/XSInteger');

var cDate = global.Date;
var cMath = global.Math;
var cNumber = global.Number;
var cObject = global.Object;
var cString = global.String;
var fIsNaN = global.isNaN;
var fIsFinite = global.isFinite;

// Date provider hook — consumers may override this to steer the "current date"
// baseline used by fn:current-date(), fn:current-dateTime(), fn:current-time()
// and fn:implicit-timezone(). Default = real `new Date()`. The xformado form engine overrides
// this at bootstrap to return a simulated date when the designer preview
// injects the simulated-date meta tag. Keeping the hook inside the
// library avoids post-construction mutation of dateTime/timezone fields and
// ensures every DynamicContext instance sees a consistent baseline.
function fDefaultDateProvider() {
	return new cDate;
}
cDynamicContext.dateProvider	= fDefaultDateProvider;

function cDynamicContext(oStaticContext, vItem, oScope, oDOMAdapter) {
	//
	this.staticContext	= oStaticContext;
	//
	this.item		= vItem;
	//
	this.scope		= oScope || {};
	this.stack		= {};
	//
	this.DOMAdapter	= oDOMAdapter || new cDOMAdapter;
	//
	var oDate	= cDynamicContext.dateProvider(),
		nOffset	= oDate.getTimezoneOffset();
	this.dateTime	= new cXSDateTime(oDate.getFullYear(), oDate.getMonth() + 1, oDate.getDate(), oDate.getHours(), oDate.getMinutes(), oDate.getSeconds() + oDate.getMilliseconds() / 1000, -nOffset);
	this.timezone	= new cXSDayTimeDuration(0, cMath.abs(~~(nOffset / 60)), cMath.abs(nOffset % 60), 0, nOffset > 0);
};

cDynamicContext.prototype.item		= null;
cDynamicContext.prototype.position	= 0;
cDynamicContext.prototype.size		= 0;
//
cDynamicContext.prototype.scope		= null;
cDynamicContext.prototype.stack		= null;	// Variables stack
//
cDynamicContext.prototype.dateTime	= null;
cDynamicContext.prototype.timezone	= null;
//
cDynamicContext.prototype.staticContext	= null;
//
cDynamicContext.prototype.defaultElementNamespace	= undefined;	// undefined = no override; null = explicitly no namespace

// Stack management
cDynamicContext.prototype.pushVariable	= function(sName, vValue) {
	if (!cObject.hasOwnProperty.call(this.stack, sName))
		this.stack[sName]	= [];
	this.stack[sName].push(this.scope[sName]);
	this.scope[sName] = vValue;
};

cDynamicContext.prototype.popVariable	= function(sName) {
	if (cObject.hasOwnProperty.call(this.stack, sName)) {
		this.scope[sName] = this.stack[sName].pop();
		if (!this.stack[sName].length) {
			delete this.stack[sName];
			if (typeof this.scope[sName] == "undefined")
				delete this.scope[sName];
		}
	}
};

// Converts non-null JavaScript object to XML Schema object
cDynamicContext.js2xs = function(vItem) {
	// Convert types from JavaScript to XPath 2.0
	var cType;
	if (typeof vItem == "boolean")
		cType = cXSBoolean;
	else
	if (typeof vItem == "number") {
		if (fIsNaN(vItem) || !fIsFinite(vItem) || /e/i.test(vItem))
			cType = cXSDouble;
		else
		if (vItem % 1)
			cType = cXSDecimal;
		else
			cType = cXSInteger;
    }
	//
	return cType ? new cType(vItem) : new cXSString(vItem.toString());
};

/*
	Numbers on the way out.

	valueOf() is a double, so every exact value computed inside the engine used
	to be rounded on the doorstep: 1 div 3 left as 0.3333333333333333 and a
	thirty-digit decimal left as 1.2345678901234568e+29. The host then had no
	way of learning what the engine had actually worked out, and everything the
	exact type buys was spent here.

	A value crosses as a plain number whenever a plain number writes it out
	unchanged — which is every result this engine could already write correctly,
	and every xs:double and xs:float by definition. typeof, Number.isFinite and
	JSON therefore see nothing new for any of them.

	Only when the double would write a different text does the value cross as a
	boxed Number carrying the exact notation in toString(). String(value) then
	gives the exact decimal, which is what a form stores in its instance and
	sends in a submission, while arithmetic, comparison and the Number methods
	keep working through valueOf().

	⚠️ The default primitive hint is still the number: `value + ""` gives the
	double's text, `String(value)` and `${value}` give the exact one. That is
	deliberate — the host must be able to keep computing, which is the reason
	this is an object and not a string.
*/
function fDynamicContext_numberOut(oItem) {
	var nValue	= oItem.valueOf();
	// Only an exact type can hold more than a double writes.
	if (!(oItem instanceof cXSDecimal) || !oItem.getParts || !oItem.getParts())
		return nValue;

	var sExact	= oItem.toString();
	if (cString(nValue) === sExact)
		return nValue;

	var oBoxed	= new cNumber(nValue);
	cObject.defineProperty(oBoxed, "toString", {
		configurable:	true,
		enumerable:		false,
		writable:		true,
		value:			function() { return sExact; }
	});
	return oBoxed;
};

// Converts non-null XML Schema object to JavaScript object
cDynamicContext.xs2js = function(vItem) {
	if (vItem instanceof cXSBoolean)
		vItem	= vItem.valueOf();
	else
	if (cXSAnyAtomicType.isNumeric(vItem))
		vItem	= fDynamicContext_numberOut(vItem);
	else
		vItem	= vItem.toString();
	//
	return vItem;
};

//
module.exports = cDynamicContext;
