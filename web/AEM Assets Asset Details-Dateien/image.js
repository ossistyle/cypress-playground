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
(function( $ ){
    /*
     Image Preview Component based on Scene7 HTML5 SDK
     To use this component, you must include the HTML5 SDK in your page.
     */
    $.fn.s7preview = function ( options ){
        var settings = { button: false };
        return this.each( function() {
            var $this = $(this);
            var mimeType = $this.data("assetMimetype");
            if (mimeType && (mimeType.startsWith("video/"))) {
                //https://jira.corp.adobe.com/browse/CQ-4217028
                //when we changed to info component, we also changed
                //where we load the viewer - so the old DIV is present and blocks UI
                $('.asset-detail-view').hide();
            } else {
                $('.dam-zoom-buttons').hide();
            }
            //enlarge viewing area
            $('.asset-detail').addClass('dm-asset-detail');
            if( options === 'destroy'){
                delete $this.s7param; //remove s7param ref so garbage collector will kick in
                delete $this.viewer;//remove viewer ref so garbage collector will kick in
                $this.html('');
            }
            else if ( options === 'hide' ) {
                $this.hide();
            }
            else if ( options === 'show' ) {
                $this.show();
            }
            else {
                if( options && options.asset ){
                    delete $this.s7param;
                    delete $this.viewer;
                    $this.html('');
                    //swap asset
                    $this.data('s7asset', options.asset);
                }
                var asset = $this.data('s7asset');
                var s7host = $this.data('s7host');
                var s7type = $this.data('s7type');
                var assetJCRPath = $this.data("assetJcrpath");
                var s7preset = $this.data('s7preset');
                var noIFrame = ($this.data('ok-iframe') ? false : true); // check if the component allows iframe
                var commercePlugin = $this.data('commerce-plugin');
                var ts = new Date().getTime();
                if( asset && s7host && s7type ){
                    //check to make sure that s7asset and s7host are defined
                    if( options ){
                        $.extend( settings, $this.data());
                        $.extend( settings, options );
                    }
                    $('.foundation-content-path').data('s7type', s7type.toUpperCase());
                    var containerId = $this.attr('id');
                    var instanceId = 's7viewer';

                    var constType = s7type.toUpperCase();
                    if (mimeType === "video/mp4" && s7type === "Asset"){
                        constType = "VIDEO";
                    }
                    var viewerConstructor = getViewerConstructor(constType);

                    var videoServerUrl = $('.foundation-content-path').data('s7-preview-videoserverurl');
                    if (typeof videoServerUrl == 'undefined') {
                        videoServerUrl = $('#image-set-preview').data("s7-preview-videoserverurl");
                    }
                    if (typeof videoServerUrl == 'undefined'){
                        videoServerUrl = $(".dm-setup-info").data("previewVideoServer");
                    }
                    //CQ-4212136 - in DMS7 mode the constructor is null - this is temporary HACK until
                    //we have a better solution to support this
                    if (viewerConstructor === null){
                        $('.asset-detail-views-image').show();
                        return;
                    }

                    //For 6.0FP to fix IE9 issue, we load video viewer in iframe instead of embed code
                    //bypass iFrame when noIFrame flag is set
                    if (noIFrame || viewerConstructor !== 'VideoViewer') {
                        var s7params = {
                            "containerId" : containerId,
                            "params" : {
                                "serverurl" : Granite.HTTP.externalize("/is/image/"),
                                "contenturl" : Granite.HTTP.externalize("/"),
                                "asset" : asset +'?ts='+ts + '&cache=off'
                            }
                        };
                        if (viewerConstructor === 'InteractiveVideoViewer') {
                            s7params.params['contenturl'] = Granite.HTTP.externalize("/is/content");
                        }
                        if (viewerConstructor === 'DimensionalViewer') {
                            s7params.params['modelurl'] = $('.dm-setup-info').data("assetJcrpath") ? $('.dm-setup-info').data("assetJcrpath") : Granite.HTTP.externalize(asset);
                            s7params.params['asset'] = null;
                        }                         
                        //check for asset not start with / as DMS7 case to use ID rendering
                        if (asset.indexOf('/') !== 0) {
                            s7params.params['aemmode'] = '0';
                        }
                        //non-AVS video - we do native playback only
                        if (s7type.toUpperCase() === 'VIDEO' || s7type.toUpperCase() === 'VIDEO_360' || s7type.toUpperCase() === 'VIDEOAVS' 
                            || s7type.toUpperCase() === 'MIXEDMEDIASET' || mimeType === "video/mp4") {
                            s7params.params['playback'] = 'progressive';
                            s7params.params['progressivebitrate'] = '20000';
                        }
                        if (viewerConstructor === 'VideoViewer' || viewerConstructor === 'MixedMediaViewer'
                            || viewerConstructor === 'InteractiveVideoViewer') {
                            //only add videoserverurl to video or mixed media viewer
                            s7params.params['videoserverurl'] = settings['videoserverurl'] || videoServerUrl;
                        }
                        if (viewerConstructor === 'VideoViewer') {
                            //poster image to use full asset path - Remove this when the viewer supports deriving poster image from asset path
                            s7params.params['posterimage'] = asset + '?ts='+ts + '&cache=off';
                        }
                        //for video preview, we want to hide all social features and must be non-DMS7
                        if (viewerConstructor === 'VideoViewer' && asset.indexOf('/') == 0) {
                            //from 6.4 forward - preset is now in conf - old path /etc/dam/presets/viewer/Video
                            s7params.params['config'] = '/conf/global/settings/dam/dm/presets/viewer/Video';
                        }
                        if (s7preset) {
                            s7params.params['config'] = s7preset + '%3Fcache%3Doff'; //pass cache=off to beat IS cache for req=userdata
                        }
                        if(options && options.style) {
                            s7params.params['style'] = options.style;
                        }
                        if(options && options.fixinputmarker) {
                            s7params.params['fixinputmarker'] = options.fixinputmarker;
                        }
                        if(options && options.interactivedata) {
                            s7params.params['interactivedata'] = options.interactivedata;
                        }
                        if(options && options.preview) {
                            s7params.params['preview'] = options.preview;
                        }
                        //for carousel without commerce plugin - use ootb preview
                        if(viewerConstructor == 'CarouselViewer' && commercePlugin == null) {
                            s7params.params['preview'] = 1;
                        }
                        if ( typeof s7viewers[viewerConstructor] !== 'undefined' ) {
                            $this.s7viewer = new s7viewers[viewerConstructor](s7params);
                            if(viewerConstructor == 'CarouselViewer') {
                                if (commercePlugin != null) {
                                    $this.s7viewer.setHandlers(commercePlugin);
                                }
                            }

                            $this.data('s7viewer', $this.s7viewer);
                            if (typeof s7sdk_i18n != 'undefined')  {
                                $this.s7viewer.setLocalizedTexts(getLocalizedText());
                            }
                            $this.s7viewer.init();
                        }
                    }
                    else {
                        setTimeout(function(){
                            var viewerUrl =  Granite.HTTP.externalize('/etc/dam/viewers/s7viewers/html5/VideoViewer.html') + '?'
                                + 'asset=' + asset + '&videoserverurl=' + videoServerUrl
                                + '&serverUrl=' + Granite.HTTP.externalize("/is/image/")
                                + '&contentUrl=' + Granite.HTTP.externalize("/")
                                + '&config=/etc/dam/presets/viewer/Video'
                                + '&posterimage=' + asset;
                            if (s7type.toUpperCase() === 'VIDEO' || s7type.toUpperCase() === 'VIDEO_360') {
                                viewerUrl += '&playback=native';
                                viewerUrl += '&progressivebitrate=20000';
                            }
                            var iframH = $this.height(),
                                iframW = $this.width();
                            var ifram = '<iframe src=\"' + viewerUrl + '\" frameborder="0" allowfullscreen width="'
                                + iframW + '" height="' + iframH + '" style="max-width:100%; max-height:100%"></iframe>';
                            $this.html(ifram);
                        }, 200);
                    }

                }
            }
        });


        function getViewerConstructor(assetType){

            var viewerConstructorMap ={
                'IMAGE' : 'BasicZoomViewer',
                'IMAGESET' : 'ZoomViewer',
                'SPINSET' : 'SpinViewer',
                'SPINSET2D' : 'SpinViewer',
                'ECATALOG' : 'eCatalogViewer',
                'VIDEO' : 'VideoViewer',
                'VIDEOAVS' : 'VideoViewer',
                'MIXEDMEDIASET' : 'MixedMediaViewer',
                'FLYOUTZOOM' : 'FlyoutViewer',
                'INTERACTIVEIMAGE': 'InteractiveImage',
                'INTERACTIVEVIDEO': 'InteractiveVideoViewer',
                'CAROUSELSET' : 'CarouselViewer',
                'PANORAMICIMAGE': 'PanoramicViewer',
				'VERTICAL_ZOOM': 'ZoomVerticalViewer',
				'VIDEO_360': 'Video360Viewer',
                'SMART_CROP_VIDEO': 'SmartCropVideoViewer',
                'THREED': 'DimensionalViewer'
            };
            var viewerConstructor = null;
            if ( viewerConstructorMap[assetType] ) {
                viewerConstructor = viewerConstructorMap[assetType];
            }
            return viewerConstructor;

        }


        /**
         * Get localized text for viewer from s7sdk_i18n.localizedText
         * @return JSON for localized text
         */
        function getLocalizedText() {
            var localizedText = {};
            localizedText[Granite.I18n.getLocale()] = formatLocalizedText(s7sdk_i18n.localizedText);
            localizedText['defaultLocale'] = Granite.I18n.getLocale();
            return localizedText;
        }

        /**
         * Format localized text into a correct viewer format
         * @param localizedText localized text parsed from s7sdk
         * @return formatted localized text with correct key for viewer
         */
        function formatLocalizedText(localizedText) {
            var formatTexts = {};
            for (var compKey in localizedText) {
                var compObj = localizedText[compKey];
                for (var symbolKey in compObj) {
                    var modKey = compKey + '.' + symbolKey;
                    var symbolVal = compObj[symbolKey];
                    formatTexts[modKey] = symbolVal;
                }
            }
            return formatTexts;
        }
    }

    /*
     * Rendition Preview
     */
    $.fn.renditionPreview = function ( options ){

        var settings = { width: 0,
            height: 0 };

        return this.each( function() {
            var $this = $(this);
            if (options){
                if (options === 'destroy'){
                    $this.html('');
                }
                else if (options.s7imageProductionPath) {
                    //Store Scene7 base image path to be used with dynamic rendition
                    $this.data('s7imagePreviewPath', '/is/image/');
                    $this.data('s7imageProductionPath', options.s7imageProductionPath);
                    $this.data('s7publishRootPath', options.s7publishRootPath);
                    $this.data('s7assetId', options.s7assetId);
                }
                else{
                    var imagePreviewPath = '';
                    var imageProductionPath = '';
                    var s7assetId = encodeURIComponent($this.data('s7assetId'));
                    var damAssetPath = $this.data('damasset');
                    var ts = new Date().getTime();//timestamp to fix cache issue
                    var imgSize = '';
                    var isResponsive = '';
                    var fmt = '';
                    var optionsConfig = '';

                    //For absolute image path
                    if (options.asset){
                        //Set preview for non-Scene7 Asset
                        //No production URL need since no copy URL for this case
                        imagePreviewPath = options.asset;
                    }
                    else if (options.config && $this.data('s7imagePreviewPath')){
                        //Set preview image with preset
                        imagePreviewPath = $this.data('s7imagePreviewPath') + s7assetId + '?$' + options.config + '$' + encodeURIComponent(options.extraModifiers) + encodeURIComponent(options.usm) + '%26ts=' + ts;
                        //Set production image with preset for copy URL
                        imageProductionPath = '$$isRootPath$$$$s7assetId$$' + '?$' + options.config + '$' + options.extraModifiers + options.usm;
                        if ( options.height ) {
                            imgSize = '&dynhei=' + options.height + '&dynwid=' + options.width;
                        } else {
                        	if (!options.height && !options.width) {// responsive image
                        		isResponsive = '&isresponsive=true';
                        	}
                        }
                        fmt = '&dyntype=' + options.fmt;
                        optionsConfig = '&optionsConfig=' + options.config;
                    }

                    //Build embed code for responsive image only when there is no size or 0 in size in the preset
                    if (!options.height && !options.width && $this.data('s7imagePreviewPath')) {
                        var servletURL = Granite.HTTP.externalize('/mnt/overlay/dam/gui/content/s7dam/viewerpresets/embedcode.html')
                            + '?asset=$$s7assetId$$'
                            + '?$' + options.config + '$'
                            + '&templatetype=image'
                            + '&viewertype=html5'
                            + '&isr=$$isRootPath$$'
                            + '&publishrootpath=$$s7publishRootPath$$';
                        $.get(servletURL)
                            .always( function(response){
                                $('.damCopyRess').data("message", response);
                            });
                    }


                    if (imagePreviewPath !== ''){
                        $('.damCopyUrl').data("message", imageProductionPath);
                        var contentAPI = $(".foundation-content").adaptTo("foundation-content");
                        //Pass dyn= for passing the correct URL to renditions.html. due to cross domain,
                        //we can't pass the URL directly.
                        contentAPI.go('/mnt/overlay/dam/gui/content/assetdetails/renditions.html'
                            + damAssetPath
                            + '?localview=/jcr:content/renditions/original&dyn='
                            + imagePreviewPath
                            + imgSize
                            + fmt
                            + optionsConfig
                            + isResponsive, false);
                    }
                }
            }
        });
    }

    $(document).one('foundation-contentloaded', function(){
        //Hide setmembers.html page for CarouselSet page
        var s7type = $('#image-set-preview').data('s7type');
        if (s7type == 'CarouselSet') {
            $('#aem-asset-details-views').find('a').each(function(){
                if ($(this).attr('href').indexOf('setmembers.html') >= 0) {
                    $(this).hide();
                }
            });
        }
    });


})( Granite.$ );
