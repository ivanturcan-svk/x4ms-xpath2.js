var cXSBoolean = require('./../types/schema/simple/atomic/XSBoolean');
var cXSDecimal = require('./../types/schema/simple/atomic/XSDecimal');
var cXSInteger = require('./../types/schema/simple/atomic/integer/XSInteger');

var cMath = global.Math;
var fIsNaN = global.isNaN;
var fIsFinite = global.isFinite;
var cString = global.String;
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

	When either operand is an xs:double or xs:float the old path still runs,
	scaling mitigation and all. That path is wrong in the other direction — it
	hides the binary rounding a double is defined to have — and is removed
	separately, together with the type promotion rules.
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

// 6.2 Operators on Numeric Values
// op:numeric-add($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericAdd = function(oLeft, oRight) {
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther) {
		var oAligned	= fAlign(oExact, oOther);
		return fOperator_numeric_getExactResultOfType(oLeft, oRight, oAligned.left + oAligned.right, oAligned.scale);
	}
	var nLeft	= oLeft.valueOf(),
		nRight	= oRight.valueOf(),
		nPower	= cMath.pow(10, fOperator_numeric_getPower(nLeft, nRight));
	return fOperator_numeric_getResultOfType(oLeft, oRight, ((nLeft * nPower) + (nRight * nPower))/nPower);
};

// op:numeric-subtract($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericSubtract = function(oLeft, oRight) {
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther) {
		var oAligned	= fAlign(oExact, oOther);
		return fOperator_numeric_getExactResultOfType(oLeft, oRight, oAligned.left - oAligned.right, oAligned.scale);
	}
	var nLeft	= oLeft.valueOf(),
		nRight	= oRight.valueOf(),
		nPower	= cMath.pow(10, fOperator_numeric_getPower(nLeft, nRight));
	return fOperator_numeric_getResultOfType(oLeft, oRight, ((nLeft * nPower) - (nRight * nPower))/nPower);
};

// op:numeric-multiply($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericMultiply = function(oLeft, oRight) {
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther)
		return fOperator_numeric_getExactResultOfType(oLeft, oRight, oExact.digits * oOther.digits, oExact.scale + oOther.scale);
	var nLeft	= oLeft.valueOf(),
		nRight	= oRight.valueOf(),
		nPower	= cMath.pow(10, fOperator_numeric_getPower(nLeft, nRight));
	return fOperator_numeric_getResultOfType(oLeft, oRight, ((nLeft * nPower) * (nRight * nPower))/(nPower * nPower));
};

// op:numeric-divide($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericDivide = function(oLeft, oRight) {
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther && oOther.digits != vBigZero) {
		// (dl / 10^sl) / (dr / 10^sr) carried to nDivisionScale fraction digits
		var vNumerator	= oExact.digits * cXSDecimal.pow10(oOther.scale + nDivisionScale),
			vDenominator= oOther.digits * cXSDecimal.pow10(oExact.scale);
		return fOperator_numeric_getExactResultOfType(oLeft, oRight, fDivideRounded(vNumerator, vDenominator), nDivisionScale);
	}
	var nLeft	= oLeft.valueOf(),
		nRight	= oRight.valueOf(),
		nPower	= cMath.pow(10, fOperator_numeric_getPower(nLeft, nRight));
	return fOperator_numeric_getResultOfType(oLeft, oRight, (nLeft * nPower) / (nRight * nPower));
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
	var oValue = oLeft / oRight;
	return new cXSInteger(cMath.floor(oValue) + (oValue < 0));
};

// op:numeric-mod($arg1 as numeric, $arg2 as numeric) as numeric
exports.numericMod = function(oLeft, oRight) {
	var oExact	= fExact(oLeft),
		oOther	= fExact(oRight);
	if (oExact && oOther && oOther.digits != vBigZero) {
		var oAligned	= fAlign(oExact, oOther);
		// Remainder takes the sign of the dividend, as BigInt % already does.
		return fOperator_numeric_getExactResultOfType(oLeft, oRight, oAligned.left % oAligned.right, oAligned.scale);
	}
	var nLeft	= oLeft.valueOf(),
		nRight	= oRight.valueOf(),
		nPower	= cMath.pow(10, fOperator_numeric_getPower(nLeft, nRight));
	return fOperator_numeric_getResultOfType(oLeft, oRight, ((nLeft * nPower) % (nRight * nPower)) / nPower);
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

var fOperator_numeric_literal	= /^[+-]?(?:(?:(\d+)(?:\.(\d*))?)|(?:\.(\d+)))(?:[eE]([+-])?(\d+))?$/;
function fOperator_numeric_getPower(oLeft, oRight) {
	// FIXME: remove 	if (fIsNaN(oLeft) || (cMath.abs(oLeft) == nInfinity) || fIsNaN(oRight) || (cMath.abs(oRight) == nInfinity))
	// FIXME: implement if (!fIsRealNumber(oLeft) || !fIsRealNumber(oRight))
	if (fIsNaN(oLeft) || !fIsFinite(cMath.abs(oLeft)) || fIsNaN(oRight) || !fIsFinite(cMath.abs(oRight)))
		return 0;
	var aLeft	= cString(oLeft).match(fOperator_numeric_literal),
		aRight	= cString(oRight).match(fOperator_numeric_literal),
		nPower	= cMath.max(1, (aLeft[2] || aLeft[3] || '').length + (aLeft[5] || 0) * (aLeft[4] == '+' ?-1 : 1), (aRight[2] || aRight[3] || '').length + (aRight[5] || 0) * (aRight[4] == '+' ?-1 : 1));
	return nPower + (nPower % 2 ? 0 : 1);
};

function fOperator_numeric_getResultOfType(oLeft, oRight, nResult) {
	return new (oLeft instanceof cXSInteger && oRight instanceof cXSInteger && nResult % 1 ? cXSInteger : cXSDecimal)(nResult);
};

// Same choice of result class as the line above, decided from the exact result
// instead of from a double: a non-zero scale after normalization is what
// "nResult % 1" tests for.
function fOperator_numeric_getExactResultOfType(oLeft, oRight, vDigits, nScale) {
	var oParts	= cXSDecimal.normalize(vDigits, nScale);
	return oLeft instanceof cXSInteger && oRight instanceof cXSInteger && oParts.scale
			? cXSInteger.fromParts(oParts.digits, oParts.scale)
			: cXSDecimal.fromParts(oParts.digits, oParts.scale);
};

module.exports = exports;