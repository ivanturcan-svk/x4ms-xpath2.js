var cException = require('./../../../../../classes/Exception');

var cXSConstants = require('./../../../XSConstants');
var cXSDecimal = require('./../XSDecimal');
var cXSString = require('./../XSString');
var cXSUntypedAtomic = require('./../XSUntypedAtomic');
var cXSBoolean = require('./../XSBoolean');
var cXSAnyAtomicType = require('./../../XSAnyAtomicType');

var fIsNaN = global.isNaN;
var fIsFinite = global.isFinite;

var cString = global.String;
var cBigInt = global.BigInt;
var fString_trim = function (sValue) {
	return cString(sValue).trim();
};

// xs:integer is derived from xs:decimal and shares its representation, so an
// integer too large for a double stays exact instead of being rounded on the
// way in.
function cXSInteger(vValue) {
	cXSDecimal.call(this, vValue);
};

cXSInteger.prototype	= new cXSDecimal;
cXSInteger.prototype.builtInKind	= cXSConstants.INTEGER_DT;

var rXSInteger	= /^[-+]?[0-9]+$/;
cXSInteger.cast	= function(vValue) {
	if (vValue instanceof cXSInteger)
		return new cXSInteger(vValue);
	if (vValue instanceof cXSString || vValue instanceof cXSUntypedAtomic) {
		var sValue	= fString_trim(vValue);
		if (rXSInteger.test(sValue))
			return cXSInteger.fromParts(cBigInt(sValue), 0);
		throw new cException("FORG0001");
	}
	if (vValue instanceof cXSBoolean)
		return new cXSInteger(vValue * 1);
	if (cXSAnyAtomicType.isNumeric(vValue)) {
		if (!fIsNaN(vValue) && fIsFinite(vValue)) {
			// Truncates towards zero — XQuery 1.0 and XPath 2.0 Functions and
			// Operators, section "Casting to numeric types".
			var oParts	= vValue.getParts ? vValue.getParts() : null;
			if (oParts)
				return cXSInteger.fromParts(oParts.scale ? oParts.digits / cXSDecimal.pow10(oParts.scale) : oParts.digits, 0);
			return cXSInteger.fromParts(cBigInt(global.Math.trunc(+vValue)), 0);
		}
		throw new cException("FOCA0002"
//->Debug
				, "Cannot convert '" + vValue + "' to xs:integer"
//<-Debug
		);
	}
	//
	throw new cException("XPTY0004"
//->Debug
			, "Casting value '" + vValue + "' to xs:integer can never succeed"
//<-Debug
	);
};

cXSInteger.fromParts	= function(vDigits, nScale) {
	return new cXSInteger(cXSDecimal.normalize(vDigits, nScale));
};

//
module.exports = cXSInteger;
