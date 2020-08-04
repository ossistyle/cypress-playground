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
;(function ($, ns) {
  "use strict";

  Granite.UI = Granite.UI || {};
  
  var ELLIPSIS = "\u2026";

  var Shortener = function (el, options) {
    this.el = $(el);

    options = $.extend({
      keepHost: false,
      stripProtocol: true
    }, this.el.data(), options);

    this.stripProtocol = options.stripProtocol;
    this.keepHost      = options.keepHost;

    this.text = this.el.text().replace(/\s/gm, '');
  };

  Shortener.prototype.applyCss = function () {
    // Cause content to break at end of line, so that we may test if content was
    // successfully shortened.
    this.el.css({
      "word-wrap": "break-word",
      "display": "inline-block",
      "overflow": "hidden",
      "width": "100%"
    });
  };

  Shortener.prototype.removeCss = function () {
    this.el.css({
      "word-wrap": "",
      "display": "",
      "overflow": "",
      "width": ""
    });
  };

  Shortener.prototype.shortenText = function (text) {
    text = text.replace(/^\//, '');

    var match = text.match(/^[^\/]+(\/.*)/);

    if (match) {
      text = match[1];
    }
    else {
      text = text.slice(1).replace(/^\//, "");
    }

    return text;
  };

  Shortener.prototype.setText = function (protocol, host, path) {
    if (host) {
      if (host.length && path === "/") {
        path = "";
      }

      path = host + "/" + path;
    }

    this.el.text(protocol + path);
  };

  Shortener.prototype.shorten = function () {
    var minHeight, match, protocol, host, path;

    if (this.el.height() === 0) {
      // Element hidden. No possibility to measure if shortening is needed.
      return;
    }

    // add full URL to title before breaking stuff
    this.el.attr("title", this.text);

    // decypher text, looking for host and protocol
    match = this.text.match(/^(([^:]*:\/\/)([^\/]+))(.*)$/);

    if (match) {
      protocol = match[2];
      host = match[3];
      path = match[4];

      if (host.length && !this.keepHost) {
        path = host + path;
        host = "";
      }
      if (this.stripProtocol) {
        protocol = "";
      }
    }
    else {
      protocol = '';
      host = '';
      path = this.text;
    }


    // We'll shorten the url until link is short enough to fit into one line.
    // Therefore we need to measure, how tall a single line actually is.
    this.applyCss();
    this.el.text("-");
    minHeight = this.el.height();
    this.setText(protocol, host, path);


    // Shorten path
    while (this.el.height() > minHeight && path.length) {
      path = this.shortenText(path);

      this.setText(protocol, host, ELLIPSIS + path);
    }

    this.removeCss();


    // TODO: Might be, that the host itself is too long and does not fit into
    // a single line. We would need to shorten the host, starting from the end.
  };

  ns.Shortener = Shortener;
  Granite.UI.Shortener =  Shortener;
}(jQuery, Granite.References));

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
;(function ($, ns) {
  "use strict";

  var typesToShorten = [];

  ns.shortenedLinks = {
    registerType : function (type) {
      if ($.inArray(type, typesToShorten) === -1) {
        typesToShorten.push(type);
      }
    }
  };

  ns.$root.on(ns.EVENT_RESIZE, function () {
    if ($.inArray(ns.$root.data("type"), typesToShorten) === -1) {
      return;
    }

    ns.$detailList.find(".shortenpath").each(function () {
      var el = $(this);
      if (el.data("shortened")) {
        return;
      }

      (new ns.Shortener(el)).shorten();

      el.data("shortened", true);
    });
  });

}(jQuery, Granite.References));

