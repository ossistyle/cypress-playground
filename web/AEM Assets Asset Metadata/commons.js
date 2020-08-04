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
(function(document, Granite, _g, $) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui");
    
    window.MSM = window.MSM || {};
    
    window.MSM.MSMCommons = window.MSM.MSMCommons || (function() {
        var self = {};
        
        var selectedEditablesStore = [];
        
        self.Constants = {
            ICON_LOCKED: "link",
            ICON_UNLOCKED: "linkOff",
            ICON_ROLLOUT: "unmerge",

            PROP_LIVE_RELATIONSHIP: "msm:liveRelationship",
            PROP_PAGE_STATUS_BLUEPRINT: "msm:isSource",
            PROP_PAGE_STATUS_LIVE_COPY: "msm:isLiveCopy",
            PROP_BP_TARGETS: "msm:targets",
            PROP_TARGET_PATH: "msm:targetPath",
            PROP_SOURCE_PATH: "msm:sourcePath",
            PROP_CANCELLED_PROPERTIES: "msm:cancelledProperties",
            PROP_IS_BLUEPRINT_EXISTING: "msm:isSourceExisting",
            PROP_IS_MANUALLY_CREATED: "msm:isTargetManuallyCreated",
            PROP_BP_PATH: "msm:liveCopyBpPath",
            PROP_LIVE_PATH: "msm:liveCopyPath",
            
            PARAM_STATUS: "msm:status",
            PARAM_IS_CANCELLED: "msm:isCancelled",
            PARAM_IS_CANCELLED_FOR_CHILDREN: "msm:isCancelledForChildren",
            PARAM_PROPERTY_NAME: "msm:propertyName",
            PARAM_COMMAND: "cmd",
            PARAM_PATH: "path",
            PARAM_ROLLOUT_TYPE: "type",
            PARAM_ROLLOUT_PARAGRAPHS: "paras",
            
            COMMAND_CANCEL_PROP_INHERITANCE:"cancelPropertyInheritance",
            COMMAND_REENABLE_PROP_INHERITANCE: "reenablePropertyInheritance",
            COMMAND_ROLLOUT: "rollout",
            
            ROLLOUT_TYPE_SELECTED: "selected",
            ROLLOUT_TYPE_PAGE: "page",
            ROLLOUT_TYPE_DEEP: "deep",

            OPTION_SYNC: "_syncAfterRevert",
            
            ENDPOINT_ROLLOUT_OPTIONS: "/libs/wcm/msm/content/touch-ui/authoring/rolloutoptions.html",
            ENDPOINT_MSM_CONFIG: ".msm-config-endpoint",
            ENDPOINT_ROLLOUT_URI: "/bin/wcmcommand",

            NODE_METADATA: "metadata"
        };

        self.showConfirmation = function(type, header, message, confirmHandler, cancelHandler) {
            var dialog = new Coral.Dialog().set({
                variant: type,
                header: {
                    innerHTML: header
                },
                content: {
                    innerHTML: message.html() ? message.html() : message
                }
            });

            var confirmButton = new Coral.Button().set({
                label: {
                    innerHTML: Granite.I18n.get("Yes")
                },
                variant: "primary"
            }).on('click', function() {
                if (confirmHandler) {
                    confirmHandler.call(this);
                }

                dialog.open = false;
            });

            var cancelButton = new Coral.Button().set({
                label: {
                    innerHTML: Granite.I18n.get("No")
                }
            }).on('click', function() {
                if (cancelHandler) {
                    cancelHandler.call(this);
                }

                dialog.open = false;
            });

            dialog.classList.add("msm-modal");

            document.body.appendChild(dialog);
            dialog.footer.appendChild(cancelButton);
            dialog.footer.appendChild(confirmButton);

            dialog.open = true;
        };
        
        /**
         * Determines if the current page is a blue print
         */
        self.isBlueprintPage = function(namespace) {
            if (namespace
                    && namespace.page
                    && namespace.page.info
                    && namespace.page.info.msm
                    && namespace.page.info.msm[MSM.MSMCommons.Constants.PROP_PAGE_STATUS_BLUEPRINT] == true) {
                return true;
            }
            
            return false;
        };
        
        /**
         * Determines if the current page is a live copy
         */
        self.isLiveCopyPage = function(namespace) {
            if (namespace
                    && namespace.page
                    && namespace.page.info
                    && namespace.page.info.msm
                    && namespace.page.info.msm[MSM.MSMCommons.Constants.PROP_PAGE_STATUS_LIVE_COPY] == true) {
                return true;
            }
            
            return false;
        };
        
        /**
         * Removes the drop targets overlay for given editable
         */
        self.removeDropTargets = function(editable) {
            $.each(editable.dropTargets, function(key, dropTarget){
                if (dropTarget.dom) {
                    dropTarget.dom = null;
                }
                if (dropTarget.overlay) {
                    dropTarget.overlay = null;
                }
            });
            editable.dropTargets = [];
        };
        
        /**
         * Determines if an editable inheritance is cancelled
         */
        self.isInheritanceCancelled = function(editable) {
            var msmConfig = editable.config[MSM.MSMCommons.Constants.PROP_LIVE_RELATIONSHIP];
            var inheritanceCancelled = msmConfig
                && msmConfig[MSM.MSMCommons.Constants.PARAM_STATUS]
                && msmConfig[MSM.MSMCommons.Constants.PARAM_STATUS][MSM.MSMCommons.Constants.PARAM_IS_CANCELLED]
                && msmConfig[MSM.MSMCommons.Constants.PARAM_STATUS][MSM.MSMCommons.Constants.PARAM_IS_CANCELLED] == true;

            return !!inheritanceCancelled;
        };
        
        /**
         * Determines if an editable was manually created
         */
        self.isManuallyCreated = function(editable) {
            var msmConfig = editable.config[MSM.MSMCommons.Constants.PROP_LIVE_RELATIONSHIP];
            var manuallyCreated = msmConfig
                && msmConfig[MSM.MSMCommons.Constants.PARAM_STATUS]
                && msmConfig[MSM.MSMCommons.Constants.PARAM_STATUS][MSM.MSMCommons.Constants.PROP_IS_MANUALLY_CREATED]
                && msmConfig[MSM.MSMCommons.Constants.PARAM_STATUS][MSM.MSMCommons.Constants.PROP_IS_MANUALLY_CREATED] == true;

            return !!manuallyCreated;
        };
        
        /**
         * Keep track of selected editables
         */
        self.updateSelection = function(editableArray) {
            selectedEditablesStore = editableArray;
        };
        
        self.getSelection = function() {
            return selectedEditablesStore;
        };
        
        self.initMsmLockedProperties = function(data) {
            if (data) {

                // check for msm status
                var msmPageStatusInfo = undefined;
                if (data) {
                    msmPageStatusInfo = data[MSM.MSMCommons.Constants.PARAM_STATUS];
                }

                if (!msmPageStatusInfo || msmPageStatusInfo[MSM.MSMCommons.Constants.PROP_IS_MANUALLY_CREATED]) {
                    // not a LC page, don't do anything
                    return;
                }

                // read page properties
                $.ajax({
                    type: "GET",
                    url: MSM.MSMCommons.getPageContentUrl() + ".2.json",
                    traditional: true,
                    cache: false
                }).done(function(pagePropertiesData) {
                    var cancelledProperties = msmPageStatusInfo[MSM.MSMCommons.Constants.PROP_CANCELLED_PROPERTIES];
                    var isBlueprintExisting = msmPageStatusInfo[MSM.MSMCommons.Constants.PROP_IS_BLUEPRINT_EXISTING];

                    $.each($("[data-cq-msm-lockable]"), function(idx, lockableField) {
                        var fieldAPI = $(this).adaptTo("foundation-field");

                        var fieldWrapper = $(lockableField).parents(".coral-Form-fieldwrapper");
                        if (fieldWrapper.length == 0) {
                            fieldWrapper = $(lockableField).parents(".foundation-field-edit");
                        }

                        var lockableName = $(lockableField).data("cq-msm-lockable");

                        //replace any leading ./
                        lockableName = lockableName.replace(/^.\//g, "");

                        // find a field
                        var childField = fieldWrapper.find(".coral-Form-field");
                        if (childField.length == 0) {
                            childField = fieldWrapper.children().not(".cq-msm-property-toggle-inheritance");
                        }
                        childField.addClass("cq-msm-lockable-field");

                        var icon = MSM.MSMCommons.Constants.ICON_LOCKED;
                        var inheritanceLocked = true;
                        if (MSM.MSMCommons.isCancelled(lockableName, cancelledProperties, pagePropertiesData)) {
                            icon = MSM.MSMCommons.Constants.ICON_UNLOCKED;

                            childField.find("button[is=coral-button]").each(function(){this.disabled = false});
                            childField.find("a[is=coral-anchorbutton]").each(function(){this.disabled = false});
                            // Coral2
                            childField.find("button.coral-Button:not([is=coral-button])").removeClass("is-disabled");
                            childField.find("a.coral-Button:not([is=coral-anchorbutton])").removeClass("is-disabled");
                            childField.find("span.coral-Button").removeClass("is-disabled"); // coral-FileUpload-trigger

                            childField.find(":input").filter("[disabled]").attr("disabled", false);
                            if (fieldAPI && fieldAPI.setDisabled) {
                                fieldAPI.setDisabled(false);
                            } else {
                                childField.attr("disabled", false);
                            }
                            inheritanceLocked = false;
                        } else {
                            childField.find(":input").not("[disabled]").attr("disabled", true);
                            if (fieldAPI && fieldAPI.setDisabled) {
                                fieldAPI.setDisabled(true);
                            } else {
                                childField.attr("disabled", true);
                            }
                            childField.find("button[is=coral-button]").each(function(){this.disabled = true});
                            childField.find("a[is=coral-anchorbutton]").each(function(){this.disabled = true});
                            // Coral2
                            childField.find("button.coral-Button:not([is=coral-button])").addClass("is-disabled");
                            childField.find("a.coral-Button:not([is=coral-anchorbutton])").addClass("is-disabled");
                            childField.find("span.coral-Button").addClass("is-disabled"); // coral-FileUpload-trigger

                            inheritanceLocked = true;
                        }

                        var disableToggle = !inheritanceLocked
                            && !isBlueprintExisting;

                        var link = fieldWrapper.find(".cq-msm-property-toggle-inheritance");
                        if (link.length === 0) {
                            var link = $("<a/>", {
                                "class": "cq-msm-property-toggle-inheritance ",
                                "data-toggle-property-inheritance": lockableName,
                                "data-inheritance-locked-status": inheritanceLocked,
                                // rollout sync happens on the page itself, not on the page content node
                                "data-path": data[MSM.MSMCommons.Constants.PROP_TARGET_PATH].slice(0, -("/jcr:content".length)),
                                "data-sourcepath": data[MSM.MSMCommons.Constants.PROP_SOURCE_PATH].slice(0, -("/jcr:content".length)),
                                "title": inheritanceLocked
                                            ? Granite.I18n.get("Cancel inheritance")
                                            : Granite.I18n.get("Revert inheritance"),
                                href: "#"
                            }).insertAfter(childField[childField.length - 1]);

                            var $icon = $("<coral-icon/>", {
                                "icon": icon,
                                "size": "S"
                            }).appendTo(link);

                            //search for a field info
                            var fieldInfo = fieldWrapper.find(".coral-Form-fieldinfo");
                            var outerWidth = childField.outerWidth();
                            if (fieldInfo.length > 0
                                    && outerWidth > 0
                                    && childField.css("width").indexOf("%") < 0) {
                                // shrink the field
                                childField.css({
                                    "width": outerWidth - $icon.outerWidth()
                                });
                            }                    
                        } else {
                            link.data("inheritance-locked-status", inheritanceLocked);
                            var $icon = link.find("coral-icon");
                            if ($icon.length > 0) {
                                $icon[0].icon = icon;
                            }
                            if (inheritanceLocked) {

                                var fieldValue;
                                if(lockableName[0]=='/') {
                                    //only case of /subnode/propertyName is covered
                                    fieldValue = pagePropertiesData[lockableName.substring(1)] ? pagePropertiesData[lockableName.substring(1)] : "";
                                    var childFieldPropertyName = childField.attr('name');
                                    if (childFieldPropertyName) {
                                        //remove leading ./ and lockableName
                                        childFieldPropertyName = childFieldPropertyName.replace(/^.\//g, "").replace(lockableName.substring(1), "").replace(/^\//,"");
                                        if(fieldValue[childFieldPropertyName]) {

                                            childField.val(fieldValue[childFieldPropertyName]);

                                        }
                                    }

                                } else {
                                    fieldValue = MSM.MSMCommons.getValueByLockableName(pagePropertiesData, lockableName) || "";
             
                                    if (fieldAPI) {
                                        if (!fieldValue && fieldAPI.clear) {
                                            fieldAPI.clear();
                                        } else {
                                            if (Array.isArray(fieldValue) && fieldAPI.setValues) {
                                                fieldAPI.setValues(fieldValue);
                                            } else if (fieldValue instanceof Object) {
                                                // ignore for now. See CQ-109225.
                                            } else if (lockableField.tagName.toLowerCase() == "coral-multifield" && !fieldValue) {
                                              	//ignore
                                            } else if (fieldAPI.setValue) {
                                            	if(lockableField.type == 'datetime'){
                                                    fieldValue = lockableField.value;
                                                }
                                                fieldAPI.setValue(fieldValue);
                                            }
                                        }
                                    } else {
                                        childField.val(fieldValue);
                                    }
                                }
                            }
                        }

                        // block inheritance re-enabling if unlocked and blueprint does not exist
                        link.attr("disabled", disableToggle);
                        $icon.attr("disabled", disableToggle);
                    });
                });
            }
        };

        /**
         * Determines if a property is locked or not
         * If the property name does not start with a "/" the page cancelled properties will be inspected
         * Otherwise the LC status of the node with the specified name will be inspected
         */
        self.isCancelled = function(lockableName, cancelledProperties, pagePropertiesData) {
            var isCancelled = false;

            if (lockableName[0] != '/') {
                isCancelled = $.inArray( lockableName, cancelledProperties) >= 0;
            } else {
                lockableName = lockableName.substring(1);

                var nodeData = pagePropertiesData[lockableName];
                isCancelled = nodeData && nodeData["jcr:mixinTypes"]
                    && $.inArray( "cq:LiveSyncCancelled", nodeData["jcr:mixinTypes"]) >= 0
            }

            return isCancelled;
        };

        /**
         * Check if page should by synced after revert
         * @returns {*}
         */
        self.checkDoSyncPageAfterRevert = function() {
            var $syncAfterRevertCheck = $('[name="' + MSM.MSMCommons.Constants.OPTION_SYNC + '"]');
            return ($syncAfterRevertCheck) ? $syncAfterRevertCheck.prop("checked") : false;
        };

        self.getLiveRelationshipStatus = function() {
            var msmConfigEndpoint = MSM.MSMCommons.getPageContentUrl();
            if (!msmConfigEndpoint) {
                return;
            }

            // Get LiveRelationShipStatus of endpoint
            MSM.MSMCommons.requestLiveRelationShipStatus(msmConfigEndpoint)
                .done(function(msmEndpointData) {
                    var msmStatusInfo
                    if (msmEndpointData) {
                        msmStatusInfo = msmEndpointData[MSM.MSMCommons.Constants.PARAM_STATUS];
                    }
                    if (!msmStatusInfo || msmStatusInfo[MSM.MSMCommons.Constants.PROP_IS_MANUALLY_CREATED]) {
                        return;
                    }
                    // Get LiveRelationShipStatus of endpoint/metadata
                    var msmMetadataEndpoint = MSM.MSMCommons.getPageContentUrl() + "/" + MSM.MSMCommons.Constants.NODE_METADATA;
                    MSM.MSMCommons.requestLiveRelationShipStatus(msmMetadataEndpoint)
                        .done(function(msmMetadataEndpointData) {
                            var cancelledPropsForEndpoint = msmStatusInfo[MSM.MSMCommons.Constants.PROP_CANCELLED_PROPERTIES];
                            if (!cancelledPropsForEndpoint) {
                                msmStatusInfo[MSM.MSMCommons.Constants.PROP_CANCELLED_PROPERTIES] = [];
                            }
                            var metadataStatusInfo = msmMetadataEndpointData[MSM.MSMCommons.Constants.PARAM_STATUS] || {};
                            var cancelledPropsForMetadata = metadataStatusInfo[MSM.MSMCommons.Constants.PROP_CANCELLED_PROPERTIES] || [];
                            for (var i = 0; i < cancelledPropsForMetadata.length; i++) {
                                cancelledPropsForEndpoint.push(MSM.MSMCommons.Constants.NODE_METADATA + "/" + cancelledPropsForMetadata[i]);
                            }
                            MSM.MSMCommons.initMsmLockedProperties(msmEndpointData);
                        });

                });
        };

        self.requestLiveRelationShipStatus = function(endpoint) {
        
            var deferred = $.Deferred();

            endpoint += ".msm.conf";
    
            $.ajax({
                type: "GET",
                url: endpoint,
                data: "advancedStatus=true",
                traditional: true,
                cache: false
            }).always(function(data) {
                deferred.resolve(data);
            });

            return deferred.promise();
    
        };

        self.getPageContentUrl = function() {
            var configEndpoint = $(MSM.MSMCommons.Constants.ENDPOINT_MSM_CONFIG).val();
            if(document.location.pathname.indexOf("scaffolding.html")!=-1) {
	            configEndpoint = document.location.pathname.replace(".scaffolding.html", "");
            }
            if (!configEndpoint) {
                return undefined;
            }

            if (!configEndpoint.match(/jcr:content$/)) {
                configEndpoint = configEndpoint + "/jcr:content";
            }

            return Granite.HTTP.externalize(configEndpoint);
        };

        /**
         * Toggle the inheritance button
         * @param inheritanceToggleEndpoint
         * @param params
         * @param callback
         * @returns {*}
         */
        self.sendPropertyInheritanceToggleXHR = function(inheritanceToggleEndpoint, params, callback) {
            if (!inheritanceToggleEndpoint || !params) {
                return;
            }
            $.ajax({
                type: "POST",
                url: inheritanceToggleEndpoint,
                data: params
            }).done(function( data, textStatus, jqXHR ) {
                if (!_g.HTTP.isOkStatus(jqXHR.status)) {
                    return;
                }
                MSM.MSMCommons.getLiveRelationshipStatus();

                if (callback) {
                    callback.call(this);
                }
            });
        };

        /**
         * Synchronize the page
         *
         * @param blueprintPath
         * @param livecopyPath
         * @param isDeep
         */
        self.syncPage = function(blueprintPath, livecopyPath, isDeep) {
            if (!blueprintPath || !livecopyPath) {
                // nothing to do
                return;
            }

            ui.wait();
            return $.ajax({
                url: Granite.HTTP.externalize(MSM.MSMCommons.Constants.ENDPOINT_ROLLOUT_URI),
                type: "POST",
                data: {
                    _charset_: "UTF-8",
                    cmd: MSM.MSMCommons.Constants.COMMAND_ROLLOUT,
                    type: (isDeep) ? MSM.MSMCommons.Constants.ROLLOUT_TYPE_DEEP : MSM.MSMCommons.Constants.ROLLOUT_TYPE_PAGE,
                    reset: "false",
                    path: blueprintPath,
                    "msm:targetPath": livecopyPath ? livecopyPath : ""
                }
            }).done(function( data, textStatus, jqXHR ) {
                ui.clearWait();
                document.location.reload();
            }).fail(function(xhr) {
                ui.clearWait();
                ui.alert(Granite.I18n.get("Error"), Granite.I18n.get("An error occurred while" +
                    " synchronizing the Live Copy."), "error");
            });
        };

        /**
         * Build the html for the option to be able to sync a page after revert
         *
         * @param optionIsEnabled
         * @returns {*}
         * @private
         */
        self.buildSyncAfterRevertOption = function (optionIsEnabled) {
            // revert inheritance has an additional options section
            var $syncAfterRevertCheck = $('[name="' + MSM.MSMCommons.Constants.OPTION_SYNC + '"]');
            if ($syncAfterRevertCheck) $syncAfterRevertCheck.remove();

            var $optionsSection = $(document.createElement("p"));
            var checkbox = new Coral.Checkbox().set({
                label: {
                    innerHTML: Granite.I18n.get("Synchronize after reverting inheritance")
                },
                name: MSM.MSMCommons.Constants.OPTION_SYNC,
                value: "true",
                checked: optionIsEnabled
            });
            return $(checkbox).appendTo($optionsSection);
        };

        self.getValueByLockableName = function(data, propertyPath) {
            var segments = propertyPath.split("/");
            for (var value = data, index = 0; value && index < segments.length; index++) {
                value = value[segments[index]];
            }
            return value;
        }

        return self;
    }());

    // handler for the toggle inheritance click
    $(document).off("click.cq-msm-property-toggle-inheritance")
        .on("click.cq-msm-property-toggle-inheritance", ".cq-msm-property-toggle-inheritance", function(e) {
        var activator = $(this);

        e.preventDefault();

        var disabled = activator.attr("disabled");
        if (disabled == "disabled"
            || disabled == "true") {
            // Toggle inheritance is disabled, do nothing
            return;
        }

        var togglePropertyName = activator.data("toggle-property-inheritance");
        var inheritanceLockedStatus = activator.data("inheritance-locked-status");
        var msmConfigEndpoint = MSM.MSMCommons.getPageContentUrl();
        if (!msmConfigEndpoint) {
            return;
        }

        var isNode = false;

        if (togglePropertyName[0] == '/') {
            msmConfigEndpoint += togglePropertyName;
            isNode = true;
        } else if(togglePropertyName.indexOf(MSM.MSMCommons.Constants.NODE_METADATA) === 0 &&
            togglePropertyName.split("/").length === 2) {
            msmConfigEndpoint += "/" + MSM.MSMCommons.Constants.NODE_METADATA;
            togglePropertyName = togglePropertyName.split("/").pop();
        }

        msmConfigEndpoint += ".msm.conf";

        var params = {};
        if (isNode) {
            params[MSM.MSMCommons.Constants.PARAM_STATUS + "/" + MSM.MSMCommons.Constants.PARAM_IS_CANCELLED] = inheritanceLockedStatus;
            params[MSM.MSMCommons.Constants.PARAM_STATUS + "/" + MSM.MSMCommons.Constants.PARAM_IS_CANCELLED_FOR_CHILDREN] = inheritanceLockedStatus;
        } else {
            params[MSM.MSMCommons.Constants.PARAM_PROPERTY_NAME] = togglePropertyName;
            params[MSM.MSMCommons.Constants.PARAM_COMMAND] = inheritanceLockedStatus ? 
                MSM.MSMCommons.Constants.COMMAND_CANCEL_PROP_INHERITANCE :
            MSM.MSMCommons.Constants.COMMAND_REENABLE_PROP_INHERITANCE;
        }

        var header = inheritanceLockedStatus ?
            Granite.I18n.get("Cancel inheritance") :
        Granite.I18n.get("Revert inheritance");
        var modalMessage = inheritanceLockedStatus ?
            Granite.I18n.get("Do you really want to cancel the inheritance?") :
            Granite.I18n.get("Do you really want to revert the inheritance?");

        var $message = $(document.createElement("div"));
        $(document.createElement("p"))
            .text(modalMessage)
            .appendTo($message);
        if (!inheritanceLockedStatus) {
            MSM.MSMCommons.buildSyncAfterRevertOption(false).appendTo($message);
        }

        var confirmationHandler = function() {
            $(document).trigger("cq-msm-propertylock-ok", activator);

            var blueprintPath = activator.data("sourcepath");
            var livecopyPath = activator.data("path");

            if (!inheritanceLockedStatus && MSM.MSMCommons.checkDoSyncPageAfterRevert()) {
                if (blueprintPath && livecopyPath) {
                    MSM.MSMCommons.sendPropertyInheritanceToggleXHR(msmConfigEndpoint, params, function () {
                        MSM.MSMCommons.syncPage(blueprintPath, livecopyPath, false);
                    });
                } else {
                    MSM.MSMCommons.sendPropertyInheritanceToggleXHR(msmConfigEndpoint, params);
                }
             } else {
                MSM.MSMCommons.sendPropertyInheritanceToggleXHR(msmConfigEndpoint, params);
             }
        };

        var cancellationHandler = function() {
            $(document).trigger("cq-msm-propertylock-cancel", activator);
        };

        MSM.MSMCommons.showConfirmation("warning", header, $message, confirmationHandler, cancellationHandler);
    });
	
})(document, Granite, _g, Granite.$);
