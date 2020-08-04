/*
 ADOBE CONFIDENTIAL

 Copyright 2015 Adobe Systems Incorporated
 All Rights Reserved.

 NOTICE:  All information contained herein is, and remains
 the property of Adobe Systems Incorporated and its suppliers,
 if any.  The intellectual and technical concepts contained
 herein are proprietary to Adobe Systems Incorporated and its
 suppliers and may be covered by U.S. and Foreign Patents,
 patents in process, and are protected by trade secret or copyright law.
 Dissemination of this information or reproduction of this material
 is strictly forbidden unless prior written permission is obtained
 from Adobe Systems Incorporated.
 */
(function(document, $) {
    "use strict";

    var redirectToSelectItem = ".aem-assets-admin-actions-edit-activator";

    /**
     * Redirects to a new page as in the href of the actionbar item.
     * The resource is set from the selected item
     */
    $(document).on("click" + redirectToSelectItem, redirectToSelectItem, function(e) {
        e.preventDefault();
        var $actionItem = $(this);
        var data = "";
        var url = "";
        if ($actionItem.data("foundationCollectionAction")) {
            data = $actionItem.data("foundationCollectionAction").data;
            url = data.href;
        }

        var selection = Dam.Util.getSelection();
        var selectionCount = Dam.Util.getSelectionCount(selection);
        var path;

        if (selectionCount === 1) {
            path = Dam.Util.getSelectionSinglePath(selection);
            // check for remote asset path for DMS7 integration where the real asset doesn't exist in JCR
            var remotePath = Dam.Util.getSelectionAttrAt(selection, 0, "data-remotepath");
            if (remotePath) {
                // override asset path to be used for editor with remote path
                path = remotePath;
            }
            url = getEditorPath(data, Dam.Util.getSelectionAttrAt(selection, 0, "data-editorkey"));
            url += encodeURIComponent(path).replace(/%2F/g, "/");
            url = Granite.HTTP.externalize(url);
        } else if (selectionCount > 1) {
            var suffix = "?";
            var i;
            for (i = 0; i < selectionCount; i++) {
                var itemPath = Dam.Util.getSelectionPathAt(selection, i);
                var reqAttr = itemPath ? "item=" + itemPath + "&" : "";
                suffix = suffix + reqAttr;
            }
            suffix = suffix + "charset=UTF-8";
            url += suffix;
        } else if (selectionCount === 0) {
            // this use case covers the asset details page. the default asset editor path works fine for images
            // fix for https://jira.corp.adobe.com/browse/CQ-4220487
            // unless you opened the preset rail, the previous selector didn't exist. Updated to use the
            // info component
            var s7data = $(".dm-setup-info");
            path = $(".foundation-content-path").data("foundation-content-path");

            if (null !== s7data && undefined !== s7data) {
                if (s7data.data("s7type") === "Video" || s7data.data("s7type") === "VideoAVS") {
                    url = getEditorPath(data, "video");
                } else if (s7data.data("s7type") === "CarouselSet") {
                    url = getEditorPath(data, "carouselset");
                }
            }
            if (url !== "") {
                url += encodeURIComponent(path).replace(/%2F/g, "/");
                url = Granite.HTTP.externalize(url);
            } else { // fallback to default editor
                url = $(this).attr("href");
            }
        }
        // set referrer as the current page
        window.referrer = location.href;

        // ContentAPI.go doesn't work here as we need to refresh the breadcrumb too.
        window.location.href = url;
    });

    /**
     * Get special editor if it's defined for asset
     * @param data data object of the button
     * @param editorKey editor key of the asset
     * @returns editor path
     */
    function getEditorPath(data, editorKey) {
        var url = "";
        if ($.trim(editorKey) !== "") {
            url = data["href-" + $.trim(editorKey)];
        }
        if (!url) {
            url = data.href;
        }
        return url;
    }
})(document, Granite.$);

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
(function(document, $, Granite) {
    "use strict";

    var registry = $(window).adaptTo("foundation-registry");
    var registryId = "aem.siteadmin.admin.collectionpage.layout.perform";
    var listRels = [ ".cq-damadmin-admin-configurecolumns" ];

    registry.register(registryId, {
        name: "list",
        perform: function(el, config) {
            listRels.forEach(function(element, index, array) {
                if ($(element).length > 0) {
                    $(element).removeAttr("hidden");
                }
            });
        },
        takedown: function(el, config) {
            listRels.forEach(function(element, index, array) {
                if ($(element).length > 0) {
                    $(element).attr("hidden", "hidden");
                }
            });
        }
    });

    $(document).on("foundation-layout-perform", ".foundation-collection", function(e) {
        var $el = $(e.target);
        var config = $el.data("foundationLayout");

        $(document).one("foundation-selections-change", ".foundation-collection", function(e) {
            Granite.UI.Foundation.Utils.everyReverse(registry.get(registryId), function(c) {
                if (c.name === config.layoutId) {
                    return c.perform.call(e.target, config) === false;
                } else {
                    return c.takedown.call(e.target, config) === false;
                }
            });
        });
    });
})(document, Granite.$, Granite);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2016 Adobe Systems Incorporated
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

// TODO: abstract/combine with
// content/jcr_root/libs/dam/gui/coral/components/admin/moreinfo/clientlibs/moreinfo/moreinfo.js

(function(window, document, Granite, $) {
    "use strict";

    var DAM_ROOT = "/content/dam/";
    var CHECK_IN = "checkin";
    var CHECK_OUT = "checkout";
    var CHECKED_OUT_ENABLED = "checkedoutenabled";
    var CHECKED_OUT_DISABLED = "checkedoutdisabled";
    var CHECKED_OUT_PARTIAL = "checkedoutpartial";
    var CHECK_IN_PARTIAL = "checkinpartial";
    var RESTRICT_SUBASSET_ACTIONS = "restrictsubassetactions";
    var RESTRICT_SUBASSET_ACTIONS_MULTIPLE = "restrictsubassetactionsmultiple";
    var CHECKOUT_LABEL = Granite.I18n.get("Checked Out");
    var RELEASE_LOCK_LABEL = Granite.I18n.get("Release Lock");
    var HIDDEN_RESTRICTED_ACTION_CLASS = "cq-damadmin-admin-checkout-restricted-hidden";

    // Assets console current "valid" selection
    var isAssetConsole = (window.location.pathname.indexOf("/assets.html") > -1 ||
        window.location.pathname.indexOf("/catalogs.html") > -1);
    // defining as an empty JQuery node collection rather than mixing arrays
    // and jquery nodes
    var currentSelectedAssets = $();
    var currentUserId = getCurrentUserId();

    var selectors = {
        assetView: ".asset-view",
        selectedItems: ".foundation-selections-item",
        selectedAssets: ".foundation-selections-item[data-item-type=asset]," +
            ".foundation-selections-item [data-item-type=asset]",
        selectedSubAssets: ".foundation-selections-item[data-item-type=subasset]," +
            ".foundation-selections-item [data-item-type=subasset]",
        buttons: ".cq-damadmin-admin-checkout-option",
        restrictedActions: ".cq-damadmin-admin-checkout-restricted",
        restrictedActionsMultiple: ".cq-damadmin-admin-checkout-restricted-multiple",
        omnisearchView: "#granite-omnisearch-result"
    };
    selectors[CHECKED_OUT_ENABLED] = ".cq-damadmin-admin-actions-" + CHECKED_OUT_ENABLED + "-activator";
    selectors[CHECKED_OUT_DISABLED] = ".cq-damadmin-admin-actions-" + CHECKED_OUT_DISABLED + "-activator";
    selectors[CHECK_OUT] = ".cq-damadmin-admin-actions-" + CHECK_OUT + "-activator";
    selectors[CHECK_IN] = ".cq-damadmin-admin-actions-" + CHECK_IN + "-activator";

    addButtonListener(CHECKED_OUT_ENABLED);
    addButtonListener(CHECK_OUT);
    addButtonListener(CHECK_IN);

    $(document).one("foundation-contentloaded", function(e) {
        // retrieve selected assets on asset details and metadataeditor
        if (!isAssetConsole) {
            currentSelectedAssets = $(selectors.assetView + ", " + selectors.selectedItems);
            var checkoutOption = getCheckoutActionForAsset(currentSelectedAssets, currentSelectedAssets);
            var assetMetadata = currentSelectedAssets.data() || {};
            replaceCheckedOutButtonLabelForAdmins(checkoutOption, assetMetadata);
        }
    });

    $(document).on("foundation-selections-change", function(e) {
        var collection = $(e.target);

        if (isOmnisearch() && !collection.is(selectors.omnisearchView)) {
            return false;
        }

        if (collection.is(".foundation-layout-card") && !collection.is(".mode-selection")) {
            currentSelectedAssets = $();
            return;
        }

        var selectedItems = collection.find(selectors.selectedItems);
        var selectedAssets = collection.find(selectors.selectedAssets);
        var selectedSubAssets = collection.find(selectors.selectedSubAssets);

        currentSelectedAssets = selectedAssets.length ? selectedAssets : $();
        displayCheckoutOption(null);
        hideRestrictedActions(null);

        if (selectedSubAssets.length) {
            if (shouldSubAssetActionsBeRestricted(selectedSubAssets)) {
                var restriction =
                    selectedSubAssets.length > 1 ? RESTRICT_SUBASSET_ACTIONS_MULTIPLE : RESTRICT_SUBASSET_ACTIONS;
                hideRestrictedActions(restriction);
            }
        } else if (currentSelectedAssets.length) {
            var checkoutOption = getCheckoutAction(selectedItems, currentSelectedAssets);
            var assetMetadata = getSelectedAssetMetadata(currentSelectedAssets.first()).data() || {};
            replaceCheckedOutButtonLabelForAdmins(checkoutOption, assetMetadata);
            if (!assetMetadata.msmIsLivecopy) {
                displayCheckoutOption(checkoutOption);
            }
            hideRestrictedActions(checkoutOption);
        }
    });

    // checkoutOption is a string like CHECKED_OUT_ENABLED etc
    // assetMetadata is a data object from the node with all the data- attributes
    // relating to the assets status, insert in assetpreview.jsp and so on
    function replaceCheckedOutButtonLabelForAdmins(checkoutOption, assetMetadata) {
        var changeTo;
        if (checkoutOption === CHECKED_OUT_ENABLED) {
            var changeToReleaseLock = assetMetadata.assetCanCheckIn && !assetMetadata.assetCheckedOutByCurrentUser;
            if (changeToReleaseLock) {
                changeTo = RELEASE_LOCK_LABEL;
            } else {
                changeTo = CHECKOUT_LABEL;
            }
        } else if (checkoutOption === CHECK_OUT) {
            changeTo = CHECKOUT_LABEL;
        }
        if (changeTo) {
            var checkedOutEnabledActivators = $(selectors[CHECKED_OUT_ENABLED]);
            checkedOutEnabledActivators.each(function(index, activator) {
                Coral.commons.ready(activator, function() {
                    activator.label.innerHTML = changeTo;
                });
            });
        }
    }

    function isOmnisearch() {
        return ($(selectors.omnisearchView).length > 0);
    }

    function getCurrentUserId() {
        var currentUserId = "";
        var currentUserInfo;
        var CURRENT_USER_JSON_PATH = Granite.HTTP.externalize("/libs/granite/security/currentuser.json");
        var result = $.ajax({
            type: "GET",
            async: false,
            url: CURRENT_USER_JSON_PATH
        });
        if (result.status === 200) {
            currentUserInfo = JSON.parse(result.responseText);
            currentUserId = currentUserInfo.authorizableId;
        }
        return currentUserId;
    }

    function addButtonListener(action) {
        $(document).on("click" + selectors[action],
            selectors[action], function() {
                var activator = $(this);
                return processCheckState(activator, action);
            }
        );
    }

    function getSelectedAssetMetadata($asset) {
        return $(".foundation-collection-assets-meta", $asset.closest(".foundation-collection-item"));
    }

    function getSelectedAssetPath($asset) {
        var path = "";
        if ($asset.data("foundationCollectionItemId")) {
            path = $asset.data("foundationCollectionItemId");
        } else if ($asset.closest("[data-foundation-collection-item-id]").data("foundationCollectionItemId")) {
            path = $asset.closest("[data-foundation-collection-item-id]").data("foundationCollectionItemId");
        }
        return path;
    }

    function getCheckoutAction(selectedItems, selectedAssets) {
        var NON_ASSET_SELECTED = "nonassetselected";
        var m = selectedItems.length;
        var n = selectedAssets.length;
        var i;
        var $asset;
        var $metaContainer;
        var actions = [];
        var checkoutAction = null;

        if (!n) {
            return null;
        }
        if (m > n) {
            actions.push(NON_ASSET_SELECTED);
        }
        for (i = 0; i < n; i++) {
            $asset = $(selectedAssets[i]);
            $metaContainer = getSelectedAssetMetadata($asset);
            checkoutAction = getCheckoutActionForAsset($metaContainer);
            if (actions.indexOf(checkoutAction) === -1) {
                actions.push(checkoutAction);
            }
        }

        if (actions.length === 1) {
            return actions[0];
        }
        if (actions.indexOf(null) > -1 ||
            actions.indexOf(CHECKED_OUT_ENABLED) > -1 ||
            actions.indexOf(CHECKED_OUT_DISABLED) > -1) {
            return CHECKED_OUT_PARTIAL;
        }
        if (actions.indexOf(CHECK_IN) > -1) {
            return CHECK_IN_PARTIAL;
        }
        return null;
    }

    // $metaContainer: a node with a data object containing all the flags
    // needed to decide what the checkoutAction is. These flags are added in the JSP
    function getCheckoutActionForAsset($metaContainer) {
        var isCheckedOut = $metaContainer.data("assetIsCheckedOut");
        var canCheckIn = $metaContainer.data("assetCanCheckIn");
        var canCheckOut = $metaContainer.data("assetCanCheckOut");
        var checkedOutBy = $metaContainer.data("assetCheckedOutBy");
        var checkoutAction;

        if (isCheckedOut) {
            if (canCheckIn) {
                currentUserId = currentUserId !== "" ? currentUserId : getCurrentUserId();
                if (checkedOutBy === currentUserId) {
                    checkoutAction = CHECK_IN;
                } else {
                    checkoutAction = CHECKED_OUT_ENABLED;
                }
            } else {
                checkoutAction = CHECKED_OUT_DISABLED;
            }
        } else if (canCheckOut) {
            checkoutAction = CHECK_OUT;
        }
        return checkoutAction;
    }

    function displayCheckoutOption(action) {
        $(selectors.buttons).hide();
        if (action &&
            action !== CHECKED_OUT_PARTIAL &&
            action !== CHECK_IN_PARTIAL) {
            $(selectors.buttons + selectors[action]).show();
        }
    }

    function shouldSubAssetActionsBeRestricted(selectedSubAssets) {
        var i;
        var $subAsset;
        var $metaContainer;
        var isParentAssetCheckedOut;
        var isParentAssetCheckedOutByCurrentUser;

        var restrictSubAssetActions = false;

        for (i = 0; i < selectedSubAssets.length; i++) {
            $subAsset = $(selectedSubAssets[i]);
            $metaContainer = getSelectedAssetMetadata($subAsset);
            isParentAssetCheckedOut = $metaContainer.data("parentAssetIsCheckedOut");
            isParentAssetCheckedOutByCurrentUser = $metaContainer.data("parentAssetCheckedOutByCurrentUser");

            if (isParentAssetCheckedOut && !isParentAssetCheckedOutByCurrentUser) {
                restrictSubAssetActions = true;
            }
        }

        return restrictSubAssetActions;
    }

    function hideRestrictedActions(action) {
        $(selectors.restrictedActions).removeClass(HIDDEN_RESTRICTED_ACTION_CLASS);
        $(selectors.restrictedActionsMultiple).removeClass(HIDDEN_RESTRICTED_ACTION_CLASS);
        if (action === CHECKED_OUT_ENABLED ||
            action === CHECKED_OUT_DISABLED ||
            action === RESTRICT_SUBASSET_ACTIONS ||
            action === RESTRICT_SUBASSET_ACTIONS_MULTIPLE) {
            $(selectors.restrictedActions).addClass(HIDDEN_RESTRICTED_ACTION_CLASS);
        }
        if (action === CHECKED_OUT_PARTIAL ||
            action === RESTRICT_SUBASSET_ACTIONS_MULTIPLE) {
            $(selectors.restrictedActions).addClass(HIDDEN_RESTRICTED_ACTION_CLASS);
            $(selectors.restrictedActionsMultiple).addClass(HIDDEN_RESTRICTED_ACTION_CLASS);
        }
    }

    function showErrorDialog(headerText, bodyText) {
        var errorDialog = new Coral.Dialog().set({
            id: "errorDialog",
            variant: "error",
            closable: "on",
            header: {
                innerHTML: headerText
            },
            content: {
                innerHTML: bodyText
            },
            footer: {
                innerHTML: '<button is="coral-button" variant="primary" coral-close>' +
                            Granite.I18n.get("Close") + "</button>"
            }
        });
        $("body").append(errorDialog);
        errorDialog.on("coral-overlay:close", function() {
            errorDialog.remove();
        });
        errorDialog.show();
    }

    function showWarningDialog(activator) {
        var warningDialog = new Coral.Dialog().set({
            id: "warningDialog",
            variant: "error",
            header: {
                innerHTML: Granite.I18n.get("Checked out asset")
            },
            content: {
                innerHTML: Granite.I18n.get("This asset has been checked out by another user. Are you sure you want to check it in?")// eslint-disable-line max-len
            },
            footer: {
                innerHTML: '<button is="coral-button" variant="default" coral-close>' +
                Granite.I18n.get("Cancel") + "</button>" +
                '<button id="warningDialogCheckin" is="coral-button" variant="primary">' +
                Granite.I18n.get("Checkin") + "</button>"
            }
        });
        $("body").append(warningDialog);
        warningDialog.on("coral-overlay:close", function() {
            warningDialog.remove();
        });
        warningDialog.on("click", "#warningDialogCheckin", function() {
            processCheckState(activator, CHECK_IN);
            warningDialog.remove();
        });
        warningDialog.show();
    }

    function processCheckState(activator, action) {
        var i;
        var n = currentSelectedAssets.length;
        var path = "";
        var $asset;

        if (action === CHECKED_OUT_ENABLED) {
            if (activator.data("path") || n) {
                showWarningDialog(activator);
            }
            return true;
        }

        if (activator.data("path")) {
            checkInOrOut(activator.data("path"), action, true);
        } else if (n) {
            for (i = 0; i < n; i++) {
                $asset = $(currentSelectedAssets[i]);
                path = getSelectedAssetPath($asset);
                checkInOrOut(path, action, i === n - 1);
            }
        } else {
            window.console.error("unable to " + action + " - path(s) missing");
            return;
        }
        return true;
    }

    function checkInOrOut(path, action, reload) {
        var errorHeader;
        var errorBody;
        if (action === CHECK_IN) {
            errorHeader = Granite.I18n.get("Checkin failed");
            errorBody = Granite.I18n.get("Failed to checkin asset.");
        } else {
            errorHeader = Granite.I18n.get("Checkout failed");
            errorBody = Granite.I18n.get("Failed to checkout asset.");
        }

        var collections = [];
        var collectionApi;
        reload = reload || false;

        if (path.indexOf(DAM_ROOT) !== 0) {
            window.console.error("unable to " + action + " non-dam item: " + path);
            return;
        }

        $.ajax({
            url: Granite.HTTP.externalize(path + ".checkout.json"),
            type: "post",
            dataType: "json",
            data: {
                action: action
            },
            success: function(data, status, xhr) {
                if (data.result !== "ok") {
                    var dataResultDisplay;
                    if (data.result === "conflict") {
                        dataResultDisplay = Granite.I18n.get("(conflict)", null, "appended to message body. Displayed when an asset cannot be checked in or out, as already in use.");// eslint-disable-line max-len
                    } else {
                        dataResultDisplay = "(" + data.result + ")";
                    }
                    showErrorDialog(errorHeader, errorBody + " " + dataResultDisplay);
                } else if (reload) {
                    if (isAssetConsole) {
                        collections = $(".foundation-collection");
                        collections.each(function() {
                            collectionApi = $(this).adaptTo("foundation-collection");
                            if (collectionApi && "reload" in collectionApi) {
                                collectionApi.reload();
                            }
                        });
                    } else {
                        window.location.reload();
                    }
                }
            },
            error: function(xhr, status, errorThrown) {
                showErrorDialog(errorHeader, errorBody + " (" + errorThrown + ")");
            }
        });
    }
})(window, document, Granite, Granite.$);

