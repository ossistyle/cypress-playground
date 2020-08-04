/*
 ADOBE CONFIDENTIAL

 Copyright 2013 Adobe Systems Incorporated
 All Rights Reserved.

 NOTICE:  All information contained herein is, and remains
 the property of Adobe Systems Incorporated and its suppliers,
 if any.  The intellectual and technical concepts contained
 herein are proprietary to Adobe Systems Incorporated and its
 suppliers and may be covered by U.S. and Foreign Patents,
 patents in process, and are protected by trade secret or copyright law.
 Dissemination of this information or reproduction of this material
 is strictly forbidden unless prior written permission is obtained
 from Adobe Systems Incorporated.
 */
(function(exports) {
    "use strict";

    function accumulate(iterator, condition) {
        var text = [];

        var c = iterator.current();
        while (c) {
            if (!condition(c)) {
                break;
            }

            text.push(c);
            c = iterator.next();
        }

        return text.join("");
    }

    function isAlpha(c) {
        return (c >= "A" && c <= "Z") || (c >= "a" && c <= "z");
    }

    function isDigit(c) {
        return c >= "0" && c <= "9";
    }

    function isHexDigit(c) {
        return isDigit(c) || (c >= "A" && c <= "F") || (c >= "a" && c <= "f");
    }

    function isUnreserved(c) {
        return isAlpha(c) || isDigit(c) || c === "-" || c === "." || c === "_" || c === "~";
    }

    var reserved = [ ":", "/", "?", "#", "[", "]", "@", "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "=" ];

    function isReserved(c) {
        return reserved.indexOf(c) >= 0;
    }

    function isVarchar(c) {
        return isAlpha(c) || isDigit(c) || c === "_" || c === "%";
    }

    function isVarname(c) {
        return isVarchar(c) || c === ".";
    }

    function isSurrogate(c) {
        return (c >= "\uD800" && c <= "\uDBFF") || (c >= "\uDC00" && c <= "\uDFFF");
    }

    var strictRFC3986Regex = /[!'()*]/g;

    function encodeU(string) {
        return encodeURIComponent(string).replace(strictRFC3986Regex, function(c) {
            return "%" + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }

    function encodeUR(string) {
        var result = [];

        for (var i = 0, ln = string.length; i < ln; i++) {
            var c = string[i];

            if (isUnreserved(c) || isReserved(c)) {
                result.push(c);
            } else if (c === "%") {
                result.push(c, string[++i], string[++i]);
            } else if (isSurrogate(c)) {
                result.push(encodeURIComponent(c + string[++i]));
            } else {
                result.push(encodeU(c));
            }
        }

        return result.join("");
    }

    var implementedOperators = [ "+", "#", ".", "/", ";", "?", "&" ];
    var operators = implementedOperators.concat([ "=", ",", "!", "@", "|" ]);

    function getOperator(expr) {
        var op = expr[0];

        if (!op) {
            return;
        }

        if (operators.indexOf(op) >= 0) {
            if (implementedOperators.indexOf(op) < 0) {
                return;
            }
        } else {
            if (!isVarchar(op)) {
                return;
            } else {
                op = "NUL";
            }
        }

        switch (op) {
            case "NUL":
                return {
                    op: "",
                    varspeclist: expr,
                    first: "",
                    sep: ",",
                    named: false,
                    ifemp: "",
                    encode: encodeU
                };

            case "+":
                return {
                    op: "+",
                    varspeclist: expr.substring(1),
                    first: "",
                    sep: ",",
                    named: false,
                    ifemp: "",
                    encode: encodeUR
                };

            case ".":
            case "/":
                return {
                    op: expr[0],
                    varspeclist: expr.substring(1),
                    first: expr[0],
                    sep: expr[0],
                    named: false,
                    ifemp: "",
                    encode: encodeU
                };

            case ";":
                return {
                    op: ";",
                    varspeclist: expr.substring(1),
                    first: ";",
                    sep: ";",
                    named: true,
                    ifemp: "",
                    encode: encodeU
                };

            case "?":
                return {
                    op: "?",
                    varspeclist: expr.substring(1),
                    first: "?",
                    sep: "&",
                    named: true,
                    ifemp: "=",
                    encode: encodeU
                };

            case "&":
                return {
                    op: "&",
                    varspeclist: expr.substring(1),
                    first: "&",
                    sep: "&",
                    named: true,
                    ifemp: "=",
                    encode: encodeU
                };

            case "#":
                return {
                    op: "#",
                    varspeclist: expr.substring(1),
                    first: "#",
                    sep: ",",
                    named: false,
                    ifemp: "",
                    encode: encodeUR
                };
        }
    }

    function handleURITemplate(state) {
        var nonLiterals = [ "{", "}" ];

        var isPercent = 0;
        var isLiteral = function(c) {
            if (isPercent > 0) {
                if (!isHexDigit(c)) {
                    return false;
                }
                if (++isPercent === 3) {
                    isPercent = 0;
                }
                return true;
            }
            if (c === "%") {
                isPercent++;
                return true;
            }

            return nonLiterals.indexOf(c) < 0 && c >= "!";
        };

        while (state.hasNext()) {
            state.next();
            var literals = accumulate(state, isLiteral);

            state.append(encodeUR(literals));

            if (state.current() === "{") {
                handleExpression(state);
            } else if (state.hasNext() || isPercent > 0) {
                state.halt("Malform expression");
            }
        }
    }

    function handleExpression(state) {
        state.next();

        var expr = accumulate(state, function(c) {
            return c !== "}";
        });

        if (state.current() !== "}") {
            state.append("{", expr);
            state.halt("Malform expression");
        }

        var operator = getOperator(expr);

        if (!operator) {
            state.fail("{", expr, "}");
            return;
        }


        var varspeclist = operator.varspeclist;
        var index = -1;
        var current;

        var exprIterator = {
            current: function() {
                return current;
            },
            hasNext: function() {
                return index < varspeclist.length;
            },
            next: function() {
                current = varspeclist[++index];
                return current;
            }
        };

        var isFirstVar = true;

        while (exprIterator.hasNext()) {
            exprIterator.next();

            var varname = accumulate(exprIterator, isVarname);
            var modifier = null;
            var prefix = null;

            if (!exprIterator.hasNext()) {
                if (varname.length === 0) {
                    return;
                }
            } else {
                if (exprIterator.current() === "*") {
                    modifier = exprIterator.current();
                    exprIterator.next();
                } else if (exprIterator.current() === ":") {
                    modifier = exprIterator.current();
                    exprIterator.next();
                    prefix = parseInt(accumulate(exprIterator, isDigit), 10);

                    if (isNaN(prefix)) {
                        state.fail("{", expr, "}");
                        return;
                    }
                }

                if (exprIterator.hasNext() && exprIterator.current() !== ",") {
                    state.fail("{", expr, "}");
                    return;
                }
            }

            var value = state.value(varname);

            if (
                value === undefined ||
                value === null ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === "object" && Object.keys(value).length === 0)) {
                continue;
            } else if (typeof value === "number") {
                value = value.toString();
            }

            if (isFirstVar) {
                state.append(operator.first);
                isFirstVar = false;
            } else {
                state.append(operator.sep);
            }

            if (typeof value === "string") {
                if (operator.named) {
                    state.append(encodeUR(varname));

                    if (value.length === 0) {
                        state.append(operator.ifemp);
                        continue;
                    }

                    state.append("=");
                }

                if (modifier === ":" && prefix < value.length) {
                    state.append(operator.encode(value.substring(0, prefix)));
                } else {
                    state.append(operator.encode(value));
                }
            } else if (modifier !== "*") {
                if (operator.named) {
                    state.append(encodeUR(varname));

                    if (value.length === 0) {
                        state.append(operator.ifemp);
                        continue;
                    }

                    state.append("=");
                }

                if (Array.isArray(value)) {
                    state.append(value.map(operator.encode).join(","));
                } else if (typeof value === "object") {
                    if (prefix !== null) {
                        state.fail("{", expr, "}");
                        return;
                    }
                    appendObject(value, operator.encode, state, ",", ",");
                }
            } else {
                if (operator.named) {
                    if (Array.isArray(value)) {
                        appendArray(varname, value, state, operator);
                    } else if (typeof value === "object") {
                        appendObjectExplode(value, state, operator);
                    }
                } else {
                    if (Array.isArray(value)) {
                        state.append(value.map(operator.encode).join(operator.sep));
                    } else if (typeof value === "object") {
                        appendObject(value, operator.encode, state, "=", operator.sep);
                    }
                }
            }
        }
    }

    function appendArray(varname, a, state, operator) {
        var first = true;

        a.forEach(function(v) {
            if (v === undefined || v === null) {
                return;
            }

            if (first) {
                first = false;
            } else {
                state.append(operator.sep);
            }

            state.append(encodeUR(varname));

            if (v.length === 0) {
                state.append(operator.ifemp);
            } else {
                state.append("=", operator.encode(v));
            }
        });
    }

    function appendObjectExplode(o, state, operator) {
        var first = true;

        Object.keys(o).forEach(function(k) {
            var v = o[k];

            if (v === undefined || v === null) {
                return;
            }

            if (first) {
                first = false;
            } else {
                state.append(operator.sep);
            }

            state.append(encodeUR(k));

            if (v.length === 0) {
                state.append(operator.ifemp);
            } else {
                state.append("=", operator.encode(v));
            }
        });
    }

    function appendObject(o, encode, state, pairSep, sep) {
        var first = true;

        Object.keys(o).forEach(function(k) {
            var v = o[k];

            if (v === undefined || v === null) {
                return;
            }

            if (first) {
                first = false;
            } else {
                state.append(sep);
            }

            state.append(encode(k), pairSep, encode(v));
        });
    }


    function URITemplateError(message) {
        this.name = "URITemplateError";
        this.message = message;
    }
    URITemplateError.prototype = new Error();
    URITemplateError.prototype.constructor = URITemplateError;

    exports.URITemplateError = URITemplateError;

    exports.expand = function(template, variables) {
        variables = variables || {};
        var error = false;
        var result = "";
        var index = -1;
        var current;

        var state = {
            fail: function() {
                error = true;
                this.append.apply(this, arguments);
            },
            halt: function(message) {
                error = true;
                throw new URITemplateError(message + ": " + result);
            },
            append: function() {
                for (var i = 0, ln = arguments.length; i < ln; i++) {
                    result += arguments[i];
                }
            },
            current: function() {
                return current;
            },
            hasNext: function() {
                return index < template.length;
            },
            next: function() {
                current = template[++index];
                return current;
            },
            value: function(varname) {
                return variables[varname];
            }
        };

        handleURITemplate(state);

        if (error) {
            throw new URITemplateError("Invalid template: " + result);
        }

        return result;
    };
})(typeof module === "object" && module.exports ? module.exports : (function() {
    "use strict";
    var g = window.Granite = window.Granite || {};
    g.URITemplate = {};
    return g.URITemplate;
})());
