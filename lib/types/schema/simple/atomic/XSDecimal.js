var cException = require('./../../../../classes/Exception');

var cXSConstants = require('./../../XSConstants');

var cXSUntypedAtomic = require('./../atomic/XSUntypedAtomic');
var cXSString = require('./../atomic/XSString');
var cXSBoolean = require('./../atomic/XSBoolean');
var cXSAnySimpleType = require('./../../XSAnySimpleType');
var cXSAnyAtomicType = require('./../XSAnyAtomicType');

var fIsNaN = global.isNaN;
var fIsFinite = global.isFinite;

var cString = global.String;
var cNumber = global.Number;
var cBigInt = global.BigInt;
var fString_trim = function (sValue) {
	return cString(sValue).trim();
};

/*
	xs:decimal is an exact decimal type: the value is held as a scaled integer,
	not as a binary floating point number.

		value = digits / 10^scale        digits is a BigInt, scale an integer >= 0

	XML Schema Part 2: Datatypes, section "decimal" requires a minimum of 18
	decimal digits; a scaled BigInt has no fixed upper bound, so that minimum
	is met with room to spare.

	Two invariants carry the rest of the library:

	  - valueOf() keeps returning a JavaScript number. 61 of the 77 valueOf()
	    call sites in lib/ want a number and are right to (positions in
	    sequences, string lengths, effective boolean value), and eight further
	    sites coerce implicitly through Math.round(). Returning a BigInt there
	    would throw "Cannot convert a BigInt to a number" instead of computing.
	    The exact value is reached through digits/scale, never through valueOf().

	  - .value stays readable and writable as a number. Twelve integer subtypes
	    range-check through oValue.value, and XSDouble/XSFloat construct from
	    it; an accessor keeps all of them working against the exact value.

	Non-finite values (division by zero produces them) cannot be represented as
	a scaled integer and are held separately in .special.
*/

var nPow10Cache	= [];
function fPow10(nExp) {
	if (nPow10Cache[nExp])
		return nPow10Cache[nExp];
	var vResult	= cBigInt(1),
		vTen	= cBigInt(10);
	for (var nIndex = 0; nIndex < nExp; nIndex++)
		vResult	*= vTen;
	if (nExp < 512)
		nPow10Cache[nExp]	= vResult;
	return vResult;
};

// Accepts the xs:decimal lexical form and, additionally, the exponent form a
// JavaScript number falls into when stringified (1e21, 1.5e-7). Returns null
// when the text is not a number at all.
var rDecimalParse	= /^([+\-]?)(?:(\d*)(?:\.(\d*))?)(?:[eE]([+\-]?\d+))?$/;
function fParseExact(sValue) {
	var aMatch	= rDecimalParse.exec(sValue);
	if (!aMatch)
		return null;
	var sInteger	= aMatch[2] || '',
		sFraction	= aMatch[3] || '';
	if (!sInteger.length && !sFraction.length)
		return null;
	var vDigits	= cBigInt(sInteger + sFraction),
		nScale	= sFraction.length - (aMatch[4] ? parseInt(aMatch[4], 10) : 0);
	if (aMatch[1] == '-')
		vDigits	= -vDigits;
	return fNormalize(vDigits, nScale);
};

// Canonical form, decided 2026-08-13: no trailing zeros in the fraction, and
// no exponent. 0.30 is held as 0.3 and 2.0 as 2, so writing a value out never
// grows a digit the author did not write.
function fNormalize(vDigits, nScale) {
	var vTen	= cBigInt(10);
	while (nScale > 0 && vDigits % vTen == 0) {
		vDigits	/= vTen;
		nScale--;
	}
	if (nScale < 0) {
		vDigits	*= fPow10(-nScale);
		nScale	= 0;
	}
	return {digits: vDigits, scale: nScale};
};

function cXSDecimal(vValue) {
	this.special	= null;
	if (vValue instanceof cXSDecimal) {
		this.digits		= vValue.digits;
		this.scale		= vValue.scale;
		this.special	= vValue.special;
	}
	else
	if (typeof vValue == "object" && vValue !== null && typeof vValue.digits != "undefined") {
		this.digits	= vValue.digits;
		this.scale	= vValue.scale;
	}
	else {
		this.value	= vValue;
	}
};

cXSDecimal.prototype	= new cXSAnyAtomicType;
cXSDecimal.prototype.builtInKind	= cXSConstants.DECIMAL_DT;
cXSDecimal.prototype.primitiveKind	= cXSAnySimpleType.PRIMITIVE_DECIMAL;

cXSDecimal.prototype.digits		= null;
cXSDecimal.prototype.scale		= 0;
cXSDecimal.prototype.special	= null;

// .value is an accessor over the exact representation, so that code reading or
// writing it keeps seeing a plain number while the exact value is what is
// stored. See the note at the top of this file.
Object.defineProperty(cXSDecimal.prototype, "value", {
	configurable: true,
	get: function() {
		if (this.special !== null)
			return this.special;
		if (this.digits === null)
			return null;
		return cNumber(this.toString());
	},
	set: function(vValue) {
		if (vValue === null || typeof vValue == "undefined") {
			this.digits		= null;
			this.scale		= 0;
			this.special	= null;
			return;
		}
		var nValue	= cNumber(vValue);
		if (fIsNaN(nValue) || !fIsFinite(nValue)) {
			this.digits		= null;
			this.scale		= 0;
			this.special	= nValue;
			return;
		}
		var oParts	= fParseExact(cString(nValue));
		this.digits		= oParts.digits;
		this.scale		= oParts.scale;
		this.special	= null;
	}
});

cXSDecimal.prototype.valueOf	= function() {
	return this.value;
};

cXSDecimal.prototype.toString	= function() {
	if (this.special !== null)
		return cString(this.special);
	if (this.digits === null)
		return cString(null);

	var bNegative	= this.digits < 0,
		sDigits		= (bNegative ?-this.digits : this.digits).toString();
	if (!this.scale)
		return (bNegative ? '-' : '') + sDigits;

	while (sDigits.length <= this.scale)
		sDigits	= '0' + sDigits;
	return (bNegative ? '-' : '')
		+ sDigits.slice(0, sDigits.length - this.scale)
		+ '.'
		+ sDigits.slice(sDigits.length - this.scale);
};

// Exact value as a pair, for callers that must not go through a double.
cXSDecimal.prototype.getParts	= function() {
	return this.special === null && this.digits !== null ? {digits: this.digits, scale: this.scale} : null;
};

cXSDecimal.fromParts	= function(vDigits, nScale) {
	return new cXSDecimal(fNormalize(vDigits, nScale));
};

cXSDecimal.parse	= fParseExact;
cXSDecimal.normalize	= fNormalize;
cXSDecimal.pow10	= fPow10;

var rXSDecimal	= /^[+\-]?((\d+(\.\d*)?)|(\.\d+))$/;
cXSDecimal.cast	= function(vValue) {
	if (vValue instanceof cXSDecimal)
		return vValue;
	if (vValue instanceof cXSString || vValue instanceof cXSUntypedAtomic) {
		var sValue	= fString_trim(vValue);
		if (rXSDecimal.test(sValue))
			return new cXSDecimal(fParseExact(sValue));
		throw new cException("FORG0001");
	}
	if (vValue instanceof cXSBoolean)
		return new cXSDecimal(vValue * 1);
	if (vValue.primitiveKind == cXSAnySimpleType.PRIMITIVE_FLOAT || vValue.primitiveKind == cXSAnySimpleType.PRIMITIVE_DOUBLE) {
		if (!fIsNaN(vValue) && fIsFinite(vValue))
			return new cXSDecimal(+vValue);
		throw new cException("FOCA0002"
//->Debug
				, "Cannot convert '" + vValue + "' to xs:decimal"
//<-Debug
		);
	}
	//
	throw new cException("XPTY0004"
//->Debug
			, "Casting value '" + vValue + "' to xs:decimal can never succeed"
//<-Debug
	);
};

//
module.exports = cXSDecimal;
