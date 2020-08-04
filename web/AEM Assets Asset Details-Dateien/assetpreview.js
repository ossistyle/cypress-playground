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



    var NAVIGATION_EVENT = "asset-detail-navigation",
        S7DAM_TYPE_KEY = "dam:s7damType",
        CHILD_SERVLET = ".children.json",
        FOUNDATION_CONTENT_REL = ".foundation-content-path";

    //Asset detail navigation
    var prevAssetNavigatorRel = ".asset-navigator-prev",
        nextAssetNavigatorRel = ".asset-navigator-next";

    /**
     * Event handler for contructing viewer upon content reload
     * @param e
     */
    function reloadContent(e) {
        //capture our custom event and issue our code

        var hasDMAssetType = $('.dm-setup-info').data('assetType');


        if (hasDMAssetType){

            $('#image-preview').data('okIframe', $('.dm-setup-info').data('okIframe'));
            $('#image-preview').data('s7asset', $('.dm-setup-info').data('assetPath'));
            $('#image-preview').data('s7host', $('.dm-setup-info').data('imageserver'));
            $('#image-preview').data('s7type', $('.dm-setup-info').data('assetType'));

            //Put published status to be used by viewer preset
            $(".foundation-content-path").data("s7-published-status", $('.dm-setup-info').data('assetIspublished'));

            $(".foundation-content-path").data("s7-preview-videoserverurl", $('.dm-setup-info').data('previewVideoServer'));
            $(".foundation-content-path").data("s7-production-videoserverurl", $('.dm-setup-info').data('publishVideoServer'));

            //preview
            $('#image-preview').s7preview();


            $('.viewer-preset-data').data('asset', $('.dm-setup-info').data('s7asset'));
            $('.viewer-preset-data').data('ispublished', $('.dm-setup-info').data('assetIspublished'));

            //Enable viewer preset link from eye dropdown
            $('a.viewerpreset').removeClass('hidden');

            if($('.dm-setup-info').data('assetType').toLowerCase() === 'video'){
                //remove renditions and subasset for video
                $('a.renditions').parent().addClass('hidden');
                $('a.subassets-popover').parent().addClass('hidden');
            }

            if($('.dm-setup-info').data('assetType').toLowerCase() === 'image') {
                $('#rendition-preview')
                    .renditionPreview({s7imagePreviewPath : $('.dm-setup-info').data('imageserver'),
                        s7imageProductionPath: $('.dm-setup-info').data('productionImageserver'),
                        s7publishRootPath: $('.dm-setup-info').data('publishRootPath'),
                        s7assetId : encodeURI($('.dm-setup-info').data('s7asset'))});
                $('.unified-renditions').attr('s7presetPath', $('.dm-setup-info').data('imagepresetsPath'));
            }

            $(FOUNDATION_CONTENT_REL).on(NAVIGATION_EVENT, navigateTo);

            //keyboard navigation
            $(document).on('keyup',function(e){
                //prev
                if (e.which == 37 && $(prevAssetNavigatorRel).is(":visible")) {
                    $(prevAssetNavigatorRel).trigger('click');
                }
                //next
                else if (e.which == 39 && $(nextAssetNavigatorRel).is(":visible")) {
                    $(nextAssetNavigatorRel).trigger('click');
                }
            });

        }
    }

    /*
      Register event handler on document for content-loaded event to register
      the event handler for asset preview
     */
    $(document).one('foundation-contentloaded', function(e) {
        reloadContent(e);

        var $timeline = $(".cq-common-admin-timeline");
        var timelineEvents = ".cq-common-admin-timeline-events";

        //bb CQ-4226179 show show preview when cycle button is clicked, for timeline hidden viewer container
        //versioncompare.js ln 135 ( ('#image-preview').s7preview) )
        $('coral-cyclebutton').on('coral-cyclebutton:change', function(e){
            if($('#image-preview').s7preview){
                $('#image-preview').s7preview('show');
            }
            var event = e.detail.selection.getAttribute('data-granite-toggleable-control-action');
            if(event!=="navigate"){
                //bb refresh content api
                var contentAPI = $(".foundation-content").adaptTo("foundation-content");
                contentAPI.refresh();
	    }
        });

            // Needed to handle this with a timer because the revert to this version operation will trigger the
        // foundation-contentloaded event for each timeline item.  Rerendering the content once immediately
        // after this event will be undone by the subsequent foundation-contentloaded events.
        // Checks for foundation-contentloaded.foundation event for timeline item event at interval until no more
        // foundation-contentloaded.foundation event during the interval and then reinstantiate the viewer.
        var reloadTimerId = null;
        var counterOld = 0;
        var counter = 0;

        /**
         * Listener for foundation-contentloaded.foundation event from timeline items.
         * Instantiate a timer if necessary, and wait until there are the same events have not been encountered
         * during a period of time before reinstantiating the viewers and clearing the timer.
         */
        function timelineItemContentloaded(evt) {
            if (!reloadTimerId) {
            	var s7viewer = $('#image-preview').data('s7viewer');
            	if(s7viewer && !s7viewer.isDisposed) {
            		if(typeof(s7viewer.dispose) == 'function') {
            			s7viewer.dispose();
            		}
            	}
            	$('#image-preview').s7preview("destroy");
            	$('#image-preview').html('');

                // poll until no new events occur during one interval
                reloadTimerId = setInterval(function() {
                    // reinitialize viewer after no new events for a period
                    if (counter == counterOld) {
                        clearTimeout(reloadTimerId);
                        reloadTimerId = null;
                        counter = counterOld = 0;
                        reloadContent();
                    } else {
                        counterOld = counter;
                    }
                }, 300);
            }

            // increment count per timeline item foundation-contentloaded.foundation event
            counter = counter + 1;
        }

        // register event handler for foundation-contentloaded events from Timeline items to reinitialize viewers
        $(document).on("foundation-contentloaded.foundation", timelineItemContentloaded);
    });

    function navigateTo(e) {
        e.stopImmediatePropagation();
        e.preventDefault();

        var assetPath = e.asset;

		if (assetPath) {
            var url = Granite.HTTP.externalize(assetPath + CHILD_SERVLET);
            $.ajax({
                type: "GET",
                url: url,
                success: function (json) {
                    var s7damType = json[0][S7DAM_TYPE_KEY],
                        basePreview = getBasePreview(s7damType);
                    window.location.href = Granite.HTTP.externalize(basePreview + assetPath);

                }
            });
        }
    }

    function getBasePreview(s7damType) {
		var basePreview = '/assetdetails.html';
        if (typeof s7damType != 'undefined' && s7damType.indexOf('Set') >= 0) {
            basePreview = '/mnt/overlay/dam/gui/content/s7dam/sets/setpreview.html';
        }
        return basePreview;
    }

})(document, Granite.$);
