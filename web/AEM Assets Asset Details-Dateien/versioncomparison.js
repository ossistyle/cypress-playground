/*
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2018 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

(function($, ns) {
    'use strict';

    /* namespace */
    ns.VersionComparison = {};

    ns.VersionComparison.constants = {
        SIDE_BY_SIDE_OVERLAY_ID: "VersionComparisonSideBySide"
    };

    ns.VersionComparison.compareInOverlay = function (assetPath, versionId, revertFunc) {

        var versionComparisonJsonUrl = assetPath + ".cfm.versioncomparison.json?versionId=" + versionId;
        var ui = $(window).adaptTo('foundation-ui');

        ui.wait();

        $.ajax({
            url: Granite.HTTP.externalize(versionComparisonJsonUrl),
            timeout: 10000,
            cache: false
        })
        .done(function(data, textStatus, jqXHR) {
            ns.VersionComparison.Overlay.setUp(data, revertFunc);
            ui.clearWait();
        })
        .fail(function(jqXHR, textStatus, errorThrown) {

            ui.clearWait();

            var errorDialog = new Coral.Dialog().set({
                header: {
                    innerHTML: Granite.I18n.get("Error")
                },
                content: {
                    innerHTML: Granite.I18n.get("This content fragment version cannot be compared to the current version because of incompatible content.")
                },
                footer: {
                    innerHTML:
                    "<button is=\"coral-button\" variant=\"primary\" coral-close=\"\" class=\"coral-Button coral-Button--primary\" size=\"M\">" +
                        "<coral-button-label>" + Granite.I18n.get("Ok") + "</coral-button-label>" +
                    "</button>"
                },
                variant: Coral.Dialog.variant.ERROR
            });
            $('body').append(errorDialog);
            errorDialog.show();
        });
    }

})($, window.Dam.CFM);

/*
* ADOBE CONFIDENTIAL
* __________________
*
*  Copyright 2018 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
*/
(function ($, ns) {
    "use strict";
    
    /* namespace */
    ns.VersionComparison.Overlay = {};
    
    var diff = new DiffService();

    var selectionActionBarSelector = ".granite-collection-selectionbar.foundation-mode-switcher";
    
    /**
     * Strips all span.rte-annotation elements (but keeps the content)
     *
     * @param {String} htmlString - markup to be cleaned up
     * @returns {String} - the same markup with all annotation spans removed
     */
    var stripAnnotations = function(htmlString) {
        var wrapper = $('<div>' + htmlString + '</div>');
        var annotatedContent = wrapper.find('span.rte-annotation').contents();
        annotatedContent.unwrap();
        return wrapper.html();
    };

    /**
     * Externalizes url of a give image.
     *
     * @private
     * @param {Number} idx - element index
     * @param {HTMLElement} img - image
     * @returns {undefined} - nothing
     */
    var externalizeImageSrc = function(idx, img) {
        var url = $(img).attr('src');
        $(img).attr('src', Granite.HTTP.externalize(url));
    };

    /**
     * Externalizes all images in the given DOM tree by updating images paths.
     *
     * @param {HTMLElement} content - a DOM tree
     * @returns {undefined} - nothing
     */
    var externalize = function(content) {

        $.each(content.getElementsByTagName('img'), externalizeImageSrc);
    };

    /**
     * Creates an element containing a title and content.
     * 
     * @param {Object} elementData 
     * @param {string} version 
     * @param [{string}] variationMissing might be set to either `current` or `previous`
     */
    var createVariationElement = function (elementData, version, variationMissing) {
        var $element = $("<div>").addClass("cfm-element");
        
        $("<div>").addClass(ns.constants.SYNCHRONIZATION_TITLE)
            .html(version !== variationMissing ? elementData.title : "&nbsp;")
            .appendTo($element);

        // strip all annotations from the element markup, as they will just produce a messy diff
        var htmlContent = elementData.htmlContent[version] || "&nbsp;";
        var withoutAnnotations = stripAnnotations(htmlContent);
        $("<div>").html(withoutAnnotations)
            .appendTo($element);
        
        return $element;
    };
    
    /**
     * Generates the diff HTML for a given variation. That is a left column containing the current version with annotations and a right column
     * containing the previous version (no annotations).
     * 
     * @param {Object} variationData 
     */
    var createVariationMarkup = function (variationData) {
        var $variation = $("<div>").addClass("cfm-variation");
        var $titles = $("<div>").addClass("cfm-titles");
        var $currentVariationElement;
        var $previousVariationElement;
        
        if (variationData.elements.length > 0) {
            $("<div>").addClass(ns.constants.SYNCHRONIZATION_TITLE + " cfm-left-col")
                .text(variationData.title)
                .appendTo($titles);
            $("<div>").addClass(ns.constants.SYNCHRONIZATION_TITLE + " cfm-right-col")
                .text(variationData.title)
                .appendTo($titles);
            
            $titles.appendTo($variation);
        }
        
        for (var i = 0; i < variationData.elements.length; i++) {
            var $elements = $("<div>").addClass("cfm-elements");

            $currentVariationElement = createVariationElement(variationData.elements[i], "current", variationData.partial)
                .addClass("cfm-left-col");
            $previousVariationElement = createVariationElement(variationData.elements[i], "previous", variationData.partial)
                .addClass("cfm-right-col");
            
            // get nodes containing the actual content
            var $previousContent = $previousVariationElement.children().last();
            var $currentContent = $currentVariationElement.children().last();

            if (i === 0 && variationData.partial === "current") {
                $currentContent.html("<p class='cfm-variation-missing'>" + Granite.I18n.get("This variation does not exist in that version.") + "</p>");
            } else if (i === 0 && variationData.partial === "previous") {
                $previousContent.html("<p class='cfm-variation-missing'>" + Granite.I18n.get("This variation does not exist in that version.") + "</p>");
            }
            
            if (!variationData.partial && $previousContent.html() !== $currentContent.html()) {
                var annotatedElement = ns.DiffHighlighting.createElementWithHighlightedChanges($currentContent[0], $previousContent[0]);
                $currentContent.replaceWith(annotatedElement);
            }
            
            $currentVariationElement.removeClass("cq-component-changed")
                .appendTo($elements);
            $previousVariationElement.appendTo($elements);
            $elements.appendTo($variation);
        }

        return $variation;
    };
    
    /**
     * Creates version content container.
     *
     * @private
     * @param {Object} versionData
     * @return {jQuery} - container element
     */
    var createContainer = function (versionData) {
        var container = $("<div>").addClass("cfm-version");
        
        for (var i = 0; i < versionData.length; i++) {
            createVariationMarkup(versionData[i]).appendTo(container);
        }

        // make sure the content path is prepended to all image URLs
        externalize(container[0]);
        
        return container;
    };

    var toggleFullScreenIcon = function(button) {
        if (button.icon === "fullScreenExit") {
            button.icon = "fullScreen";
        } else {
            button.icon = "fullScreenExit"
        }
    };

    /**
     * Sets up the primary part of the action bar. That is two buttons are added each containing the fullscreen icon 
     * the content fragment's name.
     * 
     * @param {Object} overlay - jQuery object for the overlay's main div
     * @param {HTMLElement} actionBar
     * @param {Object} data 
     */
    var setUpPrimaryActionBar = function(overlay, actionBar, data) {

        var leftItems = actionBar.primary.items;
        var assetTitlePrefix = "CFM : ";
        var leftFullscreenBtn = new Coral.Button().set({
            variant: Coral.Button.variant.QUIET,
            icon: "fullScreen",
            label: {   
                innerText: assetTitlePrefix + data.currentVersion.title
            }
        });
        leftFullscreenBtn.on("click", function (e) {
            overlay.toggleClass("cfm-fullscreen-left-col");
            toggleFullScreenIcon(leftFullscreenBtn);
        });

        var rightFullscreenBtn = new Coral.Button().set({
            variant: Coral.Button.variant.QUIET,
            icon: "fullScreen",
            label: {   
                innerText: assetTitlePrefix + data.previousVersion.title
            }
        });
        rightFullscreenBtn.on("click", function (e) {
            overlay.toggleClass("cfm-fullscreen-right-col");
            toggleFullScreenIcon(rightFullscreenBtn);
        });
        
        var currentTag = new Coral.Tag().set({
            label: {
                innerText:  data.currentVersion.version
            },
            size: Coral.Tag.size.SMALL,
            color: Coral.Tag.color.LIGHT_BLUE
        });
        var previousTag = new Coral.Tag().set({
            label: {
                innerText:  data.previousVersion.version
            },
            size: Coral.Tag.size.SMALL,
            color: Coral.Tag.color.GREY
        });
        
        var currentActionItem = leftItems.add({});
        currentActionItem.appendChild(leftFullscreenBtn);
        currentActionItem.appendChild(currentTag);

        var previousActionItem = leftItems.add({});
        previousActionItem.appendChild(rightFullscreenBtn);
        previousActionItem.appendChild(previousTag);
    };

    var showRevertConfirmationDialog = function(previousVersionTitle, revertFunc) {

        var cancelButton = new Coral.Button().set({
            coralClose: true,
            label: {
                innerText: Granite.I18n.get("Cancel")
            },
            variant: Coral.Button.variant.SECONDARY
        });
        var confirmButton = new Coral.Button().set({
            label: {
                innerText: Granite.I18n.get("Revert")
            },
            variant: Coral.Button.variant.WARNING
        });

        var confirmDialog = new Coral.Dialog().set({
            id: "revert-to-previous-version-dialog",
            header: {
                innerText: Granite.I18n.get("Revert to previous version")
            },
            content: {
                innerHTML: Granite.I18n.get("Do you really want to revert the current version to the previous version?") +
                  "<p> - " + previousVersionTitle + "</p>"
            },
            variant: Coral.Dialog.variant.ERROR
        });

        confirmDialog.footer.appendChild(cancelButton);
        confirmDialog.footer.appendChild(confirmButton);

        confirmButton.on("click", function (e) {
            revertFunc();
            confirmDialog.remove();
            ns.VersionComparison.Overlay.tearDown();
        });
        cancelButton.on("click", function (e) {
            confirmDialog.remove();
        });

        $(document.body).append(confirmDialog);
        confirmDialog.show();
    };
    
    /**
    * Shows the overlay with the side-by-side view to compare ve
    *
    * @param {Object} data - the JSON data retrieved from the VersionComparisonServlet
    * @param {Object} revertFunc - a function to call when the fragment should be reverted to the previous version
    */
    ns.VersionComparison.Overlay.setUp = function (data, revertFunc) {

        // the action bar for the selection context has a crazy z-index set, which we must temporarily disable
        // so that we can later show an confirmation dialog with backdrop over our own overlay
        $(selectionActionBarSelector).css("z-index", 0);

        var overlay = $("<div>").attr("id", ns.VersionComparison.constants.SIDE_BY_SIDE_OVERLAY_ID);
        var actionBar = new Coral.ActionBar();
        
        setUpPrimaryActionBar(overlay, actionBar, data);

        var rightItems = actionBar.secondary.items;
        var revertButton = new Coral.Button().set({
            label: {
                innerText: Granite.I18n.get("Revert")
            },
            icon: "revert",
            variant: Coral.Button.variant.QUIET
        });
        var doneButton = new Coral.Button().set({
            label: {
                innerText: Granite.I18n.get("Done")
            },
            variant: Coral.Button.variant.PRIMARY
        });
        rightItems.add({}).appendChild(revertButton);
        rightItems.add({}).appendChild(doneButton);

        revertButton.classList.add("cfm-compare-versions-revert-action");
        revertButton.on("click", function (e) {
            showRevertConfirmationDialog(data.previousVersion.version, revertFunc);
        });

        doneButton.on("click", function (e) {
            ns.VersionComparison.Overlay.tearDown();
        });

        actionBar.classList.add("cfm-compare-versions-toolbar");
        overlay.append(actionBar);
        
        data.variations.forEach(function(d) {
            d.partial = !d.existsInCurrentVersion ? "current" : !d.existsInPreviousVersion ? "previous" : "";
        });
        
        /* add container for current and previous version */
        overlay.append(createContainer(data.variations));
        
        /* insert overlay */
        $(document.body).append(overlay);
    };
    
    /**
     * Removes overlay.
     */
    ns.VersionComparison.Overlay.tearDown = function () {
        $("#" + ns.VersionComparison.constants.SIDE_BY_SIDE_OVERLAY_ID).remove();

        // restore the z-index for the action-bar in the admin to the default value defined in CSS
        $(selectionActionBarSelector).css("z-index", null);
    };
    
})($, window.Dam.CFM);

/*
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2018 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

(function($, ns, document) {
    'use strict';

    var compareSelector = ".cq-common-admin-timeline-event-action-compare";

    $(document).on("click", compareSelector, function (e) {

        // find the path and version for which the button has been clicked in the surrounding form
        var form = $(e.target).closest("form");
        var assetPath = form.find("input[name=path]").val();
        var versionId = form.find("input[name=id]").val();

        // to allow the overlay to revert to the previous version,
        // a function is passed that will trigger a click even on the revert button
        var revertButton = form.find("button.cq-common-admin-timeline-event-action-ok");
        var revertFunc = function() {
            revertButton.click();
        };

        ns.VersionComparison.compareInOverlay(assetPath, versionId, revertFunc);
    });


})($, window.Dam.CFM, document);

