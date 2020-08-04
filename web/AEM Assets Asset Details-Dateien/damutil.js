/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2016 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */
(function(document, _g, $) {
    "use strict";
    window.Dam = window.Dam || {};
    Dam.Util = Dam.Util || {};

    Dam.Util.populateDisplayMessageWithSelectedItems = function(selectedItems, singleContentMessage,
        multipleContentMessage) {
        var MAX_ENTRIES = 10;
        var MAX_ENTRY_SIZE = 40;
        var itemlist;
        var itemCnt = Math.min(selectedItems.length, MAX_ENTRIES);
        var content = selectedItems.length === 1 ? _wrapContent("p", singleContentMessage) : _wrapContent("p",
            multipleContentMessage);
        var list = $.map(selectedItems, function(val) {
            var title = _g.XSS.getXSSValue($($(val).find("h4")[0]).text()) ||
                    _g.XSS.getXSSValue($(val).find(".foundation-collection-item-title").text());
            return title.length <= MAX_ENTRY_SIZE ? title : title.substring(0, MAX_ENTRY_SIZE) + "...";
        });

        if (list.length > itemCnt) {
            list = list.splice(0, itemCnt);
            list.push("...");
        }
        list = list.join("<br>");
        itemlist = $("<p class=\"item-list\"></p>").append(list);

        return $(content).append(itemlist);
    };

    /**
     * Retrieves an object representing the current selection. The object returned by this method
     * can be used in other getSelection* methods.
     * @return {object} The current selection.
     */
    Dam.Util.getSelection = function() {
        // card view
        var selection = document.querySelector("#granite-omnisearch-result");
        if (!selection) {
            selection = document.querySelector("coral-masonry");
        }
        if (!selection) {
            // table view
            selection = document.querySelector("table");
        }
        if (!selection) {
            // column view
            selection = $("coral-columnview-item[selected]");
        }
        return selection;
    };

    /**
     * Retrieves the number of items in the given selection.
     * @param {object} selection The current user selection.
     * @return {integer} The number of items currently selected.
     */
    Dam.Util.getSelectionCount = function(selection) {
        var count = 0;
        if (selection.selectedItems) {
            count = selection.selectedItems.length;
        } else if (selection.length) {
            count = selection.length;
        }
        return count;
    };

    /**
     * Given a selection, retrieves the path of the single selected item, if
     * only one item is selected.
     * @param {object} selection The current user selection.
     * @return {string} The path of the single selected item. If no items are selected or if
     *   multiple items are selected then the return value will be falsy.
     */
    Dam.Util.getSelectionSinglePath = function(selection) {
        var path = false;
        var count = Dam.Util.getSelectionCount(selection);
        if (count === 1) {
            if (selection.selectedItem) {
                path = selection.selectedItem.getAttribute("data-foundation-collection-item-id");
            }

            if (!path && selection.data) {
                path = selection.data("foundation-collection-item-id");
            }
        }
        return path;
    };

    Dam.Util.getMultipleSelectionPath = function(selection) {
        var count = Dam.Util.getSelectionCount(selection);
        var paths = [];
        for (var i = 0; i < count; i++) {
            paths.push(Dam.Util.getSelectionPathAt(selection, i));
        }
        return paths;
    };

    /**
     * Given a selection, retrieves the path of the selected item at a given index.
     * @param {object} selection The current user selection.
     * @param {integer} index The selected index whose path should be retrieved.
     * Should be less than the total number of items in the selection.
     * @return {string} The path of the selected item at the given index. Or falsy if the index is out of range.
     */
    Dam.Util.getSelectionPathAt = function(selection, index) {
        if (index < Dam.Util.getSelectionCount(selection)) {
            if (selection.selectedItems) {
                return selection.selectedItems[index].getAttribute("data-foundation-collection-item-id");
            } else {
                return $(selection[index]).data("foundation-collection-item-id");
            }
        }
        return false;
    };

    /**
     * Give a selection, retrieves an attribute value from the item at a given index.
     * @param {object} selection The current user selection.
     * @param {integer} index The selected index whose data should be retrieved.
     * Should be less than the total number of items in the selection.
     * @param {string} attr The name of the attribute value to be retrieved.
     * @return {string} The attribute value for the selected item.
     * Will be falsy if the index is out of range or the key was not found.
     */
    Dam.Util.getSelectionAttrAt = function(selection, index, attr) {
        var data = false;
        if (index < Dam.Util.getSelectionCount(selection)) {
            if (selection.selectedItems) {
                var selectedItem = $(selection.selectedItems[index]);
                data = $(selectedItem.find("coral-card")).attr(attr);
                if (!data) {
                    data = selectedItem.attr(attr);
                }
            } else if (selection.data) {
                data = $("coral-columnview-item[selected]").attr(attr);
            }
        }
        return data;
    };

    /**
     * Detects change by polling a given url and comparing update time values
     * @param {string} url The url to poll.
     * @param {string} property The property name whose value is supposed to be changed.
     * @param {integer} formerValue The previous value of the property.
     * @param {integer} lapse The polling delay.
     * @param {integer} attempts Maximum number of attempts to make.
     * @param {integer} initial If it's the first attempt.
     * @param {integer} callback The callback to execute after change is detected.
     */
    Dam.Util.detectChange = function(url, property, formerValue, lapse, attempts, initial, callback) {
        if (attempts > 0) {
            if (initial === false) {
                // get the data
                $.ajax({
                    type: "GET",
                    url: Granite.HTTP.externalize(url + "?_ck=" + Date.now()),
                    dataType: "json",
                    async: true,
                    success: function(jsondata) {
                        var condition = true;
                        var latestValue = jsondata[property];
                        var toCheck = true;
                        if (isNaN(latestValue)) {
                            latestValue = new Date(latestValue).getTime();
                            if (latestValue <= formerValue) {
                                condition = false;
                                toCheck = false;
                            }
                        }
                        if (toCheck && (latestValue === formerValue)) {
                            condition = false;
                        }

                        if (condition) {
                            callback();
                        } else {
                            // set the timer for lapse
                            setTimeout(function() {
                                Dam.Util.detectChange(url, property, formerValue, lapse, attempts - 1, false, callback);
                            }, lapse);
                        }
                    },
                    error: function(response) {
                        // set the timer for lapse
                        setTimeout(function() {
                            Dam.Util.detectChange(url, property, formerValue, lapse, attempts - 1, false, callback);
                        }, lapse);
                    }
                });
            } else {
                $(window).adaptTo("foundation-ui").wait();
                // set the timer
                setTimeout(function() {
                    Dam.Util.detectChange(url, property, formerValue, lapse, attempts, false, callback);
                }, lapse);
            }
        } else {
            $(window).adaptTo("foundation-ui").clearWait();
            callback();
        }
    };

    /**
     * Escape invalid characters in CSS selectors
     * @return {string} - Valid selectors with invalid characters escaped
     */
    Dam.Util.escapeSelector = function(selectorName) {
        return escapeSelector(selectorName);
    };

    Dam.Util.getUrlParam = function(param) {
        var paramVal = undefined;
        if ((document.URL).lastIndexOf("?") > -1) {
            var paramStr = (document.URL).substr((document.URL).lastIndexOf("?") + 1);
            var params = paramStr.split("&");
            params.forEach(function(pair) {
                if (pair.split("=").length > 1 && pair.split("=")[0] === param) {
                    paramVal = pair.split("=")[1];
                }
            });
        }
        return paramVal;
    };

    /**
     * This API should be used to select elements by matching attribute value
     * this takes care of invalid jQuery selector characters in attribute value.
     * e.g. "'" in foundation-collection-item-id="test's"
     * @param selector - an element selector. e.g. "foundation-collection-item"
     * @param name  - attribute name
     * @param value - value to match with attribute value
     *
     * @return jQuery array containing matching elements
     */
    Dam.Util.findElementByAttrValue = function(selector, name, value) {
        return $(selector).filter(function() {
            return this.getAttribute(name) === value;
        });
    };

    /**
     * @Deprecated  - Use Dam.Util.NameValidation.handleRestrictedAssetChars
     *                or Dam.Util.NameValidation.handleFolderNameValidation instead
     * @param $input - jQuery Object for input element.
     * @return {boolean} - True if restricted characters found.
     *                     False if there are restricted characters.
     *                     Call replaceRestrictedChars to replace restricted characters with '-'.
     */
    Dam.Util.handleRestrictedChars = function($input) {
        return handleRestricted(getInvalidFileChars(), getRegExInvalidFile(), $input);
    };

    /**
     * @Deprecated - Use Dam.Util.NameValidation.getValidFileName,
     *               Dam.Util.NameValidation.getValidFolderName.
     * @param name - input name.
     * @return {string} - A valid name where invalid chars replaced with "-".
     */
    Dam.Util.replaceRestrictedChars = function(name) {
        return name.replace(getRegExInvalidFile(), "-");
    };

    /** ********************* File / Folder name validation helper APIs **************************************/

    Dam.Util.NameValidation = Dam.Util.NameValidation || {};
    /**
     * Use this API to handle restricted characters for file naming.
     * @param $input - jQuery Object for input element.
     * @param value {String} Optional - Use this name in case the name is entered in some other input element.
     *                if this is not passed then name will be taken from input element's value.
     */
    Dam.Util.NameValidation.handleFileNameValidation = function($input, value) {
        handleRestricted(getInvalidFileChars(), getRegExInvalidFile(), $input, value);
    };

    /**
     * Use this API to handle restricted characters for folder naming.
     * @param $input - jQuery Object for input element.
     * @param value {String} Optional - Use this name in case the name is entered in some other input element.
     *                if this is not passed then name will be taken from input element's value.
     */
    Dam.Util.NameValidation.handleFolderNameValidation = function($input, value) {
        handleRestricted(getInvalidFolderChars(), getRegExInvalidFolder(), $input, value);
    };

    /**
     * Check if the name can be a valid file name.
     * @param name - the name of the file.
     * @return {boolean} - True if the file name doesn't contain a restricted character.
     *                     False otherwise
     */
    Dam.Util.NameValidation.isValidFileName = function(name) {
        return !containsInvalidChars(getRegExInvalidFile(), name);
    };

    /**
     * Check if the name can be a valid folder name.
     * @param name - the name of the file.
     * @return {boolean} - True if the file name doesn't contain a restricted character.
     *                     False otherwise
     */
    Dam.Util.NameValidation.isValidFolderName = function(name) {
        return !containsInvalidChars(getRegExInvalidFolder(), name);
    };

    /**
     * Replace Invalid file name chars with "-" character.
     * @param fileName {String} - file name text.
     * @return {string} - A valid name where invalid chars replaced with "-".
     */
    Dam.Util.NameValidation.getValidFileName = function(fileName) {
        return fileName.replace(getRegExInvalidFile(), "-");
    };

    /**
     * Replace Invalid folder name chars with "-" character.
     * @param folderName {String} - folder name text.
     * @return {string} - A valid name where invalid chars replaced with "-".
     */
    Dam.Util.NameValidation.getValidFolderName = function(folderName) {
        return folderName.replace(getRegExInvalidFolder(), "-");
    };

    /**
     * Use this to show Invalid File name characters on UI.
     * @return {string} - Invalid File name character set.
     */
    Dam.Util.NameValidation.getInvalidFileCharSet = function() {
        return getCharsString(getInvalidFileChars());
    };

    /**
     * Use this to show Invalid Folder name characters on UI.
     * @return {string} - Invalid Folder name character set.
     */
    Dam.Util.NameValidation.getInvalidFolderCharSet = function() {
        return getCharsString(getInvalidFolderChars());
    };

    function handleRestricted(restrictedChars, restrictedCharsRegExp, $input, value) {
        // replace the restricted codes if any and add the error tooltip
        var rcExists;

        if (value === undefined) {
            value = $input.val().trim();
        }
        // remove the tooltip if any
        removeTooltip();
        $input.val(Dam.Util.NameValidation.getValidFileName(value));
        rcExists = containsInvalidChars(restrictedCharsRegExp, value);
        if (rcExists) {
            // add the error tooltip
            var rcNotAllowedMessage =
                Granite.I18n.get("The name contained {0} . These characters are not allowed and were replaced by {1}",
                    [ getCharsString(restrictedChars), "-" ]);

            var tooltip = createTooltip(rcNotAllowedMessage);
            addTooltip(tooltip, $input);
            return true;
        }
        return false;
    }

    // return space separated string of characters
    function getCharsString(charactersArray) {
        var charsStr = charactersArray.toString();
        charsStr = charsStr.replace(/ /g, "Space");
        charsStr = charsStr.replace(/\t/g, "Tab");
        return charsStr.replace(/,/g, " ");
    }

    function addTooltip(tooltip, element) {
        element.after(tooltip);
    }

    function removeTooltip() {
        $(".cq-dam-util-tooltip").remove();
    }

    function createTooltip(message) {
        return $("<coral-tooltip class=\"cq-dam-util-tooltip\" placement=\"bottom\" variant=\"error\" " +
            "interaction=\"off\" open>" + message + "</coral-tooltip>");
    }

    function containsInvalidChars(restrictedCharsRegExp, name) {
        return (name.search(restrictedCharsRegExp) !== -1);
    }

    // To calculate regex only once
    var regExInvalidFileChars;
    var regExInvalidFolderChars;

    function getRegExInvalidFile() {
        if (regExInvalidFileChars === undefined) {
            var charStr = getInvalidFileChars().toString().replace(/,/g, "");
            regExInvalidFileChars = new RegExp("[" + escapeRegEx(charStr) + "]", "g");
        }
        return regExInvalidFileChars;
    }

    function getRegExInvalidFolder() {
        if (regExInvalidFolderChars === undefined) {
            var charStr = getInvalidFolderChars().toString().replace(/,/g, "");
            regExInvalidFolderChars = new RegExp("[" + escapeRegEx(charStr) + "]", "g");
        }
        return regExInvalidFolderChars;
    }

    // Escapes any string to be used in regexp
    function escapeRegEx(string) {
        var specials = [
            // order matters for these
            "-",
            "[",
            "]",
            // order doesn't matter for any of these
            "/",
            "{",
            "}",
            "(",
            ")",
            "*",
            "+",
            "?",
            ".",
            "\\",
            "^",
            "$",
            "|"
        ];

        var regex = RegExp("[" + specials.join("\\") + "]", "g");

        return string.replace(regex, "\\$&");
    }

    function getInvalidFileChars() {
        return [ "*", "/", ":", "[", "\\", "]", "|", "#", "%", "{", "}", "?", "&" ];
    }

    function getInvalidFolderChars() {
        return [ "*", "/", ":", "[", "\\", "]", "|", "#", "%", "{", "}", "?",
            "\"", ".", "^", ";", "+", "&", " ", "\t" ];
    }

    function _wrapContent(tag, mesg) {
        return "<" + tag + ">" + mesg + "</" + tag + ">";
    }

    function escapeSelector(selector) {
        var rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g; //eslint-disable-line no-control-regex
        var fcssescape = function(ch, asCodePoint) {
            if (asCodePoint) {
                // U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
                if (ch === "\0") {
                    return "\uFFFD";
                }
                // Control characters and (dependent upon position) numbers get escaped as code points
                return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
            }
            // Other potentially-special ASCII characters get backslash-escaped
            return "\\" + ch;
        };
        return selector.replace(rcssescape, fcssescape);
    }
})(document, _g, Granite.$);
