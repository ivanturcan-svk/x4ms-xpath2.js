var cStaticContext = require('./../classes/StaticContext');

var cXSDecimal = require('./../types/schema/simple/atomic/XSDecimal');
var cXSDouble = require('./../types/schema/simple/atomic/XSDouble');
var cXSFloat = require('./../types/schema/simple/atomic/XSFloat');
var cXSInteger = require('./../types/schema/simple/atomic/integer/XSInteger');
var cXSAnyAtomicType = require('./../types/schema/simple/XSAnyAtomicType');

var cMath = global.Math;
var cBigInt = global.BigInt;

/*
	6.4 Functions on Numeric Values
		abs
		ceiling
		floor
		round
		round-half-to-even
*/

var exports = {};

// An untyped value has no type to preserve, and XPath 2.0, section "Arithmetic
// Expressions" casts it to xs:double. A value that already carries a numeric
// type keeps it.
function fToNumeric(oValue) {
	if (oValue == null || cXSAnyAtomicType.isNumeric(oValue))
		return oValue;
	return cXSDouble.cast(oValue);
};

/*
	fn:abs, fn:ceiling, fn:floor and fn:round return the type they were given —
	Functions and Operators, section "Functions on Numeric Values". They used to
	compute through Math.* on a raw double and wrap the result in an xs:decimal
	whatever went in, so an xs:double argument came back as an xs:decimal and an
	exact decimal was rounded as a binary approximation of itself.

	The rounding rule each one applies was already right; it was the value
	reaching the rule that was wrong.
*/

// Rounds an exact decimal to an integer under the given rule, without going
// through a double. Whole values are returned untouched.
function fRoundExact(oParts, sMode) {
	if (!oParts.scale)
		return oParts.digits;
	var vScale		= cXSDecimal.pow10(oParts.scale),
		vQuotient	= oParts.digits / vScale,
		vRemainder	= oParts.digits % vScale,
		vZero		= cBigInt(0),
		vOne		= cBigInt(1);
	if (vRemainder == vZero)
		return vQuotient;
	if (sMode == "floor")
		return oParts.digits < vZero ? vQuotient - vOne : vQuotient;
	if (sMode == "ceiling")
		return oParts.digits > vZero ? vQuotient + vOne : vQuotient;
	// fn:round: nearest, and a value exactly half way goes towards +INF.
	var vTwice	= vRemainder * cBigInt(2);
	if (oParts.digits < vZero) {
		if (-vTwice > vScale)
			vQuotient	-= vOne;
	}
	else
	if (vTwice >= vScale)
		vQuotient	+= vOne;
	return vQuotient;
};

function fRound(oArgument, sMode) {
	var oValue	= fToNumeric(oArgument);
	if (oValue == null)
		return null;
	if (oValue instanceof cXSFloat)
		return new cXSFloat(fRoundDouble(oValue.valueOf(), sMode));
	if (oValue instanceof cXSDouble)
		return new cXSDouble(fRoundDouble(oValue.valueOf(), sMode));
	var oParts	= oValue.getParts ? oValue.getParts() : null;
	if (!oParts)
		return new cXSDecimal(fRoundDouble(oValue.valueOf(), sMode));
	var vDigits	= fRoundExact(oParts, sMode);
	return oValue instanceof cXSInteger ? cXSInteger.fromParts(vDigits, 0) : cXSDecimal.fromParts(vDigits, 0);
};

function fRoundDouble(nValue, sMode) {
	return sMode == "floor" ? cMath.floor(nValue) : sMode == "ceiling" ? cMath.ceil(nValue) : cMath.round(nValue);
};

// 6.4 Functions on Numeric Values
// fn:abs($arg as numeric?) as numeric?
exports.abs = function(oArgument) {
	var oValue	= fToNumeric(oArgument);
	if (oValue == null)
		return null;
	if (oValue instanceof cXSFloat)
		return new cXSFloat(cMath.abs(oValue.valueOf()));
	if (oValue instanceof cXSDouble)
		return new cXSDouble(cMath.abs(oValue.valueOf()));
	var oParts	= oValue.getParts ? oValue.getParts() : null;
	if (!oParts)
		return new cXSDecimal(cMath.abs(oValue.valueOf()));
	var vDigits	= oParts.digits < cBigInt(0) ?-oParts.digits : oParts.digits;
	return oValue instanceof cXSInteger ? cXSInteger.fromParts(vDigits, oParts.scale) : cXSDecimal.fromParts(vDigits, oParts.scale);
};

// fn:ceiling($arg as numeric?) as numeric?
exports.ceiling = function(oArgument) {
	return fRound(oArgument, "ceiling");
};

// fn:floor($arg as numeric?) as numeric?
exports.floor = function(oArgument) {
	return fRound(oArgument, "floor");
};

// fn:round($arg as numeric?) as numeric?
exports.round = function(oArgument) {
	return fRound(oArgument, "round");
};

// fn:round-half-to-even($arg as numeric?) as numeric?
// fn:round-half-to-even($arg as numeric?, $precision as xs:integer) as numeric?
exports.roundHalfToEven = function(oArgument, oPrecision) {
	var oValue		= fToNumeric(oArgument),
		nPrecision	= arguments.length > 1 ? oPrecision.valueOf() : 0;

	//
	if (nPrecision < 0) {
		var oPower	= new cXSInteger(cMath.pow(10,-nPrecision)),
			nRounded= cMath.round(cStaticContext.operators["numeric-divide"].call(this, oValue, oPower)),
			oRounded= new cXSInteger(nRounded),
			nDecimal= cMath.abs(cStaticContext.operators["numeric-subtract"].call(this, oRounded, cStaticContext.operators["numeric-divide"].call(this, oValue, oPower)));
		return cStaticContext.operators["numeric-multiply"].call(this, cStaticContext.operators["numeric-add"].call(this, oRounded, new cXSDecimal(nDecimal == 0.5 && nRounded % 2 ?-1 : 0)), oPower);
	}
	else {
		var oPower	= new cXSInteger(cMath.pow(10, nPrecision)),
			nRounded= cMath.round(cStaticContext.operators["numeric-multiply"].call(this, oValue, oPower)),
			oRounded= new cXSInteger(nRounded),
			nDecimal= cMath.abs(cStaticContext.operators["numeric-subtract"].call(this, oRounded, cStaticContext.operators["numeric-multiply"].call(this, oValue, oPower)));
		return cStaticContext.operators["numeric-divide"].call(this, cStaticContext.operators["numeric-add"].call(this, oRounded, new cXSDecimal(nDecimal == 0.5 && nRounded % 2 ?-1 : 0)), oPower);
	}
};

module.exports = exports;
