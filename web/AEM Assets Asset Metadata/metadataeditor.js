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
 *
 */

(function(document, $) {
    "use strict";

    var collectionItemRel = ".cq-damadmin-admin-childpages .foundation-collection-item";
    var selectionItemRel = ".cq-damadmin-admin-childpages .foundation-selections-item";
    var schemaCheckBoxesSelectedCount = 0;
    var forcedFormType = "";

    // @see CQ-29669 Overrides the coral function to allow custom behavior bulkeditor
    $.fn.superUpdateErrorUI = $.fn.updateErrorUI;
    $.fn.updateErrorUI = function() {
        // Ignore errors for bulk editor
        var totalArticles = $(collectionItemRel).length;
        var selectedArticles = $(selectionItemRel).length;

        if (totalArticles === 1 || selectedArticles === 1) {
            this.superUpdateErrorUI();
        } else {
            // CQ-32788:Override default CUI behavior of adding 'is-invalid'
            // to a date picker which is empty for bulk editing
            $("coral-datepicker[invalid] input").removeAttr("invalid");
            $("coral-datepicker[invalid]").removeAttr("invalid");
        }
    };

    $(document).on("foundation-contentloaded", function() {
        var appendModeEnabled = $(".foundation-content-path").data("appendModeEnabled");
        if (appendModeEnabled === undefined) {
            appendModeEnabled = true;
        }
        if ($(".foundation-content-path").data("is-bulk-mode") && appendModeEnabled) {
            // add toggleable control over save button
            var save = $("#shell-propertiespage-doneactivator, #shell-propertiespage-saveactivator");
            save.addClass("foundation-toggleable-control");
            save.attr("data-foundation-toggleable-control-src", $(".foundation-content-path").data("popover-path"));
        } else {
            $(".metadataeditor-page-settings").hide();
        }

        // check if video thumbnail replacing workflow is done
        if ($(".metadata-editor-asset-card").find(".in-workflow-card-info").length !== 0) {
            // CQ-4260492 To show an empty image icon, the image for a non-existant thumbnail has been used.
            $("coral-card-asset > img").attr("src", "/libs/cq/ui/widgets/themes/default/icons/240x180/page.png");
            var refreshIntervalId = setInterval(function() {
                var checkStatusUrl = $(".metadata-editor-asset-card").data("path") + ".videothumbworkflowstatus";
                $.ajax({
                    url: checkStatusUrl,
                    cache: false,
                    type: "GET"
                }).done(function(statusResp) {
                    if (statusResp === "false") {
                        clearInterval(refreshIntervalId);
                        location.reload();
                    }
                });
            }, 2000);
        }

        // hide all the extended actions from bulk edit screen:-
        // location.search tells if QS is present (GET) or not (POST)?
        if (location.search === undefined || location.search === "") {
            $(".cq-siteadmin-admin-actions-unpublish-activator").hide();
            $(".cq-siteadmin-admin-actions-publish-activator").hide();
            $(".cq-damadmin-admin-actions-move-activator").hide();
            $(".cq-siteadmin-admin-actions-copy-activator").hide();
            $(".cq-damadmin-admin-actions-addtocollection-activator").hide();
        }
    });

    $(document).on("coral-overlay:beforeopen", "#soft-submit-popover", function() {
        $(this)[0].target = "#shell-propertiespage-doneactivator";
    });

    function validateRequiredField() {
        var fields = $('.data-fields.active [aria-required="true"]');
        var len = fields.length;
        for (var i = 0; i < len; i++) {
            Coral.commons.ready(fields[i], function(elem) {
                $(elem).checkValidity();
                $(elem).updateErrorUI();
            });
        }
    }

    // TODO : remove if dead code
    function refUpdate() {
        var items = $(".assets-properties-articles article");
        var grRef = Granite.References;
        if (!grRef) {
            return;
        }
        if (items.length > 0) {
            var paths = [];
            items.each(function() {
                paths.push($(this).data("path"));
            });

            var formerPaths;
            if (grRef.$root.data("paths")) {
                formerPaths = grRef.getReferencePaths();
            } else {
                formerPaths = [];
            }

            grRef.triggerChange({
                paths: paths,
                // avoid refresh if mutli selection now and before
                avoidRefresh: paths.length > 1 && formerPaths.length > 1
            });
        }
    }

    // CQ-92939 remove validation errors(red borders on input textfields(includeing datepicker)) in case of bulk editors
    var removeValidations = function() {
        var selectedArticles = $(selectionItemRel).length;

        if (selectedArticles > 1 && $('input[is="coral-textfield"]').length > 0) {
            $('input[is="coral-textfield"]').removeAttr("required");
            $('input[is="coral-textfield"]').removeAttr("invalid");
            $("coral-tab").removeAttr("invalid");
            $('coral-icon[icon="alert"]').hide();
        }
    };

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
            url += "&item=" + encodeURIComponent($(value).data("path"));
        });
        if (forcedFormType !== "" && selectedArticles.length > 1) {
            url += "&forcedFormTypeName=" + forcedFormType;
        }
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
        var selectedArticles = $(selectionItemRel);
        var size = selectedArticles.length;
        var submitButton = $("#shell-propertiespage-saveactivator, #shell-propertiespage-doneactivator");

        var formId = "";
        if (size >= 1) {
            submitButton.prop("disabled", false);
            if (size > 1) {
                formId = "bulkview";
                $(".metadataeditor-page-settings").show();
            } else {
                $(".metadataeditor-page-settings").hide();
                formId = $(selectedArticles[0]).data("path");
                if (!formId) {
                    formId = "default";
                }
            }

            var datafield = $('.data-fields[data-formId="' + formId + '"]');
            if (!datafield.length || (forcedFormType !== "" && size > 1)) {
                datafield = getDataField(selectedArticles);
                var dataFieldParent = $(".data-fields").parent();
                if (forcedFormType !== "" && size > 1) {
                    $(".data-fields").remove();
                }
                dataFieldParent.append(datafield);

                // Rearrange the layout and initialize components
                datafield.trigger("foundation-contentloaded");
                $(datafield).rearrangeFormLayout();
            }
        } else {
            $(".metadataeditor-page-settings").hide();
            submitButton.prop("disabled", true);
        }

        // youtube url list should only be displayed if 1 video asset is selected
        if (undefined !== $("#youtubeurllist") && $("#youtubeurllist").length > 0) {
            if (size === 1) {
                $("#youtubeurllist").show();
            } else {
                $("#youtubeurllist").hide();
            }
        }

        showAppropriateDatafields(formId);
        removeValidations();
    };

    var bulkSchemaInit = function() {
        var selectSchemaformSubmitSelector = ".aem-select-schema-confirm";
        var selectSchemaformId = "aem-select-schema";

        if ($(selectSchemaformSubmitSelector).length > 0) {
            $(selectSchemaformSubmitSelector).attr("disabled", true);
            $(selectSchemaformSubmitSelector).click(function() {
                schemaCheckBoxesSelectedCount = 0;
                $(".aem-select-schema-dialog").remove();
                selectionChange();
            });
        }
        if ($("coral-checkbox", document.getElementById(selectSchemaformId)).length > 0) {
            $("coral-checkbox", document.getElementById(selectSchemaformId)).change(function() {
                if (this.checked) {
                    schemaCheckBoxesSelectedCount++;
                } else {
                    schemaCheckBoxesSelectedCount--;
                }
                if (schemaCheckBoxesSelectedCount !== 1) {
                    $(selectSchemaformSubmitSelector).attr("disabled", true);
                } else {
                    forcedFormType = this.value;
                    $(selectSchemaformSubmitSelector).attr("disabled", false);
                }
            });
        }
    };

    $(document).on("foundation-contentloaded", function() {
        // To arrange the layout of the form
        $(".data-fields.active").rearrangeFormLayout();
        // To take care of blank metadataeditor page mainly for the cases where editor page
        // opened with a POST method and user manually refreshed the page
        if ($(collectionItemRel).length < 1) {
            $(".foundation-layout-panel").html("<p style='text-align:center'>There is no content to display. " +
                                               "<br> If you have manually refreshed the page, " +
                                               "<br> please go back and select asset/s to be edited.</p>");
        }
        // Validate required fields on foundation content loaded.
        Coral.commons.ready($("#aem-assets-metadataeditor-formid"), function() {
            validateRequiredField();
        });
        refUpdate();
        bulkSchemaInit();
        // CQ-92939 remove validation errors(red borders on input textfields(includeing datepicker)) for bulk editors
        var datepickers = $("coral-datepicker");
        var i;
        for (i = 0; i < datepickers.length; i++) {
            Coral.commons.ready(datepickers[i], function() {
                removeValidations();
            });
        }
    });

    $(document).on("foundation-selections-change", ".cq-damadmin-admin-childpages", function(e) {
        selectionChange();
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
 *
 */

(function(document, $, _g) {
    "use strict";

    // For cross browser support - CQ-37914
    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function(suffix) {
            return this.indexOf(suffix, this.length - suffix.length) !== -1;
        };
    }

    var collectionItemRel = ".cq-damadmin-admin-childpages .foundation-collection-item";
    var selectionItemRel = ".cq-damadmin-admin-childpages .foundation-selections-item";
    var simpleSave = true;

    $(document).on("keypress", ".data-fields input[type=text]", function(e) {
        if (e.keyCode === 13) {
            return false;
        }
    });

    function validateRequiredFields() {
        var ariaRequired = $('.data-fields.active [aria-required="true"]');
        var dataRequired = $('.data-fields.active [data-required="true"]');
        var isValid = true;
        ariaRequired.each(function(index, item) {
            if ($(item).is("coral-multifield")) {
                var child = $(item).children("coral-multifield-item");
                var hasValue = false;

                $(child).each(function(i, value) {
                    if ($(value).find('input[is="coral-textfield"]').val() !== "") {
                        hasValue = true;
                    }
                });
                if (hasValue === false) {
                    isValid = hasValue;
                }
            } else {
                var field = $(item).closest(".coral-Form-field");
                var validation = field.adaptTo("foundation-validation");

                if (!validation.checkValidity()) {
                    isValid = false;
                }
                validation.updateUI();
            }
            $(item).updateErrorUI();
        });
        if (isValid) {
            dataRequired.each(function(index, item) {
                if (!$('input[is="coral-textfield"]', $(item)).val()) {
                    isValid = false;
                    if ($(item).data("metatype") === "number") {
                        $(item).attr("invalid", "");
                    }
                } else {
                    if ($(item).data("metatype") === "number") {
                        $(item).removeAttr("invalid");
                    }
                }
            });
        }

        return isValid;
    }

    function validateAssets() {
        var selectionItems = $(selectionItemRel);
        var filePath;
        var isAllAssetsValid = true;
        selectionItems.each(function(index, value) {
            filePath = $(value).data("path");
            var jsonPath = encodeURIComponent(filePath).replace(/%2F/g, "/") + ".1.json?ch_ck = " + Date.now();
            jsonPath = Granite.HTTP.externalize(jsonPath);
            // check if Asset is present or not
            var result = Granite.$.ajax({
                type: "GET",
                async: false,
                url: jsonPath
            });

            if (result.status !== 200) {
                isAllAssetsValid = false;
                return false;
            }
        });

        return isAllAssetsValid;
    }

    function saveMetadataChanges(e) {
        var selectedArticles = $(selectionItemRel).length;

        // @see CQ-29669 Don't validate for bulkeditor
        if (selectedArticles === 1 && !validateRequiredFields()) {
            // Invalid class sometimes doesn't get added to input element
            // $('.data-fields.active .coral-DatePicker.is-invalid').each(function(index, field){
            // $('input[type="text"]', field).addClass('is-invalid');
            // });
            showDialog("aem-assets-metadataedit-validationerror", "error", Granite.I18n.get("Error"),
                Granite.I18n.get("One or more required field(s) is/are empty."),
                '<button is="coral-button" variant="default" coral-close>' + Granite.I18n.get("OK") + "</button>");
            return;
        }
        var assetsAreValid = validateAssets();
        if (assetsAreValid === true) {
            // Assets is present
            var cur = $(e.currentTarget);
            var beforesubmit = $.Event("beforesubmit", {
                originalEvent: e
            });

            cur.trigger(beforesubmit);
            if (beforesubmit.isDefaultPrevented()) {
                return false;
            }

            if ($("#collection-modifieddate").length) {
                $("#collection-modifieddate").attr("value", (new Date()).toISOString());
            }

            createNewTags($("form.data-fields.active")).done(function() {
                var form = $("form.data-fields.active");
                handleResponse(form, submitForm(form));
            }).fail(function(response) {
                showDialog("aem-assets-metadataedit-tags-error", "error", Granite.I18n.get("Error"),
                    Granite.I18n.get("Unable to create new tags. Check for access privileges to create tags."), "");
            });
        } else {
            // assets is not present
            showDialog("aem-assets-metadataedit-tags-error", "error", Granite.I18n.get("Error"),
                Granite.I18n.get("Some assets are either removed or not accessible. Please refresh assets and try again."), ""); // eslint-disable-line max-len
        }
    }


    $(document).on("click", "#shell-propertiespage-saveactivator, #shell-propertiespage-doneactivator", function(e) {
        if (e.currentTarget.id === "shell-propertiespage-doneactivator") {
            simpleSave = false;
        } else {
            simpleSave = true;
        }
        var appendModeEnabled = $(".foundation-content-path").data("appendModeEnabled");
        if (appendModeEnabled === undefined) {
            appendModeEnabled = true;
        }
        if (!$(".foundation-content-path").data("is-bulk-mode") || !appendModeEnabled) {
            saveMetadataChanges(e);
        }
        return false;
    });

    $(document).on("click", "#soft-submit-popover .aem-assets-metadataeditor-bulk-submit", function(e) {
        saveMetadataChanges(e);
    });


    function handleResponse(form, xhr) {
        var ui = $(window).adaptTo("foundation-ui");
        xhr.done(function() {
            if (ui !== undefined) {
                ui.clearWait();
            }
            addRating();
            createSuccessHandler(form, xhr);
        }).fail(function() {
            if (ui !== undefined) {
                ui.clearWait();
            }
            if (xhr.status === 500) {
                showDialog("aem-assets-metadataedit-error", "error", Granite.I18n.get("Error"),
                    Granite.I18n.get("Unable to edit properties. Insufficient permissions."), "");
            } else {
                showDialog("aem-assets-metadataedit-error", "error", Granite.I18n.get("Error"),
                    Granite.I18n.get("Unable to edit properties."), "");
            }
        });
    }

    function createSuccessHandler(form, xhr) {
        var $articles = $(collectionItemRel);
        var length = $articles.length;
        if (length > 1) {
            if (simpleSave) {
                successModalForBulkEdit();
            } else {
                form.trigger("foundation-form-submitted", [ true, xhr ]);
            }
        } else {
            var url = $("[data-selfurl]").data("selfurl");
            if (!url) {
                // Fallback
                url = "/mnt/overlay/dam/gui/content/assets/metadataeditor.html";
            }
            var assetPath = $articles.data("path");
            assetPath = encodeURI(assetPath);
            url += assetPath;
            $.ajax({
                type: "GET",
                cache: false,
                url: url
            }).success(function(response) {
                form.trigger("foundation-form-submitted", [ true, xhr ]);
            });
        }
    }

    function addRating() {
        var rating = $(".rating.edit-mode coral-icon[icon='starFill'].current-rating").data("rate");
        if (rating) {
            var contentPath = $(".rating.edit-mode coral-icon[icon='starFill'].current-rating")
                .closest("form").data("formid");
            if (!contentPath) {
                contentPath = $(collectionItemRel).data("path");
            }
            if (!contentPath) {
                return;
            }
            var url = Granite.HTTP.getContextPath() + contentPath + "/ratings.social.json";
            $.ajax({
                type: "POST",
                url: url,
                async: false,
                data: {
                    tallyGenerator: "assets",
                    response: rating,
                    tallyType: "Rating",
                    ":operation": "social:postTallyResponse"
                },
                error: function(e) {
                    showDialog("aem-assets-rating-error", "error", Granite.I18n.get("Rating Failure"),
                        Granite.I18n.get("Error in rating the asset."),
                        '<button is="coral-button" class="aem-assets-rating-error" variant="default" coral-close>' +
                        Granite.I18n.get("OK") + "</button>");
                }
            });
        }
    }

    function showDialog(id, variant, header, content, footer) {
        var $dialog = $("#" + id);
        var dialog;
        if ($dialog.length === 0) {
            dialog = new Coral.Dialog().set({
                id: id,
                variant: variant,
                closable: "on",
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

    function successModalForBulkEdit() {
        var selectedArticles = $(selectionItemRel);
        var assets = new Array();
        var limit = 10;
        selectedArticles.each(function(item, value) {
            assets[item] = $(value).data("title");
        });
        var resp = "";
        if (assets.length > 1) {
            if (selectedArticles.hasClass("card-collection")) {
                resp = "<p>" + Granite.I18n.get("The following {0} collections have been modified:",
                    assets.length) + "</p>";
            } else {
                resp = "<p>" + Granite.I18n.get("The following {0} assets have been modified:",
                    assets.length) + "</p>";
            }
        } else if (assets.length === 1) {
            if (selectedArticles.hasClass("card-collection")) {
                resp = "<p>" + Granite.I18n.get("The following collection have been modified:") + "</p>";
            } else {
                resp = "<p>" + Granite.I18n.get("The following asset have been modified:") + "</p>";
            }
        }

        resp += "<p class=\"item-list\">";
        var iterLim = assets.length;
        if (assets.length > limit) {
            iterLim = limit - 1;
        }
        for (var i = 0; i < iterLim; i++) {
            resp += _g.XSS.getXSSValue(assets[i]) + "<br>";
        }
        if (assets.length > limit) {
            resp += "...<br>";
        }
        resp += "</p>";

        showDialog("aem-assets-metadataedit-success", "success", Granite.I18n.get("Asset(s) modified"), resp,
            '<button is="coral-button" variant="default" coral-close>' + Granite.I18n.get("OK") + "</button>");
    }

    // showing spinner after bulk metadata edit success and reloading the window
    $(document).on("coral-overlay:close", "#aem-assets-metadataedit-success", function() {
        var ui = $(window).adaptTo("foundation-ui");
        if (ui !== undefined) {
            ui.wait();
        }
        if (location.search === undefined || location.search === "") {
            // Send user back to last page if its a POST request
            window.location = $("#shell-propertiespage-closeactivator")[0].href;
        } else {
            window.location.reload();
        }
    });

    function submitForm(form) {
        var data = formDataForMultiEdit(form);
        var ui = $(window).adaptTo("foundation-ui");
        if (ui !== undefined) {
            ui.wait();
        }

        var url = "";
        if (data.multiAssets) {
            url = Granite.HTTP.externalize("/content/dam.html");
        } else {
            url = Granite.HTTP.externalize(data.contentPath);
        }

        return $.ajax({
            type: "post",
            url: url,
            data: data.formData,
            cache: false,
            async: false
        });
    }

    function formDataForMultiEdit(form) {
        var assets = new Array();
        var articleMarkup = new Array();

        var collectionItems = $(collectionItemRel);
        var selectionItems = $(selectionItemRel);

        var multiAssets = true;
        if (selectionItems.length === 1) {
            multiAssets = false;
        }
        selectionItems.each(function(index, value) {
            articleMarkup[index] = $(value);
            assets[index] = articleMarkup[index].data("path");
        });


        var basePath = "/content/dam";
        var charset = form.data("charset");
        if (!charset) {
            charset = "utf-8";
        }

        var contentPath = collectionItems.data("path");

        if (!multiAssets) {
            basePath = contentPath;
        }

        var contentType = collectionItems.data("type");
        var isCollection = contentType ? contentType.toLowerCase() === "collection" : false;
        var hintFields = createHintFields(multiAssets, isCollection);

        var data = [];
        data.push({ "name": "_charset_", "value": charset });
        data.push({ "name": "dam:bulkUpdate", "value": "true" });

        if (isCollection) {
            data.push({ "name": contentPath + "/jcr:lastModified", "value": "" });
            data.push({ "name": contentPath + "/jcr:lastModifiedBy", "value": "" });
        }

        var checked = $("#soft-submit-popover input:checkbox").prop("checked");
        data.push(checked ? { "name": "mode", "value": "soft" } : { "name": "mode", "value": "hard" });
        if (checked) {
            selectionItems.each(function(index, value) {
                var cvm = $(value).data("contentvm");
                var mdvm = $(value).data("metadatavm");
                var collvm = $(value).data("collectionvm");
                var p = {};
                p["path"] = $(value).data("path");
                p["cvm"] = cvm;
                p["mdvm"] = mdvm;
                p["collvm"] = collvm;

                data.push({ "name": "asset", "value": JSON.stringify(p) });
            });
        }

        var arrayEligibleFormData = $(".data-fields.active").serializeArray();

        for (var i = 0; i < assets.length; i++) {
            var pdfAsset = $("#aem-assets-metadataeditor-formid[data-mime-type='application/pdf']").length > 0;
            var pdfKeywords = [];
            var j;
            var name;

            if (!pdfAsset) {
                var asset = $(".cq-damadmin-admin-childpages .foundation-collection-item" +
                             "[data-foundation-collection-item-id='" + assets[i].replace(/(')/g, "\\$1") + "']");
                pdfAsset = asset.length === 1 && asset.attr("data-mime-type") === "application/pdf";
            }
            for (j = 0; j < arrayEligibleFormData.length; j++) {
                name = arrayEligibleFormData[j]["name"];
                if (name.indexOf("./") !== 0) {
                    if (i !== 0) {
                        // Add to form data only once
                        continue;
                    }
                } else {
                    name = "." + assets[i].substring(basePath.length) + name.substring(1);
                }
                var value = arrayEligibleFormData[j]["value"];
                if (pdfAsset && name === "./jcr:content/metadata/dc:subject") {
                    (value.indexOf(",") !== -1 || value.indexOf(";") !== -1) ? pdfKeywords.push('"' + value + '"')
                        : pdfKeywords.push(value);
                }
                // publish all subassets if it is a s7 set
                if (name === "./jcr:content/onTime" &&
                    articleMarkup[i].data("is-s7set") === true) {
                    articleMarkup[i].data("s7set-subassets-path-list").split(":").forEach(function(val) {
                        data.push({
                            "name": "." + val.substring(basePath.length) + name.substring(1),
                            "value": value
                        });
                    });
                }
                if (value || assets.length === 1) {
                    data.push({ "name": name, "value": value });
                }
            }

            // If asset mimetype is application/pdf then pdf:Keywords and dc:subject has to be in sync
            if (pdfAsset) {
                data.push({ "name": "." + assets[i].substring(basePath.length) +
                          "/jcr:content/metadata/pdf:Keywords@Delete" });
                data.push({
                    "name": "." + assets[i].substring(basePath.length) + "/jcr:content/metadata/pdf:Keywords",
                    "value": pdfKeywords.join(",")
                });
            }

            for (j = 0; j < hintFields.length; j++) {
                name = "." + assets[i].substring(basePath.length) + hintFields[j].name.substring(1);
                data.push({
                    "name": name,
                    "value": hintFields[j].value
                });
            }
        }

        return {
            contentPath: contentPath,
            multiAssets: multiAssets,
            formData: data
        };
    }

    function createHintFields(multiAssets, isCollection) {
        var hintFields = [];
        var $form = $("form.data-fields.active");
        var allTags = $("[data-metatype=tags]", $form);
        allTags.each(function(index, tag) {
            var $tag = $(tag);
            var name = $("coral-taglist", $tag).data("fieldname");
            if (!name) {
                name = "./jcr:content/metadata/cq:tags";
            }
            if (!multiAssets) {
                hintFields.push({
                    "name": name + "@Delete",
                    "value": "delete-empty"
                });
            }
        });


        var allNumbers = $("[data-metatype=number]", $form);
        allNumbers.each(function(index, number) {
            var $number = $(number);
            var typeHint = $number.data("typehint");
            if (!typeHint) {
                typeHint = "Long";
            }
            var name = $number.attr("name");
            // fallback to textfield wrapped in form field
            if (!name) {
                name = $('input[is="coral-textfield"]', $number).attr("name");
            }
            hintFields.push({
                "name": name + "@TypeHint",
                "value": typeHint
            });
        });

        var allMVText = $("[data-metatype=mvtext]", $form);
        allMVText.each(function(index, mvtext) {
            var $mvtext = $(mvtext);
            var typeHint = $mvtext.data("typehint");
            if (!typeHint) {
                typeHint = "String[]";
            }
            var name = $mvtext.data("granite-coral-multifield-name");
            hintFields.push({
                "name": name + "@TypeHint",
                "value": typeHint
            });
        });


        var allCheckbox = $("[data-metatype=checkbox]", $form);
        allCheckbox.each(function(index, checkbox) {
            var $checkbox = $(checkbox);
            if ($checkbox.is(":checked")) {
                $checkbox.attr("value", "true");
            } else if (!($(".cq-damadmin-admin-childpages.foundation-collection")
                .data("foundation-selections-mode") === "multiple")) {
                // Add false to checkbox if asset is not opened in bulk metadata editor
                // see https://jira.corp.adobe.com/browse/CQ-98699 for details .
                // in bulk metadata editor only checked state is considered.
                $checkbox.attr("value", "false");
            }
            var typeHint = $checkbox.data("typehint");
            if (!typeHint) {
                typeHint = "Boolean";
            }
            var name = $checkbox.attr("name");
            hintFields.push({
                "name": name + "@TypeHint",
                "value": typeHint
            });
        });

        /* ecx.io edits start */
        var allMetatypeCheckbox = $('coral-checkbox[data-metatype=checkbox]', $form);
        allMetatypeCheckbox.each(function (index, coralCheckbox) {
            var $coralCheckbox = $(coralCheckbox);
            var $checkbox = $coralCheckbox.find("input[type='checkbox']");

            if($checkbox){
                if($checkbox.is(":checked")){
                    $checkbox.attr('value','true');
                }
                // Add false to checkbox if asset is not opened in bulk metadata editor
                // see https://jira.corp.adobe.com/browse/CQ-98699 for details .
                // in bulk metadata editor only checked state is considered.
                else if(!($(".foundation-collection").data("foundation-selections-mode")=="multiple")){
                    $checkbox.attr("value", "false");
                }
                var typeHint = $checkbox.data('typehint');
                if (!typeHint) {
                    typeHint = 'Boolean';
                }
                var name = $checkbox.attr('name');
                hintFields.push({
                    'name': name + '@TypeHint',
                    'value': typeHint
                });
            }
        });
        /* ecx.io edits end */

        var allMVSelects = $("[data-metatype=dropdown]", $form);
        allMVSelects.each(function(index, mvSelect) {
            var $mvSelect = $(mvSelect);
            var typeHint = $mvSelect.data("typehint");
            if (!typeHint) {
                typeHint = mvSelect.hasAttribute("multiple") ? "String[]" : "String";
            }
            var name = $mvSelect.attr("name");
            hintFields.push({
                "name": name + "@TypeHint",
                "value": typeHint
            });
        });

        return hintFields;
    }

    function createNewTags(form) {
        return $.when.apply(null, form.find('.cq-ui-tagfield coral-taglist input[type="hidden"][name]').map(function() {
            var el = this;

            if (el.value.indexOf(":") >= 0) {
                return;
            }

            var tenantId = $(".foundation-form.mode-edit").attr("tenant-id");
            el.value = tenantId ? ("mac:" + tenantId + "/default/" + el.previousElementSibling.textContent)
                : el.previousElementSibling.textContent;
            return createSingleTag(el.value).then(function(tag) {
                // Fix tag name in select element
                var tenantId = $(".foundation-form.mode-edit").attr("tenant-id");
                if (!tenantId) {
                    // Fix tag name in select element
                    el.value = tag;
                }
            });
        }));
    }

    function createSingleTag(name) {
        var param = {
            cmd: "createTagByTitle",
            tag: name,
            locale: "en", // This is fixed to "en" in old siteadmin also
            "_charset_": "utf-8"
        };
        return $.ajax({
            url: Granite.HTTP.externalize("/bin/tagcommand"),
            type: "POST",
            data: param,
            async: false
        })
            .then(function(html) {
                return $(html).find("#Path").text();
            });
    }
})(document, Granite.$, _g);

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
 *
 */
(function(window, document, $) {
    "use strict";

    $(document).ready(function() {
        var insightDataRequestedOnce = false;
        Coral.commons.ready($("coral-tablist")[0], function() {
            $('coral-tab:contains("Insights")').click(function(event) {
                event.preventDefault();
                if (insightDataRequestedOnce === false) {
                    var reportElem = $("#7-days-report")[0];
                    if (reportElem) {
                        reportElem.dispatchEvent(new MouseEvent("click", { "bubbles": false, "cancelable": true }));
                    }
                    insightDataRequestedOnce = true;
                }
            });
        });
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
 *
 */
(function(window, document, $) {
    "use strict";
    $(document).on("foundation-contentloaded", function() {
        var contextualMetadataEl = $("coral-select[data-metatype='contextualmetadata']");
        if (contextualMetadataEl.length > 0) {
            var $tabs = $("form#aem-assets-metadataeditor-formid coral-tabview");
            Coral.commons.ready($tabs[0], function() {
                _setupField(contextualMetadataEl);
            });
        }
    });

    function _setupField(contextualMetadataEl) {
        $("coral-tab:not([selected])").hide();
        var contextualDropDown = contextualMetadataEl.get(0);
        _initializeTab(contextualDropDown);
        contextualDropDown.addEventListener("change", function(event) {
            _processTab(event.target.selectedItem.value);
        });
    }


    function _initializeTab(contextualDropDown) {
        var currentTabName = $($("form#aem-assets-metadataeditor-formid coral-tab[selected]")[0].label).text();
        _addOption(contextualDropDown, currentTabName, true);
        $("form#aem-assets-metadataeditor-formid coral-tab:not([selected])").each(function(index) {
            var tabName = $($(this)[0].label).text();
            _addOption(contextualDropDown, tabName, false);
        });
    }

    function _addOption(selectEl, val, selected) {
        var itemEl = new Coral.Select.Item();
        itemEl.content.textContent = val;
        itemEl.value = val;
        selectEl.items.add(itemEl);
        if (selected) {
            itemEl.selected = true;
        }
    }

    function _processTab(tabName) {
        $("coral-tab:not([selected])").each(function(index) {
            if (tabName === $($(this)[0].label).text()) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }
})(window, document, Granite.$);

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
 *
 */

(function(document, $) {
    "use strict";

    /**
     * Transforms a single item into the format required by the Coral.Select component.
     *
     * @param {object} item An plain object containing a value and a text property
     */
    function toCoralSelectItemFormat(item) {
        return {
            value: item.value,
            content: {
                textContent: item.text
            }
        };
    }

    var loadTriggered = false;


    var ItemQueue = function(select) {
        this.select = select;

        var hasMore = this._initVars();

        if (hasMore) {
            this._bindEvents();
        }
    };

    ItemQueue.prototype = {
        /**
         * @returns {boolean} indicates whether there are items left to be loaded delayed
         * @private
         */
        _initVars: function() {
            this.$select = $(this.select);
            this.$proxyItems = this.$select.find("[data-proxy-item]");

            var $jsonElem = this.$select.next(".json-select-options");
            if ($jsonElem.length === 0) {
                return false;
            }

            try {
                this.delayedItems = JSON.parse($jsonElem.text());
            } catch (err) {
                // console.error(err);
                this.delayedItems = [];
            }

            this.isLoading = false;
            this.isComplete = this.delayedItems.length === 0;

            return !this.isComplete;
        },

        /**
         * Binds some events to handle loading the next bunch of items and to react on item selections.
         *
         * @private
         */
        _bindEvents: function() {
            this.$select.on("coral-select:showitems", this._showItemsHandler.bind(this));
            this.$select.on("change", this._onChangeHandler.bind(this));
        },

        /**
         * @param {Event} event
         * @private
         */
        _showItemsHandler: function(event) {
            var self = this;

            // Don't use local selections and show the loading icon
            event.preventDefault();

            if (this.isLoading || this.isComplete) {
                return;
            }

            this.$proxyItems.remove();
            this.isLoading = true;
            var newItems = this.delayedItems.splice(0, 100).map(toCoralSelectItemFormat).map(function(item) {
                return this.select.items.add(item);
            }, this);
            this.isComplete = this.delayedItems.length === 0;

            if (this.isComplete) {
                this.$select.off("coral-select:showitems");
                return;
            }

            this._syncProxyItems(newItems);

            // give coral-select some time to process the new data
            setTimeout(function() {
                self.isLoading = false;
                self.select.loading = !self.isComplete;
            });
        },

        /**
         * @private
         */
        _onChangeHandler: function() {
            this._updateProxies();
        },

        /**
         * Searches the first proxy item that is not part of the selection any more. If one is found it is removed
         * from the proxy list.
         *
         * @private
         */
        _updateProxies: function() {
            var selectedItems = this.select.selectedItems;
            var self = this;

            this.$proxyItems.each(function(index) {
                if (selectedItems.indexOf(this) === -1) {
                    self.$proxyItems = self.$proxyItems.not(this);
                    return false;
                }
            });
        },

        /**
         * @param {Coral.Select.Item[]} newItems The items that have just been appended to the select
         * @private
         */
        _syncProxyItems: function(newItems) {
            if (this.$proxyItems.length === 0) {
                return;
            }

            var items = this.select.items;

            // update/clean up proxy list
            for (var i = 0; i < newItems.length; i++) {
                if (newItems[i].value === this.$proxyItems.get(0).value) {
                    this.$proxyItems = this.$proxyItems.slice(1);

                    newItems[i].selected = true;

                    if (this.$proxyItems.length === 0) {
                        break;
                    }
                }
            }

            // create proxy items
            this.$proxyItems.each(function() {
                items.add(this);
            });
        }
    };

    $(document).on("foundation-contentloaded", function() {
        if (loadTriggered) {
            return;
        }
        loadTriggered = true;

        var selects = $("coral-select[data-json-path]");

        $.each(selects, function(index, select) {
            Coral.commons.ready(select, function() {
                new ItemQueue(select);
            });
        });
    });
}(document, Granite.$));

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2019 Adobe
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
(function(window, document, $, Granite) {
    "use strict";

    var TITLE_LIVE_COPY = Granite.I18n.get("Live Copy");
    var TITLE_LIVE_COPY_SOURCE = Granite.I18n.get("Live Copy Source");

    var selectors = {
        liveCopySourceAction: ".cq-damadmin-admin-actions-livecopysource-activator",
        liveCopyAction: ".cq-damadmin-admin-actions-livecopy-activator"
    };

    var cssClasses = {
        hidden: "foundation-collection-action-hidden"
    };

    $(document).on("foundation-selections-change", ".cq-damadmin-admin-childpages", function(e) {
        var $collection = $(e.target);
        var $selectedItem = $collection.find(".foundation-selections-item");
        if ($selectedItem.length > 1) {
            $(selectors.liveCopyAction).addClass(cssClasses.hidden);
            $(selectors.liveCopySourceAction).addClass(cssClasses.hidden);
        } else if ($selectedItem.length === 1) {
            var itemId = $selectedItem.data("graniteCollectionItemId");
            var $form = $("form[data-formid=\"" + itemId + "\"]");
            var tabList = $form.find("coral-tablist")[0];
            var selectedTab = tabList ? tabList.selectedItem : {};
            if (selectedTab) {
                if (selectedTab.innerText === TITLE_LIVE_COPY) {
                    $(selectors.liveCopyAction).removeClass(cssClasses.hidden);
                } else if (selectedTab.innerText === TITLE_LIVE_COPY_SOURCE) {
                    $(selectors.liveCopySourceAction).removeClass(cssClasses.hidden);
                }
            }
        }
    });

    $(document).on("coral-tablist:change", "#aem-assets-metadataeditor-formid coral-tablist", function(e) {
        var tabList = e.target;
        var selectedItem = tabList.selectedItem;

        if (selectedItem) {
            if (selectedItem.innerText === TITLE_LIVE_COPY) {
                $(selectors.liveCopyAction).removeClass(cssClasses.hidden);
            } else {
                $(selectors.liveCopyAction).addClass(cssClasses.hidden);
            }
            if (selectedItem.innerText === TITLE_LIVE_COPY_SOURCE) {
                $(selectors.liveCopySourceAction).removeClass(cssClasses.hidden);
            } else {
                $(selectors.liveCopySourceAction).addClass(cssClasses.hidden);
            }
        }
    });
})(window, document, Granite.$, Granite);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
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

(function(document, $) {
    "use strict";
    if ($.DAM === undefined) {
        $.DAM = {};
    }
    $.DAM.MetadataSchema = {};
    $.DAM.MetadataSchema.IDENTIFIER = "name";
    $.DAM.MetadataSchema.nameToFieldMap = {};
    $.DAM.Handlers = {};


    var FORM_FIELDS = ".coral-Form-field";

    $(document).on("foundation-contentloaded", function() {
        init();
    });

    function init() {
        var formFields = $(FORM_FIELDS);
        formFields.each(function(index) {
            var field = formFields[index];
            if ("CORAL-MULTIFIELD" === field.tagName) {
                $.DAM.MetadataSchema.nameToFieldMap[field.getAttribute("data-granite-coral-multifield-name")] = field;
            } else {
                $.DAM.MetadataSchema.nameToFieldMap[field.getAttribute("name")] = field;
            }
        });
    }

    $.DAM.MetadataSchema.extractRuleDrivenFormFields = function(key, value) {
        var formFields = $.extend({}, $.DAM.MetadataSchema.nameToFieldMap);
        var formValues = Object.keys(formFields).map(function(key) {
            return formFields[key];
        });
        return formValues.filter(function(field) {
            return field.getAttribute("data-" + key) === value;
        });
    };

    $.DAM.MetadataSchema.isBlank = function(value) {
        if (value !== null && value !== undefined) {
            return value.length === 0;
        }
        return true;
    };

    $.DAM.MetadataSchema.handleRule = function(fieldName, relations, evaluator) {
        var visitedCount = {};
        var queue = [ fieldName ];
        while (queue.length > 0) {
            var source = queue.shift();
            if (visitedCount[source] === undefined) {
                visitedCount[source] = 1;
            } else {
                visitedCount[source] += 1;
            }
            var affectedFields = relations[source];
            if (undefined !== affectedFields) {
                affectedFields.forEach(function(fieldName) {
                    var field = $.DAM.MetadataSchema.nameToFieldMap[fieldName];
                    evaluator(field, $.DAM.MetadataSchema.nameToFieldMap[source]);
                    // jQuery promise
                    $.when(Coral.commons.ready(field, function() {
                        return true;
                    })).then(function() {
                        queue.push(field.getAttribute("name"));
                    });
                });
            }
            if (visitedCount[source] > 100) {
                alert("Possible Cyclic Dependency. Validate Schema First.");
                return;
            }
        }
    };

    $.DAM.MetadataSchema.getValue = function(field) {
        var value = undefined;
        var selectedItems = field.items.getAll().filter(function(item) {
            return item.selected;
        });
        if (selectedItems.length === 1) {
            value = selectedItems[0].getAttribute("value");
        } else {
            value = [];
            for (var i in selectedItems) {
                value.push(selectedItems[i].getAttribute("value"));
            }
        }
        return value;
    };

    $.DAM.MetadataSchema.addRequiredAttribute = function(field) {
        if ("CORAL-MULTIFIELD" === field.tagName) {
            _addRequiredAttrForMultifieldElem(field);
        } else {
            _addRequiredAttrForNonMultifieldElem(field);
        }
    };

    $.DAM.MetadataSchema.removeRequiredAttribute = function(field) {
        if ("CORAL-MULTIFIELD" === field.tagName) {
            _removeRequiredAttrForMultifieldElem(field);
        } else {
            _removeRequiredAttrForNonMultifieldElem(field);
        }
    };

    function _addRequiredAttrForMultifieldElem(field) {
        $(field).attr("aria-required", "true");
        var newTemplateInput = $($(field).children("template").first().html());
        newTemplateInput.attr("aria-required", "true");
        var origTemplateInput = $(field).children("template").first();
        origTemplateInput[0].innerHTML = newTemplateInput[0].outerHTML;
    }

    function _addRequiredAttrForNonMultifieldElem(field) {
        field.setAttribute("required", true);
        field.setAttribute("aria-required", true);
    }

    function _removeRequiredAttrForMultifieldElem(field) {
        $(field).removeAttr("aria-required");
        var newTemplateInput = $($(field).children("template").first().html());
        newTemplateInput.removeAttr("aria-required");
        var origTemplateInput = $(field).children("template").first();
        origTemplateInput[0].innerHTML = newTemplateInput[0].outerHTML;
    }

    function _removeRequiredAttrForNonMultifieldElem(field) {
        field.removeAttribute("required");
        field.removeAttribute("aria-required");
    }
})(document, Granite.$);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
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

(function(document, $) {
    "use strict";

    var commons;

    var visibilityRelations = {};

    var VISIBILITY_RULE_KEY = "visibilitycascading";
    var VISIBILITY_RULE_VALUE = "ruleBased";
    var VISIBILITY_FROM = "cascadevisibilityfrom";
    var VISIBILITY_VALUE_SET = "cascadevisibilityvalueset";
    var VALUE_SET_DELIMITER = "|";

    $(document).on("foundation-contentloaded", function() {
        commons = $.DAM.MetadataSchema;
        _initVisibility();
        $.DAM._evaluateAllVisibilityFields();
    });

    function _initVisibility() {
        var formFields = commons.extractRuleDrivenFormFields(VISIBILITY_RULE_KEY, VISIBILITY_RULE_VALUE);
        $(formFields).each(function(index) {
            var field = formFields[index];
            var source = field.getAttribute("data-" + VISIBILITY_FROM);
            if (!commons.isBlank(source)) {
                $.DAM.Handlers._registerVisibilityEventHandlers(source);
                var list = visibilityRelations[source];
                if (undefined === list) {
                    if ("CORAL-MULTIFIELD" === field.tagName) {
                        list = [ field.getAttribute("data-granite-coral-multifield-name") ];
                    } else {
                        list = [ field.getAttribute("name") ];
                    }
                } else {
                    if ("CORAL-MULTIFIELD" === field.tagName) {
                        list.push(field.getAttribute("data-granite-coral-multifield-name"));
                    } else {
                        list.push(field.getAttribute("name"));
                    }
                }
                visibilityRelations[source] = list;
            } else {
                field.parentElement["hidden"] = true;
            }
        });
    }

    $.DAM._evaluateAllVisibilityFields = function() {
        Object.keys(visibilityRelations).forEach(function(field) {
            commons.handleRule(field, visibilityRelations, _updateVisibility.bind(this));
        });
    };

    $.DAM.Handlers._registerVisibilityEventHandlers = function(element) {
        $(commons.nameToFieldMap[element]).on("change", visibilityEventHandler.bind(this));
    };

    function visibilityEventHandler(e) {
        commons.handleRule(e.target.name, visibilityRelations, _updateVisibility.bind(this));
    }

    function _updateVisibility(field, source) {
        Coral.commons.ready(source, function() {
            var visibilityValueSet = field.getAttribute("data-" + VISIBILITY_VALUE_SET).split(VALUE_SET_DELIMITER);
            if (source.parentElement["hidden"]) {
                field.parentElement["hidden"] = true;
                return;
            }
            if (undefined !== visibilityValueSet) {
                var shouldBeVisible = false;
                var values = commons.getValue(source);
                if (Array.isArray(values)) {
                    shouldBeVisible = _isSubset(visibilityValueSet, values);
                } else {
                    shouldBeVisible = visibilityValueSet.includes(commons.getValue(source));
                }
                if (field.parentElement !== null) {
                    field.parentElement["hidden"] = !shouldBeVisible;
                }
                if ("CORAL-MULTIFIELD" === field.tagName) {
                    shouldBeVisible === true ? $(field).find("input").removeAttr("disabled")
                        : $(field).find("input").attr("disabled", "disabled");
                } else {
                    shouldBeVisible === true ? $(field).removeAttr("disabled") : $(field).attr("disabled", "disabled");
                }
                $(document).trigger({ type: "visibility-changed", field: field, shouldBeVisible: shouldBeVisible });
            }
        });
    }

    function _isSubset(master, set) {
        if (set.length === 0) {
            return false;
        }
        return set.every(function(val) {
            return master.indexOf(val) >= 0;
        });
    }
})(document, Granite.$);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
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

(function(document, $) {
    "use strict";

    var commons;

    var requiredRelations = {};

    var REQUIRED_RULE_KEY = "requiredcascading";
    var REQUIRED_RULE_VALUE = "ruleBased";
    var REQUIRED_ALWAYS = "always";
    var REQUIRED_FROM = "cascaderequiredfrom";
    var REQUIRED_VALUE_SET = "cascaderequiredvalueset";
    var VALUE_SET_DELIMITER = "|";

    $(document).on("foundation-contentloaded", function() {
        commons = $.DAM.MetadataSchema;
        _initRequired();
        $.DAM._evaluateAllReqFields();
    });

    function _initRequired() {
        var formFields = commons.extractRuleDrivenFormFields(REQUIRED_RULE_KEY, REQUIRED_RULE_VALUE);
        $(formFields).each(function(index) {
            var field = formFields[index];
            var source = field.getAttribute("data-" + REQUIRED_FROM);
            if (!commons.isBlank(source)) {
                $.DAM.Handlers._registerRequiredEventHandlers(source);
                var list = requiredRelations[source];
                if (undefined === list) {
                    if ("CORAL-MULTIFIELD" === field.tagName) {
                        list = [ field.getAttribute("data-granite-coral-multifield-name") ];
                    } else {
                        list = [ field.getAttribute("name") ];
                    }
                } else {
                    if ("CORAL-MULTIFIELD" === field.tagName) {
                        list.push(field.getAttribute("data-granite-coral-multifield-name"));
                    } else {
                        list.push(field.getAttribute("name"));
                    }
                }
                requiredRelations[source] = list;
            }
        });
        var requiredFields = commons.extractRuleDrivenFormFields(REQUIRED_RULE_KEY, REQUIRED_ALWAYS);
        $(requiredFields).each(function(index) {
            var field = requiredFields[index];
            if (!field.parentElement["hidden"]) {
                commons.addRequiredAttribute(field);
            }
        });
    }

    $.DAM._evaluateAllReqFields = function() {
        Object.keys(requiredRelations).forEach(function(field) {
            commons.handleRule(field, requiredRelations, _updateRequired.bind(this));
        });
    };

    $.DAM.Handlers._registerRequiredEventHandlers = function(element) {
        $(commons.nameToFieldMap[element]).on("change", requiredEventHandler.bind(this));
    };

    function requiredEventHandler(e) {
        commons.handleRule(e.target.name, requiredRelations, _updateRequired.bind(this));
    }

    function _updateRequired(field, source) {
        Coral.commons.ready(source, function() {
            if (!field.parentElement["hidden"]) {
                var requiredValueSet = field.getAttribute("data-" + REQUIRED_VALUE_SET).split(VALUE_SET_DELIMITER);
                if (undefined !== requiredValueSet) {
                    if (requiredValueSet.includes(commons.getValue(source))) {
                        commons.addRequiredAttribute(field);
                    } else {
                        commons.removeRequiredAttribute(field);
                        $("coral-tab").removeAttr("invalid");
                        field.removeAttribute("invalid");
                        $('coral-icon[icon="alert"]').hide();
                    }
                }
            }
        });
    }

    $(document).on("visibility-changed", function(event) {
        if (REQUIRED_ALWAYS === event.field.getAttribute("data-" + REQUIRED_RULE_KEY)) {
            event.shouldBeVisible
                ? $.DAM.MetadataSchema.addRequiredAttribute(event.field)
                : $.DAM.MetadataSchema.removeRequiredAttribute(event.field);
        }
    });
})(document, Granite.$);

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
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

(function(document, $) {
    "use strict";

    var commons;

    var choiceRelations = {};
    var rootNodes = {};

    var CHOICE_RULE_KEY = "choicescascading";
    var CHOICE_RULE_VALUE = "ruleBased";
    var CHOICE_FROM = "cascadechoicefrom";
    var SCHEMA_FIELD_WRAPPER_SELECTOR = ".schemaeditor-wrapper";
    var METADATA_FIELD_SERVLET = "buildmetadatafield";

    $(document).on("foundation-contentloaded", function() {
        commons = $.DAM.MetadataSchema;
        _initChoices().then(function() {
            _evaluateAllFields();
        });
    });

    function _initChoices() {
        var registered = [];
        var formFields = commons.extractRuleDrivenFormFields(CHOICE_RULE_KEY, CHOICE_RULE_VALUE);
        // jQuery promises for IE compatibility
        var formFieldsReady = $.Deferred();
        var readyThreshold = formFields.length;
        $(formFields).each(function(index) {
            var field = formFields[index];
            var source = field.getAttribute("data-" + CHOICE_FROM);
            Coral.commons.ready(field, function() {
                if (!commons.isBlank(source)) {
                    if (!registered.includes(source)) {
                        $.DAM.Handlers._registerChoiceEventHandlers(source);
                        registered.push(source);
                    }
                    var list = choiceRelations[source];
                    if (undefined === list) {
                        list = [ field.getAttribute("name") ];
                    } else {
                        list.push(field.getAttribute("name"));
                    }
                    choiceRelations[source] = list;
                    if (rootNodes[source] === undefined) {
                        rootNodes[source] = true;
                    }
                    rootNodes[field.getAttribute("name")] = false;
                } else {
                    var fieldPath = $(field).parents(SCHEMA_FIELD_WRAPPER_SELECTOR)[0].dataset.path;
                    _renderUpdatedField("", fieldPath, field, true);
                }

                if (--readyThreshold === 0) {
                    formFieldsReady.resolve();
                }
            });
        });

        return formFieldsReady.promise();
    }

    function _evaluateAllFields() {
        Object.keys(rootNodes).forEach(function(name) {
            if (rootNodes[name]) {
                commons.handleRule(name, choiceRelations, evaluateChoices.bind(this));
            }
        });
    }

    function removeRequiredErrorHandler(element) {
        $(commons.nameToFieldMap[element]).on("change", removeRequiredError.bind(this));
    }

    function removeRequiredError(e) {
        Coral.commons.ready(e, function() {
            if (e.target.required && e.target.value !== "") {
                $(e.target).next().hide();
            }
        });
    }

    $.DAM.Handlers._registerChoiceEventHandlers = function(element) {
        $(commons.nameToFieldMap[element]).on("change", choicesEventHandler.bind(this));
    };

    function choicesEventHandler(e) {
        commons.handleRule(e.target.name, choiceRelations, evaluateChoices.bind(this));
    }

    function evaluateChoices(field, source) {
        // jQuery promise
        $.when(Coral.commons.ready(source, function() {
            return true;
        })).then(function() {
            var sourceValue = commons.getValue(source);
            var fieldPath = $(field).parents(SCHEMA_FIELD_WRAPPER_SELECTOR)[0].dataset.path;
            _renderUpdatedField(sourceValue, fieldPath, field, true);
        });
    }

    function _renderUpdatedField(sourceValue, fieldPath, field, preserveSelected) {
        var currentValue = commons.getValue(field);
        var requestUrl = fieldPath + "." + METADATA_FIELD_SERVLET + ".html";
        if (commons.isBlank(sourceValue)) {
            sourceValue = "~";
        }
        return $.ajax({
            url: requestUrl,
            data: {
                srcValue: sourceValue
            },
            type: "GET",
            async: false,
            cache: false
        }).then(function(response) {
            var internalHTML = $(response).find('[name="' +
                                field.getAttribute("name") + '"][type != "hidden"]');

            var fName = field.name;
            var tagname = field.tagName.toLowerCase();
            field.outerHTML = internalHTML[0].outerHTML;
            var newField = $(tagname + '[name="' + fName + '"]')[0];

            if (field.required) {
                $(newField).attr("required", true);
            }
            field = newField;

            var $alertEle = $(field).parent().find("coral-icon[icon='alert']");
            if ($alertEle.length === 1) {
                $alertEle.remove();
            }

            $.DAM.MetadataSchema.nameToFieldMap[fName] = field;

            if (preserveSelected && currentValue.length > 0) {
                $.when(Coral.commons.ready(field, function() {
                    return true;
                })).then(function() {
                    if (typeof currentValue === "string") {
                        var $item = $(field).find("coral-select-item")
                            .filter(function() {
                                return this.value === currentValue;
                            });

                        if ($item.length > 0) {
                            $item.get(0).selected = true;
                        } else if (field.required) {
                            $(field).attr("aria-invalid", true);
                            $(field).attr("invalid", true);
                        }
                    } else {
                        currentValue.forEach(function(value) {
                            var $item = $(field).find("coral-select-item")
                                .filter(function() {
                                    return this.value === value;
                                });

                            if ($item.length > 0) {
                                $item.get(0).selected = true;
                            }
                        });
                    }
                });
            } else if (field.required) {
                $(field).attr("aria-invalid", true);
                $(field).attr("invalid", true);
            }

            Coral.commons.ready(field, function() {
                $(field).change();
            });


            $.DAM.Handlers._registerChoiceEventHandlers(fName);
            $.DAM.Handlers._registerRequiredEventHandlers(fName);
            $.DAM.Handlers._registerVisibilityEventHandlers(fName);
            removeRequiredErrorHandler(fName);
            $.DAM._evaluateAllReqFields();
            $.DAM._evaluateAllVisibilityFields();
        });
    }
})(document, Granite.$);

