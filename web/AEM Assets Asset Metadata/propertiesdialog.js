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
(function(window, document, $, Granite) {
    "use strict";

    /**
     * Handler to show/hide the MSM action buttons according to the selected tab. Coral3 implementation
     */
    $(document).on("click", ".coral-TabPanel.cq-siteadmin-admin-properties-tabs > .coral-TabPanel-navigation > .coral-TabPanel-tab", function(e) {
        var $tabPanel = $(e.target).closest(".cq-siteadmin-admin-properties-tabs");

        var $actionBar = $("coral-actionbar");

        if ($tabPanel.find(".cq-siteadmin-admin-properties-blueprint:visible").length > 0) {
            $actionBar.find(".cq-siteadmin-admin-properties-actions-blueprint").removeClass("hide");
        } else {
            $actionBar.find(".cq-siteadmin-admin-properties-actions-blueprint").addClass("hide");
        }

        if ($tabPanel.find(".cq-siteadmin-admin-properties-livecopy:visible").length > 0) {
            $actionBar.find(".cq-siteadmin-admin-properties-actions-livecopy").removeClass("hide");
        } else {
            $actionBar.find(".cq-siteadmin-admin-properties-actions-livecopy").addClass("hide");
        }

        if ($tabPanel.find(".js-cq-sites-PermissionsProperties:visible").length > 0) {
            $actionBar.find(".js-cq-sites-PermissionsProperties-action").removeClass("hide");
        } else {
            $actionBar.find(".js-cq-sites-PermissionsProperties-action").addClass("hide");
        }
    });

    /**
     * Handler to show/hide the MSM action buttons according to the selected tab. Coral2 implementation
     */
    $(document).on("coral-panelstack:change", ".cq-siteadmin-admin-properties-tabs", function(e) {
        var $tabPanel = $(e.target).closest(".cq-siteadmin-admin-properties-tabs");

        var $actionBar = $("coral-actionbar");

        var $target = $tabPanel.find(".cq-siteadmin-admin-properties-blueprint");
        if ($target.length > 0 && e.detail.selection.contains($target[0])) {
            $actionBar.find(".cq-siteadmin-admin-properties-actions-blueprint").removeClass("hide");
        } else {
            $actionBar.find(".cq-siteadmin-admin-properties-actions-blueprint").addClass("hide");
        }

        $target = $tabPanel.find(".cq-siteadmin-admin-properties-livecopy");
        if ($target.length > 0 && e.detail.selection.contains($target[0])) {
            $actionBar.find(".cq-siteadmin-admin-properties-actions-livecopy").removeClass("hide");
        } else {
            $actionBar.find(".cq-siteadmin-admin-properties-actions-livecopy").addClass("hide");
        }

        $target = $tabPanel.find(".js-cq-sites-PermissionsProperties");
        if ($target.length > 0 && e.detail.selection.contains($target[0])) {
            $actionBar.find(".js-cq-sites-PermissionsProperties-action").removeClass("hide");
        } else {
            $actionBar.find(".js-cq-sites-PermissionsProperties-action").addClass("hide");
        }
    });

})(window, document, Granite.$, Granite);
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
(function(window, document, $, Granite) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui");

    function detach(data) {
        ui.wait();

        $.ajax({
            url: data.uri,
            type: "POST",
            data: {
                _charset_: "UTF-8",
                removeLCMarkers: "true",
                path: data.path ? data.path : ""
            },
            success: function() {
                document.location.reload();
            },
            error: function(xhr) {
                ui.clearWait();
                ui.alert(Granite.I18n.get("Error"), Granite.I18n.get("An error occurred while detaching Live Copy from its Source."), "error");
            }
        });
    }

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.msm.detach",
        handler: function(name, el, config) {
            var message = $(document.createElement("div"));

            $(document.createElement("p"))
                .text(Granite.I18n.get("You are going to detach this Live Copy from its Source."))
                .appendTo(message);
            $(document.createElement("p"))
                .text(Granite.I18n.get("This cannot be undone."))
                .appendTo(message);

            ui.prompt(Granite.I18n.get("Detach Live Copy"), message.html(), "warning", [{
                text: Granite.I18n.get("Cancel")
            }, {
                text: Granite.I18n.get("Detach"),
                warning: true,
                handler: function() {
                    detach(config.data);
                }
            }]);
        }
    });

})(window, document, Granite.$, Granite);

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
(function(window, document, $, Granite) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui");

    function reset(data, path) {
        ui.wait();
        $.ajax({
            url: data.uri,
            type: "POST",
            data: {
                _charset_: "UTF-8",
                cmd: "rollout",
                type: "page",
                reset: "true",
                path: path,
                "msm:targetPath": data.path ? data.path : ""
            },
            success: function() {
                document.location.reload();
            },
            error: function(xhr) {
                ui.clearWait();
                ui.alert(Granite.I18n.get("Error"), Granite.I18n.get("An error occurred while resetting the Live Copy."), "error");
            }
        });
    }

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.msm.reset",
        handler: function(name, el, config) {
            var message = $(document.createElement("div"));
            var blueprintPath = $(this).data("sourcepath");

            $(document.createElement("p"))
                .text(Granite.I18n.get("You are going to reset this Live Copy to the state of the Source."))
                .appendTo(message);
            $(document.createElement("p"))
                .text(Granite.I18n.get("All local modifications will be lost."))
                .appendTo(message);

            ui.prompt(Granite.I18n.get("Reset Live Copy"), message.html(), "warning", [{
                text: Granite.I18n.get("Cancel")
            }, {
                text: Granite.I18n.get("Reset"),
                warning: true,
                handler: function() {
                    reset(config.data, blueprintPath);
                }
            }]);
        }
    });

})(window, document, Granite.$, Granite);

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
(function(window, document, $, Granite) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui");

    function resume(data, callback) {
        ui.wait();

        $.ajax({
            url: data.uri,
            type: "POST",
            data: {
                "_charset_": "UTF-8",
                "msm:status/msm:isCancelled": false
            },
            success: function() {
                document.location.reload();

                if (callback) {
                    callback.call(this);
                }
            },
            error: function(xhr) {
                ui.clearWait();
                ui.alert(Granite.I18n.get("Error"), Granite.I18n.get("An error occurred while resuming Live Copy."), "error");
            }
        });
    }

    function getLiveRelationshipStatus(msmConfigEndpoint) {
        if (!msmConfigEndpoint) {
            return;
        }

        msmConfigEndpoint += ".msm.conf";

        return $.ajax({
            type: "GET",
            url: msmConfigEndpoint,
            data: "advancedStatus=true",
            traditional: true,
            cache: false
        });
    }

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.msm.resume",
        handler: function(name, el, config) {
            var activator = $(this);

            var $message = $(document.createElement("div"));
            $(document.createElement("p"))
                .text(Granite.I18n.get("You are going to resume this Live Copy."))
                .appendTo($message);
            // allow to sync the page after revert
            MSM.MSMCommons.buildSyncAfterRevertOption(false).appendTo($message);

            ui.prompt(Granite.I18n.get("Resume Live Copy"), $message.html(), "warning", [{
                text: Granite.I18n.get("Cancel")
            }, {
                text: Granite.I18n.get("Resume"),
                warning: true,
                handler: function() {
                    if (config.data && config.data.uri) {
                        if (MSM.MSMCommons.checkDoSyncPageAfterRevert()) {
                            getLiveRelationshipStatus(config.data.uri).done(function(data) {
                                var blueprintPath = activator.data("sourcepath");
                                var livecopyPath = (config.data.path) ? config.data.path : "";
                                var isCancelledForChildren = data[MSM.MSMCommons.Constants.PARAM_STATUS][MSM.MSMCommons.Constants.PARAM_IS_CANCELLED_FOR_CHILDREN];
                                resume(config.data, function () {
                                    MSM.MSMCommons.syncPage(blueprintPath, livecopyPath, isCancelledForChildren)
                                });
                            });
                        } else {
                            resume(config.data);
                        }
                    }
                }
            }]);
        }
    });

})(window, document, Granite.$, Granite);

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
(function(window, document, $, Granite) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui");

    function suspend(data) {
        ui.wait();

        $.ajax({
            url: data.uri,
            type: "POST",
            data: {
                "_charset_": "UTF-8",
                "msm:status/msm:isCancelled": true,
                "msm:status/msm:isCancelledForChildren": data.deep ? true : ""
            },
            success: function() {
                document.location.reload();
            },
            error: function(xhr) {
                ui.clearWait();
                ui.alert(Granite.I18n.get("Error"), Granite.I18n.get("An error occurred while suspending Live Copy."), "error");
            }
        });
    }

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.msm.suspend",
        handler: function(name, el, config) {
            var message = $(document.createElement("div"));

            var msg = config.data.deep ?
                Granite.I18n.get("You are going to suspend this Live Copy and its children.") :
                Granite.I18n.get("You are going to suspend the Live Copy.");

            $(document.createElement("p"))
                .text(msg)
                .appendTo(message);
            $(document.createElement("p"))
                .text(Granite.I18n.get("No action will be performed on a rollout."))
                .appendTo(message);

            ui.prompt(Granite.I18n.get("Suspend Live Copy"), message.html(), "warning", [{
                text: Granite.I18n.get("Cancel")
            }, {
                text: Granite.I18n.get("Suspend"),
                warning: true,
                handler: function() {
                    suspend(config.data);
                }
            }]);
        }
    });

})(window, document, Granite.$, Granite);

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
(function(window, document, $, Granite) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui");

    function sync(data, path) {
        MSM.MSMCommons.syncPage(path, (data.path ? data.path : ""), false);
    }

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.msm.sync",
        handler: function(name, el, config) {
            var message = $(document.createElement("div"));
            var blueprintPath = $(this).data("sourcepath");

            $(document.createElement("p"))
                .text(Granite.I18n.get("You are going to synchronize this Live Copy with the Source."))
                .appendTo(message);
            $(document.createElement("p"))
                .text(Granite.I18n.get("Local modifications and inheritance status will be maintained."))
                .appendTo(message);

            ui.prompt(Granite.I18n.get("Synchronize Live Copy"), message.html(), "info", [{
                text: Granite.I18n.get("Cancel")
            }, {
                text: Granite.I18n.get("Sync"),
                primary: true,
                handler: function() {
                    sync(config.data, blueprintPath);
                }
            }]);
        }
    });

})(window, document, Granite.$, Granite);

