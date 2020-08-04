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
/*
 * Requires: jQuery, any touch library (e.g. toe.js) for touch events (= tap, taphold)
 */
(function($, window, Granite, undefined) {
    "use strict";
    // @deprecated Please use CoralUI 3 Coral.QuickActions.

    var isIpad = /iPad/.test(window.navigator.userAgent);
    var isFirefox = /Firefox/.test(window.navigator.userAgent);
    var isMSTouch = window.navigator.maxTouchPoints;
    var isTouch = (function() {
        // GRANITE-5855 Special value for Win8.x/Chrome
        if (/Windows NT 6\.[23];.*Chrome/.test(window.navigator.userAgent)) {
            return false;
        }

        // GRANITE-17566 - Show Quickactions on Hybrid devices
        if (isFirefox && ("ontouchstart" in window) && !("onpointerdown" in window)) {
            return false;
        }

        return !!("ontouchstart" in window || isMSTouch);
    })();

    var menu = [];
    var mask;

    var abort = true;
    var timer;

    // TODO: toe.js should take care of this
    // (this is a temporary workaround for CQ-15897)
    // special case for MS touch events: recreate tap hold (= pointerhold)
    if (isMSTouch) {
        $(document).on("pointerdown", function(e) {
            abort = false;

            clearTimeout(timer);
            timer = setTimeout(function() {
                if (!abort) {
                    $(e.target).trigger($.Event("pointerhold", {
                        target: e.target,
                        pageX: e.originalEvent.pageX,
                        pageY: e.originalEvent.pageY
                    }));
                }
            }, 500);
        });

        $(document).on("pointercancel", function(e) {
            abort = true;
            clearTimeout(timer);
        });

        $(document).on("pointerup", function(e) {
            abort = true;
            clearTimeout(timer);
        });
    }

    function eventName(eventConfig, namespace) {
        return (isTouch ? eventConfig.touch : eventConfig.pointer) + "." + namespace;
    }

    function getPos(x, y, radius, angle, distance, no) {
        return {
            top: Math.round(y - radius - (Math.cos(no * angle) * distance)),
            left: Math.round(x - radius - (Math.sin(no * angle) * -distance))
        };
    }

    function adjustCenter(center, cfg) {
        var r = cfg.layout.details.distance + cfg.layout.details.radius + cfg.layout.details.tolerance;
        var container = $(cfg.container);

        var adjust = function(number, r, maxNumber) {
            if (number - r < 0) {
                return r;
            } else {
                return window.Math.min(number, maxNumber - r);
            }
        };

        return {
            x: adjust(center.x, r, container.innerWidth()),
            y: adjust(center.y, r, container.innerHeight())
        };
    }

    function resolveAnchor(anchor) {
        if (!anchor) {
            return undefined;
        }

        if ($.isFunction(anchor)) {
            return anchor(event);
        }

        if (typeof anchor === "string") {
            return $(event.target).closest(anchor);
        }

        return $(anchor);
    }

    function getCenter(event, cfg) {
        var anchor = resolveAnchor(cfg.anchor);

        if (anchor) {
            var pos = anchor.position();

            return adjustCenter({
                x: pos.left + Math.round(anchor.width() / 2),
                y: pos.top + Math.round(anchor.height() / 2)
            }, cfg);
        } else {
            var abs = {
                pageX: event.pageX,
                pageY: event.pageY
            };
            var p = $(cfg.container).offset();

            return adjustCenter({
                x: abs.pageX - p.left,
                y: abs.pageY - p.top
            }, cfg);
        }
    }

    function getStartPosition(actions, cfg, event) {
        if (typeof cfg.startPos === "number") {
            return cfg.startPos;
        }

        // Assume the value is "auto". i.e. unknown value is defaulted to "auto"
        return -1 * ((actions ? actions.length - 1 : 0) / 2);
    }

    $.quickaction = function(event, actions, options) {
        var cfg = $.extend(true, $.quickaction.settings, options);

        if (actions === undefined) {
            $.quickaction.settings.layout.destroy(cfg);
        } else {
            $.quickaction.settings.layout.render(actions, cfg, event);
        }
    };

    $.quickaction.LAYOUT_CIRCLE = {
        tag: "<div/>",
        cssClass: "quickaction-circle",
        // eslint-disable-next-line max-len
        closeButton: "<button type='button' title='" + Granite.I18n.get("Close") + "'><i class='coral-Icon coral-Icon--close coral-Icon--sizeXS'></i></button>",
        effect: {
            duration: 150,
            easing: "easeInQuad"
        },
        details: {
            /* mask z-index */
            zIndex: 9999,

            /* distance from the center */
            distance: 100,

            /* tolerance */
            tolerance: 5,

            /* the angle effects the maximum amount of circles around the touch point */
            angle: 2 * Math.PI / 11,

            /* radius of a circle in px */
            radius: 21,

            /**
             * position of the first circle:
             *  0 - start at 12 o'clock,
             *  'auto' - fan out above the anchor, center-aligned at 12 o'clock
            */
            startPos: "auto"
        },

        render: function(actions, cfg, event) {
            // close old quickactions
            $.quickaction.settings.layout.destroy(cfg, true);

            // render actions
            this.renderActions(actions, cfg, event);

            // trigger open menu event
            $(cfg.container).trigger($.quickaction.events.openMenu, { cfg: cfg, target: event.target });
        },

        destroy: function(cfg, noDelay) {
            if (menu.length > 0) {
                $.each(menu, function(idx, el) {
                    el.remove();
                });
                menu = [];
                $(cfg.container).trigger($.quickaction.events.closeMenu, { cfg: cfg });
            }

            /* remove overlay mask */
            if (mask) {
                cfg.oldmask = mask;
                mask = undefined;

                /* Need to delay mask removal so that subsequent annoying click event on iPad is still fall on the mask
                   Remember that on iPad click event will be trigger after tap event after 300ms */
                window.setTimeout(function() {
                    if (cfg.oldmask) {
                        cfg.oldmask.remove();
                        cfg.oldmask = undefined;
                    }
                }, noDelay ? 10 : 400);
            }
        },

        renderActions: function(actions, cfg, event) {
            var container = $(cfg.container);
            var t = $(event.target);
            var center = getCenter(event, cfg);
            var details = cfg.layout.details;
            var aperture = details.radius * 2;

            /* initially put actions one level below mask z-index, so buttons are not accessible during animation */
            var css = {
                top: center.y - details.radius,
                left: center.x - details.radius,
                position: "absolute",
                "z-index": details.zIndex - 1
            };

            var executeHandlerEvent = eventName(cfg.event.executeHandler, cfg.event.namespace);
            var index = getStartPosition(actions, cfg, event);

            if (cfg.displayCloseButton) {
                var closeButton = {
                    display: $.quickaction.settings.layout.closeButton,
                    touchpoint: true,
                    handler: function(e) {
                        $.quickaction.settings.layout.destroy(cfg);
                    }
                };

                actions.push(closeButton);
            }

            if (actions.length) {
                var actionx = [];
                var actiony = [];
                var actionIdx = index;

                // check the position of the quickaction buttons and create a mask above them,
                // so they are not accessible during animation
                $(".quickaction-mask").remove();
                mask = $("<div class='quickaction-mask'>")
                    .css("z-index", this.details.zIndex)
                    .appendTo(isTouch ? cfg.container : "body");

                $.each(actions, function() {
                    /* execute condition if the menu item should be shown */
                    if ($.isFunction(this.condition) && !this.condition(t)) {
                        return true;
                    }

                    if (!this.touchpoint) {
                        var pos = getPos(
                            center.x, center.y,
                            details.radius, details.angle, details.distance,
                            actionIdx++
                        );
                        actionx.push(pos.left);
                        actiony.push(pos.top);
                    } else {
                        actionx.push(css.left);
                        actiony.push(css.top);
                    }
                });

                // put the mask such that it covers all actions, to prevent interaction with others

                var mx = Math.min.apply(null, actionx);
                var my = Math.min.apply(null, actiony);
                var margin = 10;

                mask.css({
                    top: my - margin,
                    left: mx - margin,
                    width: Math.max.apply(null, actionx) - mx + aperture + margin * 2,
                    height: Math.max.apply(null, actiony) - my + aperture + margin * 2
                });
            }

            $.each(actions, function() {
                var e = this;

                /* execute condition if the menu item should be shown */
                if ($.isFunction(e.condition) && !e.condition(t)) {
                    return true;
                }

                /* create new circle dom element and insert it into document and add to current menu */
                var $c = $(cfg.layout.tag).addClass(cfg.layout.cssClass);
                container.append($c);
                menu.push($c);

                /* set circle to click point */
                $c.css(css);

                /* attach display item */
                $c.append(e.display);

                /* attach handler to circle */
                if (e.customEvent) {
                    $.each(e.customEvent, function(ev, func) {
                        $c.on(ev, function(event) {
                            event.target = t;
                            func(event);
                        });
                    });
                }

                if (e.handler) {
                    $c.on(executeHandlerEvent, function(event) {
                        event.target = t;
                        if (!e.handler(event)) {
                            // allow handler to return 'true' to keep menu open.
                            $.quickaction.settings.layout.destroy(cfg);
                        }
                    });
                }

                if (cfg.autoClose && e.pinned !== true) {
                    $c.on(executeHandlerEvent, function() {
                        // We have to let listeners of the circle to be executed first
                        // before closing/destroying the menu
                        window.setTimeout(function() {
                            $.quickaction.settings.layout.destroy(cfg);
                        }, 500); // delay 500ms to enable the event to bubble up (and protect from ghostclicks)
                    });
                }

                if (!e.touchpoint) {
                    var details = cfg.layout.details;
                    var pos = getPos(center.x, center.y, details.radius, details.angle, details.distance, index);
                    index++;

                    $c.delay(10).animate({
                        top: pos.top,
                        left: pos.left
                    }, {
                        duration: cfg.layout.effect.duration,
                        easing: cfg.layout.effect.easing
                    });
                }
            });

            // Move buttons above mask once finger is released.
            // Thanks to that no action is trigger by releasing a finger after taphold.
            container.one("touchend pointerup", function() {
                window.setTimeout(function() {
                    $.each(menu, function(idx, item) {
                        $(item).css("z-index", cfg.layout.details.zIndex + 1);
                    });
                }, 100);
            });
        }
    };

    $.quickaction.LAYOUT_BAR = {
        tag: "<ul/>",
        cssClass: "quickaction-bar",
        details: {
            /* bar z-index */
            zIndex: 9999,

            /* bar height */
            size: 28
        },

        render: function(actions, cfg, event) {
            var self = this;

            /* don't recreate a quickactions if they are shown already */
            if (cfg.container.find("." + this.cssClass).length) {
                return;
            }

            this.destroy(cfg);
            this.renderActions(actions, cfg, event);
            $(cfg.container).trigger($.quickaction.events.openMenu, { cfg: cfg, target: event.target });

            if (cfg.autoClose) {
                var closeMenuEvent = eventName(cfg.event.closeMenu, cfg.event.namespace);
                var bar = self.getQuickactionsBar();

                /* hide quickactions if mouse leaves the anchor */
                cfg.anchor.off(closeMenuEvent);
                cfg.anchor.on(closeMenuEvent, function(e) {
                    /* but don't hide actions if mouse is over quickaction bar */
                    if ($(e.relatedTarget).closest("." + cfg.layout.cssClass).length) {
                        return;
                    }

                    if (bar && bar.data("quickaction.internal.pinned") === true) {
                        return;
                    }

                    self.destroy(cfg);
                    cfg.anchor.off(closeMenuEvent);
                });

                /* hide quickactions if mouse leave quickaction bar */
                if (bar) {
                    bar.off(closeMenuEvent);
                    bar.on(closeMenuEvent, function(e) {
                        /* but don't hide actions if mouse is over the anchor again */
                        if ($(e.relatedTarget).closest(cfg.anchor).length) {
                            return;
                        }

                        if (bar.data("quickaction.internal.pinned") === true) {
                            return;
                        }

                        self.destroy(cfg);
                        bar.off(closeMenuEvent);
                    });
                }
            }
        },

        destroy: function(cfg) {
            var closed = false;

            /* remove action buttons */
            while (menu.length > 0) {
                closed = true;
                menu.pop().remove();
            }

            /* trigger close menu event if actions were removed in fact */
            if (closed) {
                $(cfg.container).trigger($.quickaction.events.closeMenu, { cfg: cfg });
            }
        },

        getQuickactionsBar: function() {
            return (menu && menu.length) ? menu[0] : undefined;
        },

        renderActions: function(actions, cfg, event) {
            // margin used to separate the quick action bar from the border.
            var MARGIN = 10;

            var container = $(cfg.container);
            var t = $(event.target);
            var item = resolveAnchor(cfg.anchor);
            var details = this.details;

            /* create quickactions bar */
            var $bar = $(cfg.layout.tag).addClass(cfg.layout.cssClass);

            /* TODO: check why height/outerHeight does not include margin from css :before */
            var marginTop = parseInt(item.css("margin-top").replace("px", ""));
            // selects the the first child of the card since this is the container of the
            // quickactions.
            /* TODO: define an anchor instead of relying on the cards. */
            var imageSize = $(item).find(".image").outerHeight(true);

            container.append($bar);

            $bar.css("position", "absolute");
            $bar.css("top", item.position().top + marginTop + imageSize - details.size - MARGIN);
            // FIX: CoralUI sets non-integer values for elements and
            // jquery always rounds it to integer causing 1px difference
            $bar.css("left", item.position().left - 1);
            $bar.css("width", item.width());
            $bar.css("height", details.size);
            $bar.css("z-index", details.zIndex);

            /* add quickactions bar itself to the menu[] */
            menu.push($bar);
            var executeHandlerEvent = eventName(cfg.event.executeHandler, cfg.event.namespace);

            $.each(actions, function() {
                var e = this;

                /* execute condition if the menu item should be shown */
                if ($.isFunction(e.condition) && !e.condition(t)) {
                    return true;
                }

                /* create action button, add it to menu[] and quickactions bar */
                var $c = $("<li/>").css({
                    width: details.size,
                    height: details.size
                });

                $bar.append($c);
                menu.push($c);
                $c.append(e.display);

                /* attach handler to button */
                if (e.customEvent) {
                    $.each(e.customEvent, function(ev, func) {
                        $c.on(ev, function(event) {
                            event.target = t;
                            func(event);
                        });
                    });
                }

                if (e.handler) {
                    $c.on(executeHandlerEvent, function(event) {
                        event.target = t;
                        if (!e.handler(event)) {
                            /* allow handler to return 'true' to keep menu open */
                            $.quickaction.settings.layout.destroy(cfg);
                        }
                    });
                }

                if (cfg.autoClose && e.pinned === true) {
                    $c.on(executeHandlerEvent, function() {
                        $bar.data("quickaction.internal.pinned", true);
                    });
                }
            });

            $bar.addClass("quickaction-fadein");
        }
    };

    $.quickaction.settings = {
        event: {
            namespace: "quickaction",
            openMenu: {
                touch: isTouch && !isIpad ? "pointerhold" : "taphold",
                pointer: "mouseover"
            },
            closeMenu: {
                touch: window.navigator.maxTouchPoints ? "pointerdown" : "tap",
                pointer: "mouseleave"
            },
            executeHandler: {
                touch: window.navigator.maxTouchPoints ? "pointerdown" : "tap",
                pointer: "click"
            }
        },

        /* default container for the quickactions */
        container: "body",

        /* quickactions layout */
        layout: $.quickaction.LAYOUT_CIRCLE,
        autoClose: false
    };

    /* list of events used by quickactions */
    $.quickaction.events = {
        openMenu: "quickactionopenmenu",
        closeMenu: "quickactionclosemenu"
    };

    $.fn.extend({
        quickaction: function(actions, options) {
            var cfg = $.extend(true, $.quickaction.settings, options);
            var openMenuEvent = eventName(cfg.event.openMenu, cfg.event.namespace);

            var open = function(event) {
                $.quickaction.settings.layout.render(actions, cfg, event);
            };

            return this.each(function() {
                $(this).on(openMenuEvent, open);
            });
        }
    });
}(Granite.$, this, Granite));
