var cXSBoolean = require('./../types/schema/simple/atomic/XSBoolean');
var cXSDecimal = require('./../types/schema/simple/atomic/XSDecimal');
var cXSDouble = require('./../types/schema/simple/atomic/XSDouble');
var cXSFloat = require('./../types/schema/simple/atomic/XSFloat');
var cXSInteger = require('./../types/schema/simple/atomic/integer/XSInteger');

var cMath = global.Math;
var cBigInt = global.BigInt;

/*
	6.2 Operators on Numeric Values
		op:numeric-add
		op:numeric-subtract
		op:numeric-multiply
		op:numeric-divide
		op:numeric-integer-divide
		op:numeric-mod
		op:numeric-unary-plus
		op:numeric-unary-minus

	6.3 Comparison Operators on Numeric Values
		op:numeric-equal
		op:numeric-less-than
		op:numeric-greater-than
*/

var exports = {};

/*
	Two paths run side by side here.

	When both operands carry an exact decimal value — an xs:decimal or an
	xs:integer, whether written as a literal or cast — the operation is carried
	out on the scaled integers and no double is involved. 1.005 * 100 is then
	exactly 100.5 rather than 100.49999999999999.

	When either operand is an xs:double or xs:float, both are converted to that
	type and the operation is plain IEEE-754 — which is what those types mean.
	xs:double("0.1") + xs:double("0.2") is therefore 0.30000000000000004 and
	not 0.3: the engine used to scale both operands by a power of ten, operate,
	and scale back, which hid the binary rounding a double is defined to have.
	It also introduced error where there was none — 129.14 * 1.2 is exactly
	154.968 in IEEE-754, and the scaling is what turned it into
	154.96799999999996.

	Result types follow XQuery 1.0 and XPath 2.0 Functions and Operators,
	section "Operators on Numeric Values": xs:double wins over xs:float, which
	wins over xs:decimal; two xs:integer operands give an xs:integer, except
	under div, which gives an xs:decimal.
*/

var vBigZero	= cBigInt(0);
var vBigTwo		= cBigInt(2);

// Number of fraction digits kept when a division does not come out even.
// Functions and Operators, section "Operators on Numeric Values" leaves the
// count to the implementation; 20 was chosen on 2026-08-13 and is declared in
// EXTENSIONS.md.
var nDivisionScale	= 20;

function fExact(oValue) {
	return oValue instanceof cXSDecimal && oValue.getParts ? oValue.getParts() : null;
}

function fAlign(oLeft, oRight) {
	var nScale	= cMath.max(oLeft.scale, oRight.scale);
	return {
		left:	oLeft.digits * cXSDecimal.pow10(nScale - oLeft.scale),
		right:	oRight.digits * cXSDecimal.pow10(nScale - oRight.scale),
		scale:	nScale
	};
}

// Half away from zero, so that a division landing exactly between two
// representable results rounds outwards rather than towards whichever side
// binary truncation happens to favour.
function fDivideRounded(vNumerator, vDenominator) {
	var bNegative	=(vNumerator < vBigZero) !== (vDenominator < vBigZero),
		vLeft		= vNumerator < vBigZero ?-vNumerator : vNumerator,
		vRight		= vDenominator < vBigZero ?-vDenominator : vDenominator,
		vQuotient	= vLeft / vRight;
	if ((vLeft % vRight) * vBigTwo >= vRight)
		vQuotient	+= cBigInt(1);
	return bNegative ?-vQuotient : vQuotient;
}

// Type promotion — Functions and Operators, section "Operators on Numeric
// Values". Returns the constructor the result must take, or null when both
// operands are exact and the exact path applies.
function fPromotedType(oLeft, oRight) {
	if (oLeft instanceof cXSDouble || oRight instanceof cXSDouble)
		return cXSDouble;
	if (oLeft instanceof cXSFloat || oRight instanceof cXSFloat)
		return cXSFloat;
	return null;
}

// 6.2 Operators on Numeric Values
// op:numeric-add($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericAdd = function(oLeft, oRight) {
	var cType	= fPromotedType(oLeft, oRight);
	if (cType)
		return new cType(oLeft.valueOf() + oRight.valueOf());
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther) {
		var oAligned	= fAlign(oExact, oOther);
		return fExactResult(oLeft, oRight, oAligned.left + oAligned.right, oAligned.scale);
	}
	return new cXSDouble(oLeft.valueOf() + oRight.valueOf());
};

// op:numeric-subtract($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericSubtract = function(oLeft, oRight) {
	var cType	= fPromotedType(oLeft, oRight);
	if (cType)
		return new cType(oLeft.valueOf() - oRight.valueOf());
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther) {
		var oAligned	= fAlign(oExact, oOther);
		return fExactResult(oLeft, oRight, oAligned.left - oAligned.right, oAligned.scale);
	}
	return new cXSDouble(oLeft.valueOf() - oRight.valueOf());
};

// op:numeric-multiply($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericMultiply = function(oLeft, oRight) {
	var cType	= fPromotedType(oLeft, oRight);
	if (cType)
		return new cType(oLeft.valueOf() * oRight.valueOf());
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther)
		return fExactResult(oLeft, oRight, oExact.digits * oOther.digits, oExact.scale + oOther.scale);
	return new cXSDouble(oLeft.valueOf() * oRight.valueOf());
};

// op:numeric-divide($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericDivide = function(oLeft, oRight) {
	var cType	= fPromotedType(oLeft, oRight);
	if (cType)
		return new cType(oLeft.valueOf() / oRight.valueOf());
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther && oOther.digits != vBigZero) {
		// (dl / 10^sl) / (dr / 10^sr) carried to nDivisionScale fraction digits
		var vNumerator	= oExact.digits * cXSDecimal.pow10(oOther.scale + nDivisionScale),
			vDenominator= oOther.digits * cXSDecimal.pow10(oExact.scale);
		// Dividing two xs:integer values yields an xs:decimal, not an integer.
		return cXSDecimal.fromParts(fDivideRounded(vNumerator, vDenominator), nDivisionScale);
	}
	return new cXSDouble(oLeft.valueOf() / oRight.valueOf());
};

// op:numeric-integer-divide($arg1 as numeric, $arg2 as numeric) as xs:integer
exports.numericIntegerDivide = function(oLeft, oRight) {
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther && oOther.digits != vBigZero) {
		var oAligned	= fAlign(oExact, oOther);
		// BigInt division truncates towards zero, which is what idiv asks for.
		return cXSInteger.fromParts(oAligned.left / oAligned.right, 0);
	}
	var nValue = oLeft.valueOf() / oRight.valueOf();
	return new cXSInteger(cMath.floor(nValue) + (nValue < 0));
};

// op:numeric-mod($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericMod = function(oLeft, oRight) {
	var cType	= fPromotedType(oLeft, oRight);
	if (cType)
		return new cType(oLeft.valueOf() % oRight.valueOf());
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther && oOther.digits != vBigZero) {
		var oAligned	= fAlign(oExact, oOther);
		// Remainder takes the sign of the dividend, as BigInt % already does.
		return fExactResult(oLeft, oRight, oAligned.left % oAligned.right, oAligned.scale);
	}
	return new cXSDouble(oLeft.valueOf() % oRight.valueOf());
};

// op:numeric-unary-plus($arg as numeric) as numeric
exports.numericUnaryPlus = function(oRight) {
	return oRight;
};

// op:numeric-unary-minus($arg as numeric) as numeric
exports.numericUnaryMinus = function(oRight) {
	oRight.value	*=-1;
	return oRight;
};


// 6.3 Comparison Operators on Numeric Values
// op:numeric-equal($arg1 as numeric, $arg2 as numeric) as xs:boolean
exports.numericEqual = function(oLeft, oRight) {
	return new cXSBoolean(oLeft.valueOf() == oRight.valueOf());
};

// op:numeric-less-than($arg1 as numeric, $arg2 as numeric) as xs:boolean
exports.numericLessThan = function(oLeft, oRight) {
	return new cXSBoolean(oLeft.valueOf() < oRight.valueOf());
};

// op:numeric-greater-than($arg1 as numeric, $arg2 as numeric) as xs:boolean
exports.numericGreaterThan = function(oLeft, oRight) {
	return new cXSBoolean(oLeft.valueOf() > oRight.valueOf());
};

// Both operands exact. Two xs:integer operands give an xs:integer; anything
// else gives an xs:decimal. Functions and Operators, section "Operators on
// Numeric Values".
function fExactResult(oLeft, oRight, vDigits, nScale) {
	var oParts	= cXSDecimal.normalize(vDigits, nScale);
	return oLeft instanceof cXSInteger && oRight instanceof cXSInteger && !oParts.scale
			? cXSInteger.fromParts(oParts.digits, oParts.scale)
			: cXSDecimal.fromParts(oParts.digits, oParts.scale);
};

module.exports = exports;