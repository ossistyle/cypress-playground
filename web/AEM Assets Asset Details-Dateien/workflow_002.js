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
 * Handles actions menu and actions of the workflow alerts.
 */

(function(document, $) {
    "use strict";

    var ns = "cq-common-admin-timeline-alerts-workflow";

    // selector of the root element of each workflow alert
    var workflowSelector = ".cq-common-admin-timeline-alerts-workflow";

    var ribbonSelector = ".cq-common-admin-timeline-alerts-workflow-ribbon";
    // actions menu to select action
    var actionsSelector = ".cq-common-admin-timeline-alerts-workflow-actions";
    // single actions e.g. delegate
    var actionSelector = ".cq-common-admin-timeline-alerts-workflow-action";

    var eventName = "cq-common-admin-timeline-change";
    var timelineSelector = ".cq-common-admin-timeline";
    var timelineNs = "cq-common-admin-timeline";

    var toggleableSelector = ".cq-common-admin-timeline-toggleable";
    var eventSelector = ".cq-common-admin-timeline-event";

    var resizeEventName = "cq-common-admin-timeline-resize";


    $(document).on("click." + ns, ribbonSelector, function(e) {
        // actions menu is a sibling of the ribbon
        hide(this, actionSelector);
        toggle(this, actionsSelector);
        var thisToggleable = $(this).closest(workflowSelector).find(actionsSelector).get(0);
        hideToggleables(thisToggleable);
        deselectEvents();
        $(timelineSelector).trigger(resizeEventName);
    });


    // actions

    $(document).on("click." + ns, actionsSelector + "-button", function(e) {
        toggle(this, "." + $(this).data("rel"));
        toggle(this, actionsSelector);
        $(timelineSelector).trigger(resizeEventName);
    });


    // listener of the cancel button
    $(document).on("click." + ns, actionSelector + "-cancel", function(e) {
        toggle(this, $(this).closest(actionSelector));
        $(timelineSelector).trigger(resizeEventName);
    });

    // listener of the assign button
    $(document).on("click." + ns, actionSelector + "-ok", function(e) {
        var form = $(this).closest("form");
        $.ajax({
            url: form.attr("action"),
            type: form.attr("method") || "post",
            data: form.serializeArray(),
            success: function() {
                $(timelineSelector).trigger(eventName + "." + timelineNs, {
                    refresh: true
                });
            },
            error: function() {
                // todo: handle error
                toggle(this, $(this).closest(actionSelector));
            }
        });
    });


    function toggle(el, selector) {
        var $alert = $(el).closest(workflowSelector).find(selector);
        if ($alert.attr("hidden")) {
            $alert.removeAttr("hidden");
        } else {
            $alert.attr("hidden", true);
        }
    }

    function hide(el, selector) {
        // relative (closest) because there could be multiple workflow alerts
        $(el).closest(workflowSelector).find(selector).attr("hidden", true);
    }

    function hideToggleables(thisToggleable) {
        // hide all other toggleable menus
        $(toggleableSelector).each(function() {
            if (this !== thisToggleable) {
                $(this).attr("hidden", true);
            }
        });
    }

    function deselectEvents() {
        $(eventSelector).removeClass("active");
    }
})(document, Granite.$);
