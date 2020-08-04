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
(function (document, $) {
    "use strict";
    var rel = ".aem-assets-admin-actions-display-image-maps";
    $(document).on("foundation-contentloaded", function(e){
    	var $rel = $(rel);
    	if ($rel.length && $rel.data("mapdata")) {
    		var mapData = $rel.data("mapdata");
    		var imageMapEl = $("[name="+$rel.attr('usemap').substr(1)+"]");
    		var inverseScaleFactorX = 1.0/getScaleFactorX();
    		var inverseScaleFactorY = 1.0/getScaleFactorY();
    		// display image map
            var tmp = {
                regexp: /\[(\w+)\(([0-9,]+)\)"([^"]*)"\|"([^"]*)"\|"([^"]*)"\]/g,
             };

             tmp.transformation = {
                transformation: "map",
                areas : []
              };        

              while ((tmp.match = tmp.regexp.exec(mapData)) !== null) {
                  tmp.area = {};
                  tmp.area.shape  = tmp.match[1];
                  tmp.area.href   = tmp.match[3];
                  tmp.area.target = tmp.match[4];
                  tmp.area.alt    = tmp.match[5];
                  tmp.coords = $.map(tmp.match[2].split(","), function (e) { return parseInt(e, 10); });		
                  switch (tmp.area.shape) {
                      case "rect":
                          tmp.area.selection = [
                          parseInt(tmp.coords[0] * inverseScaleFactorX),
                          parseInt(tmp.coords[1] * inverseScaleFactorY),
                          parseInt(tmp.coords[2] * inverseScaleFactorX),
                          parseInt(tmp.coords[3] * inverseScaleFactorY)
                          ].join(",");
                          break;
                      case "circle":
                           tmp.area.selection = [
                           parseInt(tmp.coords[0] * inverseScaleFactorX),
                           parseInt(tmp.coords[1] * inverseScaleFactorY),
                           parseInt(tmp.coords[2] * inverseScaleFactorX)
                           ].join(",");
                           break;
                      default:
                          continue;
                  }

                  var newarea = document.createElement('area');
                  newarea.setAttribute('shape',tmp.area.shape);
                  newarea.setAttribute('coords',tmp.area.selection);
                  newarea.setAttribute('href',tmp.area.href);
                  newarea.setAttribute('alt',tmp.area.alt);
                  newarea.setAttribute('target',tmp.area.target);
                  newarea.setAttribute('title',tmp.area.alt);
                  imageMapEl.append(newarea);              
              }    
    	}

    function getScaleFactorX() {
        var scaleFactor = 1;
        var img = $(".asset-detail-views-image");
        var actualWidth = img.data("orig-width") || 1;
        var renditionWidth = parseInt(((img.css("width"))?img.css("width"):1), 10);

        if ( actualWidth > 1 && renditionWidth > 1 ) {
            scaleFactor = actualWidth/renditionWidth;
        }
        return scaleFactor;
    }


    function getScaleFactorY() {
        var scaleFactor = 1;
        var img = $(".asset-detail-views-image");
        var actualHeight = img.data("orig-height") || 1;
        var renditionHeight = parseInt(((img.css("height"))?img.css("height"):1), 10);

        if ( actualHeight > 1 && renditionHeight > 1 ) {
            scaleFactor = actualHeight/renditionHeight;
        }
        return scaleFactor;
    }
    });

})(document, Granite.$);
