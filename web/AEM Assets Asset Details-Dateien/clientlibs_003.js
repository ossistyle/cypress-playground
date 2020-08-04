/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2013 Adobe Systems Incorporated
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

    /* Commenting out the following lines of code. Seems to be unused code, conflicting with new canvas element.
    $(".foundation-content-current").fipo("tap","click", function(e){
            if($(".foundation-content-current .asset-view canvas").length > 0){
                $(".foundation-content-current .asset-view canvas").remove();
            }
        });
    */
    var initImageDisplayWidth, initImageDisplayHeight;

    //Variables storing current canvas state
    var curCanvasWidth, curCanvasHeight, maxCanvasWidth, maxCanvasHeight, canvasIncrementSize;

    //Variables storing current image state
    var imageLeft = 0, imageTop = 0, imageRight, imageBottom, imageAspectRatio;
    var adjustCanvasOnly; //true: change only canvas dimension, false: change both canvas and image dimension
    var $imgObj, image, zoomParamInitialized;
    var swipeDisabled = false, prevImgObj, nextImgObj, touchStartX, touchStartY;
   
    function initZoomParams() {
        var $assetDetail = $('.asset-detail');
        var spinner = $('<div style="position:relative; top: 50%; left: 50%;" class="spinner large"></div>');
        $assetDetail.overlayMask('show', spinner);

        maxCanvasWidth = $assetDetail.width();
        maxCanvasHeight = $assetDetail.height();

        initImageDisplayWidth = $imgObj.width();
        initImageDisplayHeight = $imgObj.height();
        imageAspectRatio = initImageDisplayHeight / initImageDisplayWidth;
        canvasIncrementSize = 0.5 * initImageDisplayWidth;//Canvas increment size.

        initCommonZoomParams();

        image = new Image();
        image.onload = function() {

            if ($.browser.webkit) {//pre load the image
                var decodeCanvas = document.createElement('canvas');
                var dectodeCtx = decodeCanvas.getContext('2d');
                decodeCanvas.width = image.width;
                decodeCanvas.height = image.height;
                dectodeCtx.drawImage(image, 0, 0);
            }

            if (adjustCanvasOnly == true)
                changeCanvasOnly(true);
            else
                changeBothCanvasAndImage(true);

            var canvasElm = '<canvas class="dam-zoom-canvas-class" id="dam-aasetdetail-zoom-canvas" width="' + curCanvasWidth + '" height="' + curCanvasHeight + '" tabIndex=0 aria-label="'+$imgObj.attr("alt")+'" role="application" aria-roledescription="Pannable image">Not supported</canvas>';
            $imgObj.replaceWith(canvasElm);

            $assetDetail.on('mousedown', '#dam-aasetdetail-zoom-canvas', mouseDownHandler);
            $assetDetail.on('dragstart', '#dam-aasetdetail-zoom-canvas', disableDragStart);

            $('#dam-aasetdetail-zoom-canvas').css('max-width', $imgObj.css('max-width'));
            $('#dam-aasetdetail-zoom-canvas').css('max-height', $imgObj.css('max-height'));

            zoomParamInitialized = true;
            $assetDetail.overlayMask('hide');
            canvasDraw();
        };
        //image.src = $(".foundation-content-path").data("foundationContentPath") + '/jcr%3acontent/renditions/original' + '?' + (new Date().getTime());
        if(CUI.util.isTouch)
            image.src = $(".dam-zoom-buttons").data("touchImagePath") + '?' + (new Date().getTime());
        else
        	image.src = $(".dam-zoom-buttons").data("imagePath") + '?' + (new Date().getTime());
	}

    function touchStartHandler(e) {
 		$('.asset-detail-view').on('touchend', '#dam-aasetdetail-zoom-canvas', touchEndHandler);
 		$('.asset-detail-view').on('touchmove', '#dam-aasetdetail-zoom-canvas', touchMoveHandler);

        var touch = e;
        var touches = e.originalEvent.targetTouches;
        if (touches) {
            touch = touches[0];
        }

		touchStartX = touch.pageX;
		touchStartY = touch.pageY;
        return false;
    }

    function touchEndHandler(e) {
        $('.asset-detail-view').off('touchend', '#dam-aasetdetail-zoom-canvas', touchEndHandler);
 		$('.asset-detail-view').off('touchmove', '#dam-aasetdetail-zoom-canvas', touchMoveHandler);
        return false;
    }

    function touchMoveHandler(e) {
        var touch = e;
        var touches = e.originalEvent.targetTouches;
        if (touches) {
            touch = touches[0];
        }

        var movX = touch.pageX - touchStartX;
        var movY = touch.pageY - touchStartY;

        var newLeft = imageLeft - movX;
        var newRight = imageRight - movX;

        if (newLeft < 0) {
            newLeft = 0;
            newRight = imageRight - (imageLeft - newLeft);
        } else if (newRight > image.width) {
            newRight = image.width;
            newLeft = imageLeft - (imageRight - newRight);
        }

        var newTop = imageTop - movY;
        var newBottom = imageBottom - movY;

        if (newTop < 0) {
            newTop = 0;
            newBottom = imageBottom - (imageTop - newTop);
        } else if (newBottom > image.height) {
            newBottom = image.height;
            newTop = imageTop - (imageBottom - newBottom);
        }

        imageLeft = newLeft;
        imageTop = newTop;
        imageRight = newRight;
        imageBottom = newBottom;

        touchStartX = touch.pageX;
        touchStartY = touch.pageY;

        canvasDraw();
        return false;
    }

	function adjustInitialCanvasDimension() {
		var widthThreshold = 0.8 * maxCanvasWidth;
		var heightThreshold = 0.8 * maxCanvasHeight;
		if (curCanvasWidth > widthThreshold) {
			curCanvasWidth = maxCanvasWidth;
			curCanvasHeight = curCanvasWidth * imageAspectRatio;
			return true;
		} else if (curCanvasHeight > heightThreshold) {
			curCanvasHeight = maxCanvasHeight;
			curCanvasWidth = curCanvasHeight / imageAspectRatio;
			return true;
		}
		return false;
	}

	function changeCanvasOnly(zoomIn) {
		// change type always 0
		if (zoomIn) {
			if(adjustInitialCanvasDimension()){
				adjustCanvasOnly = false;
				changeBothCanvasAndImage(true);
				return;
			}
			var canvasWidth = curCanvasWidth + canvasIncrementSize;
			if (canvasWidth > maxCanvasWidth) {
				canvasWidth = maxCanvasWidth;
				adjustCanvasOnly = false;
			}

			var canvasHeight = canvasWidth * imageAspectRatio;
			if (canvasHeight > maxCanvasHeight) {
				canvasHeight = maxCanvasHeight;
				adjustCanvasOnly = false;

				//Re-calculate canvas width
				canvasWidth = canvasHeight / imageAspectRatio;
			}

			curCanvasWidth = canvasWidth;
			curCanvasHeight = canvasHeight;
		} else {//zoom Out
			var canvasWidth = curCanvasWidth - canvasIncrementSize;
			var canvasHeight = canvasWidth * imageAspectRatio;
			if ((canvasWidth < initImageDisplayWidth) || (canvasHeight < initImageDisplayHeight)) {
				canvasWidth = initImageDisplayWidth;
				canvasHeight = initImageDisplayHeight;
			}

			curCanvasWidth = canvasWidth;
			curCanvasHeight = canvasHeight;
		}
	}

	function changeBothCanvasAndImage(zoomIn){
		if(zoomIn){
			if((curCanvasWidth < maxCanvasWidth) || (curCanvasHeight < maxCanvasHeight))
				modifyCanvasAndImageDimension(true);
			else
				modifyImageDimension(true);
		}else{
			var visibleImageWidth = (imageRight - imageLeft);
			var visibleImageHeight = (imageBottom - imageTop);
			if(visibleImageWidth < image.width && visibleImageHeight < image.height)
				modifyImageDimension(false);
			else
				modifyCanvasAndImageDimension(false);

			if((imageRight - imageLeft) >= image.width && (imageBottom - imageTop) >= image.height){
				//Image is completely visible in the canvas, nothing to zoomout.
				adjustCanvasOnly = true;
			}
		}
	}

	function modifyCanvasAndImageDimension(zoomIn){
		if(zoomIn){
			if (curCanvasWidth < maxCanvasWidth) {//portrait, increse canvas width, decrease visible image height

				var canvasWidth = curCanvasWidth + canvasIncrementSize;
				if (canvasWidth > (0.8 * maxCanvasWidth)) {
					canvasWidth = maxCanvasWidth;
				}

				var newCanvasAspectRatio = curCanvasHeight / canvasWidth;
				var oldVisibleImageWidth = (imageRight - imageLeft);
				imageBottom = imageTop + oldVisibleImageWidth * newCanvasAspectRatio;
				curCanvasWidth = canvasWidth;
			} else if (curCanvasHeight < maxCanvasHeight){//landscape, increse only canvas height

				var canvasHeight = curCanvasHeight + canvasIncrementSize;
				if (canvasHeight > (0.8 * maxCanvasHeight)) {
					canvasHeight = maxCanvasHeight;
				}

				var newCanvasAspectRatio = curCanvasWidth / canvasHeight;
				var oldVisibleImageHeight = (imageBottom - imageTop);
				imageRight = imageLeft + oldVisibleImageHeight * newCanvasAspectRatio;
				curCanvasHeight = canvasHeight;
			}
		}
		else {//zoom Out
			var newCanvasAspectRatio = curCanvasHeight / curCanvasWidth;
			if(newCanvasAspectRatio < imageAspectRatio){
				//decrese width
				var canvasWidth = curCanvasWidth - canvasIncrementSize;
				if(canvasWidth < initImageDisplayWidth)
					canvasWidth = initImageDisplayWidth;
				var canvasHeight = canvasWidth * imageAspectRatio;
				if(canvasHeight > maxCanvasHeight)
					canvasHeight = maxCanvasHeight;

				var newCanvasAspectRatio = canvasHeight / canvasWidth;
				var oldVisibleImageWidth = (imageRight - imageLeft);
				var newTop = imageTop;
				var newBottom = imageTop + oldVisibleImageWidth * newCanvasAspectRatio;
				if(newBottom > image.height){
					newBottom = image.height;
					newTop = newBottom - oldVisibleImageWidth * newCanvasAspectRatio;
					if(newTop < 0)
						newTop = 0;
				}

				curCanvasWidth = canvasWidth;
				curCanvasHeight = canvasHeight;
				imageTop = newTop;
				imageBottom = newBottom;

			}else{
				//decrease height
				var canvasHeight = curCanvasHeight - canvasIncrementSize;
				if(canvasHeight < initImageDisplayHeight)
					canvasHeight = initImageDisplayHeight;
				var canvasWidth = canvasHeight / imageAspectRatio;
				if(canvasWidth > maxCanvasWidth)
					canvasWidth = maxCanvasWidth;

				var newCanvasAspectRatio = canvasWidth / canvasHeight;
				var oldVisibleImageHeight = (imageBottom - imageTop);
				var newLeft = imageLeft;
				var newRight = imageLeft + oldVisibleImageHeight * newCanvasAspectRatio;
				if(newRight > image.width){
					newRight = image.width;
					newLeft = newRight - oldVisibleImageHeight * newCanvasAspectRatio;
					if(newLeft < 0)
						newLeft = 0;
				}

				curCanvasWidth = canvasWidth;
				curCanvasHeight = canvasHeight;
				imageLeft = newLeft;
				imageRight = newRight;
			}
		}
	}

	function modifyImageDimension(zoomIn){
		if(zoomIn){
			var oldVisibleImageWidth = (imageRight - imageLeft);
			var oldVisibleImageHeight = (imageBottom - imageTop);

			var newLeft = imageLeft + oldVisibleImageWidth/4; //try to zoom into centre half of the visible portion
			var newRight = imageRight - oldVisibleImageWidth/4;
			var newVisibleImageWidth = newRight - newLeft;

			var newTop = imageTop + oldVisibleImageHeight/4;
			var newBottom = imageBottom - oldVisibleImageHeight/4;
			var newVisibleImageHeight = newBottom - newTop;

			if((newVisibleImageWidth > 1) && (newVisibleImageHeight > 1)){
				imageLeft = newLeft;
				imageTop = newTop;
				imageRight = newRight;
				imageBottom = newBottom;
			}
		} else { //zoom out
			var oldVisibleImageWidth = (imageRight - imageLeft);
			var oldVisibleImageHeight = (imageBottom - imageTop);

			var newLeft = imageLeft - oldVisibleImageWidth/2;
			var newRight = imageRight + oldVisibleImageWidth/2;
			if(newLeft < 0){
				newLeft = 0;
				newRight = oldVisibleImageWidth * 2;
			} else if (newRight > image.width){
				newRight = image.width;
				newLeft = newRight - oldVisibleImageWidth * 2;
			}
			var newVisibleImageWidth = newRight - newLeft;

			var newTop = imageTop - oldVisibleImageHeight/2;
			var newBottom = imageBottom + oldVisibleImageHeight/2;

			if(newTop < 0){
				newTop = 0;
				newBottom = oldVisibleImageHeight * 2;
			} else if (newBottom > image.height){
				newBottom = image.height;
				newTop = newBottom - oldVisibleImageHeight * 2;
			}
			var newVisibleImageHeight = newBottom - newTop;

			if(newVisibleImageWidth >= image.width){
				newLeft = 0;
				newRight = image.width;
				if(newTop < 0)
					newTop = 0;
				newBottom = newTop + image.width * (curCanvasHeight / curCanvasWidth);
				if(newBottom > image.height)
					newBottom = image.height;
			} else if (newVisibleImageHeight >= image.height){
				newTop = 0;
				newBottom = image.height;
				if(newLeft < 0)
					newLeft = 0;
				newRight = newLeft + image.height * (curCanvasWidth / curCanvasHeight);
				if(newRight > image.width)
					newRight = image.width;
			}

			imageLeft = newLeft;
			imageTop = newTop;
			imageRight = newRight;
			imageBottom = newBottom;
		}
	}

	function initCommonZoomParams() {
		imageLeft = 0;
		imageTop = 0;

		//imageRight = parseInt($imgObj.data("origWidth"));
		//imageBottom = parseInt($imgObj.data("origHeight"));
        if(CUI.util.isTouch){
           	imageRight = parseInt($(".dam-zoom-buttons").data("touchImageWidth"));
			imageBottom = parseInt($(".dam-zoom-buttons").data("touchImageHeight"));
        } else {
        	imageRight = parseInt($(".dam-zoom-buttons").data("imageWidth"));
			imageBottom = parseInt($(".dam-zoom-buttons").data("imageHeight"));
        }

		curCanvasWidth = initImageDisplayWidth;
		curCanvasHeight = initImageDisplayHeight;

		if ((curCanvasWidth < maxCanvasWidth) && (curCanvasHeight < maxCanvasHeight)) {
			adjustCanvasOnly = true; //change only canvas.
		} else
			adjustCanvasOnly = false;
	}

	function canvasDraw() {

		var canvas = document.getElementById("dam-aasetdetail-zoom-canvas");
		var context = canvas.getContext("2d");

		canvas.width = curCanvasWidth;
		canvas.height = curCanvasHeight;

		// Draw on transformed context
		context.drawImage(image, imageLeft, imageTop, (imageRight - imageLeft), (imageBottom - imageTop), 0, 0, curCanvasWidth, curCanvasHeight);

		if(CUI.util.isTouch){
		    if((imageLeft > 0) || (imageTop > 0) || (imageRight < image.width) || (imageBottom < image.height)){
			// Image not completely visible, panning required, disable swipe, start touch tracking for panning
			if (swipeDisabled == false){
			    disableSwipe();
			}
		    }else if (swipeDisabled == true){
			// Image is completely visible, panning not required, enable swipe, stop touch tracking for panning
			enableSwipe();
		    }
		}
	}

	function mouseDownHandler(downEvent) {

		downEvent = downEvent || event;
		var startX = downEvent.pageX;
		var startY = downEvent.pageY;

		document.onmousemove = function(moveEvent) {
			moveEvent = moveEvent || event;
			var movX = moveEvent.pageX - startX;
			var movY = moveEvent.pageY - startY;

			var newLeft = imageLeft - movX;
			var newRight = imageRight - movX;

			if (newLeft < 0) {
				newLeft = 0;
				newRight = imageRight - (imageLeft - newLeft);
			} else if (newRight > image.width) {
				newRight = image.width;
				newLeft = imageLeft - (imageRight - newRight);
			}

			var newTop = imageTop - movY;
			var newBottom = imageBottom - movY;

			if (newTop < 0) {
				newTop = 0;
				newBottom = imageBottom - (imageTop - newTop);
			} else if (newBottom > image.height) {
				newBottom = image.height;
				newTop = imageTop - (imageBottom - newBottom);
			}

			imageLeft = newLeft;
			imageTop = newTop;
			imageRight = newRight;
			imageBottom = newBottom;

			startX = moveEvent.pageX;
			startY = moveEvent.pageY;

			canvasDraw();
		}
		this.onmouseup = function() {
			document.onmousemove = null;
		}
        return false;
	}

	function disableDragStart() {
		return false;
	}

	$(document).on("foundation-contentloaded", function(e) {
        if($("#asset-mainimage").length > 0 && $(".foundation-content-current .asset-annotation canvas").length == 0){
        	zoomParamInitialized = false;
        	$imgObj = $("#asset-mainimage");

           	prevImgObj = $("#asset-mainimage").attr("prev");
			nextImgObj = $("#asset-mainimage").attr("next");
        }

	});

    function disableSwipe(){
        $(document).off('swipe');
        $('.asset-detail-view').on('touchstart', '#dam-aasetdetail-zoom-canvas', touchStartHandler);
        swipeDisabled = true;
    }

    function swipeHandler(event){
        if($(".foundation-content-current .asset-view").length>0)
        {
            if(event.direction === 'right') { // or right, down, left
                var prev =  prevImgObj;
                document.location = prev;
            }
            if(event.direction === 'left') { // or right, down, left
                var next =  nextImgObj;
                document.location = next;
            }
        }
    }

    function enableSwipe(){
        $('.asset-detail-view').off('touchstart', '#dam-aasetdetail-zoom-canvas', touchStartHandler);
        $(document).on('swipe', swipeHandler);
        swipeDisabled = false;
    }

	$(document).on("click", ".dam-asset-zoomIn", function(e) {
		if (zoomParamInitialized == false)
			initZoomParams();
		else {
			if (adjustCanvasOnly == true)
				changeCanvasOnly(true);
			else
				changeBothCanvasAndImage(true);
			canvasDraw();
		}
	});

	$(document).on("click", ".dam-asset-zoomOut", function(e) {
		if (zoomParamInitialized == true){
			if (adjustCanvasOnly == true)
				changeCanvasOnly(false);
			else
				changeBothCanvasAndImage(false);
			canvasDraw();
		}
	});

	$(document).on("click", ".dam-asset-reset", function(e, hardReset) {
		if (zoomParamInitialized == true){
			initCommonZoomParams();
			canvasDraw();

            if(hardReset != undefined){
                zoomParamInitialized = false;
            	$('#dam-aasetdetail-zoom-canvas').replaceWith($imgObj);
            }
		}
	});


    $(document).on('resetCanvas',function(e){
        zoomParamInitialized = false;
        $('#dam-aasetdetail-zoom-canvas').replaceWith($imgObj);
    });

    $(document).on('reInitCanvas',function(e){
        zoomParamInitialized = false;
        $imgObj = $("#asset-mainimage");
    });
    
    	$(document).on('keyup', ".dam-zoom-canvas-class", function(keyEvent){
    		keyBoardHandler(keyEvent);
			keyEvent.preventDefault();
    	});
    function keyBoardHandler(keyEvent) {
    	var movX;
		var movY;
		var changeX = curCanvasWidth/10;
		var changeY = curCanvasHeight/10;
    	if(keyEvent.which ===  37) { // Left
			movX = changeX;
			movY = 0;
		}else if(keyEvent.which ===  38) { // Top
			movX = 0;
			movY = changeY
		} else if(keyEvent.which ===  39) { // Right
			movX = -(changeX);
			movY = 0;
		} else if(keyEvent.which ===  40) { // Down
			movX = 0;
			movY = -(changeY);
		} else{
			return false;
		}

		var newLeft = imageLeft - movX;
		var newRight = imageRight - movX;

		if (newLeft < 0) {
			newLeft = 0;
			newRight = imageRight - (imageLeft - newLeft);
		} else if (newRight > image.width) {
			newRight = image.width;
			newLeft = imageLeft - (imageRight - newRight);
		}

		var newTop = imageTop - movY;
		var newBottom = imageBottom - movY;

		if (newTop < 0) {
			newTop = 0;
			newBottom = imageBottom - (imageTop - newTop);
		} else if (newBottom > image.height) {
			newBottom = image.height;
			newTop = imageTop - (imageBottom - newBottom);
		}

		imageLeft = newLeft;
		imageTop = newTop;
		imageRight = newRight;
		imageBottom = newBottom;

		canvasDraw();
    }

})(document, Granite.$);
