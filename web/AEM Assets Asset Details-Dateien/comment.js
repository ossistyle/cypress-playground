/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2015 Adobe Systems Incorporated
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

/**
 * Handle comment creation in the toolbar.
 */

(function(document, $) {
    var count = 0;
    var selectionLength;
    var succeeded;
    var failed;

    var eventName = "cq-common-admin-timeline-change";
    var ns = "cq-common-admin-timeline-toolbar-actions-comment";
    var selector = ".cq-common-admin-timeline-toolbar-actions-comment";
    var fieldSelector = "input[name=cq-common-admin-timeline-toolbar-actions-comment]";

    var eventsSelector = ".cq-common-admin-timeline-events";
    var eventsNs = "cq-common-admin-timeline-events";
    var timelineSelector = ".cq-common-admin-timeline";
    var timelineNs = "cq-common-admin-timeline";

    var actionsSelector = ".cq-common-admin-timeline-toolbar-actions";
    var alertRibbonSelector = ".cq-common-admin-timeline-alerts-workflow-ribbon";
    var filterSelector = ".cq-common-admin-timeline-filter";

    var keydownHandler = function(evt) {

        if (evt.which == 13) {
            evt.preventDefault();
            if (!evt.ctrlKey && !evt.altKey && !evt.metaKey) {
                var field = $(this);
                if (field.val() === "") {
                    return;
                }
                var paths = [];
                if ($(timelineSelector).data("paths")) {
                    paths = $(timelineSelector).data("paths");
                }
                count = selectionLength = paths.length;
                succeeded = 0;
                failed = 0;
                // note: commenting is currently disabled for multiple selection
                for (var i = 0; i < paths.length; i++) {
                    createComment(paths[i], field);
                }
            }
        }
    };

    function createComment(path, field) {
        if (!path) {
            return;
        }
        var form = field.closest("form");
        path = encodeURIComponent(path).replace(/%2F/g, "/");
        $.ajax({
            // url: form.attr("action"),
            url: path,
            type: form.attr("method") || "post",
            data: {
                ":operation": form.data("operation"),
                "path": path,
                "message": field.val(),
                "_charset_": "utf-8"
            },
            success: function() {
                succeeded++;
                createCommentCallback();
                // reset comment input field
                clearField();
                field.blur();
            },
            error: function() {
                failed++;
                var msg = form.data("errormessage");
                $(window).adaptTo("foundation-ui").notify("", msg ? Granite.I18n.getVar(msg) : Granite.I18n.get("Failed to create comment"), "error");
                createCommentCallback();
            }
        });
    }

    function clearField(field) {
        field = field || $(fieldSelector);
        field.val("");
    }

    function createCommentCallback() {
        count--;
        if (count <= 0) {
            // todo: handle errors
            if (selectionLength > 1) {
                if (failed == 0) {
                    $(window).adaptTo("foundation-ui").notify("", Granite.I18n.get("Comments added to multiple items."), "success");
                }
                hideActionButton();
            } else {
                // no selection: refresh events
                $(eventsSelector).trigger(eventName + "." + eventsNs);
            }
        }
    }

    $(document).on("keydown." + ns, fieldSelector, keydownHandler);


    $(document).on("click." + ns, selector + "-button", function(e) {
        $(ns + "-actions").toggle();
    });

    // clear comment field ...
    $(document).on(eventName + "." + timelineNs, timelineSelector, function(e, options) {
        // ... when the timeline of a different item is loaded
        clearField();
    });
    $(document).on("click." + ns, actionsSelector + "-button", function(e) {
        // ... when opening the actions menu (create versions etc.)
        clearField();
    });
    $(document).on("click." + ns, alertRibbonSelector, function(e) {
        // ... when opening the alerts (workflows)
        clearField();
    });
    $(document).on("change." + ns, filterSelector, function(e) {
        // ... when changing the filter
        clearField();
    });


})(document, Granite.$);
