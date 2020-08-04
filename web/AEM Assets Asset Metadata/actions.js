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
 */

(function(window, document, Coral, Granite, $) {
  "use strict";
  
  var selectors = {
    viewExternalActivator: ".cq-damadmin-admin-actions-stock-viewexternal-activator",
    selectedItem: ".foundation-selections-item",
    dataAttr: "[data-stock-path]",
    assetsMetadata: ".foundation-collection-assets-meta"
  };
  
  var ui = $(window).adaptTo("foundation-ui");

  function getSelectedAssetMetadata($item) {
    return $(selectors.assetsMetadata, $item.closest(".foundation-collection-item"));
  }

  $(document).one("foundation-contentloaded", function(e) {

    $(document).on("click" + selectors.viewExternalActivator, selectors.viewExternalActivator, function(e) {
      e.preventDefault();
      var $collection = $(".foundation-collection");
      var $selectedItem = $collection.find(selectors.selectedItem);
      var metadata = getSelectedAssetMetadata($selectedItem).data();

      // single item, e.g. stockpreview/assetdetailsview/metadataeditor
      if (!$selectedItem.length || !metadata) {
        $selectedItem = $(selectors.dataAttr);
        metadata = $selectedItem.data();
      }

      if (metadata && metadata.stockPath) {
        ui.wait();
        $.ajax({
          type: "GET",
          async: false,
          cache: false,
          url: metadata.stockPath + ".json"
        })
        .done(function(response) {
          if (response && response.details_url) {
            window.location.href = response.details_url;
            ui.clearWait();
          }
        });
      }
    });
  });  
})(window, document, Coral, Granite, Granite.$);
