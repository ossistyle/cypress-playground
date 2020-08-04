/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2019 Adobe
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
(function(document, $, MSM) {
    "use strict";

    $(document).on("foundation-contentloaded", function(e) {
        var $lockableFields = $("[data-cq-msm-lockable]");
        var shouldReinitializeMSM = false;

        // prepare DOM of lockable fields to generate property locks
        $lockableFields.each(function(idx, lockableField) {
            var $lockableField = $(lockableField);
            var $fieldWrapper = $lockableField
                .closest(".coral-Form-fieldwrapper, .foundation-field-edit");

            if ($fieldWrapper.length === 0) {
                $(lockableField).wrap("<div class='coral-Form-fieldwrapper'></div>");
                // check if MSMCommons already processed this field => Reinitialize
                if ($lockableField.hasClass("cq-msm-lockable-field")) {
                    shouldReinitializeMSM = true;
                }
            }
        });

        if (shouldReinitializeMSM && MSM && MSM.MSMCommons) {
            MSM.MSMCommons.getLiveRelationshipStatus();
        }
    });
})(document, Granite.$, window.MSM);
