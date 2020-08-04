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
(function(document, $) {
    "use strict";

    function checkIfMultiPageAssetDetails() {
        var loc = window.location.href;


        var multiPageAssetDetailsSelector = "/assetdetails.html/(.)*/subassets/";

        return loc.match(multiPageAssetDetailsSelector);
    }

    $(window).on("resize", function(e) {
        rearrangeHeight();
    });

    $(document).on("foundation-contentloaded", function(e) {
        // cq timeline commons is designed to address collections page. Setting this here
        // (properties page to make cq commons api work)
        var paths = [];
        paths.push($(".foundation-content-path").data("foundation-content-path"));
        $(".cq-common-admin-timeline").data("paths", paths);

        rearrangeHeight();

        var assetView = $(".foundation-content").find(".asset-view");
        if (assetView.length && assetView.data("can-edit") === false) {
            $(".aem-assets-admin-actions-edit-activator").hide();
        }

        if ($("#asset-mainimage").length > 0 || isPageViewer()) {
            $(document).off("keydown", handleArrowKey);
            $(document).on("keydown", handleArrowKey);
            $(document).off("swipe", handleSwipeKey);
            $(document).on("swipe", handleSwipeKey);
            $("#asset-mainimage").attr("tabIndex", 0);
        }

        // granite collection page reads href attr directly from content node. While this value has to be calculated .
        // so using this hack
        var firstPage = $(".asset-detail [data-first-page-url]");
        $('[data-granite-toggleable-control-href="$firstpage"]').attr("data-granite-toggleable-control-href",
            firstPage.data("first-page-url"));
        $('a[href$="$firstpage"]').attr("href", firstPage.data("first-page-url"));
    });

    function handleSwipeKey(event) {
        var prev = getPrevUrl();
        var next = getNextUrl();

        if ($(".asset-detail").length > 0) {
            if (event.direction === "right") { // or right, down, left
                window.location.href = Granite.HTTP.externalize(prev);
            }
            if (event.direction === "left") { // or right, down, left
                window.location.href = Granite.HTTP.externalize(next);
            }
        }
    }

    function isPageViewer() {
        if (window.location.href.split("?").length > 1) {
            var paramsStr = window.location.href.split("?")[1];
            return ($.inArray("pageViewer=true", paramsStr.split("&"))) > -1;
        }
        return false;
    }

    function getPrevUrl() {
        if (isPageViewer()) {
            return $(".dam-page-navigation-prev").attr("data-href");
        }
        return $("#asset-mainimage").attr("prev");
    }

    function getNextUrl() {
        if (isPageViewer()) {
            return $(".dam-page-navigation-next").attr("data-href");
        }
        return $("#asset-mainimage").attr("next");
    }

    function handleArrowKey(e) {
        var prev = getPrevUrl();
        var next = getNextUrl();
        if ($(".asset-detail").length > 0 && ((document.activeElement === null ||
                document.activeElement.tagName === "BODY") ||
                (document.activeElement.tagName === "DIV"))) {
            if (e.keyCode === 37 && prev) {
                window.location.href = Granite.HTTP.externalize(prev);
            } else if (e.keyCode === 39 && next) {
                window.location.href = Granite.HTTP.externalize(next);
            }
        }
    }

    // TODO avoid rearranging height on resize. it should be managed in css
    function rearrangeHeight() {
        var assetDetail = $(".asset-detail");
        assetDetail.each(function() {
            var $this = $(this);
            var pageHeight = $(".foundation-layout-panel-content").height();
            var bodyHeight = pageHeight;
            $this.css("height", bodyHeight + "px");
        });
    }

    // renditions upload handling
    function queueChanged(event) {
        // console.log('QUEUE CHANGED', event);
        var fileUpload = $(".cq-damadmin-admin-actions-rendition-upload-activator")[0];
        fileUpload.name = fileUpload.value.replace(/^.*[\\\/]/, ""); // eslint-disable-line no-useless-escape
        fileUpload.upload();
    }

    $(document).on("coral-fileupload:load", ".cq-damadmin-admin-actions-rendition-upload-activator", function() {
        $(document).trigger("fetch-all-rendition");
        $(window).adaptTo("foundation-ui").alert(Granite.I18n.get("Upload Rendition"),
            Granite.I18n.get("Rendition uploaded successfully."), "success");
    });

    $(document).on("coral-fileupload:error", ".cq-damadmin-admin-actions-rendition-upload-activator", function() {
        $(window).adaptTo("foundation-ui").alert(Granite.I18n.get("Upload Rendition"),
            Granite.I18n.get("Rendition upload failed."), "error");
    });

    $(document).on("coral-fileupload:filemimetyperejected", ".cq-damadmin-admin-actions-rendition-upload-activator",
        function() {
            $(window).adaptTo("foundation-ui").alert(Granite.I18n.get("Upload Rendition"),
                Granite.I18n.get("Rendition upload failed. File type not supported"), "error");
        });

    $(document).on("change", ".cq-damadmin-admin-actions-rendition-upload-activator", queueChanged);

    $(document).on("click", "#shell-propertiespage-closeactivator", function() {
        var mainAssetPath;
        if (checkIfMultiPageAssetDetails()) {
            event.preventDefault();
            mainAssetPath = window.location.pathname.split("/assetdetails.html")[1].split("/subassets")[0];
            window.location.href = Granite.HTTP.externalize("/assetdetails.html" + mainAssetPath);
        } else if (JSON.parse(sessionStorage.getItem("assetNavigatorPaths"))["assetDetailsReferer"]
            .indexOf("/subassets/") > 0) {
            event.preventDefault();
            mainAssetPath = window.location.pathname.split("/assetdetails.html")[1];
            var parentFolderPath = mainAssetPath.substr(0, mainAssetPath.lastIndexOf("/"));
            window.location.href = Granite.HTTP.externalize("/assets.html" + parentFolderPath);
        }
    });
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

/**
 * Listens to the timeline items change [0] and the timeline events change events. This listener refreshes the
 * events of the timeline i.e. the comments, versions etc.
 *
 * [0] cq-common-admin-timeline-change.cq-common-admin-timeline-events
 */

(function(document, $) {
    "use strict";

    var eventName = "cq-common-admin-timeline-change";
    var eventsNs = "cq-common-admin-timeline-events";

    // Listen to change events to refresh the content
    $(document).on(eventName + "." + eventsNs, function() {
        var contentApi = $(".foundation-content").adaptTo("foundation-content");
        contentApi.refresh();
    });
})(document, Granite.$);

