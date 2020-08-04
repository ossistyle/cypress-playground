/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2013 Adobe Systems Incorporated
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
 *
 */

(function(document, $) {
    "use strict";

    $.fn.rearrangeFormLayout = function() {
        var tabs = $(".aem-assets-metadata-form-tab");
        tabs.each(function(index, value) {
            var $value = $(value);
            var children = $value.children();
            var colLength = children.length;

            switch (colLength) {
                case 1 : children.addClass("column-1"); break;
                case 2 : children.addClass("column-2"); break;
                case 3 : children.addClass("column-3"); break;
                case 4 : children.addClass("column-4"); break;
                case 5 : children.addClass("column-5"); break;
            }
        });
        $("#aem-assets-metadataeditor-border").height($(".data-fields.active").height());
    };
})(document, Granite.$);
