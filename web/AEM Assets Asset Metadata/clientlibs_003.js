/*
 ADOBE CONFIDENTIAL

 Copyright 2016 Adobe Systems Incorporated
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

    var MAX_STACK_SIZE = 20;
    var ASSET_DETAILS_PAGE_VANITY = "/assetdetails.html";

    $(document).on("foundation-contentloaded foundation-collection-navigate", function(e) {
        handleNavigation(e);
    });

    $(document).on("foundation-contentloaded", function() {
        setNavUrl();
    });

    // This is to support for page navigator, In page Navigation this events comes after contentloaded and url update
    $(document).on("foundation-content-loaded foundation-collection-navigate", function(e) {
        handleNavigation(e);
    });

    $(document).on("foundation-content-loaded", function() {
        setNavUrl();
    });

    function handleNavigation(e) {
        try {
            var hrefStack = [];
            if (sessionStorage.assetsLastPageVisited) {
                hrefStack = JSON.parse(sessionStorage.assetsLastPageVisited);
            }
            if (hrefStack.length <= 0) {
                hrefStack.push(window.location.href);
            } else {
                // get the href's location in stack if already present and remove elements after that position
                var prevPos = getPrevPosition(hrefStack, window.location.href);
                if (prevPos > -1) {
                    var i = hrefStack.length - 1;
                    while (i > prevPos) {
                        hrefStack.pop();
                        i--;
                    }
                } else {
                    // add it to stack
                    if (isPageViewer(window.location.href) || isAssetDetailsPage(window.location.href)) {
                        // special handling for page and Asset Details Page Navigation
                        addPageNavHref(hrefStack);
                    } else {
                        hrefStack.push(window.location.href);
                    }
                    // remove elements from start, if size is more than max size
                    resizeStackToMaxSize(hrefStack);
                }
                if (hrefStack.length > 1) {
                    // add the parent of current page as referrer
                    document.damNavReferrer = hrefStack[hrefStack.length - 2];
                }
            }
            sessionStorage.assetsLastPageVisited = JSON.stringify(hrefStack);
        } catch (e) {
            // handle error
        }
    }

    function setNavUrl() {
        var href = document.damNavReferrer;
        // no referrer set means page is started in new window, so user should go to the default parent page
        if (href && href !== window.location.href) {
            $("#shell-propertiespage-closeactivator").attr("href", href);

            if (document.querySelector("#shell-propertiespage-doneactivator")) {
                document.querySelector("#shell-propertiespage-doneactivator").
                    dataset.graniteFormSaveactivatorHref = href;
            }
        }
    }

    function isPageViewer(href) {
        if (href.split("?").length > 1) {
            var paramsStr = href.split("?")[1];
            return ($.inArray("pageViewer=true", paramsStr.split("&"))) > -1;
        }
        return false;
    }

    function isAssetDetailsPage(href) {
        if (href.indexOf(ASSET_DETAILS_PAGE_VANITY) > -1) {
            return true;
        }
        return false;
    }

    function addPageNavHref(hrefStack) {
        var topHref = hrefStack[hrefStack.length - 1];
        // if a page is already in stack, remove it and add current page
        if ((isPageViewer(topHref) ||
            isAssetDetailsPage(topHref)) &&
            topHref.substr(0,
                topHref.lastIndexOf("/")) === window.location.href.substr(0, window.location.href.lastIndexOf("/"))) {
            hrefStack.pop();
        }
        hrefStack.push(window.location.href);
    }

    function resizeStackToMaxSize(stack) {
        if (stack.length > MAX_STACK_SIZE) {
            stack.splice(0, MAX_STACK_SIZE - 1);
        }
    }
    function getPrevPosition(stack, href) {
        for (var i = 0; i < stack.length; i++) {
            if (stack[i] === href) {
                return i;
            }
        }
        return -1;
    }
})(document, Granite.$);
