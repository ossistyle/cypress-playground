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

    var DAM_ROOT_EXACT = "/content/dam";
    var DAM_ROOT = DAM_ROOT_EXACT + "/";

    var rel = ".dam-asset-desktop-action";
    $(document).on("click" + rel, rel, function(e) {
        var activator = $(this);
        var paths = [];
        var assetDetailPath = activator.data("path");

        var selection = Dam.Util.getSelection();

        if (assetDetailPath) {
            paths = [ assetDetailPath ];
        } else {
            selection = Dam.Util.getSelection();

            if (selection && Dam.Util.getSelectionCount(selection) > 5) {
                var dialog = new Coral.Dialog().set({
                    id: "desktopErrorDialog",
                    variant: "error",
                    closable: "on",
                    header: {
                        innerHTML: Granite.I18n.get("Limit Reached.")
                    },
                    content: {
                        innerHTML: Granite.I18n.get("Cannot open more than 5 assets.")
                    },
                    footer: {
                        innerHTML: "<button is='coral-button' class='closeExport' variant='default' coral-close>" +
                            Granite.I18n.get("Close") + "</button>"
                    }
                });
                $("body").append(dialog);

                dialog.on("coral-overlay:close", function() {
                    dialog.remove();
                });

                dialog.show();
                e.stopImmediatePropagation(); // stops the asset from being checked out
                return true;
            }
            paths = Dam.Util.getMultipleSelectionPath(selection);

            if (paths.length === 0) {
                paths.push(activator.data("path"));
            }
        }
        openAssetLink(activator, paths);
        return true;
    });

    function openAssetLink(activator, paths) {
        var href = "aem-asset:/";

        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];

            if (activator.data("use-current-path")) {
                path = $(".foundation-collection").data("foundationCollectionId");
            }
            if (!path) {
                return;
            }
            if (path.indexOf(DAM_ROOT) !== 0 && path !== DAM_ROOT_EXACT) {
                return;
            }
            var query = activator.data("href-query") || "";
            var withoutRoot = "";
            if (path !== DAM_ROOT_EXACT) {
                withoutRoot = path.substr(DAM_ROOT.length);
            }

            href += (i === 0 ? encodeURI(withoutRoot) + query : "&asset=/" + encodeURI(withoutRoot));
        }

        var $launchFrame = $("#launchFrame");
        if ($launchFrame.length === 0) {
            $launchFrame = $("<iframe />", {
                name: ("launchFrame"),
                id: ("launchFrame"),
                width: 0,
                height: 0
            }).appendTo("body");
        }
        $launchFrame.get(0).src = href;
    }
})(document, Granite.$);
