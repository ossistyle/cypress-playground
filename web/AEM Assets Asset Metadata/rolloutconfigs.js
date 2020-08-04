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
(function(document, Granite, $) {
    "use strict";

    $(document).on("change", ".cq-siteadmin-admin-properties-livecopy-inheritrolloutconfigs", function() {
        var $this = $(this);
        var $rolloutConfigs = $("." + $this.data("target")).parent(); // field wrapper of select field
        var $inheritedRolloutConfigs = $("." + $this.data("target") + "-inherited"); // static list
        var selectList = $rolloutConfigs.find('coral-select')[0];
        if ($this.prop("checked") === true) {
            $rolloutConfigs.attr("hidden", true);
            $inheritedRolloutConfigs.removeAttr("hidden");
            selectList.set("values",[]);
        } else {
            $rolloutConfigs.removeAttr("hidden");
            $inheritedRolloutConfigs.attr("hidden", true);
        }

    });

})(document, Granite, Granite.$);