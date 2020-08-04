/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2012 Adobe Systems Incorporated
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

    var annotationRel = ".asset-annotation img";
    var annotationCRel = ".asset-annotation canvas";

    var annotation = [];
    var addAnnotation = ".cq-damadmin-asset-annotation-save";
    var cancelRel = ".cq-damadmin-asset-annotation-cancel";
    var addComment = ".comment_dlg_add";

    var $target = $(".asset-annotation canvas");
    var $content = $(".asset-annotation");
    var touch = "ontouchstart" in window;
    var dlg = null;
    var playVideoActivator = ".cq-damadmin-admin-actions-playvideo-activator";

    var flag = true;
    var flagClear = false;
    var count = -1;

    var video = false;
    var canAnnotate = false;
    var videoPlayer = null;


    var canvas = null;


    var userColor = null;
    var initInterval = null;

    // events for notifying change of DM video playback capabilities
    var VA_VIDEO_CAPABILITY_PAUSABLE = "dm-video-pausable";
    var VA_VIDEO_CAPABILITY_PLAYABLE = "dm-video-playable";

    $(document).on("foundation-contentloaded", function(e) {
        var pathname = location.pathname;
        if (pathname.indexOf("/annotate.html") > -1) {
            var cyclebutton = document.getElementsByTagName("coral-cyclebutton");
            Coral.commons.ready(cyclebutton, function() {
                $(cyclebutton).find("button[is='coral-button']").click();
            });
        }
        // cq timeline commons is designed to address collections page. Setting this here (properties page to make cq
        // commons api work)
        var paths = [];
        paths.push($(".foundation-content-path").data("foundation-content-path"));
        $(".cq-common-admin-timeline").data("paths", paths);

        if (touch) {
            if ($("video")) {
                $("video").removeAttr("id");
                $("video").removeAttr("data-setup");
                $("video").removeClass("video-js");
                $("video").removeClass("vjs-tech");
                $("video").removeClass("video-default-skin");
                $(".asset-annotation").css("height", "100%");
                $(".asset-view").css("height", "100%");
            }
        }


        // todo: change this to use attribute of asset or read from data element of DIV
        var isDAMPreview = $("#s7_videoview_div").length > 0;

        var jumptotime = $("#jumptotime");
        if (jumptotime !== null && jumptotime.parent("div.coral-Form-fieldwrapper") !== null) {
            jumptotime.parent("div.coral-Form-fieldwrapper").addClass("endor-ActionBar-item");
        }

        if ($(".asset-annotation").length > 0 && !$("#aem-assets-rail-timeline").hasClass("is-active")) {
            $(".cq-common-admin-timeline-activator:visible").click();
        }

        video = $(".asset-annotation").data("video");
        canAnnotate = $(".asset-annotation").data("canAnnotate");
        userColor = $(".asset-annotation").data("user-color");

        $(".target").load(function() {
            count++;
            annotationStart(e);
        }).each(function() {
            if (this.complete) {
                $(this).load();
            }
        });

        if (video === true) {
            videoPlayer = isDAMPreview ? $("#s7_videoview_div")[0] : $("video")[0];

            if (!isDAMPreview) {
                $(videoPlayer).css("top", "auto");
                videoPlayer.removeAttribute("controls");
            }

            count++;
            annotationStart(e);
            canvas = $("canvas")[0];
            if (!isDAMPreview) {
                if (window.videojs !== undefined) {
                    if (!touch) {
                        window.videojs("dam_video").ready(
                            function() {
                                $(".vjs-big-play-button").css("display", "none");
                                $(".vjs-control-bar").css("display", "none");
                            });
                    }
                }
            }

            // register playable and pausable capability event listeners to toggle the play/pause button caused by
            // change in video playback capablity
            if (isDAMPreview) {
                $(document).on(VA_VIDEO_CAPABILITY_PLAYABLE, function(e) {
                    changeVideoIconPauseToPlay($(playVideoActivator));
                });
                $(document).on(VA_VIDEO_CAPABILITY_PAUSABLE, function(e) {
                    changeVideoIconPlayToPause($(playVideoActivator));
                });
            } else if ($("video")[0]) {
                // legacy code - only if video tag is defined add these events
                var cw;
                var ch;

                videoPlayer
                    .addEventListener(
                        "play",
                        function() {
                            cw = videoPlayer.clientWidth;
                            ch = videoPlayer.clientHeight;
                            canvas.width = cw;
                            canvas.height = ch;
                            // $(".asset-annotation").css("top","0.9375rem");
                            $(".asset-annotation").css(
                                "left", "0.95rem");


                            changeVideoIconPlayToPause($(playVideoActivator));
                        }, false);
                $(videoPlayer).bind("pause", function() {
                    changeVideoIconPauseToPlay($(playVideoActivator));
                });

                videoPlayer.addEventListener("ended", function() {
                    $(".vjs-big-play-button").css("display", "none");
                    changeVideoIconPauseToPlay($(playVideoActivator));
                });

                videoPlayer.addEventListener("loadedmetadata", function() {
                    if (window.currentVideoTime !== undefined) {
                        videoPlayer.currentTime = window.currentVideoTime;
                    }
                });

                if (touch) {
                    videoPlayer.load();
                    videoPlayer.play();
                    changeVideoIconPauseToPlay($(playVideoActivator));
                    $(videoPlayer).removeAttr("controls");
                }
                var path = isDAMPreview ? $(videoPlayer).data("path") : $(videoPlayer).attr("path");
                if (path) {
                    refreshTimeline(path);
                }
            }

            $(".asset-annotation").on("annotateBegin", function(e) {
                if (!isDAMPreview) {
                    if (videoPlayer) {
                        videoPlayer.pause();
                    }
                } else {
                    var videoComp = $("#s7_videoview_div").data("s7video").getComponent("videoPlayer");
                    if (videoComp) {
                        videoComp.pause();
                    }
                }
                changeVideoIconPauseToPlay($(playVideoActivator));
            });
        } else {
            $(".cq-damadmin-admin-actions-playvideo-activator").remove();
            $("#jumptotime").css("display", "none");
            $(".cq-damadmin-jumpto-video-time").css("display", "none");
        }
        var dialog = document.querySelector("#annotateasset");
        if (dialog !== null) {
            $(dialog).on("coral-overlay:close", function(event) {
                resetDrawAfterComment(event);
            });
        }
    });

    /**
     *  Currently added this hack to delete the graphic. Since conversion to Coral3/merge from AOD
     *  the Delete stopped working. Forcing the canvas to clear the transforms clears up the graphic...
     */
    $(document).on("DELETE_ANNOTATION", function(e) {
        if ($(".dam-canvas-class").get(0)) {
            $(".dam-canvas-class").get(0).width = $(".dam-canvas-class").get(0).width;
        }
    });

    $(document).on("click" + annotationCRel, annotationCRel, function(e) {
        if (canAnnotate && annotation[count]) {
            if (annotation[count].imageData === "") {
                annotationStart();
            }
        }
    });

    $(document).on("click", ".annotation-content-control", function(e) {
        back(this);
    });

    $(document).on("click.jumpbtn", ".jumpbtn", function(e) {
        var value = $("#jumptotime").val();
        var isDAMPreview = $("#s7_videoview_div").length > 0;
        if (video && !isNaN(parseFloat(value)) && isFinite(value)) {
            if (!isDAMPreview) {
                videoPlayer.currentTime = value;
            } else {
                var videoComp = $("#s7_videoview_div").data("s7video").getComponent("videoPlayer");
                var finalTime = parseInt(value) * 1000;
                if (finalTime <= parseInt(videoComp.getDuration())) {
                    videoComp.seek(finalTime);
                }
            }
            $.each($("canvas"), function(index, canvas) {
                var context = canvas.getContext("2d");
                context.clearRect(0, 0, canvas.width, canvas.height);
            });
        }
    });

    $(document).on("click." + addAnnotation, " .button.primary" + addAnnotation, function(e) {
        done(e);
        dlg = $("#annotateasset");
        $(dlg).remove();
    });


    $(document).on("click." + playVideoActivator, playVideoActivator, function(e) {
        var isDAMPreview = $("#s7_videoview_div").length > 0;
        if (!isDAMPreview) {
            if (videoPlayer.paused) {
                videoPlayer.play();
                changeVideoIconPlayToPause($(playVideoActivator));
                $("canvas").css("display", "none");
                annotationStart();
            } else {
                videoPlayer.pause();
                changeVideoIconPauseToPlay($(playVideoActivator));
            }
        } else {
            var videoComp = $("#s7_videoview_div").data("s7video").getComponent("videoPlayer");
            var videoState = videoComp.getCapabilityState();
            if (videoState.hasCapability(s7viewers.s7sdk.VideoCapabilityState.PLAY)) {
                // We know that the VideoPlayer is able to play
                videoComp.play();
                changeVideoIconPlayToPause($(playVideoActivator));
                $("canvas").css("display", "none");
                annotationStart();
            } else if (videoState.hasCapability(s7viewers.s7sdk.VideoCapabilityState.REPLAY)) {
                videoComp.seek(0);
                videoComp.play();
                changeVideoIconPlayToPause($(playVideoActivator));
                $("canvas").css("display", "none");
                annotationStart();
            } else {
                videoComp.pause();
                changeVideoIconPauseToPlay($(playVideoActivator));
            }
        }
    });

    $(document).on("click", cancelRel, function(e) {
        back(this);
        var loc = window.location.pathname;
        var assetdetailSelector = /\/assetdetails\.html\//i;
        if (loc.match(assetdetailSelector) === null) {
            var paths = [];
            $(".cq-common-admin-timeline").data("paths", paths);
            $(".cq-common-admin-timeline").trigger("cq-common-admin-timeline-change.cq-common-admin-timeline",
                { "paths": paths });
        }
    });

    function changeVideoIconPauseToPlay(playPauseVideoControl) {
        var playIcon = playPauseVideoControl.children("coral-Icon");
        if (playIcon.attr("icon") === "pauseCircle") {
            var newIcon = new Coral.Icon().set({
                icon: "playCircle",
                size: playIcon[0].size
            });
            playIcon.replaceWith(newIcon);
        }
    }

    function changeVideoIconPlayToPause(playPauseVideoControl) {
        var playIcon = playPauseVideoControl.children("coral-Icon");
        if (playIcon.attr("icon") === "playCircle") {
            var newIcon = new Coral.Icon().set({
                icon: "pauseCircle",
                size: playIcon[0].size
            });
            playIcon.replaceWith(newIcon);
        }
    }

    function back(element) {
        cleanup();
        var control = $(element);
        var action = control.data("foundationContentControlAction");
        var contentAPI;
        if (control.closest(".foundation-content").length > 0) {
            contentAPI = control.closest(".foundation-content").adaptTo("foundation-content");
        } else {
            contentAPI = $(".foundation-content").adaptTo("foundation-content");
        }
        if (action === "back") {
            contentAPI.back(false);
        }
    }

    function annotationStart(e) {
        if (!canAnnotate) {
            return;
        }
        flag = true;
        if (annotation[count] && annotation[count].$canvas) {
            annotation[count].close();
            annotation[count].clear();
        }
        $target = $(annotationRel).eq(0);

        var isDAMPreview = $("#s7_videoview_div").length > 0;
        var DAMvideoPlayer = $("video");
        if (isDAMPreview) {
            if (DAMvideoPlayer.length === 0) {
                if (!initInterval) {
                    // initInterval = setInterval(annotationStart, 100);
                }
                return;
            } else {
                clearInterval(initInterval);
            }
        }
        $content = $target.parent();
        if (video && DAMvideoPlayer.length > 0) {
            annotation[count] = new $.Annotation({
                resizeWatch: true
            }, DAMvideoPlayer);
        } else {
            annotation[count] = new $.Annotation({
                resizeWatch: true
            }, $target);
        }


        annotation[count].imageData = "";
        annotation[count].texts = [];
        annotation[count].shapes = [];
        if (flagClear && annotation[count].shapes.length > 0) {
            for (var index = 0; index < annotation[count].shapes.length; index++) {
                annotation[count].shapes[index].clear();
            }
            flagClear = false;
        }
        annotation[count].open();
        if (isDAMPreview) {
            $(".asset-annotation canvas").css("bottom", "0").css("top", "0").css("left", "0")
                .css("right", "0").css("margin", "auto");
        } else {
            $(".asset-annotation canvas").css("left", "0").css("right", "0").css("margin", "auto");
        }
        annotation[count].start();

        if (userColor && annotation[count].damCanvas) {
            annotation[count].damCanvas.color = userColor;
        }

        if (video) {
            $(DAMvideoPlayer).on("annotateEnd", function(e, annotation, shape) {
                // 'begin' is sent when a user ended drawing.
                if (flag && annotation) {
                    endDrawCB(annotation);
                    flag = false;
                }
            });
        } else {
            $content.on("annotateEnd", ".target", function(e, annotation, shape) {
                // 'begin' is sent when a user ended drawing.
                if (flag && annotation) {
                    endDrawCB(annotation);
                    flag = false;
                }
            });
        }
    }

    function endDrawCB(annotationItem) {
        dlg = $("#annotateasset");
        addComment = ".comment_dlg_add";
        dlg.find("textarea").keyup(function(e) {
            if ($(this).val().trim()) {
                $(addComment).removeAttr("disabled");
            } else {
                $(addComment).attr("disabled", "disabled");
            }
        }
        );

        $(dlg).find("textarea").val("");
        document.querySelector("#annotateasset").show();
        $(dlg).find("textarea").focus();
        $(addComment).attr("disabled", "disabled");
    }

    $(document).on("click." + addComment, addComment, function(e) {
        add(e);

        if (video) {
            var isDAMPreview = $("#s7_videoview_div").length > 0;
            if (!isDAMPreview) {
                annotation[count].time = videoPlayer.currentTime;
            } else {
                var videoComp = $("#s7_videoview_div").data("s7video").getComponent("videoPlayer");
                annotation[count].time = videoComp.getCurrentTime();
            }
        }
        done(e);
        annotationStart(e);
    });

    function add(e) {
        if (dlg === null) {
            dlg = $("#annotateasset");
        }
        var txt = $("#" + dlg.attr("id") + " #textVal").val();


        annotation[count].addText(txt);


        document.querySelector("#annotateasset").hide();
    }


    function done(e) {
        var $legalAnnotations = [];

        $(".annotation-error").css("display", "none");
        $(".annotation-success").css("display", "none");

        $.each(annotation, function(key) {
            if (annotation[key] && annotation[key].imageData && annotation[key].texts.length) {
                $legalAnnotations.push(annotation[key]);
            }
        });

        save($legalAnnotations);

        // cleanup annotation array;
        count = 0;
        annotation = [];
    }

    function refreshTimeline(path) {
        // success handler
        if (path) {
            var $timelinefeedfilter = $(".damadmin-rail-asset-timeline-feed-filter");
            $timelinefeedfilter.find("select option").removeAttr("selected");
            $timelinefeedfilter.find("button").text("Annotations");
            var paths = [];
            paths.push(path);
            $(".cq-common-admin-timeline").data("paths", paths);
            $(".cq-common-admin-timeline").trigger("cq-common-admin-timeline-change.cq-common-admin-timeline",
                { "paths": paths });
        }
    }

    function save(e) {
        var annotationPromises;
        if (video) {
            annotationPromises = e.map(saveVideoAnnotation);
        } else {
            annotationPromises = e.map(saveAnnotation);
        }
        return $.when.apply($, annotationPromises).pipe(function(/* save annotations */) {
            return $.makeArray(arguments);
        });
    }

    function cleanup(e) {
        for (var i = 0; i < annotation.length; i++) {
            if (annotation[i]) {
                annotation[i].close();
                annotation[i].clear();

                if (annotation[i].shapes && annotation[i].shapes.length > 0) {
                    for (var index = 0; index < annotation[i].shapes.length; index++) {
                        annotation[i].shapes[index].clear();
                    }
                }
            }
        }

        // delete annotation;

        annotation = [];
        $.removeData(document.body, "shape_" + count + "_");
        flagClear = true;
    }

    function resetDrawAfterComment(e) {
        partialCleanup(e);
        count++;
        annotationStart(e);
    }

    function partialCleanup(e) {
        if (annotation[count] && annotation[count].texts.length === 0) {
            annotation[count].close();
            annotation[count].clear();
        }
        document.querySelector("#annotateasset").hide();
        count--;
        // flagClear = true;
    }

    function saveAnnotation(a) {
        if (a === "undefined") {
            return;
        }


        var path = a.$el.attr("cq-path");
        var imgPath = a.$el.attr("src");


        if (imgPath.indexOf("http") < 0) {
            var idx = imgPath.indexOf("?");
            if (idx > 0) {
                imgPath = imgPath.substring(0, idx);
            }
            imgPath = imgPath.replace("/_jcr_", "/jcr:");

            imgPath = path + imgPath.substring(imgPath.indexOf("/jcr:"), imgPath.length);
        } else {
            // backend does not support cloud URL and need to convert it to crx based path
            var decodeURL = decodeURIComponent(imgPath);
            var decodeURLs = decodeURL.split(";");
            for (var i = 0; i < decodeURLs.length; i++) {
                if (decodeURLs[i].includes("filename=")) {
                    var s = decodeURLs[i];
                    imgPath = path + "/jcr:content/renditions/" + s.substring(s.indexOf("\""),
                        s.lastIndexOf("\"")).replace(/"/g, "");
                    break;
                }
            }
        }
        var ui = $(window).adaptTo("foundation-ui");
        if (ui !== undefined) {
            ui.wait();
        }
        return $.ajax({
            url: encodeURIComponent(path).replace(/%2F/g, "/") + ".annotation",
            type: "POST",
            async: true,
            cache: !$.browser.msie,
            data: {
                "text": a.texts[0],
                "data": a.toJson(),
                "imageData": a.getImageData(),
                "imagePath": imgPath,
                "resourceType": "components/dam/damasset/annotation",
                "_charset_": "UTF-8"
            },
            error: function(xhr, error, thrownError) {
                if (ui !== undefined) {
                    ui.clearWait();
                }
                if (error === "error") {
                    var $html = $(xhr.responseText);

                    if ($html.find(".foundation-form-response-status-code").length > 0) {
                        ui.prompt($html.find(".foundation-form-response-title").next().html(),
                            $html.find(".foundation-form-response-description")
                                .next().html(), "error", [{
                                text: Granite.I18n.get("Close"),
                                primary: true
                            }]);
                        return;
                    }
                }
                ui.prompt(error, thrownError, "error", [{
                    text: Granite.I18n.get("Close"),
                    primary: true
                }]);
            }
        }).done(function(data) {
            if (ui !== undefined) {
                ui.clearWait();
            }
            refreshTimeline(path);
        });
    }

    function saveVideoAnnotation(a) {
        if (a === "undefined") {
            return;
        }

        var path = $("video").attr("path");
        canvas = $("canvas")[0];

        var time = a.time;
        var isDAMPreview = $("#s7_videoview_div").length > 0;
        var videoComp = $("video")[0];
        var videoDuration = video.duration;
        var ui = $(window).adaptTo("foundation-ui");
        if (isDAMPreview) {
            videoComp = $("#s7_videoview_div").data("s7video").getComponent("videoPlayer");
            videoDuration = videoComp.getDuration();
            var vidCurrentTime = videoComp.getCurrentTime();
            if (isNaN(vidCurrentTime)) {
                vidCurrentTime = 0;
            }
            (videoComp) ? time = vidCurrentTime : time;
            time = (time === 0) ? 0 : time / 1000;
            (videoComp) ? path = $("#s7_videoview_div").data("path") : path;
        }
        return $.ajax({
            url: encodeURIComponent(path).replace(/%2F/g, "/") + ".annotation",
            type: "POST",
            async: true,
            cache: !$.browser.msie,
            data: {
                "text": a.texts[0],
                "time": time,
                "duration": (videoDuration),
                "data": a.toJson(),
                "imageData": a.getImageData(),
                "imagePath": path,
                "resourceType": "components/dam/damasset/annotation",
                "_charset_": "UTF-8"
            },
            error: function(xhr, error, thrownError) {
                if (error === "error") {
                    var $html = $(xhr.responseText);

                    if ($html.find(".foundation-form-response-status-code").length > 0) {
                        ui.prompt($html.find(".foundation-form-response-title").next().html(),
                            $html.find(".foundation-form-response-description")
                                .next().html(), "error", [{
                                text: Granite.I18n.get("Close"),
                                primary: true
                            }]);
                        return;
                    }
                }
                ui.prompt(error, thrownError, "error", [{
                    text: Granite.I18n.get("Close"),
                    primary: true
                }]);
            }
        }).done(function(data) {
            refreshTimeline(path);
        });
    }
})(document, Granite.$);
