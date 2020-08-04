/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(window, document, Granite, $) {
    "use strict";

    var ns = ".foundation-collection-infinityscrolling";
    var MAX_URL_LENGTH = 2000;

    function adjustURL(url) {
        var convert = url.length > MAX_URL_LENGTH;

        var method = "GET";
        var data = undefined;
        var newURL = url;

        if (convert) {
            method = "POST";

            var queryIndex = url.lastIndexOf("?");

            if (queryIndex >= 0) {
                newURL = url.substring(0, queryIndex);
                data = url.substring(queryIndex + 1);
            }
        }

        return {
            method: method,
            url: newURL,
            data: data
        };
    }

    function handleScroll(collection, scrollContainer) {
        var scrollHeight = scrollContainer.prop("scrollHeight");
        var scrollTop = scrollContainer.prop("scrollTop");
        var clientHeight = scrollContainer.prop("clientHeight");

        if (clientHeight + scrollTop >= scrollHeight && collection.is(":visible")) {
            loadNextPage(collection);
        }
    }

    function loadInitPage(collection, scrollContainer) {
        var ch = scrollContainer.height();
        var sh = scrollContainer.prop("scrollHeight");

        var nextPage = collection.data("src");

        if (nextPage && (sh - ch) === 0) {
            loadNextPage(collection).done(function() {
                loadInitPage(collection, scrollContainer);
            });
        }
    }

    function loadNextPage(collection) {
        if (collection.data("foundationCollectionInfinityscrolling.internal.isLoading")) {
            return $.Deferred().reject();
        }

        var nextPage = collection.data("src");
        if (!nextPage) {
            return $.Deferred().reject();
        }

        if (window.console) {
            // eslint-disable-next-line no-console
            console.log(
                "@deprecated [data-src] of .foundation-collection;" +
                " pagination support is done at individual layout now."
            );
        }

        collection.data("foundationCollectionInfinityscrolling.internal.isLoading", true);

        var requestInfo = adjustURL(nextPage);

        return $.ajax({
            method: requestInfo.method,
            url: requestInfo.url,
            data: requestInfo.data,
            cache: false
        }).then(function(html) {
            var deferred = $.Deferred();

            var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                var el = $(processed);
                var collectionApi = collection.adaptTo("foundation-collection");

                var col = el.find(".foundation-collection");

                collection.data("src", col.data("src") || "");
                collectionApi.append(col.find(".foundation-collection-item").get());

                collection.data("foundationCollectionInfinityscrolling.internal.isLoading", false);
                deferred.resolve();
            });

            return deferred.promise();
        }, function() {
            collection.data("foundationCollectionInfinityscrolling.internal.isLoading", false);

            var title = Granite.I18n.get("Error");
            var message = Granite.I18n.get("Something went wrong.");

            var ui = $(window).adaptTo("foundation-ui");
            ui.alert(title, message, "error");
        });
    }

    $(document).on("foundation-contentloaded" + ns, function(e) {
        $(".foundation-collection", e.target).each(function() {
            var collection = $(this);

            var scrollContainer = (function(collection) {
                var scrollSrc = collection.data("scrollSrc");

                if (scrollSrc) {
                    return collection.closest(scrollSrc);
                }

                // just return parent, need to specify data-scroll-src if not suitable. See GRANITE-2223
                return collection.parent();
            })(collection);

            // remove and re-register
            scrollContainer.off("scroll" + ns).on("scroll" + ns, function() {
                handleScroll(collection, scrollContainer);
            });

            loadInitPage(collection, scrollContainer);
        });
    });
})(window, document, Granite, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(document, window, $) {
    "use strict";

    // @deprecated .foundation-form.mode-default and .foundation-form.mode-edit; use foundation-layout-form instead.

    $(document).on("foundation-mode-change", function(e, mode, group) {
        if (mode !== "default" && mode !== "edit") {
            return;
        }

        // only select form that is not .foundation-layout-form, as this code is for backward compatibility only
        $(".foundation-form:not(.foundation-layout-form)").each(function() {
            var el = $(this);

            if (group === el.data("foundationModeGroup")) {
                var edit = mode === "edit";
                el.toggleClass("mode-edit", edit).toggleClass("mode-default", !edit);

                if (window.console) {
                    var msg = "@deprecated .foundation-form.mode-default and .foundation-form.mode-edit;" +
                        " please use foundation-layout-form instead.";
                    // eslint-disable-next-line no-console
                    console.log(msg);
                }
            }
        });
    });
})(document, window, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2014 Adobe
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
(function(document, $, Granite) {
    "use strict";
    // This is the code related to enhancement of CoralUI for Granite UI.

    function createEl(name) {
        return $(document.createElement(name));
    }

    // GRANITE-8359 Override to translate "Add Field".
    var addButton;
    function getAddButton() {
        if (!addButton) {
            addButton = createEl("button")
                .addClass("js-coral-Multifield-add coral-Multifield-add coral-Button")
                .attr("type", "button")
                .text(Granite.I18n.get("Add field"));
        }
        return addButton;
    }

    var removeButton;
    function getRemoveButton() {
        if (!removeButton) {
            removeButton = createEl("button")
                .addClass("js-coral-Multifield-remove coral-Multifield-remove coral-Button coral-Button--square coral-Button--quiet") // eslint-disable-line max-len
                .attr("type", "button")
                .append(
                    createEl("i").addClass("coral-Icon coral-Icon--sizeS coral-Icon--delete coral-Button-icon")
                );
        }
        return removeButton;
    }

    var moveButton;
    function getMoveButton() {
        if (!moveButton) {
            moveButton = createEl("button")
                .addClass("js-coral-Multifield-move coral-Multifield-move coral-Button coral-Button--square coral-Button--quiet") // eslint-disable-line max-len
                .attr("type", "button")
                .append(
                    createEl("i").addClass("coral-Icon coral-Icon--sizeS coral-Icon--moveUpDown coral-Button-icon")
                );
        }
        return moveButton;
    }

    CUI.Multifield.prototype._adjustMarkup = function() {
        this.$element.addClass("coral-Multifield");
        this.ol.children(".js-coral-Multifield-input").append(getRemoveButton().clone(), getMoveButton().clone());
        this.ol.after(getAddButton().clone());
    };


    // Collapsible Counter logic
    $(document).on("activate deactivate", ".coral-Collapsible", function(e) {
        var collapsible = $(this);
        var counter = collapsible.find(".js-granite-coral-CollapsibleCounter");
        var size = 0;

        if (counter.length && collapsible.hasClass("is-active")) {
            var target = counter.data("graniteCoralCollapsiblecounter");

            if (typeof target === "string") {
                var parent;

                if (target.length === 0) {
                    parent = collapsible.children(".coral-Collapsible-content");
                } else {
                    parent = collapsible.find(target);
                }

                size = parent.children().length;
            }
        }

        counter.text(size || "");

        if (size) {
            counter.removeAttr("hidden");
        } else {
            counter.attr("hidden", "");
        }
    });
})(document, Granite.$, Granite);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2014 Adobe
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
(function(window, $) {
    "use strict";
    // This is code to adapt CoralUI component to foundation-toggleable
    // i.e. `$(coralEl).adaptTo("foundation-toggleable")`

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.adapters", {
        type: "foundation-toggleable",
        selector: ".foundation-toggleable.coral-Modal",
        adapter: function(el) {
            var modal = $(el);

            return {
                isOpen: function() {
                    return modal.css("display") !== "none";
                },

                show: function(anchor) {
                    var instance = modal.data("modal");

                    if (!instance) {
                        instance = new CUI.Modal({ element: el, visible: false });
                    }

                    instance.show();
                    modal.trigger("foundation-toggleable-show");
                },

                hide: function() {
                    var instance = modal.data("modal");

                    if (instance) {
                        instance.hide();
                        modal.trigger("foundation-toggleable-hide");
                    }
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-toggleable",
        selector: ".foundation-toggleable.coral-Popover",
        adapter: function(el) {
            var popover = $(el);

            return {
                isOpen: function() {
                    return popover.css("display") !== "none";
                },

                show: function(anchor) {
                    if (!(anchor instanceof Element)) {
                        return;
                    }

                    var instance = popover.data("popover");

                    if (!instance) {
                        instance = new CUI.Popover({ element: el, pointAt: anchor });
                    } else {
                        instance.set("pointAt", anchor);
                    }

                    instance.show();
                    popover.trigger("foundation-toggleable-show");
                },

                hide: function() {
                    var instance = popover.data("popover");

                    if (instance) {
                        instance.hide();
                        popover.trigger("foundation-toggleable-hide");
                    }
                }
            };
        }
    });
})(window, Granite.$);

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
(function(window, $) {
    "use strict";
    // This is code to adapt CoralUI component to foundation-field
    // i.e. `$(coralEl).adaptTo("foundation-field")`

    // Note that some of the implementations below are not completely implementing foundation-field API
    // due to the lack of API in the underlying Coral widgets.
    // If there is a need to support the missing implementation, either Coral needs to be enhanced first,
    // or our implementation needs to do an extra length to do it on behalf.

    function createGenericIsInvalid(el) {
        return function() {
            return el.attr("aria-invalid") === "true";
        };
    }

    function createGenericSetInvalid(el) {
        return function(value) {
            el.attr("aria-invalid", "" + value).toggleClass("is-invalid", value);
        };
    }

    function createGetter(cui, name) {
        return function() {
            return cui.get(name);
        };
    }

    function createSetter(cui, name) {
        return function(value) {
            cui.set(name, value);
        };
    }

    var registry = $(window).adaptTo("foundation-registry");


    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-Textfield:not([is='coral-textfield']):not([is='coral-textarea'])",
        adapter: function(el) {
            return {
                getName: function() {
                    return el.name;
                },
                setName: function(name) {
                    el.name = name;
                },
                isDisabled: function() {
                    return el.disabled;
                },
                setDisabled: function(disabled) {
                    el.disabled = disabled;
                },
                isInvalid: function() {
                    return el.getAttribute("aria-invalid") === "true";
                },
                setInvalid: function(invalid) {
                    el.setAttribute("aria-invalid", invalid ? "true" : "false");
                    $(el).toggleClass("is-invalid", invalid);
                },
                isRequired: function() {
                    return el.getAttribute("aria-required") === "true";
                },
                setRequired: function(required) {
                    el.setAttribute("aria-required", required ? "true" : "false");
                },
                getValue: function() {
                    return el.value;
                },
                setValue: function(value) {
                    el.value = value;
                },
                getLabelledBy: function() {
                    return el.getAttribute("aria-labelledby");
                },
                setLabelledBy: function(labelledBy) {
                    if (labelledBy) {
                        el.setAttribute("aria-labelledby", labelledBy);
                    } else {
                        el.removeAttribute("aria-labelledby");
                    }
                },
                getValues: function() {
                    return [ this.getValue() ];
                },
                setValues: function(values) {
                    el.value = values[0];
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-DatePicker",
        adapter: function(el) {
            var field = $(el);
            var cui = field.data("datepicker");
            var input = field.find(".coral-InputGroup-input");
            var inputFieldAPI = input.adaptTo("foundation-field");

            return {
                isDisabled: createGetter(cui, "disabled"),
                setDisabled: createSetter(cui, "disabled"),
                isInvalid: createGetter(cui, "hasError"),
                setInvalid: createSetter(cui, "hasError"),
                isRequired: createGetter(cui, "required"),
                setRequired: createSetter(cui, "required"),
                getLabelledBy: inputFieldAPI.getLabelledBy,
                setLabelledBy: inputFieldAPI.setLabelledBy
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-FileUpload",
        adapter: function(el) {
            var field = $(el);
            var cui = field.data("fileupload");
            var button = field.find(".coral-FileUpload-trigger");
            var input = field.find(".coral-FileUpload-input");
            var inputFieldAPI = input.adaptTo("foundation-field");

            return {
                isDisabled: createGetter(cui, "disabled"),
                setDisabled: createSetter(cui, "disabled"),
                isInvalid: createGenericIsInvalid(button),
                setInvalid: createGenericSetInvalid(button),
                getLabelledBy: inputFieldAPI.getLabelledBy,
                setLabelledBy: inputFieldAPI.setLabelledBy
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-NumberInput",
        adapter: function(el) {
            var field = $(el);
            var cui = field.data("numberInput");
            var input = field.find(".coral-InputGroup-input");
            var inputFieldAPI = input.adaptTo("foundation-field");

            return {
                isDisabled: createGetter(cui, "disabled"),
                setDisabled: createSetter(cui, "disabled"),
                isInvalid: createGetter(cui, "hasError"),
                setInvalid: createSetter(cui, "hasError"),
                getLabelledBy: inputFieldAPI.getLabelledBy,
                setLabelledBy: inputFieldAPI.setLabelledBy
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-Selector",
        adapter: function(el) {
            var field = $(el);

            return {
                isDisabled: function() {
                    field.find(".coral-Selector-input").each(function() {
                        if (!this.disabled) {
                            return false;
                        }
                    });
                    return true;
                },
                setDisabled: function(disabled) {
                    field.find(".coral-Selector-input").each(function() {
                        this.disabled = disabled;
                    });
                },
                isInvalid: createGenericIsInvalid(field),
                setInvalid: createGenericSetInvalid(field),
                getLabelledBy: function() {
                    var elements = field.find(".coral-Selector-input");
                    if (elements.length > 0) {
                        return elements[0].getAttribute("aria-labelledby");
                    } else {
                        return null;
                    }
                },
                setLabelledBy: function(labelledBy) {
                    field.find(".coral-Selector-input").each(function() {
                        if (labelledBy) {
                            this.setAttribute("aria-labelledby", labelledBy);
                        } else {
                            this.removeAttribute("aria-labelledby");
                        }
                    });
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-Slider",
        adapter: function(el) {
            var field = $(el);
            var cui = field.data("slider");
            var input = field.find(".coral-Slider-value input");
            var inputFieldAPI = input.adaptTo("foundation-field");

            return {
                isDisabled: createGetter(cui, "disabled"),
                setDisabled: createSetter(cui, "disabled"),
                isInvalid: createGenericIsInvalid(field),
                setInvalid: createGenericSetInvalid(field),
                getLabelledBy: inputFieldAPI.getLabelledBy,
                setLabelledBy: inputFieldAPI.setLabelledBy
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-Switch",
        adapter: function(el) {
            var field = $(el);
            var input = field.children(".coral-Switch-input");
            var inputFieldAPI = input.adaptTo("foundation-field");

            // gets the internal labels since their id should not be surfaced
            var internalLabelIds = field
                .children(".coral-Switch-offLabel,.coral-Switch-onLabel")
                .map(function() {
                    return this.id;
                })
                .toArray()
                .join("|");

            var internalLabelIdsRegex = new RegExp(internalLabelIds, "g");

            return {
                isDisabled: function() {
                    return input.prop("disabled");
                },
                setDisabled: function(disabled) {
                    input.prop("disabled", disabled);
                },
                isInvalid: createGenericIsInvalid(input),
                setInvalid: createGenericSetInvalid(input),
                getLabelledBy: function() {
                    var label = inputFieldAPI.getLabelledBy();

                    if (label) {
                        label = label
                            .replace(internalLabelIdsRegex, "")
                            .trim();
                    }

                    return label === "" ? null : label;
                },
                setLabelledBy: function(value) {
                    var finalValue = value;

                    // makes sure that the external label, does not interfere with the internal ones
                    var currentLabel = inputFieldAPI.getLabelledBy();

                    var internalLabels = currentLabel ? currentLabel.match(internalLabelIdsRegex) : null;

                    // "match" can return null if no values are matched
                    if (internalLabels) {
                        finalValue = internalLabels.join(" ").trim() + (value ? " " + value : "");
                    }

                    inputFieldAPI.setLabelledBy(finalValue);
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-Checkbox:not(coral-checkbox)",
        adapter: function(el) {
            var field = $(el);
            var input = field.children(".coral-Checkbox-input");
            var inputFieldAPI = input.adaptTo("foundation-field");

            return {
                isDisabled: function() {
                    return input.prop("disabled");
                },
                setDisabled: function(disabled) {
                    field.children(".coral-Checkbox-input, input[type=hidden][name*='@']").each(function() {
                        this.disabled = disabled;
                    });
                },
                isInvalid: createGenericIsInvalid(input),
                setInvalid: createGenericSetInvalid(input),
                getLabelledBy: inputFieldAPI.getLabelledBy,
                setLabelledBy: inputFieldAPI.setLabelledBy
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-Select",
        adapter: function(el) {
            var field = $(el);
            var button = field.children(".coral-Select-button");
            var select = field.children(".coral-Select-select");
            var inputFieldAPI = select.adaptTo("foundation-field");

            return {
                isDisabled: function() {
                    return select.prop("disabled");
                },
                setDisabled: function(disabled) {
                    button.prop("disabled", disabled);
                    select.prop("disabled", disabled);

                    field.children("input[type=hidden][name*='@']").each(function() {
                        this.disabled = disabled;
                    });
                },
                isInvalid: createGenericIsInvalid(button),
                setInvalid: createGenericSetInvalid(button),
                getLabelledBy: inputFieldAPI.getLabelledBy,
                setLabelledBy: inputFieldAPI.setLabelledBy
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-Multifield:not(coral-multifield)",
        adapter: function(el) {
            var multifield = $(el);

            return {
                setDisabled: function(disabled) {
                    // eslint-disable-next-line max-len
                    var inputs = multifield.find(".js-coral-Multifield-list > .js-coral-Multifield-input > *:first-child");
                    inputs.each(function() {
                        var api = $(this).adaptTo("foundation-field");
                        if (api && api.setDisabled) {
                            api.setDisabled(disabled);
                        }
                    });
                },
                getLabelledBy: function() {
                    // eslint-disable-next-line max-len
                    var inputs = multifield.find(".js-coral-Multifield-list > .js-coral-Multifield-input > *:first-child");
                    var labelledBy = Array.prototype.reduce.call(inputs, function(memo, item) {
                        var api = $(item).adaptTo("foundation-field");
                        if (api && api.getLabelledBy) {
                            memo.push(api.getLabelledBy());
                        }
                        return memo;
                    }, []);

                    if (labelledBy.length) {
                        return labelledBy[0];
                    } else {
                        return null;
                    }
                },
                setLabelledBy: function(labelledBy) {
                    // eslint-disable-next-line max-len
                    var inputs = multifield.find(".js-coral-Multifield-list > .js-coral-Multifield-input > *:first-child");
                    inputs.each(function() {
                        var api = $(this).adaptTo("foundation-field");
                        if (api && api.setLabelledBy) {
                            api.setLabelledBy(labelledBy);
                        }
                    });
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-TagList",
        adapter: function(el) {
            var field = $(el);
            var cui = field.data("tagList");

            return {
                getName: function() {
                    return el.getAttribute("data-fieldname") || "";
                },
                setName: function(value) {
                    el.setAttribute("data-fieldname", value);

                    field.children("input[type=hidden][name*='@']").each(function() {
                        this.name = value;
                    });
                },
                isDisabled: function() {
                    return !!cui.get("disabled");
                },
                setDisabled: function(disabled) {
                    cui.set("disabled", disabled);
                },
                isInvalid: function() {
                    return el.getAttribute("aria-invalid") === "true";
                },
                setInvalid: function(invalid) {
                    el.setAttribute("aria-invalid", invalid ? "true" : "false");
                    field.toggleClass("is-invalid", invalid);
                },
                isRequired: function() {
                    return el.getAttribute("aria-required") === "true";
                },
                setRequired: function(required) {
                    el.setAttribute("aria-required", required ? "true" : "false");
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field",
        selector: ".coral-ColorPicker",
        adapter: function(el) {
            var field = $(el);
            var cui = field.data("colorpicker");
            var $hiddenField = field.children("input[type='hidden']");

            return {
                getName: function() {
                    return field.data("name");
                },
                setName: function(name) {
                    $hiddenField.prop("name", name);
                    field.data("name", name);
                },
                isDisabled: createGetter(cui, "disabled"),
                setDisabled: function(disabled) {
                    $hiddenField.prop("disabled", disabled);
                    field.children(".coral-ColorPicker-button").prop("disabled", disabled);
                    cui.set("disabled", disabled);
                }
            };
        }
    });
})(window, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
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
(function(document, $, Granite) {
    "use strict";

    var mixedString;
    function getMixedString() {
        if (!mixedString) {
            mixedString = Granite.I18n.get("<Mixed entries>");
        }
        return mixedString;
    }

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.adapters", {
        type: "foundation-field-mixed",
        selector: "[data-init='datepicker']",
        adapter: function(el) {
            var field = $(el);
            var cui = field.data("datepicker");

            return {
                setMixed: function(mixed) {
                    var value = cui.get("selectedDateTime");

                    // CUI-3837
                    if (value) {
                        if (mixed) {
                            cui.$element.addClass("foundation-field-mixed");
                            cui.$input.attr("placeholder", getMixedString());
                        } else {
                            cui.$element.removeClass("foundation-field-mixed");
                            cui.$input.removeAttr("placeholder");
                        }
                    }
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field-mixed",
        selector: "[data-init='pathbrowser']",
        adapter: function(el) {
            var field = $(el);
            var cui = field.data("pathBrowser");

            return {
                setMixed: function(mixed) {
                    if (mixed) {
                        cui.$element.addClass("foundation-field-mixed");
                        cui.$element.attr("placeholder", getMixedString());
                    } else {
                        cui.$element.removeClass("foundation-field-mixed");
                        cui.$element.removeAttr("placeholder");
                    }
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field-mixed",
        selector: ".coral-Checkbox",
        adapter: function(el) {
            return {
                setMixed: function(mixed) {
                    if (mixed) {
                        el.classList.add("foundation-field-mixed");
                    } else {
                        el.classList.remove("foundation-field-mixed");
                    }
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-field-mixed",
        selector: ".js-cq-TagsPickerField[data-init='pathbrowser']",
        adapter: function(el) {
            return {
                setMixed: function(mixed) {
                    // CQ-40222
                }
            };
        }
    });
})(document, Granite.$, Granite);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
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
(function(window, $, CUI) {
    "use strict";

    var requiredString;
    function getRequiredString() {
        if (!requiredString) {
            requiredString = Granite.I18n.get("Please fill out this field.");
        }
        return requiredString;
    }

    function handleValidation(el) {
        var api = el.adaptTo("foundation-validation");
        if (api) {
            api.checkValidity();
            api.updateUI();
        }
    }

    var registry = $(window).adaptTo("foundation-registry");


    // Validator for coral-Select
    registry.register("foundation.validation.validator", {
        selector: ".coral-Select-select",
        show: function(element, message, ctx) {
            $(element).closest(".coral-Select").adaptTo("foundation-field").setInvalid(true);
            ctx.next();
        },
        clear: function(element, ctx) {
            $(element).closest(".coral-Select").adaptTo("foundation-field").setInvalid(false);
            ctx.next();
        }
    });


    // Driver for coral-Select
    $(document).on("selected", ".coral-Select", function(e) {
        handleValidation($(this).find(".coral-Select-select"));
    });


    // Driver for coral-Multifield
    var original = CUI.Multifield.prototype._addListeners;

    CUI.Multifield.prototype._addListeners = function() {
        original.apply(this, arguments);

        this.$element.on("click", ".js-coral-Multifield-remove", function(e) {
            handleValidation($(e.delegateTarget));
        });

        this.$element.on("click", ".js-coral-Multifield-add", function(e) {
            var el = $(e.delegateTarget);

            el.find(".js-coral-Multifield-input").attr({
                role: "option",
                "aria-selected": "true"
            });

            handleValidation(el);
        });
    };


    // Validator for coral-NumberInput
    registry.register("foundation.validation.validator", {
        selector: ".js-coral-NumberInput-input",
        show: function(element, message, ctx) {
            $(element).closest(".coral-NumberInput").adaptTo("foundation-field").setInvalid(true);
            ctx.next();
        },
        clear: function(element, ctx) {
            $(element).closest(".coral-NumberInput").adaptTo("foundation-field").setInvalid(false);
            ctx.next();
        }
    });


    // Validator for coral-DatePicker
    registry.register("foundation.validation.validator", {
        selector: ".js-coral-DatePicker-input",
        show: function(element, message, ctx) {
            $(element).closest(".coral-DatePicker").adaptTo("foundation-field").setInvalid(true);
            ctx.next();
        },
        clear: function(element, ctx) {
            $(element).closest(".coral-DatePicker").adaptTo("foundation-field").setInvalid(false);
            ctx.next();
        }
    });


    // Driver for coral-Selector
    $(document).on("change", ".coral-Selector-input", function(e) {
        var el = $(this);
        var selector = el.closest(".coral-Selector");

        if (el.is("[type=radio]")) {
            selector.find(".coral-Selector-input").attr("aria-selected", "false");
        }

        el.attr("aria-selected", "" + this.checked);

        handleValidation(selector);
    });


    // Validator for required for coral-FileUpload
    registry.register("foundation.validation.validator", {
        selector: ".coral-FileUpload-input",
        validate: function(element) {
            var el = $(element);

            if (el.attr("aria-required") !== "true" && !el.data("coral-FileUpload.internal.required")) {
                return;
            }

            var uploadEl = el.closest(".coral-FileUpload");
            var upload = uploadEl.data("fileUpload");

            if (upload.uploadQueue.length) {
                return;
            }

            if (uploadEl.data("coral-FileUpload.internal.hasUpload")) {
                // When it has an upload (e.g. due to `autostart` or manual `upload()` call)
                // it is considered as having value.
                return;
            }

            // Temporary solution for Authoring file upload.
            // Authoring set an image at `.cq-FileUpload-thumbnail-img > img` initially
            // when the file upload has existing value.
            // If the image is set then we have to mark this validator as valid.
            if (uploadEl.has(".cq-FileUpload-thumbnail-img > img").length) {
                // There is other validator for native <input> checking [aria-required] using `value` property,
                // which will report invalid in this case as the `value` is empty.
                // So to skip that validator, we have to "remove" [aria-required] and setup an alternative for that.
                el.attr("aria-required", false);
                el.data("coral-FileUpload.internal.required", true);
                return;
            }

            return getRequiredString();
        }
    });

    // Driver for coral-FileUpload
    $(document).on("fileuploadsuccess", ".coral-FileUpload", function(e) {
        $(this).data("coral-FileUpload.internal.hasUpload", true);
    });

    // Temporary solution for Authoring file upload.
    $(document).on("click", ".coral-FileUpload .cq-FileUpload-clear", function(e) {
        var fileUpload = $(this).closest(".coral-FileUpload");
        var input = fileUpload.data("fileUpload").inputElement;

        fileUpload.removeData("coral-FileUpload.internal.hasUpload");

        handleValidation(input);
    });


    // Validator for required for coral-ColorPicker
    registry.register("foundation.validation.validator", {
        selector: ".coral-ColorPicker",
        validate: function(element) {
            var el = $(element);

            if (el.attr("aria-required") !== "true") {
                return;
            }
            if (!el.children("input[type=hidden]").val()) {
                return getRequiredString();
            }
        }
    });

    // Driver for coral-ColorPicker

    var originalConstruct = CUI.Colorpicker.prototype.construct;

    CUI.Colorpicker.prototype.construct = function() {
        originalConstruct.apply(this, arguments);

        // A workaround for make [role=listview] validtor to always be valid
        // $.validator works only for native or proper ARIA, and CUI.Colorpicker doesn't have ARIA.

        this.$element.attr("role", "listbox");

        $(document.createElement("meta")).attr({
            role: "option",
            "aria-selected": "true"
        }).appendTo(this.$element);
    };

    var originalSetColor = CUI.Colorpicker.prototype._setColor;

    CUI.Colorpicker.prototype._setColor = function() {
        originalSetColor.apply(this, arguments);
        handleValidation(this.$element);
    };


    // Validator UI for the TabPanel,
    // where the tab is valid/invalid according the validity of the fields inside the panel.

    /**
     * Gets the Tab and Pane that contain the provided element.
     */
    function getRelatedTabAndPane(el) {
        var panel = el.closest(".coral-TabPanel-pane");
        var panelIndex = panel.index();
        var tabPanel = panel.closest(".coral-TabPanel");
        var tab = tabPanel.find("> .coral-TabPanel-navigation > .coral-TabPanel-tab").eq(panelIndex);

        return {
            tab: tab,
            pane: panel
        };
    }

    function pushInvalid(container, invalid) {
        var key = "coral-TabPanel.internal.invalids";

        var invalids = container.data(key);
        if (invalids === undefined) {
            invalids = [];
            container.data(key, invalids);
        }

        if (invalids.indexOf(invalid) < 0) {
            invalids.push(invalid);
        }
    }

    $(document).on("foundation-validation-invalid", ".coral-TabPanel", function(e) {
        var result = getRelatedTabAndPane($(e.target));

        result.tab.addClass("is-invalid");
        pushInvalid(result.pane, e.target);
    });

    $(document).on("foundation-validation-valid", ".coral-TabPanel", function(e) {
        var result = getRelatedTabAndPane($(e.target));

        var currentTab = result.tab;
        var currentPanel = result.pane;

        var enable = function() {
            if ($.validator.isValid(currentPanel, true)) {
                currentTab.removeClass("is-invalid");
            }
        };

        var invalids = currentPanel.data("coral-TabPanel.internal.invalids");

        if (!invalids) {
            enable();
            return;
        }

        var i = invalids.indexOf(e.target);
        if (i >= 0) {
            invalids.splice(i, 1);
        }

        if (invalids.length === 0) {
            enable();
            return;
        }

        // check if the invalids are belong to the panel (they can be moved meanwhile)
        // if all of them are outside the panel, then enable the binded element

        var invalid = false;

        var j = invalids.length;
        while (j--) {
            if (currentPanel.has(invalids[j]).length) {
                invalid = true;
                break;
            }
            invalids.splice(j, 1);
        }

        if (!invalid) {
            enable();
        }
    });
})(window, Granite.$, CUI);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
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
(function(document, $) {
    "use strict";

    $(document).on("foundation-contentloaded", function(e) {
        // Intermediate state requires JavaScript
        $(e.target).find("[aria-checked='mixed']").prop("indeterminate", true);
    });
})(document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(window, document, Granite, $, CUI, URITemplate) {
    "use strict";

    var ns = ".foundation-layout-card";
    var qans = ns + "-quickactions";

    function saveSelections(collection, config) {
        if (!config.stateId) {
            return;
        }

        var selectionIds = Array.prototype.map.call(collection.find(".foundation-selections-item"), function(v) {
            return $(v).data("foundationCollectionItemId");
        });

        try {
            window.sessionStorage.setItem(config.stateId + ".selections", JSON.stringify(selectionIds));

            var paginator = collection.data("foundation-layout-card.internal.paginator");
            if (paginator) {
                window.sessionStorage.setItem(config.stateId + ".limit", paginator.offset);
            }
        } catch (e) {
            if (window.console) {
                // eslint-disable-next-line no-console
                console.warn("Error occur saving selections", e);
            }
        }
    }

    function restoreSelections(collection, config) {
        if (!config.stateId) {
            return;
        }

        try {
            var raw = window.sessionStorage.getItem(config.stateId + ".selections");
            if (!raw) {
                return;
            }

            var selectionIds = JSON.parse(raw);
            if (!selectionIds.length) {
                return;
            }

            var selections = collection.find(".foundation-collection-item").filter(function() {
                return selectionIds.indexOf($(this).data("foundationCollectionItemId")) >= 0;
            });

            var cv = CUI.CardView.get(collection);

            if (config.reload && !cv.isGridSelectionMode()) {
                config.selectionMode = true;
            }

            var ln = selections.length;

            selections.each(function(i) {
                cv.select($(this), i < ln - 1);
            });
        } catch (e) {
            if (window.console) {
                // eslint-disable-next-line no-console
                console.warn("Error occur restoring selections", e);
            }
        }
    }

    function addListener(collection, config) {
        var modeChangeHandler = function(e, mode, group) {
            if (e._foundationLayoutCard) {
                return;
            } // It is our event.
            if (mode !== "default" && mode !== "selection") {
                return;
            }
            if (collection.data("foundationModeGroup") !== group) {
                return;
            }

            changeSelectionMode(collection, config, mode);
        };
        collection.data("foundation-layout-card.internal.modeChangeHandler", modeChangeHandler);
        $(document).on("foundation-mode-change", modeChangeHandler);

        collection.on("change:selection" + ns, function(e) {
            if (e.moreSelectionChanges === true) {
                return;
            }
            collection.trigger("foundation-selections-change");
        });
    }

    function changeSelectionMode(collection, config, mode, noBackground, triggerEvent) {
        var isSelection = mode === "selection";

        CUI.CardView.get(collection).setGridSelectionMode(isSelection);

        collection
            .closest(".foundation-collection-container")
            .toggleClass("mode-selection", !noBackground && isSelection);

        if (isSelection) {
            removeQuickActionsListener(collection);
        } else {
            addQuickActionsListener(collection);
        }

        if (config.stateId) {
            // TODO create state api
            $.cookie(config.stateId + ".selectionMode", mode === "selection", { expires: 7, path: "/" });
        }

        if (triggerEvent) {
            var group = collection.data("foundationModeGroup");

            var e = $.Event("foundation-mode-change");
            // Mark the event so that our own handler can detect if it is triggered by us or not.
            e._foundationLayoutCard = true;
            collection.trigger(e, [ mode, group ]);
        }
    }

    function getActions(item, collection, config) {
        var actions = item.find(".foundation-collection-quickactions").children();
        if (actions.length) {
            return actions;
        }

        if (config && config.fallback) {
            return collection
                .siblings("[data-foundation-collection-quickactions-name~=" + config.fallback + "]")
                .children();
        }
    }

    function addQuickActionsListener(collection) {
        var config = collection.data("foundationCollectionQuickactions");
        var selectionsApi = collection.adaptTo("foundation-selections");
        var events = $.quickaction.settings.event;

        collection.on(events.openMenu.touch + qans, ".foundation-collection-item", function(event) {
            var item = $(this);
            var actions = getActions(item, collection, config);

            if (!actions || !actions.length) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            $.quickaction(event, actions.map(function() {
                var a = $(this);

                return {
                    display: a.clone(true).data("foundationCollectionItem", item[0]),
                    pinned: !!a.data("foundationCollectionQuickactionPinned")
                };
            }), {
                container: collection,
                layout: $.quickaction.LAYOUT_CIRCLE,
                autoClose: true,
                displayCloseButton: true
            });

            selectionsApi.clear(true);
            item.addClass("foundation-selections-item");
            collection.trigger("foundation-selections-change");

            collection.one("quickactionclosemenu" + qans, function() {
                selectionsApi.clear();
            });
        });

        if (events.openMenu.touch !== "pointerhold") {
            collection.on(events.openMenu.pointer + qans, ".foundation-collection-item", function(e) {
                var item = $(this);
                var actions = getActions(item, collection, config);

                if (!actions || !actions.length) {
                    return;
                }

                e.preventDefault();
                e.stopImmediatePropagation();

                $.quickaction(e, actions.map(function() {
                    var a = $(this);

                    return {
                        display: a.clone(true).data("foundationCollectionItem", item[0]),
                        pinned: !!a.data("foundationCollectionQuickactionPinned")
                    };
                }), {
                    container: collection,
                    anchor: item,
                    layout: $.quickaction.LAYOUT_BAR,
                    autoClose: true
                });
            });
        }
    }

    function removeQuickActionsListener(collection) {
        collection.off(qans);
    }

    function handlePaging(collection, config) {
        if (!collection.data("foundationCollectionSrc")) {
            return;
        }

        var scrollContainer = config.scrollSrc ? collection.closest(config.scrollSrc) : collection.parent();

        var Paginator = $(window).adaptTo("foundation-util-paginator");

        var paginator = new Paginator({
            el: scrollContainer,
            limit: config.limit || 20,
            resolveURL: function(paginator) {
                return URITemplate.expand(collection.data("foundationCollectionSrc"), {
                    offset: paginator.offset,
                    limit: paginator.limit,
                    id: collection.data("foundationCollectionId")
                });
            },
            processResponse: function(paginator, html) {
                var deferred = $.Deferred();

                var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                    var el = $(processed);
                    var collectionApi = collection.adaptTo("foundation-collection");

                    var items = el.find(".foundation-collection").first().find(".foundation-collection-item").get();
                    collectionApi.append(items);

                    deferred.resolve({
                        length: items.length,
                        hasNext: items.length >= paginator.limit
                    });
                });

                return deferred.promise();
            }
        });

        paginator.start(
            collection.find(".foundation-collection-item").length,
            collection.data("foundation-layout-card.internal.paginator.initialHasNext")
        );

        collection.data("foundation-layout-card.internal.paginator", paginator);
    }

    function removeListener(collection) {
        var modeChangeHandler = collection.data("foundation-layout-card.internal.modeChangeHandler");
        if (modeChangeHandler) {
            $(document).off("foundation-mode-change", modeChangeHandler);
        }
        collection.removeData("foundation-layout-card.internal.modeChangeHandler");

        collection.off("change:selection" + ns);

        removeQuickActionsListener(collection);
    }

    function reload(collection, config) {
        var limit = (function() {
            if (config.stateId) {
                return window.sessionStorage.getItem(config.stateId + ".limit");
            }
        })() || config.limit || 20;

        var id = collection.data("foundationCollectionId");

        var url = URITemplate.expand(config.reload, {
            offset: 0,
            limit: limit,
            id: id
        });

        return $.ajax({
            url: url,
            cache: false
        }).then(function(html) {
            var deferred = $.Deferred();

            var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                var el = $(processed);

                var oldEl = collection.closest(".foundation-collection-container");
                if (!oldEl.length) {
                    oldEl = collection;
                }

                el.replaceAll(oldEl);

                if (!el.hasClass("foundation-collection-container")) {
                    el.trigger("foundation-contentloaded");

                    if (el.hasClass("foundation-collection")) {
                        el.trigger("foundation-selections-change");
                    }

                    deferred.reject(new Error("Invalid content"));
                    return;
                }

                var newCollection = el.find(".foundation-collection").first();
                var items = newCollection.find(".foundation-collection-item");
                var hasNext = items.length >= limit;

                newCollection.data("foundation-layout-card.internal.paginator.initialHasNext", hasNext);

                // foundation-contentloaded will call the doLayout, so we have to avoid double initialization
                newCollection.data("foundation-layout-card.internal.init", true);
                el.trigger("foundation-contentloaded");
                el.trigger("foundation-collection-reload");
                deferred.resolve(newCollection);
            });

            return deferred.promise();
        }, function() {
            var title = Granite.I18n.get("Error");
            var message = Granite.I18n.get("Fail to load data.");

            var ui = $(window).adaptTo("foundation-ui");
            ui.alert(title, message, "error");
        });
    }

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.layouts", {
        name: "foundation-layout-card",
        doLayout: function(el, config) {
            var collection = $(el);

            if (collection.data("foundation-layout-card.internal.fromReload")) {
                return;
            }

            // foundation-layout-card is exclusive to manage the layout of foundation-collection only
            if (!collection.hasClass("foundation-collection")) {
                return;
            }

            if (collection.data("foundation-layout-card.internal.init")) {
                return;
            }

            collection.data("foundation-layout-card.internal.init", true);

            var draw = function(collection) {
                collection.closest(".foundation-collection-container").addClass("card");

                if (!collection.data("cardView")) {
                    collection.wrapInner("<div class='grid-0'>");
                }

                collection.cardView({
                    "selectorConfig": {
                        "itemSelector": ".foundation-collection-item",
                        "dataContainer": "grid-0",
                        "view": {
                            "selectedItem": {
                                "list": {
                                    "cls": "foundation-selections-item selected"
                                },
                                "grid": {
                                    "cls": "foundation-selections-item selected"
                                }
                            },
                            "selectedItems": {
                                "list": {
                                    "selector": ".foundation-selections-item"
                                },
                                "grid": {
                                    "selector": ".foundation-selections-item"
                                }
                            }
                        },
                        "controller": {
                            "selectElement": {
                                "list": ".foundation-collection-item .select",
                                "grid": ".foundation-collection-item"
                            },
                            "moveHandleElement": {
                                "list": ".foundation-collection-item > .move"
                            },
                            "targetToItem": {
                                "list": function($target) {
                                    return $target.closest(".foundation-collection-item");
                                },
                                "grid": function($target) {
                                    return $target.closest(".foundation-collection-item");
                                }
                            },
                            "gridSelect": {
                                "cls": "mode-selection"
                            }
                        }
                    }
                });

                var cardView = CUI.CardView.get(collection);

                cardView.setDisplayMode(CUI.CardView.DISPLAY_GRID);

                var selectionMode = collection.data("foundationSelectionsMode");
                if (selectionMode) {
                    cardView.setSelectionModeCount(selectionMode);
                }

                if (config.reload) {
                    // Restore the selections before addListener to avoid listening to CardView's select event
                    restoreSelections(collection, config);
                }

                addListener(collection, config);
                changeSelectionMode(
                    collection, config,
                    config.selectionMode ? "selection" : "default",
                    !config.initialSelectionModeDecoration,
                    true
                );
                handlePaging(collection, config);

                collection.trigger("foundation-selections-change");
            };

            if (config.reload) {
                reload(collection, config).done(draw);
            } else {
                draw(collection);
            }
        },
        clean: function(el, config) {
            var collection = $(el);

            saveSelections(collection, config);

            Granite.UI.Foundation.Layouts.clean(el);

            collection.closest(".foundation-collection-container").removeClass("card");
            removeListener(collection);

            var paginator = collection.data("foundation-layout-card.internal.paginator");
            if (paginator) {
                paginator.destroy();
                collection.removeData("foundation-layout-card.internal.paginator");
            }

            collection.removeData("foundation-layout-card.internal.paginator.initialHasNext");
            collection.removeData("foundation-layout-card.internal.init");

            if (config.reload) {
                // Only destroy when reloading for compatibility
                CUI.CardView.get(collection).destroy();
            }

            if (config.stateId) {
                $.removeCookie(config.stateId + ".selectionMode", { path: "/" });
            }

            // Don't clean cardView structure for now (e.g. <div class="grid-6" />) as it's too complicated
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-layout",
        selector: ".foundation-layout-card.foundation-collection, .foundation-layout-list.foundation-collection",
        adapter: function(el) {
            var collection = $(el);

            return {
                append: function(items) {
                    collection.adaptTo("foundation-collection").append(items);
                },

                clear: function() {
                    collection.adaptTo("foundation-collection").clear();
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-collection",
        selector: ".foundation-layout-card.foundation-collection, .foundation-layout-list.foundation-collection",
        adapter: function(el) {
            var collection = $(el);

            return {
                append: function(items) {
                    CUI.CardView.get(collection).append(items);
                    collection.trigger("foundation-contentloaded");
                },

                clear: function() {
                    CUI.CardView.get(collection).removeAllItems();
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-selections",
        selector: ".foundation-layout-card.foundation-collection, .foundation-layout-list.foundation-collection",
        adapter: function(el) {
            var collection = $(el);

            return {
                count: function() {
                    return collection.find(".foundation-selections-item").length;
                },

                clear: function(suppressEvent) {
                    CUI.CardView.get(collection).clearSelection();

                    if (!suppressEvent) {
                        collection.trigger("foundation-selections-change");
                    }

                    return this;
                },

                select: function(el) {
                    var item = $(el);
                    if (!item.is(".foundation-collection-item")) {
                        return;
                    }

                    CUI.CardView.get(collection).select(item);
                },

                deselect: function(el) {
                    var item = $(el);
                    if (!item.is(".foundation-collection-item")) {
                        return;
                    }

                    CUI.CardView.get(collection).deselect(item);
                }
            };
        }
    });
})(window, document, Granite, Granite.$, CUI, Granite.URITemplate);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(window, Granite, $, CUI, URITemplate) {
    "use strict";

    var ns = ".foundation-layout-list";

    function saveSelections(collection, config) {
        if (!config.stateId) {
            return;
        }

        var selectionIds = Array.prototype.map.call(collection.find(".foundation-selections-item"), function(v) {
            return $(v).data("foundationCollectionItemId");
        });

        try {
            window.sessionStorage.setItem(config.stateId + ".selections", JSON.stringify(selectionIds));

            var paginator = collection.data("foundation-layout-list.internal.paginator");
            if (paginator) {
                window.sessionStorage.setItem(config.stateId + ".limit", paginator.offset);
            }
        } catch (e) {
            if (window.console) {
                // eslint-disable-next-line no-console
                console.warn("Error occur saving selections", e);
            }
        }
    }

    function restoreSelections(collection, config) {
        if (!config.stateId) {
            return;
        }

        try {
            var raw = window.sessionStorage.getItem(config.stateId + ".selections");
            if (!raw) {
                return;
            }

            var selectionIds = JSON.parse(raw);
            if (!selectionIds.length) {
                return;
            }

            var selections = collection.find(".foundation-collection-item").filter(function() {
                return selectionIds.indexOf($(this).data("foundationCollectionItemId")) >= 0;
            });

            var cv = CUI.CardView.get(collection);
            var ln = selections.length;

            selections.each(function(i) {
                cv.select($(this), i < ln - 1);
            });
        } catch (e) {
            if (window.console) {
                // eslint-disable-next-line no-console
                console.warn("Error occur restoring selections", e);
            }
        }
    }

    function updateSelectionState(collection, force) {
        // Change the mode first, then trigger the selections change

        var group = collection.data("foundationModeGroup");

        if (group) {
            var beforeCount = collection.data("foundation-layout-list.internal.beforeCount") || 0;
            var afterCount = collection.adaptTo("foundation-selections").count();

            if ((beforeCount === 0 || force) && afterCount > 0) {
                collection.trigger("foundation-mode-change", [ "selection", group ]);
            } else if ((beforeCount > 0 || force) && afterCount === 0) {
                collection.trigger("foundation-mode-change", [ "default", group ]);
            }

            collection.data("foundation-layout-list.internal.beforeCount", afterCount);
        }

        collection.trigger("foundation-selections-change");
    }

    function addListener(collection, config) {
        collection.on("change:selection" + ns, function(e) {
            if (e.moreSelectionChanges === true) {
                return;
            }
            updateSelectionState(collection);
        });

        collection.on("sortstart" + ns, function(e) {
            // TODO handle server-side sorting using [data-foundation-collection-src]
            if (!collection.data("foundationCollectionSrc")) {
                return;
            }

            var header = collection.find("header");

            if (header.children(".sort[data-sort-at='server']").length === 0) {
                return;
            }

            e.preventDefault();

            // TODO This approach where you set the cookies and refresh the foundation-content
            // is a temporary solution until the proper data-foundation-collection-src vocabulary is established.

            var col = $(e.target);
            var sortSelector = "." + collection.data("foundationModeGroup") + " .sort";

            var sortClass = "sort";
            if (header.hasClass("sort-mode")) {
                if (col.hasClass("sort-asc")) {
                    sortClass += " sort-mode " + col.attr("class").replace(/sort-asc|sort-desc|sort/g, "").trim() + " sort-desc"; // eslint-disable-line max-len
                }
            } else {
                sortClass += " sort-mode " + col.attr("class").replace(/sort-asc|sort-desc|sort/g, "").trim() + " sort-asc"; // eslint-disable-line max-len
            }

            $(sortSelector).removeAttr("class").addClass(sortClass);
            CUI.util.state.save(sortSelector, "class");

            var content = $(".foundation-content");
            if (collection.closest(content).length > 0) {
                content.adaptTo("foundation-content").refresh();
            }
        });
    }

    function removeListener(collection) {
        collection.off(ns);
        collection.removeData("foundation-layout-list.internal.beforeCount");
    }

    function handlePaging(collection, config) {
        if (!collection.data("foundationCollectionSrc")) {
            return;
        }

        var scrollContainer = config.scrollSrc ? collection.closest(config.scrollSrc) : collection.parent();

        var Paginator = $(window).adaptTo("foundation-util-paginator");

        var paginator = new Paginator({
            el: scrollContainer,
            limit: config.limit || 20,
            resolveURL: function(paginator) {
                return URITemplate.expand(collection.data("foundationCollectionSrc"), {
                    offset: paginator.offset,
                    limit: paginator.limit,
                    id: collection.data("foundationCollectionId")
                });
            },
            processResponse: function(paginator, html) {
                var deferred = $.Deferred();

                var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                    var el = $(processed);
                    var collectionApi = collection.adaptTo("foundation-collection");

                    var items = el.find(".foundation-collection").first().find(".foundation-collection-item").get();
                    collectionApi.append(items);

                    deferred.resolve({
                        length: items.length,
                        hasNext: items.length >= paginator.limit
                    });
                });

                return deferred.promise();
            }
        });

        paginator.start(
            collection.find(".foundation-collection-item").length,
            collection.data("foundation-layout-list.internal.paginator.initialHasNext")
        );

        collection.data("foundation-layout-list.internal.paginator", paginator);
    }

    function reload(collection, config) {
        var limit = (function() {
            if (config.stateId) {
                return window.sessionStorage.getItem(config.stateId + ".limit");
            }
        })() || config.limit || 20;

        var id = collection.data("foundationCollectionId");

        var url = URITemplate.expand(config.reload, {
            offset: 0,
            limit: limit,
            id: id
        });

        return $.ajax({
            url: url,
            cache: false
        }).then(function(html) {
            var deferred = $.Deferred();

            var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                var el = $(processed);

                var oldEl = collection.closest(".foundation-collection-container");
                if (!oldEl.length) {
                    oldEl = collection;
                }

                el.replaceAll(oldEl);

                if (!el.hasClass("foundation-collection-container")) {
                    el.trigger("foundation-contentloaded");

                    if (el.hasClass("foundation-collection")) {
                        el.trigger("foundation-selections-change");
                    }

                    deferred.reject(new Error("Invalid content"));
                    return;
                }

                var newCollection = el.find(".foundation-collection").first();
                var items = newCollection.find(".foundation-collection-item");
                var hasNext = items.length >= limit;

                newCollection.data("foundation-layout-list.internal.paginator.initialHasNext", hasNext);

                // foundation-contentloaded will call the doLayout, so we have to avoid double initialization
                newCollection.data("foundation-layout-list.internal.init", true);
                el.trigger("foundation-contentloaded");

                deferred.resolve(newCollection);
            });

            return deferred.promise();
        }, function() {
            var title = Granite.I18n.get("Error");
            var message = Granite.I18n.get("Fail to load data.");

            var ui = $(window).adaptTo("foundation-ui");
            ui.alert(title, message, "error");
        });
    }

    $(window).adaptTo("foundation-registry").register("foundation.layouts", {
        name: "foundation-layout-list",
        doLayout: function(el, config) {
            var collection = $(el);

            // foundation-layout-list is exclusive to manage the layout of foundation-collection only
            if (!collection.hasClass("foundation-collection")) {
                return;
            }

            if (collection.data("foundation-layout-list.internal.init")) {
                return;
            }

            collection.data("foundation-layout-list.internal.init", true);

            var group = collection.data("foundationModeGroup");
            if (group) {
                // Currently using inline style so that it override the display
                // but still easily removed without interfering existing classes.
                $(".foundation-mode-change[data-foundation-mode-group='" + group + "']").css("display", "none");
            }

            var draw = function(collection) {
                if (!collection.data("cardView")) {
                    // Need to add "list" otherwise header bar is not rendered :(
                    collection.addClass("list").wrapInner("<div class='grid-0'>");
                }

                collection.cardView({
                    "selectorConfig": {
                        "itemSelector": ".foundation-collection-item",
                        "dataContainer": "grid-0",
                        "view": {
                            "selectedItem": {
                                "list": {
                                    "cls": "foundation-selections-item selected"
                                },
                                "grid": {
                                    "cls": "foundation-selections-item selected"
                                }
                            },
                            "selectedItems": {
                                "list": {
                                    "selector": ".foundation-selections-item"
                                },
                                "grid": {
                                    "selector": ".foundation-selections-item"
                                }
                            }
                        },
                        "controller": {
                            "selectElement": {
                                "list": ".foundation-collection-item .select",
                                "grid": ".foundation-collection-item"
                            },
                            "moveHandleElement": {
                                "list": ".foundation-collection-item > .move"
                            },
                            "targetToItem": {
                                "list": function($target) {
                                    return $target.closest(".foundation-collection-item");
                                },
                                "grid": function($target) {
                                    return $target.closest(".foundation-collection-item");
                                }
                            },
                            "gridSelect": {
                                "cls": "mode-selection"
                            }
                        }
                    }
                });
                CUI.CardView.get(collection).setDisplayMode(CUI.CardView.DISPLAY_LIST);

                var selectionMode = collection.data("foundationSelectionsMode");
                if (selectionMode) {
                    CUI.CardView.get(collection).setSelectionModeCount(selectionMode);
                }

                if (config.reload) {
                    // Restore the selections before addListener to avoid listening to CardView's select event
                    restoreSelections(collection, config);
                }

                addListener(collection, config);
                updateSelectionState(collection, true);
                handlePaging(collection, config);
            };

            if (config.reload) {
                reload(collection, config).done(draw);
            } else {
                draw(collection);
            }
        },
        clean: function(el, config) {
            var collection = $(el);

            saveSelections(collection, config);

            Granite.UI.Foundation.Layouts.clean(el);

            var group = collection.data("foundationModeGroup");
            if (group) {
                $(".foundation-mode-change[data-foundation-mode-group='" + group + "']").css("display", "");
            }

            removeListener(collection);

            var paginator = collection.data("foundation-layout-list.internal.paginator");
            if (paginator) {
                paginator.destroy();
                collection.removeData("foundation-layout-list.internal.paginator");
            }

            collection.removeData("foundation-layout-list.internal.paginator.initialHasNext");
            collection.removeData("foundation-layout-list.internal.init");

            if (config.reload) {
                // Only destroy when reloading for compatibility
                CUI.CardView.get(collection).destroy();
            }

            // Don't clean cardView structure for now (e.g. <div class="grid-0" />) as it's too complicated
        }
    });

    /*
    The following adapters are registered at card.js, as the code is identical, but with different selector.

    $(window).adaptTo("foundation-registry").register("foundation.adapters", {
        type: "foundation-layout",
        selector: ".foundation-layout-list.foundation-collection"
    });

    $(window).adaptTo("foundation-registry").register("foundation.adapters", {
        type: "foundation-collection",
        selector: ".foundation-layout-list.foundation-collection"
    });

    $(window).adaptTo("foundation-registry").register("foundation.adapters", {
        type: "foundation-selections",
        selector: ".foundation-layout-list.foundation-collection"
    });
    */
})(window, Granite, Granite.$, CUI, Granite.URITemplate);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(window, document, $) {
    "use strict";

    $(window).adaptTo("foundation-registry").register("foundation.layouts", {
        name: "foundation-layout-mode",
        doLayout: function(el, config) {
            var container = $(el);

            $(document).on("foundation-mode-change", function(e, mode, group) {
                if (config.group !== group) {
                    return;
                }

                container.children(":not(.mode-" + mode + ")").attr("hidden", "hidden").removeClass("show");
                container.children(".mode-" + mode).addClass("show").removeAttr("hidden");
            });
        }
    });
})(window, document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(document, $) {
    "use strict";

    $(document).on("foundation-mode-change", function(e, mode, group) {
        $(".foundation-layout-mode2").each(function() {
            var container = $(this);
            var config = container.data("foundationLayout");

            if (config.group !== group) {
                return;
            }

            container.find(".foundation-layout-mode2-item").each(function() {
                var item = $(this);
                var itemMode = item.data("foundationLayoutMode2ItemMode");
                item.toggleClass("foundation-layout-mode2-item-active", itemMode === mode);
            });
        });
    });
})(document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(window, Granite, $, URITemplate) {
    "use strict";

    var ns = ".foundation-layout-wizard";

    function getURITemplateVariables(containers) {
        var o = {};

        containers.find(":input").each(function() {
            var el = $(this);

            el.serializeArray().forEach(function(input) {
                var name = input.name;
                var value = input.value;

                var newValue;
                if (o.hasOwnProperty(name)) {
                    var a = o[name];

                    if (!Array.isArray(a)) {
                        a = [ a ];
                    }

                    a.push(value);
                    newValue = a;
                } else {
                    newValue = value;
                }

                o[name] = newValue;

                var parent = $(el).attr("data-foundation-uritemplate-parent");
                if (parent) {
                    var p = o[parent] = o[parent] || {};
                    p[name] = o[name];
                }
            });
        });

        return o;
    }

    function changeStep(wizard, to, from) {
        var params = [ to[0] ];

        if (from) {
            from.removeClass("foundation-wizard-step-active");
            params.push(from[0]);
        }

        to.addClass("foundation-wizard-step-active");
        addControlListener(wizard);

        wizard.trigger("foundation-wizard-stepchange", params);
    }

    function enhance(wizard) {
        enhanceSteps(wizard.children(".foundation-wizard-step"));

        wizard.addClass("coral-Wizard coral-Wizard--maximized")
            .on("flexwizard-stepchange" + ns, function(e, from, to) {
                changeStep(wizard, from, to);
            })
            .flexWizard();
    }

    function enhanceSteps(steps) {
        steps.addClass("coral-Wizard-step js-coral-Wizard-step")
            .each(function() {
                var step = $(this);
                step.data("stepTitle", step.data("foundationWizardStepTitle"));
            })
            .find(".foundation-wizard-control").addClass("js-coral-Wizard-step-control").attr("data-action",
                function() {
                    // in this case the value is identical, so no transformation
                    return $(this).data("foundationWizardControlAction");
                }
            );
    }

    function validate(currentStep) {
        if (currentStep.data("foundationWizardStepValidation") === false) {
            return true;
        }

        var allValid = true;

        currentStep.find(":submittable").each(function() {
            var el = $(this);

            if (!el.checkValidity()) {
                allValid = false;
            }

            el.updateErrorUI();
        });

        return allValid;
    }

    function addControlListener(wizard) {
        var cssRule = "> nav .foundation-wizard-control, > .foundation-wizard-step-active .foundation-wizard-control";
        wizard.find(cssRule).each(function() {
            var control = $(this);

            if (control.data("foundationWizardControlAction") !== "next") {
                return;
            }

            // We have to register the handler at control level so that it is triggered first before FlexWizard handler
            // FlexWizard is listening at wizard level.
            control.off(".foundation-wizard-control").on("click.foundation-wizard-control", function(e) {
                var currentStep = wizard.children(".foundation-wizard-step-active");

                if (!validate(currentStep)) {
                    e.stopPropagation();
                    return;
                }

                var src = control.data("foundationWizardControlSrc");

                if (!src) {
                    return;
                }

                e.stopPropagation();

                var ui = $(window).adaptTo("foundation-ui");
                ui.wait();

                var validSteps = currentStep.prevAll(".foundation-wizard-step").addBack();
                var values = getURITemplateVariables(validSteps);
                var url = URITemplate.expand(src, values);

                $.ajax(url)
                    .done(function(html) {
                        // Wrap the result in a div so that we can just use find() regardless of markup structure
                        html = "<div>" + html + "</div>";

                        var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                            var wizardApi = wizard.adaptTo("foundation-wizard");

                            var steps = $(processed).find(".foundation-wizard-step");

                            wizardApi.remove(getObsoleteSteps(currentStep));

                            // save new ones
                            currentStep.data("foundation-wizard-step.internal.children", steps);

                            wizardApi.appendAfter(steps.toArray(), currentStep[0]);
                            wizardApi.next();

                            ui.clearWait();
                        });
                    })
                    .fail(function() {
                        ui.clearWait();

                        var title = Granite.I18n.get("Error");
                        var message = Granite.I18n.get("Something went wrong.");
                        ui.alert(title, message, "error");
                    });
            });
        });
    }

    function getObsoleteSteps(current) {
        var result = [];

        // get previously loaded steps and their chains
        var loaded = current.data("foundation-wizard-step.internal.children");
        if (loaded) {
            loaded.each(function() {
                result.push(this);
                $.merge(result, getObsoleteSteps($(this)));
            });
        }

        return result;
    }

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.layouts", {
        name: "foundation-layout-wizard",
        doLayout: function(el, config) {
            // The strategy is that foundation-layout-wizard is wrapping CUI.FlexWizard
            // CUI.FlexWizard is an implementation detail of foundation-layout-wizard, thus it is transparent to
            // outside world

            var wizard = $(el);

            // foundation-layout-wizard is exclusively managing the layout of foundation-wizard only
            if (!wizard.hasClass("foundation-wizard")) {
                return;
            }

            enhance(wizard);
        },
        clean: function(el, config) {
            Granite.UI.Foundation.Layouts.clean(el);
            $(el).off(ns);
        }
    });


    var adapter = function(el) {
        var wizard = $(el);

        return {
            toggleNext: function(enable) {
                this.toggle("next", enable);
            },

            togglePrev: function(enable) {
                this.toggle("prev", enable);
            },

            toggleCancel: function(enable) {
                this.toggle("cancel", enable);
            },

            toggle: function(action, enable) {
                var buttons = wizard
                    .children(".foundation-wizard-step.foundation-wizard-step-active")
                    .add(wizard.children("nav"))
                    .find(".foundation-wizard-control[data-foundation-wizard-control-action=" + action + "]");

                buttons.each(function() {
                    if ($(this).is("button")) {
                        $(this).prop("disabled", !enable);
                    } else {
                        $(this).toggleClass("disabled", !enable);
                    }
                });
            },

            next: function() {
                wizard.flexWizard("nextStep");
            },

            prev: function() {
                wizard.flexWizard("prevStep");
            },

            append: function(steps, index) {
                var i = index;

                $(steps).each(function() {
                    var step = $(this);
                    enhanceSteps(step);
                    wizard.flexWizard("add", step, i++ || undefined);
                });

                wizard.trigger("foundation-contentloaded");
            },

            appendAfter: function(steps, refStep) {
                var ref = refStep;

                $(steps).each(function() {
                    var step = $(this);
                    enhanceSteps(step);
                    wizard.flexWizard("addAfter", step, ref);
                    ref = this;
                });

                wizard.trigger("foundation-contentloaded");
            },

            remove: function(steps) {
                $(steps).each(function() {
                    wizard.flexWizard("remove", this);
                });
            }
        };
    };

    registry.register("foundation.adapters", {
        type: "foundation-layout",
        selector: ".foundation-layout-wizard.foundation-wizard",
        adapter: adapter
    });

    registry.register("foundation.adapters", {
        type: "foundation-wizard",
        selector: ".foundation-layout-wizard.foundation-wizard",
        adapter: adapter
    });
})(window, Granite, Granite.$, Granite.URITemplate);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2014 Adobe
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
(function(window, $, CUI, URITemplate, Class) {
    "use strict";

    var ns = ".foundation-layout-columns";

    function log(message) {
        if (window.console) {
            window.console.log(message);
        }
    }

    var Context = function(collection, config, columnView) {
        this.collection = collection;
        this.config = config;
        this.columnView = columnView;

        this._beforeCount = 0;

        collection.data("foundation-layout-columns.internal.ctx", this);
    };

    Context.get = function(collection) {
        return collection.data("foundation-layout-columns.internal.ctx");
    };

    Context.prototype.updateSelection = function(selections, force) {
        this.collection.find(".foundation-selections-item").removeClass("foundation-selections-item");
        selections.addClass("foundation-selections-item");

        // Change the mode first, then trigger the selections change

        var group = this.collection.data("foundationModeGroup");

        if (group) {
            var afterCount = selections.length;

            if ((this._beforeCount === 0 || force) && afterCount > 0) {
                this.collection.trigger("foundation-mode-change", [ "selection", group ]);
            } else if ((this._beforeCount > 0 || force) && afterCount === 0) {
                this.collection.trigger("foundation-mode-change", [ "default", group ]);
            }

            this._beforeCount = afterCount;
        }

        var folderColumn = this.collection.children(".is-active").first();
        var activeItem = folderColumn.find(".coral-ColumnView-item.is-active:not(.is-selected)").first();

        if (folderColumn.length > 0 && activeItem.length === 0) {
            // It means that the item is ".is-active.is-selected" which is not considered as changing folder.
            // So we have to pick its parent as the actual folder.
            folderColumn = folderColumn.prev();
            activeItem = folderColumn.find(".coral-ColumnView-item.is-active").first();
        }

        this.collection.data("foundationCollectionId", activeItem.data("foundationCollectionItemId"));

        this.collection.trigger("foundation-selections-change");
    };

    Context.prototype.saveSelections = function() {
        if (!this.config.stateId) {
            return;
        }

        try {
            var activeColumn = this.collection.children(".is-active").first();
            var items = activeColumn.find(".coral-ColumnView-item");
            var selectedItems = items.filter(".is-selected");

            var selectionIds = Array.prototype.map.call(selectedItems, function(v) {
                return $(v).data("foundationCollectionItemId");
            });

            window.sessionStorage.setItem(this.config.stateId + ".selections", JSON.stringify(selectionIds));

            if (selectedItems.length === 0) {
                window.sessionStorage.removeItem(this.config.stateId + ".limit");
            } else {
                window.sessionStorage.setItem(this.config.stateId + ".limit", items.length);
            }
        } catch (e) {
            if (window.console) {
                // eslint-disable-next-line no-console
                console.warn("Error occur saving selections", e);
            }
        }
    };

    Context.prototype.restoreSelections = function() {
        if (!this.config.stateId) {
            return;
        }

        try {
            var raw = window.sessionStorage.getItem(this.config.stateId + ".selections");
            if (!raw) {
                return;
            }

            var selectionIds = JSON.parse(raw);
            if (!selectionIds.length) {
                return;
            }

            this.collection.find(".foundation-collection-item").filter(function() {
                var item = $(this);

                if (selectionIds.indexOf(item.data("foundationCollectionItemId")) < 0) {
                    return;
                }

                item.children(".coral-ColumnView-icon").trigger("click");
            });
        } catch (e) {
            if (window.console) {
                // eslint-disable-next-line no-console
                console.warn("Error occur restoring selections", e);
            }
        }
    };

    Context.prototype.destroy = function() {
        this.columnView.destroy();
        this.collection.removeData("foundation-layout-columns.internal.ctx");
    };

    var ColumnView = new Class({
        toString: "foundation-layout-columns.internal.ColumnView",
        extend: CUI.ColumnView,

        _loadInnerMarkup: function() {
            if (this.$element.children().length === 0) {
                return;
            }

            var self = this;
            var loadedColumns = this.$element.find(".coral-ColumnView-column");

            // stores the inner html as a the main content
            this._data = {};

            var activeColumnRequest = ++this._activeColumnRequest;

            if (loadedColumns.length > 1) {
                // removes all possible is-active classes
                loadedColumns.removeClass("is-active");

                // Always activate the folder column (i.e. the second last)
                loadedColumns.eq(-2).addClass("is-active");

                var totalWidth = 0;

                loadedColumns.each(function() {
                    var $column = $(this);

                    totalWidth += $column.outerWidth();

                    var href = $column.data("src");
                    var lazyLoad = $column.data("graniteLazyload");

                    if (!lazyLoad || !href) {
                        // in case the column does not use the lazy load to be initialize, we still need to initialize
                        // the listeners to handle pagination properly
                        self._prepareColumn($column, $column.data("next"));
                        return;
                    }

                    var setActive = function() {
                        var activeItemId = $column.data("graniteActiveitem");

                        if (!activeItemId) {
                            return;
                        }

                        var activeItem = $column.find(".coral-ColumnView-item")
                            .filter(function() {
                                return $(this).data("foundationCollectionItemId") === activeItemId;
                            })
                            .addClass("is-active");

                        if (activeItem.length) {
                            $column.removeData("graniteActiveitem").removeAttr("data-granite-activeitem");

                            if ($column.hasClass("is-active")) {
                                self.$element.trigger(
                                    "coral-columnview-item-select",
                                    [ activeItem.data("data"), activeItem ]
                                );
                            }
                        }
                    };

                    self._loadData(href, $column).done(function() {
                        $column.removeData("graniteLazyload").removeAttr("data-granite-lazyload");

                        var $newColumn = self.renderColumn(href);
                        self._prepareColumn($newColumn, href);

                        $column.empty().append(self._getColumnContent($newColumn));
                        setActive();

                        self._loadMoreIfNeeded($column).done(function() {
                            setActive();
                        });
                    });
                });

                // scrolls so that the last column is visible
                this.$element.scrollLeft(totalWidth);
            } else {
                // clears the inner contents to properly initialize the column
                this.$element.empty();
                // stores the initial markup as the root
                this._data["/"] = typeof loadedColumns[0] !== "undefined" ? loadedColumns[0].outerHTML : "";

                this.setNextColumn("/").done(function(data, $column) {
                    this._setActiveColumn($column, false, activeColumnRequest);
                }.bind(this));
            }
        },

        _loadData: function(href, column) {
            var self = this;
            var src;
            var offset;
            var limit = this.options.limit;

            if (column && column.data("graniteLazyload")) {
                src = column.data("src");
                offset = 0;
            // next page in the same column
            } else if (href.indexOf("#col-") === 0) {
                src = column.data("src");
                offset = column.find(".coral-ColumnView-item").length;
            // new column
            } else {
                src = this.$element
                    .find(".coral-ColumnView-item")
                    .filter(function() {
                        return $(this).data("href") === href;
                    })
                    .data("src");

                offset = 0;
            }

            var url = URITemplate.expand(src, {
                offset: offset,
                limit: limit
            });

            return $.ajax({
                url: url,
                cache: false
            }).done(function(html) {
                var newColumn = $(html);
                if (!newColumn.hasClass("coral-ColumnView-column")) {
                    newColumn = newColumn.children(".coral-ColumnView-column");
                }

                if (newColumn.find(".coral-ColumnView-item").length < limit) {
                    // remove [data-next] to avoid loading next page
                    newColumn.removeAttr("data-next");
                }

                html = newColumn.prop("outerHTML");
                self._data[href] = html;

                self.$element.trigger("coral-columnview-load", [ href, html ]);
            });
        }
    });

    function reload(collection, config) {
        var limit = (function() {
            if (config.stateId) {
                return window.sessionStorage.getItem(config.stateId + ".limit");
            }
        })() || config.limit || 20;

        var id = collection.data("foundationCollectionId");

        var url = URITemplate.expand(config.reload, {
            offset: 0,
            limit: limit,
            id: id
        });

        return $.ajax({
            url: url,
            cache: false
        }).then(function(html) {
            var deferred = $.Deferred();

            var processed = Granite.UI.Foundation.Utils.processHtml(html, undefined, function() {
                var el = $(processed);

                var oldEl = collection.closest(".foundation-collection-container");
                if (!oldEl.length) {
                    oldEl = collection;
                }

                el.replaceAll(oldEl);

                if (!el.is(".foundation-collection.foundation-layout-columns")) {
                    el.trigger("foundation-contentloaded");
                    deferred.reject(new Error("Invalid content"));
                    return;
                }

                // foundation-contentloaded will call the doLayout, so we have to avoid double initialization
                el.data("foundation-layout-columns.internal.ctx", true);
                el.trigger("foundation-contentloaded");

                deferred.resolve(el);
            });

            return deferred.promise();
        }, function() {
            var title = Granite.I18n.get("Error");
            var message = Granite.I18n.get("Fail to load data.");

            var ui = $(window).adaptTo("foundation-ui");
            ui.alert(title, message, "error");
        });
    }

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.layouts", {
        name: "foundation-layout-columns",
        doLayout: function(el, config) {
            var collection = $(el);

            // foundation-layout-columns can only handle foundation-collection
            if (!collection.hasClass("foundation-collection")) {
                return;
            }

            // the layout is already applied
            if (Context.get(collection)) {
                return;
            }

            var draw = function(collection) {
                var columnView = new ColumnView({
                    element: collection,
                    multiselect: config.multiselect,
                    limit: config.limit
                });

                var ctx = new Context(collection, config, columnView);

                var group = collection.data("foundationModeGroup");
                if (group) {
                    // Currently using inline style so that it override the display
                    // but still easily removed without interfering existing classes.
                    $(".foundation-mode-change[data-foundation-mode-group='" + group + "']").css("display", "none");
                }

                if (config.reload) {
                    // Restore the selections before addListener to avoid listening to ColumnView's select event
                    ctx.restoreSelections();
                }

                collection.on("coral-columnview-item-select" + ns, function(e, href, item) {
                    var selections = $(columnView.getSelectedItems().map(function(v) {
                        return v.item[0];
                    }));
                    ctx.updateSelection(selections);
                });

                var activeColumn = collection.children(".coral-ColumnView-column.is-active");
                if (
                    !activeColumn.length ||
                    !activeColumn.data("graniteLazyload") ||
                    !activeColumn.data("graniteActiveitem")
                ) {
                    var selections = $(columnView.getSelectedItems().map(function(v) {
                        return v.item[0];
                    }));
                    ctx.updateSelection(selections, true);
                }
            };

            if (config.reload) {
                reload(collection, config).done(draw);
            } else {
                draw(collection);
            }
        },
        clean: function(el, config) {
            var collection = $(el);
            var ctx = Context.get(collection);

            ctx.saveSelections();

            Granite.UI.Foundation.Layouts.clean(el);

            var group = collection.data("foundationModeGroup");
            if (group) {
                $(".foundation-mode-change[data-foundation-mode-group='" + group + "']").css("display", "");
            }

            collection.off(ns);

            ctx.destroy();
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-collection",
        selector: ".foundation-layout-columns.foundation-collection",
        adapter: function(el) {
            return {
                append: function(items) {
                    // TODO append to the current column
                    log("The method is not implemented yet");
                },

                clear: function() {
                    log("The method is not implemented yet");
                }
            };
        }
    });

    registry.register("foundation.adapters", {
        type: "foundation-selections",
        selector: ".foundation-layout-columns.foundation-collection",
        adapter: function(el) {
            var collection = $(el);

            return {
                count: function() {
                    return collection.find(".foundation-selections-item").length;
                },

                clear: function(suppressEvent) {
                    log("The method is not implemented yet");
                },

                select: function(el) {
                    log("The method is not implemented yet");
                },

                deselect: function(el) {
                    log("The method is not implemented yet");
                }
            };
        }
    });
/* global Class:false */
})(window, Granite.$, CUI, Granite.URITemplate, Class);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(document, Granite, CUI, $) {
    // TODO This component is going to be deprecated. Read below.
    // This component is going to be deprecated after .foundation-layout-control supports state concept,
    // which is still not properly defined yet.

    "use strict";

    $(document).on("click", ".foundation-admin-layouttoggle-item", function(e) {
        var button = $(this);
        var layout = button.data("foundationAdminLayouttoggleLayout");
        var target = button.closest(".foundation-admin-layouttoggle").data("foundationAdminLayouttoggleTarget");

        Granite.UI.Foundation.Layouts.switchLayout($(target).get(0), layout);
        CUI.util.state.save(target, "class");
    });

    $(document).on("foundation-layout-perform", function(e) {
        var el = $(e.target);
        var layout = el.data("foundationLayout");

        $(".foundation-admin-layouttoggle").each(function() {
            var toggle = $(this);

            if (!el.is(toggle.data("foundationAdminLayouttoggleTarget"))) {
                return;
            }

            toggle.find(".foundation-admin-layouttoggle-item").each(function() {
                var button = $(this);
                var config = button.data("foundationAdminLayouttoggleLayout");

                if (config.name !== layout.name) {
                    button.removeAttr("hidden");
                } else {
                    button.attr("hidden", "hidden");
                }
            });
        });
    });
})(document, Granite, CUI, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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
(function(window, document, $, URITemplate, Granite) {
    "use strict";

    // TODO can be converted into jQuery plugin
    /**
     * Returns the value of the property of the given name.
     * @ignore
     */
    function prop(el, namespace, name) {
        var camelName = name[0].toUpperCase() + name.substring(1);
        return el.data(namespace + camelName) || (function() {
            var data = el.data(namespace);
            return data ? data[name] : undefined;
        })();
    }

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.admin.properties.activator.action", {
        name: "foundation.push",
        handler: function(action, el, url) {
            var contentAPI = $(".foundation-content").adaptTo("foundation-content");
            if (contentAPI) {
                contentAPI.go(url);
            }
        }
    });

    registry.register("foundation.admin.properties.activator.action", {
        name: "foundation.pushstate",
        handler: function(action, el, url) {
            var contentAPI = $(".foundation-content").adaptTo("foundation-content");
            if (contentAPI) {
                contentAPI.pushState(null, null, url);
            }
        }
    });

    registry.register("foundation.admin.properties.activator.action", {
        name: "foundation.normal",
        handler: function(action, el, url) {
            window.location = url;
        }
    });


    function showProperties(activator, selections) {
        if (!selections.length) {
            return;
        }

        var url = URITemplate.expand(activator.data("href") + "{?item*}", {
            item: selections.map(function() {
                var item = $(this);
                return item.data("foundationCollectionItemId") || item.data("path");
            }).toArray()
        });

        // defaulted to "foundation.push" for backward compatibility; otherwise "foundation.pushstate" is better
        var action = prop(activator, "foundationAdminPropertiesActivator", "action") || "foundation.push";
        // always give HTMLElement, just like how jQuery does it
        var el = activator[0];

        Granite.UI.Foundation.Utils.everyReverse(
            registry.get("foundation.admin.properties.activator.action"),
            function(config) {
                if (config.name !== action) {
                    return true;
                }
                return config.handler.call(el, action, el, url) === false;
            }
        );
    }

    $(document).on("click", ".foundation-admin-properties-activator", function(e) {
        var activator = $(this);

        var selections;

        var item = activator.data("foundationCollectionItem");
        if (item) {
            selections = $(item);
        } else {
            var config = activator.data("foundationCollectionAction");
            selections = $(config.target).first().find(".foundation-selections-item");
        }

        showProperties(activator, selections);
    });
})(window, document, Granite.$, Granite.URITemplate, Granite);

