/*
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2016 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

window.Dam = window.Dam || {};

/**
 * Content Fragment namespace.
 *
 * @namespace
 * @type {Object}
 */
window.Dam.CFM = window.Dam.CFM || {};

(function($, ns) {
    'use strict';

    ns.constants = {
        /* cookies */
        EDIT_COOKIE_PATH: 'dam-cfm-edit-path',
        EDIT_COOKIE_TOKEN: 'dam-cfm-edit-token',
        COLLECTIONS_LAYOUT_COOKIE: 'cq.assets.collections.layoutId',
        SC_CANCEL_TOOLTIP: 'dam-cfm-sc-cancel-tooltip',

        /* variations */
        EVENT_VARIATIONS_LIST_LOADED: 'variations-list-loaded',

        /* editor */
        EVENT_SAVE_CONTENT_FRAGMENT: 'cfm:save',
        EVENT_CONTENT_FRAGMENT_MODIFIED: 'cfm:contentchange',
        EVENT_CONTENT_FRAGMENT_BLOCK: 'cfm:block',
        EVENT_CONTENT_FRAGMENT_LOAD: 'cfm:load',
        EVENT_CONTENT_FRAGMENT_FIELD_MODIFIED: 'cfm:fieldchange',

        EVENT_PAGE_LEAVE: 'cfm:pageleave',
        EVENT_WS_RESIZED: 'cfm:contentresize',

        /* synchronization */
        EVENT_SYNCHRONIZE_ACTION: 'cfm:synchronize',
        SYNCHRONIZATION_OVERLAY_ID: 'SynchronizationSideBySide',
        EDITOR_ID: 'Editor',
        SYNCHRONIZATION_TITLE: 'cfm-content-title',
        SYNCHRONIZATION_CONTENT_VARIATION: 'cfm-content-variation',
        SYNCHRONIZATION_CONTENT_MASTER: 'cfm-content-master',

        /* summarization */
        EVENT_SUMMARIZE_ACTION: 'cfm:summarize',

        /* defaults */
        DEFAULT_ELEMENT_NAME: 'main',
        DEFAULT_VARIATION_NAME: '',

        /* servlet selectors */
        SERVLET_CONTENT: 'cfm.content.json'
    };

})($, window.Dam.CFM);

/* temporarily */
window.dam_cfm = window.dam_cfm || {};
window.dam_cfm = window.Dam.CFM;
