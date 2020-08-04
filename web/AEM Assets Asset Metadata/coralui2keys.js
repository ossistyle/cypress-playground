/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
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

window.CUI = window.CUI || {};

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
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
(function($) {
    'use strict';
    /* jshint -W040 */

    /**
     A map of modifier names to their corresponding keycodes.
     @ignore
     */
    /* jshint -W015 */
    var modifierCodes = {
        '⇧': 16, 'shift': 16,
        '⌥': 18, 'alt': 18, 'option': 18,
        '⌃': 17, 'ctrl': 17, 'control': 17,
        '⌘': 91, 'cmd': 91, 'command': 91, 'meta': 91
    };

    /**
     Used to check if a key is a modifier.
     @ignore
     */
    var modifierCodeMap = {
        16: true,
        17: true,
        18: true,
        91: true
    };

    /**
     A list of modifier event property names in sorted key code order. Used to add keycodes for modifiers.
     @ignore
     */
    var modifierEventPropertyNames = [
        'shiftKey',
        'ctrlKey',
        'altKey',
        'metaKey'
    ];

    /**
     A map of key codes to normalize. These are duplicate keys such as the number pad.
     @ignore
     */
    var normalizedCodes = {
        // Numpad 0-9
        '96': '48',
        '97': '49',
        '98': '50',
        '99': '51',
        '100': '52',
        '101': '53',
        '102': '54',
        '103': '55',
        '104': '56',
        '105': '57'
    };

    var specialKeyCodes = {
        'backspace': '8',
        'tab': '9',
        'return': '13',
        'pause': '19',
        'capslock': '20',
        'esc': '27',
        'escape': '27',
        'space': '32',
        'pageup': '33',
        'pagedown': '34',
        'end': '35',
        'home': '36',
        'left': '37',
        'up': '38',
        'right': '39',
        'down': '40',
        'insert': '45',
        'del': '46',
        'delete': '46',
        ';': '186',
        '=': '187',
        '*': '106',
        '+': '107',
        '-': '189',
        '.': '190',
        'period': '190',
        '/': '191',
        'f1': '112',
        'f2': '113',
        'f3': '114',
        'f4': '115',
        'f5': '116',
        'f6': '117',
        'f7': '118',
        'f8': '119',
        'f9': '120',
        'f10': '121',
        'f11': '122',
        'f12': '123',
        'f13': '124',
        'f14': '125',
        'f15': '126',
        'f16': '127',
        'f17': '128',
        'f18': '129',
        'f19': '130',
        'numlock': '144',
        'scroll': '145',
        ',': '188',
        '`': '192',
        '[': '219',
        '\\': '220',
        ']': '221',
        '\'': '222'
    };

    // Match a namespaced event, such as ctrl+r.myNS
    var namespaceRE = /(.*?)(\..+)$/;

    // Cache the jQuery object for the window
    var $window = $(window);

    /**
     The set of tags to ignore hot keys when focused within for the default filter
     @ignore
     */
    var restrictedTagNames = {
        'INPUT': true,
        'SELECT': true,
        'TEXTAREA': true
    };

    /**
     The default keycombo event filter function. Ignores key combos triggered on input, select, and textarea.
     @function filterInputs
     @memberof CUI.Keys
     @static
     */
    function filterInputs(event) {
        var target = event.target;
        var tagName = target.tagName;
        return !target.isContentEditable && !restrictedTagNames[tagName];
    }

    /**
     Convert a key to its character code representation
     @ignore
     */
    function keyToCode(key) {
        key = key.toLowerCase();

        // Map special string representations to their character code equivalent
        var code = specialKeyCodes[key] || modifierCodes[key];

        if (!code && key.length > 1) {
            throw new Error('CUI.Keys: Key '+key+' not recognized');
        }

        // Return the special code from the map or the char code repesenting the character
        return code || key.toUpperCase().charCodeAt(0);
    }

    /**
     Normalize duplicate codes
     @ignore
     */
    function normalizeCode(code) {
        return normalizedCodes[code] || code;
    }

    /**
     Convert a combination of keys separated by + into the corresponding code string
     @ignore
     */
    function keyComboToCodeString(keyCombo) {
        return keyCombo
            .toString() // Convert to string so numbers are supported
            .split('+')
            .map(keyToCode)
            .sort() // Sort keys for easy comparison
            .join('+');
    }

    /**
     Handle key combination events.

     @class CUI.Keys
     @param {Mixed}    elOrSelector                     The selector, element, or jQuery object to listen for keyboard events on. This should be the common parent of all elements you wish to listen for events on.
     @param {Object}   [options]                        Options for this combo handler.
     @param {Function} [options.context]                The desired value of the <code>this</code> keyword context when executing listeners. Defaults to the element on which the event is listened for.
     @param {Function} [options.preventDefault=false]   Whether to prevent the default behavior when a key combo is matched.
     @param {Function} [options.stopPropagation=false]  Whether to stop propagation when a key combo is matched.
     @param {Function} [options.filter={@link CUI.Keys.filterInputs}]  The filter function for keyboard events. This can be used to stop events from being triggered when they originate from specific elements.
     */
    function makeComboHandler(elOrSelector, options) {
        options = options || {};

        if (typeof elOrSelector === 'undefined') {
            throw new Error('CUI.Keys: Cannot create a combo handler for '+elOrSelector);
        }

        // Cache the element's jQuery object
        var $el = $(elOrSelector);

        // Use provided context
        var context = options.context;

        /**
         The filter function to use when evaluating keypresses
         */
        var filter = options.filter || filterInputs;

        /**
         Whether to prevent default
         */
        var preventDefault = options.preventDefault || false;

        /**
         Whether to stop propagation and prevent default
         */
        var stopPropagation = options.stopPropagation || false;

        /**
         A map of key code combinations to arrays of listener functions
         @ignore
         */
        var keyListeners;

        /**
         The sorted array of currently pressed keycodes
         @ignore
         */
        var currentKeys;

        /**
         The joined string representation of currently pressed keycodes
         @ignore
         */
        var currentKeyCombo;

        function handleKeyDown(event) {
            // Store pressed key in array
            var key = normalizeCode(event.which);

            // Don't do anything when a modifier is pressed
            if (modifierCodeMap[key]) {
                return;
            }

            if (currentKeys.indexOf(key) === -1) {
                currentKeys.push(key);

                setCurrentKeyCombo(event);
            }

            executeListeners.call(this, event);

            // Workaround: keyup events are never triggered while the command key is down, so reset the list of keys
            if (event.metaKey) {
                reset();
            }
        }

        function setCurrentKeyCombo(event) {
            // Build string for modifiers
            var currentModifiers = [];
            for (var i = 0; i < modifierEventPropertyNames.length; i++) {
                var propName = modifierEventPropertyNames[i];

                if (event[propName]) {
                    currentModifiers.push(modifierCodes[propName.slice(0, -3)]);
                }
            }

            // Store current key combo
            currentKeyCombo = currentKeys.concat(currentModifiers).sort().join('+');
        }

        function handleKeyUp(event) {
            var key = normalizeCode(event.which);

            if (modifierCodeMap[key]) {
                // Workaround: keyup events are not triggered when command key is down on Mac, so if the command key is released, consider all keys released
                // Test: comment this out, press K, press L, press Command, release L, release Command, then release K -- L is triggered
                // This also prevents handlers for related key combos to be triggered
                // Test: comment this out, press Control, press Alt, press A, press S, release Alt, release S -- Control+A is triggered
                reset();

                // We don't ever want to execute handlers when a modifier is released, and we can't since they don't end up in currentKeys
                // If we weren't doing the index check below, that could result in key combo handlers for ctrl+r to be triggered when someone released alt first after triggering ctrl+alt+r
                // In any case, return to avoid the uselss extra work
                return;
            }

            // Remove key from array
            var index = currentKeys.indexOf(key);
            if (index !== -1) {
                currentKeys.splice(index, 1);

                // If too many keys are pressed, then one is removed, make sure to check for a match
                setCurrentKeyCombo(event);
                executeListeners.call(this, event);
            }
        }

        function executeListeners(event) {
            // Don't do anything if we don't have any keys pressed
            if (!currentKeyCombo) {
                return;
            }

            // Evaluate whether we should filter this keypress
            if (!filter(event)) {
                return;
            }

            var target = (event.target || event.srcElement);

            var listeners = keyListeners[currentKeyCombo];
            if (listeners && listeners.length) {
                for (var i = 0; i < listeners.length; i++) {
                    var listener = listeners[i];

                    // Perform event delegation
                    // jQuery's event delegation code has fixes related to clicks, SVGs, etc that are not relevant here
                    // To simplify things, instead of using jQuery's on() for delegated events, we'll perform delegation manually
                    if (listener.selector) {
                        // Use the same matching code from jQuery's event.js
                        // This allows us to match when the delegation selector includes context
                        var matches = listener.needsContext ?
                        jQuery(listener.selector, this).index(target) >= 0 :
                            jQuery.find(listener.selector, this, null, [target]).length;

                        // Skip if the originating element doesn't match the selector
                        if (!matches) {
                            continue;
                        }
                    }

                    // Add data to event object
                    if (typeof listener.data !== undefined) {
                        event.data = listener.data;
                    }

                    listener.listener.call(context || this, event);
                }

                // Don't do the default thing
                if (preventDefault) {
                    event.preventDefault();
                }
                if (stopPropagation) {
                    event.stopPropagation();
                }
            }
        }

        /**
         Add a key combo listener.

         @function on
         @memberof CUI.Keys#
         @param {String}   keyCombo   The key combination to listen for, such as <code>'ctrl-f'</code>.
         @param {String}   [selector] A selector to use for event delegation.
         @param {String}   [data]     Data to pass to listeners as <code>event.data</code>.
         @param {Function} listener   The listener to execute when this key combination is pressed. Executes on keydown, or, if too many keys are pressed and one is released, resulting in the correct key combination, executes on keyup.
         */
        function on(keyCombo, selector, data, listener) {
            // keyCombo can be a map of keyCombos to handlers
            if (typeof keyCombo === 'object') {
                // ( keyCombo-Object, selector, data )
                if (typeof selector !== 'string') {
                    // ( keyCombo-Object, data )
                    // ( keyCombo-Object, null, data )
                    data = data || selector;
                    selector = undefined;
                }
                for (var combo in keyCombo) {
                    this.on(combo, selector, data, keyCombo[combo]);
                }
                return this;
            }

            if (typeof data === 'undefined' && typeof listener === 'undefined') {
                // ( keyCombo, listener )
                listener = selector;
                data = selector = undefined;
            }
            else if (typeof listener === 'undefined') {
                if (typeof selector === 'string') {
                    // ( keyCombo, selector, listener )
                    listener = data;
                    data = undefined;
                }
                else {
                    // ( keyCombo, data, listener )
                    listener = data;
                    data = selector;
                    selector = undefined;
                }
            }

            if (typeof listener !== 'function') {
                throw new Error('CUI.Keys: Cannot add listener of type '+(typeof listener));
            }

            var namespace;
            var namespaceMatch = namespaceRE.exec(keyCombo);
            if (namespaceMatch) {
                keyCombo = namespaceMatch[1];
                namespace = namespaceMatch[2];
            }

            keyCombo = keyComboToCodeString(keyCombo);

            var listeners = keyListeners[keyCombo] = keyListeners[keyCombo] || [];

            // Store the listener and associated information in the list for this keyCombo
            listeners.push({
                // Determine if this selector needs context when evaluating event delegation
                // A selector needs context when it includes things like >, ~, :first-child, etc
                needsContext: selector ? jQuery.expr.match.needsContext.test(listener.selector) : false,
                selector: selector,
                listener: listener,
                data: data,
                namespace: namespace
            });

            return this;
        }

        function offByKeyComboString(keyComboString, namespace, selector, listener) {
            var i;
            var listeners = keyListeners[keyComboString];

            if (listeners && listeners.length) {
                if (typeof selector === 'undefined' && typeof listener === 'undefined' && typeof namespace === 'undefined') {
                    // Unbind all listeners for this key combo
                    listeners.length = 0;
                }
                else if (typeof listener === 'undefined') {
                    // Unbind all listeners of a specific selector and or namespace
                    for (i = 0; i < listeners.length; i++) {
                        // This comparison works because selector and namespace are undefined by default
                        if (listeners[i].selector === selector && listeners[i].namespace === namespace) {
                            listeners.splice(i, 1);
                            i--;
                        }
                    }
                }
                else {
                    // Unbind a specific listener, optionally on a specific selector and specific namespace
                    for (i = 0; i < listeners.length; i++) {
                        if (listeners[i].listener === listener && listeners[i].selector === selector && listeners[i].namespace === namespace) {
                            listeners.splice(i, 1);
                            i--;
                        }
                    }
                }
            }
        }

        /**
         Remove a key combo listener.

         @function off
         @memberof CUI.Keys#
         @param {String}   keyCombo   The key combination to listen for, such as <code>'ctrl-f'</code>.
         @param {String}   [selector] A selector to use for event delegation.
         @param {Function} listener   The listener that was passed to on.
         */
        function off(keyCombo, selector, listener) {
            if (typeof listener === 'undefined') {
                listener = selector;
                selector = undefined;
            }

            var namespace;
            var namespaceMatch = namespaceRE.exec(keyCombo);
            if (namespaceMatch) {
                keyCombo = namespaceMatch[1];
                namespace = namespaceMatch[2];
            }

            if (keyCombo === '' && typeof namespace !== 'undefined') {
                // If we have a namespace by no keyCombo, remove all events of the namespace for each key combo
                for (keyCombo in keyListeners) {
                    offByKeyComboString(keyCombo, namespace, selector, listener);
                }

                return this;
            }

            keyCombo = keyComboToCodeString(keyCombo);

            offByKeyComboString(keyCombo, namespace, selector, listener);

            return this;
        }

        /**
         Reset the state of this instance. This resets the currently pressed keys.
         @function reset
         @memberof CUI.Keys#
         */
        function reset() {
            // Only reset variables related to currently pressed keys
            currentKeys = [];
            currentKeyCombo = '';

            return this;
        }

        /**
         Initialize an instance created without the <code>new</code> keyword or revive a destroyed instance. This method will be called automatically if an instance is created with <code>new CUI.Keys</code>, but otherwise will not be called.
         @function init
         @memberof CUI.Keys#
         */
        function init() {
            // Reset all variable states
            currentKeys = [];
            currentKeyCombo = '';
            keyListeners = {};

            $el.on('keydown', handleKeyDown);
            $el.on('keyup', handleKeyUp);
            $window.on('focus', reset);

            return this;
        }

        /**
         Destroy this instance. This removes all event listeners, references, and state.
         @function destroy
         @memberof CUI.Keys#
         */
        function destroy() {
            keyListeners = null;
            currentKeys = null;
            currentKeyCombo = null;
            $el.off('keydown', handleKeyDown);
            $el.off('keyup', handleKeyUp);
            $window.off('focus', reset);

            return this;
        }

        // @todo is this insane?
        if (this instanceof makeComboHandler) {
            // Initialize immediately if new keyword used
            init();
        }

        return {
            on: on,
            off: off,
            reset: reset,
            init: init,
            destroy: destroy
        };
    }

    CUI.Keys = makeComboHandler;

    CUI.Keys.filterInputs = filterInputs;

    /**
     A key listener for global hotkeys.

     @static
     @type CUI.Keys
     */
        // Register against the documentElement, <html>, so event delegation works
    CUI.keys = new CUI.Keys(document.documentElement, {
        // Don't global hotkeys trigger default actions
        stopPropagation: true,
        preventDefault: true
    });

}(Granite.$));

