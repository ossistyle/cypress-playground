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
/* eslint no-useless-concat:0 */
(function(document, $) {
    "use strict";
    var activator = ".cq-damadmin-admin-actions-adhocassetshare-activator";
    var form = "#adhocassetshareform";

    var sharejobname = "#sharejobname";

    var expirationDate = "#expirationDate > input";

    var submit = "#adhocassetshareform-submit";

    var userPickerEl = "#adhocassetshare-userpicker";
    var userPickerErrorToolTip;
    var userPickerErrorIcon;

    $(document).on("click", activator, function(e) {
        var $form = $(form);
        reset($form);
    });

    function reset($form) {
        // reset the form
        var members = $("#adhocassetshare-members");
        if ($(members).find("tbody").length > 0) {
            $(members).find("tbody").html("");
        }
        // disable the form submit button
        var $submit = $(submit);
        $submit.attr("disabled", "disabled");
        $(form).find("input[type=text], textarea").val("");
        $(form).find("input[type=checkbox]").prop("checked", false);
    }

    $(document).on("click", submit, function(e) {
        e.preventDefault();

        var $form = $("#adhocassetshareform");


        var contentPath = getContentPath();
        var data = $form.serialize();

        $(".foundation-selections-item").each(function() {
            data += "&path=" + (encodeURIComponent($(this).data("foundation-collection-item-id")));
        });

        if ($(".foundation-selections-item").length === 0) {
            data += "&path=" + (encodeURIComponent($($(".foundation-content-path")).data("foundation-content-path")));
        }

        var shareLinkValue = $("#sharelink").val();
        var shareLinkToken = shareLinkValue.substr(shareLinkValue.indexOf("?sh=") + 4);
        if (shareLinkToken.length > 0) {
            data += "&shareLinkToken=" + shareLinkToken;
        }
        if ($form.find("input[type=checkbox]").prop("checked")) {
            data += "&allowOriginal=true";
        } else {
            data += "&allowOriginal=false";
        }
        var numAssetsShared = $(".foundation-selections-item").length;
        $.ajax({
            type: "POST",
            url: Granite.HTTP.externalize(contentPath + ".adhocassetshare.html"),
            contentType: $form.prop("enctype"),
            data: data,
            cache: false
        }).done(function(data, textStatus, jqXHR) {
            $("#adhocassetshare-dialog").remove();
            var message = "";
            if (numAssetsShared > 1) {
                message = Granite.I18n.get("Assets have been shared.");
            } else {
                message = Granite.I18n.get("Asset has been shared.");
            }

            var successModal = new Coral.Dialog().set({
                id: "linkshare-success-dialog",
                variant: "success",
                closable: "on",
                header: {
                    innerHTML: Granite.I18n.get("Share Link")
                },
                content: {
                    innerHTML: message
                },
                footer: {
                    innerHTML: '<button is="coral-button" class="closeExport" variant="default" coral-close>' +
                               Granite.I18n.get("Close") + "</button>"
                }
            });
            $("body").append(successModal);
            successModal.show();
        }).fail(function(jqXHR, textStatus, errorThrown) {
            $("#adhocassetshare-dialog").remove();
            // show the error
            var errorModal = new Coral.Dialog().set({
                id: "linkshare-error-dialog",
                variant: "error",
                closable: "on",
                header: {
                    innerHTML: Granite.I18n.get("Share Link")
                },
                content: {
                    innerHTML: Granite.I18n.get("An error occurred in link sharing")
                },
                footer: {
                    innerHTML: '<button is="coral-button" class="closeExport" variant="default" coral-close>' +
                                Granite.I18n.get("Close") + "</button>"
                }
            });
            $("body").append(errorModal);
            errorModal.show();
        });
    });

    $(document).on("change", "#sharejobname, #expirationDate", function(e) {
        checkSubmit();
    });

    function getContentPath() {
        var contentPath;
        var isSelectionMode = $(".foundation-selections-item").length ||
                              $(".cq-damadmin-admin-childpages").hasClass("mode-selection");
        if (isSelectionMode) {
            contentPath = $(".foundation-selections-item").data("foundation-collection-item-id");
        } else {
            contentPath = $(".foundation-content-path").data("foundationContentPath");
        }
        return contentPath;
    }

    $(document).on("click", ".linkshare-user", function(e) {
        $("#add-new-user").trigger("click");
    });

    $(document).on("click", "#add-new-user", function(e) {
        var $this = $(this);
        var uriTemplate = $this.data("foundationCollectionAction").data.href;
        var userPicker = $("#adhocassetshare-userpicker");
        var inputText = $("input[type='text']", userPicker);
        var inputAssignee = $("input[type='hidden']", userPicker);
        var userId = inputAssignee.val().trim();
        var userDetails;
        var members;
        var header;
        var id;
        if (userId.length > 0 && userId !== "external-anon-user") {
            var result = Granite.$.ajax({
                type: "GET",
                async: false,
                url: Granite.URITemplate.expand(uriTemplate, { query: userId, searchById: "true" })
            });
            if (result.status === 200) {
                userDetails = $($(result.responseText)[0]);
                id = userDetails.data("value");
                var email = userDetails.data("email");
                if (id && isEmailValid(email)) {
                    members = $("#adhocassetshare-members");
                    if ($(members).find("th").length < 1) {
                        header = "<tr><th></th><th>" + Granite.I18n.get("TITLE") + "</th><th>" +
                                  Granite.I18n.get("EMAIL") + "</th> <th></th></tr>";
                        if ($(members).find("tbody").length > 0) {
                            $(members).find("tbody").prepend(header);
                        }
                    }
                    removeDuplicateandAddNewMember(members, id, userDetails);
                }
                // remove the text from the text box and disable the add button
                inputText.val("");
                $("#add-new-user").attr("disabled", "disabled");
                checkSubmit();
            }
        } else if (userId.length > 0 && userId === "external-anon-user") {
            var inputTextVal = inputText.val();
            var externalUserMail = inputTextVal.substring(inputTextVal.lastIndexOf("<") +
                                   1, inputTextVal.lastIndexOf(">"));
            var avatar = Granite.HTTP.externalize("/libs/granite/security/clientlib/themes/default/resources/" +
                                                  "sample-user-thumbnail.36.png");
            userDetails = $("<li class=\"coral-SelectList-item coral-SelectList-item--option foundation-layout-" +
                             "flexmedia\"" + " data-value=\"external-anon-user\" data-display=\"" + inputText +
                             "\" data-name=\"External User\" data-email=\"" +
                             externalUserMail + "\"><img class=\"foundation-layout-flexmedia-img\" width=\"32\"" +
                             "height=\"32\" src=\"" + avatar + "\"><div class=\"foundation-layout-flexmedia-bd\">" +
                             "<div class=\"foundation-layout-flexmedia-bd-singleline\">External User</div>" +
                             "<div class=\"foundation-layout-flexmedia-bd-singleline foundation-layout-util-" +
                             "subtletext\">" + "external-anon-user</div></div></li>");
            id = userDetails.data("value");
            if (id && isEmailValid(externalUserMail)) {
                members = $("#adhocassetshare-members");
                if ($(members).find("th").length < 1) {
                    header = "<tr><th></th><th>" + Granite.I18n.get("TITLE") + "</th><th>" + Granite.I18n.get("EMAIL") +
                             "</th> <th></th></tr>";
                    if ($(members).find("tbody").length > 0) {
                        $(members).find("tbody").prepend(header);
                    }
                }
                removeDuplicateandAddNewMember(members, id, userDetails);
            }
            // remove the text from the text box and disable the add button
            inputText.val("");
            $("#add-new-user").attr("disabled", "disabled");
            checkSubmit();
        }
    });

    function removeDuplicateandAddNewMember(members, id, userDetails) {
        var duplicateFound = false;
        if (id === "external-anon-user") {
            if (userDetails.data("email").length > 0) {
                id = userDetails.data("email");
            }
        }
        members.find("tr").each(function() {
            var m = $(this);
            var mID = m.find(".email input[name=\"email\"]").val();
            if (id !== undefined && mID !== undefined && id.toString().toLowerCase() === mID.toString().toLowerCase()) {
                duplicateFound = true;
                return;
            }
        });

        if (!duplicateFound) {
            addMember(members, id, userDetails);
        }
    }

    function addMember(members, id, userDetails) {
        var avatar = $("img", userDetails).attr("src");
        if (!avatar) {
            avatar = Granite.HTTP.externalize("/libs/granite/security/clientlib/themes/default/resources" +
                     "/sample-user-thumbnail.36.png");
        }
        var name = userDetails.data("name");
        var email = userDetails.data("email");
        var userid = userDetails.data("value");
        // create the markup with these values
        var member = $("<tr>");
        var cavatar = $("<td class=\"avatar\"><img src=\"" + avatar + "\" width=\"42\"></td>");
        var displayLocName = name;
        if (name === "External User") {
            displayLocName = Granite.I18n.get("External User");
        }
        var cName = $("<td class=\"name\">" + displayLocName + "</td>");
        var cEmail = $("<td class=\"email\"> <input type=\"hidden\" name=\"principalName\" value=\"" +
                     userid + "\"> <input type=\"hidden\" name=\"email\" value=\"" +
                     email + "\"> <span class=\"greyText\"></span>" + email + "</td>");
        var cRemove = $("<td class=\"remove\"><button title=\"" + Granite.I18n.get("Remove") +
                      "\"class=\"coral-Button coral-Button--quiet\" type=\"button\"><i class=\"" +
                      "coral-Icon coral-Icon--sizeXS coral-Icon--closeCircle \"></i></button></td>");
        member.append(cavatar);
        member.append(cName);
        if (email && email.length > 0) {
            member.append(cEmail);
            // member.append(cUserid);
        }
        member.append(cRemove);
        members.append(member);
        var numusers = $("#adhocassetshare-members").find(".avatar").length;
        if (numusers === 1) {
            hideUserPickerRequiredError();
        }
    }

    $(document).on("click", "#adhocassetshare-members .remove", function() {
        var member = $(this).closest("tr");
        if (member) {
            member.remove();
            var numusers = $("#adhocassetshare-members").find(".avatar").length;
            if (numusers <= 0) {
                showUserPickerRequiredError();
                var members = $("#adhocassetshare-members");
                if ($(members).find("tbody").length > 0) {
                    $(members).find("tbody").html("");
                }
                checkSubmit();
            }
        }
    });

    var assetShareLink = "";
    // Get the share link to display in the modal, so that the user can also copy the link
    $(document).on("click", ".cq-damadmin-admin-actions-adhocassetshare-activator", function(e) {
        if ($(".cq-damadmin-admin-actions-adhocassetshare-activator")
            .closest(".foundation-toggleable")[0] !== undefined) {
            $(".cq-damadmin-admin-actions-adhocassetshare-activator").closest(".foundation-toggleable")[0].hide();
        }
        var data = ":operation=generateShareLink";
        var url = $($(".foundation-selections-item")[0]).data("foundation-collection-item-id");
        if (url === undefined) {
            url = $($(".foundation-content-path")).data("foundation-content-path");
            if (url === undefined) {
                url = "/content/dam";
            } else {
                data += "&path=" + (encodeURIComponent(url));
            }
        } else {
            $(".foundation-selections-item").each(function() {
                data += "&path=" + (encodeURIComponent($(this).data("foundation-collection-item-id")));
            });
        }
        url = url + ".adhocassetshare.html";
        data += "&_charset_=utf-8";
        $.ajax({
            type: "POST",
            data: data,
            async: false,
            url: Granite.HTTP.externalize(url),
            success: function(html) {
                if ($(html).find(".foundation-form-response-status-message").next().text().length > 0) {
                    assetShareLink = $(html).find(".foundation-form-response-status-message").next().text();
                    assetShareLink = assetShareLink.substr(assetShareLink.indexOf("Share link:") + 11);
                    $(document).trigger("asset-share-link-fetched");
                }
            }
        });
    });

    $(document).on("asset-share-link-fetched", function(e) {
        // Fix this, avoid setTimeOut
        setTimeout(function() {
            $(".adhocassetshare-share-link").val(assetShareLink);

            $("#expirationDate")[0].valueAsDate = new Date(moment().add(1, "days"));
            $("#sharelink").attr("readonly", "true");
            // retain the textbox border..
            $("#sharelink").css({
                "border-width": "1px",
                "border-style": "solid",
                "border-color": "#d0d0d0"
            });
        }, 3000);
    });

    $("#adhocassetshare-userpicker input[type='text']").on("change", function(e) {
        handleAdd();
    });

    $(document).on("blur", "#adhocassetshare-userpicker input[type='text']", function(e) {
        var numusers = $("#adhocassetshare-members").find(".avatar").length;
        if (numusers <= 0) {
            showUserPickerRequiredError();
        }
    });

    $(document).on("selected", ".linkshare-user", function(e) {
        handleAdd();
    });

    function handleAdd() {
        var text = $("#adhocassetshare-userpicker input[type='text']").val();
        var addUser = $("#add-new-user");
        if (text.length > 0) {
            addUser.removeAttr("disabled");
        } else {
            addUser.attr("disabled", "disabled");
        }
    }

    function isEmailValid(email) {
        // eslint-disable-next-line  no-useless-escape
        var re = /^([\w-\+]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;

        return re.test(email);
    }

    function checkSubmit() {
        var $sharejobname = $(sharejobname);
        var $expirationDate = $(expirationDate);
        var $submit = $(submit);
        var name = $sharejobname.val().trim();
        var exDate = $expirationDate.val().trim();
        var numusers = $("#adhocassetshare-members").find(".avatar").length;
        if (name === "" || exDate === "" || numusers <= 0) {
            $submit.attr("disabled", "disabled");
        } else {
            $submit.removeAttr("disabled");
        }
    }

    function showUserPickerRequiredError() {
        var $userPickerEl = $(userPickerEl);
        $userPickerEl.find("input[type='text']").addClass("is-invalid");
        $userPickerEl.css("padding-top", "1.6875rem");
        if (!userPickerErrorIcon) {
            userPickerErrorIcon = new Coral.Icon().set({
                id: "user-picker-fielderror-icon",
                icon: "alert",
                size: "S"
            });
            userPickerErrorIcon.className += " coral-Form-fielderror error-info-icon";
        }
        $userPickerEl.prepend(userPickerErrorIcon);
        if (!userPickerErrorToolTip) {
            userPickerErrorToolTip = new Coral.Tooltip().set({
                variant: "error",
                content: {
                    innerHTML: Granite.I18n.get("Please fill out this field.")
                },
                target: "#user-picker-fielderror-icon",
                placement: "left",
                id: "user-picker-fielderror-tooltip"
            });
        }
        $userPickerEl.prepend(userPickerErrorToolTip);
    }

    function hideUserPickerRequiredError() {
        var $userPickerEl = $(userPickerEl);
        $userPickerEl.find("input[type='text']").removeClass("is-invalid");
        $userPickerEl.css("padding-top", "0");
        $userPickerEl.find("#user-picker-fielderror-icon").remove();
        $userPickerEl.find("#user-picker-fielderror-tooltip").remove();
    }
})(document, Granite.$);
