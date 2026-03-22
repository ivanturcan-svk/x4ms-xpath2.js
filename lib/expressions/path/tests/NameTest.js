function cNameTest(sPrefix, sLocalName, sNameSpaceURI) {
	this.prefix			= sPrefix;
	this.localName		= sLocalName;
	this.namespaceURI	= sNameSpaceURI;
};

cNameTest.prototype.prefix			= null;
cNameTest.prototype.localName		= null;
cNameTest.prototype.namespaceURI	= null;

// Public members
cNameTest.prototype.test	= function (oNode, oContext) {
	var fGetProperty	= oContext.DOMAdapter.getProperty,
		nType	= fGetProperty(oNode, "nodeType");
	// Use runtime namespace override when no explicit prefix was used
	var sNamespaceURI	= (!this.prefix && this.namespaceURI != '*' && oContext.defaultElementNamespace != null)
		? oContext.defaultElementNamespace
		: this.namespaceURI;
	if (nType == 1 || nType == 2) {
		if (this.localName == '*')
			return (nType == 1 || (fGetProperty(oNode, "prefix") != "xmlns" && fGetProperty(oNode, "localName") != "xmlns")) && (!this.prefix || fGetProperty(oNode, "namespaceURI") == sNamespaceURI);
		if (this.localName == fGetProperty(oNode, "localName"))
			return sNamespaceURI == '*' || (nType == 2 && !this.prefix && !fGetProperty(oNode, "prefix")) || fGetProperty(oNode, "namespaceURI") == sNamespaceURI;
	}
	//
	return false;
};

//
module.exports = cNameTest;
