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
;(function ($, ns) {
    "use strict";

    /**
     * Root object for references manipulation
     * @type {*}
     */
    ns.References = (function () {

        var self = {};

        /**
         * References namespace
         * @type {string}
         */
        self.NAMESPACE = "references";

        /**
         * References namespace for items list
         * @type {string}
         */
        self.NAMESPACE_LIST = "reference-list";

        /**
         * References namespace for items detail
         * @type {string}
         */
        self.NAMESPACE_DETAIL = "detail";

        /**
         * Event when references changes
         * @type {string}
         */
        self.EVENT_CHANGE = "granite-references-change";

        /**
         * Event when resizing
         * @type {string}
         */
        self.EVENT_RESIZE = "granite-references-resize";

        /**
         * Event when selecting all details
         * @type {string}
         */
        self.EVENT_SELECTALL = "granite-references-selectall";

        /**
         * Text to display when selection is empty
         * @type {string}
         */
        self.SELECTION_TEXT_EMPTY = Granite.I18n.get("Select an item to display its references.");

        /**
         * Text to display when selection is multiple
         * @type {string}
         */
        self.SELECTION_TEXT_MULTIPLE = Granite.I18n.get("List of references is not available for multiple selection.");

        /**
         * Text to display when references are not available for the selected item type
         * @type {string}
         */
        self.REFERENCES_UNAVAILABLE = Granite.I18n.get("List of references is not available for the selected item type.");

        /**
         * References root DOM element
         * @type {jQuery}
         */
        self.$root = $("." + self.NAMESPACE);

        /**
         * References message
         * @type {jQuery}
         */
        self.$message = self.$root.find(".message");

        /**
         * References wait indicator
         * @type {jQuery}
         */
        self.$spinner = self.$root.find(".refSpinner");

        /**
         * References list
         * @type {jQuery}
         */
        self.$list = self.$root.find("." + self.NAMESPACE_LIST);

        /**
         * References detail
         * @type {jQuery}
         */
        self.$detail = self.$root.find("." + self.NAMESPACE_DETAIL);

        /**
         * References detail header
         * @type {jQuery}
         */
        self.$detailHeader = self.$detail.find(".detail-header");

        /**
         * References detail body for the list of references
         * @type {jQuery}
         */
        self.$detailList = self.$detail.find(".detail-list");

        /**
         * References detail toolbars container
         * @type {jQuery}
         */
        self.$detailToolbars = self.$detail.find(".detail-toolbars");

        /**
         * References handlers
         * @type {Object}
         */
        self.handlers = {};

        /**
         * Triggers the general references change event
         * @param options Optional event extra parameters
         */
        self.triggerChange = function(options) {
            self.$root.trigger(self.EVENT_CHANGE + "." + self.NAMESPACE, options);
        };

        /**
         * Triggers the general references resize event
         * @param options Optional event extra parameters
         */
        self.triggerResize = function(options) {
            self.$root.trigger(self.EVENT_RESIZE, options);
        };

        /**
         * Hides wait indicator when loading references is completed
         */
        self.hideSpinner = function() {
        	self.$spinner.hide();
    	}

        /**
         * Shows wait indicator while loading references
         */
        self.showSpinner = function() {
            self.$message.hide();
        	self.$spinner.show();
    	}

        /**
         * Shows a panel
         * @param panel {String} Name of the panel to show
         */
        self.showPanel = function(panel) {
            self.$message.toggle(self.$message.hasClass(panel));
            self.$list.toggle(self.$list.hasClass(panel));
            self.$spinner.toggle(self.$spinner.hasClass(panel));
            self.$detail
                .toggle(self.$detail.hasClass(panel))
                .find(".actions").hide()
            ;
            if (panel !== "detail") {
                self.$root.data("type", "");
                self.$root.find(".endor-Panel-title").show();
                self.$root.find(".coral-ColumnView-item--back").hide();
            } else {
                self.$root.find(".endor-Panel-title").hide();
                self.$root.find(".coral-ColumnView-item--back").show();
            }
        };

        /**
         * Displays the given HTML message
         * @param message Message to display
         */
        self.displayMessage = function(message) {
            // Show message
            self.hideSpinner();
            self.$message.html(message);
            self._resetContainers();
        };

        /**
         * Reset all containers and set the counters to zero.
         * @private
         */
        self._resetContainers = function() {

            var $containers = self.$list.find("section");
            $containers.each(function () {
                var $section = $(this);

                // Empty list of references
                $section.find(".detail-references").val("");

                // Reset header's counter
                var $header = $section.find("> .info a");
                var text = $header.text();
                if (text.length > 0 && text.charAt(text.length - 1) === ")") {
                    text = text.substr(0, text.lastIndexOf(" "));
                }
                $header.text(text + " (0)");

                // hide next button
                $section.removeClass("coral-ColumnView-item--hasChildren");

            });

            self.showPanel("message");
        };

        /**
         * Appends the provided reference to its corresponding container
         * @param reference HTML string of the reference
         */
        self.appendReference = function(reference) {
            var $reference = $(reference);
            if ($reference.data("type")) {
                // Find the corresponding container
                var $container = self.$list.find("section." + $reference.data("type"));

                // Append reference
                var $refs = $($container.find(".detail-references"));
                var val = $refs.val() + reference.outerHTML;
                $refs.val(val);

                // Refresh references count
                var $header = $container.find("> .info a");
                var count = val.match(/<section/g);
                var text = $header.text();
                if (text.length > 0 && text.charAt(text.length - 1) === ")") {
                    text = text.substr(0, text.lastIndexOf(" "));
                }
                $header.text(text + " (" + count.length + ")");

                // Show/hide next button based on references count
                if (count.length > 0) {
                    $container.addClass("coral-ColumnView-item--hasChildren");
                } else {
                    $container.removeClass("coral-ColumnView-item--hasChildren");
                }

            }
        };

        /**
         * Sets the toolbars to the provided value for reference type
         * @param toolbars HTML string representing the toolbars
         * @param type Reference type to add the toolbars for
         */
        self.setToolbars = function(toolbars, type) {
            if (toolbars && type) {
                var $container = self.$list.find("section." + type); // Find the corresponding container

                // Set the toolbars
                var $toolbars = $($container.find(".detail-toolbars"));

                if (toolbars && typeof(toolbars) === 'string') {
                    $toolbars.val(toolbars); // Set the toolbars
                } else {
                    $toolbars.val(""); // No toolbars, reset
                }
            }
        };

        /**
         * Gets the current reference paths
         * @returns {Array} Current reference paths
         */
        self.getReferencePaths = function() {
            return self.$root.data("paths") ? self.$root.data("paths").split(",") : [];
        };

        /**
         * Gets the current reference path
         * @returns {string} Current reference path
         */
        self.getReferencePath = function() {
            var paths = self.getReferencePaths();
            return paths.length > 0 ? paths[0] : undefined;
        };

        /**
         * Tests paths for validity; displaying messages if invalid
         * @returns {Boolean | undefined} True if paths are valid, undefined otherwise
         */
        self.checkHasSingleValidReferencePath = function(paths) {
            if (paths.length === 0 || (paths.length === 1 && paths[0] === "")) {
                // selection mode (card layout) without selection
                self.displayMessage(self.SELECTION_TEXT_EMPTY);
            } else if (paths.length > 1) {
                // multi selection
                self.displayMessage(self.SELECTION_TEXT_MULTIPLE);
            } else if ($(".foundation-selections-item").data("references") == false) {
                self.displayMessage(self.REFERENCES_UNAVAILABLE);
            } else {
                return true; // Valid
            }
        };

        /**
         * Refresh the current detail
         */
         self.refreshDetail = function() {
             var type = self.$root.data("type");
             self.requestReferences(function() {
                 self.loadDetail(type);
             });
         };

        /**
         * Refresh the selected detail section
         */
        self.refreshDetailSection = function(type) {
            var paths = self.getReferencePaths();

            if (self.checkHasSingleValidReferencePath(paths)) {
                // get references for that path
                $.ajax({
                    url: Granite.HTTP.externalize(self.$root.data("componentPath") + ".provider.html"),
                    data: {
                        item: paths[0]
                    },
                    cache: false
                }).done(function(result) {
                        self._resetContainers();
                        var $selected = self.$detailList.find("section.active");
                        var path = $selected.data("path");
                        self.$detailList.empty();
                        $(result).each(function() {
                            if($(this).data("type") === type) {
                                self.$detailList.append($(this));
                                if($(this).data("path") === path) {
                                    $selected = $(this);
                                }
                            }
                        });
                        self.showPanel("detail");
                        self.triggerResize({detail:true});
                        $selected.trigger("click");
                    }).fail(function() {
                        self.displayMessage("An error occurred while refreshing list of references.");
                    });
            }
        };

        /**
         * Listen to change events of the references
         */
        self.$root.on(self.EVENT_CHANGE + "." + self.NAMESPACE, function(e, options) {
            var paths = [];
            options = options || {};

            if (options.paths) {
                paths = options.paths;
            } else if (options && options.refresh) {
                // refresh recent paths (e.g. after creating a comment in bulk properties)
            }

            if (paths.length === 1) {
                self.$root.data("paths", paths[0]);
            } else if (paths.length === 0) {
                self.$root.data("paths", "");
            } else {
                var p = "";
                var comma = "";
                for (var i in paths) {
                    p += comma + paths[i];
                    comma = ",";
                }
                self.$root.data("paths", p);
            }

            if (!self.$root.is(":visible") || options.avoidRefresh) {
                // refreshing chocked because references rail view is not visible or by options
                return;
            }

            // full refresh of the references (hide first)
            self.$root
                .hide()
                .fadeIn("fast")
                .trigger(self.EVENT_CHANGE + "." + self.NAMESPACE + "-" + self.NAMESPACE_LIST)
            ;
        });

        /**
         * Listen to change events of the references list
         */
        self.$root.on(self.EVENT_CHANGE + "." + self.NAMESPACE + "-" + self.NAMESPACE_LIST, function() {
            self.requestReferences(function() {
                self.requestToolbars(function() {
                    self.showPanel("reference-list");
                    self.triggerResize({list:true,scrollToTop:true});
                });
            });
        });

        /**
         * Request the references
         * @param callback The method to call after the references have been requested and appended to
         *                 the hidden textarea
         */
        self.requestReferences = function(callback) {

            self.showSpinner();

            var paths = self.getReferencePaths();

            if (self.checkHasSingleValidReferencePath(paths)) {
                // get references for that path
                $.ajax({
                    url: Granite.HTTP.externalize(self.$root.data("componentPath") + ".provider.html"),
                    data: {
                        item: paths[0]
                    },
                    cache: false
                }).done(function(result) {
                        self._resetContainers();
                        self.$list.find("section .detail-references").val("");
                        $(result).each(function() {
                            self.appendReference(this);
                        });
                        self.hideSpinner();
                        if (typeof callback != "undefined") {
                            callback();
                        }
                    })
                    .fail(function() {
                        self.displayMessage("An error occurred while refreshing list of references.");
                    })
                ;
            }
        };

        /**
         * Request the toolbars
         * @param callback The method to call after the toolbars have been requested and set for
         *                 the hidden textarea
         */
        self.requestToolbars = function(callback) {
            self.showSpinner();

            var paths = self.getReferencePaths();

            if (self.checkHasSingleValidReferencePath(paths)) {
                $.ajax({
                    url: Granite.HTTP.externalize(self.$root.data("componentPath") + ".html" + paths[0]),
                    cache: false
                }).done(function(result) {
                        self.$list.find("section .detail-toolbars").val(""); // Clear the existing toolbar textareas

                        $(result).find(".granite-references-item[data-type]").each(function() {
                            var type = $(this).data('type');
                            var toolbars = $(this).find('.detail-toolbars').val().trim();
                            if (toolbars) {
                                self.setToolbars(toolbars, type);
                            }
                        });
                        self.hideSpinner();
                        if (typeof callback != "undefined") {
                            callback();
                        }
                    }).fail(function() {
                        self.displayMessage("An error occurred while refreshing list of references.");
                    });
            }
        };

        /**
         * Listen to tap/click on references types
         */
        self.$list.on("click", "section", function() {
            self.loadDetail($(this));
        });

        /**
         * Load the detail of the given type or section
         * @param type The name of the section or the section of the references list itself
         */
        self.loadDetail = function(type) {
            var $section;
            if (typeof type === "string") {
                $section = self.$list.find("section." + type);
            } else {
                $section = type;
            }

            // Get references to add
            var refs = $section.find(".detail-references").val();
            var isEmpty = refs.trim() === "";
            if (!isEmpty || $section.data("showemptydetail") === true) {
                // set type to currently displayed detail
                self.$root.data("type", $section.data("type"));

                // Replace detail header
                var title = $section.find("> .info a").text();
                title = title == null ? "" : title.match(/.*[^ (\d)]/)[0]; // remove counter
                if ($section.data("multiselect") === true && !isEmpty) {
                    // enable multiselect: add checkboxes to title and all items in list
                    self.$detailHeader
                        .addClass("granite-references-detail-item--hasCheckbox")
                        .html('<label class="coral-Checkbox">' +
                            '<input class="coral-Checkbox-input" type="checkbox" aria-checked="false">' +
                            '<span class="coral-Checkbox-checkmark"></span></label>' + title);
                    // Listen to checking the checkbox in the detail title
                    self.$detailHeader.find(".coral-Checkbox-input").on("change", function() {
                        var ariaChecked = $(this).attr("aria-checked");
                        if (ariaChecked === "mixed" ||
                                // mixed ...
                                // ... or the main checkbox has been unchecked by unchecking all checkboxes in detail list
                                (ariaChecked === "false" && self.$detailList.data("multiselect") === true)) {
                            // in both cases select all checkboxes in detail list
                            self.$detailList.find(".coral-Checkbox-input").each(function() {
                                $(this).attr("checked", true).attr("aria-checked", true);
                            });
                        } else {
                            $(self.$detailList.find("section.active"))
                                .removeClass("active")
                                .find(".actions").hide();
                            if (this.checked === true && self.$detailList.find("section .granite-references-detail-item-checkbox").length === 0) {
                                // first call: add checkboxes to list items
                                $(self.$detailList.find("section"))
                                    .addClass("granite-references-detail-item--hasCheckbox")
                                    .prepend('<label class="coral-Checkbox granite-references-detail-item-checkbox">' +
                                            '<input class="coral-Checkbox-input" type="checkbox" checked="checked">' +
                                            '<span class="coral-Checkbox-checkmark"></span></label>');
                            } else {
                                // main checkbox now checked: show and check all checkboxes in detail list
                                // main checkbox now unchecked: hide and uncheck all checkboxes in detail list
                                var checked = this.checked;
                                self.$detailList.find(".granite-references-detail-item-checkbox")
                                    .parent()
                                        .toggleClass("granite-references-detail-item--hasCheckbox", checked)
                                        .end()
                                    .toggleClass("hide")
                                    .find(".coral-Checkbox-input").each(function() {
                                        $(this).attr("checked", checked).prop("checked", checked);
                                    });
                            }
                            self.$detailList.data("multiselect", this.checked);
                            self.$root.trigger(self.EVENT_SELECTALL, {checked: this.checked});
                        }
                        $(this).attr("aria-checked", this.checked);
                        this.indeterminate = false;
                    });
                } else {
                    self.$detailHeader.text(title);
                }

                // Replace detail content with corresponding data stored in a hidden element
                self.$detailList.html(refs);
                self.$detailList.removeData("multiselect");
                self.$detailToolbars.html($section.find(".detail-toolbars").val());

                // Show and resize detail panel and initialize widgets
                self.showPanel("detail");
                self.$detail.trigger("cui-contentloaded.data-api");
                self.triggerResize({detail:true,scrollToTop:true});

                $(self.$detailToolbars.find(".detail-toolbar .coral-Collapsible")).on("collapse", function(e, o) {
                    // when deactivating resize at every step of the animation ("collapse")
                    self.triggerResize({detail:true});
                });
                $(self.$detailToolbars.find(".detail-toolbar .coral-Collapsible")).on("expand", function(e, o) {
                    // when activating resize at every step of the animation ("expand")
                    self.triggerResize({detail:true});
                });
                $(self.$detailToolbars.find(".detail-toolbar .coral-Collapsible")).on("activate", function() {
                    // when activating resize also when done ("activate")
                    self.triggerResize({detail:true});
                });
            }
        };

        /**
         * Sets the state of the main checkbox (in the title):
         * - checked if all checkboxes in detail list are checked
         * - unchecked if all checkboxes in detail list are unchecked
         * - mixed (partially checked) if some checkboxes are checked
         */
        self.updateMainCheckbox = function() {
            var hasChecked = false;
            var hasUnchecked = false;
            self.$detailList.find(".coral-Checkbox-input").each(function() {
                if (this.checked) {
                    hasChecked = true;
                } else {
                    hasUnchecked = true;
                }
                if (hasChecked && hasUnchecked) {
                    return false;
                }
            });
            var $titleCheckbox = self.$detailHeader.find(".coral-Checkbox-input");
            if (hasChecked && hasUnchecked) {
                $titleCheckbox.attr({
                    "aria-checked": "mixed",
                    "checked": false
                }).prop({
                        "indeterminate": true,
                        "checked": false
                });
            } else {
                $titleCheckbox.attr({
                    "aria-checked": hasChecked,
                    "checked": hasChecked
                }).prop({
                    "indeterminate": false,
                    "checked": hasChecked
                    });
            }
        };

        /**
         * Listen to tap/click on back button in detail panel
         */
        self.$root.fipo("tap", "click", "> .coral-ColumnView-item--back", function() {
            // Show references list panel
            self.showPanel("reference-list");
        });


        /**
         * Absorb the click event of checkboxes: Checking is handled by the click handler of the list items.
         */
        self.$detailList.on("click", ".granite-references-detail-item-checkbox .coral-Checkbox-input", function(e) {
            e.preventDefault();
            e.stopPropagation();
        });

        /**
         * Listen to click on detail list items to activate or deactivate an item. If the list is in multiselect mode
         * the item's checkbox is checked or unchecked accordingly instead.
         */
        self.$detailList.on("click", "section", function (e) {
            var $section = $(this);

            var $actions = $section.find(".actions");
            if ($actions.length && !$actions.is(e.target) && !$.contains($actions[0], e.target)) {
                if (self.$detailList.data("multiselect") === true) {
                    // multiselect mode: check/uncheck checkbox
                    var $checkbox = $section.find(".granite-references-detail-item-checkbox .coral-Checkbox-input");
                    var checked = $checkbox.attr("checked") !== "checked";
                    $checkbox.attr("checked", checked).prop("checked", checked);
                    self.updateMainCheckbox();
                } else {
                    // normal mode: toggle active

                    // Toggle section active class
                    $section.toggleClass("active");

                    // Toggle actions status
                    $actions.toggle();

                    // Hide actions of siblings
                    $section.siblings("section")
                        .removeClass("active")
                        .find(".actions").hide()
                    ;

                    e.preventDefault();
                }
            }

        });

        /**
         * Listen to resize events of the references
         */
        self.$root.on(self.EVENT_RESIZE, function(e, options) {
            options = options || {};
            if (!options.detail && !options.list) {
                options.detail = true;
                options.list = true;
            }

            if (options.list === true) {
                // resize list
                self.$list.height($(window).height() - self.$list.offset().top);
                if (options.scrollToTop === true) self.$list.scrollTop(0);
            }

            if (options.detail === true) {
                // resize detail
                var $toolbar = self.$detailToolbars.find(".detail-toolbar.active");
                var tHeight = $toolbar ? $toolbar.outerHeight() : 0;
                self.$detailList.height($(window).height() - self.$detailList.offset().top - tHeight);
                if (options.scrollToTop === true) self.$detailList.scrollTop(0);
            }
        });


        return self;

    }());

}(jQuery, Granite));
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
;(function ($, ns) {
    "use strict";

    /**
     * Listens to "foundation-selections-change" events (triggered for instance by the card or list layout)
     * and triggers the general references change event
     */
    $(document).on("foundation-selections-change", function(e) {
        var collection = $(e.target);
        if ((collection.is(".foundation-layout-card") && !collection.is(".mode-selection")) || (collection.is(".foundation-layout-list") && collection.find(".foundation-selections-item .select").length === 0)) {
            return;
        }

        var items = collection.find(".foundation-selections-item");

        if (items.length === 0) {
            if (collection.is(".foundation-layout-list")) {
                // list layout and no selection: load content path
                ns.triggerChange();
            } else {
                // card layout and no selection: empty references list
                ns.triggerChange({
                    paths: []
                });
            }

        } else {
            // list or card layout and selection: add selected paths
            var paths = [];
            items.each(function() {
                paths.push($(this).data("path"));
            });

            var formerPaths;
            if (ns.$root.data("paths")) {
                formerPaths = ns.getReferencePaths();
            } else {
                formerPaths = [];
            }

            ns.triggerChange({
                paths: paths,
                // avoid refresh if mutli selection now and before
                avoidRefresh: paths.length > 1 && formerPaths.length > 1
            });
        }
    });

}(jQuery, Granite.References));

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
;(function ($, ns) {
    "use strict";

    /**
     * Listens to "foundation-mode-change" events (triggered for instance by the card or list layout)
     * and triggers the general references change event
     */
    $(document).on("foundation-mode-change", function(e, mode, group) {
        var collection = $(".foundation-collection[data-foundation-mode-group=" + group + "]");

        if (collection.is(".foundation-layout-card")) {
            if (mode === "selection") {
                // card layout and selection mode: use selected paths
                var paths = [];
                collection.find(".foundation-selections-item").each(function() {
                    paths.push($(this).data("path"));
                });
                ns.triggerChange({
                    paths: paths
                });
            } else {
                // card layout and default mode: use content path
                ns.triggerChange();
            }
        }
    });

}(jQuery, Granite.References));

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
;(function ($, ns) {
    "use strict";

    /**
     * Trigger a refresh when references view is opened.
     */
    $(document).on("click", ".js-endor-innerrail-toggle[data-target='#cq-rail-references']", function() {
        if ($(this).hasClass("is-selected")) {
            ns.$root.trigger(ns.EVENT_CHANGE + "." + ns.NAMESPACE + "-" + ns.NAMESPACE_LIST);
        }
    });

    /**
     * Trigger a refresh if references view was open by default.
     */
    if (ns.$root.is(":visible")) {
        ns.$root.trigger(ns.EVENT_CHANGE + "." + ns.NAMESPACE + "-" + ns.NAMESPACE_LIST);
    }

}(jQuery, Granite.References));

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

;(function(document, ns) {

    "use strict";

    // proxy for window.resize events
    $(window).on("resize", function(e) {
        if (e.originalEvent && e.originalEvent.type === "resize") {
            // resize is also triggered by mode change in card view
            // originalEvent is only set on true window resize events
            ns.triggerResize();
        }
    });

}(jQuery, Granite.References));

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2014 Adobe Systems Incorporated
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
;(function ($, ns) {
    "use strict";

    /**
     * Listen to tap/click on "granite-Reference-Action--reveal" action button
     */
    ns.$root.fipo("tap", "click", ".granite-Reference-Action.granite-Reference-Action--reveal", function () {
        var $button = $(this);
        var $section = $button.closest("section");
        var adminUrl = ns.$root.data("adminurl");

        if ($section.data("path") && $section.data("parentPath") && adminUrl !== "") {
            window.location = Granite.HTTP.externalize(adminUrl) + $section.data("parentPath");
        }
    });

}(jQuery, Granite.References));

