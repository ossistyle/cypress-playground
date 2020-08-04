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
(function(window, $, Granite) {
    "use strict";

    var registry = $(window).adaptTo("foundation-registry");
    var validationMap = new WeakMap();

    function createTags(url, titles) {
        return $.ajax({
            method: "POST",
            url: url,
            data: {
                cmd: "createTag",
                title: titles,
                _charset_: "utf-8"
            }
        }).then(function(data, textStatus, xhr) {
        }, function(xhr, textStatus, error) {
            return JSON.parse(xhr.responseText);
        });
    }

    function validate(field) {
        var validation = field.adaptTo("foundation-validation");
        validation.checkValidity();
        validation.updateUI();
    }

    function getUserDefinedTags(field) {
        return field.find("> coral-taglist[foundation-autocomplete-value] > coral-tag[data-foundation-autocomplete-value-userdefined]");
    }

    registry.register("foundation.validation.validator", {
        selector: ".cq-ui-tagfield",
        validate: function(el) {
            var problem = validationMap.get(el);

            if (!problem) {
                return;
            }

            var match = getUserDefinedTags($(el)).filter(function() {
                return this.value === problem.tagTitlePath;
            });

            if (match.length) {
                return problem.detail;
            } else {
                validationMap["delete"](el);
            }
        },
        show: function(el, message, ctx) {
            ctx.next();

            var problem = validationMap.get(el);

            if (!problem) {
                return;
            }

            getUserDefinedTags($(el)).filter(function() {
                return this.value === problem.tagTitlePath;
            }).attr("color", "red");
        }
    });


    /**
     * Register a presubmit handler to create the new tags in the server.
     */
    registry.register("foundation.form.submit", {
        selector: "*",
        handler: function(form) {
            var promises = [];

            $(form).find(".cq-ui-tagfield[data-cq-ui-tagfield-create-action]:not([forceselection])").each(function() {
                var fieldEl = this;
                var field = $(fieldEl);

                var createUrl = fieldEl.dataset.cqUiTagfieldCreateAction;

                var newTitles = getUserDefinedTags(field).map(function() {
                    return this.value;
                }).toArray();

                if (!newTitles.length) {
                    return;
                }

                promises.push(createTags(createUrl, newTitles).then(function() {
                    validationMap["delete"](fieldEl);
                    validate(field);
                }, function(problem) {
                    validationMap.set(fieldEl, problem);
                    validate(field);
                }));
            });

            return {
                preResult: $.when.apply(null, promises)
            };
        }
    });
})(window, Granite.$, Granite);
