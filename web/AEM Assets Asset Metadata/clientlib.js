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
 */
(function(document, $) {
    'use strict';

    var downloadActivator = '.cq-damadmin-admin-actions-downloadcf-activator';
    var downloadDialogId = '#cfm-download-dialog';
    var downloadSelector = 'cfm.download';
    var zipNameField = '#dam-asset-download-title';
    var downloadErrorModal;
    var downloadButton = $();
    var downloadPaths = [];

    var getFormDetails = function(dialog) {
        var zipName = dialog.find(zipNameField).val();
        var getValues = function() { return $(this).val(); };
        var variations = dialog.find('[name="./variations"]:checked').map(getValues);
        var elements = dialog.find('[name="./elements"]:checked').map(getValues);
        var includeMetadata = dialog.find('[name="./includeMetadata"]:checked').length === 1;

        return {
            zipName: zipName,
            variations: variations,
            elements: elements,
            includeMetadata: includeMetadata
        };
    };

    var isValidFileName = function(name) {
        /* illegal characters: \ / : * ? | < > */
        return (name.length > 0) &&
            (name.replace(/^\s*|\s*$|[\.\/\\:\*\?\|<>]+/g, '').length > 0) &&
            (name.indexOf('/') === -1);
    };

    var updateCheckboxGroup = function(checkbox) {
        var group = checkbox.closest('coral-accordion-item').find('coral-checkbox');

        /* do nothing as it's not a group */
        if (group.length <= 1) {
            return;
        }

        /* update children selection if top checkbox was updated */
        var children = group.filter(':not([value=":all"])');

        if (checkbox.val() === ':all') {
            var isChecked = $(checkbox)[0].checked ? true : null;

            children
                .each(function() {
                    $(this).attr('checked', isChecked);
                });

            return;
        }

        /* update top checkbox if child checkbox was updated */
        var selectedChildren = children.filter('[checked]');
        var isSelected = (selectedChildren.length > 0) ? true : null;
        var isIndeterminate = (isSelected && (children.length !== selectedChildren.length)) ? true : null;

        group
            .filter('[value=":all"]:eq(0)')
            .attr({
                indeterminate: isIndeterminate,
                checked: isSelected
            });
    };

    var validateForm = function(event) {
        /* was it checkbox which triggered this validation? */
        if (event && event.target) {
            var tagName = (event.target.tagName || '').toLowerCase();

            if (tagName === 'coral-checkbox') {
                updateCheckboxGroup($(event.target));
            }
        }

        /* decide whether form is passing validity check */
        var dialog = $(this).closest('coral-dialog');
        var details = getFormDetails(dialog);
        var valid =
            isValidFileName(details.zipName) &&
            (details.variations.length > 0) &&
            (details.elements.length > 0);

        /* toggle download button */
        downloadButton.attr('disabled', valid ? null : 'disabled');
    };

    var addFormField = function(form, key, value) {
        var field = $('<input>')
            .attr({
                type: 'hidden',
                name: key,
                value: value
            });

        form.append(field);
    };

    var startDownload = function() {
        var dialog = $(this).closest('coral-dialog');
        var details = getFormDetails(dialog);
        var url = (downloadPaths[0] || '').replace(/\/[^\/]+$/, '') + '.' + downloadSelector + '.zip/' + details.zipName;
        var params = {
            paths: downloadPaths,
            variations: details.variations,
            elements: details.elements,
            includeMetadata: details.includeMetadata,
            '_charset_': 'utf-8'
        };

        var form = $('<form>')
            .attr({
                method: 'post',
                action: Granite.HTTP.externalize(url),
                target: '_blank'
            });

        $.each(params, function(key, value) {
            if (typeof value === 'object') {
                $.each(value, function(subKey, subValue) {
                    addFormField(form, key, subValue);
                });
            } else {
                addFormField(form, key, value);
            }
        });

        /* add form to the page and submit to trigger file download */
        $(document.body).append(form);
        form.submit();

        /* remove form from the page */
        window.setTimeout(function() {
            form.remove();
        }, 500);
    };

    var showDownloadDialog = function() {
        var activator = $(this);
        var ui = $(window).adaptTo('foundation-ui');

        /* show spinner */
        if (ui) {
            ui.wait();
        }

        /* handle selections */
        downloadPaths = [];
        var items = $('.foundation-selections-item');

        if (items.length) {
            items.each(function() {
                var item = $(this);

                /* add item path to the array */
                downloadPaths.push(item.data('foundation-collection-item-id'));
            });
        } else {
            /* handle quick action on the item */
            var path = activator.data('itempath');

            /* use location in case item doesn't have itempath attribute */
            if (!path) {
                var pathname = window.location.pathname;

                if (pathname.indexOf('/assets.html')) {
                    path = decodeURIComponent(pathname).replace(/^\/assets\.html/, '');
                }
            }

            /* add item path to the array */
            if (path) {
                downloadPaths.push(path);
            }
        }

        /* show dialog */
        var dialogUrl = Granite.HTTP.externalize(activator.data('href'));

        /* add Content Fragment path if needed */
        if ((dialogUrl.indexOf('?path=') === -1) && (downloadPaths.length === 1)) {
            dialogUrl += '?path=' + downloadPaths[0];
        }

        $.ajax({
            url: dialogUrl,
            type: 'post',
            data: {
                'paths': downloadPaths,
                '_charset_': 'utf-8'
            },
            async: true,
            success: function(html) {
                /* hide spinner */
                if (ui) {
                    ui.clearWait();
                }

                /* remove existing download dialogs */
                var oldDialogs = $('coral-dialog' + downloadDialogId);
                if (oldDialogs) {
                    $(oldDialogs).each(function() {
                        var $this = $(this);

                        $this.hide();
                        $this.remove();
                    });
                }

                /* add dialog to the page and show it */
                $('body').append(html);

                var dialog = document.querySelector(downloadDialogId);

                Coral.commons.ready(dialog, function() {
                    dialog.show();
                });

                $(downloadDialogId).trigger('foundation-contentloaded');
                $(document).trigger('content-fragment-download-modal-ready');

                /* attach download handler */
                downloadButton = $(downloadDialogId + ' #exportBtn');
                downloadButton.off('click').on('click', startDownload);

                /* form validation */
                $(downloadDialogId).off('change').on('change', validateForm);
                $(downloadDialogId + ' ' + zipNameField).on('keyup', validateForm);

                /* toggle accordion items */
                var myId = null;

                $(downloadDialogId + ' coral-accordion-item').off('click.toggle').on('click.toggle', function(event) {
                    /* do not toggle if checkbox was clicked */
                    if ($(event.target).filter('input').length) {
                        return;
                    }

                    myId = $(this).find('[handle="header"]').attr('id');

                    $(this).closest('coral-dialog-content').find('coral-accordion coral-accordion-item.is-selected').each(function() {
                        if (myId && (myId !== $(this).find('[handle="header"]').attr('id'))) {
                            $(this).attr('selected', null);
                        }
                    });
                });

                /* initial validation */
                validateForm.call(dialog);
            },
            error: function(item) {
                /* hide spinner */
                if (ui) {
                    ui.clearWait();
                }

                if (!downloadErrorModal) {
                    var responseHtml = $(Granite.UI.Foundation.Utils.processHtml(item.responseText));
                    var errorMessage = Granite.I18n.get('Failed to download.');
                    var content = errorMessage + '<br>' + responseHtml.filter('h1').text();

                    downloadErrorModal = new Coral.Dialog().set({
                        id: 'downloadError',
                        variant: 'error',
                        closable: 'on',
                        header: {
                            innerHTML: Granite.I18n.get('Error')
                        },
                        content: {
                            innerHTML: content
                        },
                        footer: {
                            innerHTML: '<button is="coral-button" class="closeExport" variant="default" coral-close>' + Granite.I18n.get('OK') + '</button>'
                        }
                    });
                }

                downloadErrorModal.show();
            }
        });
    };

    $(document).on('foundation-contentloaded', function() {
        /* show download dialog after clicking download action */
        $(document)
            .off('click', downloadActivator)
            .one('click', downloadActivator, showDownloadDialog);
    });

})(document, Granite.$);
