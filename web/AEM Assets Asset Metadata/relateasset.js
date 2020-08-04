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
 * AdobePatentID="P6809-US"
 */
(function(document, XSS, $) {
    "use strict";

    var relationLinkToggleClass = ".asset-relation-link-toggle";
    var assetReferenceReloadPage = ".asset-reference-reload";
    var assetRelationUnrelateClass = ".asset-relation-unrelate";
    var assetReferenceClosePopup = ".close-popup-button";
    var assetReferenceUnrelateButton = ".unrelate-popup-button";
    var assetPickerLaunchError = ".asset-picker-launch-error";
    var assetPickerSelectionPaths = [];
    var ui;
    var submitFormData = {};
    var ATTRIBUTE_RELATION_NAME = "relationName";
    var ATTRIBUTE_LINK_CATEGORY = "linkCategory";
    var ATTRIBUTE_MULTIPLE_ALLOWED = "multipleAllowed";
    var ATTRIBUTE_REVERSE_RELATION_NAME = "reverseRelationName";
    var ATTRIBUTE_REVERSE_RELATION_LINK_CATEGORY = "reverseRelationLinkCategory";
    var ATTRIBUTE_REVERSE_RELATION_MULTIPLE_ALLOWED = "reverseRelationMultipleAllowed";
    var selectionItemRel = ".foundation-selections-item";
    var assetRelinkSourceSelector = "#asset-relink-source-from-selection";
    var assetRelinkSourceFromAssetPicker = "#asset-relink-source-from-assetpicker";

    var CATEGORY_LINK = "link";
    var CATEGORY_UNLINK = "unlink";

    var RELATION_SOURCES = "sources";
    var RELATION_DERIVED = "derived";
    var RELATION_OTHERS = "others";

    var SERVLET_URL = "/libs/dam/gui/content/assets/bulkrelateasset.manageReferences.html?_charset_=utf-8&";

    // used to get and set data from servlet
    var jsonData;
    var mode;
    var MODE_CREATE = "mode_create";
    var MODE_UPDATE = "mode_update";
    var MODE_DELETE = "mode_delete";
    var ASSET_PICKER_CONTAINER = "#dam-assetpicker";
    var ASSET_PICKER_CONTENT = ".dam-asset-picker-asset";
    var ASSET_PICKER_FRAME = "damAssetPickerFrame";
    var EVENT_LAUNCH_PICKER = "dam-launch-picker";
    var ASSET_PICKER_URL = Granite.HTTP.getContextPath() + "/aem/assetpicker.html";

    $(document).one("foundation-contentloaded", function(e) {
        ui = $(window).adaptTo("foundation-ui");
    });

    $(document).on("click", relationLinkToggleClass, function(e) {
        mode = MODE_CREATE;

        var SELECTION_MODE;
        var selectedRelationName = $(e.currentTarget).data("relation-name");
        var multipleAllowed = $(e.currentTarget).data("multiple-allowed");

        submitFormData[ATTRIBUTE_RELATION_NAME] = selectedRelationName;
        submitFormData[ATTRIBUTE_REVERSE_RELATION_NAME] = $(e.currentTarget).data("reverse-relation-name");
        submitFormData[ATTRIBUTE_MULTIPLE_ALLOWED] = multipleAllowed;
        submitFormData[ATTRIBUTE_REVERSE_RELATION_MULTIPLE_ALLOWED] =
            $(e.currentTarget).data("reverse-relation-multiple-allowed");

        submitFormData[ATTRIBUTE_LINK_CATEGORY] = CATEGORY_LINK;
        submitFormData[ATTRIBUTE_REVERSE_RELATION_LINK_CATEGORY] = CATEGORY_LINK;

        // get all data
        var selectedAssets = getSelectedAssetPaths();
        jsonData = getReferencesData(selectedAssets);
        if (multipleAllowed === false) {
            SELECTION_MODE = "single";
        } else {
            SELECTION_MODE = "multiple";
        }
        // check for existing sources
        verifySourcesAndContinue(
            RELATION_SOURCES,
            showAssetPicker,
            "asset-relink-source-from-selection",
            SELECTION_MODE
        );
    });

    function showAssetPicker(SELECTION_MODE) {
        $(document).trigger({
            "type": EVENT_LAUNCH_PICKER,
            "mode": SELECTION_MODE,
            "root": "/content/dam"
        });
    }

    function closeAssetPicker() {
        $(ASSET_PICKER_CONTAINER).attr("hidden", "");
        $(ASSET_PICKER_CONTENT).find("iframe").remove();
    }

    $(document).on(EVENT_LAUNCH_PICKER, function(e) {
        var mode = e.mode;
        var root = e.root;
        var url = ASSET_PICKER_URL + "?root=" + root + "&mode=" + mode;
        launchAssetPicker(url);
    });

    function launchAssetPicker(url) {
        $(ASSET_PICKER_CONTAINER).removeAttr("hidden");
        ui.wait();
        var dialog = document.querySelector(ASSET_PICKER_CONTAINER);
        Coral.commons.ready(dialog, function() {
            if ($(ASSET_PICKER_CONTENT).find("iframe").length === 0) {
                var $iframe = $("<iframe>", {
                    id: "damAssetPickerFrame",
                    frameBorder: "0",
                    seamless: "seamless",
                    src: url
                }).appendTo($(ASSET_PICKER_CONTENT));
                $iframe.on("load", function() {
                    ui.clearWait();
                });
            }
        });
    }

    // Register asset picker router
    window.addEventListener("message", routeAssetPicker, false);

    function routeAssetPicker(event) {
        var srcIFrame = document.getElementById(ASSET_PICKER_FRAME);
        // Don't accept messages from other sources!
        // Twitter, for instances, broadcasts __ready__, which throws when trying to JSON.parse it.
        if (!srcIFrame || event.origin !== location.origin || srcIFrame.contentWindow !== event.source) {
            return;
        }
        assetPickerSelectionPaths = [];
        var fromDam = JSON.parse(event.data);
        if (fromDam.config.action === "close" || fromDam.config.action === "done") {
            closeAssetPicker();
        }
        if (fromDam.data) {
            addContent(fromDam.data);
        }
    }

    function addContent(data) {
        var assetCount = data.length;
        for (var i = 0; i < assetCount; i++) {
            assetPickerSelectionPaths.push(data[i].path);
        }
        verifySourcesAndContinue(RELATION_DERIVED,
            updateJsonAndPost,
            "asset-relink-source-from-assetpicker",
            "multiple"
        );
    }

    /**
     * Fetches the appropriate form
     * */
    var getDataField = function(selectedArticles) {
        var url = $("[data-selfurl]").data("selfurl");
        if (!url) {
            // Fallback
            url = "/mnt/overlay/dam/gui/content/assets/metadataeditor.html";
        }
        url += "?_charset_=utf-8";
        selectedArticles.each(function(index, value) {
            url += "&item=" + encodeURIComponent($(value).data("foundation-collection-item-id"));
        });
        var resp = "";
        $.ajax({
            type: "GET",
            url: url,
            async: false,
            success: function(response) {
                resp = $(response);
            }
        });

        return $(Granite.UI.Foundation.Utils.processHtml(resp, ".data-fields"));
    };

    /**
     * Shows the appropriate data field according to the mime type.
     * */
    var showAppropriateDatafields = function(formId) {
        $(".data-fields").removeClass("active");
        $(".data-fields").removeAttr("id");
        if (formId) {
            var datafield = $('.data-fields[data-formId="' + formId + '"]');
            datafield.addClass("active");
            datafield.prop("id", "aem-assets-metadataeditor-formid");
        }
    };

    var selectionChange = function() {
        if (!$(".metadataeditor-page-settings").length) {
            return;
        }

        var selectedArticles = $(selectionItemRel);
        var size = selectedArticles.length;
        var submitButton = $("#shell-propertiespage-saveactivator");

        var formId = "";
        if (size >= 1) {
            submitButton.prop("disabled", false);
            if (size > 1) {
                formId = "bulkview";
                $(".metadataeditor-page-settings").show();
            } else {
                $(".metadataeditor-page-settings").hide();
                formId = getFirstSelectedAssetPath();
                if (!formId) {
                    formId = "default";
                }
            }

            var datafield = $('.data-fields[data-formId="' + formId + '"]');
            var $datafieldParent = $(".data-fields").parent();
            if (datafield.length) {
                $.each(datafield, function() {
                    this.parentElement.removeChild(this);
                });
            }

            datafield = getDataField(selectedArticles);

            $datafieldParent.append(datafield);

            // Rearrange the layout and initialize components
            datafield.trigger("foundation-contentloaded");
            $(datafield).rearrangeFormLayout();
        } else {
            $(".metadataeditor-page-settings").hide();
            submitButton.prop("disabled", true);
        }
        showAppropriateDatafields(formId);
    };

    $(document).on("click", assetRelationUnrelateClass, function(e) {
        ui.wait();
        showMultipleRelationDialog();
        ui.clearWait();
        selectionChange();
    });

    $(document).on("click", assetReferenceReloadPage, function(e) {
        var coralDialog = $(e.target).closest("coral-dialog");
        var closeButton = $(coralDialog).find("div > button");
        $(closeButton).click();
        // reload page
        selectionChange();
    });

    function getFirstSelectedAssetPath() {
        return getSelectedAssetPaths()[0];
    }

    function getSelectedAssetPaths() {
        var selectedAssets = $(selectionItemRel);
        var selectedAssetPaths = [];
        $.each(selectedAssets, function() {
            selectedAssetPaths.push($(this).data("foundation-collection-item-id"));
        });
        return selectedAssetPaths;
    }

    function relationExist(relationFrom, relationTo, relationName) {
        if (!!jsonData[relationFrom] &&
            !!jsonData[relationFrom][relationName] &&
            !!jsonData[relationFrom][relationName][relationTo]) {
            return true;
        }
        return false;
    }

    function updateJsonAndPost() {
        var selectedAssets = getSelectedAssetPaths();
        var errorsFound = checkForCreateRelationError(selectedAssets, assetPickerSelectionPaths);

        if (errorsFound) {
            return;
        }

        for (var selectedAssetNdx = 0; selectedAssetNdx < selectedAssets.length; selectedAssetNdx++) {
            if (!!jsonData[selectedAssets[selectedAssetNdx]] &&
                !!jsonData[selectedAssets[selectedAssetNdx]][submitFormData[ATTRIBUTE_RELATION_NAME]]) {
                jsonData[selectedAssets[selectedAssetNdx]][submitFormData[ATTRIBUTE_RELATION_NAME]] = {};
            }
            for (var assetPickerNdx = 0; assetPickerNdx < assetPickerSelectionPaths.length; assetPickerNdx++) {
                addToJsonData(selectedAssets[selectedAssetNdx],
                    assetPickerSelectionPaths[assetPickerNdx],
                    submitFormData[ATTRIBUTE_RELATION_NAME],
                    submitFormData[ATTRIBUTE_REVERSE_RELATION_NAME], "", "");

                // in case of derived relation, there will also be a reverse relation path in data array to check for
                // existing source relations of chosen path.
                if (jsonData[assetPickerSelectionPaths[assetPickerNdx]]) {
                    jsonData[assetPickerSelectionPaths[assetPickerNdx]][ATTRIBUTE_RELATION_NAME] =
                    submitFormData[ATTRIBUTE_REVERSE_RELATION_NAME];
                }
            }
            // send the from relation name as data attribute for each path
            if (jsonData[selectedAssets[selectedAssetNdx]]) {
                jsonData[selectedAssets[selectedAssetNdx]][ATTRIBUTE_RELATION_NAME] =
                submitFormData[ATTRIBUTE_RELATION_NAME];
            }
        }

        postJsonToManageReferences();
    }

    function verifySourcesAndContinue(relationToBeChecked, continueFunction, continueId, SELECTION_MODE) {
        var relation = submitFormData[ATTRIBUTE_RELATION_NAME];
        var sourceExistList = [];
        if (relation === RELATION_SOURCES && relationToBeChecked === RELATION_SOURCES) {
            // check selected assets
            var selectedAssetPaths = getSelectedAssetPaths();
            $.each(selectedAssetPaths, function() {
                if (Object.keys(jsonData[this][RELATION_SOURCES]).length !== 0) {
                    sourceExistList.push(jsonData[this]["name"]);
                }
            });
        } else if (relation === RELATION_DERIVED && relationToBeChecked === RELATION_DERIVED) {
            // get reverse data
            // check for existing sources
            var url = SERVLET_URL + "ck=" + Date.now() + "&";
            var sendRequest = false;
            $.each(assetPickerSelectionPaths, function() {
                if (jsonData[this]) {
                    // check bulk relate data
                    if (Object.keys(jsonData[this][RELATION_SOURCES]).length !== 0) {
                        sourceExistList.push(this.item[0].title);
                    }
                } else {
                    // add for data request from server
                    url += "item=" + encodeURIComponent(this) + "&";
                    sendRequest = true;
                }
            });

            // check for data from server
            var tempJsonData = null;
            if (sendRequest) {
                tempJsonData = Granite.HTTP.eval(url);
                sourceExistList = sourceExistList.concat(getAssetsWithExistingSources(tempJsonData));
                $.extend(true, jsonData, tempJsonData);
            }
        }

        if (sourceExistList.length !== 0) {
            // relation already exist
            mode = MODE_UPDATE;
            showDialog("relationExist", "warning", Granite.I18n.get("Sources Conflict"),
                Granite.I18n.get("A Source file for asset(s) already exists. Do you want to replace source?"),
                '<button is="coral-button" variant="default" coral-close="">' +
                       Granite.I18n.get("Cancel") + "</button>" +
                       '<button is="coral-button" variant="primary" ' +
                       'id="' + continueId + '">' +
                       Granite.I18n.get("Replace") + "</button>");
            $("button#" + continueId).attr("selectionmode", SELECTION_MODE);
        } else {
            continueFunction(SELECTION_MODE);
        }
    }

    $(document).on("click", assetRelinkSourceSelector, function(e) {
        var SELECTION_MODE = e.currentTarget.getAttribute("selectionmode");
        var coralDialog = $(e.target).closest("coral-dialog");
        var closeButton = $(coralDialog).find("div > button");
        deleteSourcesForSelectedRows();
        showAssetPicker(SELECTION_MODE);
        $(closeButton).click();
    });

    $(document).on("click", assetRelinkSourceFromAssetPicker, function(e) {
        var coralDialog = $(e.target).closest("coral-dialog");
        var closeButton = $(coralDialog).find("div > button");
        deleteSourcesForSelectionsInAssetPicker();
        updateJsonAndPost();
        $(closeButton).click();
    });

    function deleteSourcesForSelectionsInAssetPicker() {
        var selectedAssetPaths = assetPickerSelectionPaths;
        $.each(selectedAssetPaths, function() {
            // delete from json data
            deleteRelationDataSingleton(this, RELATION_SOURCES, null, true);
        });
    }


    function deleteSourcesForSelectedRows() {
        var selectedAssetPaths = getSelectedAssetPaths();
        $.each(selectedAssetPaths, function() {
            deleteRelationDataSingleton(this, RELATION_SOURCES, null, true);
        });
    }

    function getAssetsWithExistingSources(jsonData) {
        var retVal = [];
        for (var rowPath in jsonData) {
            if (Object.keys(jsonData[rowPath][RELATION_SOURCES]).length !== 0) {
                retVal.push(jsonData[rowPath]["name"]);
            }
        }
        return retVal;
    }

    function getReferencesData(selections) {
        if (selections.length === 0) {
            return;
        }

        var url = SERVLET_URL + "ck=" + Date.now() + "&";
        $.each(selections, function() {
            url += "item=" + encodeURIComponent(this) + "&";
        });

        return Granite.HTTP.eval(url);
    }

    function checkForCreateRelationError(selectedAssets, assetPickerSelectionPaths) {
        var bSamePath = false;
        var bRelationExist = false;
        var relationName = submitFormData[ATTRIBUTE_RELATION_NAME];

        for (var selectedAssetNdx = 0; selectedAssetNdx < selectedAssets.length; selectedAssetNdx++) {
            for (var assetPickerNdx = 0; assetPickerNdx < assetPickerSelectionPaths.length; assetPickerNdx++) {
                if (selectedAssets[selectedAssetNdx] === assetPickerSelectionPaths[assetPickerNdx]) {
                    bSamePath = true;
                    break;
                }
            }
        }

        for (selectedAssetNdx = 0; selectedAssetNdx < selectedAssets.length; selectedAssetNdx++) {
            for (assetPickerNdx = 0; assetPickerNdx < assetPickerSelectionPaths.length; assetPickerNdx++) {
                if (relationExist(selectedAssets[selectedAssetNdx], assetPickerSelectionPaths[assetPickerNdx],
                    relationName)) {
                    bRelationExist = true;
                    break;
                }
            }
        }

        if (bSamePath) {
            showDialog("errorDialog", "error", Granite.I18n.get("Error"),
                Granite.I18n.get("Could not create asset relation with itself."),
                getClosePopupButton());
        } else if (bRelationExist) {
            showDialog("errorDialog", "error", Granite.I18n.get("Error"),
                Granite.I18n.get("Relation(s) already exist."), getClosePopupButton());
        }

        return bRelationExist || bSamePath;
    }

    function addToJsonData(relationFrom, relationTo, relationName, reverseRelationName, fromAssetName,
        toAssetName) {
        // update relationship data
        if (!!jsonData[relationFrom] &&
            !!jsonData[relationFrom][relationName]) {
            jsonData[relationFrom][relationName][relationTo] = { "name": toAssetName };
        }

        // update reverse relationship data
        if (!!jsonData[relationTo] &&
            !!jsonData[relationTo][reverseRelationName]) {
            jsonData[relationTo][reverseRelationName][relationFrom] = { "name": fromAssetName };
        }
    }

    function showDialog(id, variant, header, content, footer) {
        var $dialog = $("#" + id);
        var dialog;
        if ($dialog.length === 0) {
            dialog = new Coral.Dialog().set({
                id: id,
                variant: variant,
                closable: "off",
                header: {
                    innerHTML: header
                },
                content: {
                    innerHTML: content
                },
                footer: {
                    innerHTML: footer
                }
            });
            document.body.appendChild(dialog);
        } else {
            dialog = $dialog[0];
            dialog.header.innerHTML = header;
            dialog.content.innerHTML = content;
            dialog.footer.innerHTML = footer;
        }
        dialog.show();
    }

    function showDialogWithTableContent(id, variant, header, $content, footer) {
        var $dialog = $("#" + id);
        var dialog;
        if ($dialog.length === 0) {
            dialog = new Coral.Dialog().set({
                id: id,
                variant: variant,
                closable: "off"
            });
        } else {
            dialog = $dialog[0];
            $(dialog.content).empty();
        }
        dialog.header.innerHTML = header;
        dialog.footer.innerHTML = footer;
        $(dialog.content).append($content);
        document.body.appendChild(dialog);
        dialog.show();
    }

    // unrelate functionality
    function showMultipleRelationDialog() {
        var path = getFirstSelectedAssetPath();
        loadJsonData(path);
        var $relationTableData = getRelationTables(path);
        var buttons = getDeleteAndClosePopupButtons();
        if (!$relationTableData.length) {
            var noRelationMessage = Granite.I18n.get("Relations does not exist.");
            showDialog("relationPopupEmpty", "default", Granite.I18n.get("Remove Relations"),
                noRelationMessage, buttons);
            buttons = getOKPopupButton();
        } else {
            showDialogWithTableContent("relationPopup", "default", Granite.I18n.get("Remove Relations"),
                $relationTableData, buttons);
        }
        var unrelatePopup = $("#relationPopup > div:eq(1)");
        unrelatePopup.css("max-width", "30%");
        unrelatePopup.css("max-height", "60%");
        unrelatePopup.css("overflow", "auto");
    }

    function getOKPopupButton() {
        return '<button is="coral-button" variant="default" class="close-popup-button">' +
            Granite.I18n.get("OK") + "</button>";
    }

    function getClosePopupButton() {
        return '<button is="coral-button" variant="default" class="close-popup-button">' +
            Granite.I18n.get("Close") + "</button>";
    }

    function getDeleteAndClosePopupButtons() {
        return '<button is="coral-button" variant="default" class="close-popup-button">' +
            Granite.I18n.get("Cancel") + "</button>" +
            '<button is="coral-button" variant="primary" class="unrelate-popup-button" disabled>' +
            Granite.I18n.get("Unrelate") + "</button>";
    }

    function getRenditionURL(path) {
        return Granite.HTTP.externalize(path) + "/jcr:content/renditions/cq5dam.thumbnail.48.48.png";
    }

    function loadJsonData(path) {
        var url = SERVLET_URL + "ck=" + Date.now() + "&item=" + encodeURIComponent(path);
        jsonData = Granite.HTTP.eval(url);
    }

    function getRelationTables(path) {
        var $tables = $("<div></div>");
        var $srcTable = getRelationTable(Granite.I18n.get("Source"), RELATION_SOURCES, RELATION_DERIVED, path);
        var $drvdTable = getRelationTable(Granite.I18n.get("Derived"), RELATION_DERIVED, RELATION_SOURCES, path);
        var $otherTable = getRelationTable(Granite.I18n.get("Others"), RELATION_OTHERS, RELATION_OTHERS, path);
        if (!($srcTable.length || $drvdTable.length || $otherTable.length)) {
            return $();
        }
        return $tables.append($srcTable).append($drvdTable).append($otherTable);
    }

    function getRelationTable(tableHeading, relationName, reverseRelationName, path) {
        var tableData = jsonData[path][relationName];
        if (!tableData || !Object.keys(tableData).length) {
            return $();
        }
        var styles = "background-color:#dfdfdf;text-transform:uppercase;white-space:nowrap;font-weight:700;" +
            "font-style:normal;height:1.875rem;font-size:0.75rem;line-height:1.875rem;>";
        var $table = $('<table is="coral-table" class="coral-table data params coral--light unrelate-' +
            relationName + '" selectable multiple selectionmode="row" variant="list"></table>');
        var $thead = $('<thead is="coral-table-head">' +
                '<tr is="coral-table-row">' +
                    '<th is="coral-table-headercell" style=' + styles + tableHeading + "</th>" +
                    '<th is="coral-table-headercell" style=' + styles + "</th>" +
                "</tr>" +
            "</thead>");
        var $tableBody = $('<tbody is="coral-table-body"></tbody>');

        for (var rowPath in tableData) {
            var $tableRow = $(' <tr is="coral-table-row"> </tr>').attr("data-relation-from", path)
                .attr("data-relation-to", rowPath)
                .attr("data-relation-name", relationName)
                .attr("data-reverse-relation-name", reverseRelationName);
            var $td1 = $("<td is='coral-table-cell' coral-table-rowselect></td>");
            var $img =
                $("<img style='width:100%;height:97%'  class='relationRow' >").attr("src", getRenditionURL(rowPath));
            $td1.append($img);
            var $td2 = $('<td is="coral-table-cell"> </td>').text(tableData[rowPath]["name"]);
            $tableRow.append($td1).append($td2);
            $tableBody.append($tableRow);
        }
        $table.append($thead);
        $table.append($tableBody);
        return $table;
    }

    function deleteRelationDataSingleton(relationFrom, relationName, relationTo, removeSources) {
        if (!relationTo) {
            relationTo = Object.keys(jsonData[relationFrom][relationName])[0];
        }

        if (removeSources) {
            if (!!jsonData[relationFrom] &&
                !!jsonData[relationFrom][relationName] &&
                !!jsonData[relationFrom][relationName][relationTo]) {
                delete jsonData[relationFrom][relationName][relationTo];
            }
        } else {
            if (!!jsonData[relationFrom] &&
                !!jsonData[relationFrom][relationName]) {
                jsonData[relationFrom][relationName][relationTo] = {};
            }
        }
    }

    function postJsonToManageReferences() {
        var data = {};
        data["json"] = JSON.stringify(jsonData);
        ui.wait();
        var options = {
            url: SERVLET_URL + "ck=" + Date.now() + "&",
            type: "post",
            data: data,
            dataType: "json",
            success: function(data) {
                ui.clearWait();
                var headerMessage = getHeaderMessageUsingMode();
                var message = getMessageUsingMode();
                showDialog("successDialog", "success", headerMessage, message,
                    '<button is="coral-button" variant="default" class="asset-reference-reload">' +
                           Granite.I18n.get("OK") + "</button>");
                cleanDataFields();
                selectionChange();
            },
            error: function(xhr, error, errorThrown) {
                ui.clearWait();
                showDialog("errorDialog", "error", Granite.I18n.get("Error"),
                    Granite.I18n.get("Could not update relation."), '<button is="coral-button"' +
                           ' variant="default" class="asset-reference-reload">' +
                           Granite.I18n.get("OK") + "</button>");
            }
        };
        $.ajax(options);
    }

    function getMessageUsingMode() {
        if (mode === MODE_CREATE) {
            return Granite.I18n.get("Relation(s) have been created.");
        } else if (mode === MODE_UPDATE) {
            return Granite.I18n.get("Relation(s) have been updated.");
        } else if (mode === MODE_DELETE) {
            return Granite.I18n.get("Relation(s) have been deleted.");
        }
    }

    function getHeaderMessageUsingMode() {
        if (mode === MODE_CREATE) {
            return Granite.I18n.get("Created Relation(s)");
        } else if (mode === MODE_UPDATE) {
            return Granite.I18n.get("Modified Relation(s)");
        } else if (mode === MODE_DELETE) {
            return Granite.I18n.get("Deleted Relation(s)");
        }
    }

    function cleanDataFields() {
        var datafield = $(".data-fields[data-formId]");
        var $datafieldParent = $(".data-fields").parent();
        if (datafield.length) {
            $.each(datafield, function() {
                this.parentElement.removeChild(this);
            });
        }
        var selectedArticles = $(selectionItemRel);
        datafield = getDataField(selectedArticles);
        $datafieldParent.append(datafield);
    }

    $(document).on("click", assetReferenceClosePopup, function(e) {
        var coralDialog = $(e.target).closest("coral-dialog");
        closeDialogButtonClick(coralDialog);
    });

    $(document).on("click", assetPickerLaunchError, function(e) {
        var coralDialog = $(e.target).closest("coral-dialog");
        closeDialogButtonClick(coralDialog);
    });

    $(document).on("click", assetReferenceUnrelateButton, function(e) {
        mode = MODE_DELETE;
        deleteRelationsFromPopup(RELATION_SOURCES);
        deleteRelationsFromPopup(RELATION_DERIVED);
        deleteRelationsFromPopup(RELATION_OTHERS);
        // close popup
        var closeDialog = $(e.target).closest("coral-dialog");
        closeDialogButtonClick(closeDialog);
        postJsonToManageReferences();
    });

    function deleteRelationsFromPopup(relation) {
        var tableClass = "unrelate-" + relation;
        var table = $("table." + tableClass)[0];
        if (!table) {
            return;
        }

        var relationFrom = $(table).find("tbody tr").data("relation-from");
        if (!!jsonData[relationFrom] &&
            !!jsonData[relationFrom][relation]) {
            jsonData[relationFrom][relation] = {};
            jsonData[relationFrom][ATTRIBUTE_LINK_CATEGORY] = CATEGORY_UNLINK;
        }

        var $selectedItems = table.selectedItems;
        $.each($selectedItems, function() {
            var dataset = this.dataset;
            var relationFrom = dataset["relationFrom"];
            var relationTo = dataset["relationTo"];
            var relationName = dataset[ATTRIBUTE_RELATION_NAME];
            deleteRelationDataSingleton(relationFrom, relationName, relationTo, false);
        });
    }

    function closeDialogButtonClick(coralDialog) {
        if (coralDialog) {
            var closeButton = $(coralDialog).find("div > button");
            $(closeButton).click();
        }
    }

    $(document).on("click", "tr[data-relation-from]", function() {
        // enable/disable unrelate button
        var size = $("tr[data-relation-from][selected]").size();

        if (size) {
            $(".unrelate-popup-button")[0].removeAttribute("disabled");
        } else {
            $(".unrelate-popup-button").attr("disabled", "");
        }
    });
})(document, _g.XSS, Granite.$);
