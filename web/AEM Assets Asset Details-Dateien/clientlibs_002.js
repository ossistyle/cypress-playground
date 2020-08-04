/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
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

    var assetNavigatorRel = ".asset-navigator";
    var prevAssetNavigatorRel = ".asset-navigator-prev";
    var nextAssetNavigatorRel = ".asset-navigator-next";
    var titleTotalAssetCountRel = ".assetdetails-title-totalasset-count";
    var titleCurrentAssetCountRel = ".assetdetails-title-currentasset-count";
    var closeButton = "#shell-propertiespage-closeactivator";
    var foundationContentRel = ".foundation-content-path";
    var titleAssetCount = ".assetdetails-title-asset-count";
    var prevAssetURL = "";
    var nextAssetURL = "";
    var ASSET_NAVIGATOR_PATHS_KEY = "assetNavigatorPaths";
    var ASSET_PATHS_KEY = "assetPaths";
    var ASSET_START_INDEX_KEY = "startAssetIndex";
    var TOTAL_ASSET_COUNT_KEY = "totalAssetCount";
    var NAVIGATION_EVENT = "asset-detail-navigation";
    var ASSET_DETAILS_REFERER_KEY = "assetDetailsReferer";
    var ASSET_DETAILS_PAGE_VANITY = "/assetdetails.html";
    var ASSETS_VANITY = "/assets.html";
    var COLLECTION_DETAILS_VANITY = "/collectiondetails.html";
    var DM_SET_PREVIEW = "setpreview.html";
    var DAM_ASSET_TYPE = "dam:Asset";

    $(document).on("foundation-contentloaded", function(e) {
        initNavigationPaths();
        addNavigationEvents();
        if (isPageViewer()) {
            $(prevAssetNavigatorRel).hide();
            $(nextAssetNavigatorRel).hide();
        }
        $(document).on("click", closeButton, function() {
            if (window.sessionStorage) {
                sessionStorage.removeItem(ASSET_NAVIGATOR_PATHS_KEY);
            }
        });
        // Register default event when navigation event is triggered. Also,
        // foundation-content-path is used since it exists for all asset detail pages.
        // This can be overwritten by other event listener for customizable preview i.e. DM case for previewing set.
        $(foundationContentRel).on(NAVIGATION_EVENT, navigateTo);
    });

    function initNavigationPaths() {
        var currentAssetPath = $(".foundation-content-path").data("foundationContentPath");
        var assetDetailsReferer = $(assetNavigatorRel).data("assetDetailsReferer");
        // Due to set preview for DM will generate different referer than "assetdetail.html", we have to treat it
        // like referer is assets.html.
        if (!assetDetailsReferer || assetDetailsReferer.indexOf(DM_SET_PREVIEW) > 0) {
            var folderPath = currentAssetPath.substring(0, currentAssetPath.lastIndexOf("/"));
            assetDetailsReferer = ASSETS_VANITY + folderPath;
        }
        if (window.sessionStorage) {
            if (sessionStorage.assetsLastPageVisited) {
                var navigationStack = JSON.parse(sessionStorage.assetsLastPageVisited);
                var lastPageVisited = navigationStack[navigationStack.length - 2];
                if (lastPageVisited && (lastPageVisited.indexOf(ASSETS_VANITY) > 0 ||
                        lastPageVisited.indexOf(COLLECTION_DETAILS_VANITY) > 0)) {
                    assetDetailsReferer = lastPageVisited;
                }
            }
            var assetNavigatorPaths = JSON.parse(sessionStorage.getItem(ASSET_NAVIGATOR_PATHS_KEY));
            if (assetNavigatorPaths) {
                var storedReferer = assetNavigatorPaths[ASSET_DETAILS_REFERER_KEY];
                if (assetDetailsReferer.indexOf(ASSET_DETAILS_PAGE_VANITY) === -1 &&
                        assetDetailsReferer !== storedReferer) {
                    sessionStorage.removeItem(ASSET_NAVIGATOR_PATHS_KEY);
                    updateAssetNavigatorPaths(currentAssetPath, assetDetailsReferer);
                } else {
                    checkForNavigatorPathsUpdate(currentAssetPath, assetNavigatorPaths, storedReferer);
                    updateNavigationURL(currentAssetPath, assetNavigatorPaths);
                    updateTitle(currentAssetPath, assetNavigatorPaths);
                }
            } else {
                updateAssetNavigatorPaths(currentAssetPath, assetDetailsReferer);
            }
        }
    }

    function addNavigationEvents() {
        if (!isPageViewer()) {
            $(document).on("click", prevAssetNavigatorRel, function(e) {
                if (prevAssetURL) {
                    // trigger navigation event when prev button click
                    $(foundationContentRel).trigger({ "type": NAVIGATION_EVENT, "asset": prevAssetURL });
                }
            });

            $(document).on("click", nextAssetNavigatorRel, function(e) {
                if (nextAssetURL) {
                    // trigger navigation event when next button click
                    $(foundationContentRel).trigger({ "type": NAVIGATION_EVENT, "asset": nextAssetURL });
                }
            });
        }
    }

    function updateNavigationURL(currentAssetPath, assetNavigatorPaths) {
        var assetPaths = assetNavigatorPaths[ASSET_PATHS_KEY];
        for (var i = 0; i < assetPaths.length; i++) {
            var assetPath = assetPaths[i];
            if (currentAssetPath === assetPath) {
                if (i !== 0) {
                    $(prevAssetNavigatorRel).show();
                    prevAssetURL = assetPaths[i - 1];
                    $("#asset-mainimage").attr("prev", "/assetdetails.html" + encodeURI(prevAssetURL));
                } else {
                    $(prevAssetNavigatorRel).hide();
                }
                if (i !== assetPaths.length - 1) {
                    $(nextAssetNavigatorRel).show();
                    nextAssetURL = assetPaths[i + 1];
                    $("#asset-mainimage").attr("next", "/assetdetails.html" + encodeURI(nextAssetURL));
                } else {
                    $(nextAssetNavigatorRel).hide();
                    $(titleAssetCount).css("padding-right", "1rem");
                }
                break;
            }
        }
    }

    function updateTitle(currentAssetPath, assetNavigatorPaths) {
        var totalAssetCount = assetNavigatorPaths[TOTAL_ASSET_COUNT_KEY];
        var assetStartIndex = assetNavigatorPaths[ASSET_START_INDEX_KEY];

        if (totalAssetCount && assetStartIndex && assetStartIndex > 0 && totalAssetCount >= assetStartIndex) {
            var totalAssetCountText = Granite.I18n.get(" of {0} assets", totalAssetCount,
                "variable replaced by number");
            $(titleTotalAssetCountRel).text(totalAssetCountText);
            var assetPaths = assetNavigatorPaths[ASSET_PATHS_KEY];
            for (var i = 0; i < assetPaths.length; i++) {
                var assetPath = assetPaths[i];
                if (currentAssetPath === assetPath) {
                    $(titleCurrentAssetCountRel).text(assetStartIndex + i);
                    break;
                }
            }
        }
    }

    function updateAssetNavigatorPaths(currentAssetPath, assetDetailsReferer) {
        var assetNavigatorPathsURL = "/assetdetails.assetnavigation.json" + "?currentAssetPath=" +
                                      encodeURIComponent(currentAssetPath) + "&assetDetailsReferer=" +
                                      encodeURIComponent(assetDetailsReferer);

        var foundationCollectionId = getSessionStorageValue(FOUNDATION_COLLECTION_ID_KEY);
        var layoutId = getSessionStorageValue(FOUNDATION_LAYOUT_LAYOUT_ID_KEY);
        // we need to truncate asset name from foundationCollectionId as parent folder is expected in some context.
        if (layoutId === "column") {
            var parentFolder = currentAssetPath.substring(0, currentAssetPath.lastIndexOf("/"));
            var currentContextParentFolder = foundationCollectionId.substring(0,
                foundationCollectionId.lastIndexOf("/"));

            if (parentFolder === currentContextParentFolder) {
                foundationCollectionId = foundationCollectionId.substring(0, foundationCollectionId.lastIndexOf("/"));
            }
        }
        if (foundationCollectionId) {
            assetNavigatorPathsURL += "&foundationCollectionId=" + foundationCollectionId;
        }

        var sortName = getSessionStorageValue(FOUNDATION_LAYOUT_SORT_NAME_KEY);
        if (sortName) {
            assetNavigatorPathsURL += "&sortName=" + sortName;
        }

        var sortDir = getSessionStorageValue(FOUNDATION_LAYOUT_SORT_DIRECTION_KEY);
        if (sortDir) {
            assetNavigatorPathsURL += "&sortDir=" + sortDir;
        }

        var foundationCollectionSrc = getSessionStorageValue(FOUNDATION_COLLECTION_SRC_KEY);
        if (foundationCollectionSrc) {
            var params = {
                offset: "{offset}",
                limit: "{limit}",
                id: foundationCollectionId,
                sortName: sortName,
                sortDir: sortDir
            };
            foundationCollectionSrc = encodeURIComponent(Granite.URITemplate.expand(foundationCollectionSrc, params));
            assetNavigatorPathsURL += "&foundationCollectionSrc=" + foundationCollectionSrc;
        }

        assetNavigatorPathsURL += "&type=" + encodeURIComponent(DAM_ASSET_TYPE);
        assetNavigatorPathsURL += "&_charset_=utf-8";

        var url = Granite.HTTP.externalize(assetNavigatorPathsURL);
        $.ajax({
            type: "GET",
            url: url,
            cache: false,
            success: function(jsonResponse) {
                jsonResponse[ASSET_DETAILS_REFERER_KEY] = assetDetailsReferer;
                sessionStorage.setItem(ASSET_NAVIGATOR_PATHS_KEY, JSON.stringify(jsonResponse));
                updateNavigationURL(currentAssetPath, jsonResponse);
                updateTitle(currentAssetPath, jsonResponse);
            }
        });
    }

    function getSessionStorageValue(key) {
        if (window.sessionStorage) {
            return sessionStorage.getItem(key);
        }
    }

    function checkForNavigatorPathsUpdate(currentAssetPath, assetNavigatorPaths, assetDetailsReferer) {
        var assetPaths = assetNavigatorPaths[ASSET_PATHS_KEY];
        if (assetPaths[0] === currentAssetPath || assetPaths[assetPaths.length - 1] === currentAssetPath ||
                !(assetPaths.indexOf(currentAssetPath) > -1)) {
            updateAssetNavigatorPaths(currentAssetPath, assetDetailsReferer);
        }
    }

    function isPageViewer() {
        if (window.location.href.split("?").length > 1) {
            var paramsStr = window.location.href.split("?")[1];
            return ($.inArray("pageViewer=true", paramsStr.split("&"))) > -1;
        }
        return false;
    }

    /**
     * Default navigate to a page with provided info
     * @param e event object with asset = assetPath to redirect the page to
     */
    function navigateTo(e) {
        var basePreview = "/assetdetails.html";
        var assetPath = e.asset;

        if (assetPath) {
            window.location.href = Granite.HTTP.externalize(basePreview + assetPath);
        }
    }
})(document, Granite.$);
