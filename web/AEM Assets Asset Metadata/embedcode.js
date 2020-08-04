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

(function(document, $) {
    "use strict";

    $(document).one("foundation-toggleable-show", "#aem-assets-show-embed-code", function(e) {
        var modalBody = $(e.target).find("coral-dialog-content");
        var headingFailure = Granite.I18n.get("An error occured in fetching Embed Code");

        var embedCodeUrlFrag = "/content/dam/assetinsights/embedcode.html";

        var content = '<textarea class="asset-embedcode-text-content" readonly>';
        var result =
            Granite.$.ajax({
                type: "GET",
                async: false,
                dataType: "text",
                url: Granite.HTTP.externalize(embedCodeUrlFrag + $(e.target).data("assetpath"))
            });
        result.done(function(text) {
            content += text + "</textarea>";
            modalBody.html(content);
        });
        result.fail(function() {
            modalBody.html('<p class="asset-embedcode-err-content">' + headingFailure + "</p>");
        });
    });

    $(document).one("foundation-contentloaded", function(e) {
        $("#asset-embedcode-copy-cmd").on("click", function(e) {
            var ecData = document.querySelector(".asset-embedcode-text-content");
            ecData.select();
            try {
                document.execCommand("copy");
            } catch (ign) {
                // TO DO
            }
        });
    });
})(document, Granite.$);
