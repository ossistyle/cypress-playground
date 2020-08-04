/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
// @deprecated
(function(window, document, $) {
    "use strict";

    function extractSuffix() {
        var path = window.location.pathname;
        var index = path.lastIndexOf(".html");

        if (index < 0) {
            return "";
        }

        return path.substring(index + ".html".length);
    }

    $(document).on("click", ".granite-endor-DesktopOnly", function(e) {
        var el = $(this);
        var href = el.data("graniteEndorDesktoponly");

        if (!href) {
            return;
        }

        var url = href;

        if (href[href.length - 1] === "#") {
            url += extractSuffix();
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        window.open(url);
    });

    // TODO workaround to not show the switcher on touch devices (TO BE REMOVED)
    $(document).on("touchstart", ".coral-ColumnView-item", function(e) {
        $(this).find(".granite-endor-DesktopOnly").remove();
    });
})(window, document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2014 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
// @deprecated
(function(window, document, $, Granite) {
    "use strict";

    var MAX_ITEM_COUNT = 9;

    var moreEl;
    function getMoreEl() {
        if (!moreEl) {
            moreEl = $(document.createElement("button"))
                .addClass("endor-ActionBar-item coral-Button coral-Button--quiet coral-Button--graniteActionBar")
                .append(
                    $(document.createElement("i")).addClass("coral-Icon coral-Icon--more"),
                    $(document.createElement("span")).text(Granite.I18n.get("More"))
                );
        }
        return moreEl;
    }

    var popoverEl;
    function getPopoverEl() {
        if (!popoverEl) {
            popoverEl = $(document.createElement("div")).addClass("endor-ActionBar-graniteMorePopup coral-Popover");
        }
        return popoverEl;
    }

    function createMore(getItems, returnItems) {
        var isActive = false;

        var more = getMoreEl().clone();
        var popover = getPopoverEl().clone();

        var items = $(document.createElement("ul")).addClass("coral-List coral-List--minimal").appendTo(popover);

        popover.on("hide", function() {
            returnItems(more, items.children().children());
            items.empty();
            isActive = false;
        });

        more.on("click", function() {
            var popoverAPI = popover.data("popover");
            if (!popoverAPI) {
                popoverAPI = new CUI.Popover({
                    element: popover,
                    pointAt: more
                });
            }

            if (popover.css("display") === "none") {
                getItems(more).each(function() {
                    $(document.createElement("li")).addClass("coral-List-item").append(this).appendTo(items);
                });

                popoverAPI.show();
                isActive = true;
            } else {
                popoverAPI.hide();
            }
        });

        return {
            el: more,
            insertBefore: function(el) {
                more.insertBefore(el);
                popover.insertAfter(more);
            },
            detach: function() {
                var popoverAPI = popover.data("popover");
                if (popoverAPI) {
                    popoverAPI.hide();
                }

                more.detach();
                popover.detach();
            },
            isActive: function() {
                return isActive;
            }
        };
    }

    var actionbars;

    function check() {
        for (var i = 0, ln = actionbars.length; i < ln; i++) {
            var el = actionbars[i];
            var $el = $(el);
            var right = $el.children(".endor-ActionBar-right")[0];
            var rightWidth = right === undefined ? 0 : right.offsetWidth;

            var availableWidth = el.clientWidth - rightWidth;

            if (availableWidth <= 0) {
                continue;
            }

            var left = $el.children(".endor-ActionBar-left");
            checkMore(left, availableWidth);
        }
    }

    function checkMore(container, availableWidth) {
        var moreConfig = container.data("granite-endor-ActionBar.internal.moreConfig");
        if (!moreConfig) {
            moreConfig = createMore(function getItems(more) {
                return more.nextAll(".endor-ActionBar-item").map(function() {
                    return $(this).removeClass("endor-ActionBar-item granite-endor-ActionBar-item-hidden");
                });
            }, function returnItems(more, items) {
                items.addClass("endor-ActionBar-item granite-endor-ActionBar-item-hidden").insertAfter(more);
            });
            container.data("granite-endor-ActionBar.internal.moreConfig", moreConfig);
        }

        var more = moreConfig.el;

        if (moreConfig.isActive()) {
            return;
        }

        var items = container.children(".endor-ActionBar-item");

        var moreWidth = more.data("granite-endor-ActionBar.internal.width");
        if (moreWidth === undefined) {
            more.appendTo(container);
            moreWidth = more[0].offsetWidth;
            more.data("granite-endor-ActionBar.internal.width", moreWidth);
            more.detach();
        }

        var invisibleStartIndex = 0;
        var altInvisibleStartIndex = 0;
        var targetWidth = 0;
        var altTargetWidth = 0;

        // Need to add tolerance.
        // Somehow when the targetWidth is say 100px, the last item is still truncated,
        // and the container needs to be set to 102px.
        var tolerance = 2;

        for (var i = 0, visibleCount = 0, ln = items.length; i < ln && visibleCount < MAX_ITEM_COUNT; i++) {
            var item = items[i];

            if (item === more[0]) {
                continue;
            }

            if ($(item).css("float") === "none") {
                // endor-ActionBar-item is floated.
                // So, when there is a non-floated item, it means that the item is using a block-like layout.
                // The block item is the one who will handle the change in available width.
                return;
            }

            var itemWidth = item.offsetWidth;

            if (itemWidth === 0) {
                continue;
            }

            if (targetWidth + itemWidth + moreWidth <= availableWidth - tolerance) {
                altInvisibleStartIndex = i + 1;
                altTargetWidth += itemWidth;
            }

            if (targetWidth + itemWidth > availableWidth - tolerance) {
                break;
            }

            visibleCount++;
            invisibleStartIndex = i + 1;
            targetWidth += itemWidth;
        }

        var showMore = false;

        if (invisibleStartIndex < items.length) {
            for (var j = altInvisibleStartIndex, ln2 = items.length; j < ln2; j++) {
                var item2 = items[j];

                if (item2 === more[0] || item2.offsetWidth === 0) {
                    continue;
                }

                showMore = true;
                break;
            }
        }

        var containerWidth;
        var prevAltInvisibleStartIndex;

        if (showMore) {
            if (more.parent().length === 0) {
                moreConfig.insertBefore(items[altInvisibleStartIndex]);
                hideItems(items, altInvisibleStartIndex);
            } else {
                prevAltInvisibleStartIndex = more.data("granite-endor-ActionBar.internal.altInvisibleStartIndex");

                if (prevAltInvisibleStartIndex !== altInvisibleStartIndex) {
                    moreConfig.insertBefore(items[altInvisibleStartIndex]);

                    if (prevAltInvisibleStartIndex < altInvisibleStartIndex) {
                        restoreItems(items, prevAltInvisibleStartIndex, altInvisibleStartIndex);
                    }

                    hideItems(items, altInvisibleStartIndex, more);
                }
            }

            more.data("granite-endor-ActionBar.internal.altInvisibleStartIndex", altInvisibleStartIndex);
            containerWidth = altTargetWidth + moreWidth;
        } else {
            prevAltInvisibleStartIndex = more.data("granite-endor-ActionBar.internal.altInvisibleStartIndex");

            if (prevAltInvisibleStartIndex !== undefined) {
                restoreItems(items, prevAltInvisibleStartIndex);
            }

            moreConfig.detach();
            more.removeData("granite-endor-ActionBar.internal.altInvisibleStartIndex");
            containerWidth = targetWidth;
        }

        containerWidth += tolerance;

        var prevWidth = container.data("granite-endor-ActionBar.internal.width");
        if (prevWidth !== containerWidth) {
            container.width(containerWidth);
            container.data("granite-endor-ActionBar.internal.width", containerWidth);
        }
    }

    function hideItems(items, startIndex, more) {
        for (var i = startIndex, ln = items.length; i < ln; i++) {
            var item = $(items[i]);

            if (more && item.is(more)) {
                continue;
            }

            item.addClass("granite-endor-ActionBar-item-hidden");
        }
    }

    function restoreItems(items, startIndex, endIndex) {
        var ln = endIndex === undefined ? items.length : endIndex;

        for (var i = startIndex; i < ln; i++) {
            $(items[i]).removeClass("granite-endor-ActionBar-item-hidden");
        }
    }

    $(document).on("foundation-contentloaded", function(e) {
        actionbars = document.getElementsByClassName("js-granite-endor-ActionBar");
    });

    $(function() {
        window.requestAnimationFrame(function f() {
            check();
            window.requestAnimationFrame(f);
        });
    });
})(window, document, Granite.$, Granite);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2014 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
// @deprecated
// redirect grid layout event to endor
Granite.$(document).on("cui-gridlayout-layout", function() {
    "use strict";
    Granite.$(document).trigger("endor-alignfooter");
});

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
// @deprecated
(function(document, $, URITemplate) {
    "use strict";

    function waitActiveItem(folderColumn, callback) {
        var id = setInterval(function() {
            var activeItem = folderColumn.find(".coral-ColumnView-item.is-active").first();

            if (activeItem.length > 0) {
                clearInterval(id);
                callback(activeItem);
            }
        }, 50);
    }

    $(document).on("foundation-selections-change", ".coral-ColumnView.foundation-collection", function(e) {
        var collection = $(this);
        var el = $(".granite-endor-crumbs").first();

        var src = el.data("graniteEndorCrumbsSrc");
        var rootTitle = el.data("graniteEndorCrumbsRoottitle");
        var rootId = el.data("graniteEndorCrumbsRootid");

        if (!src || !rootTitle || !rootId || !collection.is(el.data("graniteEndorCrumbsTarget"))) {
            return;
        }

        var folderColumn = collection.children(".is-active").first();
        var activeItem = folderColumn.find(".coral-ColumnView-item.is-active:not(.is-selected)").first();

        if (folderColumn.length > 0 && activeItem.length === 0) {
            // It means that the item is ".is-active.is-selected" which is not considered as changing folder.
            // So we have to pick its parent as the actual folder.
            folderColumn = folderColumn.prev();
            activeItem = folderColumn.find(".coral-ColumnView-item.is-active").first();
        }

        var crumbs = el.children(".granite-endor-crumbs-item");

        var totalColumns;
        if (folderColumn.length === 0) {
            totalColumns = 0;
        } else {
            totalColumns = folderColumn.prevAll(".coral-ColumnView-column").length + 1;
        }

        if (totalColumns > crumbs.length) {
            // navigating to a child -> add crumb
            var updatePath = function(parentItem) {
                var parentHref;
                var parentTitle;

                if (parentItem.length) {
                    parentHref = URITemplate.expand(src, {
                        id: parentItem.data("foundationCollectionItemId")
                    });
                    parentTitle = parentItem.find(".foundation-collection-item-title").text();
                } else {
                    parentHref = URITemplate.expand(src, {
                        id: rootId
                    });
                    parentTitle = rootTitle;
                }

                $(document.createElement("a"))
                    .addClass("endor-Crumbs-item granite-endor-crumbs-item")
                    .attr("href", parentHref)
                    .text(parentTitle)
                    .appendTo(el);
            };

            var parentFolder = folderColumn.prev();
            var parentItem = parentFolder.find(".coral-ColumnView-item.is-active");

            if (parentFolder.length === 0 || parentItem.length > 0) {
                updatePath(parentItem);
            } else {
                waitActiveItem(parentFolder, updatePath);
            }
        } else if (totalColumns === crumbs.length) {
            // navigating to a sibling -> do nothing
        } else {
            // navigating to the parent -> remove crumb
            for (var i = crumbs.length - 1; i >= totalColumns; i--) {
                $(crumbs[i]).remove();
            }
        }

        var update = function(activeItem) {
            var title;
            if (totalColumns > 0) {
                title = activeItem.find(".foundation-collection-item-title").text();
            } else {
                title = rootTitle;
            }
            $(".endor-BlackBar-title").first().text(title);

            var id;
            var pageTitle;

            if (totalColumns > 0) {
                id = activeItem.data("foundationCollectionItemId");
                pageTitle = el.data("graniteEndorCrumbsPagetitletemplate").replace("{{title}}", title);
            } else {
                id = rootId;
                pageTitle = el.data("graniteEndorCrumbsRootpagetitle");
            }

            var url = URITemplate.expand(src, {
                id: id
            });

            History.replaceState(null, pageTitle, url);
        };

        if (totalColumns === 0 || activeItem.length > 0) {
            update(activeItem);
        } else {
            waitActiveItem(folderColumn, update);
        }
    });
})(document, Granite.$, Granite.URITemplate);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
// @deprecated
(function(window, document, $, URITemplate, Granite) {
    "use strict";

    var REFRESH_INTERVAL = 60000;
    var KEY_DATA = "granite.endor.badge.data";
    var KEY_TIMESTAMP = "granite.endor.badge.timestamp";

    var currentToggleable;
    var lastXhr;

    function getData(src, resolveWhenNewData) {
        var timestamp = parseInt(window.sessionStorage.getItem(KEY_TIMESTAMP), 10);
        var stale = isNaN(timestamp) || timestamp + REFRESH_INTERVAL <= Date.now();

        if (!stale) {
            if (resolveWhenNewData) {
                return $.Deferred().reject().promise();
            } else {
                var data = window.sessionStorage.getItem(KEY_DATA);
                if (data) {
                    return $.Deferred().resolve(JSON.parse(data)).promise();
                }
            }
        }

        if (lastXhr && lastXhr.state() === "pending") {
            lastXhr.abort();
        }

        lastXhr = $.ajax({
            url: src,
            cache: false
        });

        return lastXhr.then(function(data) {
            try {
                currentToggleable = null;

                window.sessionStorage.setItem(KEY_TIMESTAMP, Date.now());
                window.sessionStorage.setItem(KEY_DATA, JSON.stringify(data));
            } catch (e) {
                // @TODO do something with the exception.
            }

            return data;
        });
    }

    function getToggleable(state, consoleURL) {
        if (currentToggleable) {
            currentToggleable.find(".granite-endor-badge-console").attr("href", consoleURL);

            // Since we know from other method that both state and the toggleable element are always in sync
            // we just return the cached element instead of rerendering.
            return currentToggleable;
        }

        // eslint-disable-next-line max-len
        var div = $(document.createElement("div")).addClass("foundation-toggleable coral-Popover endor-List foundation-layout-util-maxheight80vh foundation-layout-util-breakword");

        if (state.data) {
            state.data.forEach(function(v) {
                var item = $(document.createElement("div"))
                    .addClass("endor-List-item endor-List-item--interactive endor-Notification")
                    // v.title is already XSS checked in the server
                    .html(v.title)
                    .appendTo(div);

                if (v.payload) {
                    var payload = v.payload;

                    item.append(document.createTextNode(" "));

                    var a = $(document.createElement("a"))
                        .addClass("coral-Link")
                        .html("(" + payload.title + ")"); // payload.title is already XSS checked in the server

                    if (payload.href && payload.href.indexOf("#") !== 0) {
                        a.attr("href", payload.href);
                        a.attr("target", "_blank");
                    }

                    a.appendTo(item);
                }
            });
        }

        $(document.createElement("div"))
            .addClass("endor-List-item endor-List-item--interactive")
            .appendTo(div)
            .append($(document.createElement("a"))
                .addClass("granite-endor-badge-console coral-Link")
                .attr("href", consoleURL)
                .text(Granite.I18n.get("View all ({0} new)", state.total, "link to notification inbox")));

        currentToggleable = div;
        return div;
    }

    function updateBadge(el, src, resolveWhenNewData) {
        getData(src, resolveWhenNewData).then(function(data) {
            el.text(data.total);

            if (data.total) {
                el.removeClass("is-empty");
            } else {
                el.addClass("is-empty");
            }
        });
    }

    // Assume the badge element is only injected to the DOM during page load only.
    $(function() {
        var el = $(".granite-endor-badge").first();
        var src = el.data("graniteEndorBadgeSrc");

        if (!src) {
            return;
        }

        updateBadge(el, src);

        setInterval(function() {
            updateBadge(el, src, true);
        }, 2000);
    });

    $(document).on("click", ".granite-endor-badge", function(e) {
        e.preventDefault();

        var el = $(this);
        var src = el.data("graniteEndorBadgeSrc");

        if (!src) {
            return;
        }

        var consoleURL = URITemplate.expand(el.attr("data-granite-endor-badge-console"), {
            ref: window.location.href
        });

        getData(src).then(function(data) {
            if (data.total === 0) {
                window.location = consoleURL;
                return;
            }

            var toggleable = getToggleable(data, consoleURL);

            if (toggleable.parent().length > 0) {
                var api = toggleable.adaptTo("foundation-toggleable");
                if (api.isOpen()) {
                    api.hide();
                    toggleable.detach();
                } else {
                    api.show(el[0]);
                }
            } else {
                toggleable.appendTo(document.body);
                toggleable.adaptTo("foundation-toggleable").show(el[0]);
            }
        }, function() {
            window.location = consoleURL;
        });
    });
})(window, document, Granite.$, Granite.URITemplate, Granite);

