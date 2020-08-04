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
(function(document, Granite, $) {
    "use strict";
    window.assetsChecked = true;
    window.renditionsChecked = false;
    window.subassetsChecked = false;
    var cmd = "Activate";
    var replicationUrl = "/bin/replicate.json";
    var actSuccessModal;
    var actErrModal;
    var actInfoModal;
    var actSelectModal;
    var rel = ".cq-damadmin-admin-actions-publish";
    var mustPublish = [];
    var later;
    var loadedKey = "dam.gui.actions.publish.data.internal.loaded";
    var publishWizardURL = "/mnt/overlay/dam/gui/content/assets/publishassetwizard.external.html";

    function publishAssets(assetsPathsList, responseHandler) {
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
                    $("coral-popover[open]").hide();
                },
                "complete": [ clearMask, responseHandler ? responseHandler : replicationStarted ]
            };
            $.ajax(url, settings);
        } else {
            if (!actInfoModal) {
                actInfoModal = $("#activation-info")[0];
            }
            actInfoModal.show();
        }
    }

    function replicationStarted(xhr, status) {
        if (status === "success") {
            var api = $(".cq-damadmin-admin-childpages").adaptTo("foundation-collection");
            if (api && "reload" in api) {
                try {
                    api.reload();
                } catch (e) {
                    // CQ-4251688 - Ignore in case the reload
                    // fails on unrelated pages like bulk metadata editor.
                }
            } else {
                var contentApi = $(".foundation-content").adaptTo("foundation-content");
                if (contentApi) {
                    contentApi.refresh();
                }
            }
            if (!actSuccessModal) {
                actSuccessModal = $("#activation-success")[0];
                if ($(".dm-setup-info") && $(".dm-setup-info").data("assetType")) {
                    // override in case of dynamic media to refresh the page due
                    // to viewer doesn't work with contentApi.refresh()
                    var actSuccessModalCloseBtn = $(actSuccessModal).find("button:contains('Close')")[0];
                    actSuccessModalCloseBtn.addEventListener("click", function() {
                        location.reload();
                    });
                }
            }
            actSuccessModal.show();
        } else {
            if (!actErrModal) {
                actErrModal = $("#activation-error")[0];
            }
            actErrModal.show();
        }
    }

    function replicateToPublish(activator) {
        var $collection = $("#granite-omnisearch-result");
        if ($collection.length === 0) {
            $collection = $(".cq-damadmin-admin-childpages.foundation-collection");
        }
        var items = $collection.find(".foundation-selections-item");
        var quickactionsItem = activator.parents(".foundation-collection-item")
            .find(".foundation-collection-assets-meta");
        var paths; var params = "";
        if (activator.hasClass("publish-later")) {
            later = true;
        } else {
            later = activator.data("later") || false;
        }
        var url = Granite.HTTP.externalize(publishWizardURL);
        var assetSets = [];
        mustPublish = []; // initiate it

        // master branch only
        var type = $(".foundation-selections-item").data("item-type");

        if (items.length === 0) {
            var path;
            var pathname = location.pathname;
            // assetdetails & annotate page
            if (pathname.indexOf("/assetdetails.html") > -1) {
                path = decodeURIComponent(pathname.substring(pathname.indexOf("/assetdetails.html") + 18));
                assetSets.push(path);
                mustPublish.push(path);
            } else if (pathname.indexOf("/annotate.html") > -1) {
                path = decodeURIComponent(pathname.substring(pathname.indexOf("/annotate.html") + 14));
                assetSets.push(path);
                mustPublish.push(path);
            } else {
                path = $(quickactionsItem).data("foundation-collection-meta-path");

                if (($(quickactionsItem).data("asset-type") === "set" ||
                        $(quickactionsItem).data("type") === "collection" ||
                        $(quickactionsItem).data("type") === "set" ||
                        // CQ-78479 - As assets might have tags which need to be published also
                        $(quickactionsItem).data("type") === "asset" ||
                        $(quickactionsItem).data("is-viewer-video") === true ||
                        $(quickactionsItem).data("asset-mimetype") === "text/css")) {
                    assetSets.push(path);
                    mustPublish.push(path);
                }
            }
            paths = [ path ];
            params += "item=" + encodeURI(path);
        } else {
            paths = [];
            for (var i = 0; i < items.length; i++) {
                path = $(items[i]).data("foundation-collection-item-id");
                // only DM Asset will have dm-asset-type : @see assetBase.jsp
                var dmAssetType = $(items[i]).find(".foundation-collection-meta").data("dm-asset-type");
                if (dmAssetType === undefined) {
                    dmAssetType = $(items[i]).find(".foundation-collection-assets-meta").data("dmAssetType");
                }
                if (path === undefined) {
                    path = $(items[i]).data("path");
                }
                paths.push(path);
                var isAsset = $(items[i]).data("type") === "asset";
                if (!isAsset) {
                    var assetMeta = $(items[i]).find(".foundation-collection-assets-meta");
                    if (assetMeta.length) {
                        isAsset = !!((
                            assetMeta &&
                            assetMeta.data("foundation-collection-meta-type") === "asset"
                        ));
                    } else {
                        isAsset = ($(items[i]).data("item-type") === "asset");
                    }
                }
                if (dmAssetType === "set" ||
                        // CQ-78479 - As assets might have tags which need to be published also
                        isAsset ||
                        $(items[i]).data("type") === "collection" ||
                        $(items[i]).data("type") === "set" ||
                        dmAssetType === "video" ||
                        $(items[i]).data("asset-mimetype") === "text/css") {
                    assetSets.push(path);
                    mustPublish.push(path);
                }
                if (params.length > 0) {
                    params += "&";
                }
                params += "item=" + encodeURI(path);
            }
        }
        if (later) {
            if (params.length > 0) {
                var data = {
                    "item": paths,
                    "_charset_": "utf-8",
                    "later": "true",
                    "type": type
                };
                if (url) {
                    post(url, data);
                }
            }
        } else if (assetSets.length > 0) {
            activate();
        } else {
            publishAssets(paths);
        }

        function activate() {
            var url = Granite.HTTP.externalize("/libs/wcm/core/content/reference.json");
            var prm = "path";
            var data = { };
            data[prm] = assetSets;

            $.ajax(url, {
                "data": data,
                "method": "POST",
                "cache": false,
                "dataType": "json",
                "beforeSend": function() {
                    var spinner = $(window).adaptTo("foundation-ui");
                    spinner.wait();
                    $("coral-popover[open]").hide();
                },
                "complete": [ clearMask, referencesRetrieved ]
            });
        }

        function referencesRetrieved(xhr, status) {
            if (status === "success") {
                var json = $.parseJSON(xhr.responseText);
                var tableData = checkReferences(json);
                if (tableData.hasReferences) {
                    var data = {
                        "item": paths,
                        "_charset_": "utf-8",
                        "referrer": location.pathname
                    };
                    if (url) {
                        post(url, data);
                    }
                } else {
                    var assetPath = [ ];
                    // start replication directly if no references were found
                    for (var c = 0; c < mustPublish.length; c++) {
                        if (assetPath.indexOf(mustPublish[c]) === -1) {
                            assetPath.push(mustPublish[c]);
                        }
                    }
                    publishAssets(assetPath);
                }
            } else {
                // TODO error handling
            }
        }

        function checkReferences(json) {
            var assets = json["assets"];
            var hasReferences = false;
            for (var a = 0; a < assets.length; a++) {
                var asset = assets[a];
                // if server returns a list containing at least one asset which is not yet published
                // and is not one of the selected nodes to publish, then display the wizard explicitly
                if ((!asset.published || asset.outdated) && params.indexOf(asset.path) === -1 &&
                        [ "asset", "tag", "s7set", "collection", "contentfragmentmodel" ].indexOf(asset.type) !== -1) {
                    hasReferences = true;
                } else {
                    mustPublish.push(asset.path);
                }
            }
            return {
                "hasReferences": hasReferences
            };
        }
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
    }

    function clearMask() {
        $(window).adaptTo("foundation-ui").clearWait();
    }

    $(document).on("click", rel + "-activator", function(e) {
        var activator = $(this);

        // lazy load content
        _initialize(activator.get(0));


        if ($(this).hasClass("s7on")) {
            if (!actSelectModal) {
                actSelectModal = new CUI.Modal({
                    element: $("#selectpublish")
                });
            } else {
                actSelectModal.set({ visible: true });
            }
        } else {
            replicateToPublish(activator);
        }
    });

    $.fn.CQUIDamAdminPostReplicationReq = function(paths, handler) {
        publishAssets(paths, handler);
    };

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
        } else if (activator.dataset.src) {
            src = activator.dataset.src;
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
})(document, Granite, Granite.$);
