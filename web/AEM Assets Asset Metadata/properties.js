/*
  ADOBE CONFIDENTIAL

  Copyright 2012 Adobe Systems Incorporated
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
(function(document, Granite, $, CUI, Coral) {
    "use strict";

    /**
     * Register CUI.PathBrowser export template optionLoader.
     */
    CUI.PathBrowser.register("optionLoader", {
        name: "cq.exportTemplate",
        handler: function(path, callback) {
            $.get(Granite.HTTP.getContextPath() + "/content.ext.json", {
                path: path,
                predicate: "nosystem",
                _charset_: "utf-8"
            }, function(array) {
                if (callback) {
                    callback(array.map(function(v) {
                        return v.name;
                    }));
                }
            }, "json");

            return false;
        }
    });

    var createTagUrl = Granite.HTTP.externalize("/bin/tagcommand");
    
    function createTag(name) {
        return $.post(createTagUrl, {
            cmd: "createTagByTitle",
            tag: name,
            locale: "en", // This is fixed to "en" in old siteadmin also
            "_charset_": "utf-8"
        }).then(function(html) {
            return $(html).find("#Path").text();
        });
    }

    function tagExistInDefault(name) {
        var existInDefault = true;
        $.ajax({
            method: "GET",
          	url: createTagUrl,
          	data: {
          	    cmd: "canCreateTag",
                tag: name,
                locale: "en",
                "_charset_": "utf-8"
                },
            async:false
        }).done(function(){
            existInDefault = false;
        })
        return existInDefault;
    }
    
    function startsWith(str, prefix) {
        return str.indexOf(prefix) === 0;
    }

    function handleTags(form) {
        return $.when.apply(null, form.find('[name="./cq:tags"]').map(function() {
            var el = this;
            var existing = $(el).hasClass("cq-TagList-tag--existing");
            var patchAppend = startsWith(el.value, "+");
            var patchRemove = startsWith(el.value, "-");
            var value = el.value.replace(/[\+\-]/, "");

            if (existing || patchRemove || value.indexOf(":") >= 0 || tagExistInDefault(value)) {
                return;
            }

            return createTag(value).then(function(tag) {
                // Fix tag name in select element
                el.value = patchAppend ? "+" + tag : tag;
            });
        }));
    }

    
    function run() {
        // register submit handler at <body> to handle the tags
        // and let foundation-form does its job at document level
        $("body").on("submit", "form.cq-siteadmin-admin-properties", function(e) {
            if (e["_cq-siteadmin-admin-properties"]) return;

            // the code that handles the tag creation is only required by the cq/gui/components/common/tagspicker component
            // the new cq/gui/components/coral/common/form/tagfield handles the tag creation out of the box
            if ($(".js-cq-TagsPickerField.coral-PathBrowser").length === 0) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            var form = $(this);
            
            // TODO handling tags this way is error prone and creating great inconvenience
            // rather, the server should handle everything, and let the client to just submit the form normally
            handleTags(form).done(function() {
                var ns = ".cq-siteadmin-admin-properties";
                $(document).on("foundation-contentloaded" + ns, function(e) {
                    if ($("form.cq-siteadmin-admin-properties", e.target).length === 0) {
                        return; // not caused by us
                    }
                    
                    // TODO this feature can be removed once we migrate to Shell3.
                    $(".foundation-content-control[data-foundation-content-control-action=back]", e.target).attr("data-foundation-content-control-refresh", "true");
                    $(document).off(ns);
                });
                
                form.trigger($.Event("submit", {
                    "_cq-siteadmin-admin-properties": true
                }));
            });
        });

        // handle new tags within the pageeditor dialogs
        $("body").on("submit", "form[data-cq-dialog-pageeditor]", function(e) {
            if (e["_data-cq-dialog-pageeditor"]) return;
            var form = $(this);

            // page properties only
            if ($('.cq-dialog-content-page', form).length === 0) return;

            e.preventDefault();
            e.stopPropagation();

            handleTags(form).done(function() {
                form.trigger($.Event("submit", {
                    "_data-cq-dialog-pageeditor": true
                }));
            });
        });
    }
    
    if ($("body").length) {
        run();
    } else {
        $(run);
    }

})(document, Granite, Granite.$, CUI, Coral);

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
(function(Granite, $, Coral, channel) {
    "use strict";

    var SELECTORS = {
        authRequired: "[name='./cq:authenticationRequired']",
        loginPath: "[name='./cq:loginPath']",
        deprecatedCugConfig: "[data-deprecated-cugconfig]"
    };
    
    $(document).on('change', SELECTORS.authRequired, function() {
        togglePathBrowser(this);
    });
    
    var togglePathBrowser = function(checkboxElement) {
        var loginPath = document.querySelector(SELECTORS.loginPath);
 	   var authRequired = document.querySelector(SELECTORS.authRequired);
         if (authRequired.checked) {
             loginPath.disabled = false;
         } else {
             loginPath.disabled = true;
         }
     };
    channel.one("foundation-contentloaded", function () {
        var authRequired = document.querySelector(SELECTORS.authRequired);
        var loginPath = document.querySelector(SELECTORS.loginPath);
        var deprecatedCugConfig = document.querySelector(SELECTORS.deprecatedCugConfig);

        if (authRequired && loginPath) {
            // If the Page uses a deprecated config for the CUGs, make sure the authRequired and loginPath are disabled
            if (deprecatedCugConfig) {
                authRequired.disabled = true;
                loginPath.disabled = true;

                // Remove MSM data attributes to avoid having MSM re-enabling the fields
                delete authRequired.dataset.cqMsmLockable;
                delete loginPath.dataset.cqMsmLockable;
            }
            else{

				loginPath.disabled = !authRequired.checked;
            }
            // Set value of the login path from its data attribute
            Coral.commons.ready(function () {
                if (loginPath && loginPath.dataset && loginPath.dataset.foundationAutocompleteValue !== undefined) {
                    loginPath.value = loginPath.dataset.foundationAutocompleteValue;
                }
            });

        }
    });
})(Granite, Granite.$, Coral, Granite.$(document));

/*
  ADOBE CONFIDENTIAL

  Copyright 2012 Adobe Systems Incorporated
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
// @Deprecated since 6.4 use cq/gui/components/siteadmin/admin/properties/localacl/localacllistitem/clientlibs/js/permissions.js
(function(document, Granite, $) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui");

    /**
     * Show/hide new permission section depending on the existing local acl
     */
    function toggleNewPermission(show) {
        $(".cq-siteadmin-admin-properties-newpermission").toggle(show);
        if(show) {
            $(".cq-siteadmin-admin-properties-addpermission").attr("disabled", true);
            $(".cq-siteadmin-admin-properties-newpermission input[type=checkbox]").removeAttr('checked');
            $(".cq-siteadmin-admin-properties-userpicker .coral-TagList").hide();
            $(".cq-siteadmin-admin-properties-userpicker .coral-TagList").on("itemadded", function(e){
                $(this).show();
            });
            $(".cq-siteadmin-admin-properties-userpicker .coral-TagList").on("itemremoved", function(e){
                if($(this).data("tagList").getValues().length === 0) {
                    $(this).hide();
                }
            });
            $(".cq-siteadmin-admin-properties-userpicker").data("autocomplete").getValue().forEach(function (value) {
                $(".cq-siteadmin-admin-properties-userpicker > .js-coral-Autocomplete-tagList").data("tagList").removeItem(value);
            });
        } else {
            $(".cq-siteadmin-admin-properties-addpermission").removeAttr("disabled");
        }

    }

    /**
     * Add/Edit acl entries
     */
    function updateAccessControlEntry(authorizables, el, action, callback) {
        var changes = [];
        $.each(authorizables, function(index, auth){
            var changelogEntry = {};
            changelogEntry['authorizableId'] = auth;
            changelogEntry['privileges'] = [];
            $.each($(el).closest(".endor-ActionBar").siblings(".cq-siteadmin-admin-acllist").find(".coral-Checkbox-input:not([name=comment])"), function (i, input) {
                var entry = {};
                entry["name"] = $(input).attr("name")
                entry["value"] = $(input).is(':checked');
                changelogEntry['privileges'].push(entry);
            });
            changes.push(changelogEntry);
        });
        var settings = {
                            predicate: 'siteadmin',
                            path: Granite.HTTP.encodePath($("#page-path").val()),
                            changelog: JSON.stringify(changes), 
                            contentType: "application/json; charset=utf-8",
                            action: action
                };
        $.post(Granite.HTTP.externalize($("#page-path").val() + ".pagepermissions.conf"), settings, callback);
    }
    
    /**
     * Remove current acl entry
     */
    function removeAccessControlEntry() {
        ui.prompt(Granite.I18n.get("Delete permission"), 
                Granite.I18n.get("Do you really want to delete permissions for this user/group?"), 
                "error", 
                [{
                  text: Granite.I18n.get("Cancel"),
                  id: "no"
                 },
                 {
                  text: Granite.I18n.get("Delete"),
                  id: "yes",
                  warning: true
                 }], 
                function(btnId) {
                  if (btnId === "yes") {
                      var settings = {
                          type: "POST",
                          data: {
                              authorizableId: $("#selected-authorizable").val(),
                              path: Granite.HTTP.encodePath($("#page-path").val()),
                              action : 'remove'
                          },
                          complete: function (xhr, status) {
                              if (status === "success") {
                                  var container = $(".cq-siteadmin-admin-properties-aclentries");
                                  container.find(".foundation-collection-item[data-authorizable-id='" + $("#selected-authorizable").val() + "']").remove();
                                  toggleNewPermission(container.find(".coral-Collapsible").length === 0);
                              }
                          }
                      };
                      $.ajax(Granite.HTTP.externalize($("#page-path").val() + ".pagepermissions.conf"), settings);
                  } 
          });
    }

    /**
     * Remove Permissions tab if user does not have read_acl privilege
     */
    function togglePermissionsTab(){
        var isVisible = $(".cq-siteadmin-admin-properties-permissions").length !== 0 ;
        return isVisible;
    }
    
    /**
     * Init acl list checkboxes behavior
     */
    function initAclCheckboxes() {
      //if "Browse" checkbox is deselected then all the other permissions should be unselected
        $('.cq-siteadmin-admin-acllist input[name=read]').change(function () {
            var checked = this.checked,
            container = $(this).closest('.cq-siteadmin-admin-acllist');
            if(!checked){
                container.find('.coral-Checkbox-input').prop({
                    indeterminate: false,
                    checked: checked
                }).attr({
                    'aria-checked': checked,
                    'checked': checked
                });
            }
        });
        $('.cq-siteadmin-admin-acllist input[type=checkbox]:not([name=read])').change(function () {
            var checked = this.checked;
            if(checked){
                $('input[name=read]').prop({
                    indeterminate: false,
                    checked: checked
                }).attr({
                    'aria-checked': checked,
                    'checked': checked
                });
            }
        });
        //dependency between "Edit" and "Delete" privileges
        $('.cq-siteadmin-admin-acllist input[name=modify]').change(function () {
            var checked = this.checked,
                container = $(this).closest('.cq-siteadmin-admin-acllist');
            if(!checked){
                container.find('.coral-Checkbox-input[name=delete]').prop({
                    indeterminate: false,
                    checked: checked
                }).attr({
                    'aria-checked': checked,
                    'checked': checked
                });
            }
        });
        $('.cq-siteadmin-admin-acllist input[name=delete]').change(function () {
            var checked = this.checked,
                container = $(this).closest('.cq-siteadmin-admin-acllist');
            if(checked){
                container.find('.coral-Checkbox-input[name=modify]').prop({
                    indeterminate: false,
                    checked: checked
                }).attr({
                    'aria-checked': checked,
                    'checked': checked
                });
            }
        });
    }
    
    /**
     * Init effective acl triggers and modal
     */
    function initEffectiveAclTriggers() {
        var effectiveTrigger = $(".cq-siteadmin-admin-properties-vieweffective");
        
        //make effective perissions button 100% wide if user has only read_acl rights
        if($(".cq-siteadmin-admin-properties-addpermission").length === 0) {
            var currentClasses = effectiveTrigger.prop("class");
            effectiveTrigger.removeClass(currentClasses)
                    .addClass("coral-Button--block " + currentClasses)
                    .removeClass("permission-action-button");
            $(".cq-siteadmin-admin-properties-aclentries .coral-Collapsible").addClass("permission-disabled");
        }

        effectiveTrigger
        .off("click.vieweffective")
        .on("click.vieweffective", function(e) {
            $.get(
                Granite.HTTP.externalize($(".cq-siteadmin-admin-properties-effective-permissions").data("effectiveacl-src")),
                {'_dc': new Date().getTime()}
            ).done(function (html) {
                var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                    var el = $(processed);
                    var collectionApi = $(".cq-siteadmin-admin-properties-effective-permissions").adaptTo("foundation-collection");
                
                    var col = el.find(".foundation-collection");
                    if(!collectionApi) {
                        $(".cq-siteadmin-admin-properties-effective-permissions").replaceWith(col);
                        collectionApi = $(".cq-siteadmin-admin-properties-effective-permissions").adaptTo("foundation-collection");
                    }

                    collectionApi.clear();
                    collectionApi.append(col.find(".foundation-collection-item").get());

                    $(".cq-siteadmin-admin-properties-effective-permissions").find(".shortenpath").each(function () {
                        var el = $(this);
                        if (el.data("shortened")) {
                            return;
                        }

                        (new Granite.UI.Shortener(el)).shorten();

                        el.data("shortened", true);
                    });
                });
            });
        });
    }

    /**
     * Handler for the foundation mode change to display empty content information
     */
    $(document).on("foundation-mode-change", function(e, mode, group){
        var addOrRemove = !(mode === "default" && $(".cq-siteadmin-admin-properties-aclentries .coral-Collapsible").length === 0);
        $(".cq-emptycontent").toggleClass("foundation-field-hide-in-default", addOrRemove);
    });

    $(document).on("foundation-contentloaded", function(e) {
        if(!togglePermissionsTab()) {
            return;
        }

        var aclList =  $(".cq-siteadmin-admin-properties-aclentries .coral-Collapsible");
        
        var show = aclList.length === 0;
        toggleNewPermission(show);

        initAclCheckboxes();

        initEffectiveAclTriggers();

        $(".cq-siteadmin-admin-properties-addpermission")
            .off("click.addpermission")
            .on("click.addpermission", function(event) {
                toggleNewPermission(true);
        });

        $(".cq-siteadmin-admin-properties-cancel")
            .off("click.canceladd")
            .on("click.canceladd", function(event) {
                toggleNewPermission(false);
        });

        $(".cq-siteadmin-admin-properties-cancelacl")
            .off("click.cancelacl")
            .on("click.cancelacl", function(event) {
                var $container = $(this).closest('.coral-Collapsible').data("accordion").setActive(false);;
        });

        //delete acl
        $(".cq-siteadmin-admin-properties-deleteacl")
            .off("click.deleteacl")
            .on("click.deleteacl", function(event) {
                $("#selected-authorizable").val($(this).closest(".foundation-collection-item.coral-Collapsible").data("authorizable-id"));
                removeAccessControlEntry();
            });

        //edit acl
        $(".cq-siteadmin-admin-properties-editacl")
            .off("click.editacl")
            .on("click.editacl", function(event) {
                var authorizables = [];
                authorizables.push($(this).closest(".foundation-collection-item.coral-Collapsible").data("authorizable-id"));

                /*var errorMsg = "";
                if($(this).closest(".endor-ActionBar").siblings(".cq-siteadmin-admin-acllist").find(".coral-Checkbox-input:checked").length === 0) {
                    errorMsg += Granite.I18n.get("At least one permission must be selected otherwise delete the entry.")
                }
                if(errorMsg.length > 0) {
                    var ui = $(window).adaptTo("foundation-ui");
                    ui.alert(Granite.I18n.get("Warning"), errorMsg, "notice");
                    return;
                }*/
                updateAccessControlEntry(authorizables, this, 'edit', null);
            });

        //add new acl
        $(".cq-siteadmin-admin-properties-addacl")
            .off("click.addacl")
            .on("click.addacl", function(event) {
                var userPicker = $(".cq-siteadmin-admin-properties-userpicker").data("autocomplete");
                var selectedAuthorizables = userPicker.getValue();
                var errorMsg = "";
                if(selectedAuthorizables.length === 0) {
                    errorMsg += Granite.I18n.get("At least one user/group must be selected. ")
                }
                /*if($(".cq-siteadmin-admin-properties-userpicker").parent().parent().siblings(".cq-siteadmin-admin-acllist").find(".coral-Checkbox-input:checked").length === 0) {
                    if(errorMsg.length > 0) {
                        errorMsg += "</br>"
                    }
                    errorMsg += Granite.I18n.get("At least one permission must be selected.")
                }*/
                if(errorMsg.length > 0) {
                    ui.alert(Granite.I18n.get("Warning"), errorMsg, "notice");
                    return;
                }
                updateAccessControlEntry(selectedAuthorizables, this, 'add', function (xhr, status) {
                            if (status === "success") {
                                $.get(
                                    Granite.HTTP.externalize($(".cq-siteadmin-admin-properties-aclentries").data("aclentries-src")),
                                        {'_dc': new Date().getTime()}
                                ).done(function (html) {
                                    var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                                        var el = $(processed);
                                        var collectionApi = $(".cq-siteadmin-admin-properties-aclentries").adaptTo("foundation-collection");
                
                                        var col = el.find(".foundation-collection");
                                        collectionApi.clear();
                                        collectionApi.append(col.find(".foundation-collection-item").get());

                                    });
                                    toggleNewPermission(false);
                                });
                            }
        				});
            });

        /**
         * Load data for each user when collapsible is expanded
         */
        aclList.each(function () {
            var accordion = $(this).data("accordion");
            accordion.on("activate", function(e){
                var param = {
                    '_dc': new Date().getTime(),
                    'authorizableId': $(this).closest(".foundation-collection-item.coral-Collapsible").data("authorizable-id"),
                    'predicate': 'siteadmin',
                    'path': Granite.HTTP.encodePath($("#page-path").val())
                };

                $.ajax({
                    type: 'GET',
                    dataType: 'json',
                    url: Granite.HTTP.externalize($("#page-path").val() + ".pagepermissions.json"),
                    data: param
                }).done(function (data) {
                        var hasReadRight = data["privileges"]["read"] === "allow";
                        var hasCommentRight = data["privileges"]["comment"] === "allow";
                        var hasModifyRight = data["privileges"]["modify"] === "allow";
                        var hasDeleteRight = data["privileges"]["delete"] === "allow";
                        var hasReplicateRight = data["privileges"]["replicate"] === "allow";
                        var hasCreateRight = data["privileges"]["create"] === "allow";
                        $(this).find("input[name=read]").attr("checked", hasReadRight);
                        $(this).find("input[name=comment]").attr("checked", hasCommentRight);
                        $(this).find("input[name=modify]").attr("checked", hasModifyRight);
                        $(this).find("input[name=delete]").attr("checked", hasDeleteRight);
                        $(this).find("input[name=replicate]").attr("checked", hasReplicateRight);
                        $(this).find("input[name=create]").attr("checked", hasCreateRight);
                        var collapsible = $(this).closest(".foundation-collection-item.coral-Collapsible");

                        $(this).find('.coral-Checkbox-input').each(function() {
                            var checked = this.checked;
                            var readonly = $(this).closest('li').find(".foundation-field-readonly").first();
                            if(checked){
                                readonly.find(".coral-Icon--check").remove();
                                readonly.prepend('<i class="coral-Icon coral-Icon--check coral-Icon--sizeXS">');
                            } else {
                                readonly.find(".coral-Icon--check").remove();
                            }
                        });
                }.bind(this));
            });
        });
    });

})(document, Granite, Granite.$);

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
;(function(document, Granite, $) {
    "use strict";

    /**
     * Convert the required fields to optional ones.
     *
     * @param $properties
     */
    function unsetRequiredFields($properties) {
        $properties.find(":-foundation-submittable").each(function() {
            var field = $(this).adaptTo("foundation-field");

            if (field !== undefined && field.isRequired && field.isRequired()) {
                // field is not required anymore
                field.setRequired(false);

                // remove the asterisk from the label
                var label = $(this).siblings("label");
                var text = label.text();
                label.text(text.replace(/[*]/g,""));
            }

        });
    }

    $(document).on("foundation-contentloaded", function(e) {
        var $initialPageProperties = $("form.cq-siteadmin-admin-properties-initial").find(".cq-siteadmin-admin-properties-tabs").eq(0);
        if ($initialPageProperties.length > 0) {
            unsetRequiredFields($initialPageProperties);
        }
    });

})(document, Granite, Granite.$);
