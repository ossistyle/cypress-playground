/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2012 Adobe Systems Incorporated
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

    window.assetsChecked = true;
    window.renditionsChecked = false;
    window.subassetsChecked = false;

    var cmd = "Deactivate";
    var replicationUrl = "/bin/replicate.json";
    var actSuccessModal;
    var pathname = location.pathname;
    var multipleText;
    var rel = ".cq-damadmin-admin-actions-unpublish";
    var rel1 = ".cq-damadmin-admin-actions-unpublishlater";
    var $modal;
    var activator;
    var later;
    var unpublishModal = ".cq-damadmin-admin-actions-unpublish-modal";
    var loadedKey = "dam.gui.actions.unpublish.data.internal.loaded";
    var unpublishWizardURL = "/mnt/overlay/dam/gui/content/assets/unpublishassetwizard.external.html";
    var assetList = [];

    $(document).on("click." + unpublishModal, unpublishModal, function(e) {
        activator = $(this);

        // lazy load content
        _initialize(activator.get(0));

        $("#unpublish").modal("show");
    });

    function checkAssetReferences() {
        // var url = Granite.HTTP.externalize("/libs/wcm/core/content/reference.json");
        var url = Granite.HTTP.externalize("/libs/wcm/asset/active/reference.json");
        var data = {};
        data["path"] = assetList;

        $.ajax(url, {
            "data": data,
            "method": "POST",
            "cache": false,
            "dataType": "json",
            "beforeSend": function() {
                var spinner = $(window).adaptTo("foundation-ui");
                spinner.wait();
                $(".coral-Popover").popover("hide");
            },
            "complete": [ clearMask, referencesRetrieved ]
        });
    }

    function checkReferencedFromAssets() {
        var referencedFromCount = getAssetReferencedCount(assetList);
        if (referencedFromCount > 0) {
            var content;
            if (assetList.length > 1) {
                content = Granite.I18n.get("These items are referenced at least once by an activated item.");
            } else {
                content = Granite.I18n.get("This item is referenced at least once by another activated item.");
            }

            var forceUnpublishDialog = new Coral.Dialog().set(({
                id: "forceUnpublishDialog",
                variant: "error",
                header: {
                    innerHTML: Granite.I18n.get("Force Unpublish")
                },
                content: {
                    innerHTML: content
                },
                footer: {
                    innerHTML: '<button is="coral-button" variant="primary"' +
                                'coral-close size="M">' + Granite.I18n.get("Cancel") + "</button>"
                }
            }));
            var footer = forceUnpublishDialog.footer;

            var forceUnpublishButton = new Coral.Button();
            forceUnpublishButton.label.textContent = Granite.I18n.get("Unpublish");
            footer.appendChild(forceUnpublishButton).on("click", function() {
                forceUnpublishDialog.hide();
                checkAssetReferences();
            });

            forceUnpublishDialog.show();
            $(forceUnpublishDialog).css("z-index", "10011");
        } else {
            checkAssetReferences();
        }
    }

    function getAssetReferencedCount(paths) {
        var referencedFromList = [];
        for (var path in paths) {
            assetReferencedFromList(paths[path]);
        }

        return referencedFromList.length;

        function assetReferencedFromList(path) {
            var request = new XMLHttpRequest();
            var url = "/bin/wcm/references.json?path=" + path + "&_charset_=utf-8&predicate=wcmcontent";
            request.open("GET", Granite.HTTP.externalize(url), false);
            request.send(null);
            var jsonData = JSON.parse(request.responseText);
            jsonData["pages"].forEach(function(page) {
                if (page.published) {
                    var found = false;
                    for (path in referencedFromList) {
                        if (referencedFromList[path] === page.path) {
                            found = true;
                            break;
                        }
                    }
                    for (path in assetList) {
                        if (assetList[path] === page.path) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        referencedFromList.push(page.path);
                    }
                }
            });
        }
    }

    function clearMask() {
        $(window).adaptTo("foundation-ui").clearWait();
    }

    function referencesRetrieved(xhr, status) {
        if (status === "success") {
            var json = $.parseJSON(xhr.responseText);
            addHiddenResources(json);
            unpublishAssets(assetList);
        }
    }

    function addHiddenResources(json) {
        var assets = json["assets"];
        for (var a = 0; a < assets.length; a++) {
            var asset = assets[a];
            if (asset && asset.path && isHiddenAsset(asset.path)) {
                assetList.push(asset.path);
            }
        }

        function isHiddenAsset(path) {
            if (path.startsWith("/content/dam/_VTT") ||
                path.startsWith("/content/dam/_CSS")) {
                return true;
            }
            return false;
        }
    }

    function unpublishAssets(assetsPathsList) {
        if (assetsPathsList.length > 0) {
            var url = Granite.HTTP.externalize(replicationUrl);
            var settings = {
                "type": "POST",
                "data": {
                    "_charset_": "utf-8",
                    "cmd": cmd,
                    "path": assetsPathsList
                },
                "beforeSend": function() {
                    var spinner = $(window).adaptTo("foundation-ui");
                    spinner.wait();
                },
                "complete": [
                    function() {
                        $(window).adaptTo("foundation-ui").clearWait();
                    },
                    replicationStarted
                ]
            };
            $.ajax(url, settings);
        }
    }

    function replicationStarted(xhr, status) {
        if (status === "success") {
            var api = $(".cq-damadmin-admin-childpages").adaptTo("foundation-collection");
            if (api && "reload" in api) {
                api.reload();
            } else {
                var contentApi = $(".foundation-content").adaptTo("foundation-content");
                if (contentApi) {
                    contentApi.refresh();
                }
            }
            if (!actSuccessModal) {
                actSuccessModal = new CUI.Modal({
                    element: $("#unpublish-success"),
                    type: "success"
                });
            } else {
                actSuccessModal.set({ visible: true });
            }
        } else {
            $(rel + "-error").modal({
                type: "error"
            }).modal("show");
            return;
        }
    }


    $(document).on("click." + rel, rel + " button.coral-Button--primary", function(e) {
        activator = $(rel + "-activator");
        $("#unpublish").modal("hide");
        assetList = [];
        // assetdetails & annotate page
        if (pathname.indexOf("/assetdetails.html") > -1) {
            assetList.push(decodeURIComponent(pathname.substring(pathname.indexOf("/assetdetails.html") + 18)));
        } else if (pathname.indexOf("/annotate.html") > -1) {
            assetList.push(decodeURIComponent(pathname.substring(pathname.indexOf("/annotate.html") + 14)));
        } else {
            var items = getSelectedItems();
            var quickactionsItem = $modal.data("foundationCollectionItem");
            if (quickactionsItem) {
                assetList = [ $(quickactionsItem).data("path") ];
            } else {
                assetList = [];
                for (var i = 0; i < items.length; i++) {
                    var path = $(items[i]).data("foundation-collection-item-id");
                    if (path === undefined) {
                        path = $(items[i]).data("path");
                    }
                    assetList.push(path);
                }
            }
        }

        checkReferencedFromAssets();
    });

    // Post to the provided URL with the specified parameters.
    function post(path, parameters) {
        var form = $("<form></form>");
        form.attr("method", "post");
        form.attr("action", path);
        $.each(parameters, function(key, value) {
            if ($.isArray(value)) {
                $.each(value, function(keyArray, valueArray) {
                    var field = $("<input></input>");
                    field.attr("type", "hidden");
                    field.attr("name", key);
                    field.attr("value", valueArray);
                    form.append(field);
                }
                );
            } else {
                var field = $("<input></input>");
                field.attr("type", "hidden");
                field.attr("name", key);
                field.attr("value", value);
                form.append(field);
            }
        });
        // The form needs to be a part of the document in
        // order for us to be able to submit it.
        $(document.body).append(form);
        form.submit();
    }
    $(document).on("click" + rel1, rel1 + "-activator", function(e) {
        activator = $(rel1 + "-activator");
        if (activator.hasClass("unpublish-later")) {
            later = true;
        } else {
            later = activator.data("later") || false;
        }

        var paths;
        var params = "";
        var url = Granite.HTTP.externalize(unpublishWizardURL);
        // assetdetails & annotate page
        if (pathname.indexOf("/assetdetails.html") > -1) {
            var path = decodeURIComponent(pathname.substring(pathname.indexOf("/assetdetails.html") + 18));
            params += "item=" + encodeURI(path);
            paths = [ path ];
        } else if (pathname.indexOf("/annotate.html") > -1) {
            path = decodeURIComponent(pathname.substring(pathname.indexOf("/annotate.html") + 14));
            params += "item=" + encodeURI(path);
            paths = [ path ];
        } else {
            var items = getSelectedItems();
            paths = [];
            for (var i = 0; i < items.length; i++) {
                path = $(items[i]).data("foundation-collection-item-id");
                if (path === undefined) {
                    path = $(items[i]).data("path");
                }
                paths.push(path);
                if (params.length > 0) {
                    params += "&";
                }
                params += "item=" + encodeURI(path);
            }
        }
        if (later) {
            var data = {
                "item": paths,
                "_charset_": "utf-8",
                "later": "true",
                "editMode": ""
            };
            if (url) {
                post(url, data);
            }
        }
    });

    $(document).on("beforeshow." + rel, ".coral-Modal" + rel, function(e) {
        $(".coral-Popover").popover("hide");
        $modal = $(this);
        var $multiple = $modal.find(".multiple");
        var selectedItems = getSelectedItems();
        var $pageList = $modal.find(".page-list");
        $pageList.empty();
        if (selectedItems.length === 0) {
            var path;
            // assetdetails & annotate page
            if (pathname.indexOf("/assetdetails.html") > -1) {
                path = decodeURIComponent(pathname.substring(pathname.indexOf("/assetdetails.html") + 18));
            } else if (pathname.indexOf("/annotate.html") > -1) {
                path = decodeURIComponent(pathname.substring(pathname.indexOf("/annotate.html") + 14));
            }
            $modal.find(".single").show();
            $multiple.hide();
            if (path !== undefined) {
                // CQ-110883 - XSS encoding in js using JQuery methods
                var tempElem = document.createTextNode(path.substr(path.lastIndexOf("/") + 1));
                $pageList.append(tempElem);
            }
        } else {
            if (selectedItems.length === 1) {
                $modal.find(".single").show();
                $multiple.hide();
            } else {
                $modal.find(".single").hide();
                $multiple.show();
            }
            if (!multipleText) {
                multipleText = $multiple.text();
            }
            $multiple.text(multipleText.replace(/%no%/gi, selectedItems.length));
            var MAX_ENTRIES = 10;
            var itemCnt = Math.min(selectedItems.length, MAX_ENTRIES);
            for (var i = 0; i < itemCnt; i++) {
                var $item = $(selectedItems[i]);
                if (i > 0) {
                    $pageList.append($("<br>"));
                }
                path = $item.data("foundation-collection-item-id");
                var title = $(
                    ".foundation-collection-assets-meta[data-foundation-collection-meta-path=\"" +
                        path + "\"]", getCollection())
                    .data(
                        "foundation-collection-meta-title");
                if (title === undefined) {
                    title = $item.data("path");
                    title = title.substr(title.lastIndexOf("/") + 1);
                }
                // CQ-110883 - XSS encoding in js using JQuery methods
                tempElem = document.createTextNode(title);
                $pageList.append(tempElem);
            }
            if (selectedItems.length > itemCnt) {
                $pageList.append($("<br>")).append(" …");
            }
        }
    });

    function _initialize(activator) {
        var $document = $(document);
        var src;

        if ($document.data(loadedKey)) {
            return;
        }

        $document.data(loadedKey, true);

        if (activator.dataset.foundationCollectionAction &&
            $.parseJSON(activator.dataset.foundationCollectionAction).data &&
            $.parseJSON(activator.dataset.foundationCollectionAction).data.src) {
            src = $.parseJSON(activator.dataset.foundationCollectionAction).data.src;
        } else {
            // activator is not configured for lazy loading.. returing
            return;
        }

        $.ajax({
            url: src,
            async: false,
            cache: false
        }).done(function(html) {
            var parser = $(window).adaptTo("foundation-util-htmlparser");

            parser.parse(html).then(function(fragment) {
                document.body.appendChild(fragment);
            });
        })
            .fail(function() {
                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.get("Something went wrong.");

                var ui = $(window).adaptTo("foundation-ui");
                ui.alert(title, message, "error");
            });
    }

    function getSelectedItems() {
        return getCollection().find(".foundation-selections-item");
    }

    function getCollection() {
        var $collection = $("#granite-omnisearch-result");
        if ($collection.length === 0) {
            $collection = $(".cq-damadmin-admin-childpages.foundation-collection");
        }
        return $collection;
    }
})(document, Granite.$);
