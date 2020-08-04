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
    var ns = "cq-common-admin-timeline-toolbar";
    var actionsSelector = ".cq-common-admin-timeline-toolbar-actions";
    var timelineSelector = ".cq-common-admin-timeline";
    var eventSelector = ".cq-common-admin-timeline-event";
    var toggleableSelector = ".cq-common-admin-timeline-toggleable";
    var resizeEventName = "cq-common-admin-timeline-resize";
    var toggleKey = "div#versionPopup";

    // button in main actions menu: listener of the action button (e.g. "Start Workflow") to open the action layer
    $(document).on("click." + ns, actionsSelector + "-button", function(e) {
        var rel = $(this).data("rel");
        var layer = $("." + rel);
        var doShow = true;
        var $timeline = $(timelineSelector);
        if (!checkIfKeypress(e)) {
            return false;
        }
        if (!layer.attr("hidden")) {
            // button for main menu: if main menu is visible hide it (toggle)
            doShow = false;
            $(this).attr('aria-expanded',false);
        }
        var actions = $(actionsSelector);
        actions.attr("hidden", true);
        if (doShow && rel === "cq-common-admin-timeline-toolbar-actions-main") {
            $(this).attr('aria-expanded',true);
            $("." + rel).removeAttr("hidden");
            $("." + rel + " button:first-child").focus();
        }
        if (doShow && rel === "cq-common-admin-timeline-toolbar-actions-version") {
            $("." + rel).removeAttr("hidden");
            $("." + rel + " div input[name='label']").focus();
        }
        if (doShow && rel === "cq-common-admin-timeline-toolbar-actions-workflow") {
            $("." + rel).removeAttr("hidden");
            $("." + rel + " button:first-child").focus();
        }
        // resize events wrapper and scroll to former position
        $timeline.trigger(resizeEventName, { preserveScrollTop: true });
    });

    checkIfKeypress = function(e) {
        var x = e.x || e.clientX;
        var y = e.y || e.clientY;
        if (!x && !y) {
            return false;
        }
        return true;
    };

    // listener of the cancel buttons: hide all
    $(document).on("click." + ns, actionsSelector + "-cancel", function(e) {
        hideActionButton();
    });

    hideActionButton = function() {
        var $timeline = $(timelineSelector);
        $(actionsSelector).attr("hidden", true);
        // resize events wrapper and scroll to former position
        $(toggleKey).attr('aria-expanded',false);
        $timeline.trigger(resizeEventName, { preserveScrollTop: true });
    };

    $(document).on("keypress." + ns, actionsSelector + "-button", function(e) {
        if (e.keyCode === 27 || e.keyCode === 13 || e.keyCode === 32) {
        //allows entering if (27=Esc Key) (13=Enter Key) (32 = space Key)are pressed
            e.stopPropagation();
            e.preventDefault();
            var rel = $(this).data("rel");
            var layer = $("." + rel);
            var doShow = true;
            var $timeline = $(timelineSelector);
            if (!layer.attr("hidden")) {
              // button for main menu: if main menu is visible hide it (toggle)
              doShow = false;
            }
            var actions = $(actionsSelector);
            actions.attr("hidden", true);
            $(toggleKey).attr('aria-expanded',false);
            $(toggleKey).focus();
            takeKeyPressAction(e,rel);
        // resize events wrapper and scroll to former position
            $timeline.trigger(resizeEventName, { preserveScrollTop: true });
        }
    });

    takeKeyPressAction = function(e,rel) {
        if ((e.keyCode === 13 || e.keyCode === 32) && rel === "cq-common-admin-timeline-toolbar-actions-main") {
            //allows removal of hidden attribute from specific element if (13=Enter Key) (32 = space Key) are pressed
            $(toggleKey).attr('aria-expanded',true);
            $("." + rel).removeAttr("hidden");
            $("." + rel + " button:first-child").focus();
        }
        if ((e.keyCode === 13 || e.keyCode === 32)  && rel === "cq-common-admin-timeline-toolbar-actions-version") {
            //allows removal of hidden attribute from specific element if (13=Enter Key) (32 = space Key) are pressed
            $(toggleKey).attr('aria-expanded',true);
            $("." + rel).removeAttr("hidden");
            $("." + rel + " div input[name='label']").focus();
        }
        if ((e.keyCode === 13 || e.keyCode === 32)  && rel === "cq-common-admin-timeline-toolbar-actions-workflow") {
            //allows removal of hidden attribute from specific element if (13=Enter Key) (32 = space Key) are pressed
            $(toggleKey).attr('aria-expanded',true);
            $("." + rel).removeAttr("hidden");
            $("." + rel + " button:first-child").focus();
        }
    };

    $(document).on("keypress." + ns, actionsSelector + "-cancel", function(e) {
        if (e.keyCode === 13 || e.keyCode === 32) {
           //allows entering if (13=Enter Key) (32 = space Key) are pressed
            hideActionButton();
            $(toggleKey).focus();
        }
    });

    function hideToggleables(thisToggleable) {
        // hide all other toggleable menus
        $(toggleableSelector).each(function() {
            if (this !== thisToggleable) {
                $(this).attr("hidden", true);
            }
        });
    }

    function deselectEvents() {
        $(eventSelector).removeClass("active");
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

/**
 * Generic selection handling of timeline events.
 * Selecting an event adds class "is-active" to the root element. The class "is-active" is removed from all other actions.
 */

(function(document, $) {
    "use strict";

    var eventsNs = "cq-common-admin-timeline-events";
    var eventName = "cq-common-admin-timeline-change";
    var ns = "cq-common-admin-timeline-toolbar-event";
    var eventSelector = ".cq-common-admin-timeline-event";
    var toggleableSelector = ".cq-common-admin-timeline-toggleable";
    var versionSectionSelector = ".version-section";
    var versionFormContainerSelector = ".version-form-container";

    // event: select on tap
    $(document).on("click", eventSelector, function(e) {
        if ($(e.target).closest(".version-section-container").find("[iscurrentversion='true']").length > 0) {
            // handler not to invoked for "Current version"
            return;
        }
        eventHandler(e, $(this), $(e.target).attr("name"));
    });

    $(document).on("keyup", versionSectionSelector + ":not([iscurrentversion='true'])", function(e) {
        if (e.keyCode === 13 || e.keyCode === 32 || e.keyCode === 27) {
            e.stopPropagation();
            if (e.keyCode === 27) {
                if ($(this).closest(".version-section-container").hasClass("is-active")) {
                    // collapse
                    eventHandler(e, $(e.target).closest(".version-section-container"), "");
                }
            } else {
                // toggle state
                eventHandler(e, $(e.target).closest(".version-section-container"), $(e.target).attr("name"));
            }
        }
    });

    $(document).on("keyup", versionFormContainerSelector, function(e) {
        if (e.keyCode === 27) {
            e.stopPropagation();
            // collapse
            eventHandler(e, $(e.target).closest(".version-section-container"), "");
        }
    });

    // stop propagation on buttons inside an event
    $(document).on("click", eventSelector + " a", function(e) {
        e.stopPropagation();
    });
    $(document).on("click", eventSelector + " button", function(e) {
        e.stopPropagation();
    });

    $(document).on("click." + ns, ".cq-common-admin-timeline-event-action-ok", function(e) {
        // avoid regular deselecting on div tab
        e.stopPropagation();
        var form = $(this).closest("form");
        var action = form.attr("action");
        var path = $("[name=\"path\"]", form).val();
        var id = $("[name=\"collectionItemId\"]", form).val();
        var disable = form.data("disable");

        if (disable) {
            $(disable).attr("disabled", true);
        }

        if (action.indexOf("$resourcepath") !== -1) {
            action = action.replace(/\$resourcepath/g, path);
            form.attr("action", action);
        }

        $.ajax({
            url: encodeURIComponent(form.attr("action")).replace(/%2F/g, "/"),
            type: form.attr("method") || "post",
            data: form.serializeArray(),
            success: function() {
                var itemId = id ? id : path;
                var $collectionItem = findCollectionItemWithId(itemId);
                var collection = $collectionItem.closest(".foundation-collection");
                if (collection.adaptTo("foundation-collection") !== undefined) {
                    collection.adaptTo("foundation-collection").reload();
                } else {
                    $(eventSelector).trigger(eventName + "." + eventsNs);
                }
                var msg = form.data("successmessage");
                if (msg) {
                    $(window).adaptTo("foundation-ui").notify("", Granite.I18n.getVar(msg), "success");
                }
            },
            error: function() {
                var msg = form.data("errormessage");
                $(window).adaptTo("foundation-ui").notify("", msg ? Granite.I18n.getVar(msg) : Granite.I18n.get("An error occured"), "error");
                form.closest(eventSelector).hide();
            },
            complete: function() {
                $(disable).attr("disabled", false);
            }
        });
    });

    function eventHandler(e, $timelineObj, attrValue) {
        if (attrValue === "label" || attrValue === "comment") {
            e.stopPropagation();
            return;
        }
        if ($timelineObj.hasClass("is-active")) {
            // current expanded -> going to collapse
            deselectAll();
            $timelineObj.find("section").attr("aria-expanded", "false");
            $timelineObj.find("section").focus();
        } else {
            // current collapsed -> going to expand
            deselectAll();
            $timelineObj.addClass("is-active");
            $timelineObj.find("section").attr("aria-expanded", "true");

            var $textFieldsInForm = $timelineObj.find("form").find("input[type='text']");
            if ($textFieldsInForm && $textFieldsInForm.length > 0) {
                $textFieldsInForm[0].focus();
            }
        }
        // hide all toggleables (actions of workflow alerts or toolbar)
        $(toggleableSelector).attr("hidden", true);
    }

    function findCollectionItemWithId(id) {
        return $(".foundation-collection-item").filter(function() {
            return this.getAttribute("data-foundation-collection-item-id") === id;
        });
    }

    function deselectAll() {
        $(eventSelector).removeClass("is-active");
    }

    /** Method is to handle the Keyboard Web accessibility for timeline versions and comments list **/
    $(document).on("keyup", eventSelector, function(e) {
        if (e.keyCode === 13 || e.keyCode === 32 || e.keyCode === 27) { // Keycode 13 = Enter button, 32 = space, 27 = esc
            e.stopPropagation();
            var target = $(e.target);
            var $this = $(this);
            var attrValue = target.attr("name");
            if (attrValue === "label" || attrValue === "comment") {
                e.stopPropagation();
                return;
            }
            if (e.keyCode === 27 && $this.hasClass("is-active")) {
                deselectAll();
                $($this).children("section").attr("aria-expanded", false);
            } else if ($this.hasClass("is-active")) {
                deselectAll();
                $($this).children("section").attr("aria-expanded", false);
            } else {
                deselectAll();
                $this.addClass("is-active");
                $($this).children("section").attr("aria-expanded", true);
            }
        }
        // hide all toggleables (actions of workflow alerts or toolbar)
        $(toggleableSelector).attr("hidden", true);
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
 * Listens to the general timeline change event [0] which is triggered for instance by mode or selection change. This
 * listener determines which path or paths should be loaded into the timeline and triggers the timeline items event [1].
 *
 * Listeners of latter will refresh the items of the timeline like the timeline events or the workflow alert, see
 * alerts.change.js and events.change.js.
 *
 * [0] cq-common-admin-timeline-change.cq-common-admin-timeline
 * [1] cq-common-admin-timeline-change.cq-common-admin-timeline-items
 */

(function(document, $) {
    "use strict";

    var eventName = "cq-common-admin-timeline-change";
    var ns = "cq-common-admin-timeline";
    var itemsNs = "cq-common-admin-timeline-items";
    var timelineSelector = ".cq-common-admin-timeline";
    var contentPathName = "foundation-content-path";

    var paths = [];
    var formerPaths = [];


    // Listen to change events of the timeline

    $(document).on(eventName + "." + ns, timelineSelector, function(e, options) {
        options = options || {};
        var formerPaths = [];
        if ($(timelineSelector).data("paths")) {
            formerPaths = $(timelineSelector).data("paths");
        }

        if (options.paths) {
            paths = options.paths;
        } else if (options && options.refresh) {
            // refresh recent paths (e.g. after creating a comment in bulk properties)
            paths = formerPaths;
        } else {
            paths = getContentPath();
        }

        $(timelineSelector).data("paths", paths);

        if (!$(timelineSelector).is(":visible") || options.avoidRefresh || (formerPaths === "" && paths.length === 0)) {
            // refreshing chocked because timeline rail view is not visible or by options
            return;
        }

        // full refresh of the timeline
        // hide first; the timeline resize event will fade it in
        $(timelineSelector).hide();
        $(this).trigger(eventName + "." + itemsNs, options);
    });

    /**
     * Get the current content path.
     */
    function getContentPath() {
        var timeline = $("." + contentPathName).data("timeline");
        if (!timeline) {
            // content path is not flagged to have a timeline
            return "";
        }
        var path = $("." + contentPathName).data(contentPathName);
        if (path && path.lastIndexOf("/") == path.length - 1) {
            // remove slash at the end
            path = path.substring(0, path.length - 1);
        }
        return [ path ] || [];
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

/**
 * Listens to the timeline items change [0] and the timeline events change events. This listener refreshes the
 * events of the timeline i.e. the comments, versions etc.
 *
 * [0] cq-common-admin-timeline-change.cq-common-admin-timeline-items
 * [1] cq-common-admin-timeline-change.cq-common-admin-timeline-events
 */

(function(document, $) {
    "use strict";

    var eventName = "cq-common-admin-timeline-change";
    var itemsNs = "cq-common-admin-timeline-items";
    var eventsNs = "cq-common-admin-timeline-events";
    var timelineSelector = ".cq-common-admin-timeline";
    var eventsSelector = ".cq-common-admin-timeline-events";
    var filterSelector = ".cq-common-admin-timeline-filter";
    var toolbarSelector = ".cq-common-admin-timeline-toolbar";
    var toolbarActionsSelector = ".cq-common-admin-timeline-toolbar-actions";
    var foundationSelectionsItem = ".foundation-selections-item coral-card";

    var stateSelector = ".cq-common-admin-timeline-state";
    var emptyStateSelector = ".cq-common-admin-timeline-state-empty";
    var multiStateSelector = ".cq-common-admin-timeline-state-multi";
    var unavailableStateSelector = ".cq-common-admin-timeline-state-unavailable";
    var errorStateSelector = ".cq-common-admin-timeline-state-error";

    var resizeEventName = "cq-common-admin-timeline-resize";

    var scrollareaSelector = ".cq-common-admin-timeline-scrollarea";
    var endSelector = ".cq-common-admin-timeline-events-end";
    var moreSelector = ".cq-common-admin-timeline-more";

    var paths = [];
    // paging: index of current page
    var index = 0;
    // paging: top most event before new events have been loaded
    var formerTopEvent;
    var formerBottomEvent;
    var defaultSort = "asc";

    // Listen to change events to refresh the list of events
    $(document).on(eventName + "." + itemsNs + "." + eventsNs, timelineSelector, function(e, options) {
        options = options || {};
        var paths = [];
        if ($(timelineSelector).data("paths")) {
            paths = $(timelineSelector).data("paths");
        }
        var $filter = $(filterSelector);
        $filter.show();

        if ((paths.length === 0) || (paths.length === 1 && paths[0] === "")) {
            // selection mode (card layout) without selection
            // hide the toolbar (comment field etc.)
            $(toolbarSelector).hide();
            // hide the events
            $(eventsSelector).hide();
            $(emptyStateSelector).show().siblings().hide();
            $(moreSelector).hide();
            $(stateSelector).show();
        } else {
            if (paths.length > 1) {
                // multi selection
                $(toolbarSelector).show();
                $(eventsSelector).hide();
                $(multiStateSelector).show().siblings().hide();
                $(moreSelector).hide();
                $(stateSelector).show();
            } else {
                // single path available

                var isAvailable = true;
                if ($(foundationSelectionsItem).length > 0) {
                    // selection mode: check if the timeline is available for the selected item
                    isAvailable = $(foundationSelectionsItem).data("timeline");
                }

                if (isAvailable) {
                    $(stateSelector).hide();
                    $(toolbarSelector).show();
                    // card layout: default mode (current page) or single selection
                    // list layout: single or no selection (current page)

                    // disable the more button while loading
                    $(moreSelector + " button").attr("disabled", "");
                    // append: load new events (paging): increase index, otherwise page 0
                    index = options.append ? index + 1 : 0;
                    // the current top most event (note: get(0) would be the more button)
                    formerTopEvent = $(".cq-common-admin-timeline-event").get(1);
                    formerBottomEvent = $(".cq-common-admin-timeline-event").get($(".cq-common-admin-timeline-event").size() - 1);

                    $.ajax({
                        url: $(eventsSelector).data("url"),
                        data: {
                            "item": paths[0],
                            "filter": $filter.length > 0 ? $filter[0].value : "",
                            "index": index,
                            "sort": $(eventsSelector).data("sort") || defaultSort
                        },
                        cache: false
                    })
                        .done(function(resp) {
                            if (resp === "") {
                                $(toolbarSelector).hide();
                                $(eventsSelector).hide();
                                $(unavailableStateSelector).show().siblings().hide();
                                $(stateSelector).hide();
                                $filter.hide();
                            } else {
                                render(resp, options.append);
                                // triggering contentloaded required e.g. to initialize dropdowns
                                $(eventsSelector).trigger("foundation-contentloaded.foundation");
                                $(eventsSelector).show();
                            }
                        })
                        .fail(function() {
                            $(eventsSelector).hide();
                            $(errorStateSelector).show().siblings().hide();
                            $(stateSelector).show();
                        });
                } else {
                    // timeline unavailable
                    $(toolbarSelector).hide();
                    $(eventsSelector).hide();
                    $(unavailableStateSelector).show().siblings().hide();
                    $(stateSelector).show();
                }
            }
        }
    });

    /**
     * Renders the given HTML
     * @param html
     */
    function render(html, append) {

        if (append) {
            // paging: prepend the loaded events

            if ($(eventsSelector).data("sort") == "desc") {
                var formerScrollTop = $(scrollareaSelector).scrollTop();
                $(eventsSelector).append(html);
            } else {
                $(eventsSelector).prepend(html);
            }

            displayMoreButton();

            // position is required for proper scrolling (hence set here instead of in style sheet)
            $(scrollareaSelector).css("position", "relative");

            if ($(eventsSelector).data("sort") === "desc") {
                var siblings = $(formerBottomEvent).nextAll();
                var whichSibling = siblings.size() < 4 ? siblings.size() : 4;
                var sibling = siblings.get(whichSibling - 1);
                var distance = $(sibling).position().top - $(formerBottomEvent).position().top;
                $(timelineSelector).trigger(resizeEventName, { scrollTop: formerScrollTop });
                $(scrollareaSelector).animate({ scrollTop: formerScrollTop + distance }, whichSibling * 400);
            } else {
                // positions have to be read before resizing
                // top of the former top most event minus the height of the section of the more button
                var formerTopEventTop = $(formerTopEvent).position().top - $(moreSelector).outerHeight();
                // top of the fourth closest previous sibling (or nearer if not available)
                var siblings = $(formerTopEvent).prevAll();
                var whichSibling = siblings.size() < 4 ? siblings.size() : 4;
                var sibling = siblings.get(whichSibling - 1);
                var siblingTop = $(sibling).position().top;
                // after resize "jump" to the former top event first (visually the same position as before)
                $(timelineSelector).trigger(resizeEventName, { scrollTop: formerTopEventTop });
                // then scroll four new siblings into view
                $(scrollareaSelector).animate({ scrollTop: siblingTop }, whichSibling * 400);
            }

        } else {
            // rendering the initial events of an item

            // hide any toolbar actions
            $(toolbarActionsSelector).attr("hidden", true);

            $(eventsSelector).html(html);
            displayMoreButton();
            $(eventsSelector).show();

            $(timelineSelector).trigger(resizeEventName, { scrollToBottom: true });
        }
    }

    /**
     * Displays or hides the more button (actually the wrapper) depending on the
     * existence of $(endSelector). The according element must be provided in the
     * DOM by the events provider when no more events are available.
     */
    function displayMoreButton() {
        if ($(endSelector).length > 0) {
            // end of events reached
            $(moreSelector).hide();
        } else {
            $(moreSelector).show();
            $(moreSelector + " button").removeAttr("disabled");
        }
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

/**
 * Listens to the timeline items change [0] and the timeline alerts change events. This listener refreshes the
 * alerts of the timeline e.g. the workflow alerts.
 *
 * [0] cq-common-admin-timeline-change.cq-common-admin-timeline-items
 * [1] cq-common-admin-timeline-change.cq-common-admin-timeline-alerts
 */

(function(document, $) {
    "use strict";

    var eventName = "cq-common-admin-timeline-change";
    var itemsNs = "cq-common-admin-timeline-items";
    var alertsNs = "cq-common-admin-timeline-alerts";
    var timelineSelector = ".cq-common-admin-timeline";
    var alertsSelector = ".cq-common-admin-timeline-alerts";

    var errorText = Granite.I18n.get("An error occurred.");

    var paths = [];

    var resizeEventName = "cq-common-admin-timeline-resize";

    // Listen to change events to refresh the alert
    $(document).on(eventName + "." + itemsNs + "." + alertsNs, timelineSelector, function(e) {
        var paths = [];
        if ($(timelineSelector).data("paths")) {
            paths = $(timelineSelector).data("paths");
        }

        if ((paths.length === 0) || (paths.length === 1 && paths[0] === "") || paths.length > 1) {
            $(alertsSelector).html("");
            $(alertsSelector).hide();
            $(timelineSelector).trigger(resizeEventName);
        } else {
            $.ajax({
                url: $(alertsSelector).data("url"),
                cache: false,
                data: { "item": paths[0] }
            })
                .done(function(resp) {
                    render(resp);
                    // triggering contentloaded required e.g. to initialize dropdowns
                    $(alertsSelector).trigger("foundation-contentloaded.foundation");
                    $(alertsSelector).show();
                    $(timelineSelector).trigger(resizeEventName);
                })
                .fail(function() {
                    render(errorText);
                    $(alertsSelector).hide();
                });
        }
    });

    /**
     * Renders the given HTML
     * @param html
     */
    function render(html) {
        $(alertsSelector).html(html);
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

/**
 * Listens to change events of the filter dropdown and triggers the general timeline change event [0].
 *
 * [0] cq-common-admin-timeline-change.cq-common-admin-timeline
 */
(function(window, document, $) {
    "use strict";

    var eventName = "cq-common-admin-timeline-change";
    var eventsNs = "cq-common-admin-timeline-events";
    var eventsSelector = ".cq-common-admin-timeline-events";
    var filterSelector = ".cq-common-admin-timeline-filter";

    function trackEvent(selectEl) {
        var eventData = {
            element: selectEl.value,
            type: "select-item",
            action: "change",
            widget: {
                name: "timeline filter",
                type: "select"
            },
            feature: "aem:timeline"
        };

        $(window).adaptTo("foundation-tracker").trackEvent(eventData);
    }

    /**
     * Handle filter change (select "All", "Comments", "Versions" ...)
     */
    $(document).on("change", filterSelector, function(e) {
        // stop general change event (without namespace, triggered by the selection)
        e.stopPropagation();
        $(eventsSelector).trigger(eventName + "." + eventsNs);
        trackEvent(this);
    });
})(window, document, Granite.$);

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
 * Script to handle continuous loading of the events.
 */

(function(document, $) {

    var ns = "cq-common-admin-timeline-toolbar";
    var moreSelector = ".cq-common-admin-timeline-more button";
    var eventName = "cq-common-admin-timeline-change";
    var itemsNs = "cq-common-admin-timeline-items";

    $(document).on("click." + ns, moreSelector, function(e) {
        $(this).trigger(eventName + "." + itemsNs, {
            append: true
        });
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
 * Listens to contentloaded events and triggers the general timeline change event [0].
 *
 * [0] cq-common-admin-timeline-change.cq-common-admin-timeline
 */

(function(document, $) {
    "use strict";

    var eventName = "cq-common-admin-timeline-change";
    var timelineSelector = ".cq-common-admin-timeline";
    var timelineNs = "cq-common-admin-timeline";

    /**
     * Handle content loading
     */
    $(document).on("foundation-contentloaded." + timelineNs, function(e, options) {
        var $timeline = $(timelineSelector);
        var foundationCollectionSelector = "." + $timeline.data("foundationCollectionRel") || "";
        var $collection = $(foundationCollectionSelector + ".foundation-collection");

        window.setTimeout(function() {
            // todo: timeout required because mode is not yet set on foundation contentloaded
            var selectionsCount = 0;
            var collection = $collection.adaptTo("foundation-selections");
            if (collection) {
                selectionsCount = collection.count();
            }
            if ($collection.length === 0 || selectionsCount > 0) {
                // no collection available (e.g. bulk properties)
                // or at least one item is selected:
                // in both cases do not update the timeline
                return;
            } else {
                $timeline.trigger(eventName + "." + timelineNs, options);
            }
        }, 1);

    });

})(document, Granite.$);

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

/**
 * Listens to foundation slections change events (triggered for instance by the card or list layout) and triggers
 * the general timeline change event [0] passing the selected paths.
 *
 * [0] cq-common-admin-timeline-change.cq-common-admin-timeline
 */

(function(document, Granite, $) {
    "use strict";

    var eventName = "cq-common-admin-timeline-change";
    var timelineSelector = ".cq-common-admin-timeline";
    var timelineNs = "cq-common-admin-timeline";

    $(document).on("foundation-selections-change", function(e) {
        var collection = $(e.target);
        if (collection.is(".foundation-layout-card") && !collection.is(".mode-selection")) {
            return;
        }

        var items = collection.find(".foundation-selections-item");

        if (items.length === 0) {
            // no selection: empty timeline
            $(timelineSelector).trigger(eventName + "." + timelineNs, {
                paths: []
            });
        } else {
            // list or card layout and selection: add selected paths
            var paths = [];
            items.each(function() {
                paths.push($(this).data("foundation-collection-item-id"));
            });

            var formerPaths = [];

            if ($(timelineSelector).data("paths")) {
                formerPaths = $(timelineSelector).data("paths");
            }

            $(timelineSelector).trigger(eventName + "." + timelineNs, {
                paths: paths,
                // avoid refresh if mutli selection now and before
                avoidRefresh: paths.length > 1 && formerPaths.length > 1
            });
        }

    });

})(document, Granite, Granite.$);

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
 * Listens to the timeline resize event [0]
 *
 * [0] cq-common-admin-timeline-resize
 */

(function(document, $) {
    "use strict";

    var resizeEventName = "cq-common-admin-timeline-resize";
    var ns = "cq-common-admin-timeline";
    var toolbarSelector = ".cq-common-admin-timeline-toolbar";
    var scrollareaSelector = ".cq-common-admin-timeline-scrollarea";
    var timelineSelector = ".cq-common-admin-timeline";
    var alertsSelector = ".cq-common-admin-timeline-alerts";
    var titleSelector = ".cq-common-admin-timeline-title";


    // Listen to resize events of the timeline

    $(document).on(resizeEventName, timelineSelector, function(e, options) {
        options = options || {};

        $(timelineSelector).fadeIn("fast");
        var $scrollarea = $(scrollareaSelector);
        // to be set before resizing
        var scrollTop = $scrollarea.scrollTop();
        var $toolbar = $(toolbarSelector);

        if ($scrollarea.offset().top === 0) {
            // positions and dimensions not yet available
            return;
        }

        // required for getting correct height
        $toolbar.css("position", "absolute");
        var h = $toolbar.outerHeight();
        $toolbar.css("position", "static");

        $scrollarea.height($(window).height() - $scrollarea.offset().top - h);

        if (options.scrollTop) {
            $scrollarea.scrollTop(options.scrollTop);
        } else if (options.scrollToBottom) {
            $scrollarea.scrollTop($scrollarea.get(0).scrollHeight);
        } else if (options.preserveScrollTop) {
            $scrollarea.scrollTop(scrollTop);
        }
    });


    // proxy for window.resize events
    $(window).on("resize", function(e) {
        $(timelineSelector).trigger(resizeEventName);
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
 * Listens to the click event of the activator (the button in the action bar to show the timeline).
 */

(function(document, $) {
    "use strict";

    var timelineSelector = ".cq-common-admin-timeline";
    var itemsNs = "cq-common-admin-timeline-items";
    var timelineNs = "cq-common-admin-timeline";
    var changeEventName = "cq-common-admin-timeline-change";

    $(document).on("foundation-toggleable-show", function(e) {
        if ($(e.target).hasClass("cq-rail-timeline")) {
            triggerChangeEvent();
        }
    });

    function triggerChangeEvent() {
        var $timeline = $(timelineSelector);
        if ($timeline.length > 0) {
            if ($timeline.data("paths") === undefined) {
                // lazy loading: foundation.selections.change event was not able to set selected paths while the
                // timeline was not available. catch up now.
                var paths = [];
                var collectionSelector = "." + $timeline.data("foundationCollectionRel") || "";
                $(collectionSelector).find(".foundation-collection-item.is-selected").each(function() {
                    paths.push($(this).data("foundation-collection-item-id"));
                });
                $timeline.trigger(changeEventName + "." + timelineNs, { paths: paths });
            } else {
                $timeline.trigger(changeEventName + "." + itemsNs);
            }
        } else {
            // timeline not yet available because of lazy loading. wait for availability.
            window.setTimeout(triggerChangeEvent, 10);
        }
    }

})(document, Granite.$);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2018 Adobe Systems Incorporated
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
(function(window, $) {
    "use strict";

    $(window).adaptTo("foundation-registry").register("foundation.adapters", {
        type: "cq-timeline",
        selector: ".cq-common-admin-timeline",
        adapter: function(el) {
            return {
                /**
                 * Filters the timeline to show only the given type.
                 *
                 * @param {string} [type=all] The type of timeline event to filter.
                 */
                filter: function(type) {
                    type = type || "all";

                    var filterEl = el.querySelector(".cq-common-admin-timeline-filter");

                    if (!filterEl) {
                        return;
                    }

                    var itemEl = filterEl.items.getAll().find(function(itemEl) {
                        return itemEl.value === type;
                    });

                    if (itemEl) {
                        itemEl.selected = true;
                    }
                }
            };
        }
    });
})(window, Granite.$);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2018 Adobe Systems Incorporated
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

    function waitForElement(selector, parent) {
        var $el = $(selector, parent);

        if ($el.length) {
            return $.when($el);
        }

        var deferred = $.Deferred();

        var intervalId = setInterval(function() {
            var $el = $(selector, parent);
            if ($el.length) {
                clearInterval(intervalId);
                deferred.resolve($el);
            }
        }, 50);

        setTimeout(function() {
            clearInterval(intervalId);
            deferred.reject();
        }, 1000);

        return deferred.promise();
    }

    function filterTimeline(timeline, filter) {
        var timelineAPI = timeline.adaptTo("cq-timeline");
        timelineAPI.filter(filter);
    }

    $(document).on("click", ".cq-timeline-control", function(e) {
        e.preventDefault();
        e.stopPropagation();

        var control = $(this);
        var filter = control[0].dataset.cqTimelineControlFilter;

        var item = control.closest(".foundation-collection-item");
        var collection = item.closest(".foundation-collection");
        var selectionAPI = collection.adaptTo("foundation-selections");

        selectionAPI.clear();


        // The following approach is a temporary approach until we have a proper AdaptTo API
        // for the CollectionPage that can toggle the timeline panel for us.
        var timelinePanelEl = document.querySelector(".cq-rail-timeline");

        if (!timelinePanelEl) {
            return;
        }

        var panelId = timelinePanelEl.dataset.shellCollectionpageRailPanel;

        var timeline = $(".cq-common-admin-timeline", timelinePanelEl);

        if (timeline.length) {
            filterTimeline(timeline, filter);
            selectionAPI.select(item[0]);
        } else {
            waitForElement(".cq-common-admin-timeline", timelinePanelEl).then(function(timeline) {
                filterTimeline(timeline, filter);
                selectionAPI.select(item[0]);
            });
        }

        $("#shell-collectionpage-rail-toggle > coral-cyclebutton-item")
            .filter(function() {
                return this.dataset.graniteToggleableControlName === panelId;
            })
            .prop("selected", true);
    });
})(document, Granite.$);

