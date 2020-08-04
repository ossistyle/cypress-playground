/*
 * ADOBE CONFIDENTIAL
 *
 *
 * Copyright 2020 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 *
 */
(function($) {
    "use strict";

    var serializeArrayBase = $.fn.serializeArray;
    $.fn.extend({
        serializeArray: function() {
            var serializedElements = serializeArrayBase.apply(this);
            if (jQuery(".data-fields.active").length > 0) {
                for (var iterator = serializedElements.length - 1; iterator >= 0; iterator--) {
                    var elementName = serializedElements[iterator].name;
                    if (jQuery('input[name="' + elementName + '"][readOnly]').length > 0) {
                        serializedElements.splice(iterator, 1);
                    }
                }
            }
            return serializedElements;
        }
    });
})(jQuery);
