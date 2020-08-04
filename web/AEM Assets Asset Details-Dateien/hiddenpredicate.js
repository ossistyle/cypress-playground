/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2014 Adobe Systems Incorporated
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
(function(document, $) {
    "use strict";

    $(document).on("loadSavedQuery", function(evt, queryParameters) {
        var $hidden = $(".searchpanel").find('input[type=hidden][data-metatype="hidden"]');

        $hidden.each(function() {
            var name = $(this).attr("name");
            var value = queryParameters[name];
            if (value !== undefined) {
                $(this).val(value);
            }
        });

        $(".searchpanel").find("input[type=hidden]").each(function() {
            this.disabled = !($(this).val());
        });
    });

    $(document).on("resetSearchFilters", function(evt) {
        // reset value for path predicate to current request suffix
        $(".searchpanel").find('input[type=hidden][data-metatype="hidden"][name="path"]').val($(".searchpanel").data("path"));
    });
})(document, Granite.$);
