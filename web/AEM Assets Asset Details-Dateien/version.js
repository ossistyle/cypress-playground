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
 * Handle version creation in the toolbar.
 */

(function(document, $) {

    var actionSelector = ".cq-common-admin-timeline-toolbar-actions-version";
    var eventName = "cq-common-admin-timeline-change";
    var ns = "cq-common-admin-timeline-toolbar-actions-version";
    var eventsSelector = ".cq-common-admin-timeline-events";
    var eventsNs = "cq-common-admin-timeline-events";
    var timelineSelector = ".cq-common-admin-timeline";

    var VERSIONHISTORY_PATH = "/mnt/overlay/wcm/core/content/sites/versionhistory/_jcr_content.txt";
    var DIFFRESOURCES_PATH = "/mnt/overlay/wcm/core/content/sites/diffresources.html";

    var ui = $(window).adaptTo("foundation-ui");

    // versions layer: listener of the create button
    $(document).on("click." + ns, actionSelector + "-ok", function(e) {
        submitTimelineForm();
    });

    // versions layer: listener of form submit event
    $(document).on("submit", actionSelector + "-form", function(e) {
        e.preventDefault();
        submitTimelineForm();
    });

    function submitTimelineForm() {
        var paths = [];
        if ($(timelineSelector).data("paths")) {
            paths = $(timelineSelector).data("paths");
        }
        var $form = $(actionSelector + "-form");
        createVersions(paths, $form);
    }

    function createVersions(paths, $form) {
        var action = $form.attr("action");

        var numberOfPaths = paths.length;

        if (numberOfPaths === 1 && paths[0] === "") {
            $(actionSelector).attr("hidden", true);
            return;
            // note: this case of creating a verion with an empty path is no longer possible
        }

        for (var i = 0; i < numberOfPaths; i++) {
            var path = paths[i];

            if (action.indexOf("$resourcepath") !== -1) {
                if (action.charAt(action.indexOf("$resourcepath") - 1) === "/") {
                    path = action.replace(/\/\$resourcepath/g, path);
                } else {
                    path = action.replace(/\$resourcepath/g, path);
                }
            }

            // Remove all the hidden 'path' inputs
            $form.find("[name='path']").remove();
            $("<input></input>").attr("type", "hidden").attr("name", "path").attr("value", path).appendTo($form);
        }

        submitVersions($form, action, numberOfPaths);

        // Clear version dialog fields
        $form.find("input[is='coral-textfield']")[0].value = "";

    }

    function submitVersions($form, target, numberOfPaths) {
        if (!$form) {
            return;
        }

        $.ajax({
            url: encodeURIComponent(target).replace(/%2F/g, "/"),
            type: $form.attr("method") || "post",
            data: $form.serializeArray(),
            success: function(event) {
                submitVersionsCallback($form, numberOfPaths, event);
            },
            error: function(event) {
                submitVersionsCallback($form, numberOfPaths, event, true);
            }
        });
    }

    function submitVersionsCallback($form, numberOfPaths, event, error) {
        if (!numberOfPaths || numberOfPaths < 1) {
            return;
        }

        if (error) {
            var msg = $form.data("errormessage");
            var $responseText = $(event.responseText);
            var $errorMessage = $responseText.find("#Message");

            if ($errorMessage.length) {
                msg = $errorMessage[0].innerText;
            }

            ui.notify("", msg ? Granite.I18n.getVar(msg) : Granite.I18n.get("Failed to create version"), "error");
        }

        if (numberOfPaths > 1) {
            if (!error) {
                ui.notify("", Granite.I18n.get("Versions created for multiple items"), "success");
            }

            hideActionButton();
        } else {
            if (!error) {
                ui.notify("", Granite.I18n.get("Version successfully created"), "success");
            }

            $(eventsSelector).trigger(eventName + "." + eventsNs);
        }
    }

    function previewVersionCallback(redirectTo, success) {
        if (success) {
            var win = window.open(Granite.HTTP.externalize(redirectTo + ".html")); 
            $(eventsSelector).trigger("cq-common-admin-timeline-preview-opened." + eventsNs, win);
        } else {
            ui.alert(Granite.I18n.get("Preview"), Granite.I18n.get("Failed to preview version"), "error");
        }
    }

    function compareVersionCallback(currentPath, versionId, redirectTo, success) {
        if (success) {
            var url = DIFFRESOURCES_PATH + currentPath + "?item=" + redirectTo + "&sideBySide&versionId=" + versionId;
            window.document.location.href = Granite.HTTP.externalize(url); 
        } else {
            ui.alert(Granite.I18n.get("Preview"), Granite.I18n.get("Failed to compare version"), "error");
        }
    }

    $(document).on("click." + eventsNs, ".cq-common-admin-timeline-preview-button", function(e) {
        var vid = $(e.currentTarget).data("vid");
        if (vid) {
            $.ajax({
                url: Granite.HTTP.externalize(VERSIONHISTORY_PATH),
                type: "post",
                dataType: "text",
                data: { versionId: vid, wcmmode: "disabled" },
                success: function(redirectTo) {
                    previewVersionCallback(redirectTo, true);
                },
                error: function(redirectTo) {
                    previewVersionCallback(redirectTo, false);
                }
            });
        }
    });

    $(document).on("click." + eventsNs, ".cq-common-admin-timeline-compare-button", function(e) {
        var vid = $(e.currentTarget).data("vid");
        var currentPath = $(e.currentTarget).data("path");
        if (vid && currentPath) {
            $.ajax({
                url: Granite.HTTP.externalize(VERSIONHISTORY_PATH),
                type: "post",
                dataType: "text",
                data: { versionId: vid, wcmmode: "disabled" },
                success: function(redirectTo) {
                    compareVersionCallback(currentPath, vid, redirectTo, true);
                },
                error: function(redirectTo) {
                    compareVersionCallback(currentPath, vid, redirectTo, false);
                }
            });
        }
    });

    // click handler of submit button in create version dialog (action bar) (since 6.2)
    $(document).on("click." + ns, ".cq-common-createversiondialog-submit", function(e) {
        var paths = [];
        $(".cq-siteadmin-admin-childpages.foundation-collection .foundation-collection-item.is-selected").each(function() {
            paths.push($(this).data("foundation-collection-item-id"));
        });
        var form = $(".cq-common-createversiondialog-form");
        submitDialog(".cq-common-createversiondialog", paths, form);
    });

    submitDialog = function(dialog, paths, form) {
        var $dialog = $(dialog);
        if ($dialog.length !== 0) {
            $dialog[0].hide();
        }
        createVersions(paths, form);

        // show timeline after version creation
        var timelinePanelTrigger = $('coral-cyclebutton-item[data-granite-toggleable-control-name="timeline"]');
        if (timelinePanelTrigger.length > 0) {
            timelinePanelTrigger[0].selected = true;
        }
    };


})(document, Granite.$);
