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

    $(document).on("granite-omnisearch-predicate-update", function(event) {
        var form = event.target;
        var queryParameters = event.detail.queryParameters;

        $(form).find("input[type=hidden]").each(function() {
            var value = queryParameters[this.name];
            if (value !== undefined) {
                this.value = value;
            }

            // TODO Why does an empty-valued input need to be disabled?
            // The following code is impacting all hidden inputs in the form,
            // including the ones not for hiddenpredicate!!!
            if (!this.value) {
                this.disabled = true;
            }
        });
    });
})(document, Granite.$);
