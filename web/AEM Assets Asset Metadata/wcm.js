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
(function(window, document, Granite, $) {
    "use strict";
    
    // @badpractice This code assume and use many internal details, which may not work anymore.
    // Please DO NOT follow this approach.
    
    // @deprecated Reading the URL of a page and doing an action need to be done by page/shell level clientlib, instead of "cq.common.wcm".
    // Otherwise it is just too opinionated and may interfere wrongly.

    // TODO: make it generic so that it's not specific to Sites
    $(document).on("foundation-contentloaded", function(e) {
        if (window.location.hash && window.location.hash !== '') {
            var doc = $(document),
                path = window.location.hash.substring(1),
                $item = $(".foundation-collection-item[data-path=\"" + path + "\"]");

            if ($item.length > 0) {
                $(doc).trigger('foundation-mode-change', ['selection', 'cq-siteadmin-admin-childpages']);

                if (CUI && CUI.ColumnView && $.cookie('cq.sites.childpages.layoutId') === 'columns') {
                    // Column view
                    var columnView = $(".foundation-collection").data('foundation-layout-columns.internal.ColumnView');
                    if (columnView) {
                        // trigger selection manually as foundation-selections adapter has not fully
                        // been implemented for column views yet
                        $(".coral-ColumnView-icon", $item).click();
                    }
                } else {
                    // Card and List views
                    var foundationSelections = $(".foundation-collection").adaptTo("foundation-selections");
                    foundationSelections.select($item);
                }
            }

            window.location.hash = '';
        }
    });

})(window, document, Granite, Granite.$);

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
(function (window, document, Granite, $) {
    "use strict";

    var COMMAND_URL = Granite.HTTP.externalize("/bin/wcmcommand");
    var ids = null;
    var isBulkCopy = false;
    var sourceParentPath = null;
    var exceptPath = [];


    function closeBrowserWarning() {
        return Granite.I18n.get("Paste operation is in progress. Refreshing page may cause unexpected results.");
    }

    function updatePasteButton(context) {
        context = context || document;
        var pasteButton = $(".cq-wcm-paste-activator", context);

        toggleButton(pasteButton);
    }

    function updateMoreActionsButton(context) {
        context = context || document;
        var moreActionsButton = $(".cq-wcm-more-actions-activator", context);

        toggleButton(moreActionsButton)
    }

    function toggleButton(button) {
        Coral.commons.ready(button, function () {
            if (!ids) {
                button.attr("hidden", "hidden");
            } else {
                button.removeAttr("hidden");
            }
        });
    }

    function getDestPath(activator) {
        var dest = activator.data("cqWcmPasteActivatorDest");
        if (dest) {
            return dest;
        }

        var target = activator.data("cqWcmPasteActivatorTarget");
        if (!target) {
            return;
        }

        var collection = $(target);
        if (!collection.hasClass("foundation-collection")) {
            return;
        }

        if (collection.hasClass("foundation-layout-columns")) {
            // FIXME There is a bug in foundation-layout-columns such that the [data-foundation-collection-id] is wrong when there is no active item.
            // So let's do a workaround temporarily here.

            var columns = collection.children(".coral-ColumnView-column");

            if (columns.filter(".is-active").length === 0) {
                var first = columns.first().find(".foundation-collection-item").first();
                if (first.length > 0) {
                    var id = first.data("foundationCollectionItemId");
                    var parts = id.split("/");
                    parts.pop();
                    return parts.join("/");
                }
            } else {
                return collection.data("foundationCollectionId");
            }
        } else {
            return collection.data("foundationCollectionId");
        }
    }

    function triggerPasteCompletionEvent(args, params) {
        if ($.isArray(args[0])) {
            // Multiple items pasted
            for (var i = 0; i < args.length; i++) {
                params[i].destPath = $(args[i][0]).find("#Message").html();
            }
        } else {
            // Single item pasted
            params[0].destPath = $(args[0]).find("#Message").html();
        }

        $(document).trigger("cq-wcm-paste-completed", [params]);
    }

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.copy",
        handler: function (name, el, config, collection, selections) {
            ids = selections.map(function (v) {
                return $(v).data("foundationCollectionItemId");
            });

            if (!ids.length) return;

            isBulkCopy = config && config.target && config.activeSelectionCount === "bulk"
                && collection && collection.dataset && collection.dataset.foundationSelectionsSelectallMode === "true";

            if (isBulkCopy) {
                $(collection).find(".foundation-collection-item:not(.foundation-selections-item)").each(function () {
                    var itemPath = this.dataset.foundationCollectionItemId;
                    if (itemPath) {
                        exceptPath.push(itemPath);
                    }
                });
                sourceParentPath = collection.dataset.foundationCollectionId;
            }
            updatePasteButton();
            updateMoreActionsButton();

            $(collection).adaptTo("foundation-selections").clear();
        }
    });

    function getOutputData(source, destination, isShallow) {
        return {
            srcPath: source,
            destParentPath: destination,
            before: "",
            shallow: isShallow
        }
    }

    function getBulkCopyAssetPromise(activator, destParentPath) {
        var selector = activator.hasClass("cq-damadmin-admin-pasteasset") ? "bulkassets" : "bulkpages";
        return $.post(sourceParentPath + "." + selector + ".copy", {
            sourceParentPath: sourceParentPath,
            destParentPath: destParentPath,
            exceptPath: exceptPath
        })
    }

    function getUpdatedDestParentPath(v, destParentPath) {
        // check if we are copying a template which is stored in /conf
        var relativeTemplateParent = "settings/wcm/templates";
        if (v.indexOf("/conf") === 0
            && v.indexOf(relativeTemplateParent) >= 0
            && destParentPath.indexOf(relativeTemplateParent) === -1) {
            destParentPath += "/" + relativeTemplateParent;
        }
        return destParentPath;
    }

    function getDefaultCopyAssetPromise(source, destination, isShallow) {
        return $.ajax({
            url: COMMAND_URL,
            type: "POST",
            data: {
                _charset_: "UTF-8",
                cmd: "copyPage",
                srcPath: source,
                destParentPath: destination,
                before: "",
                shallow: isShallow
            }
        });
    }

    $(document).on("click", ".cq-wcm-paste-activator", function (e) {
        e.preventDefault();
        var activator = $(this);
        return performPaste(activator, false);
    });

    function performPaste(activator, isShallowCopy) {
        var destParentPath = getDestPath(activator);
        if (!destParentPath) {
            return;
        }

        var isShallow = isShallowCopy;

        var ui = $(window).adaptTo("foundation-ui");
        ui.wait();
        $(window).on("beforeunload", closeBrowserWarning);

        var promises = [];
        var outputParams = [];

        if (isBulkCopy && sourceParentPath && !isShallow) {
            promises.push(getBulkCopyAssetPromise(activator, destParentPath));
            outputParams.push(getOutputData(sourceParentPath, destParentPath, false));
        } else {
            ids.forEach(function (pathToCopy) {
                var updatedDestParentPath = getUpdatedDestParentPath(pathToCopy, destParentPath);
                promises.push(getDefaultCopyAssetPromise(pathToCopy, updatedDestParentPath, isShallow));
                outputParams.push(getOutputData(pathToCopy, updatedDestParentPath, isShallow));
            });
        }

        $.when.apply(null, promises)
            .always(function () {
                $(window).off("beforeunload", closeBrowserWarning);

                ui.clearWait();
            })
            .done(function () {
                triggerPasteCompletionEvent(arguments, outputParams);

                var target = activator.data("cqWcmPasteActivatorTarget");
                if (target) {
                    var api = $(target).adaptTo("foundation-collection");
                    if (api && "reload" in api) {
                        api.reload();
                        return;
                    }
                }

                var contentApi = $(".foundation-content").adaptTo("foundation-content");
                if (contentApi) {
                    contentApi.refresh();
                }
            })
            .fail(function (xhr) {
                if (xhr.status === 0 || xhr.readyState === 0) {
                    // premature reload, do nothing
                    return;
                }

                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.getVar($(xhr.responseText).find("#Message").html());
                ui.alert(title, message, "error");
            });
    }

    $(document).on("foundation-contentloaded", function (e) {
        updatePasteButton(e.target);
        updateMoreActionsButton(e.target);
    });

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.paste.shallow",
        handler: function(name, el, config, collection, selections) {
            var control = $(el);
            var nesting = config.data.nesting;
            if (nesting === "hide") {
                var parentAPI = control.closest(".foundation-toggleable").adaptTo("foundation-toggleable");
                if (parentAPI) {
                    parentAPI.hide();
                }
            }
            var activator = $(".cq-wcm-paste-activator");
            if (activator.length > 0) {
                performPaste(activator, true);
            }
        }
    });

})(window, document, Granite, Granite.$);

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

(function(window, document, $, URITemplate) {
    
    // @badpractice This code assume specific fields and out of scope UX (e.g. Create popover).
    
    // @deprecated Because of the problem above, it is hard to reuse this for other scenario. 
    // Please use `foundation.dialog` as the action to show a dialog instead.

    // id of the modal form
    var modal = "#create-folder-modal";

    // foundation-collection-action path
    var actionPath = null;

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.createfolder",
        handler: function(name, el, config, collection, selections) {
            if (!selections.length) return;

            actionPath = URITemplate.expand(config.data.action, {
                item: $(selections[0]).data("foundationCollectionItemId")
            });
            $(modal).modal("show");
        }
    });

    $(document).on("beforeshow", modal, function () {
        // hide "Create" popover
        $(".coral-Popover:visible").popover("hide");
        // reset form (textfields and checkboxes)
        $(".coral-Textfield", modal).each(function () {
            $(this).val("");
        });
        $(".coral-Checkbox-input", modal).each(function () {
            $(this).prop("checked", $(this).attr("checked") == "checked");
        });
    });

    $(document).on("submit", modal, function (e) {
        e.preventDefault();
        var $modal = $(modal);
        $modal.modal("hide");
        // copy 'title' to 'nameHint' if no 'nameHint' has been provided
        var $title = $("input[name='./jcr:title']", $modal);
        var $nameHint = $("input[name=':nameHint']", $modal);
        if (!$nameHint.val()) {
            $nameHint.val($title.val());
        }
        var url;
        if (actionPath) {
            url = actionPath;
        } else {
            url = $modal.attr("action") + "/";
        }
        $.ajax({
            method: "post",
            url: Granite.HTTP.externalize(url),
            data: $modal.serialize()
        }).done(function (data, textStatus, jqXHR) {
            $modal.remove();
            var content = $(".foundation-content").adaptTo("foundation-content");
            content.refresh();
        }).fail(function (jqXHR) {
            var message = $("#Message", jqXHR.responseText).text();
            var ui = $(window).adaptTo("foundation-ui");
            ui.alert(Granite.I18n.get("Error"), message, "error");
        });
        actionPath = null;
    });


})(window, document, Granite.$, Granite.URITemplate);
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
(function(window, document, $, Granite) {
    "use strict";

    var COMMAND_URL= Granite.HTTP.externalize("/bin/wcmcommand");
    
    var deleteText;
    function getDeleteText() {
        if (!deleteText) {
            deleteText = Granite.I18n.get("Delete");
        }
        return deleteText;
    }
    
    var cancelText;
    function getCancelText() {
        if (!cancelText) {
            cancelText = Granite.I18n.get("Cancel");
        }
        return cancelText;
    }

    function deletePages(collection, paths, force, checkChildren, bulkDeleteData) {
        var ui = $(window).adaptTo("foundation-ui");
        ui.wait();

        var url = COMMAND_URL;
        var data = {
            _charset_: "UTF-8",
            force: !!force,
            checkChildren: !!checkChildren
        };
        //if we are in bulk delete mode
        if (bulkDeleteData) {
            url = bulkDeleteData.sourceParentPath + ".bulkpages.delete";
            Object.assign(data, bulkDeleteData);
        } else {
            data.cmd = "deletePage";
            data.path = paths;
        }

        $.ajax({
            url: url,
            type: "POST",
            data: data,
            success: function() {
                ui.clearWait();

                var api = collection.adaptTo("foundation-collection");
                var layoutConfig = collection.data("foundationLayout");

                // In column layout the collection id may represent a preview column belonging to a deleted item.
                if (layoutConfig && layoutConfig.layoutId === "column") {
                    var previewShown = $("coral-columnview-preview").length > 0;

                    if (previewShown) {
                      if (api && "load" in api) {
                        var id = paths[0];

                        if (id) {
                          var parentId = id.substring(0, id.lastIndexOf('/')) || '';

                          if (parentId !== '') {
                            api.load(parentId);
                          }
                        }
                      }
                    }

                    Coral.commons.nextFrame(function() {
                        if (api && "reload" in api) {
                            api.reload();
                        }
                    });

                    return;
                }

                if (api && "reload" in api) {
                    api.reload();
                    return;
                }

                var contentApi = $(".foundation-content").adaptTo("foundation-content");
                if (contentApi) {
                    contentApi.refresh();
                }
            },
            error: function(xhr) {
                ui.clearWait();

                var message = Granite.I18n.getVar($(xhr.responseText).find("#Message").html());

                if (xhr.status === 412) {
                    ui.prompt(getDeleteText(), message, "notice", [{
                        text: getCancelText()
                    }, {
                        text: Granite.I18n.get("Force Delete"),
                        warning: true,
                        handler: function() {
                            deletePages(collection, paths, true, false, bulkDeleteData);
                        }
                    }]);
                    return;
                }

                ui.alert(Granite.I18n.get("Error"), message, "error");
            }
        });
    }
    
    function createEl(name) {
        return $(document.createElement(name));
    }

    function getBulkDeleteData(config, collection) {
        var bulkDeleteData;
        var exceptPath = [];
        if (config && config.activeSelectionCount === "bulk") {
            if (collection && collection.dataset.foundationSelectionsSelectallMode === "true") {
                var $collection = $(collection);
                var paginationAPI = $collection.adaptTo("foundation-collection").getPagination();
                if (paginationAPI && paginationAPI.hasNext) {
                    $collection.find(".foundation-collection-item:not(.foundation-selections-item)").each(function() {
                        var itemPath = this.dataset.foundationCollectionItemId;
                        if (itemPath) {
                            exceptPath.push(itemPath);
                        }
                    });
                    bulkDeleteData = {
                        sourceParentPath: collection.dataset.foundationCollectionId,
                        exceptPath: exceptPath
                    };
                }
            }
        }
        return bulkDeleteData;
    }

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.delete",
        handler: function(name, el, config, collection, selections) {
            var bulkDeleteData = getBulkDeleteData(config, collection);

            var message = createEl("div");
            var intro = createEl("p").appendTo(message);
            if (selections.length === 1) {
                intro.text(Granite.I18n.get("You are going to delete the following item:"));
            } else if (bulkDeleteData) {
                intro.text(Granite.I18n.get("You are going to delete all items from {0} path:",
                    bulkDeleteData.sourceParentPath));
            } else {
                intro.text(Granite.I18n.get("You are going to delete the following {0} items:", selections.length));
            }

            var list = [];
            var maxCount = Math.min(selections.length, 12);
            for (var i = 0, ln = maxCount; i < ln; i++) {
                var title = $(selections[i]).find(".foundation-collection-item-title").text();
                list.push(createEl("b").text(title).prop("outerHTML"));
            }
            if (selections.length > maxCount) {
                list.push("&#8230;"); // &#8230; is ellipsis
            }

            createEl("p").html(list.join("<br>")).appendTo(message);

            var ui = $(window).adaptTo("foundation-ui");
            
            ui.prompt(getDeleteText(), message.html(), "notice", [{
                text: getCancelText()
            }, {
                text: getDeleteText(),
                warning: true,
                handler: function() {
                    var paths = selections.map(function(v) {
                        return $(v).data("foundationCollectionItemId");
                    });

                    deletePages($(collection), paths, false, true, bulkDeleteData);
                }
            }]);
        }
    });
})(window, document, Granite.$, Granite);

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
(function(document, Granite, $) {
    "use strict";
    
    var configs = {
        lock: {
            cmd: "lockPage"
        },
        unlock: {
            cmd: "unlockPage"
        }
    };

    var lockActionRelation = "cq-siteadmin-admin-actions-lockpage-activator";
    var unlockActionRelation = "cq-siteadmin-admin-actions-unlockpage-activator";

    function setLockStatus(path, action, collection, selection) {
        var config = configs[action];
        
        var ui = $(window).adaptTo("foundation-ui");
        ui.wait();
        
        $.ajax({
            url: Granite.HTTP.externalize("/bin/wcmcommand"),
            type: "POST",
            data: {
                _charset_: "UTF-8",
                path: path,
                cmd: config.cmd
            }
        }).done(function() {
            ui.clearWait();
            
            var api = collection.adaptTo("foundation-collection");
            if (api && "reload" in api) {
                api.reload();
                /**
                 * Related to @GRANITE-10881 the selected page gets not updated in the colmn view.
                 * Hence we have to update the locking relation manually and refresh the action bar.
                 */
                if(collection.is('coral-columnview')) {
                    updateLockingRelationInSelection(action, selection);
                    collection.trigger("foundation-selections-change");
                }
                return;
            }
            
            var contentApi = $(".foundation-content").adaptTo("foundation-content");
            if (contentApi) {
                contentApi.refresh();
            }
        }).fail(function(xhr) {
            ui.clearWait();
            
            var title = Granite.I18n.get("Error");
            var message = Granite.I18n.getVar($(xhr.responseText).find("#Message").html());
            ui.alert(title, message, "error");
        });
    }

    function updateLockingRelationInSelection(action, selection) {
        var quickActions = $(selection).find(".foundation-collection-quickactions");
        var relations = $(quickActions).data("foundationCollectionQuickactionsRel") || "";
        relations = action === "lock" ? relations.replace(lockActionRelation, unlockActionRelation) : relations.replace(unlockActionRelation, lockActionRelation);
        $(quickActions).data("foundationCollectionQuickactionsRel", relations);
    }

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.collection.action.action", {
        name: "cq.wcm.lock",
        handler: function(name, el, config, collection, selections) {
            var path = $(selections[0]).data("foundationCollectionItemId");
            setLockStatus(path, "lock", $(collection), $(selections[0]));
        }
    });
    
    registry.register("foundation.collection.action.action", {
        name: "cq.wcm.unlock",
        handler: function(name, el, config, collection, selections) {
            var path = $(selections[0]).data("foundationCollectionItemId");
            setLockStatus(path, "unlock", $(collection), $(selections[0]));
        }
    });
})(document, Granite, Granite.$);

/*
 ADOBE CONFIDENTIAL

 Copyright 2014 Adobe Systems Incorporated
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
(function(window, document, $, URITemplate, CUI) {
    "use strict";

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.open",
        handler: function(name, el, config, collection, selections) {
            // if touch device, set editing cookie first
            if (CUI.util.isTouch) {
                $.cookie("cq-authoring-mode", "TOUCH", {
                    path: config.data.cookiePath,
                    expires: 7
                });
            }
            
            var winMode = $("meta[name='user.preferences.winmode']", document.head).prop("content");
            
            if (winMode === "single") {
                var first = selections[0];
                if (first) {
                    var url = URITemplate.expand(config.data.href, {
                        item: $(first).data("foundation-collection-item-id")
                    });
                    
                    window.location.href = url;
                }
            } else {
                selections.forEach(function(item) {
                    var url = URITemplate.expand(config.data.href, {
                        item: $(item).data("foundation-collection-item-id")
                    });
                    
                    window.open(url);
                });
            }
        }
    });
})(window, document, Granite.$, Granite.URITemplate, CUI);

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
 *
 */
(function(window, document, Granite, $) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui"),
        rel = ".cq-wcm-pagethumbnail",
        $assetPicker,
        $pageThumbnail;

    var contextPath = Granite.HTTP.getContextPath();

    $(document).on("reset", "form", function() {
        var component = $(this).find(rel);

        restoreImage(component);
        clearValue(component);
        toggleRevertButton(component, false);
    });

    $(document).on("coral-fileupload:fileadded", ".cq-wcm-pagethumbnail .cq-wcm-fileupload", function(e) {
        var fileUploadEl = $(this);
        var fileUpload = e.originalEvent.target;
        var file = e.originalEvent.detail.item.file;
        var component = fileUploadEl.closest(".cq-wcm-pagethumbnail");

        wait(component);

        // use attr() instead of prop() for action, so that no domain is appended
        var base = component.closest("form").attr("action");

        fileUploadEl
            .one("fileuploadload", function(e) {
                var status = $(e.content).find("#Status").text();
                e.fileUpload._internalOnUploadLoad(e, e.item, status, e.content);
            })
            .one("coral-fileupload:load", function(e) {
                var url = base + (function() {
                    var name = fileUpload.name;
                    if (name.indexOf(".") === 0) {
                        name = name.substring(1);
                    }
                    return name;
                })();

                clearWait(component, url + "?ck=" + new Date().getTime());
                fileUploadEl.removeClass("disabled");
                setValue(component, fileUpload.name.replace(".sftmp", "@MoveFrom"), url);
            });


        fileUpload.action = base;
        fileUpload.upload(file.name);

        return true;
    });


    function generate(component) {
        var activator = component.find(".cq-wcm-pagethumbnail-activator").prop("disabled", true);
        wait(component);

        var path = component.data("cqWcmPagethumbnailPath");
        var isTemplate = component.data("isTemplate") || false;
        var dest = isTemplate ? "thumbnail.png.sftmp" : "file.sftmp";

        var pgen = new CQ.Siteadmin.PagePreview();
        pgen.generatePreview(path, dest, isTemplate, function(data) {
            // use attr() instead of prop() for action, so that no domain is appended
            if(isTemplate) {
                setValue(component, "./thumbnail.png@MoveFrom", component.closest("form").attr("action") + "/" + dest);
            } else {
                setValue(component, "./image/file@MoveFrom", component.closest("form").attr("action") + "/image/" + dest);
            }
            clearWait(component, data);
            activator.prop("disabled", false);
        });
    }

    function wait(component) {
        ui.wait(component.find(".cq-wcm-pagethumbnail-image").parent()[0]);
    }

    function clearWait(component, src) {
        var original = component.find(".cq-wcm-pagethumbnail-image");

        if (original.length) {
            component.data("cq-wcm-pagethumbnail.internal.original", original);
        }

        original.replaceWith($('<img class="cq-wcm-pagethumbnail-image">').prop("src", src));

        toggleRevertButton(component, true);

        ui.clearWait();
    }

    function restoreImage(component) {
        component.find(".cq-wcm-pagethumbnail-image").replaceWith(component.data("cq-wcm-pagethumbnail.internal.original"));
    }

    function toggleRevertButton(component, show) {
        component.find('button[type="reset"]')[0].hidden = !show;
    }

    function setValue(component, name, url, isTemplate) {
        var hidden,
            hiddenDelete,
            isTemplate = typeof isTemplate !== 'undefined' ? isTemplate : false;

        hidden = component.find("input[name=\"" + name + "\"]");
        hiddenDelete = component.find(".cq-wcm-pagethumbnail-hidden-delete");

        if (hidden.length == 0) {
            hidden = component.find(".cq-wcm-pagethumbnail-hidden");

            if (!hidden.length) {
                hidden = $('<input class="cq-wcm-pagethumbnail-hidden" type="hidden">').appendTo(component);
            }
        }

        if(hiddenDelete.length == 0 && name.match("fileReference$")) {
            if (isTemplate) {
                $('<input class="cq-wcm-pagethumbnail-hidden-delete" type="hidden" name="./thumbnail.png@Delete" value="">').appendTo(component);
            } else {
                $('<input class="cq-wcm-pagethumbnail-hidden-delete" type="hidden" name="./image/file@Delete" value="">').appendTo(component);
            }
        } else {
            hiddenDelete.remove();
        }

        hidden.prop("name", name).val(url.replace(new RegExp("^" + contextPath), "").replace("_jcr_content", "jcr:content")).prop("disabled", false);
    }

    function clearValue(component) {
        component.find(".cq-wcm-pagethumbnail-hidden").remove();
    }

    $(document).on("click", ".cq-wcm-pagethumbnail-activator", function(e) {
        generate($(this).closest(".cq-wcm-pagethumbnail"));
    });

    $(document).on("cq-assetpicker", ".cq-wcm-pagethumbnail", function(e) {
        var component = $(e.target);
        var isTemplate = component.data("isTemplate") || false;
        if (isTemplate) {
            setValue(component, "./jcr:content/fileReference", e.path, true);
        } else {
            setValue(component, "./image/fileReference", e.path);
        }

        clearWait(component, e.path);
    });

    function showAssetPicker() {
        var href = Granite.HTTP.externalize("/aem/assetpicker")
            + "?mode=single"
            + "&type=image",
            $iframe = $('<iframe class="cq-AssetPicker cq-AssetPicker-iframe"></iframe>'),
            $modal = $('<div class="cq-AssetPicker cq-AssetPicker-modal coral-Modal"></div>');

        $iframe.attr("src", href).appendTo($modal);

        $modal.appendTo("body").modal({
            type: "default",
            buttons: [],
            visible: true
        });
        return $modal;
    }

    /**
     * Receive two-part messages from the AssetPicker dialog.  The "data" part indicates the
     * asset picker path should be updated; the "config" part indicates whether or not the
     * dialog should be closed.
     */
    function receiveMessage(event) {
        if (event.origin !== location.origin) {
            return;
        }
        if (!$assetPicker || !$pageThumbnail) {
            return;
        }

        var fromDam = JSON.parse(event.data);

        if (fromDam.data) {
            var path = fromDam.data[0].path;
            $pageThumbnail.trigger({
                type: 'cq-assetpicker',
                path: path
            });
        }

        if (fromDam.config) {
            var configFromDam = fromDam.config;
            if (configFromDam.action === 'close' || configFromDam.action === 'done') {
                $assetPicker.data("modal").hide();
            }
        }
    }

    window.addEventListener("message", receiveMessage, false);

    $(document).on("click", rel + " .js-browse-activator", function (e) {
        $pageThumbnail = $(e.target).closest(rel);
        $assetPicker = showAssetPicker();
    });

})(window, document, Granite, Granite.$);
/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2016 Adobe Systems Incorporated
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

    var REPLICATE_URL = Granite.HTTP.externalize("/bin/replicate");
    var QUICKPUBLISH_TITLE = Granite.I18n.get("Quick Publish");
    var PUBLISH_TEXT = Granite.I18n.get("Publish");
    var CANCEL_TEXT = Granite.I18n.get("Cancel");
    var ERROR_TEXT = Granite.I18n.get("Error");

    function activatePagesAndItsReferences(config, collection, selections) {
        var ui = $(window).adaptTo("foundation-ui");
        ui.wait();

        // get pages
        var paths = selections.map(function(v) {
            var item = $(v);

            // allow to set user defined reference paths, split by comma
            var refPath = item.data("checkReferencesPath");
            if (!refPath) {
                // coral3 selection is acting on the masonry level
                refPath = item.children().data("checkReferencesPath");
            }

            if (refPath) {
                return refPath.split(",");
            }

            return item.data("foundationCollectionItemId");
        });

        if (!paths.length) return;

        // flatten the paths
        paths = removeDuplicatesInArray(paths);

        // get the references
        var referencePromise = $.ajax({
            url: Granite.URITemplate.expand(config.data.referenceSrc, {
                path: paths
            }),
            "type": "POST",
            cache: false,
            dataType: "json"
        }).fail(function(xhr) {
            var message = Granite.I18n.getVar($(xhr.responseText).find("#Message").html());
            ui.alert(ERROR_TEXT, message, "error");
        });

        // merge pages and references paths
        referencePromise.done(function(json) {
            // merge all paths
            if (json.assets.length) {
                for (var i = 0; i < json.assets.length; i++ ){
                    var reference = json.assets[i];
                    paths.push(reference.path);
                }
                // flatten the paths
                paths = removeDuplicatesInArray(paths);
            }

            // publish the page and its references directly
            $.ajax({
                url: REPLICATE_URL,
                type: "POST",
                data: {
                    _charset_: "utf-8",
                    cmd: "Activate",
                    path: paths
                }
            }).always(function() {
                ui.clearWait();
            }).done(function() {
                var api = $(collection).adaptTo("foundation-collection");

                if (api && "reload" in api) {
                    api.reload();
                    ui.notify(null, getSuccessMessage(selections));
                    return;
                }

                var contentApi = $(".foundation-content").adaptTo("foundation-content");
                if (contentApi) {
                    contentApi.refresh();
                }

                ui.notify(null, getSuccessMessage(selections));
            }).fail(function(xhr) {
                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.getVar($(xhr.responseText).find("#Message").html());
                ui.alert(title, message, "error");
            });
        });
    }

    function createEl(name) {
        return $(document.createElement(name));
    }

    function getSuccessMessage(selections) {
        var successMessage = Granite.I18n.get("The {0} pages and their references have been published", selections.length);
        if (selections.length === 1) {
            successMessage = Granite.I18n.get("The page and their references have been published");
        }
        return successMessage;
    }

    function removeDuplicatesInArray(anyArray) {
        return anyArray.sort().filter(function(item, pos, ary) {
            return !pos || item != ary[pos - 1];
        });
    }

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.quickpublish",
        handler: function(name, el, config, collection, selections) {
            var message = createEl("div");

            var intro = createEl("p").appendTo(message);
            if (selections.length === 1) {
                intro.text(Granite.I18n.get("The page and their references will be published."));
            } else {
                intro.text(Granite.I18n.get("The {0} pages and their references will be published.", selections.length));
            }

            var ui = $(window).adaptTo("foundation-ui");
            ui.prompt(QUICKPUBLISH_TITLE, message.html(), "notice", [{
                text: CANCEL_TEXT
            }, {
                text: PUBLISH_TEXT,
                primary: true,
                handler: function() {
                    activatePagesAndItsReferences(config, collection, selections);
                }
            }]);
        }
    });
})(window, document, Granite.$, Granite);

/*
 ADOBE CONFIDENTIAL

 Copyright 2014 Adobe Systems Incorporated
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
(function(window, document, $, URITemplate) {
    var replicateURL = Granite.HTTP.externalize("/bin/replicate");
    var successMessage = Granite.I18n.get("The item has been published");

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.publish",
        handler: function(name, el, config, collection, selections) {
            var ui = $(window).adaptTo("foundation-ui");
            ui.wait();

            var paths = selections.map(function(v) {
                var item = $(v);
                
                // allow to set user defined reference paths, split by comma
                var refPath = item.data("checkReferencesPath");
                if (!refPath) {
                    // coral3 selection is acting on the masonry level
                    refPath = item.children().data("checkReferencesPath");
                }

                if (refPath) {
                    return refPath.split(",");
                }
                
                return item.data("foundationCollectionItemId");
            });

            if (!paths.length) return;

            // flatten the array
            paths = [].concat.apply([], paths);

            var referencePromise = $.ajax({
                url: URITemplate.expand(config.data.referenceSrc, {
                    path: paths
                }),
                "type": "POST",
                cache: false,
                dataType: "json"
            });

            referencePromise.done(function(json) {
                if (json.assets.length === 0) {
                    // publish directly
                    $.ajax({
                        url: replicateURL,
                        type: "POST",
                        data: {
                            _charset_: "utf-8",
                            cmd: "Activate",
                            path: paths
                        }
                    }).always(function() {
                        ui.clearWait();
                    }).done(function() {
                        var api = $(collection).adaptTo("foundation-collection");
                        if (api && "reload" in api) {
                            api.reload();
                            ui.notify(null, successMessage);
                            return;
                        }
                        
                        var contentApi = $(".foundation-content").adaptTo("foundation-content");
                        if (contentApi) {
                            contentApi.refresh();
                        }

                        ui.notify(null, successMessage);
                    }).fail(function(xhr) {
                        var title = Granite.I18n.get("Error");
                        var message = Granite.I18n.getVar($(xhr.responseText).find("#Message").html());
                        ui.alert(title, message, "error");
                    });
                } else {
                    // redirect to wizard
                    sessionStorage.setItem("document.referrer", window.location.href);
                    
                    window.location.href = URITemplate.expand(config.data.wizardSrc, {
                        item: paths
                    });
                }
            });

            referencePromise.fail(function(xhr) {
                ui.clearWait();

                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.get("Failed to retrieve references for selected items.");
                ui.alert(title, message, "error");
            });
        }
    });

    
    /**
     * On content load, display a notification in case we have been redirect from
     * the publish or unpublish page wizard.
     */
    $(document).on("foundation-contentloaded", function (e) {
        var message = sessionStorage.getItem("cq-page-published-message");
        if (message !== null) {
            sessionStorage.removeItem("cq-page-published-message");
            
            var ui = $(window).adaptTo("foundation-ui");
            ui.notify(null, Granite.I18n.getVar(message));
        }
    });
})(window, document, Granite.$, Granite.URITemplate);

/*
 ADOBE CONFIDENTIAL

 Copyright 2014 Adobe Systems Incorporated
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
(function(window, $, URITemplate) {
    var ui = $(window).adaptTo("foundation-ui");
    var treeURL = Granite.HTTP.externalize("/bin/wcm/siteadmin/tree.json");
    var replicateURL = Granite.HTTP.externalize("/bin/replicate");
    var NUM_CHILDREN_CHECK = 20;
    var successMessage = Granite.I18n.get("The item has been unpublished");

    function unpublish(paths, collection) {
        $.ajax({
            url: replicateURL,
            type: "POST",
            data: {
                _charset_: "utf-8",
                cmd: "Deactivate",
                path: paths
            }
        }).always(function() {
            ui.clearWait();
        }).done(function() {
            var api = collection.adaptTo("foundation-collection");
            if (api && "reload" in api) {
                api.reload();
                ui.notify(null, successMessage);
                return;
            }
            
            var contentApi = $(".foundation-content").adaptTo("foundation-content");
            if (contentApi) {
                contentApi.refresh();
            }
            
            ui.notify(null, successMessage);
        }).fail(function(xhr) {
            var title = Granite.I18n.get("Error");
            var message = Granite.I18n.getVar($(xhr.responseText).find("#Message").html());
            ui.alert(title, message, "error");
        });
    }
    
    function countReferences(config, paths) {
        return $.ajax({
            url: URITemplate.expand(config.data.referenceSrc, {
                path: paths,
                predicate: "wcmcontent"
            }),
            "type": "POST",
            cache: false,
            dataType: "json"
        }).then(function(json) {
            return json.pages.reduce(function(memo, value) {
                if (value.published && (value.isPage === true || value.isPage === "true") && value.path !== value.srcPath) {
                    return memo + 1;
                }
                return memo;
            }, 0);
        });
    }
    
    /**
     * Returns the promise of the total count of the descendants of the given paths.
     * 
     * The promise is rejected when both the total is "0" and there is an error.
     * i.e. when we are not sure if there is at least a descendant or not.
     */
    function countChildren(paths) {
        var total = 0;
        
        var promises = paths.map(function(path) {
            return $.ajax({
                url: treeURL,
                data: {
                    path: path,
                    ncc: NUM_CHILDREN_CHECK
                },
                cache: false,
                dataType: "json"
            }).then(function(children) {
                total += children.length;
                
                children.forEach(function(child) {
                    if (!child.leaf) {
                        total += child.sub;
                    }
                });
                
                return true;
            }, function() {
                return $.when(false);
            });
        });
        
        return $.when.apply(null, promises).then(function() {
            if (total > 0) {
                return total;
            }
            
            var allOK = Array.prototype.every.call(arguments, function(status) {
                return status;
            });
            
            if (allOK) {
                return total;
            }
            
            return $.Deferred().reject().promise();
        });
    }
    
    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.unpublish",
        handler: function(name, el, config, collection, selections) {
            var ui = $(window).adaptTo("foundation-ui");
            ui.wait();

            var paths = selections.map(function(v) {
                var item = $(v);
                
                return item.data("foundationCollectionItemId");
            });

            if (!paths.length) return;
            
            // flatten the array
            paths = [].concat.apply([], paths);
            
            var countChildrenPromise = countChildren(paths);
            var countRefsPromise = countReferences(config, paths);
            
            countChildrenPromise.fail(function() {
                ui.clearWait();

                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.get("Failed to retrieve child items for selected items.");
                ui.alert(title, message, "error");
            });
            
            countRefsPromise.fail(function() {
                ui.clearWait();

                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.get("Failed to retrieve references for selected items.");
                ui.alert(title, message, "error");
            });
            
            $.when(countChildrenPromise, countRefsPromise).then(function(countChildren, countRefs) {
                if (countRefs === 0 && countChildren === 0) {
                    unpublish(paths, $(collection));
                    return;
                }
                
                ui.clearWait();

                if (countChildren > NUM_CHILDREN_CHECK) {
                    countChildren = NUM_CHILDREN_CHECK + "+";
                }
                
                var messageRefs = countRefs === 0 ? "" : Granite.I18n.get("Selected items are referenced by {0} item(s).", countRefs);
                var messageChildren  = countChildren === 0 ? "" : Granite.I18n.get("Upon unpublishing, other {0} child item(s) will get unpublished.", countChildren);
                var message = messageRefs + " <br> " + messageChildren;
                
                ui.prompt(Granite.I18n.get("Unpublish"), message, "notice", [{
                    text: Granite.I18n.get("Cancel")
                }, {
                    text: Granite.I18n.get("Continue"),
                    warning: true,
                    handler: function() {
                        ui.wait();
                        unpublish(paths, $(collection));
                    }
                }]);
            });
        }
    });
}(window, Granite.$, Granite.URITemplate));

/*
 ADOBE CONFIDENTIAL

 Copyright 2014 Adobe Systems Incorporated
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
(function(window, $, URITemplate) {
    "use strict";

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.export.excel",
        handler: function(name, el, config, collection, selections) {
            // There is a content where the target collection is not specified.
            // This is totally wrong!
            var id = collection ? collection.dataset.foundationCollectionId : undefined;
            
            var url = URITemplate.expand(config.data.href, {
                id: id,
                item: selections.map(function(item) { return item.dataset.foundationCollectionItemId; })
            });

            // @badpractice This selector is just too arbitrary/ad hoc.
            var searchQuery = $("[data-current-query]").data("currentQuery");
            
            if (searchQuery) {
                // @badpractice The search query should be driven using URI Template, not hardcoded like this.
                url = url + "?" + searchQuery
            }
            
            window.open(url);
        }
    });
})(window, Granite.$, Granite.URITemplate);

/*
 ADOBE CONFIDENTIAL

 Copyright 2018 Adobe Systems Incorporated
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
(function(window, document, $, URITemplate) {

    $(window).adaptTo("foundation-registry").register("foundation.collection.action.action", {
        name: "cq.wcm.move",
        handler: function(name, el, config, collection, item) {
            var ui = $(window).adaptTo("foundation-ui");
            ui.wait();

            var path = $(item).data("foundationCollectionItemId");

            var infoPromise = $.ajax({
                url: URITemplate.expand(config.data.infoSrc, {
                    path: path
                }),
                "type": "GET",
                cache: false,
                dataType: "json"
            });

            infoPromise.done(function(json) {
                if (json.isInLaunch) {
                    // Deny Move Operation
                    ui.clearWait();

                    var title = Granite.I18n.get("Error");
                    var message = Granite.I18n.get("The page is the source root of a launch and the launch will become orphan after this action. The move operation is denied.");
                    ui.alert(title,message, "error");
                } else {
                    // redirect to wizard
                    sessionStorage.setItem("document.referrer", window.location.href);

                    window.location.href = URITemplate.expand(config.data.href, {
                        item: path
                    });
                }
            });

            infoPromise.fail(function(xhr) {
                ui.clearWait();

                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.get("Failed to retrieve launches information for selected item.");
                ui.alert(title, message, "error");
            });
        }
    });
})(window, document, Granite.$, Granite.URITemplate);

