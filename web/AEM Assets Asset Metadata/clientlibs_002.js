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
 *
 */

(function(window, document, Granite, $) {
    "use strict";

    var EVENT_LAUNCH_PICKER = "dm-launch-picker";

    var ELEMENT_THUMB_PREVIEW = "#manual-thumb-span";
    var ELEMENT_CHANGE_THUMB_DIALOG = "#change-video-thumb-dialog";
    var ELEMENT_CHANGE_THUMB_FORM = "#change-video-thumb-form";
    var ELEMENT_CHANGE_THUMB_TABS = "#change-video-thumb-tabs";
    var ELEMENT_SELECT_FRAME_TAB = ".select-playframe-tab"; // DMS7
    var ELEMENT_SELECT_THUMB_TAB = ".select-frame-tab"; // DMHybrid
    var ELEMENT_STEP_LIST_PANEL = "#select-frame-step-list-panelstack";
    var ELEMENT_STEP_LIST = "#select-frame-step-list";

    var ELEMENT_SAVE_CHANGE_BTN = "#save-change-thumb-btn";
    var ELEMENT_CANCEL_CHANGE_BTN = "#cancel-change-thumb-btn";
    var ELEMENT_THUMB_PICKER_BTN = "#video-thumb-picker";
    var ELEMENT_SAVE_THUMB_WAIT_DIV = ".save-thumbnail-wait";

    var THUMBNAIL_RENDITION = "/jcr:content/renditions/cq5dam.web.1280.1280.jpeg";
    var S7DAMTYPE_KEY = "dam:s7damType";
    var REMOTE_S7FILE_KEY = "dam:scene7File";
    var REMOTE_S7ID_KEY = "dam:scene7ID";
    var MANUAL_THUMBNAIL_NODE_PATH = "/jcr:content/manualThumbnail";
    var MANUAL_THUMBNAIL_PROPERTY = "sling:resource";

    /***************************************************************************
     *  1. Common part
     **************************************************************************/

    $(document).on("coral-tablist:change", ELEMENT_CHANGE_THUMB_TABS, function() {
        toggleTabButton();
    });

    $(document).on("coral-overlay:open", ELEMENT_CHANGE_THUMB_DIALOG, function() {
        toggleTabButton();

        // For DMHybrid, when dialog open, load preview urls
        if ($(ELEMENT_SELECT_THUMB_TAB).length === 1) {
            previewThumbnails();
        }
    });

    $(document).on("coral-overlay:close", ELEMENT_CHANGE_THUMB_DIALOG, function() {
        $(ELEMENT_SELECT_THUMB_TAB).find("coral-alert").remove();
    });

    $(document).on("click", ELEMENT_SAVE_CHANGE_BTN, function(e) {
        // Pause the video if playing.
        var videoHybrid = $(ELEMENT_SELECT_THUMB_TAB + " video")[0];
        var videoDMS7 = $(ELEMENT_SELECT_FRAME_TAB + " video")[0];
        var video = (videoHybrid === undefined) ? videoDMS7 : videoHybrid;

        if (video && !video.paused) {
            video.pause();
        }

        var tab = $(ELEMENT_CHANGE_THUMB_TABS)[0];
        var selectTabIndex = $(tab).children("coral-tab").index(tab.selectedItem);

        if (selectTabIndex === 0) {
            if ($(ELEMENT_SELECT_FRAME_TAB).length === 1) { // For DMS7
                savePlayFrameThumbnail();
            } else { // For DMHybrid
                saveSelectedThumbnail();
            }
        } else if (selectTabIndex === 1) {
            if ($(ELEMENT_SELECT_FRAME_TAB).length === 1) { // For DMS7
                saveChosenThumbnail();
            } else { // For DMHybrid
                saveUploadThumbnail();
            }
        }

        return false;
    });

    $(document).on("foundation-contentloaded", ELEMENT_CHANGE_THUMB_DIALOG, function() {
        var HTML5enabled = window.FormData !== undefined;
        if (!HTML5enabled && $("coral-fileupload[name=coverImage]")) {
            $("coral-fileupload[name=coverImage]").hide();
        }
    });

    function toggleTabButton() {
        var tab = $(ELEMENT_CHANGE_THUMB_TABS)[0];
        var selectTabIndex = $(tab).children("coral-tab").index(tab.selectedItem);

        $(tab).children("coral-tab").each(function(index, item) {
            if (index === selectTabIndex) {
                $(item).find("button").addClass("is-selected");
            } else {
                $(item).find("button").removeClass("is-selected");
            }
        });

        $($(".thumb-dialog-right-panel")[0].panelStack).children("coral-panel").each(function(index, item) {
            if (index === selectTabIndex) {
                $(item).addClass("is-selected");
            } else {
                $(item).removeClass("is-selected");
            }
        });
    }

    function doneSave() {
        $(ELEMENT_SAVE_THUMB_WAIT_DIV).empty();
        var dialog = document.querySelector(ELEMENT_CHANGE_THUMB_DIALOG);
        dialog.hide();
        location.reload();
    }

    function showWait() {
        var wait = new Coral.Wait().set({
            size: "L"
        });
        $(ELEMENT_SAVE_THUMB_WAIT_DIV).append(wait);
        $(ELEMENT_SAVE_CHANGE_BTN).attr("disabled", "disabled");
        $(ELEMENT_CANCEL_CHANGE_BTN).attr("disabled", "disabled");
    }

    function setThumbnail(name, url) {
        name = name || "";
        var image = $("<img class='show-grid'>").attr({ src: url, title: name });
        $(ELEMENT_THUMB_PREVIEW).empty();
        $(ELEMENT_THUMB_PREVIEW).append(image);
    }

    /***************************************************************************
     *  2. DMHybrid part
     **************************************************************************/

    /**
     * 2.1. DMHybrid: select thumbnail from 10 temporary thumbnails
     */
    function previewThumbnails() {
        var assetPath = $(ELEMENT_CHANGE_THUMB_DIALOG).data("assetpath");
        var previewUrl = assetPath + ".videothumbnail?:operation=previewUrls";
        if ($(ELEMENT_STEP_LIST_PANEL).length === 0) {
            $.ajax({
                url: Granite.HTTP.externalize(previewUrl),
                cache: false,
                type: "GET"
            }).done(function(resp) {
                if (resp) {
                    var urlArr = JSON.parse(resp).urls;
                    if (urlArr && urlArr.length >= 2 && $(ELEMENT_STEP_LIST_PANEL).length === 0) {
                        $(ELEMENT_SELECT_THUMB_TAB).empty();
                        renderStepList(urlArr);
                    } else {
                        submitThumbJob();
                    }
                } else {
                    submitThumbJob();
                }
            }).fail(function() {
                submitThumbJob();
            });
        }
    }

    function submitThumbJob() {
        var assetPath = $(ELEMENT_CHANGE_THUMB_DIALOG).data("assetpath");
        var generateThumbUrl = assetPath + ".videothumbnail";

        $.ajax({
            url: Granite.HTTP.externalize(generateThumbUrl),
            cache: false,
            type: "POST"
        }).done(function(jobResp) {
            var jobId = jobResp.substr(jobResp.indexOf(":") + 1);
            getThumbJobStatus(jobId);
        }).fail(function() {
            $(ELEMENT_SELECT_THUMB_TAB).empty();
            var alert = new Coral.Alert().set({
                variant: "error",
                header: {
                    innerHTML: Granite.I18n.get("ERROR")
                },
                content: {
                    innerHTML: Granite.I18n.get("Failed to submit job to generate thumbnails.")
                }
            });
            $(ELEMENT_SELECT_THUMB_TAB).append(alert);
        });
    }

    function getThumbJobStatus(jobId) {
        if (!jobId) {
            jobStatusFailHandler();
            return;
        }

        var assetPath = $(ELEMENT_CHANGE_THUMB_DIALOG).data("assetpath");
        var checkStatusUrl = assetPath + ".videothumbnail?:operation=jobStatus";
        var previewUrl = assetPath + ".videothumbnail?:operation=previewUrls";

        var data = {};
        data.jobId = jobId;

        var refreshIntervalId = setInterval(function() {
            $.ajax({
                url: Granite.HTTP.externalize(checkStatusUrl),
                cache: false,
                data: data,
                type: "GET"
            }).done(function(statusResp) {
                var percentage = parseInt(statusResp);
                if (percentage === 100) {
                    $.ajax({
                        url: Granite.HTTP.externalize(previewUrl),
                        cache: false,
                        type: "GET"
                    }).done(function(resp) {
                        var urlArr = JSON.parse(resp).urls;
                        if (urlArr.length >= 2 && $(ELEMENT_STEP_LIST_PANEL).length === 0) {
                            $(ELEMENT_SELECT_THUMB_TAB).empty();
                            renderStepList(urlArr);
                        }
                    });
                    clearInterval(refreshIntervalId);
                } else if (percentage >= 0 && percentage < 100) {
                    if (percentage < 5) {
                        $("coral-progress").attr("value", 5);
                    } else {
                        $("coral-progress").attr("value", percentage);
                    }
                } else {
                    jobStatusFailHandler();
                    clearInterval(refreshIntervalId);
                }
            }).fail(function() {
                jobStatusFailHandler();
                clearInterval(refreshIntervalId);
            });
        }, 2000);
    }

    function jobStatusFailHandler() {
        $(ELEMENT_SELECT_THUMB_TAB).empty();
        var alert = new Coral.Alert().set({
            variant: "error",
            header: {
                innerHTML: Granite.I18n.get("ERROR")
            },
            content: {
                innerHTML: Granite.I18n.get("Failed to check job status of generating thumbnails.")
            }
        });
        $(ELEMENT_SELECT_THUMB_TAB).append(alert);
    }

    function saveSelectedThumbnail() {
        var step = $(ELEMENT_STEP_LIST)[0];
        if (step === undefined || step.selectedItem === undefined) {
            return;
        }
        var selectThumbIndex = $(step).find("coral-step").index(step.selectedItem);
        var replaceImgUrl = $($(".select-frame-tab coral-panelstack coral-panel")[selectThumbIndex])
            .find("img").attr("src");

        var assetPath = $(ELEMENT_CHANGE_THUMB_DIALOG).data("assetpath");
        var data = {};

        data.url = replaceImgUrl;

        $.ajax({
            url: Granite.HTTP.externalize(assetPath + ".videothumbnail?:operation=replaceThumbnail"),
            data: data,
            cache: false,
            type: "POST"
        }).done(function(resp) {
            doneSave();
        }).fail(function(resp) {
            doneSave();
        });
    }

    function renderStepList(urlArr) {
        var stepList = new Coral.StepList().set({
            id: "select-frame-step-list",
            target: ELEMENT_STEP_LIST_PANEL,
            interaction: "on",
            size: "s"
        });
        var stepPanel = new Coral.PanelStack().set({
            id: "select-frame-step-list-panelstack"
        });

        var length = urlArr.length;
        for (var i = 0; i < length; i++) {
            var panel = new Coral.Panel();
            $(panel).append("<img src=\"" + urlArr[i].url + "\" width=\"520px\" >");
            stepPanel.items.add(panel);
            stepList.items.add({
                label: { innerHTML: _formatTime(urlArr[i].time) }
            });
        }

        $(ELEMENT_SELECT_THUMB_TAB).append(stepPanel);
        $(ELEMENT_SELECT_THUMB_TAB).append(stepList);
    }

    function _formatTime(time) {
        var hour = Math.floor(time / 3600);
        var minute = Math.floor(time / 60) - hour * 60;
        var second = time % 60;
        var formatStr = "";
        if (hour > 0) {
            formatStr += hour + ":";
        }
        if (minute < 10) {
            formatStr += "0" + minute + ":";
        } else {
            formatStr += minute + ":";
        }
        if (second < 10) {
            formatStr += "0" + second;
        } else {
            formatStr += second;
        }
        return formatStr;
    }

    /**
     * 2.2. DMHybrid: Manual upload thumbnail
     */
    $(document).on("change", "coral-fileupload", function(e) {
        var fileName = _getFileName(e.target);
        if (fileName && fileName.match(/\.(jpg|jpeg|png|gif)/i)) {
            if (e.target.uploadQueue && window.FileReader) {
                var file = e.target.uploadQueue[0]._originalFile;
                var reader = new FileReader();
                reader.onload = function(e) {
                    setThumbnail(fileName, e.target.result);
                };
                reader.readAsDataURL(file);
            } else {
                setThumbnail(fileName, null);
            }
        }
    });

    function saveUploadThumbnail() {
        var HTML5enabled = window.FormData !== undefined;

        // fix weird IE11 issue that sending multipart forma data cause steam ended unexpectedly
        $($(ELEMENT_CHANGE_THUMB_FORM)[0]).append($('<input type="hidden" name="_dontcare" value="_dontcare">'));

        var data;
        var processData = true;
        var contentType = true;
        if (HTML5enabled) {
            data = new FormData($(ELEMENT_CHANGE_THUMB_FORM)[0]);
            processData = false;
            contentType = false;
        } else {
            data = $(ELEMENT_CHANGE_THUMB_FORM).serialize();
            processData = true;
            contentType = $(ELEMENT_CHANGE_THUMB_FORM)[0].enctype;
        }

        $.ajax({
            type: $(ELEMENT_CHANGE_THUMB_FORM).attr("method"),
            url: Granite.HTTP.externalize($(ELEMENT_CHANGE_THUMB_FORM).attr("action")),
            data: data,
            cache: false,
            processData: processData,
            contentType: contentType
        }).done(function(html) {
            doneSave();
        }).fail(function(xhr, error, errorThrown) {
            doneSave();
        });
    }

    function _getFileName(input) {
        var name;
        if (input.files) {
            name = input.files[0] && input.files[0].name;
        } else {
            name = input.value.split(/[\/\\]/).slice(-1)[0];// eslint-disable-line no-useless-escape
        }
        return name;
    }

    /***************************************************************************
     *  3. DMS7 part
     **************************************************************************/

    /**
     * 3.1 DMS7: select play frame as thumbnail
     */
    function savePlayFrameThumbnail() {
        var assetPath = $(ELEMENT_CHANGE_THUMB_DIALOG).data("assetpath");
        showWait();
        // clean up any select thumbnail
        var emptyThumbData = {
            thumbAsset: "empty"
        };
        $.ajax({
            url: Granite.HTTP.externalize(assetPath + ".setS7VideoThumbnail"),
            data: emptyThumbData,
            cache: false,
            type: "POST"
        }).always(function(resp) {
            // Remove "manualThumbnail" property from video asset's metadata
            changeManualThumbnail(assetPath);

            var video = $("div#dm-change-thumbnail-video video");
            if (!video) {
                return;
            }

            var playTime = video[0].currentTime;
            var data = {};
            data.playTime = playTime;

            $.ajax({
                url: Granite.HTTP.externalize(assetPath + ".reprocessS7VideoThumbnail"),
                data: data,
                cache: false,
                type: "POST"
            }).done(function(resp) {
                var getStatusData = {};
                getStatusData.jobName = resp.jobName;

                var getStatusInterval = setInterval(function() {
                    $.ajax({
                        url: Granite.HTTP.externalize(assetPath + ".getS7JobStatus"),
                        data: getStatusData,
                        cache: false,
                        type: "POST"
                    }).done(function(resp) {
                        if (resp && resp.jobStatus && resp.jobStatus === "Done") {
                            clearInterval(getStatusInterval);
                            doneSave();
                        }
                    });
                }, 3000);
            }).fail(function(resp) {
                doneSave();
            });
        });
    }

    /**
     * 3.2 DMS7: choose asset as thumbnail
     */
    $(document).on("click", ELEMENT_THUMB_PICKER_BTN, function() {
        $(document).trigger({
            "type": EVENT_LAUNCH_PICKER,
            "mimeType": [ "image" ],
            "mode": "single",
            "root": "/content/dam",
            "callback": updateChosenThumbnail
        });
    });

    function updateChosenThumbnail(json) {
        if (json && json[0]) {
            var thumbnailPath = json[0].path;
            var metadataPath = Granite.HTTP.externalize(thumbnailPath + ".children.3.json");
            $.get(metadataPath).done(function(resp) {
                if (_isDMS7Image(resp[0])) {
                    var url = Granite.HTTP.externalize(thumbnailPath + THUMBNAIL_RENDITION);
                    var thumbnailS7ID = resp[0]["metadata"][REMOTE_S7ID_KEY];
                    $(ELEMENT_THUMB_PREVIEW).data("scene7ID", thumbnailS7ID);
                    $(ELEMENT_THUMB_PREVIEW).data("path", thumbnailPath);

                    setThumbnail("", url);
                } else {
                    _showAssetPickerError([ thumbnailPath ], "invalid");
                }
            });
        }
    }

    function saveChosenThumbnail() {
        var assetPath = $(ELEMENT_CHANGE_THUMB_DIALOG).data("assetpath");

        showWait();

        var data = {};
        data.thumbAsset = $(ELEMENT_THUMB_PREVIEW).data("scene7ID");

        $.ajax({
            url: Granite.HTTP.externalize(assetPath + ".setS7VideoThumbnail"),
            data: data,
            cache: false,
            type: "POST"
        }).always(function(resp) {
            // Add selected asset's path in the "manualThumbnail"
            // property of the video asset's metadata
            changeManualThumbnail(assetPath, $(ELEMENT_THUMB_PREVIEW).data("path"));
            doneSave();
        });
    }

    function _showAssetPickerError() {
        var errorMsg = Granite.I18n.get("The selected asset is not Dynamic Media asset and could not be used.");
        var alert = new Coral.Alert().set({
            variant: "error",
            header: {
                innerHTML: "ERROR"
            },
            content: {
                innerHTML: errorMsg
            }
        }).show();

        $(ELEMENT_THUMB_PREVIEW).empty();
        $(ELEMENT_THUMB_PREVIEW).append(alert);
    }

    function _isDMS7Image(info) {
        var s7damType = info[S7DAMTYPE_KEY];
        if (s7damType && s7damType.toLowerCase() === "image") { // check s7damType as image
            if (info["metadata"][REMOTE_S7FILE_KEY]) {
                return true;
            }
        }
        return false;
    }

    function changeManualThumbnail(videoAssetPath, thumbnailAssetPath) {
        if (typeof (videoAssetPath) === "undefined" || videoAssetPath === "") {
            return;
        }

        var data = {};
        if (typeof (thumbnailAssetPath) === "undefined" || thumbnailAssetPath === "") {
            // Delete thumbnail node from asset
            data[":operation"] = "delete";
        } else {
            // Store thumbnail asset inside the new node
            data[MANUAL_THUMBNAIL_PROPERTY] = thumbnailAssetPath;
        }

        $.ajax({
            data: data,
            url: videoAssetPath + MANUAL_THUMBNAIL_NODE_PATH,
            type: "POST"
        });
    }
})(window, document, Granite, Granite.$);

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
(function(window, document, Granite, $) {
    "use strict";

    // events
    var EVENT_LAUNCH_PICKER = "dm-launch-picker";
    var EVENT_PICK_ASSET = "dm-asset-picked";

    // DOM
    var ASSET_PICKER_DIALOG = "#dm-assetpicker";
    var ASSET_PICKER_CONTENT = ".asset-picker-asset";
    var ASSET_PICKER_WAIT = ".asset-picker-wait";

    // Default
    var DEFAULT_MODE = "single";

    // key
    var METADATA_KEY = "metadata";
    var TIFF_HEIGHT_KEY = "tiff:ImageLength";
    var TIFF_WIDTH_KEY = "tiff:ImageWidth";
    var S7DAMTYPE_KEY = "dam:s7damType";
    var PTIFF_KEY = "cqdam.pyramid.tiff";
    var RENDITION_KEY = "renditions";
    var TITLE_KEY = "dc:title";
    var URI_KEY = "uri";
    var REMOTE_S7FILE_KEY = "dam:scene7File";
    var REMOTE_S7FILEAVS_KEY = "dam:scene7FileAvs";

    // URL
    var ASSET_PICKER_URL = Granite.HTTP.externalize("/aem/assetpicker.html");
    var METADATA_SUFFIX = ".children.3.json";

    // List of supported mimeType and criteria for valid asset
    var SUPPORTED_S7DAMTYPE = {
        "image": { "requiredPtiff": true },
        "video": { "requiredPtiff": false },
        "videoavs": { "requiredPtiff": false },
        "imageset": { "requiredPtiff": false },
        "spinset": { "requiredPtiff": false }
    };

    // mimeType filter can be applied to URL
    var MIME_TYPE_FILTER = {
        mixedmediaset: "*MixedMediaSet",
        spinset: "*SpinSet",
        imageset: "*ImageSet",
        video: "video*",
        image: "image*"
    };

    // Picker private variables
    var currentPicker = null;
    var callbackFn = null;
    var beforeCallbackFn = null;
    var mimeTypeList = [];

    $(document).one("foundation-contentloaded", function() {
        $(ASSET_PICKER_DIALOG).hide();
        $(ASSET_PICKER_DIALOG).removeClass("hide");
    });

    $(document).on(EVENT_LAUNCH_PICKER, function(e) {
        var mimeTypeFilter = buildMimeTypeFilter(e.mimeType);
        var mode = e.mode || DEFAULT_MODE;
        var root = e.root;
        if (/\/$/.test(root)) { // remove trailing slash due to CQ-4232539
            root = root.substring(0, root.length - 1);
        }
        var url = ASSET_PICKER_URL + root + "?mode=" + mode + mimeTypeFilter + "&requiredproperty=dam:s7damType&requiredproperty=dam:assetState=processed";
        launchAssetPicker(url, e.callback, e.beforeCallback, e.mimeType);
    });

    /**
     * @param {String} url URL for asset picker
     * @param {Function} callback callback function
     * @param {Function} beforeCallback callback function to be called before response complete (optional)
     * @param {Array} mimeType mime type list
     */
    function launchAssetPicker(url, callback, beforeCallback, mimeType) {
        callbackFn = callback || function() {
        };
        beforeCallbackFn = beforeCallback || function() {
        };
        mimeTypeList = mimeType;
        $(ASSET_PICKER_WAIT).show();
        $(ASSET_PICKER_DIALOG).show();
        $("nav.coral-Wizard-nav").append('<div class="navblur"></div>');
        if ($(ASSET_PICKER_CONTENT).find("iframe").length == 0) {
            var $iframe = $('<iframe id="assetPickerFrame" frameBorder="0" seamless="seamless" src="' + url + '"></iframe>').appendTo($(ASSET_PICKER_CONTENT));
            $iframe.on("load", function() {
                $(ASSET_PICKER_WAIT).hide();
            });
        }
    }

    /**
     * @private
     * close asset picker
     */
    function closePicker() {
        $(ASSET_PICKER_DIALOG).hide();
        $(ASSET_PICKER_CONTENT).find("iframe").remove();
        $("div.navblur").remove();
    }

    // Register asset picker router
    window.addEventListener("message", routeAssetPicker, false);

    /**
     * Route the asset picker to callback and beforeCallback depending on the original caller
     * @param {Event} event object from the picker
     *
     */
    function routeAssetPicker(event) {
        var srcIFrame = document.getElementById("assetPickerFrame");
        // Don't accept messages from other sources!
        // Twitter, for instances, broadcasts __ready__, which throws when trying to JSON.parse it.
        if (!srcIFrame || event.origin !== location.origin || srcIFrame.contentWindow !== event.source) {
            return;
        }
        // try..catch to workaround initial event from picker when it's first called
        try {
            var fromDam = JSON.parse(event.data);
        } catch (e) {
            return;
        }
        if (fromDam.config) {
            var configFromDam = fromDam.config;
            if (configFromDam.action === "close" || configFromDam.action === "done") {
                closePicker();
                // before data processing done, we call beforeCallback first
                if (configFromDam.action === "done") {
                    beforeCallbackFn();
                }
            }
        }

        if (fromDam.data) {
            var assetCount = fromDam.data.length;


            var assets = [];
            for (var i = 0; i < assetCount; i++) {
                var url = decodeURIComponent(fromDam.data[i].path);
                var metadataPath = Granite.HTTP.externalize(url + METADATA_SUFFIX);
                // get extra metadata height and width for preview
                $.get(metadataPath).done(function(resp) {
                    if (checkValidType(resp[0])) {
                        var height = resp[0][METADATA_KEY][TIFF_HEIGHT_KEY] || 0;
                        var width = resp[0][METADATA_KEY][TIFF_WIDTH_KEY] || 0;
                        var path = resp[0][URI_KEY].replace("/jcr:content", "");
                        var assetId = resp[0][METADATA_KEY][REMOTE_S7FILE_KEY] || path;
                        // For videoAVS case, we use dam:scene7FileAvs as asset ID instead
                        if (resp[0][METADATA_KEY][REMOTE_S7FILEAVS_KEY]) {
                            assetId = resp[0][METADATA_KEY][REMOTE_S7FILEAVS_KEY];
                        }
                        var title = getTitle(path, resp[0][METADATA_KEY][TITLE_KEY]);
                        var asset = buildAsset(path,
                            assetId,
                            title,
                            width,
                            height,
                            checkDMAsset(resp[0]));
                        assets.push(asset);
                    } else {
                        // unsupported asset will be included as  DM = false by default
                        var height = 0;
                        var width = 0;
                        var path = resp[0][URI_KEY].replace("/jcr:content", "");
                        var assetId = path;
                        var title = "";
                        var asset = buildAsset(path,
                            assetId,
                            title,
                            width,
                            height,
                            false);
                        assets.push(asset);
                    }
                    if (assets.length == assetCount) {
                        // do the callback when we fetch all asset info
                        callbackFn(assets);
                    }
                });
            }
        }
    }

    /**
     * Check whether the asset is supported DM asset or not.
     * @param info - asset info object returning from .children.3.json servlet
     * @return true if the asset is a DM asset
     */
    function checkDMAsset(info) {
        var isSupportedDMAsset = false;
        var s7damType = info[S7DAMTYPE_KEY];
        if (s7damType) { // check that there is s7damType
            s7damType = s7damType.toLowerCase(); // convert to case-insensitve
            if (SUPPORTED_S7DAMTYPE[s7damType]) { // check that s7damType is matched at least one of supported type
                if (SUPPORTED_S7DAMTYPE[s7damType]["requiredPtiff"]) { // some asset will need to have ptiff
                    if (info[RENDITION_KEY][PTIFF_KEY] || info[METADATA_KEY][REMOTE_S7FILE_KEY]) {
                        // check that the asset has ptiff or remote scene7 reference for DMScene7 case
                        isSupportedDMAsset = true;
                    }
                } else {
                    isSupportedDMAsset = true;
                }
            }
        }
        return isSupportedDMAsset;
    }

    /**
     * Check to include only asset matching mimetype in the list
     */
    function checkValidType(info) {
        var s7damType = info[S7DAMTYPE_KEY];
        if (s7damType) {
            // override videoavs and videoset as video
            if (s7damType.toLowerCase() == "videoavs" || s7damType.toLowerCase() == "videoset") {
                s7damType = "video";
            }
            for (var i = 0; i < mimeTypeList.length; i++) {
                if (s7damType.toLowerCase() == mimeTypeList[i]) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Build asset item response
     * @param {String} path asset path
     * @param {String} assetId asset ID (dam:scene7File for remote, jcr path for local)
     * @param {String} title asset title
     * @param {Number} width
     * @param {Number} height
     * @param {Boolean} valid validity of asset
     * @retunr {Object} JSON for asset item
     *
     */
    function buildAsset(path, assetId, title, width, height, valid) {
        return {
            "path": path,
            "assetId": assetId,
            "title": title,
            "width": width,
            "height": height,
            "valid": valid
        };
    }

    /**
     * Get title
     * @param {String} path asset path
     * @param {String} title asset title
     * @return {String} if title exists, return title;
     *        otherwise, parse the path for last portion as a title.
     */
    function getTitle(path, title) {
        if (title) {
            return title;
        } else {
            return path.substring(path.lastIndexOf("/") + 1);
        }
    }

    /**
     * Build mimeType filter for asset picker based on editor mimeType
     * @param {String} mimeType editor mime type
     * @return {String} filter for asset picker
     */
    function buildMimeTypeFilter(mimeType) {
        var filter = "";
        if (mimeType) {
            for (var i = 0; i < mimeType.length; i++) {
                var key = mimeType[i];
                if (MIME_TYPE_FILTER[key]) {
                    filter += "&mimetype=" + MIME_TYPE_FILTER[key];
                }
            }
        }
        return filter;
    }
})(window, document, Granite, Granite.$);

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

(function(window, document, Granite, $) {
    "use strict";

    $(document).one("foundation-contentloaded", function(e) {
        var divVideo = $("div#dm-change-thumbnail-video");
        var img = $("img#video-playback-poster-img");
        var viewer = null;

        var playPauseHandler = function(icon) {
            var videoPlayer = divVideo.data("videoplayer");
            if (!videoPlayer) {
                return;
            }

            if (icon[0] && "playCircle" === icon[0].icon) {
                if (videoPlayer.getCapabilityState().hasCapability(s7viewers.s7sdk.VideoCapabilityState.REPLAY)) {
                    videoPlayer.seek(0);
                }
                videoPlayer.play();
            } else {
                videoPlayer.pause();
            }
        };

        var playableState = function(e, bPlay) {
            e.preventDefault();

            var icon = divVideo.find("coral-icon");
            var iconParent = icon.parent();

            var pauseIcon = new Coral.Icon().set({
                icon: "pauseCircle",
                size: "XXL",
                class: "thumbnail-video-play"
            });

            var playIcon = new Coral.Icon().set({
                icon: "playCircle",
                size: "XXL",
                class: "thumbnail-video-play"
            });

            icon.remove();
            if (bPlay) {
                // show play icon and reduce opacity of video player
                iconParent.append(playIcon);
            } else {
                // show pause icon and increase opacity of video player
                iconParent.append(pauseIcon);
            }
        };

        // Define an event handler function to update the PlayPauseButton object when the VideoPlayer changes state
        function onNotifyVideoState(event) {
            var cap = event.s7event.state;
            if (cap.hasCapability(s7viewers.s7sdk.VideoCapabilityState.PAUSE)) {
                playableState(event, false);
            } else if (cap.hasCapability(s7viewers.s7sdk.VideoCapabilityState.PLAY) ||
                cap.hasCapability(s7viewers.s7sdk.VideoCapabilityState.REPLAY) ||
                cap.hasCapability(s7viewers.s7sdk.VideoCapabilityState.STOP)) {
                playableState(event, true);
            }
        }

        // initialize video viewer and register event listeners to buttons if not already setup
        var initCompleteHandler = function(event) {
            if (viewer) {
                var videoPlayer = viewer.getComponent("videoPlayer");

                // store videoPlayer as data of the container div,
                // for subsequent clicks on the play/pause button
                divVideo.data("videoplayer", videoPlayer);

                // Add an event listener for VideoPlayer capability change events
                videoPlayer.addEventListener(s7viewers.s7sdk.event.CapabilityStateEvent.NOTF_VIDEO_CAPABILITY_STATE,
                    onNotifyVideoState, false);
            }
        };
        // Define BasicVideoViewer only when s7viewers object is defined
        if (typeof (s7viewers) !== "undefined") {
        // As change thumbnail is only applicable for AVS videos
        // aemmode parameter is passed as 0, which stands for remote asset.
            var s7BasicVideoViewer = new s7viewers.BasicVideoViewer({
                containerId: "dm-change-thumbnail-video",
                params: {
                    "MediaSet.asset": divVideo.attr("data-video-local-path"),
                    "posterimage": divVideo.attr("data-video-local-path"),
                    "videoserverurl": divVideo.attr("data-video-preview-url"),
                    "serverUrl": Granite.HTTP.externalize("/is/image/"),
                    "contentUrl": Granite.HTTP.externalize("/is/content"),
                    "responsive": "constrain",
                    "singleclick": "none",
                    "aemmode": "0",
                    "autoplay": "1"
                },
                handlers: {
                    initComplete: initCompleteHandler
                }

            });

            $("div.video-playback-icon").on("click", function(clickEvent) {
                if (!viewer) {
                    img.remove();
                    viewer = s7BasicVideoViewer.init();
                } else {
                    playPauseHandler($(clickEvent.target));
                }
            });
        }
    });
})(window, document, Granite, Granite.$);

