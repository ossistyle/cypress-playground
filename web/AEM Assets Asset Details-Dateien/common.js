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

    $.fn.overlayMask = function(action, appendEl) {
        var mask = this.find(".overlay-mask");

        // Creates required mask
        if (!mask.length && (!action || action === "show")) {
            mask = $('<div class="overlay-mask"></div>');
            mask.css({
                position: "absolute",
                width: "100%",
                height: "100%",
                top: "0px",
                left: "0px",
                zIndex: 10000
            }).appendTo(this);
            mask.append(appendEl);
        }

        // Act based on params
        if (!action || action === "show") {
            this.fadeTo(0, 0.5);
            mask.show();
        } else if (action === "hide") {
            this.fadeTo(0, 1);
            mask.hide();
        }
        return this;
    };
})(document, Granite.$);

(function(document, $) {
    "use strict";

    $(document).on("submit", ".searchpanel", function(e) {
        var disable = $(e.target).data("foundation-form-disable");
        if (!disable) {
            var spinner = $('<div class="coral-Wait coral-Wait--large coral-Wait--center" />');
            $(".foundation-content").overlayMask("show", spinner);
        }
    });

    $(document).on("foundation-form-submitted", ".searchpanel", function(e) {
        $(".foundation-content").overlayMask("hide");
    });
})(document, Granite.$);

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

    // TODO No usage of this script, to be removed.

    function getHref(switcher) {
        var classicUI = switcher.data("classicui");

        if (classicUI) {
            var target = classicUI;
            if (classicUI.indexOf("#") === classicUI.length - 1) {
                // classicUI URL ends with "#" >> add current path (suffix)
                var path = Granite.HTTP.internalize(window.location.pathname);
                var index = path.indexOf("/", 1);
                if (index !== -1) {
                    // path consists of vanity URL plus suffix: add suffix to target
                    target += path.substring(index);
                }
            }
            return Granite.HTTP.externalize(target);
        }

        return null;
    }

    $(document).on("click", ".classicui-switcher", function(e) {
        var href = getHref($(this));
        if (href) {
            window.open(href);
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
        }
    });

    // workaround to not show the switcher on touch devices (TO BE REMOVED)
    $(document).on("touchstart", "nav.feature", function(e) {
        $(this).find("i.action").remove();
    });
})(document, Granite.$);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2013 Adobe Systems Incorporated
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

    // This refreshes the foundation-content on clicking on foundation-content-control-action=back
    $(document).on("click", ".refresh-foundation-content-on-back", function(e) {
        // add the data-foundation-content-control-refresh=true attribute to
        // ".foundation-content-control[data-foundation-content-control-action=back]". See GRANITE-3098
        var control = $(".foundation-content-control[data-foundation-content-control-action=back]");
        if (control.length) {
            control.attr("data-foundation-content-control-refresh", true);
        }
    });
})(document, Granite.$);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2013 Adobe Systems Incorporated
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

    $(document).on("user-preferences-changed", function() {
        // Clear authoring UI mode cookie, it will be reset by servlet filter
        $.cookie("cq-authoring-mode", null, {
            path: Granite.HTTP.externalize("/")
        });
    });
})(document, Granite.$);

