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
 * Handle starting of workflows in the toolbar.
 */

(function(document, $) {
    var selectionLength;
    var selector = ".cq-common-admin-timeline-toolbar-actions-workflow";
    var ns = "cq-common-admin-timeline-toolbar-actions-workflow";
    var eventName = "cq-common-admin-timeline-change";
    var timelineSelector = ".cq-common-admin-timeline";
    var timelineNs = "cq-common-admin-timeline";

    // workflow layer: listener of the select workflow field: handle "mandatory"
    $(document).on("change", selector + "-select", function(e) {
        $(selector + "-ok")[0].disabled = false;
    });

    // workflow layer: listener of the start button
    $(document).on("click." + ns, selector + "-ok", function(e) {
        submitTimelineForm();
    });

    // workflow layer: listener of form submit event
    $(document).on("submit", selector + "-form", function(e) {
        e.preventDefault();
        submitTimelineForm();
    });

    function submitTimelineForm() {
        var $button = $(selector + "-ok");
        var $form = $(selector + "-form");

        var event = $.Event("before-timeline-workflow-actions");
        $button.trigger(event);

        if (event.isDefaultPrevented()) {
            return;
        }

        if ($button.hasClass("disabled")) {
            // mandatory select workflow field empty
            return;
        }

        var paths = [];
        if ($(timelineSelector).data("paths")) {
            paths = $(timelineSelector).data("paths");
        }

        createWorkflow(paths, $form);
    }

    function createWorkflow(paths, form) {
        var data = form.serializeArray();

        selectionLength = paths.length;

        for (var i = 0; i < paths.length; i++) {
            if (!paths[i]) {
                // empty "paths" attribute results in [""] >> abort
                $(selector).attr("hidden", true);
                return;
                // note: this case of starting a workflow with an empty path is no longer possible
            }
            data.push({
                name: "payload",
                value: paths[i]
            });
        }

        $.ajax({
            url: form.attr("action"),
            type: form.attr("method") || "post",
            data: data,
            success: function() {
                // reset select workflow field
                // clearing the select is not supported yet therefore do not disable the button
                // $(selector + "-select")[0].clear();
                // $(selector + "-ok")[0].disabled = true;

                form.find("input[type=text]").val("");
                startWorkflowCallback(true);

            },
            error: function() {
                var msg = form.data("errormessage");
                $(window).adaptTo("foundation-ui").notify("", msg ? Granite.I18n.getVar(msg) : Granite.I18n.get("Failed to create workflow"), "error");
                startWorkflowCallback(false);
            }
        });
    }

    function startWorkflowCallback(status) {
        // todo: handle errors
        if (selectionLength > 1) {
            if (status) {
                $(window).adaptTo("foundation-ui").notify("", Granite.I18n.get("Workflows created for multiple items"), "success");
            }
            hideActionButton();
        } else {
            // single selection: refresh events and alerts
            if (status) {
                $(window).adaptTo("foundation-ui").notify("", Granite.I18n.get("Workflow successfully created"), "success");
            }
            $(timelineSelector).trigger(eventName + "." + timelineNs, {
                refresh: true
            });

        }
    }


    // click handler of submit button in create workflow dialog (action bar) (since 6.2)
    $(document).on("click." + ns, ".cq-common-createworkflowdialog-submit", function(e) {
        submitDialog();
    });

    $(document).on("submit", ".cq-common-createworkflowdialog-form", function(e) {
        e.preventDefault();
        submitDialog();
    });

    function submitDialog() {
        var $dialog = $(".cq-common-createworkflowdialog");
        if ($dialog.length !== 0) {
            $dialog[0].hide();
        }

        var paths = [];

        $(".cq-siteadmin-admin-childpages.foundation-collection .foundation-collection-item.is-selected").each(function() {
            paths.push($(this).data("foundation-collection-item-id"));
        });

        var form = $(".cq-common-createworkflowdialog-form");
        createWorkflow(paths, form);

        // show timeline after workflow creation
        // private CSS usage/s
        var timelinePanelTrigger = $('.granite-toggleable-control [data-granite-toggleable-control-target*="timeline"]');
        if (timelinePanelTrigger.length > 0) {
            timelinePanelTrigger[0].selected = true;
        }
    }

})(document, Granite.$);
