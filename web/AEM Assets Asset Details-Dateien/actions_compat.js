/*
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2020 Adobe
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
 */
(function(document, Class, $) {
    "use strict";
    var legacyCreateFolderActionBarItem = ".dam-create-folder.cq-damadmin-admin-actions-createfolder-at-activator";
    $(document).on("foundation-contentloaded", function() {
        var $createFolderSelection = $(legacyCreateFolderActionBarItem);
        if ($createFolderSelection.length) {
            $createFolderSelection.removeClass("dam-create-folder");
        }
    });
})(document, Class, Granite.$);
