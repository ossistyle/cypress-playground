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
    /** This Library is clone of ../../actions/js/assetviewer.js */
    $(document).on("foundation-contentloaded", function(e) {
        $(".video-playback").on("click", function(event) {
            event.preventDefault();
            event.stopPropagation();

            var icon = $(event.target);
            var pauseIcon = new Coral.Icon().set({
                icon: "pauseCircle",
                size: "L"
            });
            var playIcon = new Coral.Icon().set({
                icon: "playCircle",
                size: "L"
            });

            if (icon.hasClass("dm-video-play")) {
                // trigger custom event registered to document
                $(document).trigger("dm-video-play", [ $(event.target) ]);
            } else {
                var video = $("video", event.currentTarget.parentElement).get(0);
                $(video).css("opacity", "1");
                if (icon.attr("icon") === "playCircle") {
                    var iconParent;
                    iconParent = icon.parent();
                    icon.remove();
                    $(iconParent).append(pauseIcon);
                    $(video).css("opacity", "1");
                    video.play();
                    icon[0].icon = "pauseCircle";
                } else {
                    iconParent = icon.parent();
                    icon.remove();
                    $(iconParent).append(playIcon);
                    video.pause();
                    $(video).css("opacity", "0.7");
                }
                /*
                 *  * Using Jquery instead of native addEventListener to prevent multiple ended events
                 * in case of calling removeEventListener
                */
                $(video).bind("ended", function() {
                    $(video).unbind("ended");
                    $(video).css("opacity", "0.7");
                    var iconParent = icon.parent();
                    icon.remove();
                    $(iconParent).append(playIcon);
                });

                $(video).bind("pause", function() {
                    $(video).css("opacity", "0.7");
                    var iconParent = icon.parent();
                    icon.remove();
                    $(iconParent).append(pauseIcon);
                });
            }
        });


        $(".audio-playback").on("click", function(event) {
            event.preventDefault();
            event.stopPropagation();

            var icon = $(event.target);

            var audio = $("audio", event.currentTarget.parentElement).get(0);
            $(audio).css("opacity", "1");
            if (icon.hasClass("coral-Icon--playCircle")) {
                icon.removeClass("coral-Icon--playCircle");
                $(audio).css("opacity", "1");
                audio.play();
                icon.addClass("coral-Icon--pauseCircle");
            } else {
                icon.removeClass("coral-Icon--pauseCircle");
                audio.pause();
                $(audio).css("opacity", "0.7");
                icon.addClass("coral-Icon--playCircle");
            }
            /*
             * Using Jquery instead of native addEventListener to prevent multiple ended events
             * in case of calling removeEventListener
             */
            $(audio).bind("ended", function() {
                $(audio).unbind("ended");
                $(audio).css("opacity", "0.7");
                icon.removeClass("coral-Icon--pauseCircle");
                icon.addClass("coral-Icon--playCircle");
            });

            $(audio).bind("pause", function() {
                $(audio).css("opacity", "0.7");
                icon.removeClass("coral-Icon--pauseCircle");
                icon.addClass("coral-Icon--pauseCircle");
            });
        });
    });
})(document, Granite.$);
