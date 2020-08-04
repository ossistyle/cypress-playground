/*
* ADOBE CONFIDENTIAL
* __________________
*
*  Copyright 2018 Adobe Systems Incorporated
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
(function ($, ns) {
    'use strict';

    /* namespace */
    ns.DiffHighlighting = {};

    /**
     * Post-Processing of the original deltas from the diff_main_patch algorithm.
     * Converts the nested arrays structure into a more readable object structure ,
     * and merges pairs of removed and added content into a "modified" delta,
     *
     * @private
     * @param {Array} delta - list of deltas as returned by the diff_match_patch algorithm
     * @returns {Array} - grouped deltas as objects with newText/oldText properties and added/modified/removed flags
     */
    var postProcessDeltas = function(delta) {

        // some constants to improve readability of accessing the data from the original delta array structures
        var REMOVED = -1;
        var ADDED = 1;
        var TYPE = 0;
        var TEXT = 1;

        var containsNewLine = function(text) {
            return text.indexOf('\n') >= 0;
        };

        var isTextSuitableToShowAsModification = function(oldText, newText) {

            // avoid to mark content as "modified" if the change spans over multiple paragraphs or list items
            var oneTextContainsNewline = containsNewLine(oldText) || containsNewLine(newText);

            // avoid to marking content as "modified" if they have significantly different length
            // (otherwise a removal of a whole paragraph could co unnoticed, if other short content was added at the same position)
            var lengthRatio = oldText.length / newText.length;
            var bothTextsHaveSimilarLength = lengthRatio >= 1/4 && lengthRatio <= 4;

            return !oneTextContainsNewline && bothTextsHaveSimilarLength;
        };

        var result = [];

        /* do nothing if deltas are empty */
        if (!delta || (delta.length === 0)) {
            return result;
        }

        /* iterate over array of deltas */
        for (var x = 0; x < delta.length; x++) {
            var currDelta = delta[x];
            var nextDelta = delta[x + 1] || [ 0 ];
            var entry = {
                added: false,
                modified: false,
                removed: false
            };

            /* group certain adjacent removed & added items into a single modified entry */
            if ((currDelta[TYPE] === REMOVED) && (nextDelta[TYPE] === ADDED) && isTextSuitableToShowAsModification(currDelta[TEXT], nextDelta[TEXT])) {
                entry.modified = true;
                entry.newText = nextDelta[TEXT];
                entry.oldText = currDelta[TEXT];
                x++;

            } else if (currDelta[TYPE] === REMOVED) {
                entry.removed = true;
                entry.newText = null;
                entry.oldText = currDelta[TEXT];

            } else if (currDelta[TYPE] === ADDED) {
                entry.added = true;
                entry.newText = currDelta[TEXT];
                entry.oldText = null;

            } else {
                entry.newText = currDelta[TEXT];
                entry.oldText = currDelta[TEXT];
            }

            /* add entry */
            result.push(entry);
        }

        return result;
    };

    /**
     * Compare the plain text content from the given DOM elements and produce an array of delta object
     *
     * @private
     * @param {HTMLElement} newElement - the DOM tree of the current version
     * @param {HTMLElement} oldElement - the DOM tree of the previous version
     * @returns {Array} - grouped deltas as objects with newText/oldText properties and added/modified/removed flags
     */
    var calculatePlainTextDeltas = function(newElement, oldElement) {

        /* changes to formatting can introduce nbsp entities that should be treated exactly like regular spaces during diff generation */
        var normalizeWhiteSpace = function(text) {
            return text.replace(/\u00A0/g, ' ');
        };

        /* extract the plain text of the complete trees */
        var newText = normalizeWhiteSpace(newElement.textContent);
        var oldText = normalizeWhiteSpace(oldElement.textContent);

        /* initialize and execute diff_match_patch on the plain text representations */
        var matcher = new diff_match_patch();

        var delta = matcher.diff_main(oldText, newText);
        matcher.diff_cleanupSemantic(delta);

        /* group deltas: -1 (removed), +1 (added) -> 2 (modified) */
        delta = postProcessDeltas(delta);

        return delta;
    };

    /**
     * Collect all text nodes from a DOM tree into the given array
     *
     * @private
     * @param {HTMLElement} element - the DOM tree
     * @param {Array} textNodes - an array that will be filled with Text ndoes
     * @returns {undefined} - nothing
     */
    var collectTextNodes = function(element, textNodes) {

        if (element.hasChildNodes()) {
            var children = element.childNodes;

            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (child.nodeType === Node.TEXT_NODE) {
                    textNodes.push(child);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    collectTextNodes(child, textNodes);
                }
            }
        }
    };

    var insertNodeBefore = function(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode);
    };

    var insertNodeAfter = function(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    };

    /**
     * Constructor for objects that helps iterating over all text nodes of a given DOM tree,
     * and split the text nodes into smaller parts (to have them aligned with the deltas from the diff)
     *
     * @private
     * @param {HTMLElement} element - the DOM tree from which text nodes should be extracted
     * @returns {Object} - an object with getLengthOfNextNode and popNodeOfLength functions
     */
    var TextNodeSplittingDomQueue = function(element) {

        this.textNodes = [];
        collectTextNodes(element, this.textNodes);

        this.getLengthOfNextNode = function() {
            if (this.textNodes.length === 0) {
                throw new Error('Unexpected attempt to access content from an empty TextNodeSplittingDomQueue');
            }

            return this.textNodes[0].nodeValue.length;
        };

        this.popNodeOfLength = function(length) {
            if (this.textNodes.length === 0) {
                throw new Error('Unexpected attempt to access content from an empty TextNodeSplittingDomQueue');
            }

            var nextNode = this.textNodes[0];
            var nextText = nextNode.nodeValue;

            // if the next node has exactly the specified length, we can return it as it is and continue with the next node
            if (nextText.length === length) {
                this.textNodes.shift();
                return nextNode;
            }

            // if the next node is longer then split the node at the specified position
            var additionalNode = document.createTextNode(nextText.substring(0, length));
            nextNode.nodeValue = nextText.substring(length);
            insertNodeBefore(additionalNode, nextNode);

            // return the additional
            return additionalNode;
        };
    };

    /**
     * Tries to find the matching text node for the given delta in the DOM, and splits deltas or text nodes if required:
     * If the delta contains a long text that is represented by multiple text nodes,
     * then only the first text node will be matched, a new delta with the shorter matched text will be returned
     * and the given delta will be updated to only contain the text that has not been matched yet.
     *
     * @private
     * @param {Object} delta - the object that represents the added/removed content
     * @param {Object} queue - the TextNodeSplittingDomQueue from which text nodes will be removed as required
     * @returns {Object} - a new delta object *only* if the given delta corresponds to more than one text node
     */
    var findAddedOrRemovedTextNodesAndSplitDeltaIfRequired = function(delta, queue) {

        // get the length of the text in the given delta object
        var deltaLength = delta.newText ? delta.newText.length : (delta.oldText ? delta.oldText.length : 0);
        // and the length of the upcoming text node
        var nodeLength = queue.getLengthOfNextNode();

        // if the next node contains all text from the given delta...
        if (nodeLength >= deltaLength) {
            // ...remove a text node with the given length and assign it to the delta instance
            var nodeWithLengthOfDelta = queue.popNodeOfLength(deltaLength);
            if (delta.removed) {
                delta.oldNode = nodeWithLengthOfDelta;
            } else {
                delta.newNode = nodeWithLengthOfDelta;
            }

            // return null to indicate that it was not required to split the delta into multiple parts
            return null;
        }

        // because the next text node is shorter than the delta's text, we have to split the delta into two parts
        var splitDelta = {
            added: delta.added,
            modified: delta.modified,
            removed: delta.removed
        };

        // assign the short text node that is available to the split delta instance, and keep the remaining text
        // in the delta instance that was passed to the constructor
        var node = queue.popNodeOfLength(nodeLength);
        if (delta.removed) {
            splitDelta.oldText = node.nodeValue;
            splitDelta.oldNode = node;

            delta.oldText = delta.oldText.substring(nodeLength);
        } else {
            splitDelta.newText = node.nodeValue;
            splitDelta.newNode = node;

            delta.newText = delta.newText.substring(nodeLength);
        }

        // return the split data to indicate that the delta passed to this function has not been fully processed
        return splitDelta;
    };

    /**
     * Tries to find the matching text node for the given delta in two DOM trees, and splits deltas or text nodes if required:
     * If the delta contains a long text that is represented by multiple text nodes,
     * then only the first text node will be matched, a new delta with the shorter matched text will be returned
     * and the given delta will be updated to only contain the text that has not been matched yet.
     *
     * @private
     * @param {Object} delta - the object that represents the added/removed content
     * @param {Object} newQueue - a TextNodeSplittingDomQueue from which text nodes will be removed as required
     * @param {Object} oldQueue - a TextNodeSplittingDomQueue from which text nodes will be removed as required
     * @returns {Object} - a new delta object *only* if the given delta corresponds to more than one text node
     */
    var findModifiedOrUnchangedTextNodesAndSplitDeltaIfRequired = function(delta, newQueue, oldQueue) {

        // get the length of the old and new text in the given delta object
        var newDeltaLength = delta.newText.length;
        var oldDeltaLength = delta.oldText.length;
        // and the length of the upcoming text nodes in both DOM queues
        var newNodeLength = newQueue.getLengthOfNextNode();
        var oldNodeLength = oldQueue.getLengthOfNextNode();

        var newNode, oldNode;

        // only if the next nodes in *both* queues are at least as long as the texts in the given delta...
        if (newNodeLength >= newDeltaLength && oldNodeLength >= oldDeltaLength) {
            // we can simply look up the corresponding text nodes from the queues (and let it split text nodes if required)
            newNode = newQueue.popNodeOfLength(newDeltaLength);
            oldNode = oldQueue.popNodeOfLength(oldDeltaLength);

            delta.newNode = newNode;
            delta.oldNode = oldNode;

            // return null to indicate that it was not required to split the delta into multiple parts
            return null;
        }

        if (delta.modified) {
            // if the text was modified, then the new and old text can have different lengths,
            // and we have to ensure we do not pop more text from the DOM than what's represented in the delta curently being processed
            newNode = newQueue.popNodeOfLength(Math.min(newNodeLength, newDeltaLength));
            oldNode = oldQueue.popNodeOfLength(Math.min(oldNodeLength, oldDeltaLength));
        } else {
            // if the text was unchanged, then just pop as much text as is available in the *shorter* of the two next text nodes
            var commonNodeLength = Math.min(newNodeLength, oldNodeLength);
            newNode = newQueue.popNodeOfLength(commonNodeLength);
            oldNode = oldQueue.popNodeOfLength(commonNodeLength);
        }

        // construct the split delta instance (keeping the flags, and assigning the text nodes we just found)
        var splitDelta = {
            added: delta.added,
            modified: delta.modified,
            removed: delta.removed,

            newText: newNode.nodeValue,
            oldText: oldNode.nodeValue,

            newNode: newNode,
            oldNode: oldNode
        };

        // update the delta passed to the constructor with the remaining text that is not present in the split delta
        delta.newText = delta.newText.substring(newNode.nodeValue.length);
        delta.oldText = delta.oldText.substring(oldNode.nodeValue.length);

        // return the split data to indicate that the delta passed to this function has not been fully processed
        return splitDelta;
    };

    /**
     * Tries to to find the matching text nodes in the current and previous versions' DOM for the given delta instances.
     * The main problem that this function addresses is that a single delta can correspond to multiple text nodes (and vice versa).
     * Therefore it is often required to create more fine-grained deltas, or to split text nodes.
     * After calling this method, it is guaranteed that each delta in the returned array contains newNode and/or oldNode
     * references to the text nodes within the given DOM structures.
     *
     * @private
     * @param {Array} deltas - the array of plain text deltas as returned by the calculatePlainTextDeltas function
     * @param {HTMLElement} newElement - the DOM tree of the current version
     * @param {HTMLElement} oldElement - the DOM tree of the previous version
     * @returns {Array} - a new array of deltas, each of which has a currentNode and/or oldNode property with the matching text node
     */
    var splitAndMatchDeltasWithCorrespondingTextNodes = function(deltas, newElement, oldElement) {
        var splitAndMatchedDeltas = [];

        // create two objects that help iterating over all text nodes (and split them when required)
        var newQueue = new TextNodeSplittingDomQueue(newElement);
        var oldQueue = new TextNodeSplittingDomQueue(oldElement);

        // iterate over all deltas
        var d = 0;
        while (d < deltas.length) {
            var delta = deltas[d];

            var splitDelta = null;
            if (delta.added) {
                // for added content, only look in the current version's DOM to find the matching text node
                splitDelta = findAddedOrRemovedTextNodesAndSplitDeltaIfRequired(delta, newQueue);
            } else if (delta.removed) {
                // for removed content, only look in the previous version's DOM to find the matching text node
                splitDelta = findAddedOrRemovedTextNodesAndSplitDeltaIfRequired(delta, oldQueue);
            } else {
                // for modified or unchanged content, the text nodes in both current and previous version's DOMs need to be identified
                splitDelta = findModifiedOrUnchangedTextNodesAndSplitDeltaIfRequired(delta, newQueue, oldQueue);
            }

            // if it was necessary to split the current delta (because it did correspond to multiple text nodes)
            // then the find methods returned a new "split delta" with the beginning of the text and references to the matching text node(s)
            if (splitDelta) {
                splitAndMatchedDeltas.push(splitDelta);
                // the remaining text is yet to be processed, so we continue with the current delta (which contains only the remaining text)
            } else {
                // if it was not necessary to split the delta then the matching text nodes were added to the current delta
                splitAndMatchedDeltas.push(delta);
                // and we can continue with the next delta
                d++;
            }
        }

        return splitAndMatchedDeltas;
    };

    var findNextDeltaWithKnownPosition = function(deltas, currentDeltaIndex) {
        for (var n = currentDeltaIndex + 1; n < deltas.length; n++) {
            // another delta can only be used to find the reference position if it is available in the
            // new and old version (and it shouldn't be a newline, because that is never a valid reference position)
            if (deltas[n].newNode && deltas[n].oldNode && deltas[n].newNode.nodeValue !== '\n') {
                return deltas[n];
            }
        }
        return null;
    };

    var findPrevDeltaWithKnownPosition = function(deltas, currentDeltaIndex) {
        for (var n = currentDeltaIndex - 1; n >= 0; n--) {
            // another delta can only be used to find the reference position if it is available in the
            // new and old version (and it shouldn't be a newline, because that is never a valid reference position)
            if (deltas[n].newNode && deltas[n].oldNode && deltas[n].newNode.nodeValue !== '\n') {
                return deltas[n];
            }
        }
        return null;
    };

    var findRootElementOfNewDom = function(deltas) {
        for (var n = 0; n < deltas.length; n++) {
            if (deltas[n].newNode) {
                return deltas[n].newNode.getRootNode();
            }
        }
        return null;
    };

    var collectAncestors = function(node) {
        var ancestors = [];
        var parent = node.parentNode;
        while (parent !== null) {
            ancestors.unshift(parent);
            parent = parent.parentNode;
        }
        return ancestors;
    };

    /**
     * Find the common ancestor of the two given nodes in the old DOM tree, and collect all the (formatting) elements between that ancestor and the
     * text node that has been removed. This information is used later to re-construct the formatting of the removed text node, and find the right
     * insert position.
     *
     * @private
     * @param {Node} removedNodeInOldDom - a text node in the old DOM tree that is no longer present in the new DOM tree
     * @param {Node} referenceNodeInOldDom - existing node in the old DOM tree that is known to be positioned before or after the removed node
     * @returns {Array} - an array of HTMLElements starting with the last common ancestor, followed by all elements between that ancestor and the removed node
     */
    var findCommonAncestorAndElementsBetween = function(removedNodeInOldDom, referenceNodeInOldDom) {
        var ancestors = collectAncestors(removedNodeInOldDom);
        var referenceAncestors = collectAncestors(referenceNodeInOldDom);

        var relevantAncestors = [];

        // iterate over all ancestors, beginning from the root element of the old DOM tree
        for (var a = 0; a < Math.max(ancestors.length, referenceAncestors.length); a++) {
            // as long as the ancestor is identical for the removed and reference node...
            if (ancestors[a] === referenceAncestors[a]) {
                // ...reset the first item in the array (as we want the array to start with the nearest common ancestor, everything further up is irrelevant)
                relevantAncestors[0] = ancestors[a];
            } else if (ancestors[a]) {
                // this is a formatting element that is *not* shared with the reference node, and needs to be re-created later on
                relevantAncestors.push(ancestors[a]);
            }
        }

        return relevantAncestors;
    };

    var hasAncestorWithTagName = function(node, tagName) {
        if (!node) {
            return false;
        }
        var ancestor = node.parentNode;
        while (ancestor !== null) {
            if (ancestor.tagName === tagName) {
                return true;
            }
            ancestor = ancestor.parentNode;
        }
        return false;
    };

    /**
     * Create a branch with all the formatting elements that need to be added to re-create the original formatting of a removed text node
     *
     * @private
     * @param {Node} nodeToInsert - the copy of the text node that was removed
     * @param {Array} ancestorsOfNodeToInsert - an array of HtmlElement containing the relevant ancestors from the removed node in the old DOM tree
     * @param {Node} referenceNodeInNewDom - existing node in the new DOM tree that is known to be positioned immediately before or after the removed node
     * @returns {Node} - the root node of the branch to be inserted into the new DOM tree
     */
    var createBranchToInsert = function(nodeToInsert, ancestorsOfNodeToInsert, referenceNodeInNewDom) {

        // check if the reference node still is in the same formatting context now then it was in the previous version
        var referenceNodeStillHasSameCommonAncestor = hasAncestorWithTagName(referenceNodeInNewDom, ancestorsOfNodeToInsert[0].tagName);

        // if there was only one relevant ancestor found in the previous version (the common parent with the reference node)
        if (ancestorsOfNodeToInsert.length === 1) {
            // check if the node was removed from a first-level element (e.g. a <p> or <ul>)
            var ancestorIsParagraphLevel = ancestorsOfNodeToInsert[0].parentNode && ancestorsOfNodeToInsert[0].parentNode.parentNode === null;
            // if it isn't then it was wrapped in another formatting element that should be re-created
            // *unless* this formatting tag is already present at the reference node in the new version
            if (!ancestorIsParagraphLevel && !referenceNodeStillHasSameCommonAncestor) {
                // This edge case can happen if the reference node *used* to be in the same formatted section as the reference text (in the previous version)
                // but the reference text is now outside of this formatting, so we wrap the removed text content with a copy of the formatting element
                var formattingElement = ancestorsOfNodeToInsert[0].cloneNode();
                formattingElement.appendChild(nodeToInsert);
                return formattingElement;
            }
            return nodeToInsert;
        }

        // usually all elements *between* the original shared ancestor and the text nodes need to be re-created
        var recreateFrom = 1;
        // but if the reference text is now in a different context (e.g. moved from a list to a paragraph),
        // we need to re-create the original shared ancestor as well
        if (referenceNodeInNewDom && !referenceNodeStillHasSameCommonAncestor) {
            recreateFrom = 0;
        }

        var branchRoot = ancestorsOfNodeToInsert[recreateFrom].cloneNode();
        var insertTarget = branchRoot;
        for (var b = recreateFrom + 1; b < ancestorsOfNodeToInsert.length; b++) {
            var branchNode = ancestorsOfNodeToInsert[b].cloneNode();
            insertTarget.appendChild(branchNode);
            insertTarget = branchNode;
        }
        insertTarget.appendChild(nodeToInsert);

        return branchRoot;
    };

    /**
     * Find the node in the new DOM tree that should be the sibling of the highlighted removed node being copied over.
     * This can either be the reference node itself, or any of its ancestor elements.
     *
     * @private
     * @param {Node} referenceNode - existing node in the new DOM tree that is known to be positioned immediately before or after the removed node
     * @param {Array} ancestorsOfNodeToInsert - an array of HtmlElement containing the relevant ancestors from the removed node in the old DOM tree
     * @returns {Node} - the designated sibling of the removed content node to be copied
     */
    var findBestInsertPositionInAncestors = function(referenceNode, ancestorsOfNodeToInsert) {

        var candidate;
        // if there was only one relevant ancestor found in the previous version
        // then only the text node needs to be copied over to the current version DOM
        if (ancestorsOfNodeToInsert.length === 1) {

            // in that case, the best insert position is found by going up all parents of the reference node
            // until we find an element with the same name as the original parent of the removed node
            candidate = referenceNode;
            while (candidate.parentNode !== null) {
                if (candidate.parentNode.tagName === ancestorsOfNodeToInsert[0].tagName) {
                    return candidate;
                }
                candidate = candidate.parentNode;
            }

            // if such an element cannot be found, then fall back to inserting the removed node immediately before/after the reference node node
            return referenceNode;
        }

        var elementAndAllAncestorsHaveSameName = function(candidateParent, previousParent) {
            // break out if the names of the given elements are different
            if (candidateParent.tagName !== previousParent.tagName) {
                return false;
            }
            // otherwise also compare the names of the parent nodes
            if (candidateParent.parentNode && previousParent.parentNode) {
                return elementAndAllAncestorsHaveSameName(candidateParent.parentNode, previousParent.parentNode);
            }
            // if there are no parents available, but all names have matched so far we have found a good candidate
            return true;
        };

        // if a longer structure was removed, finding the insert position can be more tricky.
        // For example if a list item was removed, ancestorsOfNodeToInsert will contain [ul, li] elements -
        // so this method should return the li element within an ul element *at the same level* as the original ul element

        // again we start with the reference node and go up all parents until we find something
        candidate = referenceNode;
        while (candidate.parentNode !== null) {
            // the candidate is the best match if its parent have the same name (and ancestors of the same name)
            // as the first item in the list of relevant ancestors from the removed node
            if (elementAndAllAncestorsHaveSameName(candidate.parentNode, ancestorsOfNodeToInsert[0])) {
                break;
            }
            // we need to stop iterating if this candidate only has one more parent (the root div)
            if (!candidate.parentNode.parentNode) {
                break;
            }
            candidate = candidate.parentNode;
        }

        return candidate;
    };

    var isEmptyParagraph = function(delta) {
        // if an empty paragraph is removed, then the text node will contain only a single space.
        var isSingleSpace = (delta.oldText === '\u00A0' || delta.oldText === ' ');

        // as there could be other content in the paragraph, check if the innerText really consists of that single space
        var isOnlyTextInParagraph = delta.oldNode.parentNode.innerText.length === 1;

        // empty fragments are an exception as they contain only a single nbsp and a new line without wrapping paragraph,
        // they should also be treated as an empty paragraph
        var isTextNodeOnRootLevel = !delta.oldNode.parentNode.parentNode

        return isSingleSpace && (isOnlyTextInParagraph || isTextNodeOnRootLevel);
    };

    var isRemovedDeltaToBeHighlighted = function(delta) {
        // only process nodes that were removed in the current version
        if (!delta.removed) {
            return false;
        }

        // ignore removed text nodes that only contain new lines
        if (delta.oldText === '\n') {
            return false;
        }

        // removal of empty paragraphs is considered a formatting change,
        // and therefore these nodes shouldn't be added and highlighted in the current version
        if (isEmptyParagraph(delta)) {
            return false;
        }

        return true;
    };

    /**
     * Copies the removed text nodes from the previous version to the right position of the current version DOM,
     * and re-creates additional element structures from the previous version if they are not present in the current version.
     *
     * @private
     * @param {Array} deltas - the array of split and matched deltas as returned by splitAndMatchDeltasWithCorrespondingTextNodes
     * @returns {undefined} - nothing
     */
    var copyRemovedNodesIntoNewDomTree = function (deltas) {

        for (var i = 0; i < deltas.length; i++) {
            var currDelta = deltas[i];

            // only process deltas which represent removed text nodes that should be highlighted in the new DOM tree
            if (!isRemovedDeltaToBeHighlighted(currDelta)) {
                continue;
            }

            // copy the text node from the previous version
            var nodeToInsert = currDelta.oldNode.cloneNode();

            // to insert the removed text node in the current version, we need to know the target position in the DOM

            // first find the previous and following deltas for which the corresponding text node is known
            // for the current *and* previous version - the text nodes of one of those deltas will be used as a reference point
            var prevDelta = findPrevDeltaWithKnownPosition(deltas, i);
            var nextDelta = findNextDeltaWithKnownPosition(deltas, i);

            // in scenarios where the whole content of a fragment was replaced, there might be no reference position
            if (prevDelta === null && nextDelta === null) {
                // in that case, just insert all elements wrapping the current text node into the main div at the root level of the CFM
                var rootElement = findRootElementOfNewDom(deltas);
                var ancestors = collectAncestors(currDelta.oldNode);
                var branchToInsertOnRootLevel = createBranchToInsert(nodeToInsert, ancestors);
                rootElement.appendChild(branchToInsertOnRootLevel);
                currDelta.newNode = nodeToInsert;
                continue;
            }

            // for each of the two possible "reference points", look in the *previous* version DOM to find a common ancestor element,
            // and identify which additional elements are between that common parent and the text node to be copied
            var ancestorsWithPrevDeltaReference = prevDelta !== null ? findCommonAncestorAndElementsBetween(currDelta.oldNode, prevDelta.oldNode) : null
            var ancestorsWithNextDeltaReference = nextDelta !== null ? findCommonAncestorAndElementsBetween(currDelta.oldNode, nextDelta.oldNode) : null;

            // now decide whether to use the reference point from the previous or next delta
            var insertAfterPrevious;
            if (ancestorsWithPrevDeltaReference && ancestorsWithNextDeltaReference) {
                // if the array of ancestors is shorter (or equal) when using the *previous* delta as reference, then this means the removed text node to be copied
                // belongs to the same DOM branch as the previous delta. If it's longer then it's better to us the next delta as reference point
                insertAfterPrevious = ancestorsWithPrevDeltaReference.length <= ancestorsWithNextDeltaReference.length;
            } else {
                // only one reference is available (we've handled the case when both are null earlier), so use the one that is available
                insertAfterPrevious = ancestorsWithPrevDeltaReference !== null;
            }

            var ancestorsOfNodeToInsert = insertAfterPrevious ? ancestorsWithPrevDeltaReference : ancestorsWithNextDeltaReference;
            var referenceNode = insertAfterPrevious ? prevDelta.newNode : nextDelta.newNode;

            // create any additional required markup elements around the text node (that are not yet present in the new version)
            var branchToInsert = createBranchToInsert(nodeToInsert, ancestorsOfNodeToInsert, referenceNode);

            // if both possible reference nodes have the same parent then this means the target DOM structure is flat at the insert position
            // and we can insert the removed branch immediately before or after the reference node
            var bothReferenceNodesHaveSameParent = prevDelta !== null && nextDelta !== null && prevDelta.newNode.parentNode === nextDelta.newNode.parentNode;
            // If they don't have the same parent then this means the branch needs to be inserted between two existing DOM branches.
            // To properly re-construct the DOM structure of the removed element (and not introduce duplicate elements) we'll have to find
            // the right ancestor element of the reference node
            var insertPositionNode = bothReferenceNodesHaveSameParent ? referenceNode : findBestInsertPositionInAncestors(referenceNode, ancestorsOfNodeToInsert);

            // finally we can insert the branch containing the removed text node before or after that insert position
            if (insertAfterPrevious) {
                insertNodeAfter(branchToInsert, insertPositionNode);
            } else {
                insertNodeBefore(branchToInsert, insertPositionNode);
            }

            // and add the node we just inserted to the delta so it can be highlighted in the current version
            currDelta.newNode = nodeToInsert;
        }
    };

    /**
     * Wrap all text nodes in the current version that were identified to be added, removed or modified with
     * a ins, del or mark element.
     *
     * @private
     * @param {Array} deltas - the array of split and matched deltas as returned by splitAndMatchDeltasWithCorrespondingTextNodes
     * @returns {undefined} - nothing
     */
    var highlightChangesInNewDomTree = function (deltas) {

        var wrapWithElement = function(textNode, elementName) {
            var wrapper = document.createElement(elementName);
            textNode.parentNode.insertBefore(wrapper, textNode);
            wrapper.appendChild(textNode);
        };

        for (var i = 0; i < deltas.length; i++) {

            var node = deltas[i].newNode;
            // for some removed deltas, we didn't copy over a text node
            if (!node) {
                continue;
            }

            // newlines or empty text nodes (that can occur for modified deltas) can be removed from the highlighted doms
            var isSingleNewLine = node.nodeValue === '\n';
            var isEmpty = node.nodeValue.length === 0;
            if (isSingleNewLine || isEmpty) {
                node.parentNode.removeChild(node);
                continue;
            }

            // all all other deltas that should be highligted are wrapped with the right element
            if (deltas[i].added) {
                wrapWithElement(node, 'ins');
            } else if (deltas[i].modified) {
                wrapWithElement(node, 'mark');
            } else if (deltas[i].removed) {
                wrapWithElement(node, 'del');
            }
        }
    };

   /**
     * Identifies all differences in the text content of the two given DOM trees, and creates
     * a new DOM tree with additional ins, mark and del element to highlight text nodes that
     * were added, modified or removed.
     *
     * @param {HTMLElement} newElement - a DOM tree with the current version's content fragment HTML
     * @param {HTMLElement} oldElement - a DOM tree with the previous version's content fragment HTML
     * @returns {HTMLElement} - a new DOM tree with additional ins/mark/del elements for highlighting
     */
    ns.DiffHighlighting.createElementWithHighlightedChanges = function(newElement, oldElement) {

        // clone the given DOM trees to avoid manipulating the input parameters
        var newDomTree = newElement.cloneNode(true);
        var oldDomTree = oldElement.cloneNode(true);

        // detect differences in the plain text content of both elements
        var deltas = calculatePlainTextDeltas(newDomTree, oldDomTree);

        // diff results and text nodes in the DOM trees will be in the same order, but are split at different positions.
        // Address this by splitting the deltas and text nodes so that each delta corresponds to a single text node.
        var splitAndMatchedDeltas = splitAndMatchDeltasWithCorrespondingTextNodes(deltas, newDomTree, oldDomTree);

        // for all text that was removed, a text node (or branch with formatting elements) has to be inserted into the current version dom
        copyRemovedNodesIntoNewDomTree(splitAndMatchedDeltas);

        // then wrap all text nodes to be higlighted with <ins>, <del>, or <mark> elements
        highlightChangesInNewDomTree(splitAndMatchedDeltas);

        return newDomTree;
    };

})($, window.Dam.CFM);
