/*
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2016 Adobe Systems Incorporated
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

(function($, window) {
    'use strict';

    var $window = $(window);

    $window.adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "dam-create-fragment",
        handler: function(name, el, config, collection, selections) {
            var contentPath;
            if (selections.length > 0) {
                contentPath = $(selections[0]).data("foundationCollectionItemId")
            } else {
                contentPath = $(".foundation-collection").data("foundationCollectionId");
            }
            var maxPos = contentPath.length - 1;
            if (maxPos > 0) {
                if (contentPath.charAt(maxPos) == '/') {
                    contentPath = contentPath.substring(0, maxPos);
                }
            }
            var wizardUrl = config.data.wizard;
            document.location.href = wizardUrl + contentPath;
        }
    });


})($, window);