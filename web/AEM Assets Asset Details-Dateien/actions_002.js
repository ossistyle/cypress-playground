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
(function(document, Class, $) {
    "use strict";

    var contentPath = null;
    var relDamCreateFolder = "#dam-create-folder";
    var folderMetadataSchemas = [];

    $(document).on("foundation-contentloaded", initCreateDamFolder);
    $(document).on("click", relDamCreateFolder, initCreateDamFolder);

    var createDialogEl;

    var DamCreateFolder = new Class({

        createFolder: null,
        dialog: null,
        _ILLEGAL_FILENAME_CHARS: "%/\\:*?\"[]|\n\t\r. #{}^;+",

        set: function(prop, value) {
            this[prop] = value;
            return this;
        },

        initialize: function() {
            var self = this;

            if (!self.dialog) {
                self.dialog = self.createDialog();
                document.body.appendChild(self.dialog);
            }
            self._refreshDialog(self.dialog, contentPath);

            Coral.commons.ready(self.createFolder, function() {
                self.createFolder
                    .on("click", function(event) {
                        var parentAPI = $(self.createFolder).closest(".foundation-toggleable")
                            .adaptTo("foundation-toggleable");
                        if (parentAPI) {
                            parentAPI.hide();
                        }
                        // Clicking on Cancel button calls cleanDialog, but on closing the dialog
                        // with the cross button(X) doesn't, hence the cleanup before show
                        self._cleanDialog();
                        self.dialog.show();
                    });
            });
        },

        createDialog: function() {
            var self = this;
            var dialogExist = true;
            if (!createDialogEl) {
                dialogExist = false;
                createDialogEl = new Coral.Dialog().set({
                    id: "createfolder",
                    header: {
                        innerHTML: Granite.I18n.get("Create Folder")
                    },
                    closable: "on"
                });
            }

            var dialog = createDialogEl;
            var content = dialog.content;
            var contentForm;
            if (!dialogExist) {
            // The modal is basically a form
                contentForm = content.appendChild(document.createElement("form"));
                contentForm.className += " coral-Form--vertical";
                contentForm.action = contentPath;
                contentForm.method = "POST";
                contentForm.encType = "application/x-www-form-urlencoded";

                // Title
                contentForm.appendChild(function() {
                    var fieldDiv = document.createElement("div");
                    var titleLabel = document.createElement("label");
                    fieldDiv.className += " coral-Form-fieldwrapper";
                    titleLabel.innerHTML = Granite.I18n.get("Title *");
                    titleLabel.className += " coral-Form-fieldlabel";
                    var input = new Coral.Textfield().set({
                        name: "./jcr:content/jcr:title"
                    }).on("input", function(event) {
                        var title = $(this).get(0);
                        self._validateAndAddTooltip(title.value);
                    }).on("keypress", function(event) {
                        var charCode = event.which || event.keyCode;
                        if (charCode === 13 && dialog.submit.disabled === false) { // Enter keycode
                            self._submit();
                        }
                    });
                    input.className += " coral-Form-field";
                    dialog.titleInput = input;
                    fieldDiv.appendChild(titleLabel);
                    fieldDiv.appendChild(input);
                    return fieldDiv;
                }());

                // Name
                contentForm.appendChild(function() {
                    var fieldDiv = document.createElement("div");
                    var titleLabel = document.createElement("label");
                    fieldDiv.className += " coral-Form-fieldwrapper";
                    titleLabel.innerHTML = Granite.I18n.get("Name");
                    titleLabel.className += " coral-Form-fieldlabel";
                    var input = new Coral.Textfield().set({
                        name: ":name"
                    }).on("keypress", function(event) {
                        var charCode = event.which || event.keyCode;
                        if (self._isRestricted(charCode)) {
                            event.preventDefault();
                        }
                        if (charCode === 13 && dialog.submit.disabled === false) { // Enter keycode
                            self._submit();
                        }
                    }).on("change", function(event) {
                        var name = $(this).get(0);
                        self._validateAndAddTooltip(name.value);
                    });
                    input.className += " coral-Form-field";
                    dialog.nameInput = input;
                    fieldDiv.appendChild(titleLabel);
                    fieldDiv.appendChild(input);
                    return fieldDiv;
                }());

                // Hidden. For folder type.
                contentForm.appendChild(function() {
                    var dom = document.createElement("input");
                    dom.type = "hidden";
                    dom.name = "./jcr:primaryType";
                    dom.value = "sling:Folder";
                    return dom;
                }());

                // Hidden. To create jcr:content under folder.
                contentForm.appendChild(function() {
                    var dom = document.createElement("input");
                    dom.type = "hidden";
                    dom.name = "./jcr:content/jcr:primaryType";
                    dom.value = "nt:unstructured";
                    return dom;
                }());

                // Hidden. To save sourcing property on contribution folder.
                contentForm.appendChild(function() {
                    var dom = document.createElement("input");
                    dom.type = "hidden";
                    dom.name = "./jcr:content/sourcing";
                    dom.value = false;
                    return dom;
                }());

                // Hidden. for _charset_.
                contentForm.appendChild(function() {
                    var dom = document.createElement("input");
                    dom.type = "hidden";
                    dom.name = "_charset_";
                    dom.value = "UTF-8";
                    return dom;
                }());
                if (folderMetadataSchemas.length > 0) {
                    contentForm.appendChild(function() {
                        var fieldDiv = document.createElement("div");
                        var titleLabel = document.createElement("label");
                        fieldDiv.className += " coral-Form-fieldwrapper";
                        titleLabel.innerHTML = Granite.I18n.get("Folder Metadata Schema");
                        titleLabel.className += " coral-Form-fieldlabel";
                        var select = new Coral.Select().set({
                            name: "./jcr:content/folderMetadataSchema"
                        });
                        select.className += " coral-Form-field";
                        dialog.folderMetadataInput = select;

                        select.items.add(
                            { content: { innerHTML: Granite.I18n.get("None") }, value: "", disabled: false }
                        );
                        folderMetadataSchemas.forEach(function(child) {
                            select.items.add(
                                { content: { innerHTML: child.title }, value: child.path, disabled: false }
                            );
                        });

                        var infoIcon = new Coral.Icon().set({
                            id: "dam-folder-create-folderschemameta",
                            icon: "infoCircle",
                            size: "S"
                        });
                        infoIcon.classList.add("coral-Form-fieldinfo");

                        fieldDiv.appendChild(titleLabel);
                        fieldDiv.appendChild(select);
                        return fieldDiv;
                    }());
                }


                var privateCheckbox = new Coral.Checkbox().on("change", function(event) {
                    dialog.isPrivate = this.checked;
                });
                privateCheckbox.label.innerHTML = Granite.I18n.get("Private");
                $(privateCheckbox).addClass("private-folder-chkbox");
                contentForm.appendChild(privateCheckbox);

                var reorderableCheckbox = new Coral.Checkbox().on("change", function(event) {
                    if (this.checked) {
                        dialog.querySelector('[name="./jcr:primaryType"]').value = "sling:OrderedFolder";
                    } else {
                        dialog.querySelector('[name="./jcr:primaryType"]').value = "sling:Folder";
                    }
                });
                reorderableCheckbox.label.innerHTML = Granite.I18n.get("Orderable");
                contentForm.appendChild(reorderableCheckbox);

                var assetContributionCheckbox = new Coral.Checkbox().on("change", function(event) {
                    if (this.checked) {
                        dialog.querySelector('[name="./jcr:content/sourcing"]').value = true;
                        dialog.isSourcing = true;
                    } else {
                        dialog.querySelector('[name="./jcr:content/sourcing"]').value = false;
                        dialog.isSourcing = false;
                    }
                });
                assetContributionCheckbox.label.innerHTML = Granite.I18n.get("Asset Contribution");
                $(assetContributionCheckbox).addClass("asset-contribution-checkbox");

                var showAssetContributionCheckBox = ($("input[name='asset-sourcing-flag']").length > 0);
                if (showAssetContributionCheckBox) {
                    contentForm.appendChild(assetContributionCheckbox);
                }

                var footer = dialog.footer;
                var cancel = new Coral.Button();
                cancel.label.textContent = Granite.I18n.get("Cancel");
                footer.appendChild(cancel).on("click", function() {
                    self._cleanDialog();
                    dialog.hide();
                });

                var submitButton = new Coral.Button().set({
                    variant: "primary",
                    disabled: true
                }).on("click", function() {
                    self._submit();
                });
                submitButton.label.textContent = Granite.I18n.get("Create");

                footer.appendChild(submitButton);

                // Few settings to be used on various actions
                dialog.submit = submitButton;
                dialog.isPrivate = false;
                dialog.isSourcing = false;
            } else {
                contentForm = content.childNodes.item(0);
                contentForm.action = contentPath;
            }

            return dialog;
        },
        _refreshDialog: function(dialog, contentPath) {
            var self = this;
            // Sync private folder checkbox according to permission on current folder
            var privateCheckbox = $(".private-folder-chkbox", $(dialog))[0];
            var canModifyAccessControl = self._checkPermission(contentPath, "jcr:modifyAccessControl");
            if (canModifyAccessControl) {
                privateCheckbox.disabled = false;
                privateCheckbox.hidden = false;
            } else {
                privateCheckbox.disabled = true;
                privateCheckbox.hidden = true;
            }
            // show "Asset Contribution" checkbox based on whether it is sourcing shared folder
            var assetContributionCheckbox = $(".asset-contribution-checkbox", $(dialog))[0];
            if (assetContributionCheckbox !== undefined) {
                var isSourcingSharedFolder = self._checkSourcingSharedFolder(contentPath);
                if (!isSourcingSharedFolder) {
                    assetContributionCheckbox.disabled = false;
                    assetContributionCheckbox.hidden = false;
                } else {
                    assetContributionCheckbox.hidden = true;
                }
            }
        },

        _checkPermission: function(contentPath, privilege) {
            var hasPermission = false;
            var servletUrl = Granite.HTTP.externalize(contentPath + ".permissions.json");
            $.ajax({
                url: servletUrl,
                type: "GET",
                dataType: "json",
                data: {
                    "privileges": privilege
                },
                async: false
            }).done(function(responseJson) {
                if (responseJson.hasOwnProperty(privilege)) {
                    hasPermission = responseJson[privilege] || false;
                }
            }
            );
            return hasPermission;
        },

        _checkSourcingSharedFolder: function(contentPath) {
            var newContentPath = contentPath;
            if (contentPath !== undefined && contentPath.charAt(contentPath.length - 1) === "/") {
                newContentPath = contentPath.substr(0, contentPath.length - 1);
            }
            var parentPath = newContentPath.substr(0, newContentPath.lastIndexOf("/"));
            var serverUrl = Granite.HTTP.externalize(parentPath + ".1.json");
            var parentResult = $.ajax({
                url: serverUrl,
                type: "GET",
                dataType: "json",
                async: false
            });
            var parentOutput = JSON.parse(parentResult.responseText);
            var isParentSourcing = false;
            if (parentOutput.hasOwnProperty("jcr:content")) {
                if (parentOutput["jcr:content"].hasOwnProperty("sourcing")) {
                    isParentSourcing = parentOutput["jcr:content"].hasOwnProperty("sourcing") || false;
                }
            }

            // return false if parent folder is not sourcing
            if (isParentSourcing === false) {
                return false;
            }
            var sharedFolderName = "";
            if (parentOutput.hasOwnProperty("jcr:content")) {
                if (parentOutput["jcr:content"].hasOwnProperty("sharedFolderName")) {
                    sharedFolderName = parentOutput["jcr:content"].sharedFolderName;
                }
            }

            var server = Granite.HTTP.externalize(newContentPath + ".1.json");
            var result = $.ajax({
                url: server,
                type: "GET",
                dataType: "json",
                async: false
            });
            var output = JSON.parse(result.responseText);
            var sharedFolderTitle = null;
            if (output.hasOwnProperty("jcr:content")) {
                if (output["jcr:content"].hasOwnProperty("jcr:title")) {
                    sharedFolderTitle = output["jcr:content"]["jcr:title"];
                }
            }

            if (isParentSourcing === true && sharedFolderTitle.toLowerCase() === sharedFolderName.toLowerCase()) {
                return true;
            } else {
                return false;
            }
        },

        _submit: function() {
            var self = this;

            var nameInput = $('input[name=":name"]', self.dialog)[0];
            var name = nameInput.value;
            if (self._checkExistance(name) || self._hasRestrictedChar(name)) {
                Array.prototype.slice.call(nameInput.parentElement.getElementsByTagName("coral-tooltip"))
                    .forEach(function(item) {
                        item.remove();
                    });
                if (self._checkExistance(name)) {
                    nameInput.parentElement.appendChild(new Coral.Tooltip().set({
                        variant: "error",
                        content: {
                            innerHTML: Granite.I18n.get("Resource already exists")
                        },
                        target: nameInput,
                        placement: "bottom"
                    })).show();
                } else {
                    var errorIcon = new Coral.Icon().set({
                        id: "dam-folder-name-textfield-fielderror-submit",
                        icon: "infoCircle",
                        size: "S"
                    });
                    errorIcon.className += " coral-Form-fielderror error-info-icon";
                    nameInput.parentElement.appendChild(errorIcon);
                    var errorTooltip = new Coral.Tooltip().set({
                        content: {
                            // es
                            innerHTML: Granite.I18n.get("The name contained {0}. These characters are not allowed and were replaced by {1}", // eslint-disable-line max-len
                                [ self._getInvalidCharSet(), "-" ])
                        },
                        variant: "error",
                        target: "#dam-folder-name-textfield-fielderror-submit",
                        placement: "right",
                        id: "dam-folder-name-textfield-fielderror-tooltip"
                    });
                    nameInput.parentElement.appendChild(errorTooltip);
                }
                self.dialog.submit.disabled = true;
            } else {
                var form = self.dialog.querySelector("form");
                var basePath = form.getAttribute("action");
                // CQ-4194504 Creating folder when a folder is selected,
                // the folder should be created inside the selected folder..
                if ($(".foundation-selections-item").length > 0) {
                    basePath = $(".foundation-selections-item").data("foundation-collection-item-id") + "/";
                }
                var data = $(form).serialize();
                var sharedFolderName = "shared";
                var newFolderName = "new";
                var sharedFolderTitle = Granite.I18n.get("Shared");
                var newFolderTitle = Granite.I18n.get("New");
                var sharedFolderPath = basePath + self.dialog.nameInput.value + "/" + sharedFolderName;
                var newFolderPath = basePath + self.dialog.nameInput.value + "/" + newFolderName;
                if (self.dialog.isSourcing) {
                    // shared folder creation in sourcing flow
                    data = data + "&" + encodeURIComponent(sharedFolderPath + "/jcr:content/jcr:primaryType") + "=" +
                        encodeURIComponent("nt:unstructured") + "&" +
                        encodeURIComponent(sharedFolderPath + "/jcr:content/jcr:title") + "=" + sharedFolderTitle +
                        "&" + encodeURIComponent("./jcr:content/sharedFolderName") + "=" + sharedFolderName;

                    // new folder creation in sourcing flow
                    data = data + "&" + encodeURIComponent(newFolderPath + "/jcr:content/jcr:primaryType") + "=" +
                        encodeURIComponent("nt:unstructured") + "&" +
                        encodeURIComponent(newFolderPath + "/jcr:content/jcr:title") + "=" + newFolderTitle + "&" +
                        encodeURIComponent("./jcr:content/newFolderName") + "=" + newFolderName;
                }
                $.ajax({
                    type: form.method,
                    // form.action returns an absolute path which cannot be externalized
                    url: Granite.HTTP.externalize(basePath + self.dialog.nameInput.value),
                    contentType: form.encType,
                    data: data,
                    cache: false
                }).done(function(data, textStatus, jqXHR) {
                    if (self.dialog.isPrivate) {
                        $.ajax({
                            type: "POST",
                            // form.action returns an absolute path which cannot be externalized
                            url: Granite.HTTP.externalize(basePath),
                            data: {
                                "_charset_": "utf-8",
                                ":operation": "dam.share.folder",
                                "path": (($(".foundation-selections-item").length > 0) ? basePath : contentPath) +
                                        self.dialog.nameInput.value,
                                "private": true
                            }
                        }).fail(function(jqXHR, textStatus, errorThrown) {
                            var errDialog = new Coral.Dialog().set({
                                header: {
                                    innerHTML: Granite.I18n.get("Error")
                                },
                                content: {
                                    innerHTML: Granite.I18n.get("Error in making the folder private, created as a public folder.")// eslint-disable-line max-len
                                }
                            });
                            var errorDlgOkBtn = new Coral.Button();
                            errorDlgOkBtn.variant = "primary";
                            errorDlgOkBtn.label.textContent = Granite.I18n.get("Ok");
                            errDialog.footer.appendChild(errorDlgOkBtn)
                                .on("click", function(event) {
                                    self._cleanDialog();
                                    errDialog.hide();
                                });
                        });
                    }

                    if (self.dialog.isSourcing) {
                        var href = "/mnt/overlay/dam/gui/content/sourcing/createsourcingfolderwizard.html" +
                            basePath + self.dialog.nameInput.value;
                        window.location.href = Granite.HTTP.externalize(href);
                    }
                    self._cleanDialog();
                    self.dialog.hide();
                    self._refresh();
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    var errDialog = new Coral.Dialog().set({
                        header: {
                            innerHTML: Granite.I18n.get("Error")
                        },
                        content: {
                            innerHTML: Granite.I18n.get("Failed to create folder.")
                        }
                    });
                    var errorDlgOkBtn = new Coral.Button();
                    errorDlgOkBtn.variant = "primary";
                    errorDlgOkBtn.label.textContent = Granite.I18n.get("Ok");
                    errDialog.footer.appendChild(errorDlgOkBtn)
                        .on("click", function(event) {
                            self._cleanDialog();
                            errDialog.hide();
                        });
                    self.dialog.hide();
                    errDialog.show();
                });
            }
        },

        _checkExistance: function(name) {
            var newContentPath = contentPath;
            if (contentPath !== undefined && contentPath.charAt(contentPath.length - 1) === "/") {
                newContentPath = contentPath.substr(0, contentPath.length - 1);
            }
            var result = $.ajax({
                type: "GET",
                async: false,
                url: Granite.HTTP.externalize(newContentPath + ".1.json"),
                cache: false
            });
            var folderList = JSON.parse(result.responseText);
            for (var i in folderList) {
                if (name === i) {
                    return true;
                }
            }
            return false;
        },

        _validateAndAddTooltip: function(enteredText) {
            var self = this;
            var toDisable = false;
            if (enteredText === "") {
                toDisable = toDisable || true;
            }
            // Remove the stale tooltips if any
            Array.prototype.slice.call(self.dialog.nameInput.parentElement.getElementsByClassName("error-info-icon"))
                .forEach(function(item) {
                    item.remove();
                });

            // Do validation and add tooltip if required
            if (self._hasRestrictedChar(enteredText)) {
                var errorIcon = new Coral.Icon().set({
                    id: "dam-folder-name-textfield-fielderror",
                    icon: "infoCircle",
                    size: "S"
                });
                errorIcon.className += " coral-Form-fieldinfo error-info-icon";
                self.dialog.nameInput.parentElement.appendChild(errorIcon);

                var errorTooltip = new Coral.Tooltip().set({
                    content: {
                        innerHTML: Granite.I18n.get("The name contained {0}. These characters are not allowed and were replaced by {1}", // eslint-disable-line max-len
                            [ self._getInvalidCharSet(), "-" ])
                    },
                    variant: "inspect",
                    target: "#dam-folder-name-textfield-fielderror",
                    placement: "left",
                    id: "dam-folder-name-textfield-fielderror-tooltip"
                });
                self.dialog.nameInput.parentElement.appendChild(errorTooltip);
                var validValue;
                if (Dam.Util.NameValidation !== undefined) {
                    validValue = Dam.Util.NameValidation.getValidFolderName(enteredText.toLowerCase())
                        .replace(/ /g, "-");
                } else {
                    // This block is to support backward compatibility.
                    validValue = self._replaceRestrictedCodes(enteredText.toLowerCase()).replace(/ /g, "-");
                }
                self.dialog.nameInput.value = validValue;
            } else {
                self.dialog.nameInput.value = enteredText.toLowerCase().replace(/ /g, "-");
            }

            self.dialog.submit.disabled = toDisable;
        },

        _getInvalidCharSet: function() {
            if (Dam.Util.NameValidation !== undefined) {
                return Dam.Util.NameValidation.getInvalidFolderCharSet();
            } else {
                // This block is to support backward compatibility
                return self._ILLEGAL_FILENAME_CHARS.toString().replace(/,/g, " ");
            }
        },
        _cleanDialog: function() {
            var self = this;
            $.each(self.dialog.getElementsByTagName("input"), function(cnt, input) {
                if (input.type === "text") {
                    input.value = "";
                } else if (input.type === "checkbox") {
                    input.checked = false;
                }
            });
            self.dialog.submit.disabled = true;
            // Remove the stale tooltips if any
            Array.prototype.slice.call(self.dialog.getElementsByClassName("error-info-icon")).forEach(function(item) {
                item.remove();
            });
            $(self.dialog).find("coral-tooltip[variant='error']").remove();
        },

        // @Deprecated, Use Dam.Util.NameValidation
        _isRestricted: function(code) {
            var self = this;
            var charVal = String.fromCharCode(code);
            if (Dam.Util.NameValidation !== undefined) {
                return !Dam.Util.NameValidation.isValidFolderName(charVal);
            } else {
                // This block is to support backward compatibility
                if (self._ILLEGAL_FILENAME_CHARS.indexOf(charVal) > -1) {
                    return true;
                } else {
                    return false;
                }
            }
        },

        _hasRestrictedChar: function(textValue) {
            var self = this;
            for (var i = 0, ln = textValue.length; i < ln; i++) {
                if (self._isRestricted(textValue.charCodeAt(i))) {
                    return true;
                }
            }
            return false;
        },

        _replaceRestrictedCodes: function(name) {
            var self = this;
            var jcrValidName = "";
            for (var i = 0, ln = name.length; i < ln; i++) {
                if (self._isRestricted(name.charCodeAt(i))) {
                    jcrValidName += "-";
                } else {
                    jcrValidName += name[i];
                }
            }
            return jcrValidName;
        },

        _refresh: function() {
            var collectionAPI =
                $(".cq-damadmin-admin-childpages.foundation-collection").adaptTo("foundation-collection");
            if (collectionAPI && ("reload" in collectionAPI)) {
                collectionAPI.reload();
            } else {
                location.reload(true);
            }
        }
    });

    $(document).on("foundation-selections-change", function(e) {
        var localName = e.target.localName;
        var showCreateAction = true;
        if (localName === "coral-masonry" || localName === "table") { // If view is changed to card view
            showCreateAction = $(".foundation-collection-meta").data("foundationCollectionMetaFolder");
        } else { // In cloumn view, create action should only be visible for directory and not for asset
            var item = e.target.activeItem;
            if (item && $(item).data("itemType") === "asset") {
                showCreateAction = false;
            }
        }

        if (showCreateAction) {
            $(".cq-damadmin-admin-createasset").removeClass("granite-collection-create-hidden");
        } else {
            $(".cq-damadmin-admin-createasset").addClass("granite-collection-create-hidden");
            $(".cq-damadmin-assets-empty-content").text("There is no content to display.");
        }

        if ($(".foundation-selections-item").length === 1) {
            // In columns view we have create folder functionality in selection mode as well.
            contentPath = $(".foundation-selections-item").data("foundation-collection-item-id");
            if (contentPath !== undefined && contentPath.charAt(contentPath.length - 1) !== "/") {
                contentPath = contentPath + "/";
            }
            if (document.querySelector(".cq-damadmin-admin-actions-createfolder-at-activator")) {
                var damCreateFolder = new DamCreateFolder().set("createFolder",
                    document.querySelector(".cq-damadmin-admin-actions-createfolder-at-activator"));
                damCreateFolder.initialize();
            }
        }
    });

    function initCreateDamFolder() {
        $.ajax({
            type: "GET",
            async: false,
            url: "/libs/dam/gui/content/foldermetadataschemaeditor/schemalist/jcr:content/views/list/datasource.data.json", // eslint-disable-line max-len
            cache: false,
            dataType: "json",
            success: function(responseJson) {
                folderMetadataSchemas = responseJson;
            }
        });

        // Default content path
        contentPath = $(".cq-damadmin-admin-childpages.foundation-collection").data("foundationCollectionId");
        if (contentPath !== undefined && contentPath.charAt(contentPath.length - 1) !== "/") {
            contentPath = contentPath + "/";
        }
        if (document.querySelector(relDamCreateFolder)) {
            var damCreateFolder = new DamCreateFolder().set("createFolder", document.querySelector(relDamCreateFolder));
            damCreateFolder.initialize();
        }
    }
})(document, Class, Granite.$);

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
(function(document, $) {
    "use strict";
    // download action
    $(document).on("foundation-contentloaded", function(e) {
        var downloadActivator = ".cq-damadmin-admin-actions-download-activator";
        var downloadAssetModal = "#downloadasset";
        var userHome = "a/admin";
        var lightboxCollectionPathPrefix = "path=/content/dam/collections";
        var lightboxCollectionName = "lightbox";
        var lightboxCollectionPath = lightboxCollectionPathPrefix + "/" + userHome + "/" + lightboxCollectionName;
        var toDownloadLightbox = false;
        var downloadErrorModal;
        var downloadModalVisibleTrigger = "assets-download-modal-ready";

        // Check if the download lightbox collection button was clicked
        $(document).on("click.download-lightbox", ".download-lightbox", function(e) {
            toDownloadLightbox = true;
            if ($(".mediacart").attr("user-home") !== "undefined") {
                userHome = $(".mediacart").attr("user-home");
                lightboxCollectionPath = lightboxCollectionPathPrefix + "/" + userHome + "/" + lightboxCollectionName;
            }
        });


        $(document).off("click", downloadActivator).one("click", downloadActivator, function(e) {
            var activator = $(this);
            var paths = "";
            var pathsObject = {};
            var collectionNonLicensedAssets = {};
            // selections
            var items = $(".foundation-selections-item");
            var ui = $(window).adaptTo("foundation-ui");
            var patharr = [];
            if (ui !== undefined) {
                ui.wait();
            }
            if (items.length) {
                if (items.data("foundation-collection-item-id").startsWith("/content/dam/collections/")) {
                    window.sessionStorage.setItem("collection", true);
                }
                items.each(function(i) {
                    var item = $(this);
                    var itemPath = item.data("foundation-collection-item-id");
                    patharr.push(itemPath);
                    // "itemPath" has to be encoded to distinguish the "&" in path vs
                    // it being used for multi-selected assets
                    paths += "path=" + encodeURIComponent(itemPath) + "&";
                    pathsObject[itemPath] = true;
                });

                // remove the last '&'
                paths = paths.substr(0, paths.length - 1);
            } else {
                // quick actions
                var path = activator.data("itempath");
                if (path === undefined) {
                    var pathname = location.pathname;
                    // assetdetails & annotate page
                    if (pathname.indexOf("/assetdetails.html") > -1) {
                        path = decodeURIComponent(pathname.substring(pathname.indexOf("/assetdetails.html") + 18));
                    } else if (pathname.indexOf("/annotate.html") > -1) {
                        path = decodeURIComponent(pathname.substring(pathname.indexOf("/annotate.html") + 14));
                    }
                }
                patharr.push(path);

                // To be consistent with multi-selected assets: encode the path to distinguish two uses of "&"
                path = encodeURIComponent(path);
                paths = "path=" + path;
                pathsObject[path] = true;
            }
            // If lightbox collection is to be downloaded then change the paths accordingly
            if (toDownloadLightbox === true) {
                paths = lightboxCollectionPath;
                toDownloadLightbox = false;
            }

            // keep path in window, so that it can be accessible while starting download
            // note: path is encoded
            window.sessionStorage.damAssetDownloads = paths;
            var downloadUrl = Granite.HTTP.externalize(activator.data("href"));
            var licenseCheckURL = Granite.HTTP.externalize(activator.data("haslicense-href"));
            var license = false;
            var type = $(".foundation-selections-item").data("type");
            var params = {
                "path": patharr,
                "_charset_": "utf-8",
                "type": type
            };

            var licenseSelectionURL = "";
            var licenseSelectionPathArr = [];

            Granite.$.ajax({
                url: licenseCheckURL,
                type: "POST",
                data: params,
                async: false,
                success: function(data) {
                    var licensedAssetpaths = "";
                    for (var p in data) {
                        if (p !== "license") {
                            if (data[p] === true) {
                                licenseSelectionPathArr.push(p);
                                licensedAssetpaths += "path=" + p + "&";
                            } else {
                                collectionNonLicensedAssets[p] = true;
                            }

                            // filter the non licensed assets
                            if (pathsObject[p] === true) {
                                delete pathsObject[p];
                            }
                        }
                    }
                    // process html
                    if (data["license"] === true) {
                        license = true;
                        window.sessionStorage.setItem("licensedAssetPaths", licensedAssetpaths);
                        window.sessionStorage.setItem("nonLicensedAssetPaths",
                            JSON.stringify(collectionNonLicensedAssets));
                        licenseSelectionURL = Granite.HTTP.externalize(activator.data("license-href"));
                    }
                }
            });
            if (license === true) {
                var data = {
                    "path": licenseSelectionPathArr,
                    "ck=": Date.now(),
                    "_charset_": "utf-8"
                };
                post(licenseSelectionURL, data);
                // window.location.href = licenseSelectionURL;
            } else {
                Granite.$.ajax({
                    url: downloadUrl,
                    type: "POST",
                    data: params,
                    async: true,
                    success: function(html) {
                        // Clear the spinner before showing the modal
                        if (ui !== undefined) {
                            ui.clearWait();
                        }

                        // remove the existing download modal (could be from the previous processing)
                        var oldDialogs = $("coral-dialog[id='downloadasset']");
                        if (oldDialogs) {
                            $(oldDialogs).each(function() {
                                var $this = $(this);
                                // hide it(may be due to multiple requests,
                                // we have multiple modals getting shown overlaid) and remove it
                                $this.hide();
                                $this.remove();
                            });
                        }

                        $("body").append(html);
                        // dialog.show() does not work on first startup on firefox
                        // so enclosing it in Coral.commons.ready().
                        var dialog = document.querySelector(downloadAssetModal);
                        Coral.commons.ready(dialog, function() {
                            dialog.show();
                        });

                        // This event is basically an event that will notify that something is injected to the DOM.
                        // It is used by component handler to check if it has to upgrade the markup (userlist ...)
                        // or not.
                        $(downloadAssetModal).trigger("foundation-contentloaded");

                        // trigger event to allow download modal to bind event handlers
                        $(document).trigger(downloadModalVisibleTrigger);
                    },
                    error: function(item) {
                        if (ui !== undefined) {
                            ui.clearWait();
                        }

                        if (!downloadErrorModal) {
                            var $reponseHtml = $(Granite.UI.Foundation.Utils.processHtml(item.responseText));
                            var errorMessage = Granite.I18n.get("Failed to download.");
                            var content = errorMessage + "<br>" + $reponseHtml.filter("h1").text();

                            downloadErrorModal = new Coral.Dialog().set({
                                id: "downloadError",
                                variant: "error",
                                closable: "on",
                                header: {
                                    innerHTML: Granite.I18n.get("Error")
                                },
                                content: {
                                    innerHTML: content
                                },
                                footer: {
                                    innerHTML: '<button is="coral-button" class="closeExport" variant="default" ' +
                                                "coral-close>" + Granite.I18n.get("OK") + "</button>"
                                }
                            });
                        }
                        downloadErrorModal.show();
                    }
                });
            }
        });

        // Post to the provided URL with the specified parameters.
        function post(path, parameters) {
            var form = $("<form></form>");
            form.attr("method", "post");
            form.attr("action", path);
            $.each(parameters, function(key, value) {
                if ($.isArray(value)) {
                    $.each(value, function(keyArray, valueArray) {
                        var field = $("<input></input>");
                        field.attr("type", "hidden");
                        field.attr("name", key);
                        field.attr("value", valueArray);
                        form.append(field);
                    }
                    );
                } else {
                    var field = $("<input></input>");
                    field.attr("type", "hidden");
                    field.attr("name", key);
                    field.attr("value", value);
                    form.append(field);
                }
            });
            // The form needs to be a part of the document in
            // order for us to be able to submit it.
            $(document.body).append(form);

            //clear the spinner
            var ui = $(window).adaptTo("foundation-ui");
            if (ui !== undefined) {
                ui.clearWait();
            }
            form.submit();
        }
    });
})(document, Granite.$);

/*
 ADOBE CONFIDENTIAL

 Copyright 2016 Adobe Systems Incorporated
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
(function(document, $) {
    "use strict";
    // add to collection action
    var addtocollectionWizardURL = "/mnt/overlay/dam/gui/content/collections/addtocollectionwizard.external.html";

    $(document).on("foundation-contentloaded", function(e) {
        var addtocollectionActivator = ".cq-damadmin-admin-actions-add-to-collection-activator";

        $(document).off("click", addtocollectionActivator).one("click", addtocollectionActivator, function(e) {
            var activator = $(this);
            var pathsObject = {};

            // selections
            var items = $(".foundation-selections-item");
            var ui = $(window).adaptTo("foundation-ui");
            var patharr = [];
            if (ui !== undefined) {
                ui.wait();
            }

            if (items.length) {
                items.each(function(i) {
                    var item = $(this);
                    var itemPath = item.data("foundation-collection-item-id");
                    patharr.push(itemPath);
                    pathsObject[itemPath] = true;
                });
            } else {
                // quick actions
                var path = activator.data("itempath");
                if (path === undefined) {
                    var pathname = location.pathname;
                    // assetdetails & annotate page
                    if (pathname.indexOf("/assetdetails.html") > -1) {
                        path = decodeURIComponent(pathname.substring(pathname.indexOf("/assetdetails.html") + 18));
                    } else if (pathname.indexOf("/annotate.html") > -1) {
                        path = decodeURIComponent(pathname.substring(pathname.indexOf("/annotate.html") + 14));
                    }
                }
                pathsObject[path] = true;
                patharr.push(path);
            }

            var url = Granite.HTTP.externalize(addtocollectionWizardURL);
            var data = {
                "item": patharr,
                "_charset_": "utf-8"
            };
            if (url) {
                post(url, data);
            }
        });

        // Post to the provided URL with the specified parameters.
        function post(path, parameters) {
            var form = $("<form></form>");
            form.attr("method", "post");
            form.attr("action", path);
            $.each(parameters, function(key, value) {
                if ($.isArray(value)) {
                    $.each(value, function(keyArray, valueArray) {
                        var field = $("<input></input>");
                        field.attr("type", "hidden");
                        field.attr("name", key);
                        field.attr("value", valueArray);
                        form.append(field);
                    }
                    );
                } else {
                    var field = $("<input></input>");
                    field.attr("type", "hidden");
                    field.attr("name", key);
                    field.attr("value", value);
                    form.append(field);
                }
            });
            // The form needs to be a part of the document in
            // order for us to be able to submit it.
            $(document.body).append(form);
            // clean the spinner
            var ui = $(window).adaptTo("foundation-ui");
            if (ui !== undefined) {
                ui.clearWait();
            }
            form.submit();
        }
    });
})(document, Granite.$);

/*
 ADOBE CONFIDENTIAL

 Copyright 2016 Adobe Systems Incorporated
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
(function(document, $) {
    "use strict";
    // view properties action
    var viewpropertiesWizardURL = "/mnt/overlay/dam/gui/content/assets/metadataeditor.external.html";

    $(document).on("foundation-contentloaded", function(e) {
        var viewPropertiesActivator = ".foundation-damadmin-properties-activator";

        $(document).off("click", viewPropertiesActivator).one("click", viewPropertiesActivator, function(e) {
            var activator = $(this);
            var paths = "";
            var pathsObject = {};
            var postParamLimit =
                this.dataset.foundationCollectionAction
                    ? $.parseJSON(this.dataset.foundationCollectionAction).data.postRequestLimit : 1;
            // selections
            var items = $(".foundation-selections-item");
            var ui = $(window).adaptTo("foundation-ui");
            var patharr = [];
            if (ui !== undefined) {
                ui.wait();
            }

            if (items.length) {
                items.each(function(i) {
                    var item = $(this);
                    var itemPath = item.data("foundation-collection-item-id");
                    patharr.push(itemPath);
                    paths += "item=" + encodeURIComponent(itemPath).replace(/%2F/g, "/") + "&";
                    pathsObject[itemPath] = true;
                });

                // remove the last '&'
                paths = paths.substr(0, paths.length - 1);
            } else {
                // quick actions
                var path = activator.data("itempath");
                if (path === undefined) {
                    var pathname = location.pathname;
                    // assetdetails & annotate page
                    if (pathname.indexOf("/assetdetails.html") > -1) {
                        path = decodeURIComponent(pathname.substring(pathname.indexOf("/assetdetails.html") + 18));
                    } else if (pathname.indexOf("/annotate.html") > -1) {
                        path = decodeURIComponent(pathname.substring(pathname.indexOf("/annotate.html") + 14));
                    }
                }
                paths = "item=" + encodeURIComponent(path).replace(/%2F/g, "/");
                pathsObject[path] = true;
                patharr.push(path);
            }

            var url = Granite.HTTP.externalize(viewpropertiesWizardURL);

            if (url && patharr) {
                if (patharr.length <= postParamLimit) {
                    var getURL = url + "?_charset_=utf-8&";
                    // GET Request
                    getURL += paths;

                    //clear the spinner
                    if (ui !== undefined) {
                        ui.clearWait();
                    }
                    window.referrer = location.href;
                    window.location.href = getURL;
                } else {
                    // POST Request
                    var data = {
                        "item": patharr,
                        "_charset_": "utf-8"
                    };
                    post(url, data);
                }
            }
        });

        // Post to the provided URL with the specified parameters.
        function post(path, parameters) {
            var form = $("<form></form>");
            form.attr("method", "post");
            form.attr("action", path);
            $.each(parameters, function(key, value) {
                if ($.isArray(value)) {
                    $.each(value, function(keyArray, valueArray) {
                        var field = $("<input></input>");
                        field.attr("type", "hidden");
                        field.attr("name", key);
                        field.attr("value", valueArray);
                        form.append(field);
                    }
                    );
                } else {
                    var field = $("<input></input>");
                    field.attr("type", "hidden");
                    field.attr("name", key);
                    field.attr("value", value);
                    form.append(field);
                }
            });
            // The form needs to be a part of the document in
            // order for us to be able to submit it.
            $(document.body).append(form);

            //clear the spinner
            var ui = $(window).adaptTo("foundation-ui");
            if (ui !== undefined) {
                ui.clearWait();
            }
            form.submit();
        }
    });
})(document, Granite.$);

/*
 ADOBE CONFIDENTIAL

 Copyright 2016 Adobe Systems Incorporated
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
(function(document, $) {
    "use strict";
    // Move assets action
    var moveassetsWizardURL = "/mnt/overlay/dam/gui/content/assets/moveassetwizard.external.html";

    $(document).on("foundation-contentloaded", function(e) {
        var moveAssetsActivator = ".cq-damadmin-admin-actions-move-activator";

        $(document).off("click", moveAssetsActivator).one("click", moveAssetsActivator, function(e) {
            var activator = $(this);
            var pathsObject = {};

            var isSelectAllMode = false;
            var unselectedItemsPaths = [];
            var sourceParentPath;
            var actionConfig = activator.data("foundationCollectionAction");
            if (actionConfig && actionConfig.target && actionConfig.activeSelectionCount === "bulk") {
                var collection = document.querySelector(".foundation-collection" + actionConfig.target);
                if (collection && collection.dataset.foundationSelectionsSelectallMode === "true") {
                    isSelectAllMode = true;
                    $(collection).find(".foundation-collection-item:not(.foundation-selections-item)").each(function() {
                        var itemPath = this.dataset.foundationCollectionItemId;
                        if (itemPath) {
                            unselectedItemsPaths.push(itemPath);
                        }
                    });
                    sourceParentPath = collection.dataset.foundationCollectionId;
                }
            }
            // selections
            var items = $(".foundation-selections-item");
            var ui = $(window).adaptTo("foundation-ui");
            var patharr = [];
            if (ui !== undefined) {
                ui.wait();
            }

            if (items.length) {
                items.each(function(i) {
                    var item = $(this);
                    var itemPath = item.data("foundation-collection-item-id");
                    patharr.push(itemPath);
                    pathsObject[itemPath] = true;
                });
            } else {
                // quick actions
                var path = activator.data("itempath");
                if (path === undefined) {
                    var pathname = location.pathname;
                    // assetdetails & annotate page
                    if (pathname.indexOf("/assetdetails.html") > -1) {
                        path = decodeURIComponent(pathname.substring(pathname.indexOf("/assetdetails.html") + 18));
                    } else if (pathname.indexOf("/annotate.html") > -1) {
                        path = decodeURIComponent(pathname.substring(pathname.indexOf("/annotate.html") + 14));
                    }
                }
                pathsObject[path] = true;
                patharr.push(path);
            }

            var url = Granite.HTTP.externalize(moveassetsWizardURL);

            if (url) {
                // POST Request
                var data = {
                    "item": patharr,
                    "_charset_": "utf-8"
                };
                if (isSelectAllMode) {
                    data.exceptPath = unselectedItemsPaths;
                    data.sourceParentPath = sourceParentPath;
                }
                post(url, data);
            }
        });

        // Post to the provided URL with the specified parameters.
        function post(path, parameters) {
            var form = $("<form></form>");
            form.attr("method", "post");
            form.attr("action", path);
            $.each(parameters, function(key, value) {
                if ($.isArray(value)) {
                    $.each(value, function(keyArray, valueArray) {
                        var field = $("<input></input>");
                        field.attr("type", "hidden");
                        field.attr("name", key);
                        field.attr("value", valueArray);
                        form.append(field);
                    }
                    );
                } else {
                    var field = $("<input></input>");
                    field.attr("type", "hidden");
                    field.attr("name", key);
                    field.attr("value", value);
                    form.append(field);
                }
            });
            // The form needs to be a part of the document in
            // order for us to be able to submit it.
            $(document.body).append(form);
            //clear the spinner
            var ui = $(window).adaptTo("foundation-ui");
            if (ui !== undefined) {
                ui.clearWait();
            }
            form.submit();
        }
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
(function(document, $) {
    "use strict";

    $(document).on("foundation-contentloaded", function(e) {
        var deleteActivator = ".cq-damadmin-admin-actions-delete-activator";

        $(document).off("click", deleteActivator).on("click", deleteActivator, function(e) {
            var activator = $(this);
            var type = "asset";
            if (activator.data("type")) {
                type = activator.data("type").split(" ")[0];
            }
            var paths = [];
            var selectedItems = $(".foundation-selections-item");
            selectedItems.each(function() {
                paths.push($(this).get(0).getAttribute("data-foundation-collection-item-id"));
            });
            var bulkDeleteData = getBulkDeleteData(activator.data("foundationCollectionAction"));
            if (bulkDeleteData) {
                showDialog(paths, type, [], bulkDeleteData);
            } else {
                checkReferences(paths, function(references) {
                    showDialog(paths, type, references);
                });
            }
        });
    });

    function getBulkDeleteData(config) {
        var bulkDeleteData;
        var exceptPath = [];
        if (config && config.target && config.activeSelectionCount === "bulk") {
            var $collection = $(config.target);
            if ($collection.length && $collection[0].dataset.foundationSelectionsSelectallMode === "true") {
                var paginationAPI = $collection.adaptTo("foundation-collection").getPagination();
                if (paginationAPI && paginationAPI.hasNext) {
                    $collection.find(".foundation-collection-item:not(.foundation-selections-item)").each(function() {
                        var itemPath = this.dataset.foundationCollectionItemId;
                        if (itemPath) {
                            exceptPath.push(itemPath);
                        }
                    });
                    bulkDeleteData = {
                        sourceParentPath: $collection[0].dataset.foundationCollectionId,
                        exceptPath: exceptPath
                    };
                }
            }
        }
        return bulkDeleteData;
    }

    function showDialog(paths, type, references, bulkDeleteData) {
        var force;
        var headerText = Granite.I18n.get("Delete Asset");
        if (type === "collection") {
            headerText = Granite.I18n.get("Delete Collection");
        }
        $("coral-dialog[id='deleteAssetDialog']").each(function() {
            var $this = $(this);
            // hide it(may be due to multiple requests, we have multiple modals getting shown overlaid) and remove it
            $this.hide();
            $this.remove();
        });
        var dialog = new Coral.Dialog().set({
            id: "deleteAssetDialog",
            header: {
                innerHTML: headerText
            }
        });
        document.body.appendChild(dialog);
        var footer = dialog.footer;
        var selectedItems = $(".foundation-selections-item");

        var isAsyncDelete = isAsync(selectedItems);
        if ((type !== "collection") && isAsyncDelete) {
            var cb = document.createElement("coral-checkbox");
            $(cb).attr("id", "forceDeleteCb");
            cb.label.innerHTML = Granite.I18n.get("Force delete if references, activated assets etc.");
            footer.appendChild(cb);
            $(cb).change(function() {
                force = document.querySelector("#forceDeleteCb").checked;
            });
        }
        var cancel = new Coral.Button();
        cancel.label.textContent = Granite.I18n.get("Cancel");
        footer.appendChild(cancel).on("click", function() {
            dialog.hide();
        });
        var deleteButton = new Coral.Button();
        deleteButton.label.textContent = Granite.I18n.get("Delete");
        deleteButton.variant = "warning";
        footer.appendChild(deleteButton).on("click", function() {
            deleteResources(paths, force, type, references, isAsyncDelete, bulkDeleteData);
            dialog.hide();
        });
        deleteButton.setAttribute("trackingfeature", "aem:assets:asset:delete");

        var dialogContent = dialog.content;
        dialogContent.innerHTML = "";
        if (selectedItems.length === 1) {
            dialogContent.appendChild(function() {
                var para = document.createElement("p");
                if (type === "collection") {
                    para.innerHTML = Granite.I18n.get("You are going to delete the following collection:");
                } else {
                    para.innerHTML = Granite.I18n.get("You are going to delete the following asset:");
                }
                return para;
            }());
        } else if (selectedItems.length > 1) {
            dialogContent.appendChild(function() {
                var para = document.createElement("p");
                if (type === "collection") {
                    para.innerHTML = Granite.I18n.get("You are going to delete the following {0} collections:",
                        selectedItems.length);
                } else {
                    if (bulkDeleteData) {
                        para.innerHTML = Granite.I18n.get("You are going to delete all assets from the current " +
                            "location {0}.", bulkDeleteData.sourceParentPath);
                    } else {
                        para.innerHTML = Granite.I18n.get("You are going to delete the following {0} assets:",
                            selectedItems.length);
                    }
                }
                return para;
            }());
        }

        dialogContent.appendChild(function() {
            var para = document.createElement("p");
            $.each(selectedItems, function(i, item) {
                var title = $(item).find(".foundation-collection-assets-meta").data("foundation-collection-meta-title");
                if (!title) {
                    title = $(item).data("foundation-collection-item-id");
                    if (title !== undefined) {
                        title = title.substring(title.lastIndexOf("/") + 1);
                    }
                }
                para.appendChild(document.createTextNode(title));
                para.appendChild(document.createElement("br"));
            });
            para.appendChild(document.createElement("br"));
            return para;
        }());

        dialog.show();
    }

    function checkReferences(paths, callback) {
        var data = {};
        var url = Granite.HTTP.externalize("/libs/wcm/core/content/reference.json");
        data["path"] = paths;

        var spinner = $(window).adaptTo("foundation-ui");
        spinner.wait();

        $.ajax(url, {
            "data": data,
            "cache": false,
            "dataType": "json",
            "method": "POST",
            "beforeSend": function() {
                $(".coral-Popover").popover("hide");
            },
            "complete": [ clearWait, referencesRetrieved ]
        });

        function clearWait() {
            $(window).adaptTo("foundation-ui").clearWait();
        }

        function referencesRetrieved(xhr, status) {
            var ui = $(window).adaptTo("foundation-ui");
            ui.clearWait();

            if (status === "success") {
                var json = $.parseJSON(xhr.responseText);
                if (json.assets) {
                    callback(json.assets);
                    return;
                }
            }
            callback([]);
        }
    }

    function deleteResources(paths, force, type, references, isAsyncDelete, bulkDeleteData) {
        var hiddenPaths = [];

        if (references) {
            $.each(references, function(key, value) {
                // These folders contain hidden files that
                // are created when interactive image and
                // video assets are modified.
                if (value.path.startsWith("/content/dam/_VTT")) {
                    hiddenPaths.push(value.path);
                }
            });
        }

        deleteList(paths, hiddenPaths, force, type, references, isAsyncDelete, bulkDeleteData);
    }

    function deleteList(paths, hiddenPaths, force, type, references, isAsyncDelete, bulkDeleteData) {
        var url;
        var data = {};

        var collection;
        var pageId = "";
        if (type === "collection") {
            collection = document.querySelector(".cq-damadmin-admin-childcollections");
            if (!collection) {
                collection = document.querySelector("#granite-omnisearch-result");
            }
            pageId = collection.getAttribute("data-foundation-collection-id");
            url = Granite.HTTP.externalize(paths[0] + ".collection.html");
            data = {
                ":operation": "deleteCollection",
                "path": paths,
                "force": force === undefined ? false : force,
                "_charset_": "utf-8"
            };
        } else {
            collection = document.querySelector(".cq-damadmin-admin-childpages");
            if (!collection) {
                collection = document.querySelector("#granite-omnisearch-result");
            }
            pageId = collection.getAttribute("data-foundation-collection-id");
            url = "/bin/wcmcommand";
            data = {
                force: force === undefined ? false : force,
                "_charset_": "utf-8"
            };
            if (bulkDeleteData) {
                url = bulkDeleteData.sourceParentPath + ".bulkassets.delete";
                Object.assign(data, bulkDeleteData);
            } else {
                Object.assign(data, {
                    cmd: "deletePage",
                    path: isAsyncDelete ? paths.concat(hiddenPaths) : paths
                });
            }
            if (isAsyncDelete) {
                url = "/bin/asynccommand";
                data["operation"] = "DELETE";
                if (paths.length === 1) {
                    data.description = "Deleting " + paths[0] + " from " + pageId;
                }

                if (paths.length > 1) {
                    data.description = "Deleting " + paths.length + " items from " + pageId;
                }
            }
        }
        // hack for omnisearch. can't figure a better way right now
        var omnisearchResult = document.querySelector("#granite-omnisearch-result");
        if (omnisearchResult) {
            collection = omnisearchResult;
        }
        var ui = $(window).adaptTo("foundation-ui");
        if (!isAsyncDelete) {
            ui.wait();
        }

        $.ajax({
            url: url,
            type: "post",
            data: data,
            success: function() {
                if (isAsyncDelete) {
                    var successMessage = Granite.I18n.get("Your deletion task has been initiated. You will be notified on successful completion.");// eslint-disable-line max-len
                    ui.prompt(Granite.I18n.get("Success"), successMessage, "success", [{
                        text: Granite.I18n.get("OK"),
                        primary: true
                    }]);
                }
                postDeleteCleanup(hiddenPaths, collection, pageId);
            },
            statusCode: {
                412: function() {
                    ui.clearWait();
                    var isDirectory = true;
                    var content;
                    if (paths.length === 1) {
                        var dataType =
                            $(collection.selectedItem).find(".foundation-collection-assets-meta")
                                .data("foundation-collection-meta-type");
                        if (dataType === "asset") {
                            isDirectory = false;
                        }
                    }
                    if (paths.length === 1 && !isDirectory) {
                        var request = new XMLHttpRequest();
                        // eslint-disable-next-line max-len
                        request.open("GET", Granite.HTTP.externalize("/bin/wcm/references.json?path=" + paths[0] + "&_charset_=utf-8&predicate=wcmcontent"), false);
                        request.send(null);
                        var jsonData = JSON.parse(request.responseText);
                        var times = jsonData["pages"].length;
                        if (times === 1) {
                            content = Granite.I18n.get("This item is referenced once and might be activated.");
                        } else if (times > 1) {
                            content = Granite.I18n.get("This item is referenced {0} times and might be activated.",
                                times);
                        } else {
                            content = Granite.I18n.get("This item is activated.");
                        }
                    } else {
                        content = Granite.I18n.get("One or more item(s) are referenced and/or activated.");
                    }

                    var forceDelDialog = new Coral.Dialog().set(({
                        id: "forceDelDialog",
                        variant: "error",
                        header: {
                            innerHTML: Granite.I18n.get("Force Delete")
                        },
                        content: {
                            innerHTML: content
                        },
                        footer: {
                            innerHTML: '<button is="coral-button" coral-close size="M">' +
                                        Granite.I18n.get("Cancel") + "</button>"
                        }
                    }));
                    var footer = forceDelDialog.footer;

                    var forceDeleteButton = new Coral.Button().set({
                        label: {
                            innerHTML: Granite.I18n.get("Delete")
                        },
                        variant: "warning"
                    });
                    footer.appendChild(forceDeleteButton).on("click", function() {
                        deleteResources(paths, true, type, references, isAsyncDelete, bulkDeleteData);
                        forceDelDialog.hide();
                    });

                    forceDelDialog.show();
                }
            },
            error: function(response) {
                ui.clearWait();
                if (response.status === 412) {
                    // Ignore. Already Handled
                    return;
                }
                new Coral.Dialog().set({
                    id: "delErrorDialog",
                    variant: "error",
                    header: {
                        innerHTML: Granite.I18n.get("Error")
                    },
                    content: {
                        innerHTML: "<p>" + Granite.I18n.get("Failed to delete.") + "</p>"
                    },
                    footer: {
                        innerHTML: '<button is="coral-button" variant="primary" ' +
                                    'coral-close size="M">' + Granite.I18n.get("Ok") + "</button>"
                    }
                }).show();
            }
        });
    }

    /**
     * Force removal of hidden assets.
     *
     * @param hiddenPaths
     */
    function postDeleteCleanup(hiddenPaths, collection, pageId) {
        var ui = $(window).adaptTo("foundation-ui");
        if (hiddenPaths.length && hiddenPaths.length > 0) {
            // Force delete hidden paths before returning to user.
            var url = "/bin/wcmcommand";
            var data = {
                cmd: "deletePage",
                path: hiddenPaths,
                force: true
            };
            $.ajax(url, { "data": data,
                type: "post",
                "_charset_": "utf-8",
                complete: function() {
                    ui.clearWait();
                    $(collection).adaptTo("foundation-collection").load(pageId);
                } });
        } else {
            ui.clearWait();
            $(collection).adaptTo("foundation-collection").load(pageId);
        }
    }

    /**
     * Method to check if current delete operation should be processed async
     * @param selectedItems items to delete
     * @param folderDelete is any of the items to delete a folder
     * @returns {boolean} {@code true} if operation should be async, {@code false} otherwise
     */
    function isAsync(selectedItems) {
        var isAsyncDel = false;
        $.ajax({
            async: false,
            url: Granite.HTTP.externalize("/bin/asynccommand"),
            type: "GET",
            data: {
                "assetCount": selectedItems.length,
                "operation": "DELETE",
                "optype": "CHKASYN"
            },
            success: function(resp) {
                var jsonRes = $.parseJSON(resp);
                isAsyncDel = jsonRes.isasync;
            }
        });
        return isAsyncDel;
    }
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
(function(document, $) {
    "use strict";

    var removeFromCollection;
    var rel = ".cq-damadmin-admin-actions-removefromcollection";

    var RemoveFromCollection = new Class({

        actionBarItem: null,
        dialog: null,

        initialize: function() {
            var self = this;
            self.actionBarItem = document.querySelector(rel);

            if (!self.actionBarItem) {
                return;
            }

            Coral.commons.ready(self.actionBarItem, function() {
                self._createDialog();
                self.actionBarItem.on("click", function(event) {
                    self.dialog.show();
                });
            });
        },

        _createDialog: function() {
            var self = this;

            if (!self.dialog) {
                var headerText = "Remove From Collection";

                self.dialog = new Coral.Dialog().set({
                    header: {
                        innerHTML: Granite.I18n.get(headerText)
                    }
                });
            }

            var footer = self.dialog.footer;

            var cancelButton = new Coral.Button().set({
                variant: "default"
            });
            cancelButton.label.textContent = Granite.I18n.get("Cancel");
            footer.appendChild(cancelButton);
            cancelButton.on("click", function() {
                self.dialog.hide();
            });

            var removeButton = new Coral.Button().set({
                variant: "primary"
            });
            removeButton.label.textContent = Granite.I18n.get("Remove");
            footer.appendChild(removeButton);
            removeButton.on("click", function() {
                self.removeFromColletion();
                self.dialog.hide();
            });

            $(document).on("foundation-selections-change", function(event) {
                var selectedItems = event.target.selectedItems;
                var dialogContent = self.dialog.content;
                dialogContent.innerHTML = "";
                // If selection count is 0 hide the dialog otherwise it
                // will show empty dialog (CQ-4259831)
                if (selectedItems.length === 0) {
                    self.dialog.hide();
                    return;
                }
                // remove from collection action should not be diaplyed for smart collection.
                $(rel + ".foundation-collection-action").each(function() {
                    var action = $(this);
                    var collectionType = $("#dam-collection-type").data("type");
                    if (collectionType && collectionType === "SMART") {
                        action.hide();
                    } else {
                        action.css("display", "block");
                    }
                });

                if (selectedItems.length === 1) {
                    dialogContent.appendChild(function() {
                        var para = document.createElement("p");
                        para.innerHTML =
                            Granite.I18n.get("You are going to remove the following item from the collection:");
                        return para;
                    }());
                } else if (selectedItems.length > 1) {
                    dialogContent.appendChild(function() {
                        var para = document.createElement("p");
                        para.innerHTML =
                            Granite.I18n.get("You are going to remove the following {0} items from the collection:",
                                selectedItems.length);
                        return para;
                    }());
                }

                dialogContent.appendChild(function() {
                    var para = document.createElement("p");
                    selectedItems.forEach(function(item) {
                        para.appendChild(document.createTextNode($(item).find(".foundation-collection-assets-meta")
                            .data("foundation-collection-meta-title")));
                        para.appendChild(document.createElement("br"));
                    });
                    para.appendChild(document.createElement("br"));
                    return para;
                }());
            });
        },

        removeFromColletion: function() {
            var paths = [];
            var collection = document.querySelector(".cq-damadmin-admin-childcollections");
            collection.selectedItems.forEach(function(item) {
                paths.push(item.getAttribute("data-foundation-collection-item-id"));
            });
            var resourcePath = $(".foundation-content-path").data("foundation-content-path");
            var url = Granite.HTTP.externalize(resourcePath + ".collection.html");

            var data = {
                ":operation": "remove",
                "path": paths,
                "_charset_": "utf-8"
            };

            $.ajax({
                url: url,
                type: "post",
                data: data,
                success: function() {
                    var contentApi = $(".foundation-content").adaptTo("foundation-content");
                    if (contentApi) {
                        contentApi.refresh();
                    } else {
                        location.reload(true);
                    }
                },
                error: function(response) {
                    new Coral.Dialog().set({
                        variant: "error",
                        header: {
                            innerHTML: Granite.I18n.get("Error")
                        },
                        content: {
                            innerHTML: "<p>" + Granite.I18n.get("Failed to remove.") + "</p>"
                        },
                        footer: {
                            innerHTML: '<button is="coral-button" variant="primary" ' +
                                        'coral-close size="M">' + Granite.I18n.get("Ok") + "</button>"
                        }
                    }).show();
                }
            });
        }

    });

    $(document).on("foundation-contentloaded", function(e) {
        if (!removeFromCollection) {
            removeFromCollection = new RemoveFromCollection();
            removeFromCollection.initialize();
        }
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
(function(document, $) {
    "use strict";
    // download action
    $(document).on("foundation-contentloaded", function(e) {
        var rel = ".cq-damadmin-admin-actions-macshare-activator";
        var macConfirmation = "#mac-share-confirmation";
        var macUnshareConfirmation = "#mac-unshare-confirmation";
        var macShareError = "#mac-share-error";
        var macShareSuccess = "#mac-share-success";
        var macUnshareError = "#mac-unshare-error";
        var macUnshareSuccess = "#mac-unshare-success";
        var macParentShared = "#mac-share-notice";
        var macCCShared = "#mac-ccshare-notice";
        var loadedKey = "dam.gui.actions.cloudshare.data.internal.loaded";

        $(document).on("click", rel, function(e) {
            var activator = $(this);

            // lazy load content
            _initialize(activator.get(0));

            // selections
            var items = $(".foundation-selections-item");
            /* var ui = $(window).adaptTo("foundation-ui");
            if (ui != undefined) {
                ui.wait();
            } */
            if (items.length === 1) {
                var metaAttrs = $(".foundation-collection-assets-meta[data-foundation-collection-meta-path=\"" +
                    $(items[0]).data("foundation-collection-item-id") + "\"]");
                var isMacShared = $(metaAttrs).data("isMacShared");
                var isRootMacShared = $(metaAttrs).data("isRootMacShared");
                var isCCShared = $(metaAttrs).data("isCcShared");
            }

            if (isCCShared) {
                document.querySelector(macCCShared).show();
            } else if (isMacShared) {
                document.querySelector(macUnshareConfirmation).show();
            } else if (isRootMacShared) {
                document.querySelector(macParentShared).show();
            } else {
                // share
                document.querySelector(macConfirmation).show();
            }
        });

        function _initialize(activator) {
            var $document = $(document);
            var src;

            if ($document.data(loadedKey)) {
                return;
            }

            $document.data(loadedKey, true);

            if (activator.dataset.foundationCollectionAction &&
                $.parseJSON(activator.dataset.foundationCollectionAction).data &&
                $.parseJSON(activator.dataset.foundationCollectionAction).data.src) {
                src = $.parseJSON(activator.dataset.foundationCollectionAction).data.src;
            } else {
                // activator is not configured for lazy loading.. returing
                return;
            }

            $.ajax({
                url: src,
                async: false,
                cache: false
            }).done(function(html) {
                var parser = $(window).adaptTo("foundation-util-htmlparser");

                parser.parse(html).then(function(fragment) {
                    document.body.appendChild(fragment);
                });
            })
                .fail(function() {
                    var title = Granite.I18n.get("Error");
                    var message = Granite.I18n.get("Something went wrong.");

                    var ui = $(window).adaptTo("foundation-ui");
                    ui.alert(title, message, "error");
                });
        }

        $(document).on("click." + rel, ".mac-share-confirm", function(e) {
            document.querySelector(macConfirmation).hide();
            var items = $(".cq-damadmin-admin-childpages.foundation-collection").find(".foundation-selections-item");
            shareWithMAC($(items[0]).data("foundation-collection-item-id"));
        });

        $(document).on("click." + rel, ".mac-unshare-confirm", function(e) {
            document.querySelector(macUnshareConfirmation).hide();
            var items = $(".cq-damadmin-admin-childpages.foundation-collection").find(".foundation-selections-item");
            unshareWithMAC($(items[0]).data("foundation-collection-item-id"));
        });

        $(document).on("click." + rel, ".mac-share-success", function(e) {
            document.querySelector(macShareSuccess).hide();
            // refresh foundation-content
            $(".cq-damadmin-admin-childpages.foundation-collection").adaptTo("foundation-collection").reload();
        });

        $(document).on("click." + rel, ".mac-unshare-success", function(e) {
            document.querySelector(macUnshareSuccess).hide();
            // refresh foundation-content
            $(".cq-damadmin-admin-childpages.foundation-collection").adaptTo("foundation-collection").reload();
        });

        // todo : verify if it works!
        $(document).on("beforeshow", macParentShared, function(e) {
            // change the description
            var items = $(".cq-damadmin-admin-childpages.foundation-collection").find(".foundation-selections-item");
            var sharedRoot = $(items[0]).data("sharedRoot");
            var $modal = $(this);
            var $body = $modal.find(".coral-Modal-body");
            var strongtitle = "<br><span class=\"strong\">" + sharedRoot + "</span>";
            $body.html(Granite.I18n.get("Following parent folder already shared with Marketing Cloud: {0}",
                [ strongtitle ]));
        });

        function shareWithMAC(folderPath) {
            if (folderPath) {
                var url = Granite.HTTP.externalize(folderPath);
                var settings = {
                    "type": "POST",
                    "data": {
                        "_charset_": "utf-8",
                        ":operation": "dam.mac.sync"
                    },
                    "beforeSend": function() {
                        var spinner = $(window).adaptTo("foundation-ui");
                        spinner.wait();
                    },
                    "complete": [
                        function() {
                            $(window).adaptTo("foundation-ui").clearWait();
                        }
                    ]
                };
                $.ajax(url, settings).done(function(data, textStatus, jqXHR) {
                    document.querySelector(macShareSuccess).show();
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    // show the error
                    document.querySelector(macShareError).show();
                });
            }
        }

        function unshareWithMAC(folderPath) {
            if (folderPath) {
                var url = Granite.HTTP.externalize(folderPath);
                var settings = {
                    "type": "POST",
                    "data": {
                        "_charset_": "utf-8",
                        ":operation": "dam.mac.sync",
                        "disable": "true"
                    },
                    "beforeSend": function() {
                        var spinner = $(window).adaptTo("foundation-ui");
                        spinner.wait();
                    },
                    "complete": [
                        function() {
                            $(window).adaptTo("foundation-ui").clearWait();
                        }
                    ]
                };
                $.ajax(url, settings).done(function(data, textStatus, jqXHR) {
                    document.querySelector(macUnshareSuccess).show();
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    // show the error
                    document.querySelector(macUnshareError).show();
                });
            }
        }
    });
})(document, Granite.$);

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
(function(document, $) {
    "use strict";

    // For Dynamic media create dropdown

    $(document).on("foundation-contentloaded", function(e) {
        $(".dm-create-set").on("click", rerouteEditor);
    });

    function rerouteEditor(e) {
        e.preventDefault();
        var href = $(this).attr("href");
        var hrefPart = href.split("?"); // parse the parameters
        var editorURL = hrefPart[0].substring(0, hrefPart[0].indexOf(".html") + 5); // get editor path
        // get real asset part
        var folderPath = $(".cq-damadmin-admin-childpages.foundation-collection").data("foundationCollectionId");
        editorURL += encodeURIComponent(folderPath).replace(/%2F/g, "/");
        if (hrefPart.length > 1) {
            editorURL += "?" + hrefPart[1];
        }
        window.location.href = editorURL;
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
(function(document, $) {
    "use strict";
    var rel = ".cq-damadmin-admin-actions-mpshare-activator";
    var unShareRel = ".cq-damadmin-admin-actions-mpunshare-activator";
    var mpConfirmation = "#mp-share-confirmation";
    var mpUnshareConfirmation = "#mp-unshare-confirmation";
    var mpShareError = "#mp-share-error";
    var mpShareSuccess = "#mp-share-success";
    var mpUnshareError = "#mp-unshare-error";
    var mpUnshareSuccess = "#mp-unshare-success";
    var mpParentShared = "#mp-share-notice";
    var loadedKey = "dam.gui.actions.mppublish.data.internal.loaded";

    $(document).on("click", rel, function(e) {
        var activator = $(this);

        // lazy load content
        _initialize(activator.get(0));

        var ismpShared = false;
        var isRootmpShared = false;
        if (ismpShared) {
            document.querySelector(mpUnshareConfirmation).show();
        } else if (isRootmpShared) {
            document.querySelector(mpParentShared).show();
        } else {
            // share
            document.querySelector(mpConfirmation).show();
        }
    });

    $(document).on("click", unShareRel, function(e) {
        var activator = $(this);

        // lazy load content
        _initialize(activator.get(0));

        var ismpShared = false;
        var isRootmpShared = false;
        if (ismpShared) {
            document.querySelector(mpUnshareConfirmation).show();
        } else if (isRootmpShared) {
            document.querySelector(mpParentShared).show();
        } else {
            // share
            document.querySelector(mpUnshareConfirmation).show();
        }
    });

    function _initialize(activator) {
        var $document = $(document);
        var src;

        if ($document.data(loadedKey)) {
            return;
        }

        $document.data(loadedKey, true);

        if (activator.dataset.foundationCollectionAction &&
                $.parseJSON(activator.dataset.foundationCollectionAction).data &&
                $.parseJSON(activator.dataset.foundationCollectionAction).data.src) {
            src = $.parseJSON(activator.dataset.foundationCollectionAction).data.src;
        } else {
            // activator is not configured for lazy loading.. returing
            return;
        }

        $.ajax({
            url: src,
            async: false,
            cache: false
        }).done(function(html) {
            var parser = $(window).adaptTo("foundation-util-htmlparser");

            parser.parse(html).then(function(fragment) {
                document.body.appendChild(fragment);
            });
        })
            .fail(function() {
                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.get("Something went wrong.");

                var ui = $(window).adaptTo("foundation-ui");
                ui.alert(title, message, "error");
            });
    }


    function shareWithmp(paths) {
        if (paths.length > 0) {
            var url = Granite.HTTP.externalize(paths[0]);
            var settings = {
                "type": "POST",
                "data": {
                    "_charset_": "utf-8",
                    ":operation": "dam.mac.sync",
                    "type": "mediaportal",
                    "path": paths
                },
                "beforeSend": function() {
                    var spinner = $(window).adaptTo("foundation-ui");
                    spinner.wait();
                },
                "complete": [
                    function() {
                        $(window).adaptTo("foundation-ui").clearWait();
                    }
                ]
            };
            $.ajax(url, settings).done(function(data, textStatus, jqXHR) {
                document.querySelector(mpShareSuccess).show();
            }).fail(function(jqXHR, textStatus, errorThrown) {
                // show the error
                document.querySelector(mpShareError).show();
            });
        }
    }

    function unshareWithmp(paths) {
        if (paths.length > 0) {
            var url = Granite.HTTP.externalize(paths[0]);
            var settings = {
                "type": "POST",
                "data": {
                    "_charset_": "utf-8",
                    ":operation": "dam.mac.sync",
                    "type": "mediaportal",
                    "path": paths,
                    "disable": "true"
                },
                "beforeSend": function() {
                    var spinner = $(window).adaptTo("foundation-ui");
                    spinner.wait();
                },
                "complete": [
                    function() {
                        $(window).adaptTo("foundation-ui").clearWait();
                    }
                ]
            };
            $.ajax(url, settings).done(function(data, textStatus, jqXHR) {
                document.querySelector(mpUnshareSuccess).show();
            }).fail(function(jqXHR, textStatus, errorThrown) {
                // show the error
                document.querySelector(mpUnshareError).show();
            });
        }
    }

    $(document).on("beforeshow", mpParentShared, function(e) {
        // change the description
        var items =
            $(".cq-damadmin-admin-childcollections.foundation-collection, " +
                ".cq-damadmin-admin-childpages.foundation-collection").find(".foundation-selections-item");
        var sharedRoot = $(items[0]).data("sharedRoot");
        var $modal = $(this);
        var $body = $modal.find(".coral-Modal-body");
        var strongtitle = "<br><span class=\"strong\">" + sharedRoot + "</span>";
        $body.html(Granite.I18n.get("Following parent folder already shared with Brand Portal: {0}", [ strongtitle ]));
    });

    $(document).on("click." + rel, ".mp-share-confirm", function(e) {
        document.querySelector(mpConfirmation).hide();
        var paths = [];
        var items =
            $(".cq-damadmin-admin-childcollections.foundation-collection, " +
                ".cq-damadmin-admin-childpages.foundation-collection").find(".foundation-selections-item");

        if (items.length === 0) {
            var pathname = location.pathname;

            // assetdetails page
            if (pathname.indexOf("/assetdetails.html") > -1) {
                paths.push($(".foundation-content")
                    .find(".foundation-content-path")
                    .data("foundation-content-path"));
            }
        } else {
            items.each(function(index, value) {
                paths.push($(value).data("foundation-collection-item-id"));
            });
        }
        shareWithmp(paths);
    });

    $(document).on("click." + rel, ".mp-unshare-confirm", function(e) {
        document.querySelector(mpUnshareConfirmation).hide();
        var paths = [];
        var items =
            $(".cq-damadmin-admin-childcollections.foundation-collection, " +
                ".cq-damadmin-admin-childpages.foundation-collection").find(".foundation-selections-item");

        if (items.length === 0) {
            var pathname = location.pathname;

            // assetdetails page
            if (pathname.indexOf("/assetdetails.html") > -1) {
                paths.push($(".foundation-content")
                    .find(".foundation-content-path")
                    .data("foundation-content-path"));
            }
        } else {
            items.each(function(index, value) {
                paths.push($(value).data("foundation-collection-item-id"));
            });
        }
        unshareWithmp(paths);
    });

    $(document).on("click." + rel, ".mp-share-success", function(e) {
        document.querySelector(mpShareSuccess).hide();

        var foundationCollection =
            $(".cq-damadmin-admin-childcollections.foundation-collection, " +
                ".cq-damadmin-admin-childpages.foundation-collection");

        if (foundationCollection.length !== 0) {
            // refresh foundation-collection
            $(".cq-damadmin-admin-childcollections.foundation-collection, " +
                ".cq-damadmin-admin-childpages.foundation-collection").adaptTo("foundation-collection").reload();
        }
    });

    $(document).on("click." + rel, ".mp-unshare-success", function(e) {
        document.querySelector(mpUnshareSuccess).hide();

        var foundationCollection =
            $(".cq-damadmin-admin-childcollections.foundation-collection, " +
                ".cq-damadmin-admin-childpages.foundation-collection");

        if (foundationCollection.length !== 0) {
            // refresh foundation-collection
            $(".cq-damadmin-admin-childcollections.foundation-collection, " +
                ".cq-damadmin-admin-childpages.foundation-collection").adaptTo("foundation-collection").reload();
        }
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
(function(document, $) {
    "use strict";
    // print action - collect comment selection from timeline

    $(document).on("coral-overlay:open", "#dam-asset-print-dialog", function(event) {
        var $dialog = $("#dam-asset-print-dialog");
        var $form = $("#dam-asset-print-form");
        var $submitBtn = $("#dam-asset-print-form-submit");
        var $closeBtn = $("#dam-asset-print-form-close");
        var inputClass = "dam-asset-print-comment-selection";
        var $timeline = $(".cq-common-admin-timeline");
        var selectionState = {};

        if ($timeline.length && $timeline.data("printSelectionState")) {
            selectionState = $timeline.data("printSelectionState");
        }

        $form.find("." + inputClass).remove();

        for (var key in selectionState) {
            if (selectionState.hasOwnProperty(key)) {
                if (selectionState[key] === true) {
                    var inputName = "";
                    var inputValue = "";
                    if (key === "printAll" || key === "printApproval") {
                        inputName = key;
                        inputValue = selectionState[key];
                    } else {
                        inputName = "printAnnotation";
                        inputValue = key;
                    }

                    $("<input></input>")
                        .addClass(inputClass)
                        .attr("type", "hidden")
                        .attr("name", inputName)
                        .attr("value", inputValue)
                        .appendTo($form);
                }
            }
        }

        // prevent form submit and generate pdf url
        $submitBtn.off("click").on("click", function(e) {
            e.preventDefault();
            handleDirtyDocumentBody();
            $dialog[0].hide();
            var url = $form.attr("action") || "";
            var data = $form.serialize();
            var pdfURl = url.concat("?", data);
            window.open(pdfURl);
        });

        $closeBtn.on("click", function(e) {
            handleDirtyDocumentBody();
        });
    });

    // on foundation-field-change of a foundation-form (here the print form),
    // the document is marked as dirty so that it needs to be saved first before closing.
    // Unmark the body, so that the asset details page can be closed.
    function handleDirtyDocumentBody() {
        if ($(document.body) !== undefined && $(document.body).data("foundation-is-dirty")) {
            $(document.body).data("foundation-is-dirty", false);
        }
    }
})(document, Granite.$);

/*
 ADOBE CONFIDENTIAL

 Copyright 2017 Adobe Systems Incorporated
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
(function(document, Dam, $) {
    "use strict";

    $(document).on("foundation-contentloaded", function(e) {
        var annotateActivator = ".aem-assets-admin-actions-annotate-activator";
        var closeActivator = "#shell-propertiespage-closeactivator";

        function checkIfMultiPageAnnotation() {
            var loc = window.location.href;
            var multiPageAnnotateSelector = "/annotate.html/(.)*/subassets/";

            return loc.match(multiPageAnnotateSelector);
        }

        $(document).off("click", annotateActivator).on("click", annotateActivator, function(e) {
            var $actionItem = $(this);
            var data = $actionItem.data("foundationCollectionAction").data;
            var url = data.href;

            var selection = Dam.Util.getSelection();
            var path = Dam.Util.getSelectionSinglePath(selection);
            // check for remote asset path for DMS7 integration where the real asset doesn't exist in JCR
            var remotePath = Dam.Util.getSelectionAttrAt(selection, 0, "data-remotepath");
            if (remotePath) {
                // override asset path to be used for editor with remote path
                path = remotePath;
            }
            url += encodeURIComponent(path).replace(/%2F/g, "/");
            url = Granite.HTTP.externalize(url);

            // set referrer as the current page
            window.referrer = location.href;

            // ContentAPI.go doesn't work here as we need to refresh the breadcrumb too.
            window.location.href = url;
        });

        $(document).on("click", closeActivator, function() {
            if (checkIfMultiPageAnnotation()) {
                event.preventDefault();
                window.location.href =
                    Granite.HTTP.externalize(window.location.pathname.replace("/assets/annotate.html/",
                        "/assetdetails.html/"));
            }
        });
    });
})(document, Dam, Granite.$);

/*
 ADOBE CONFIDENTIAL

 Copyright 2017 Adobe Systems Incorporated
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
(function(document, jQuery, $) {
    "use strict";

    $(document).on("foundation-contentloaded", function(e) {
        var dirs = $("tr.foundation-collection-item[data-item-type='directory']");
        if (dirs.length > 0) {
            dirs.droppable({
                tolerance: "intersect",
                over: function(event, ui) {
                    // Highlight row of the target directory..
                    $(this).addClass("is-dragover");
                },
                drop: function(event, ui) {
                    var destFolder = $(this).data("foundation-collection-item-id");
                    createConfirmationDialog(destFolder);
                    $(this).removeClass("is-dragover");
                },
                out: function(event, ui) {
                    // Remove highlight from the directory..
                    $(this).removeClass("is-dragover");
                }
            });
        }
    });

    function moveAssets(destFolder) {
        var items = [];
        var selectedItems = $(".foundation-selections-item");
        selectedItems.each(function() {
            items.push($(this).data("foundationCollectionItemId"));
        });
        var data = {
            cmd: "movePage",
            integrity: "true",
            _charset_: "utf-8",
            ":status": "browser",
            destParentPath: destFolder
        };
        var from = [];
        data["retrieveAll"] = true;// adjust references on the server..
        for (var i = 0; i < items.length; i++) {
            from[i] = items[i];
        }
        data.srcPath = from;
        jQuery.post(Granite.HTTP.externalize("/bin/wcmcommand"), data, function(responseText, status, r) {
            var statusCode = parseInt($(responseText).find("#Status").html(), 10);
            if (statusCode === 200) {
                handleResponse(true);
            } else {
                handleResponse(false);
            }
        });
    }

    function handleResponse(success) {
        var respMsg = "";
        var dialogHeader = "";
        var variantType = "";
        if (success) {
            respMsg = Granite.I18n.get("Assets have been successfully moved to destination.");
            dialogHeader = Granite.I18n.get("Success");
            variantType = "success";
        } else {
            respMsg = Granite.I18n.get("Assets move failed.");
            dialogHeader = Granite.I18n.get("Error");
            variantType = "error";
        }

        var responseModal;
        if ($("#confirm-asset-drag-move-response").length === 0) {
            responseModal = new Coral.Dialog().set({
                id: "confirm-asset-drag-move-response",
                variant: variantType,
                closable: "off",
                header: {
                    innerHTML: dialogHeader
                },
                content: {
                    innerHTML: respMsg
                },
                footer: {
                    innerHTML: '<button is="coral-button" class="close-move-resp-dialog" variant="default" ' +
                                "coral-close>" + Granite.I18n.get("Close") + "</button>"
                }
            });
            $("body").append(responseModal);
            $(".close-move-resp-dialog").on("click", function(event) {
                // refresh current page
                location.reload();
            });
        } else {
            responseModal = $("#confirm-asset-drag-move-response")[0];
        }
        responseModal.show();
    }

    function createConfirmationDialog(destFolder) {
        var confirmationMsg = Granite.I18n.get("Do you want to move the selected assets to this folder?");
        var confirmModal;
        if ($("#confirm-asset-drag-move").length === 0) {
            confirmModal = new Coral.Dialog().set({
                id: "confirm-asset-drag-move",
                variant: "success",
                closable: "off",
                header: {
                    innerHTML: Granite.I18n.get("Confirm Move")
                },
                content: {
                    innerHTML: confirmationMsg
                },
                footer: {
                    innerHTML: '<button is="coral-button" class="confirm-drag-move-dialog" variant="default"' +
                                " coral-close>" + Granite.I18n.get("Confirm") + "</button>" +
                                '<button is="coral-button" class="cancelDragMoveDialog" variant="default" ' +
                                "coral-close>" + Granite.I18n.get("Cancel") + "</button>"
                }
            });
            $("body").append(confirmModal);
            $(".confirm-drag-move-dialog").on("click", function(event) {
                moveAssets(destFolder);
            });
        } else {
            confirmModal = $("#confirm-asset-drag-move")[0];
        }
        confirmModal.show();
    }
})(document, jQuery, Granite.$);

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
(function(document, $) {
    "use strict";

    var relDamCreateMetadata = ".dam-import-metadata";

    $(document).on("foundation-selections-change", function(e) {
        if ($(".foundation-selections-item").length > 0) {
            $(relDamCreateMetadata).addClass("granite-collection-create-hidden");
        } else {
            $(relDamCreateMetadata).removeClass("granite-collection-create-hidden");
        }
    });
})(document, Granite.$);

/*
 ADOBE CONFIDENTIAL

 Copyright 2017 Adobe Systems Incorporated
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
(function(document, $) {
    "use strict";

    $(document).on("click", ".dam-asset-createtask-action-activator", function(e) {
        var $actionItem = $(this);
        var assetPath;
        var data = "";
        var url = "";
        if ($actionItem.data("foundationCollectionAction")) {
            data = $actionItem.data("foundationCollectionAction").data;
            url = data.href;
        }
        var selection = Dam.Util.getSelection();
        var selectionCount = Dam.Util.getSelectionCount(selection);
        if (selectionCount === 1) {
            assetPath = Dam.Util.getSelectionSinglePath(selection);
        }
        // if you knew the project you could pass that in ?project=
        url = url + "?payload=" + encodeURIComponent(assetPath) + "&_charset_=utf-8";
        window.location.href = Granite.HTTP.externalize(url);
    });
})(document, Granite.$);


/*
 ADOBE CONFIDENTIAL

 Copyright 2019 Adobe Systems Incorporated
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
(function(document, $) {
    "use strict";

    $(document).on("foundation-contentloaded", function(e) {
        var assetMetadata = "div.foundation-collection-assets-meta";
        var assetMetadataType = "foundationCollectionMetaType";
        var reprocessAssetActivator = ".dam-asset-reprocessassets-action-activator";

        $(document).off("click", reprocessAssetActivator).on("click", reprocessAssetActivator, function(e) {
            var assets = [];
            var folders = [];
            var paths = [];
            var selectedItems = $(".foundation-selections-item");
            selectedItems.each(function() {
                paths.push($(this).get(0).getAttribute("data-foundation-collection-item-id"));

                // get selection type
                var type = $(this).find(assetMetadata).data(assetMetadataType);

                // add asset
                if (type === "asset") {
                    assets.push($(this).get(0).getAttribute("data-foundation-collection-item-id"));
                }
                // add folder
                if (type === "directory") {
                    folders.push($(this).get(0).getAttribute("data-foundation-collection-item-id"));
                }
            });
            showDialog(paths, assets, folders);
        });
    });

    function showDialog(paths, assets, folders) {
        var headerText = Granite.I18n.get("Reprocess Assets");

        $("coral-dialog[id='reprocessAssetDialog']").each(function() {
            var $this = $(this);

            $this.hide();
            $this.remove();
        });
        var dialog = new Coral.Dialog().set({
            id: "reprocessAssetDialog",
            header: {
                innerHTML: headerText
            }
        });
        document.body.appendChild(dialog);
        var footer = dialog.footer;
        var selectedItems = $(".foundation-selections-item");
        var recursive = false;

        // add check box for recursive if applicable
        if (folders.length > 0) {
            var cb = document.createElement("coral-checkbox");
            $(cb).attr("id", "forceRecursionCb");
            cb.label.innerHTML = Granite.I18n.get("Reprocess subfolders");
            footer.appendChild(cb);
            $(cb).change(function() {
                recursive = document.querySelector("#forceRecursionCb").checked;
            });
        }

        var cancel = new Coral.Button();
        cancel.id = "reprocessCancel";
        cancel.label.textContent = Granite.I18n.get("Cancel");
        footer.appendChild(cancel).on("click", function() {
            dialog.hide();
        });
        var reprocessButton = new Coral.Button();
        reprocessButton.id = "reprocessConfirm";
        reprocessButton.label.textContent = Granite.I18n.get("Reprocess");
        reprocessButton.variant = "warning";
        footer.appendChild(reprocessButton).on("click", function() {
            reprocessList(assets, folders, recursive);
            dialog.hide();
        });

        var dialogContent = dialog.content;
        dialogContent.innerHTML = "";
        dialogContent.appendChild(function() {
            var para = document.createElement("p");
            var str = "You are going to reprocess the following:";
            para.innerHTML = Granite.I18n.get(str, paths);
            return para;
        }());

        dialogContent.appendChild(function() {
            var para = document.createElement("p");
            $.each(selectedItems, function(i, item) {
                var title = $(item).find(".foundation-collection-assets-meta").data("foundation-collection-meta-title");
                if (!title) {
                    title = $(item).data("foundation-collection-item-id");
                    if (title !== undefined) {
                        title = title.substring(title.lastIndexOf("/") + 1);
                    }
                }
                para.appendChild(document.createTextNode(title));
                para.appendChild(document.createElement("br"));
            });
            para.appendChild(document.createElement("br"));
            return para;
        }());

        dialog.show();
    }

    /**
     *
     * @param paths
     */
    function reprocessList(assets, folders, recursive) {
        var url;
        var data = {};

        url = Granite.HTTP.externalize("/assets.assetProcess.json");
        data = {
            "assetPath": assets,
            "folderPath": folders,
            "recursive": recursive,
            "_charset_": "utf-8"
        };

        var ui = $(window).adaptTo("foundation-ui");

        ui.wait();

        $.ajax({
            url: url,
            type: "post",
            data: data,
            success: function(e) {
                ui.clearWait();
                var successMessage = Granite.I18n.get("Your reprocess task has been initiated.");
                ui.prompt(Granite.I18n.get("Success"), successMessage, "success", [{
                    text: Granite.I18n.get("OK"),
                    primary: true
                }]);
            },
            error: function(response) {
                ui.clearWait();
                if (response.status === 412) {
                    // Ignore. Already Handled
                    return;
                }
                new Coral.Dialog().set({
                    id: "reprocessAssetErrorDialog",
                    variant: "error",
                    header: {
                        innerHTML: Granite.I18n.get("Error")
                    },
                    content: {
                        innerHTML: "<p>" + Granite.I18n.get("Failed to reprocess.") + "</p>"
                    },
                    footer: {
                        innerHTML: '<button is="coral-button" variant="primary" ' +
                                    'coral-close size="M">' + Granite.I18n.get("Ok") + "</button>"
                    }
                }).show();
            }
        });
    }
})(document, Granite.$);

/*************************************************************************
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2019 Adobe Systems Incorporated
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
 **************************************************************************/
(function(document, $) {
    "use strict";

    var events = {
        foundationContentReady: "foundation-contentloaded",
        nofeatures: "granite-omnisearch-asset-similaritysearch-nofeatures",
        externalOmnisearch: "granite-omnisearch-external-search"
    };
    var strings = {
        dialogHeader: Granite.I18n.get("Action requires Smart Tags"),
        dialogBody: Granite.I18n.get("You must apply smart-tags to the asset before using it for finding similar images."), // eslint-disable-line max-len
        dialogButton: Granite.I18n.get("Ok")
    };

    var ui = (function() {
        function showAlert() {
            $("coral-dialog[id='noSimSearchDialog']").each(function() {
                $(this).hide();
                $(this).remove();
            });
            var dialog = new Coral.Dialog().set({
                id: "noSimSearchDialog",
                header: { innerHTML: strings.dialogHeader }
            });
            document.body.appendChild(dialog);

            var footer = dialog.footer;
            var okButton = new Coral.Button();
            okButton.label.textContent = strings.dialogButton;
            footer.appendChild(okButton).on("click", function() {
                dialog.hide();
            });

            var para = document.createElement("p");
            para.innerHTML = strings.dialogBody;
            dialog.content.innerHTML = "";
            dialog.content.appendChild(para);

            dialog.show();
        }

        function getSelectedItems() {
            return $(".foundation-selections-item");
        }

        function deselectItems(items) {
            $("[data-granite-collection-deselect-target='.cq-damadmin-admin-childpages']").click();
            items.toggleClass("foundation-selections-item");
            items.trigger("foundation-selections-change");
        }

        return {
            noFeaturesAlert: showAlert,
            selectedItems: getSelectedItems,
            deselectItems: deselectItems
        };
    })();

    var controller = (function() {
        function AssetItem(item) {
            var hasFeatures = (item.data("hasFeatures") === true);
            item.children().each(function(idx, obj) {
                if ($(obj).attr("has-features") === "true") {
                    hasFeatures = true;
                }
            });
            this.hasFeatures = hasFeatures;
            this.path = item.data("foundation-collection-item-id");
        }

        function doSearch(forPath) {
            $(document).trigger({
                type: events.externalOmnisearch,
                detail: {
                    queryParams: {
                        similar: forPath
                    }
                }
            });
        }

        function itemSearch(items) {
            if (items.length === 1) {
                items.each(function(i, elem) {
                    ui.deselectItems(items);
                    var item = new AssetItem($(elem));
                    if (item.hasFeatures) {
                        doSearch(item.path);
                    } else {
                        ui.noFeaturesAlert();
                    }
                });
            }
        }

        function noFeaturesAlert() {
            ui.noFeaturesAlert();
        }

        function qaItemSearch(imagePath) {
            $(document).trigger({
                type: "granite-omnisearch-external-search",
                detail: {
                    queryParams: {
                        similar: imagePath
                    }
                }
            });
        }

        return {
            itemSearch: itemSearch,
            noFeaturesAlert: noFeaturesAlert,
            qaSearch: qaItemSearch
        };
    })();

    // entry points
    $(document).one(events.foundationContentReady, function(e) {
        var activator = ".cq-damadmin-admin-actions-findsimilar-activator";
        //// item selection - action button click
        $(document).off("click", activator).on("click", activator, function(e) {
            e.preventDefault();
            var items = $(".foundation-selections-item");
            controller.itemSearch(items);
        });
    });

    $(document).on(events.foundationContentReady, function(e) {
        $(".image-search-quickaction-button[data-vis-search-features='true']").off("click").click(function() {
            var mItem = $(this).closest("coral-masonry-item");
            if (mItem) {
                controller.qaSearch(mItem.data("foundation-collection-item-id"));
            }
        });
        $(".image-search-quickaction-button[data-vis-search-features='false']").off("click").click(
            controller.noFeaturesAlert);
    });

    //// item selection - no-features present
    $(document).on(events.nofeatures, controller.noFeaturesAlert);
})(document, Granite.$);

/*! jQuery UI - v1.10.3 - 2013-08-06
 * http://jqueryui.com
 * Includes: jquery.ui.core.js, jquery.ui.widget.js, jquery.ui.mouse.js, jquery.ui.draggable.js, jquery.ui.droppable.js, jquery.ui.selectable.js, jquery.ui.sortable.js
 * Copyright 2013 jQuery Foundation and other contributors Licensed MIT */

(function( $, undefined ) {

    var uuid = 0,
        runiqueId = /^ui-id-\d+$/;

// $.ui might exist from components with no dependencies, e.g., $.ui.position
    $.ui = $.ui || {};

    $.extend( $.ui, {
        version: "1.10.3",

        keyCode: {
            BACKSPACE: 8,
            COMMA: 188,
            DELETE: 46,
            DOWN: 40,
            END: 35,
            ENTER: 13,
            ESCAPE: 27,
            HOME: 36,
            LEFT: 37,
            NUMPAD_ADD: 107,
            NUMPAD_DECIMAL: 110,
            NUMPAD_DIVIDE: 111,
            NUMPAD_ENTER: 108,
            NUMPAD_MULTIPLY: 106,
            NUMPAD_SUBTRACT: 109,
            PAGE_DOWN: 34,
            PAGE_UP: 33,
            PERIOD: 190,
            RIGHT: 39,
            SPACE: 32,
            TAB: 9,
            UP: 38
        }
    });

// plugins
    $.fn.extend({
        focus: (function( orig ) {
            return function( delay, fn ) {
                return typeof delay === "number" ?
                    this.each(function() {
                        var elem = this;
                        setTimeout(function() {
                            $( elem ).focus();
                            if ( fn ) {
                                fn.call( elem );
                            }
                        }, delay );
                    }) :
                    orig.apply( this, arguments );
            };
        })( $.fn.focus ),

        scrollParent: function() {
            var scrollParent;
            if (($.ui.ie && (/(static|relative)/).test(this.css("position"))) || (/absolute/).test(this.css("position"))) {
                scrollParent = this.parents().filter(function() {
                    return (/(relative|absolute|fixed)/).test($.css(this,"position")) && (/(auto|scroll)/).test($.css(this,"overflow")+$.css(this,"overflow-y")+$.css(this,"overflow-x"));
                }).eq(0);
            } else {
                scrollParent = this.parents().filter(function() {
                    return (/(auto|scroll)/).test($.css(this,"overflow")+$.css(this,"overflow-y")+$.css(this,"overflow-x"));
                }).eq(0);
            }

            return (/fixed/).test(this.css("position")) || !scrollParent.length ? $(document) : scrollParent;
        },

        zIndex: function( zIndex ) {
            if ( zIndex !== undefined ) {
                return this.css( "zIndex", zIndex );
            }

            if ( this.length ) {
                var elem = $( this[ 0 ] ), position, value;
                while ( elem.length && elem[ 0 ] !== document ) {
                    // Ignore z-index if position is set to a value where z-index is ignored by the browser
                    // This makes behavior of this function consistent across browsers
                    // WebKit always returns auto if the element is positioned
                    position = elem.css( "position" );
                    if ( position === "absolute" || position === "relative" || position === "fixed" ) {
                        // IE returns 0 when zIndex is not specified
                        // other browsers return a string
                        // we ignore the case of nested elements with an explicit value of 0
                        // <div style="z-index: -10;"><div style="z-index: 0;"></div></div>
                        value = parseInt( elem.css( "zIndex" ), 10 );
                        if ( !isNaN( value ) && value !== 0 ) {
                            return value;
                        }
                    }
                    elem = elem.parent();
                }
            }

            return 0;
        },

        uniqueId: function() {
            return this.each(function() {
                if ( !this.id ) {
                    this.id = "ui-id-" + (++uuid);
                }
            });
        },

        removeUniqueId: function() {
            return this.each(function() {
                if ( runiqueId.test( this.id ) ) {
                    $( this ).removeAttr( "id" );
                }
            });
        }
    });

// selectors
    function focusable( element, isTabIndexNotNaN ) {
        var map, mapName, img,
            nodeName = element.nodeName.toLowerCase();
        if ( "area" === nodeName ) {
            map = element.parentNode;
            mapName = map.name;
            if ( !element.href || !mapName || map.nodeName.toLowerCase() !== "map" ) {
                return false;
            }
            img = $( "img[usemap=#" + mapName + "]" )[0];
            return !!img && visible( img );
        }
        return ( /input|select|textarea|button|object/.test( nodeName ) ?
            !element.disabled :
            "a" === nodeName ?
                element.href || isTabIndexNotNaN :
                isTabIndexNotNaN) &&
            // the element and all of its ancestors must be visible
            visible( element );
    }

    function visible( element ) {
        return $.expr.filters.visible( element ) &&
            !$( element ).parents().addBack().filter(function() {
                return $.css( this, "visibility" ) === "hidden";
            }).length;
    }

    $.extend( $.expr[ ":" ], {
        data: $.expr.createPseudo ?
            $.expr.createPseudo(function( dataName ) {
                return function( elem ) {
                    return !!$.data( elem, dataName );
                };
            }) :
            // support: jQuery <1.8
            function( elem, i, match ) {
                return !!$.data( elem, match[ 3 ] );
            },

        focusable: function( element ) {
            return focusable( element, !isNaN( $.attr( element, "tabindex" ) ) );
        },

        tabbable: function( element ) {
            var tabIndex = $.attr( element, "tabindex" ),
                isTabIndexNaN = isNaN( tabIndex );
            return ( isTabIndexNaN || tabIndex >= 0 ) && focusable( element, !isTabIndexNaN );
        }
    });

// support: jQuery <1.8
    if ( !$( "<a>" ).outerWidth( 1 ).jquery ) {
        $.each( [ "Width", "Height" ], function( i, name ) {
            var side = name === "Width" ? [ "Left", "Right" ] : [ "Top", "Bottom" ],
                type = name.toLowerCase(),
                orig = {
                    innerWidth: $.fn.innerWidth,
                    innerHeight: $.fn.innerHeight,
                    outerWidth: $.fn.outerWidth,
                    outerHeight: $.fn.outerHeight
                };

            function reduce( elem, size, border, margin ) {
                $.each( side, function() {
                    size -= parseFloat( $.css( elem, "padding" + this ) ) || 0;
                    if ( border ) {
                        size -= parseFloat( $.css( elem, "border" + this + "Width" ) ) || 0;
                    }
                    if ( margin ) {
                        size -= parseFloat( $.css( elem, "margin" + this ) ) || 0;
                    }
                });
                return size;
            }

            $.fn[ "inner" + name ] = function( size ) {
                if ( size === undefined ) {
                    return orig[ "inner" + name ].call( this );
                }

                return this.each(function() {
                    $( this ).css( type, reduce( this, size ) + "px" );
                });
            };

            $.fn[ "outer" + name] = function( size, margin ) {
                if ( typeof size !== "number" ) {
                    return orig[ "outer" + name ].call( this, size );
                }

                return this.each(function() {
                    $( this).css( type, reduce( this, size, true, margin ) + "px" );
                });
            };
        });
    }

// support: jQuery <1.8
    if ( !$.fn.addBack ) {
        $.fn.addBack = function( selector ) {
            return this.add( selector == null ?
                this.prevObject : this.prevObject.filter( selector )
            );
        };
    }

// support: jQuery 1.6.1, 1.6.2 (http://bugs.jquery.com/ticket/9413)
    if ( $( "<a>" ).data( "a-b", "a" ).removeData( "a-b" ).data( "a-b" ) ) {
        $.fn.removeData = (function( removeData ) {
            return function( key ) {
                if ( arguments.length ) {
                    return removeData.call( this, $.camelCase( key ) );
                } else {
                    return removeData.call( this );
                }
            };
        })( $.fn.removeData );
    }





// deprecated
    $.ui.ie = !!/msie [\w.]+/.exec( navigator.userAgent.toLowerCase() );

    $.support.selectstart = "onselectstart" in document.createElement( "div" );
    $.fn.extend({
        disableSelection: function() {
            return this.bind( ( $.support.selectstart ? "selectstart" : "mousedown" ) +
                ".ui-disableSelection", function( event ) {
                event.preventDefault();
            });
        },

        enableSelection: function() {
            return this.unbind( ".ui-disableSelection" );
        }
    });

    $.extend( $.ui, {
        // $.ui.plugin is deprecated. Use $.widget() extensions instead.
        plugin: {
            add: function( module, option, set ) {
                var i,
                    proto = $.ui[ module ].prototype;
                for ( i in set ) {
                    proto.plugins[ i ] = proto.plugins[ i ] || [];
                    proto.plugins[ i ].push( [ option, set[ i ] ] );
                }
            },
            call: function( instance, name, args ) {
                var i,
                    set = instance.plugins[ name ];
                if ( !set || !instance.element[ 0 ].parentNode || instance.element[ 0 ].parentNode.nodeType === 11 ) {
                    return;
                }

                for ( i = 0; i < set.length; i++ ) {
                    if ( instance.options[ set[ i ][ 0 ] ] ) {
                        set[ i ][ 1 ].apply( instance.element, args );
                    }
                }
            }
        },

        // only used by resizable
        hasScroll: function( el, a ) {

            //If overflow is hidden, the element might have extra content, but the user wants to hide it
            if ( $( el ).css( "overflow" ) === "hidden") {
                return false;
            }

            var scroll = ( a && a === "left" ) ? "scrollLeft" : "scrollTop",
                has = false;

            if ( el[ scroll ] > 0 ) {
                return true;
            }

            // TODO: determine which cases actually cause this to happen
            // if the element doesn't have the scroll set, see if it's possible to
            // set the scroll
            el[ scroll ] = 1;
            has = ( el[ scroll ] > 0 );
            el[ scroll ] = 0;
            return has;
        }
    });

})( jQuery );
(function( $, undefined ) {

    var uuid = 0,
        slice = Array.prototype.slice,
        _cleanData = $.cleanData;
    $.cleanData = function( elems ) {
        for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
            try {
                $( elem ).triggerHandler( "remove" );
                // http://bugs.jquery.com/ticket/8235
            } catch( e ) {}
        }
        _cleanData( elems );
    };

    $.widget = function( name, base, prototype ) {
        var fullName, existingConstructor, constructor, basePrototype,
        // proxiedPrototype allows the provided prototype to remain unmodified
        // so that it can be used as a mixin for multiple widgets (#8876)
            proxiedPrototype = {},
            namespace = name.split( "." )[ 0 ];

        name = name.split( "." )[ 1 ];
        fullName = namespace + "-" + name;

        if ( !prototype ) {
            prototype = base;
            base = $.Widget;
        }

        // create selector for plugin
        $.expr[ ":" ][ fullName.toLowerCase() ] = function( elem ) {
            return !!$.data( elem, fullName );
        };

        $[ namespace ] = $[ namespace ] || {};
        existingConstructor = $[ namespace ][ name ];
        constructor = $[ namespace ][ name ] = function( options, element ) {
            // allow instantiation without "new" keyword
            if ( !this._createWidget ) {
                return new constructor( options, element );
            }

            // allow instantiation without initializing for simple inheritance
            // must use "new" keyword (the code above always passes args)
            if ( arguments.length ) {
                this._createWidget( options, element );
            }
        };
        // extend with the existing constructor to carry over any static properties
        $.extend( constructor, existingConstructor, {
            version: prototype.version,
            // copy the object used to create the prototype in case we need to
            // redefine the widget later
            _proto: $.extend( {}, prototype ),
            // track widgets that inherit from this widget in case this widget is
            // redefined after a widget inherits from it
            _childConstructors: []
        });

        basePrototype = new base();
        // we need to make the options hash a property directly on the new instance
        // otherwise we'll modify the options hash on the prototype that we're
        // inheriting from
        basePrototype.options = $.widget.extend( {}, basePrototype.options );
        $.each( prototype, function( prop, value ) {
            if ( !$.isFunction( value ) ) {
                proxiedPrototype[ prop ] = value;
                return;
            }
            proxiedPrototype[ prop ] = (function() {
                var _super = function() {
                        return base.prototype[ prop ].apply( this, arguments );
                    },
                    _superApply = function( args ) {
                        return base.prototype[ prop ].apply( this, args );
                    };
                return function() {
                    var __super = this._super,
                        __superApply = this._superApply,
                        returnValue;

                    this._super = _super;
                    this._superApply = _superApply;

                    returnValue = value.apply( this, arguments );

                    this._super = __super;
                    this._superApply = __superApply;

                    return returnValue;
                };
            })();
        });
        constructor.prototype = $.widget.extend( basePrototype, {
            // TODO: remove support for widgetEventPrefix
            // always use the name + a colon as the prefix, e.g., draggable:start
            // don't prefix for widgets that aren't DOM-based
            widgetEventPrefix: existingConstructor ? basePrototype.widgetEventPrefix : name
        }, proxiedPrototype, {
            constructor: constructor,
            namespace: namespace,
            widgetName: name,
            widgetFullName: fullName
        });

        // If this widget is being redefined then we need to find all widgets that
        // are inheriting from it and redefine all of them so that they inherit from
        // the new version of this widget. We're essentially trying to replace one
        // level in the prototype chain.
        if ( existingConstructor ) {
            $.each( existingConstructor._childConstructors, function( i, child ) {
                var childPrototype = child.prototype;

                // redefine the child widget using the same prototype that was
                // originally used, but inherit from the new version of the base
                $.widget( childPrototype.namespace + "." + childPrototype.widgetName, constructor, child._proto );
            });
            // remove the list of existing child constructors from the old constructor
            // so the old child constructors can be garbage collected
            delete existingConstructor._childConstructors;
        } else {
            base._childConstructors.push( constructor );
        }

        $.widget.bridge( name, constructor );
    };

    $.widget.extend = function( target ) {
        var input = slice.call( arguments, 1 ),
            inputIndex = 0,
            inputLength = input.length,
            key,
            value;
        for ( ; inputIndex < inputLength; inputIndex++ ) {
            for ( key in input[ inputIndex ] ) {
                value = input[ inputIndex ][ key ];
                if ( input[ inputIndex ].hasOwnProperty( key ) && value !== undefined ) {
                    // Clone objects
                    if ( $.isPlainObject( value ) ) {
                        target[ key ] = $.isPlainObject( target[ key ] ) ?
                            $.widget.extend( {}, target[ key ], value ) :
                            // Don't extend strings, arrays, etc. with objects
                            $.widget.extend( {}, value );
                        // Copy everything else by reference
                    } else {
                        target[ key ] = value;
                    }
                }
            }
        }
        return target;
    };

    $.widget.bridge = function( name, object ) {
        var fullName = object.prototype.widgetFullName || name;
        $.fn[ name ] = function( options ) {
            var isMethodCall = typeof options === "string",
                args = slice.call( arguments, 1 ),
                returnValue = this;

            // allow multiple hashes to be passed on init
            options = !isMethodCall && args.length ?
                $.widget.extend.apply( null, [ options ].concat(args) ) :
                options;

            if ( isMethodCall ) {
                this.each(function() {
                    var methodValue,
                        instance = $.data( this, fullName );
                    if ( !instance ) {
                        return $.error( "cannot call methods on " + name + " prior to initialization; " +
                            "attempted to call method '" + options + "'" );
                    }
                    if ( !$.isFunction( instance[options] ) || options.charAt( 0 ) === "_" ) {
                        return $.error( "no such method '" + options + "' for " + name + " widget instance" );
                    }
                    methodValue = instance[ options ].apply( instance, args );
                    if ( methodValue !== instance && methodValue !== undefined ) {
                        returnValue = methodValue && methodValue.jquery ?
                            returnValue.pushStack( methodValue.get() ) :
                            methodValue;
                        return false;
                    }
                });
            } else {
                this.each(function() {
                    var instance = $.data( this, fullName );
                    if ( instance ) {
                        instance.option( options || {} )._init();
                    } else {
                        $.data( this, fullName, new object( options, this ) );
                    }
                });
            }

            return returnValue;
        };
    };

    $.Widget = function( /* options, element */ ) {};
    $.Widget._childConstructors = [];

    $.Widget.prototype = {
        widgetName: "widget",
        widgetEventPrefix: "",
        defaultElement: "<div>",
        options: {
            disabled: false,

            // callbacks
            create: null
        },
        _createWidget: function( options, element ) {
            element = $( element || this.defaultElement || this )[ 0 ];
            this.element = $( element );
            this.uuid = uuid++;
            this.eventNamespace = "." + this.widgetName + this.uuid;
            this.options = $.widget.extend( {},
                this.options,
                this._getCreateOptions(),
                options );

            this.bindings = $();
            this.hoverable = $();
            this.focusable = $();

            if ( element !== this ) {
                $.data( element, this.widgetFullName, this );
                this._on( true, this.element, {
                    remove: function( event ) {
                        if ( event.target === element ) {
                            this.destroy();
                        }
                    }
                });
                this.document = $( element.style ?
                    // element within the document
                    element.ownerDocument :
                    // element is window or document
                    element.document || element );
                this.window = $( this.document[0].defaultView || this.document[0].parentWindow );
            }

            this._create();
            this._trigger( "create", null, this._getCreateEventData() );
            this._init();
        },
        _getCreateOptions: $.noop,
        _getCreateEventData: $.noop,
        _create: $.noop,
        _init: $.noop,

        destroy: function() {
            this._destroy();
            // we can probably remove the unbind calls in 2.0
            // all event bindings should go through this._on()
            this.element
                .unbind( this.eventNamespace )
                // 1.9 BC for #7810
                // TODO remove dual storage
                .removeData( this.widgetName )
                .removeData( this.widgetFullName )
                // support: jquery <1.6.3
                // http://bugs.jquery.com/ticket/9413
                .removeData( $.camelCase( this.widgetFullName ) );
            this.widget()
                .unbind( this.eventNamespace )
                .removeAttr( "aria-disabled" )
                .removeClass(
                    this.widgetFullName + "-disabled " +
                        "ui-state-disabled" );

            // clean up events and states
            this.bindings.unbind( this.eventNamespace );
            this.hoverable.removeClass( "ui-state-hover" );
            this.focusable.removeClass( "ui-state-focus" );
        },
        _destroy: $.noop,

        widget: function() {
            return this.element;
        },

        option: function( key, value ) {
            var options = key,
                parts,
                curOption,
                i;

            if ( arguments.length === 0 ) {
                // don't return a reference to the internal hash
                return $.widget.extend( {}, this.options );
            }

            if ( typeof key === "string" ) {
                // handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
                options = {};
                parts = key.split( "." );
                key = parts.shift();
                if ( parts.length ) {
                    curOption = options[ key ] = $.widget.extend( {}, this.options[ key ] );
                    for ( i = 0; i < parts.length - 1; i++ ) {
                        curOption[ parts[ i ] ] = curOption[ parts[ i ] ] || {};
                        curOption = curOption[ parts[ i ] ];
                    }
                    key = parts.pop();
                    if ( value === undefined ) {
                        return curOption[ key ] === undefined ? null : curOption[ key ];
                    }
                    curOption[ key ] = value;
                } else {
                    if ( value === undefined ) {
                        return this.options[ key ] === undefined ? null : this.options[ key ];
                    }
                    options[ key ] = value;
                }
            }

            this._setOptions( options );

            return this;
        },
        _setOptions: function( options ) {
            var key;

            for ( key in options ) {
                this._setOption( key, options[ key ] );
            }

            return this;
        },
        _setOption: function( key, value ) {
            this.options[ key ] = value;

            if ( key === "disabled" ) {
                this.widget()
                    .toggleClass( this.widgetFullName + "-disabled ui-state-disabled", !!value )
                    .attr( "aria-disabled", value );
                this.hoverable.removeClass( "ui-state-hover" );
                this.focusable.removeClass( "ui-state-focus" );
            }

            return this;
        },

        enable: function() {
            return this._setOption( "disabled", false );
        },
        disable: function() {
            return this._setOption( "disabled", true );
        },

        _on: function( suppressDisabledCheck, element, handlers ) {
            var delegateElement,
                instance = this;

            // no suppressDisabledCheck flag, shuffle arguments
            if ( typeof suppressDisabledCheck !== "boolean" ) {
                handlers = element;
                element = suppressDisabledCheck;
                suppressDisabledCheck = false;
            }

            // no element argument, shuffle and use this.element
            if ( !handlers ) {
                handlers = element;
                element = this.element;
                delegateElement = this.widget();
            } else {
                // accept selectors, DOM elements
                element = delegateElement = $( element );
                this.bindings = this.bindings.add( element );
            }

            $.each( handlers, function( event, handler ) {
                function handlerProxy() {
                    // allow widgets to customize the disabled handling
                    // - disabled as an array instead of boolean
                    // - disabled class as method for disabling individual parts
                    if ( !suppressDisabledCheck &&
                        ( instance.options.disabled === true ||
                            $( this ).hasClass( "ui-state-disabled" ) ) ) {
                        return;
                    }
                    return ( typeof handler === "string" ? instance[ handler ] : handler )
                        .apply( instance, arguments );
                }

                // copy the guid so direct unbinding works
                if ( typeof handler !== "string" ) {
                    handlerProxy.guid = handler.guid =
                        handler.guid || handlerProxy.guid || $.guid++;
                }

                var match = event.match( /^(\w+)\s*(.*)$/ ),
                    eventName = match[1] + instance.eventNamespace,
                    selector = match[2];
                if ( selector ) {
                    delegateElement.delegate( selector, eventName, handlerProxy );
                } else {
                    element.bind( eventName, handlerProxy );
                }
            });
        },

        _off: function( element, eventName ) {
            eventName = (eventName || "").split( " " ).join( this.eventNamespace + " " ) + this.eventNamespace;
            element.unbind( eventName ).undelegate( eventName );
        },

        _delay: function( handler, delay ) {
            function handlerProxy() {
                return ( typeof handler === "string" ? instance[ handler ] : handler )
                    .apply( instance, arguments );
            }
            var instance = this;
            return setTimeout( handlerProxy, delay || 0 );
        },

        _hoverable: function( element ) {
            this.hoverable = this.hoverable.add( element );
            this._on( element, {
                mouseenter: function( event ) {
                    $( event.currentTarget ).addClass( "ui-state-hover" );
                },
                mouseleave: function( event ) {
                    $( event.currentTarget ).removeClass( "ui-state-hover" );
                }
            });
        },

        _focusable: function( element ) {
            this.focusable = this.focusable.add( element );
            this._on( element, {
                focusin: function( event ) {
                    $( event.currentTarget ).addClass( "ui-state-focus" );
                },
                focusout: function( event ) {
                    $( event.currentTarget ).removeClass( "ui-state-focus" );
                }
            });
        },

        _trigger: function( type, event, data ) {
            var prop, orig,
                callback = this.options[ type ];

            data = data || {};
            event = $.Event( event );
            event.type = ( type === this.widgetEventPrefix ?
                type :
                this.widgetEventPrefix + type ).toLowerCase();
            // the original event may come from any element
            // so we need to reset the target on the new event
            event.target = this.element[ 0 ];

            // copy original event properties over to the new event
            orig = event.originalEvent;
            if ( orig ) {
                for ( prop in orig ) {
                    if ( !( prop in event ) ) {
                        event[ prop ] = orig[ prop ];
                    }
                }
            }

            this.element.trigger( event, data );
            return !( $.isFunction( callback ) &&
                callback.apply( this.element[0], [ event ].concat( data ) ) === false ||
                event.isDefaultPrevented() );
        }
    };

    $.each( { show: "fadeIn", hide: "fadeOut" }, function( method, defaultEffect ) {
        $.Widget.prototype[ "_" + method ] = function( element, options, callback ) {
            if ( typeof options === "string" ) {
                options = { effect: options };
            }
            var hasOptions,
                effectName = !options ?
                    method :
                    options === true || typeof options === "number" ?
                        defaultEffect :
                        options.effect || defaultEffect;
            options = options || {};
            if ( typeof options === "number" ) {
                options = { duration: options };
            }
            hasOptions = !$.isEmptyObject( options );
            options.complete = callback;
            if ( options.delay ) {
                element.delay( options.delay );
            }
            if ( hasOptions && $.effects && $.effects.effect[ effectName ] ) {
                element[ method ]( options );
            } else if ( effectName !== method && element[ effectName ] ) {
                element[ effectName ]( options.duration, options.easing, callback );
            } else {
                element.queue(function( next ) {
                    $( this )[ method ]();
                    if ( callback ) {
                        callback.call( element[ 0 ] );
                    }
                    next();
                });
            }
        };
    });

})( jQuery );
(function( $, undefined ) {

    var mouseHandled = false;
    $( document ).mouseup( function() {
        mouseHandled = false;
    });

    $.widget("ui.mouse", {
        version: "1.10.3",
        options: {
            cancel: "input,textarea,button,select,option",
            distance: 1,
            delay: 0
        },
        _mouseInit: function() {
            var that = this;

            this.element
                .bind("mousedown."+this.widgetName, function(event) {
                    return that._mouseDown(event);
                })
                .bind("click."+this.widgetName, function(event) {
                    if (true === $.data(event.target, that.widgetName + ".preventClickEvent")) {
                        $.removeData(event.target, that.widgetName + ".preventClickEvent");
                        event.stopImmediatePropagation();
                        return false;
                    }
                });

            this.started = false;
        },

        // TODO: make sure destroying one instance of mouse doesn't mess with
        // other instances of mouse
        _mouseDestroy: function() {
            this.element.unbind("."+this.widgetName);
            if ( this._mouseMoveDelegate ) {
                $(document)
                    .unbind("mousemove."+this.widgetName, this._mouseMoveDelegate)
                    .unbind("mouseup."+this.widgetName, this._mouseUpDelegate);
            }
        },

        _mouseDown: function(event) {
            // don't let more than one widget handle mouseStart
            if( mouseHandled ) { return; }

            // we may have missed mouseup (out of window)
            (this._mouseStarted && this._mouseUp(event));

            this._mouseDownEvent = event;

            var that = this,
                btnIsLeft = (event.which === 1),
            // event.target.nodeName works around a bug in IE 8 with
            // disabled inputs (#7620)
                elIsCancel = (typeof this.options.cancel === "string" && event.target.nodeName ? $(event.target).closest(this.options.cancel).length : false);
            if (!btnIsLeft || elIsCancel || !this._mouseCapture(event)) {
                return true;
            }

            this.mouseDelayMet = !this.options.delay;
            if (!this.mouseDelayMet) {
                this._mouseDelayTimer = setTimeout(function() {
                    that.mouseDelayMet = true;
                }, this.options.delay);
            }

            if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
                this._mouseStarted = (this._mouseStart(event) !== false);
                if (!this._mouseStarted) {
                    event.preventDefault();
                    return true;
                }
            }

            // Click event may never have fired (Gecko & Opera)
            if (true === $.data(event.target, this.widgetName + ".preventClickEvent")) {
                $.removeData(event.target, this.widgetName + ".preventClickEvent");
            }

            // these delegates are required to keep context
            this._mouseMoveDelegate = function(event) {
                return that._mouseMove(event);
            };
            this._mouseUpDelegate = function(event) {
                return that._mouseUp(event);
            };
            $(document)
                .bind("mousemove."+this.widgetName, this._mouseMoveDelegate)
                .bind("mouseup."+this.widgetName, this._mouseUpDelegate);

            event.preventDefault();

            mouseHandled = true;
            return true;
        },

        _mouseMove: function(event) {
            // IE mouseup check - mouseup happened when mouse was out of window
            if ($.ui.ie && ( !document.documentMode || document.documentMode < 9 ) && !event.button) {
                return this._mouseUp(event);
            }

            if (this._mouseStarted) {
                this._mouseDrag(event);
                return event.preventDefault();
            }

            if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
                this._mouseStarted =
                    (this._mouseStart(this._mouseDownEvent, event) !== false);
                (this._mouseStarted ? this._mouseDrag(event) : this._mouseUp(event));
            }

            return !this._mouseStarted;
        },

        _mouseUp: function(event) {
            $(document)
                .unbind("mousemove."+this.widgetName, this._mouseMoveDelegate)
                .unbind("mouseup."+this.widgetName, this._mouseUpDelegate);

            if (this._mouseStarted) {
                this._mouseStarted = false;

                if (event.target === this._mouseDownEvent.target) {
                    $.data(event.target, this.widgetName + ".preventClickEvent", true);
                }

                this._mouseStop(event);
            }

            return false;
        },

        _mouseDistanceMet: function(event) {
            return (Math.max(
                Math.abs(this._mouseDownEvent.pageX - event.pageX),
                Math.abs(this._mouseDownEvent.pageY - event.pageY)
            ) >= this.options.distance
            );
        },

        _mouseDelayMet: function(/* event */) {
            return this.mouseDelayMet;
        },

        // These are placeholder methods, to be overriden by extending plugin
        _mouseStart: function(/* event */) {},
        _mouseDrag: function(/* event */) {},
        _mouseStop: function(/* event */) {},
        _mouseCapture: function(/* event */) { return true; }
    });

})(jQuery);
(function( $, undefined ) {

    $.widget("ui.draggable", $.ui.mouse, {
        version: "1.10.3",
        widgetEventPrefix: "drag",
        options: {
            addClasses: true,
            appendTo: "parent",
            axis: false,
            connectToSortable: false,
            containment: false,
            cursor: "auto",
            cursorAt: false,
            grid: false,
            handle: false,
            helper: "original",
            iframeFix: false,
            opacity: false,
            refreshPositions: false,
            revert: false,
            revertDuration: 500,
            scope: "default",
            scroll: true,
            scrollSensitivity: 20,
            scrollSpeed: 20,
            snap: false,
            snapMode: "both",
            snapTolerance: 20,
            stack: false,
            zIndex: false,

            // callbacks
            drag: null,
            start: null,
            stop: null
        },
        _create: function() {

            if (this.options.helper === "original" && !(/^(?:r|a|f)/).test(this.element.css("position"))) {
                this.element[0].style.position = "relative";
            }
            if (this.options.addClasses){
                this.element.addClass("ui-draggable");
            }
            if (this.options.disabled){
                this.element.addClass("ui-draggable-disabled");
            }

            this._mouseInit();

        },

        _destroy: function() {
            this.element.removeClass( "ui-draggable ui-draggable-dragging ui-draggable-disabled" );
            this._mouseDestroy();
        },

        _mouseCapture: function(event) {

            var o = this.options;

            // among others, prevent a drag on a resizable-handle
            if (this.helper || o.disabled || $(event.target).closest(".ui-resizable-handle").length > 0) {
                return false;
            }

            //Quit if we're not on a valid handle
            this.handle = this._getHandle(event);
            if (!this.handle) {
                return false;
            }

            $(o.iframeFix === true ? "iframe" : o.iframeFix).each(function() {
                $("<div class='ui-draggable-iframeFix' style='background: #fff;'></div>")
                    .css({
                        width: this.offsetWidth+"px", height: this.offsetHeight+"px",
                        position: "absolute", opacity: "0.001", zIndex: 1000
                    })
                    .css($(this).offset())
                    .appendTo("body");
            });

            return true;

        },

        _mouseStart: function(event) {

            var o = this.options;

            //Create and append the visible helper
            this.helper = this._createHelper(event);

            this.helper.addClass("ui-draggable-dragging");

            //Cache the helper size
            this._cacheHelperProportions();

            //If ddmanager is used for droppables, set the global draggable
            if($.ui.ddmanager) {
                $.ui.ddmanager.current = this;
            }

            /*
             * - Position generation -
             * This block generates everything position related - it's the core of draggables.
             */

            //Cache the margins of the original element
            this._cacheMargins();

            //Store the helper's css position
            this.cssPosition = this.helper.css( "position" );
            this.scrollParent = this.helper.scrollParent();
            this.offsetParent = this.helper.offsetParent();
            this.offsetParentCssPosition = this.offsetParent.css( "position" );

            //The element's absolute position on the page minus margins
            this.offset = this.positionAbs = this.element.offset();
            this.offset = {
                top: this.offset.top - this.margins.top,
                left: this.offset.left - this.margins.left
            };

            //Reset scroll cache
            this.offset.scroll = false;

            $.extend(this.offset, {
                click: { //Where the click happened, relative to the element
                    left: event.pageX - this.offset.left,
                    top: event.pageY - this.offset.top
                },
                parent: this._getParentOffset(),
                relative: this._getRelativeOffset() //This is a relative to absolute position minus the actual position calculation - only used for relative positioned helper
            });

            //Generate the original position
            this.originalPosition = this.position = this._generatePosition(event);
            this.originalPageX = event.pageX;
            this.originalPageY = event.pageY;

            //Adjust the mouse offset relative to the helper if "cursorAt" is supplied
            (o.cursorAt && this._adjustOffsetFromHelper(o.cursorAt));

            //Set a containment if given in the options
            this._setContainment();

            //Trigger event + callbacks
            if(this._trigger("start", event) === false) {
                this._clear();
                return false;
            }

            //Recache the helper size
            this._cacheHelperProportions();

            //Prepare the droppable offsets
            if ($.ui.ddmanager && !o.dropBehaviour) {
                $.ui.ddmanager.prepareOffsets(this, event);
            }


            this._mouseDrag(event, true); //Execute the drag once - this causes the helper not to be visible before getting its correct position

            //If the ddmanager is used for droppables, inform the manager that dragging has started (see #5003)
            if ( $.ui.ddmanager ) {
                $.ui.ddmanager.dragStart(this, event);
            }

            return true;
        },

        _mouseDrag: function(event, noPropagation) {
            // reset any necessary cached properties (see #5009)
            if ( this.offsetParentCssPosition === "fixed" ) {
                this.offset.parent = this._getParentOffset();
            }

            //Compute the helpers position
            this.position = this._generatePosition(event);
            this.positionAbs = this._convertPositionTo("absolute");

            //Call plugins and callbacks and use the resulting position if something is returned
            if (!noPropagation) {
                var ui = this._uiHash();
                if(this._trigger("drag", event, ui) === false) {
                    this._mouseUp({});
                    return false;
                }
                this.position = ui.position;
            }

            if(!this.options.axis || this.options.axis !== "y") {
                this.helper[0].style.left = this.position.left+"px";
            }
            if(!this.options.axis || this.options.axis !== "x") {
                this.helper[0].style.top = this.position.top+"px";
            }
            if($.ui.ddmanager) {
                $.ui.ddmanager.drag(this, event);
            }

            return false;
        },

        _mouseStop: function(event) {

            //If we are using droppables, inform the manager about the drop
            var that = this,
                dropped = false;
            if ($.ui.ddmanager && !this.options.dropBehaviour) {
                dropped = $.ui.ddmanager.drop(this, event);
            }

            //if a drop comes from outside (a sortable)
            if(this.dropped) {
                dropped = this.dropped;
                this.dropped = false;
            }

            //if the original element is no longer in the DOM don't bother to continue (see #8269)
            if ( this.options.helper === "original" && !$.contains( this.element[ 0 ].ownerDocument, this.element[ 0 ] ) ) {
                return false;
            }

            if((this.options.revert === "invalid" && !dropped) || (this.options.revert === "valid" && dropped) || this.options.revert === true || ($.isFunction(this.options.revert) && this.options.revert.call(this.element, dropped))) {
                $(this.helper).animate(this.originalPosition, parseInt(this.options.revertDuration, 10), function() {
                    if(that._trigger("stop", event) !== false) {
                        that._clear();
                    }
                });
            } else {
                if(this._trigger("stop", event) !== false) {
                    this._clear();
                }
            }

            return false;
        },

        _mouseUp: function(event) {
            //Remove frame helpers
            $("div.ui-draggable-iframeFix").each(function() {
                this.parentNode.removeChild(this);
            });

            //If the ddmanager is used for droppables, inform the manager that dragging has stopped (see #5003)
            if( $.ui.ddmanager ) {
                $.ui.ddmanager.dragStop(this, event);
            }

            return $.ui.mouse.prototype._mouseUp.call(this, event);
        },

        cancel: function() {

            if(this.helper.is(".ui-draggable-dragging")) {
                this._mouseUp({});
            } else {
                this._clear();
            }

            return this;

        },

        _getHandle: function(event) {
            return this.options.handle ?
                !!$( event.target ).closest( this.element.find( this.options.handle ) ).length :
                true;
        },

        _createHelper: function(event) {

            var o = this.options,
                helper = $.isFunction(o.helper) ? $(o.helper.apply(this.element[0], [event])) : (o.helper === "clone" ? this.element.clone().removeAttr("id") : this.element);

            if(!helper.parents("body").length) {
                helper.appendTo((o.appendTo === "parent" ? this.element[0].parentNode : o.appendTo));
            }

            if(helper[0] !== this.element[0] && !(/(fixed|absolute)/).test(helper.css("position"))) {
                helper.css("position", "absolute");
            }

            return helper;

        },

        _adjustOffsetFromHelper: function(obj) {
            if (typeof obj === "string") {
                obj = obj.split(" ");
            }
            if ($.isArray(obj)) {
                obj = {left: +obj[0], top: +obj[1] || 0};
            }
            if ("left" in obj) {
                this.offset.click.left = obj.left + this.margins.left;
            }
            if ("right" in obj) {
                this.offset.click.left = this.helperProportions.width - obj.right + this.margins.left;
            }
            if ("top" in obj) {
                this.offset.click.top = obj.top + this.margins.top;
            }
            if ("bottom" in obj) {
                this.offset.click.top = this.helperProportions.height - obj.bottom + this.margins.top;
            }
        },

        _getParentOffset: function() {

            //Get the offsetParent and cache its position
            var po = this.offsetParent.offset();

            // This is a special case where we need to modify a offset calculated on start, since the following happened:
            // 1. The position of the helper is absolute, so it's position is calculated based on the next positioned parent
            // 2. The actual offset parent is a child of the scroll parent, and the scroll parent isn't the document, which means that
            //    the scroll is included in the initial calculation of the offset of the parent, and never recalculated upon drag
            if(this.cssPosition === "absolute" && this.scrollParent[0] !== document && $.contains(this.scrollParent[0], this.offsetParent[0])) {
                po.left += this.scrollParent.scrollLeft();
                po.top += this.scrollParent.scrollTop();
            }

            //This needs to be actually done for all browsers, since pageX/pageY includes this information
            //Ugly IE fix
            if((this.offsetParent[0] === document.body) ||
                (this.offsetParent[0].tagName && this.offsetParent[0].tagName.toLowerCase() === "html" && $.ui.ie)) {
                po = { top: 0, left: 0 };
            }

            return {
                top: po.top + (parseInt(this.offsetParent.css("borderTopWidth"),10) || 0),
                left: po.left + (parseInt(this.offsetParent.css("borderLeftWidth"),10) || 0)
            };

        },

        _getRelativeOffset: function() {

            if(this.cssPosition === "relative") {
                var p = this.element.position();
                return {
                    top: p.top - (parseInt(this.helper.css("top"),10) || 0) + this.scrollParent.scrollTop(),
                    left: p.left - (parseInt(this.helper.css("left"),10) || 0) + this.scrollParent.scrollLeft()
                };
            } else {
                return { top: 0, left: 0 };
            }

        },

        _cacheMargins: function() {
            this.margins = {
                left: (parseInt(this.element.css("marginLeft"),10) || 0),
                top: (parseInt(this.element.css("marginTop"),10) || 0),
                right: (parseInt(this.element.css("marginRight"),10) || 0),
                bottom: (parseInt(this.element.css("marginBottom"),10) || 0)
            };
        },

        _cacheHelperProportions: function() {
            this.helperProportions = {
                width: this.helper.outerWidth(),
                height: this.helper.outerHeight()
            };
        },

        _setContainment: function() {

            var over, c, ce,
                o = this.options;

            if ( !o.containment ) {
                this.containment = null;
                return;
            }

            if ( o.containment === "window" ) {
                this.containment = [
                    $( window ).scrollLeft() - this.offset.relative.left - this.offset.parent.left,
                    $( window ).scrollTop() - this.offset.relative.top - this.offset.parent.top,
                    $( window ).scrollLeft() + $( window ).width() - this.helperProportions.width - this.margins.left,
                    $( window ).scrollTop() + ( $( window ).height() || document.body.parentNode.scrollHeight ) - this.helperProportions.height - this.margins.top
                ];
                return;
            }

            if ( o.containment === "document") {
                this.containment = [
                    0,
                    0,
                    $( document ).width() - this.helperProportions.width - this.margins.left,
                    ( $( document ).height() || document.body.parentNode.scrollHeight ) - this.helperProportions.height - this.margins.top
                ];
                return;
            }

            if ( o.containment.constructor === Array ) {
                this.containment = o.containment;
                return;
            }

            if ( o.containment === "parent" ) {
                o.containment = this.helper[ 0 ].parentNode;
            }

            c = $( o.containment );
            ce = c[ 0 ];

            if( !ce ) {
                return;
            }

            over = c.css( "overflow" ) !== "hidden";

            // Custom patch. Look to replace jquery-ui-custom with CoralUI.
            this.containment = [
                ( parseInt( c.css( "borderLeftWidth" ), 10 ) || 0 ) + ( parseInt( c.css( "paddingLeft" ), 10 ) || 0 ),
                ( parseInt( c.css( "borderTopWidth" ), 10 ) || 0 ) + ( parseInt( c.css( "paddingTop" ), 10 ) || 0 ) ,
                ( over ? Math.max( ce.scrollWidth, ce.offsetWidth ) : ce.offsetWidth ) - ( parseInt( c.css( "borderRightWidth" ), 10 ) || 0 ) - ( parseInt( c.css( "paddingRight" ), 10 ) || 0 ) - this.helperProportions.width - this.margins.left - this.margins.right,
                ( over ? Math.max(
                    Math.max(ce.scrollHeight, document.documentElement.scrollHeight),
                    Math.max(ce.offsetHeight, document.documentElement.offsetHeight),
                    Math.max(ce.clientHeight, document.documentElement.clientHeight)
                ) : ce.offsetHeight ) - ( parseInt( c.css( "borderBottomWidth" ), 10 ) || 0 ) - ( parseInt( c.css( "paddingBottom" ), 10 ) || 0 ) - this.helperProportions.height - this.margins.top  - this.margins.bottom
            ];
            this.relative_container = c;
        },

        _convertPositionTo: function(d, pos) {

            if(!pos) {
                pos = this.position;
            }

            var mod = d === "absolute" ? 1 : -1,
                scroll = this.cssPosition === "absolute" && !( this.scrollParent[ 0 ] !== document && $.contains( this.scrollParent[ 0 ], this.offsetParent[ 0 ] ) ) ? this.offsetParent : this.scrollParent;

            //Cache the scroll
            if (!this.offset.scroll) {
                this.offset.scroll = {top : scroll.scrollTop(), left : scroll.scrollLeft()};
            }

            return {
                top: (
                    pos.top	+																// The absolute mouse position
                        this.offset.relative.top * mod +										// Only for relative positioned nodes: Relative offset from element to offset parent
                        this.offset.parent.top * mod -										// The offsetParent's offset without borders (offset + border)
                        ( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollTop() : this.offset.scroll.top ) * mod )
                    ),
                left: (
                    pos.left +																// The absolute mouse position
                        this.offset.relative.left * mod +										// Only for relative positioned nodes: Relative offset from element to offset parent
                        this.offset.parent.left * mod	-										// The offsetParent's offset without borders (offset + border)
                        ( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollLeft() : this.offset.scroll.left ) * mod )
                    )
            };

        },

        _generatePosition: function(event) {

            var containment, co, top, left,
                o = this.options,
                scroll = this.cssPosition === "absolute" && !( this.scrollParent[ 0 ] !== document && $.contains( this.scrollParent[ 0 ], this.offsetParent[ 0 ] ) ) ? this.offsetParent : this.scrollParent,
                pageX = event.pageX,
                pageY = event.pageY;

            //Cache the scroll
            if (!this.offset.scroll) {
                this.offset.scroll = {top : scroll.scrollTop(), left : scroll.scrollLeft()};
            }

            /*
             * - Position constraining -
             * Constrain the position to a mix of grid, containment.
             */

            // If we are not dragging yet, we won't check for options
            if ( this.originalPosition ) {
                if ( this.containment ) {
                    if ( this.relative_container ){
                        co = this.relative_container.offset();
                        containment = [
                            this.containment[ 0 ] + co.left,
                            this.containment[ 1 ] + co.top,
                            this.containment[ 2 ] + co.left,
                            this.containment[ 3 ] + co.top
                        ];
                    }
                    else {
                        containment = this.containment;
                    }

                    if(event.pageX - this.offset.click.left < containment[0]) {
                        pageX = containment[0] + this.offset.click.left;
                    }
                    if(event.pageY - this.offset.click.top < containment[1]) {
                        pageY = containment[1] + this.offset.click.top;
                    }
                    if(event.pageX - this.offset.click.left > containment[2]) {
                        pageX = containment[2] + this.offset.click.left;
                    }
                    if(event.pageY - this.offset.click.top > containment[3]) {
                        pageY = containment[3] + this.offset.click.top;
                    }
                }

                if(o.grid) {
                    //Check for grid elements set to 0 to prevent divide by 0 error causing invalid argument errors in IE (see ticket #6950)
                    top = o.grid[1] ? this.originalPageY + Math.round((pageY - this.originalPageY) / o.grid[1]) * o.grid[1] : this.originalPageY;
                    pageY = containment ? ((top - this.offset.click.top >= containment[1] || top - this.offset.click.top > containment[3]) ? top : ((top - this.offset.click.top >= containment[1]) ? top - o.grid[1] : top + o.grid[1])) : top;

                    left = o.grid[0] ? this.originalPageX + Math.round((pageX - this.originalPageX) / o.grid[0]) * o.grid[0] : this.originalPageX;
                    pageX = containment ? ((left - this.offset.click.left >= containment[0] || left - this.offset.click.left > containment[2]) ? left : ((left - this.offset.click.left >= containment[0]) ? left - o.grid[0] : left + o.grid[0])) : left;
                }

            }

            return {
                top: (
                    pageY -																	// The absolute mouse position
                        this.offset.click.top	-												// Click offset (relative to the element)
                        this.offset.relative.top -												// Only for relative positioned nodes: Relative offset from element to offset parent
                        this.offset.parent.top +												// The offsetParent's offset without borders (offset + border)
                        ( this.cssPosition === "fixed" ? -this.scrollParent.scrollTop() : this.offset.scroll.top )
                    ),
                left: (
                    pageX -																	// The absolute mouse position
                        this.offset.click.left -												// Click offset (relative to the element)
                        this.offset.relative.left -												// Only for relative positioned nodes: Relative offset from element to offset parent
                        this.offset.parent.left +												// The offsetParent's offset without borders (offset + border)
                        ( this.cssPosition === "fixed" ? -this.scrollParent.scrollLeft() : this.offset.scroll.left )
                    )
            };

        },

        _clear: function() {
            this.helper.removeClass("ui-draggable-dragging");
            if(this.helper[0] !== this.element[0] && !this.cancelHelperRemoval) {
                this.helper.remove();
            }
            this.helper = null;
            this.cancelHelperRemoval = false;
        },

        // From now on bulk stuff - mainly helpers

        _trigger: function(type, event, ui) {
            ui = ui || this._uiHash();
            $.ui.plugin.call(this, type, [event, ui]);
            //The absolute position has to be recalculated after plugins
            if(type === "drag") {
                this.positionAbs = this._convertPositionTo("absolute");
            }
            return $.Widget.prototype._trigger.call(this, type, event, ui);
        },

        plugins: {},

        _uiHash: function() {
            return {
                helper: this.helper,
                position: this.position,
                originalPosition: this.originalPosition,
                offset: this.positionAbs
            };
        }

    });

    $.ui.plugin.add("draggable", "connectToSortable", {
        start: function(event, ui) {

            var inst = $(this).data("ui-draggable"), o = inst.options,
                uiSortable = $.extend({}, ui, { item: inst.element });
            inst.sortables = [];
            $(o.connectToSortable).each(function() {
                var sortable = $.data(this, "ui-sortable");
                if (sortable && !sortable.options.disabled) {
                    inst.sortables.push({
                        instance: sortable,
                        shouldRevert: sortable.options.revert
                    });
                    sortable.refreshPositions();	// Call the sortable's refreshPositions at drag start to refresh the containerCache since the sortable container cache is used in drag and needs to be up to date (this will ensure it's initialised as well as being kept in step with any changes that might have happened on the page).
                    sortable._trigger("activate", event, uiSortable);
                }
            });

        },
        stop: function(event, ui) {

            //If we are still over the sortable, we fake the stop event of the sortable, but also remove helper
            var inst = $(this).data("ui-draggable"),
                uiSortable = $.extend({}, ui, { item: inst.element });

            $.each(inst.sortables, function() {
                if(this.instance.isOver) {

                    this.instance.isOver = 0;

                    inst.cancelHelperRemoval = true; //Don't remove the helper in the draggable instance
                    this.instance.cancelHelperRemoval = false; //Remove it in the sortable instance (so sortable plugins like revert still work)

                    //The sortable revert is supported, and we have to set a temporary dropped variable on the draggable to support revert: "valid/invalid"
                    if(this.shouldRevert) {
                        this.instance.options.revert = this.shouldRevert;
                    }

                    //Trigger the stop of the sortable
                    this.instance._mouseStop(event);

                    this.instance.options.helper = this.instance.options._helper;

                    //If the helper has been the original item, restore properties in the sortable
                    if(inst.options.helper === "original") {
                        this.instance.currentItem.css({ top: "auto", left: "auto" });
                    }

                } else {
                    this.instance.cancelHelperRemoval = false; //Remove the helper in the sortable instance
                    this.instance._trigger("deactivate", event, uiSortable);
                }

            });

        },
        drag: function(event, ui) {

            var inst = $(this).data("ui-draggable"), that = this;

            $.each(inst.sortables, function() {

                var innermostIntersecting = false,
                    thisSortable = this;

                //Copy over some variables to allow calling the sortable's native _intersectsWith
                this.instance.positionAbs = inst.positionAbs;
                this.instance.helperProportions = inst.helperProportions;
                this.instance.offset.click = inst.offset.click;

                if(this.instance._intersectsWith(this.instance.containerCache)) {
                    innermostIntersecting = true;
                    $.each(inst.sortables, function () {
                        this.instance.positionAbs = inst.positionAbs;
                        this.instance.helperProportions = inst.helperProportions;
                        this.instance.offset.click = inst.offset.click;
                        if (this !== thisSortable &&
                            this.instance._intersectsWith(this.instance.containerCache) &&
                            $.contains(thisSortable.instance.element[0], this.instance.element[0])
                            ) {
                            innermostIntersecting = false;
                        }
                        return innermostIntersecting;
                    });
                }


                if(innermostIntersecting) {
                    //If it intersects, we use a little isOver variable and set it once, so our move-in stuff gets fired only once
                    if(!this.instance.isOver) {

                        this.instance.isOver = 1;
                        //Now we fake the start of dragging for the sortable instance,
                        //by cloning the list group item, appending it to the sortable and using it as inst.currentItem
                        //We can then fire the start event of the sortable with our passed browser event, and our own helper (so it doesn't create a new one)
                        this.instance.currentItem = $(that).clone().removeAttr("id").appendTo(this.instance.element).data("ui-sortable-item", true);
                        this.instance.options._helper = this.instance.options.helper; //Store helper option to later restore it
                        this.instance.options.helper = function() { return ui.helper[0]; };

                        event.target = this.instance.currentItem[0];
                        this.instance._mouseCapture(event, true);
                        this.instance._mouseStart(event, true, true);

                        //Because the browser event is way off the new appended portlet, we modify a couple of variables to reflect the changes
                        this.instance.offset.click.top = inst.offset.click.top;
                        this.instance.offset.click.left = inst.offset.click.left;
                        this.instance.offset.parent.left -= inst.offset.parent.left - this.instance.offset.parent.left;
                        this.instance.offset.parent.top -= inst.offset.parent.top - this.instance.offset.parent.top;

                        inst._trigger("toSortable", event);
                        inst.dropped = this.instance.element; //draggable revert needs that
                        //hack so receive/update callbacks work (mostly)
                        inst.currentItem = inst.element;
                        this.instance.fromOutside = inst;

                    }

                    //Provided we did all the previous steps, we can fire the drag event of the sortable on every draggable drag, when it intersects with the sortable
                    if(this.instance.currentItem) {
                        this.instance._mouseDrag(event);
                    }

                } else {

                    //If it doesn't intersect with the sortable, and it intersected before,
                    //we fake the drag stop of the sortable, but make sure it doesn't remove the helper by using cancelHelperRemoval
                    if(this.instance.isOver) {

                        this.instance.isOver = 0;
                        this.instance.cancelHelperRemoval = true;

                        //Prevent reverting on this forced stop
                        this.instance.options.revert = false;

                        // The out event needs to be triggered independently
                        this.instance._trigger("out", event, this.instance._uiHash(this.instance));

                        this.instance._mouseStop(event, true);
                        this.instance.options.helper = this.instance.options._helper;

                        //Now we remove our currentItem, the list group clone again, and the placeholder, and animate the helper back to it's original size
                        this.instance.currentItem.remove();
                        if(this.instance.placeholder) {
                            this.instance.placeholder.remove();
                        }

                        inst._trigger("fromSortable", event);
                        inst.dropped = false; //draggable revert needs that
                    }

                }

            });

        }
    });

    $.ui.plugin.add("draggable", "cursor", {
        start: function() {
            var t = $("body"), o = $(this).data("ui-draggable").options;
            if (t.css("cursor")) {
                o._cursor = t.css("cursor");
            }
            t.css("cursor", o.cursor);
        },
        stop: function() {
            var o = $(this).data("ui-draggable").options;
            if (o._cursor) {
                $("body").css("cursor", o._cursor);
            }
        }
    });

    $.ui.plugin.add("draggable", "opacity", {
        start: function(event, ui) {
            var t = $(ui.helper), o = $(this).data("ui-draggable").options;
            if(t.css("opacity")) {
                o._opacity = t.css("opacity");
            }
            t.css("opacity", o.opacity);
        },
        stop: function(event, ui) {
            var o = $(this).data("ui-draggable").options;
            if(o._opacity) {
                $(ui.helper).css("opacity", o._opacity);
            }
        }
    });

    $.ui.plugin.add("draggable", "scroll", {
        start: function() {
            var i = $(this).data("ui-draggable");
            if(i.scrollParent[0] !== document && i.scrollParent[0].tagName !== "HTML") {
                i.overflowOffset = i.scrollParent.offset();
            }
        },
        drag: function( event ) {

            var i = $(this).data("ui-draggable"), o = i.options, scrolled = false;

            if(i.scrollParent[0] !== document && i.scrollParent[0].tagName !== "HTML") {

                if(!o.axis || o.axis !== "x") {
                    if((i.overflowOffset.top + i.scrollParent[0].offsetHeight) - event.pageY < o.scrollSensitivity) {
                        i.scrollParent[0].scrollTop = scrolled = i.scrollParent[0].scrollTop + o.scrollSpeed;
                    } else if(event.pageY - i.overflowOffset.top < o.scrollSensitivity) {
                        i.scrollParent[0].scrollTop = scrolled = i.scrollParent[0].scrollTop - o.scrollSpeed;
                    }
                }

                if(!o.axis || o.axis !== "y") {
                    if((i.overflowOffset.left + i.scrollParent[0].offsetWidth) - event.pageX < o.scrollSensitivity) {
                        i.scrollParent[0].scrollLeft = scrolled = i.scrollParent[0].scrollLeft + o.scrollSpeed;
                    } else if(event.pageX - i.overflowOffset.left < o.scrollSensitivity) {
                        i.scrollParent[0].scrollLeft = scrolled = i.scrollParent[0].scrollLeft - o.scrollSpeed;
                    }
                }

            } else {

                if(!o.axis || o.axis !== "x") {
                    if(event.pageY - $(document).scrollTop() < o.scrollSensitivity) {
                        scrolled = $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
                    } else if($(window).height() - (event.pageY - $(document).scrollTop()) < o.scrollSensitivity) {
                        scrolled = $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);
                    }
                }

                if(!o.axis || o.axis !== "y") {
                    if(event.pageX - $(document).scrollLeft() < o.scrollSensitivity) {
                        scrolled = $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
                    } else if($(window).width() - (event.pageX - $(document).scrollLeft()) < o.scrollSensitivity) {
                        scrolled = $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);
                    }
                }

            }

            if(scrolled !== false && $.ui.ddmanager && !o.dropBehaviour) {
                $.ui.ddmanager.prepareOffsets(i, event);
            }

        }
    });

    $.ui.plugin.add("draggable", "snap", {
        start: function() {

            var i = $(this).data("ui-draggable"),
                o = i.options;

            i.snapElements = [];

            $(o.snap.constructor !== String ? ( o.snap.items || ":data(ui-draggable)" ) : o.snap).each(function() {
                var $t = $(this),
                    $o = $t.offset();
                if(this !== i.element[0]) {
                    i.snapElements.push({
                        item: this,
                        width: $t.outerWidth(), height: $t.outerHeight(),
                        top: $o.top, left: $o.left
                    });
                }
            });

        },
        drag: function(event, ui) {

            var ts, bs, ls, rs, l, r, t, b, i, first,
                inst = $(this).data("ui-draggable"),
                o = inst.options,
                d = o.snapTolerance,
                x1 = ui.offset.left, x2 = x1 + inst.helperProportions.width,
                y1 = ui.offset.top, y2 = y1 + inst.helperProportions.height;

            for (i = inst.snapElements.length - 1; i >= 0; i--){

                l = inst.snapElements[i].left;
                r = l + inst.snapElements[i].width;
                t = inst.snapElements[i].top;
                b = t + inst.snapElements[i].height;

                if ( x2 < l - d || x1 > r + d || y2 < t - d || y1 > b + d || !$.contains( inst.snapElements[ i ].item.ownerDocument, inst.snapElements[ i ].item ) ) {
                    if(inst.snapElements[i].snapping) {
                        (inst.options.snap.release && inst.options.snap.release.call(inst.element, event, $.extend(inst._uiHash(), { snapItem: inst.snapElements[i].item })));
                    }
                    inst.snapElements[i].snapping = false;
                    continue;
                }

                if(o.snapMode !== "inner") {
                    ts = Math.abs(t - y2) <= d;
                    bs = Math.abs(b - y1) <= d;
                    ls = Math.abs(l - x2) <= d;
                    rs = Math.abs(r - x1) <= d;
                    if(ts) {
                        ui.position.top = inst._convertPositionTo("relative", { top: t - inst.helperProportions.height, left: 0 }).top - inst.margins.top;
                    }
                    if(bs) {
                        ui.position.top = inst._convertPositionTo("relative", { top: b, left: 0 }).top - inst.margins.top;
                    }
                    if(ls) {
                        ui.position.left = inst._convertPositionTo("relative", { top: 0, left: l - inst.helperProportions.width }).left - inst.margins.left;
                    }
                    if(rs) {
                        ui.position.left = inst._convertPositionTo("relative", { top: 0, left: r }).left - inst.margins.left;
                    }
                }

                first = (ts || bs || ls || rs);

                if(o.snapMode !== "outer") {
                    ts = Math.abs(t - y1) <= d;
                    bs = Math.abs(b - y2) <= d;
                    ls = Math.abs(l - x1) <= d;
                    rs = Math.abs(r - x2) <= d;
                    if(ts) {
                        ui.position.top = inst._convertPositionTo("relative", { top: t, left: 0 }).top - inst.margins.top;
                    }
                    if(bs) {
                        ui.position.top = inst._convertPositionTo("relative", { top: b - inst.helperProportions.height, left: 0 }).top - inst.margins.top;
                    }
                    if(ls) {
                        ui.position.left = inst._convertPositionTo("relative", { top: 0, left: l }).left - inst.margins.left;
                    }
                    if(rs) {
                        ui.position.left = inst._convertPositionTo("relative", { top: 0, left: r - inst.helperProportions.width }).left - inst.margins.left;
                    }
                }

                if(!inst.snapElements[i].snapping && (ts || bs || ls || rs || first)) {
                    (inst.options.snap.snap && inst.options.snap.snap.call(inst.element, event, $.extend(inst._uiHash(), { snapItem: inst.snapElements[i].item })));
                }
                inst.snapElements[i].snapping = (ts || bs || ls || rs || first);

            }

        }
    });

    $.ui.plugin.add("draggable", "stack", {
        start: function() {
            var min,
                o = this.data("ui-draggable").options,
                group = $.makeArray($(o.stack)).sort(function(a,b) {
                    return (parseInt($(a).css("zIndex"),10) || 0) - (parseInt($(b).css("zIndex"),10) || 0);
                });

            if (!group.length) { return; }

            min = parseInt($(group[0]).css("zIndex"), 10) || 0;
            $(group).each(function(i) {
                $(this).css("zIndex", min + i);
            });
            this.css("zIndex", (min + group.length));
        }
    });

    $.ui.plugin.add("draggable", "zIndex", {
        start: function(event, ui) {
            var t = $(ui.helper), o = $(this).data("ui-draggable").options;
            if(t.css("zIndex")) {
                o._zIndex = t.css("zIndex");
            }
            t.css("zIndex", o.zIndex);
        },
        stop: function(event, ui) {
            var o = $(this).data("ui-draggable").options;
            if(o._zIndex) {
                $(ui.helper).css("zIndex", o._zIndex);
            }
        }
    });

})(jQuery);
(function( $, undefined ) {

    function isOverAxis( x, reference, size ) {
        return ( x > reference ) && ( x < ( reference + size ) );
    }

    $.widget("ui.droppable", {
        version: "1.10.3",
        widgetEventPrefix: "drop",
        options: {
            accept: "*",
            activeClass: false,
            addClasses: true,
            greedy: false,
            hoverClass: false,
            scope: "default",
            tolerance: "intersect",

            // callbacks
            activate: null,
            deactivate: null,
            drop: null,
            out: null,
            over: null
        },
        _create: function() {

            var o = this.options,
                accept = o.accept;

            this.isover = false;
            this.isout = true;

            this.accept = $.isFunction(accept) ? accept : function(d) {
                return d.is(accept);
            };

            //Store the droppable's proportions
            this.proportions = { width: this.element[0].offsetWidth, height: this.element[0].offsetHeight };

            // Add the reference and positions to the manager
            $.ui.ddmanager.droppables[o.scope] = $.ui.ddmanager.droppables[o.scope] || [];
            $.ui.ddmanager.droppables[o.scope].push(this);

            (o.addClasses && this.element.addClass("ui-droppable"));

        },

        _destroy: function() {
            var i = 0,
                drop = $.ui.ddmanager.droppables[this.options.scope];

            for ( ; i < drop.length; i++ ) {
                if ( drop[i] === this ) {
                    drop.splice(i, 1);
                }
            }

            this.element.removeClass("ui-droppable ui-droppable-disabled");
        },

        _setOption: function(key, value) {

            if(key === "accept") {
                this.accept = $.isFunction(value) ? value : function(d) {
                    return d.is(value);
                };
            }
            $.Widget.prototype._setOption.apply(this, arguments);
        },

        _activate: function(event) {
            var draggable = $.ui.ddmanager.current;
            if(this.options.activeClass) {
                this.element.addClass(this.options.activeClass);
            }
            if(draggable){
                this._trigger("activate", event, this.ui(draggable));
            }
        },

        _deactivate: function(event) {
            var draggable = $.ui.ddmanager.current;
            if(this.options.activeClass) {
                this.element.removeClass(this.options.activeClass);
            }
            if(draggable){
                this._trigger("deactivate", event, this.ui(draggable));
            }
        },

        _over: function(event) {

            var draggable = $.ui.ddmanager.current;

            // Bail if draggable and droppable are same element
            if (!draggable || (draggable.currentItem || draggable.element)[0] === this.element[0]) {
                return;
            }

            if (this.accept.call(this.element[0],(draggable.currentItem || draggable.element))) {
                if(this.options.hoverClass) {
                    this.element.addClass(this.options.hoverClass);
                }
                this._trigger("over", event, this.ui(draggable));
            }

        },

        _out: function(event) {

            var draggable = $.ui.ddmanager.current;

            // Bail if draggable and droppable are same element
            if (!draggable || (draggable.currentItem || draggable.element)[0] === this.element[0]) {
                return;
            }

            if (this.accept.call(this.element[0],(draggable.currentItem || draggable.element))) {
                if(this.options.hoverClass) {
                    this.element.removeClass(this.options.hoverClass);
                }
                this._trigger("out", event, this.ui(draggable));
            }

        },

        _drop: function(event,custom) {

            var draggable = custom || $.ui.ddmanager.current,
                childrenIntersection = false;

            // Bail if draggable and droppable are same element
            if (!draggable || (draggable.currentItem || draggable.element)[0] === this.element[0]) {
                return false;
            }

            this.element.find(":data(ui-droppable)").not(".ui-draggable-dragging").each(function() {
                var inst = $.data(this, "ui-droppable");
                if(
                    inst.options.greedy &&
                        !inst.options.disabled &&
                        inst.options.scope === draggable.options.scope &&
                        inst.accept.call(inst.element[0], (draggable.currentItem || draggable.element)) &&
                        $.ui.intersect(draggable, $.extend(inst, { offset: inst.element.offset() }), inst.options.tolerance)
                    ) { childrenIntersection = true; return false; }
            });
            if(childrenIntersection) {
                return false;
            }

            if(this.accept.call(this.element[0],(draggable.currentItem || draggable.element))) {
                if(this.options.activeClass) {
                    this.element.removeClass(this.options.activeClass);
                }
                if(this.options.hoverClass) {
                    this.element.removeClass(this.options.hoverClass);
                }
                this._trigger("drop", event, this.ui(draggable));
                return this.element;
            }

            return false;

        },

        ui: function(c) {
            return {
                draggable: (c.currentItem || c.element),
                helper: c.helper,
                position: c.position,
                offset: c.positionAbs
            };
        }

    });

    $.ui.intersect = function(draggable, droppable, toleranceMode) {

        if (!droppable.offset) {
            return false;
        }

        var draggableLeft, draggableTop,
            x1 = (draggable.positionAbs || draggable.position.absolute).left, x2 = x1 + draggable.helperProportions.width,
            y1 = (draggable.positionAbs || draggable.position.absolute).top, y2 = y1 + draggable.helperProportions.height,
            l = droppable.offset.left, r = l + droppable.proportions.width,
            t = droppable.offset.top, b = t + droppable.proportions.height;

        switch (toleranceMode) {
            case "fit":
                return (l <= x1 && x2 <= r && t <= y1 && y2 <= b);
            case "intersect":
                return (l < x1 + (draggable.helperProportions.width / 2) && // Right Half
                    x2 - (draggable.helperProportions.width / 2) < r && // Left Half
                    t < y1 + (draggable.helperProportions.height / 2) && // Bottom Half
                    y2 - (draggable.helperProportions.height / 2) < b ); // Top Half
            case "pointer":
                draggableLeft = ((draggable.positionAbs || draggable.position.absolute).left + (draggable.clickOffset || draggable.offset.click).left);
                draggableTop = ((draggable.positionAbs || draggable.position.absolute).top + (draggable.clickOffset || draggable.offset.click).top);
                return isOverAxis( draggableTop, t, droppable.proportions.height ) && isOverAxis( draggableLeft, l, droppable.proportions.width );
            case "touch":
                return (
                    (y1 >= t && y1 <= b) ||	// Top edge touching
                        (y2 >= t && y2 <= b) ||	// Bottom edge touching
                        (y1 < t && y2 > b)		// Surrounded vertically
                    ) && (
                    (x1 >= l && x1 <= r) ||	// Left edge touching
                        (x2 >= l && x2 <= r) ||	// Right edge touching
                        (x1 < l && x2 > r)		// Surrounded horizontally
                    );
            default:
                return false;
        }

    };

    /*
     This manager tracks offsets of draggables and droppables
     */
    $.ui.ddmanager = {
        current: null,
        droppables: { "default": [] },
        prepareOffsets: function(t, event) {

            var i, j,
                m = $.ui.ddmanager.droppables[t.options.scope] || [],
                type = event ? event.type : null, // workaround for #2317
                list = (t.currentItem || t.element).find(":data(ui-droppable)").addBack();

            droppablesLoop: for (i = 0; i < m.length; i++) {

                //No disabled and non-accepted
                if(m[i].options.disabled || (t && !m[i].accept.call(m[i].element[0],(t.currentItem || t.element)))) {
                    continue;
                }

                // Filter out elements in the current dragged item
                for (j=0; j < list.length; j++) {
                    if(list[j] === m[i].element[0]) {
                        m[i].proportions.height = 0;
                        continue droppablesLoop;
                    }
                }

                m[i].visible = m[i].element.css("display") !== "none";
                if(!m[i].visible) {
                    continue;
                }

                //Activate the droppable if used directly from draggables
                if(type === "mousedown") {
                    m[i]._activate.call(m[i], event);
                }

                m[i].offset = m[i].element.offset();
                m[i].proportions = { width: m[i].element[0].offsetWidth, height: m[i].element[0].offsetHeight };

            }

        },
        drop: function(draggable, event) {

            var dropped = false;
            // Create a copy of the droppables in case the list changes during the drop (#9116)
            $.each(($.ui.ddmanager.droppables[draggable.options.scope] || []).slice(), function() {

                if(!this.options) {
                    return;
                }
                if (!this.options.disabled && this.visible && $.ui.intersect(draggable, this, this.options.tolerance)) {
                    dropped = this._drop.call(this, event) || dropped;
                }

                if (!this.options.disabled && this.visible && this.accept.call(this.element[0],(draggable.currentItem || draggable.element))) {
                    this.isout = true;
                    this.isover = false;
                    this._deactivate.call(this, event);
                }

            });
            return dropped;

        },
        dragStart: function( draggable, event ) {
            //Listen for scrolling so that if the dragging causes scrolling the position of the droppables can be recalculated (see #5003)
            draggable.element.parentsUntil( "body" ).bind( "scroll.droppable", function() {
                if( !draggable.options.refreshPositions ) {
                    $.ui.ddmanager.prepareOffsets( draggable, event );
                }
            });
        },
        drag: function(draggable, event) {

            //If you have a highly dynamic page, you might try this option. It renders positions every time you move the mouse.
            if(draggable.options.refreshPositions) {
                $.ui.ddmanager.prepareOffsets(draggable, event);
            }

            //Run through all droppables and check their positions based on specific tolerance options
            $.each($.ui.ddmanager.droppables[draggable.options.scope] || [], function() {

                if(this.options.disabled || this.greedyChild || !this.visible) {
                    return;
                }

                var parentInstance, scope, parent,
                    intersects = $.ui.intersect(draggable, this, this.options.tolerance),
                    c = !intersects && this.isover ? "isout" : (intersects && !this.isover ? "isover" : null);
                if(!c) {
                    return;
                }

                if (this.options.greedy) {
                    // find droppable parents with same scope
                    scope = this.options.scope;
                    parent = this.element.parents(":data(ui-droppable)").filter(function () {
                        return $.data(this, "ui-droppable").options.scope === scope;
                    });

                    if (parent.length) {
                        parentInstance = $.data(parent[0], "ui-droppable");
                        parentInstance.greedyChild = (c === "isover");
                    }
                }

                // we just moved into a greedy child
                if (parentInstance && c === "isover") {
                    parentInstance.isover = false;
                    parentInstance.isout = true;
                    parentInstance._out.call(parentInstance, event);
                }

                this[c] = true;
                this[c === "isout" ? "isover" : "isout"] = false;
                this[c === "isover" ? "_over" : "_out"].call(this, event);

                // we just moved out of a greedy child
                if (parentInstance && c === "isout") {
                    parentInstance.isout = false;
                    parentInstance.isover = true;
                    parentInstance._over.call(parentInstance, event);
                }
            });

        },
        dragStop: function( draggable, event ) {
            draggable.element.parentsUntil( "body" ).unbind( "scroll.droppable" );
            //Call prepareOffsets one final time since IE does not fire return scroll events when overflow was caused by drag (see #5003)
            if( !draggable.options.refreshPositions ) {
                $.ui.ddmanager.prepareOffsets( draggable, event );
            }
        }
    };

})(jQuery);
(function( $, undefined ) {

    $.widget("ui.selectable", $.ui.mouse, {
        version: "1.10.3",
        options: {
            appendTo: "body",
            autoRefresh: true,
            distance: 0,
            filter: "*",
            tolerance: "touch",

            // callbacks
            selected: null,
            selecting: null,
            start: null,
            stop: null,
            unselected: null,
            unselecting: null
        },
        _create: function() {
            var selectees,
                that = this;

            this.element.addClass("ui-selectable");

            this.dragged = false;

            // cache selectee children based on filter
            this.refresh = function() {
                selectees = $(that.options.filter, that.element[0]);
                selectees.addClass("ui-selectee");
                selectees.each(function() {
                    var $this = $(this),
                        pos = $this.offset();
                    $.data(this, "selectable-item", {
                        element: this,
                        $element: $this,
                        left: pos.left,
                        top: pos.top,
                        right: pos.left + $this.outerWidth(),
                        bottom: pos.top + $this.outerHeight(),
                        startselected: false,
                        selected: $this.hasClass("ui-selected"),
                        selecting: $this.hasClass("ui-selecting"),
                        unselecting: $this.hasClass("ui-unselecting")
                    });
                });
            };
            this.refresh();

            this.selectees = selectees.addClass("ui-selectee");

            this._mouseInit();

            this.helper = $("<div class='ui-selectable-helper'></div>");
        },

        _destroy: function() {
            this.selectees
                .removeClass("ui-selectee")
                .removeData("selectable-item");
            this.element
                .removeClass("ui-selectable ui-selectable-disabled");
            this._mouseDestroy();
        },

        _mouseStart: function(event) {
            var that = this,
                options = this.options;

            this.opos = [event.pageX, event.pageY];

            if (this.options.disabled) {
                return;
            }

            this.selectees = $(options.filter, this.element[0]);

            this._trigger("start", event);

            $(options.appendTo).append(this.helper);
            // position helper (lasso)
            this.helper.css({
                "left": event.pageX,
                "top": event.pageY,
                "width": 0,
                "height": 0
            });

            if (options.autoRefresh) {
                this.refresh();
            }

            this.selectees.filter(".ui-selected").each(function() {
                var selectee = $.data(this, "selectable-item");
                selectee.startselected = true;
                if (!event.metaKey && !event.ctrlKey) {
                    selectee.$element.removeClass("ui-selected");
                    selectee.selected = false;
                    selectee.$element.addClass("ui-unselecting");
                    selectee.unselecting = true;
                    // selectable UNSELECTING callback
                    that._trigger("unselecting", event, {
                        unselecting: selectee.element
                    });
                }
            });

            $(event.target).parents().addBack().each(function() {
                var doSelect,
                    selectee = $.data(this, "selectable-item");
                if (selectee) {
                    doSelect = (!event.metaKey && !event.ctrlKey) || !selectee.$element.hasClass("ui-selected");
                    selectee.$element
                        .removeClass(doSelect ? "ui-unselecting" : "ui-selected")
                        .addClass(doSelect ? "ui-selecting" : "ui-unselecting");
                    selectee.unselecting = !doSelect;
                    selectee.selecting = doSelect;
                    selectee.selected = doSelect;
                    // selectable (UN)SELECTING callback
                    if (doSelect) {
                        that._trigger("selecting", event, {
                            selecting: selectee.element
                        });
                    } else {
                        that._trigger("unselecting", event, {
                            unselecting: selectee.element
                        });
                    }
                    return false;
                }
            });

        },

        _mouseDrag: function(event) {

            this.dragged = true;

            if (this.options.disabled) {
                return;
            }

            var tmp,
                that = this,
                options = this.options,
                x1 = this.opos[0],
                y1 = this.opos[1],
                x2 = event.pageX,
                y2 = event.pageY;

            if (x1 > x2) { tmp = x2; x2 = x1; x1 = tmp; }
            if (y1 > y2) { tmp = y2; y2 = y1; y1 = tmp; }
            this.helper.css({left: x1, top: y1, width: x2-x1, height: y2-y1});

            this.selectees.each(function() {
                var selectee = $.data(this, "selectable-item"),
                    hit = false;

                //prevent helper from being selected if appendTo: selectable
                if (!selectee || selectee.element === that.element[0]) {
                    return;
                }

                if (options.tolerance === "touch") {
                    hit = ( !(selectee.left > x2 || selectee.right < x1 || selectee.top > y2 || selectee.bottom < y1) );
                } else if (options.tolerance === "fit") {
                    hit = (selectee.left > x1 && selectee.right < x2 && selectee.top > y1 && selectee.bottom < y2);
                }

                if (hit) {
                    // SELECT
                    if (selectee.selected) {
                        selectee.$element.removeClass("ui-selected");
                        selectee.selected = false;
                    }
                    if (selectee.unselecting) {
                        selectee.$element.removeClass("ui-unselecting");
                        selectee.unselecting = false;
                    }
                    if (!selectee.selecting) {
                        selectee.$element.addClass("ui-selecting");
                        selectee.selecting = true;
                        // selectable SELECTING callback
                        that._trigger("selecting", event, {
                            selecting: selectee.element
                        });
                    }
                } else {
                    // UNSELECT
                    if (selectee.selecting) {
                        if ((event.metaKey || event.ctrlKey) && selectee.startselected) {
                            selectee.$element.removeClass("ui-selecting");
                            selectee.selecting = false;
                            selectee.$element.addClass("ui-selected");
                            selectee.selected = true;
                        } else {
                            selectee.$element.removeClass("ui-selecting");
                            selectee.selecting = false;
                            if (selectee.startselected) {
                                selectee.$element.addClass("ui-unselecting");
                                selectee.unselecting = true;
                            }
                            // selectable UNSELECTING callback
                            that._trigger("unselecting", event, {
                                unselecting: selectee.element
                            });
                        }
                    }
                    if (selectee.selected) {
                        if (!event.metaKey && !event.ctrlKey && !selectee.startselected) {
                            selectee.$element.removeClass("ui-selected");
                            selectee.selected = false;

                            selectee.$element.addClass("ui-unselecting");
                            selectee.unselecting = true;
                            // selectable UNSELECTING callback
                            that._trigger("unselecting", event, {
                                unselecting: selectee.element
                            });
                        }
                    }
                }
            });

            return false;
        },

        _mouseStop: function(event) {
            var that = this;

            this.dragged = false;

            $(".ui-unselecting", this.element[0]).each(function() {
                var selectee = $.data(this, "selectable-item");
                selectee.$element.removeClass("ui-unselecting");
                selectee.unselecting = false;
                selectee.startselected = false;
                that._trigger("unselected", event, {
                    unselected: selectee.element
                });
            });
            $(".ui-selecting", this.element[0]).each(function() {
                var selectee = $.data(this, "selectable-item");
                selectee.$element.removeClass("ui-selecting").addClass("ui-selected");
                selectee.selecting = false;
                selectee.selected = true;
                selectee.startselected = true;
                that._trigger("selected", event, {
                    selected: selectee.element
                });
            });
            this._trigger("stop", event);

            this.helper.remove();

            return false;
        }

    });

})(jQuery);
(function( $, undefined ) {

    /*jshint loopfunc: true */

    function isOverAxis( x, reference, size ) {
        return ( x > reference ) && ( x < ( reference + size ) );
    }

    function isFloating(item) {
        return (/left|right/).test(item.css("float")) || (/inline|table-cell/).test(item.css("display"));
    }

    $.widget("ui.sortable", $.ui.mouse, {
        version: "1.10.3",
        widgetEventPrefix: "sort",
        ready: false,
        options: {
            appendTo: "parent",
            axis: false,
            connectWith: false,
            containment: false,
            cursor: "auto",
            cursorAt: false,
            dropOnEmpty: true,
            forcePlaceholderSize: false,
            forceHelperSize: false,
            grid: false,
            handle: false,
            helper: "original",
            items: "> *",
            opacity: false,
            placeholder: false,
            revert: false,
            scroll: true,
            scrollSensitivity: 20,
            scrollSpeed: 20,
            scope: "default",
            tolerance: "intersect",
            zIndex: 1000,

            // callbacks
            activate: null,
            beforeStop: null,
            change: null,
            deactivate: null,
            out: null,
            over: null,
            receive: null,
            remove: null,
            sort: null,
            start: null,
            stop: null,
            update: null
        },
        _create: function() {

            var o = this.options;
            this.containerCache = {};
            this.element.addClass("ui-sortable");

            //Get the items
            this.refresh();

            //Let's determine if the items are being displayed horizontally
            this.floating = this.items.length ? o.axis === "x" || isFloating(this.items[0].item) : false;

            //Let's determine the parent's offset
            this.offset = this.element.offset();

            //Initialize mouse events for interaction
            this._mouseInit();

            //We're ready to go
            this.ready = true;

        },

        _destroy: function() {
            this.element
                .removeClass("ui-sortable ui-sortable-disabled");
            this._mouseDestroy();

            for ( var i = this.items.length - 1; i >= 0; i-- ) {
                this.items[i].item.removeData(this.widgetName + "-item");
            }

            return this;
        },

        _setOption: function(key, value){
            if ( key === "disabled" ) {
                this.options[ key ] = value;

                this.widget().toggleClass( "ui-sortable-disabled", !!value );
            } else {
                // Don't call widget base _setOption for disable as it adds ui-state-disabled class
                $.Widget.prototype._setOption.apply(this, arguments);
            }
        },

        _mouseCapture: function(event, overrideHandle) {
            var currentItem = null,
                validHandle = false,
                that = this;

            if (this.reverting) {
                return false;
            }

            if(this.options.disabled || this.options.type === "static") {
                return false;
            }

            //We have to refresh the items data once first
            this._refreshItems(event);

            //Find out if the clicked node (or one of its parents) is a actual item in this.items
            $(event.target).parents().each(function() {
                if($.data(this, that.widgetName + "-item") === that) {
                    currentItem = $(this);
                    return false;
                }
            });
            if($.data(event.target, that.widgetName + "-item") === that) {
                currentItem = $(event.target);
            }

            if(!currentItem) {
                return false;
            }
            if(this.options.handle && !overrideHandle) {
                $(this.options.handle, currentItem).find("*").addBack().each(function() {
                    if(this === event.target) {
                        validHandle = true;
                    }
                });
                if(!validHandle) {
                    return false;
                }
            }

            this.currentItem = currentItem;
            this._removeCurrentsFromItems();
            return true;

        },

        _mouseStart: function(event, overrideHandle, noActivation) {

            var i, body,
                o = this.options;

            this.currentContainer = this;

            //We only need to call refreshPositions, because the refreshItems call has been moved to mouseCapture
            this.refreshPositions();

            //Create and append the visible helper
            this.helper = this._createHelper(event);

            //Cache the helper size
            this._cacheHelperProportions();

            /*
             * - Position generation -
             * This block generates everything position related - it's the core of draggables.
             */

            //Cache the margins of the original element
            this._cacheMargins();

            //Get the next scrolling parent
            this.scrollParent = this.helper.scrollParent();

            //The element's absolute position on the page minus margins
            this.offset = this.currentItem.offset();
            this.offset = {
                top: this.offset.top - this.margins.top,
                left: this.offset.left - this.margins.left
            };

            $.extend(this.offset, {
                click: { //Where the click happened, relative to the element
                    left: event.pageX - this.offset.left,
                    top: event.pageY - this.offset.top
                },
                parent: this._getParentOffset(),
                relative: this._getRelativeOffset() //This is a relative to absolute position minus the actual position calculation - only used for relative positioned helper
            });

            // Only after we got the offset, we can change the helper's position to absolute
            // TODO: Still need to figure out a way to make relative sorting possible
            this.helper.css("position", "absolute");
            this.cssPosition = this.helper.css("position");

            //Generate the original position
            this.originalPosition = this._generatePosition(event);
            this.originalPageX = event.pageX;
            this.originalPageY = event.pageY;

            //Adjust the mouse offset relative to the helper if "cursorAt" is supplied
            (o.cursorAt && this._adjustOffsetFromHelper(o.cursorAt));

            //Cache the former DOM position
            this.domPosition = { prev: this.currentItem.prev()[0], parent: this.currentItem.parent()[0] };

            //If the helper is not the original, hide the original so it's not playing any role during the drag, won't cause anything bad this way
            if(this.helper[0] !== this.currentItem[0]) {
                this.currentItem.hide();
            }

            //Create the placeholder
            this._createPlaceholder();

            //Set a containment if given in the options
            if(o.containment) {
                this._setContainment();
            }

            if( o.cursor && o.cursor !== "auto" ) { // cursor option
                body = this.document.find( "body" );

                // support: IE
                this.storedCursor = body.css( "cursor" );
                body.css( "cursor", o.cursor );

                this.storedStylesheet = $( "<style>*{ cursor: "+o.cursor+" !important; }</style>" ).appendTo( body );
            }

            if(o.opacity) { // opacity option
                if (this.helper.css("opacity")) {
                    this._storedOpacity = this.helper.css("opacity");
                }
                this.helper.css("opacity", o.opacity);
            }

            if(o.zIndex) { // zIndex option
                if (this.helper.css("zIndex")) {
                    this._storedZIndex = this.helper.css("zIndex");
                }
                this.helper.css("zIndex", o.zIndex);
            }

            //Prepare scrolling
            if(this.scrollParent[0] !== document && this.scrollParent[0].tagName !== "HTML") {
                this.overflowOffset = this.scrollParent.offset();
            }

            //Call callbacks
            this._trigger("start", event, this._uiHash());

            //Recache the helper size
            if(!this._preserveHelperProportions) {
                this._cacheHelperProportions();
            }


            //Post "activate" events to possible containers
            if( !noActivation ) {
                for ( i = this.containers.length - 1; i >= 0; i-- ) {
                    this.containers[ i ]._trigger( "activate", event, this._uiHash( this ) );
                }
            }

            //Prepare possible droppables
            if($.ui.ddmanager) {
                $.ui.ddmanager.current = this;
            }

            if ($.ui.ddmanager && !o.dropBehaviour) {
                $.ui.ddmanager.prepareOffsets(this, event);
            }

            this.dragging = true;

            this.helper.addClass("ui-sortable-helper");
            this._mouseDrag(event); //Execute the drag once - this causes the helper not to be visible before getting its correct position
            return true;

        },

        _mouseDrag: function(event) {
            var i, item, itemElement, intersection,
                o = this.options,
                scrolled = false;

            //Compute the helpers position
            this.position = this._generatePosition(event);
            this.positionAbs = this._convertPositionTo("absolute");

            if (!this.lastPositionAbs) {
                this.lastPositionAbs = this.positionAbs;
            }

            //Do scrolling
            if(this.options.scroll) {
                if(this.scrollParent[0] !== document && this.scrollParent[0].tagName !== "HTML") {

                    if((this.overflowOffset.top + this.scrollParent[0].offsetHeight) - event.pageY < o.scrollSensitivity) {
                        this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop + o.scrollSpeed;
                    } else if(event.pageY - this.overflowOffset.top < o.scrollSensitivity) {
                        this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop - o.scrollSpeed;
                    }

                    if((this.overflowOffset.left + this.scrollParent[0].offsetWidth) - event.pageX < o.scrollSensitivity) {
                        this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft + o.scrollSpeed;
                    } else if(event.pageX - this.overflowOffset.left < o.scrollSensitivity) {
                        this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft - o.scrollSpeed;
                    }

                } else {

                    if(event.pageY - $(document).scrollTop() < o.scrollSensitivity) {
                        scrolled = $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
                    } else if($(window).height() - (event.pageY - $(document).scrollTop()) < o.scrollSensitivity) {
                        scrolled = $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);
                    }

                    if(event.pageX - $(document).scrollLeft() < o.scrollSensitivity) {
                        scrolled = $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
                    } else if($(window).width() - (event.pageX - $(document).scrollLeft()) < o.scrollSensitivity) {
                        scrolled = $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);
                    }

                }

                if(scrolled !== false && $.ui.ddmanager && !o.dropBehaviour) {
                    $.ui.ddmanager.prepareOffsets(this, event);
                }
            }

            //Regenerate the absolute position used for position checks
            this.positionAbs = this._convertPositionTo("absolute");

            //Set the helper position
            if(!this.options.axis || this.options.axis !== "y") {
                this.helper[0].style.left = this.position.left+"px";
            }
            if(!this.options.axis || this.options.axis !== "x") {
                this.helper[0].style.top = this.position.top+"px";
            }

            //Rearrange
            for (i = this.items.length - 1; i >= 0; i--) {

                //Cache variables and intersection, continue if no intersection
                item = this.items[i];
                itemElement = item.item[0];
                intersection = this._intersectsWithPointer(item);
                if (!intersection) {
                    continue;
                }

                // Only put the placeholder inside the current Container, skip all
                // items form other containers. This works because when moving
                // an item from one container to another the
                // currentContainer is switched before the placeholder is moved.
                //
                // Without this moving items in "sub-sortables" can cause the placeholder to jitter
                // beetween the outer and inner container.
                if (item.instance !== this.currentContainer) {
                    continue;
                }

                // cannot intersect with itself
                // no useless actions that have been done before
                // no action if the item moved is the parent of the item checked
                if (itemElement !== this.currentItem[0] &&
                    this.placeholder[intersection === 1 ? "next" : "prev"]()[0] !== itemElement &&
                    !$.contains(this.placeholder[0], itemElement) &&
                    (this.options.type === "semi-dynamic" ? !$.contains(this.element[0], itemElement) : true)
                    ) {

                    this.direction = intersection === 1 ? "down" : "up";

                    if (this.options.tolerance === "pointer" || this._intersectsWithSides(item)) {
                        this._rearrange(event, item);
                    } else {
                        break;
                    }

                    this._trigger("change", event, this._uiHash());
                    break;
                }
            }

            //Post events to containers
            this._contactContainers(event);

            //Interconnect with droppables
            if($.ui.ddmanager) {
                $.ui.ddmanager.drag(this, event);
            }

            //Call callbacks
            this._trigger("sort", event, this._uiHash());

            this.lastPositionAbs = this.positionAbs;
            return false;

        },

        _mouseStop: function(event, noPropagation) {

            if(!event) {
                return;
            }

            //If we are using droppables, inform the manager about the drop
            if ($.ui.ddmanager && !this.options.dropBehaviour) {
                $.ui.ddmanager.drop(this, event);
            }

            if(this.options.revert) {
                var that = this,
                    cur = this.placeholder.offset(),
                    axis = this.options.axis,
                    animation = {};

                if ( !axis || axis === "x" ) {
                    animation.left = cur.left - this.offset.parent.left - this.margins.left + (this.offsetParent[0] === document.body ? 0 : this.offsetParent[0].scrollLeft);
                }
                if ( !axis || axis === "y" ) {
                    animation.top = cur.top - this.offset.parent.top - this.margins.top + (this.offsetParent[0] === document.body ? 0 : this.offsetParent[0].scrollTop);
                }
                this.reverting = true;
                $(this.helper).animate( animation, parseInt(this.options.revert, 10) || 500, function() {
                    that._clear(event);
                });
            } else {
                this._clear(event, noPropagation);
            }

            return false;

        },

        cancel: function() {

            if(this.dragging) {

                this._mouseUp({ target: null });

                if(this.options.helper === "original") {
                    this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");
                } else {
                    this.currentItem.show();
                }

                //Post deactivating events to containers
                for (var i = this.containers.length - 1; i >= 0; i--){
                    this.containers[i]._trigger("deactivate", null, this._uiHash(this));
                    if(this.containers[i].containerCache.over) {
                        this.containers[i]._trigger("out", null, this._uiHash(this));
                        this.containers[i].containerCache.over = 0;
                    }
                }

            }

            if (this.placeholder) {
                //$(this.placeholder[0]).remove(); would have been the jQuery way - unfortunately, it unbinds ALL events from the original node!
                if(this.placeholder[0].parentNode) {
                    this.placeholder[0].parentNode.removeChild(this.placeholder[0]);
                }
                if(this.options.helper !== "original" && this.helper && this.helper[0].parentNode) {
                    this.helper.remove();
                }

                $.extend(this, {
                    helper: null,
                    dragging: false,
                    reverting: false,
                    _noFinalSort: null
                });

                if(this.domPosition.prev) {
                    $(this.domPosition.prev).after(this.currentItem);
                } else {
                    $(this.domPosition.parent).prepend(this.currentItem);
                }
            }

            return this;

        },

        serialize: function(o) {

            var items = this._getItemsAsjQuery(o && o.connected),
                str = [];
            o = o || {};

            $(items).each(function() {
                var res = ($(o.item || this).attr(o.attribute || "id") || "").match(o.expression || (/(.+)[\-=_](.+)/));
                if (res) {
                    str.push((o.key || res[1]+"[]")+"="+(o.key && o.expression ? res[1] : res[2]));
                }
            });

            if(!str.length && o.key) {
                str.push(o.key + "=");
            }

            return str.join("&");

        },

        toArray: function(o) {

            var items = this._getItemsAsjQuery(o && o.connected),
                ret = [];

            o = o || {};

            items.each(function() { ret.push($(o.item || this).attr(o.attribute || "id") || ""); });
            return ret;

        },

        /* Be careful with the following core functions */
        _intersectsWith: function(item) {

            var x1 = this.positionAbs.left,
                x2 = x1 + this.helperProportions.width,
                y1 = this.positionAbs.top,
                y2 = y1 + this.helperProportions.height,
                l = item.left,
                r = l + item.width,
                t = item.top,
                b = t + item.height,
                dyClick = this.offset.click.top,
                dxClick = this.offset.click.left,
                isOverElementHeight = ( this.options.axis === "x" ) || ( ( y1 + dyClick ) > t && ( y1 + dyClick ) < b ),
                isOverElementWidth = ( this.options.axis === "y" ) || ( ( x1 + dxClick ) > l && ( x1 + dxClick ) < r ),
                isOverElement = isOverElementHeight && isOverElementWidth;

            if ( this.options.tolerance === "pointer" ||
                this.options.forcePointerForContainers ||
                (this.options.tolerance !== "pointer" && this.helperProportions[this.floating ? "width" : "height"] > item[this.floating ? "width" : "height"])
                ) {
                return isOverElement;
            } else {

                return (l < x1 + (this.helperProportions.width / 2) && // Right Half
                    x2 - (this.helperProportions.width / 2) < r && // Left Half
                    t < y1 + (this.helperProportions.height / 2) && // Bottom Half
                    y2 - (this.helperProportions.height / 2) < b ); // Top Half

            }
        },

        _intersectsWithPointer: function(item) {

            var isOverElementHeight = (this.options.axis === "x") || isOverAxis(this.positionAbs.top + this.offset.click.top, item.top, item.height),
                isOverElementWidth = (this.options.axis === "y") || isOverAxis(this.positionAbs.left + this.offset.click.left, item.left, item.width),
                isOverElement = isOverElementHeight && isOverElementWidth,
                verticalDirection = this._getDragVerticalDirection(),
                horizontalDirection = this._getDragHorizontalDirection();

            if (!isOverElement) {
                return false;
            }

            return this.floating ?
                ( ((horizontalDirection && horizontalDirection === "right") || verticalDirection === "down") ? 2 : 1 )
                : ( verticalDirection && (verticalDirection === "down" ? 2 : 1) );

        },

        _intersectsWithSides: function(item) {

            var isOverBottomHalf = isOverAxis(this.positionAbs.top + this.offset.click.top, item.top + (item.height/2), item.height),
                isOverRightHalf = isOverAxis(this.positionAbs.left + this.offset.click.left, item.left + (item.width/2), item.width),
                verticalDirection = this._getDragVerticalDirection(),
                horizontalDirection = this._getDragHorizontalDirection();

            if (this.floating && horizontalDirection) {
                return ((horizontalDirection === "right" && isOverRightHalf) || (horizontalDirection === "left" && !isOverRightHalf));
            } else {
                return verticalDirection && ((verticalDirection === "down" && isOverBottomHalf) || (verticalDirection === "up" && !isOverBottomHalf));
            }

        },

        _getDragVerticalDirection: function() {
            var delta = this.positionAbs.top - this.lastPositionAbs.top;
            return delta !== 0 && (delta > 0 ? "down" : "up");
        },

        _getDragHorizontalDirection: function() {
            var delta = this.positionAbs.left - this.lastPositionAbs.left;
            return delta !== 0 && (delta > 0 ? "right" : "left");
        },

        refresh: function(event) {
            this._refreshItems(event);
            this.refreshPositions();
            return this;
        },

        _connectWith: function() {
            var options = this.options;
            return options.connectWith.constructor === String ? [options.connectWith] : options.connectWith;
        },

        _getItemsAsjQuery: function(connected) {

            var i, j, cur, inst,
                items = [],
                queries = [],
                connectWith = this._connectWith();

            if(connectWith && connected) {
                for (i = connectWith.length - 1; i >= 0; i--){
                    cur = $(connectWith[i]);
                    for ( j = cur.length - 1; j >= 0; j--){
                        inst = $.data(cur[j], this.widgetFullName);
                        if(inst && inst !== this && !inst.options.disabled) {
                            queries.push([$.isFunction(inst.options.items) ? inst.options.items.call(inst.element) : $(inst.options.items, inst.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"), inst]);
                        }
                    }
                }
            }

            queries.push([$.isFunction(this.options.items) ? this.options.items.call(this.element, null, { options: this.options, item: this.currentItem }) : $(this.options.items, this.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"), this]);

            for (i = queries.length - 1; i >= 0; i--){
                queries[i][0].each(function() {
                    items.push(this);
                });
            }

            return $(items);

        },

        _removeCurrentsFromItems: function() {

            var list = this.currentItem.find(":data(" + this.widgetName + "-item)");

            this.items = $.grep(this.items, function (item) {
                for (var j=0; j < list.length; j++) {
                    if(list[j] === item.item[0]) {
                        return false;
                    }
                }
                return true;
            });

        },

        _refreshItems: function(event) {

            this.items = [];
            this.containers = [this];

            var i, j, cur, inst, targetData, _queries, item, queriesLength,
                items = this.items,
                queries = [[$.isFunction(this.options.items) ? this.options.items.call(this.element[0], event, { item: this.currentItem }) : $(this.options.items, this.element), this]],
                connectWith = this._connectWith();

            if(connectWith && this.ready) { //Shouldn't be run the first time through due to massive slow-down
                for (i = connectWith.length - 1; i >= 0; i--){
                    cur = $(connectWith[i]);
                    for (j = cur.length - 1; j >= 0; j--){
                        inst = $.data(cur[j], this.widgetFullName);
                        if(inst && inst !== this && !inst.options.disabled) {
                            queries.push([$.isFunction(inst.options.items) ? inst.options.items.call(inst.element[0], event, { item: this.currentItem }) : $(inst.options.items, inst.element), inst]);
                            this.containers.push(inst);
                        }
                    }
                }
            }

            for (i = queries.length - 1; i >= 0; i--) {
                targetData = queries[i][1];
                _queries = queries[i][0];

                for (j=0, queriesLength = _queries.length; j < queriesLength; j++) {
                    item = $(_queries[j]);

                    item.data(this.widgetName + "-item", targetData); // Data for target checking (mouse manager)

                    items.push({
                        item: item,
                        instance: targetData,
                        width: 0, height: 0,
                        left: 0, top: 0
                    });
                }
            }

        },

        refreshPositions: function(fast) {

            //This has to be redone because due to the item being moved out/into the offsetParent, the offsetParent's position will change
            if(this.offsetParent && this.helper) {
                this.offset.parent = this._getParentOffset();
            }

            var i, item, t, p;

            for (i = this.items.length - 1; i >= 0; i--){
                item = this.items[i];

                //We ignore calculating positions of all connected containers when we're not over them
                if(item.instance !== this.currentContainer && this.currentContainer && item.item[0] !== this.currentItem[0]) {
                    continue;
                }

                t = this.options.toleranceElement ? $(this.options.toleranceElement, item.item) : item.item;

                if (!fast) {
                    item.width = t.outerWidth();
                    item.height = t.outerHeight();
                }

                p = t.offset();
                item.left = p.left;
                item.top = p.top;
            }

            if(this.options.custom && this.options.custom.refreshContainers) {
                this.options.custom.refreshContainers.call(this);
            } else {
                for (i = this.containers.length - 1; i >= 0; i--){
                    p = this.containers[i].element.offset();
                    this.containers[i].containerCache.left = p.left;
                    this.containers[i].containerCache.top = p.top;
                    this.containers[i].containerCache.width	= this.containers[i].element.outerWidth();
                    this.containers[i].containerCache.height = this.containers[i].element.outerHeight();
                }
            }

            return this;
        },

        _createPlaceholder: function(that) {
            that = that || this;
            var className,
                o = that.options;

            if(!o.placeholder || o.placeholder.constructor === String) {
                className = o.placeholder;
                o.placeholder = {
                    element: function() {

                        var nodeName = that.currentItem[0].nodeName.toLowerCase(),
                            element = $( "<" + nodeName + ">", that.document[0] )
                                .addClass(className || that.currentItem[0].className+" ui-sortable-placeholder")
                                .removeClass("ui-sortable-helper");

                        if ( nodeName === "tr" ) {
                            that.currentItem.children().each(function() {
                                $( "<td>&#160;</td>", that.document[0] )
                                    .attr( "colspan", $( this ).attr( "colspan" ) || 1 )
                                    .appendTo( element );
                            });
                        } else if ( nodeName === "img" ) {
                            element.attr( "src", that.currentItem.attr( "src" ) );
                        }

                        if ( !className ) {
                            element.css( "visibility", "hidden" );
                        }

                        return element;
                    },
                    update: function(container, p) {

                        // 1. If a className is set as 'placeholder option, we don't force sizes - the class is responsible for that
                        // 2. The option 'forcePlaceholderSize can be enabled to force it even if a class name is specified
                        if(className && !o.forcePlaceholderSize) {
                            return;
                        }

                        //If the element doesn't have a actual height by itself (without styles coming from a stylesheet), it receives the inline height from the dragged item
                        if(!p.height()) { p.height(that.currentItem.innerHeight() - parseInt(that.currentItem.css("paddingTop")||0, 10) - parseInt(that.currentItem.css("paddingBottom")||0, 10)); }
                        if(!p.width()) { p.width(that.currentItem.innerWidth() - parseInt(that.currentItem.css("paddingLeft")||0, 10) - parseInt(that.currentItem.css("paddingRight")||0, 10)); }
                    }
                };
            }

            //Create the placeholder
            that.placeholder = $(o.placeholder.element.call(that.element, that.currentItem));

            //Append it after the actual current item
            that.currentItem.after(that.placeholder);

            //Update the size of the placeholder (TODO: Logic to fuzzy, see line 316/317)
            o.placeholder.update(that, that.placeholder);

        },

        _contactContainers: function(event) {
            var i, j, dist, itemWithLeastDistance, posProperty, sizeProperty, base, cur, nearBottom, floating,
                innermostContainer = null,
                innermostIndex = null;

            // get innermost container that intersects with item
            for (i = this.containers.length - 1; i >= 0; i--) {

                // never consider a container that's located within the item itself
                if($.contains(this.currentItem[0], this.containers[i].element[0])) {
                    continue;
                }

                if(this._intersectsWith(this.containers[i].containerCache)) {

                    // if we've already found a container and it's more "inner" than this, then continue
                    if(innermostContainer && $.contains(this.containers[i].element[0], innermostContainer.element[0])) {
                        continue;
                    }

                    innermostContainer = this.containers[i];
                    innermostIndex = i;

                } else {
                    // container doesn't intersect. trigger "out" event if necessary
                    if(this.containers[i].containerCache.over) {
                        this.containers[i]._trigger("out", event, this._uiHash(this));
                        this.containers[i].containerCache.over = 0;
                    }
                }

            }

            // if no intersecting containers found, return
            if(!innermostContainer) {
                return;
            }

            // move the item into the container if it's not there already
            if(this.containers.length === 1) {
                if (!this.containers[innermostIndex].containerCache.over) {
                    this.containers[innermostIndex]._trigger("over", event, this._uiHash(this));
                    this.containers[innermostIndex].containerCache.over = 1;
                }
            } else {

                //When entering a new container, we will find the item with the least distance and append our item near it
                dist = 10000;
                itemWithLeastDistance = null;
                floating = innermostContainer.floating || isFloating(this.currentItem);
                posProperty = floating ? "left" : "top";
                sizeProperty = floating ? "width" : "height";
                base = this.positionAbs[posProperty] + this.offset.click[posProperty];
                for (j = this.items.length - 1; j >= 0; j--) {
                    if(!$.contains(this.containers[innermostIndex].element[0], this.items[j].item[0])) {
                        continue;
                    }
                    if(this.items[j].item[0] === this.currentItem[0]) {
                        continue;
                    }
                    if (floating && !isOverAxis(this.positionAbs.top + this.offset.click.top, this.items[j].top, this.items[j].height)) {
                        continue;
                    }
                    cur = this.items[j].item.offset()[posProperty];
                    nearBottom = false;
                    if(Math.abs(cur - base) > Math.abs(cur + this.items[j][sizeProperty] - base)){
                        nearBottom = true;
                        cur += this.items[j][sizeProperty];
                    }

                    if(Math.abs(cur - base) < dist) {
                        dist = Math.abs(cur - base); itemWithLeastDistance = this.items[j];
                        this.direction = nearBottom ? "up": "down";
                    }
                }

                //Check if dropOnEmpty is enabled
                if(!itemWithLeastDistance && !this.options.dropOnEmpty) {
                    return;
                }

                if(this.currentContainer === this.containers[innermostIndex]) {
                    return;
                }

                itemWithLeastDistance ? this._rearrange(event, itemWithLeastDistance, null, true) : this._rearrange(event, null, this.containers[innermostIndex].element, true);
                this._trigger("change", event, this._uiHash());
                this.containers[innermostIndex]._trigger("change", event, this._uiHash(this));
                this.currentContainer = this.containers[innermostIndex];

                //Update the placeholder
                this.options.placeholder.update(this.currentContainer, this.placeholder);

                this.containers[innermostIndex]._trigger("over", event, this._uiHash(this));
                this.containers[innermostIndex].containerCache.over = 1;
            }


        },

        _createHelper: function(event) {

            var o = this.options,
                helper = $.isFunction(o.helper) ? $(o.helper.apply(this.element[0], [event, this.currentItem])) : (o.helper === "clone" ? this.currentItem.clone() : this.currentItem);

            //Add the helper to the DOM if that didn't happen already
            if(!helper.parents("body").length) {
                $(o.appendTo !== "parent" ? o.appendTo : this.currentItem[0].parentNode)[0].appendChild(helper[0]);
            }

            if(helper[0] === this.currentItem[0]) {
                this._storedCSS = { width: this.currentItem[0].style.width, height: this.currentItem[0].style.height, position: this.currentItem.css("position"), top: this.currentItem.css("top"), left: this.currentItem.css("left") };
            }

            if(!helper[0].style.width || o.forceHelperSize) {
                helper.width(this.currentItem.width());
            }
            if(!helper[0].style.height || o.forceHelperSize) {
                helper.height(this.currentItem.height());
            }

            return helper;

        },

        _adjustOffsetFromHelper: function(obj) {
            if (typeof obj === "string") {
                obj = obj.split(" ");
            }
            if ($.isArray(obj)) {
                obj = {left: +obj[0], top: +obj[1] || 0};
            }
            if ("left" in obj) {
                this.offset.click.left = obj.left + this.margins.left;
            }
            if ("right" in obj) {
                this.offset.click.left = this.helperProportions.width - obj.right + this.margins.left;
            }
            if ("top" in obj) {
                this.offset.click.top = obj.top + this.margins.top;
            }
            if ("bottom" in obj) {
                this.offset.click.top = this.helperProportions.height - obj.bottom + this.margins.top;
            }
        },

        _getParentOffset: function() {


            //Get the offsetParent and cache its position
            this.offsetParent = this.helper.offsetParent();
            var po = this.offsetParent.offset();

            // This is a special case where we need to modify a offset calculated on start, since the following happened:
            // 1. The position of the helper is absolute, so it's position is calculated based on the next positioned parent
            // 2. The actual offset parent is a child of the scroll parent, and the scroll parent isn't the document, which means that
            //    the scroll is included in the initial calculation of the offset of the parent, and never recalculated upon drag
            if(this.cssPosition === "absolute" && this.scrollParent[0] !== document && $.contains(this.scrollParent[0], this.offsetParent[0])) {
                po.left += this.scrollParent.scrollLeft();
                po.top += this.scrollParent.scrollTop();
            }

            // This needs to be actually done for all browsers, since pageX/pageY includes this information
            // with an ugly IE fix
            if( this.offsetParent[0] === document.body || (this.offsetParent[0].tagName && this.offsetParent[0].tagName.toLowerCase() === "html" && $.ui.ie)) {
                po = { top: 0, left: 0 };
            }

            return {
                top: po.top + (parseInt(this.offsetParent.css("borderTopWidth"),10) || 0),
                left: po.left + (parseInt(this.offsetParent.css("borderLeftWidth"),10) || 0)
            };

        },

        _getRelativeOffset: function() {

            if(this.cssPosition === "relative") {
                var p = this.currentItem.position();
                return {
                    top: p.top - (parseInt(this.helper.css("top"),10) || 0) + this.scrollParent.scrollTop(),
                    left: p.left - (parseInt(this.helper.css("left"),10) || 0) + this.scrollParent.scrollLeft()
                };
            } else {
                return { top: 0, left: 0 };
            }

        },

        _cacheMargins: function() {
            this.margins = {
                left: (parseInt(this.currentItem.css("marginLeft"),10) || 0),
                top: (parseInt(this.currentItem.css("marginTop"),10) || 0)
            };
        },

        _cacheHelperProportions: function() {
            this.helperProportions = {
                width: this.helper.outerWidth(),
                height: this.helper.outerHeight()
            };
        },

        _setContainment: function() {

            var ce, co, over,
                o = this.options;
            if(o.containment === "parent") {
                o.containment = this.helper[0].parentNode;
            }
            if(o.containment === "document" || o.containment === "window") {
                this.containment = [
                    0 - this.offset.relative.left - this.offset.parent.left,
                    0 - this.offset.relative.top - this.offset.parent.top,
                    $(o.containment === "document" ? document : window).width() - this.helperProportions.width - this.margins.left,
                    ($(o.containment === "document" ? document : window).height() || document.body.parentNode.scrollHeight) - this.helperProportions.height - this.margins.top
                ];
            }

            if(!(/^(document|window|parent)$/).test(o.containment)) {
                ce = $(o.containment)[0];
                co = $(o.containment).offset();
                over = ($(ce).css("overflow") !== "hidden");

                this.containment = [
                    co.left + (parseInt($(ce).css("borderLeftWidth"),10) || 0) + (parseInt($(ce).css("paddingLeft"),10) || 0) - this.margins.left,
                    co.top + (parseInt($(ce).css("borderTopWidth"),10) || 0) + (parseInt($(ce).css("paddingTop"),10) || 0) - this.margins.top,
                    co.left+(over ? Math.max(ce.scrollWidth,ce.offsetWidth) : ce.offsetWidth) - (parseInt($(ce).css("borderLeftWidth"),10) || 0) - (parseInt($(ce).css("paddingRight"),10) || 0) - this.helperProportions.width - this.margins.left,
                    co.top+(over ? Math.max(ce.scrollHeight,ce.offsetHeight) : ce.offsetHeight) - (parseInt($(ce).css("borderTopWidth"),10) || 0) - (parseInt($(ce).css("paddingBottom"),10) || 0) - this.helperProportions.height - this.margins.top
                ];
            }

        },

        _convertPositionTo: function(d, pos) {

            if(!pos) {
                pos = this.position;
            }
            var mod = d === "absolute" ? 1 : -1,
                scroll = this.cssPosition === "absolute" && !(this.scrollParent[0] !== document && $.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent,
                scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);

            return {
                top: (
                    pos.top	+																// The absolute mouse position
                        this.offset.relative.top * mod +										// Only for relative positioned nodes: Relative offset from element to offset parent
                        this.offset.parent.top * mod -											// The offsetParent's offset without borders (offset + border)
                        ( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollTop() : ( scrollIsRootNode ? 0 : scroll.scrollTop() ) ) * mod)
                    ),
                left: (
                    pos.left +																// The absolute mouse position
                        this.offset.relative.left * mod +										// Only for relative positioned nodes: Relative offset from element to offset parent
                        this.offset.parent.left * mod	-										// The offsetParent's offset without borders (offset + border)
                        ( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft() ) * mod)
                    )
            };

        },

        _generatePosition: function(event) {

            var top, left,
                o = this.options,
                pageX = event.pageX,
                pageY = event.pageY,
                scroll = this.cssPosition === "absolute" && !(this.scrollParent[0] !== document && $.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent, scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);

            // This is another very weird special case that only happens for relative elements:
            // 1. If the css position is relative
            // 2. and the scroll parent is the document or similar to the offset parent
            // we have to refresh the relative offset during the scroll so there are no jumps
            if(this.cssPosition === "relative" && !(this.scrollParent[0] !== document && this.scrollParent[0] !== this.offsetParent[0])) {
                this.offset.relative = this._getRelativeOffset();
            }

            /*
             * - Position constraining -
             * Constrain the position to a mix of grid, containment.
             */

            if(this.originalPosition) { //If we are not dragging yet, we won't check for options

                if(this.containment) {
                    if(event.pageX - this.offset.click.left < this.containment[0]) {
                        pageX = this.containment[0] + this.offset.click.left;
                    }
                    if(event.pageY - this.offset.click.top < this.containment[1]) {
                        pageY = this.containment[1] + this.offset.click.top;
                    }
                    if(event.pageX - this.offset.click.left > this.containment[2]) {
                        pageX = this.containment[2] + this.offset.click.left;
                    }
                    if(event.pageY - this.offset.click.top > this.containment[3]) {
                        pageY = this.containment[3] + this.offset.click.top;
                    }
                }

                if(o.grid) {
                    top = this.originalPageY + Math.round((pageY - this.originalPageY) / o.grid[1]) * o.grid[1];
                    pageY = this.containment ? ( (top - this.offset.click.top >= this.containment[1] && top - this.offset.click.top <= this.containment[3]) ? top : ((top - this.offset.click.top >= this.containment[1]) ? top - o.grid[1] : top + o.grid[1])) : top;

                    left = this.originalPageX + Math.round((pageX - this.originalPageX) / o.grid[0]) * o.grid[0];
                    pageX = this.containment ? ( (left - this.offset.click.left >= this.containment[0] && left - this.offset.click.left <= this.containment[2]) ? left : ((left - this.offset.click.left >= this.containment[0]) ? left - o.grid[0] : left + o.grid[0])) : left;
                }

            }

            return {
                top: (
                    pageY -																// The absolute mouse position
                        this.offset.click.top -													// Click offset (relative to the element)
                        this.offset.relative.top	-											// Only for relative positioned nodes: Relative offset from element to offset parent
                        this.offset.parent.top +												// The offsetParent's offset without borders (offset + border)
                        ( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollTop() : ( scrollIsRootNode ? 0 : scroll.scrollTop() ) ))
                    ),
                left: (
                    pageX -																// The absolute mouse position
                        this.offset.click.left -												// Click offset (relative to the element)
                        this.offset.relative.left	-											// Only for relative positioned nodes: Relative offset from element to offset parent
                        this.offset.parent.left +												// The offsetParent's offset without borders (offset + border)
                        ( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft() ))
                    )
            };

        },

        _rearrange: function(event, i, a, hardRefresh) {

            a ? a[0].appendChild(this.placeholder[0]) : i.item[0].parentNode.insertBefore(this.placeholder[0], (this.direction === "down" ? i.item[0] : i.item[0].nextSibling));

            //Various things done here to improve the performance:
            // 1. we create a setTimeout, that calls refreshPositions
            // 2. on the instance, we have a counter variable, that get's higher after every append
            // 3. on the local scope, we copy the counter variable, and check in the timeout, if it's still the same
            // 4. this lets only the last addition to the timeout stack through
            this.counter = this.counter ? ++this.counter : 1;
            var counter = this.counter;

            this._delay(function() {
                if(counter === this.counter) {
                    this.refreshPositions(!hardRefresh); //Precompute after each DOM insertion, NOT on mousemove
                }
            });

        },

        _clear: function(event, noPropagation) {

            this.reverting = false;
            // We delay all events that have to be triggered to after the point where the placeholder has been removed and
            // everything else normalized again
            var i,
                delayedTriggers = [];

            // We first have to update the dom position of the actual currentItem
            // Note: don't do it if the current item is already removed (by a user), or it gets reappended (see #4088)
            if(!this._noFinalSort && this.currentItem.parent().length) {
                this.placeholder.before(this.currentItem);
            }
            this._noFinalSort = null;

            if(this.helper[0] === this.currentItem[0]) {
                for(i in this._storedCSS) {
                    if(this._storedCSS[i] === "auto" || this._storedCSS[i] === "static") {
                        this._storedCSS[i] = "";
                    }
                }
                this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");
            } else {
                this.currentItem.show();
            }

            if(this.fromOutside && !noPropagation) {
                delayedTriggers.push(function(event) { this._trigger("receive", event, this._uiHash(this.fromOutside)); });
            }
            if((this.fromOutside || this.domPosition.prev !== this.currentItem.prev().not(".ui-sortable-helper")[0] || this.domPosition.parent !== this.currentItem.parent()[0]) && !noPropagation) {
                delayedTriggers.push(function(event) { this._trigger("update", event, this._uiHash()); }); //Trigger update callback if the DOM position has changed
            }

            // Check if the items Container has Changed and trigger appropriate
            // events.
            if (this !== this.currentContainer) {
                if(!noPropagation) {
                    delayedTriggers.push(function(event) { this._trigger("remove", event, this._uiHash()); });
                    delayedTriggers.push((function(c) { return function(event) { c._trigger("receive", event, this._uiHash(this)); };  }).call(this, this.currentContainer));
                    delayedTriggers.push((function(c) { return function(event) { c._trigger("update", event, this._uiHash(this));  }; }).call(this, this.currentContainer));
                }
            }


            //Post events to containers
            for (i = this.containers.length - 1; i >= 0; i--){
                if(!noPropagation) {
                    delayedTriggers.push((function(c) { return function(event) { c._trigger("deactivate", event, this._uiHash(this)); };  }).call(this, this.containers[i]));
                }
                if(this.containers[i].containerCache.over) {
                    delayedTriggers.push((function(c) { return function(event) { c._trigger("out", event, this._uiHash(this)); };  }).call(this, this.containers[i]));
                    this.containers[i].containerCache.over = 0;
                }
            }

            //Do what was originally in plugins
            if ( this.storedCursor ) {
                this.document.find( "body" ).css( "cursor", this.storedCursor );
                this.storedStylesheet.remove();
            }
            if(this._storedOpacity) {
                this.helper.css("opacity", this._storedOpacity);
            }
            if(this._storedZIndex) {
                this.helper.css("zIndex", this._storedZIndex === "auto" ? "" : this._storedZIndex);
            }

            this.dragging = false;
            if(this.cancelHelperRemoval) {
                if(!noPropagation) {
                    this._trigger("beforeStop", event, this._uiHash());
                    for (i=0; i < delayedTriggers.length; i++) {
                        delayedTriggers[i].call(this, event);
                    } //Trigger all delayed events
                    this._trigger("stop", event, this._uiHash());
                }

                this.fromOutside = false;
                return false;
            }

            if(!noPropagation) {
                this._trigger("beforeStop", event, this._uiHash());
            }

            //$(this.placeholder[0]).remove(); would have been the jQuery way - unfortunately, it unbinds ALL events from the original node!
            this.placeholder[0].parentNode.removeChild(this.placeholder[0]);

            if(this.helper[0] !== this.currentItem[0]) {
                this.helper.remove();
            }
            this.helper = null;

            if(!noPropagation) {
                for (i=0; i < delayedTriggers.length; i++) {
                    delayedTriggers[i].call(this, event);
                } //Trigger all delayed events
                this._trigger("stop", event, this._uiHash());
            }

            this.fromOutside = false;
            return true;

        },

        _trigger: function() {
            if ($.Widget.prototype._trigger.apply(this, arguments) === false) {
                this.cancel();
            }
        },

        _uiHash: function(_inst) {
            var inst = _inst || this;
            return {
                helper: inst.helper,
                placeholder: inst.placeholder || $([]),
                position: inst.position,
                originalPosition: inst.originalPosition,
                offset: inst.positionAbs,
                item: inst.currentItem,
                sender: _inst ? _inst.element : null
            };
        }

    });

})(jQuery);


//Enables Mobile Touch
(function ($) {

    $.support.touch = "ontouchend" in document;
    if (!$.support.touch) {
        return;
    }
    var c = $.ui.mouse.prototype, e = c._mouseInit, a;

    function d(g, h) {
        if (g.originalEvent.touches.length > 1) {
            return;
        }
        g.preventDefault();
        var i = g.originalEvent.changedTouches[0], f = document.createEvent("MouseEvents");
        f.initMouseEvent(h, true, true, window, 1, i.screenX, i.screenY, i.clientX, i.clientY, false, false, false, false, 0, null);
        g.target.dispatchEvent(f);
    }

    c._touchStart = function (g) {
        var f = this;
        if (a || !f._mouseCapture(g.originalEvent.changedTouches[0])) {
            return;
        }
        a = true;
        f._touchMoved = false;
        d(g, "mouseover");
        d(g, "mousemove");
        d(g, "mousedown");
    };
    c._touchMove = function (f) {
        if (!a) {
            return;
        }
        this._touchMoved = true;
        d(f, "mousemove");
    };
    c._touchEnd = function (f) {
        if (!a) {
            return;
        }
        d(f, "mouseup");
        d(f, "mouseout");
        if (!this._touchMoved) {
            d(f, "click");
        }
        a = false;
    };
    c._mouseInit = function () {
        var f = this;
        f.element.bind("touchstart", $.proxy(f, "_touchStart")).bind("touchmove", $.proxy(f, "_touchMove")).bind("touchend", $.proxy(f, "_touchEnd"));
        e.call(f);
    };
})(jQuery);

