/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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

// AdobePatentID="3657US01"

// ensure granite namespace is setup
Granite = window.Granite || {};
Granite.UI = Granite.UI || {};

// static helpers
Granite.UI.Annotation = {

    /**
     * Default mapping from viewport to DV chart's coordinate space
     * @param p
     * @param chart the DV chart
     * @param fixed controls if a fixed or train scale is used.
     * @return {*}
     */
    // eslint-disable-next-line camelcase
    DV_V2DMapping: function(p, chart, fixed) {
        "use strict";
        // console.log("--> v2d mapping", p.x, p.y, fixed);
        if (chart) {
            var padding = chart.plotBounds();
            if (fixed) {
                // normalize to 1000x1000
                p.x = (p.x - padding.left) / chart.plotWidth() * 1000;
                p.y = (p.y - padding.top) / chart.plotHeight() * 1000;
            } else {
                var xScale = chart.getTrainedScale("x");
                var yScale = chart.getTrainedScale("y");
                p.x = xScale.invertValue(p.x - padding.left);
                p.y = yScale.invertValue(p.y - padding.top);
            }
        }
        // console.log("<-- v2d mapping", p.x, p.y, fixed);
        return p;
    },

    /**
     * Default mapping from DV chart's to viewport coordinate space
     * @param p
     * @param chart the DV chart
     * @param fixed controls if a fixed or train scale is used.
     * @return {*}
     */
    // eslint-disable-next-line camelcase
    DV_D2VMapping: function(p, chart, fixed) {
        "use strict";
        // console.log("--> d2v mapping", p.x, p.y, fixed);
        if (chart) {
            var padding = chart.plotBounds();
            if (fixed) {
                // normalize from 1000x1000
                p.x = padding.left + p.x / 1000 * chart.plotWidth();
                p.y = padding.top + p.y / 1000 * chart.plotHeight();
            } else {
                var xScale = chart.getTrainedScale("x");
                var yScale = chart.getTrainedScale("y");
                // hack to detect serialized dates
                if (typeof p.x === "string" && p.x.match(/\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.*/)) {
                    p.x = new Date(p.x);
                }
                p.x = xScale.mapValue(p.x) + padding.left;
                p.y = yScale.mapValue(p.y) + padding.top;
            }
        }
        // console.log("<-- d2v mapping", p.x, p.y, fixed);
        return p;
    }
};

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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

// AdobePatentID="3657US01"

// ensure granite namespace is setup
Granite = window.Granite || {};
Granite.UI = Granite.UI || {};

// shape to draw on canvas using SVG paths to serialize data
// http://www.w3.org/TR/SVG/paths.html
Granite.UI.Annotation.Shape = function() {
    "use strict";

    // supported:
    // M: moveTo x,y
    // Z: closePath
    // L: lineTo x,y
    // C: bezierCurveTo x1 y1 x2 y2 x y
    // Q: quadraticCurveTo x1 y1  x y

    function cmdClosePath(ctx) {
        ctx.closePath();
    }
    function cmdMoveTo(ctx, x, y) {
        ctx.moveTo(x, y);
    }
    function cmdLineTo(ctx, x, y) {
        ctx.lineTo(x, y);
    }
    function cmdBezierTo(ctx, x0, y0, x1, y1, x, y) {
        ctx.bezierCurveTo(x0, y0, x1, y1, x, y);
    }
    function cmdQuadTo(ctx, x0, y0, x, y) {
        ctx.quadraticCurveTo(x0, y0, x, y);
    }

    function getArgs(/* Array */ points, /* int */ idx, /* int */ len) {
        var ret = [ null ];
        for (var i = 0; i < len; i++) {
            ret[i + 1] = Math.round(+points[ idx + i ]);
        }
        return ret;
    }

    return {
        lineWidth: 1,
        strokeStyle: null,
        fillStyle: null,
        type: "",
        domainBox: null,
        box: null,
        chrs: [],
        cmds: [],
        args: [],

        constructor: function(svgPath, bb, type) {
            if (svgPath) {
                this.addPath(svgPath);
            }
            this.box = bb || { x0: 0, y0: 0, x1: 0, y1: 0 };
            if (type) {
                this.type = type;
            }
            return this;
        },

        stroke: function(/* CanvasContext */ ctx) {
            ctx.beginPath();
            this.drawPath(ctx);
            ctx.stroke();
        },

        fill: function(/* CanvasContext */ ctx) {
            ctx.beginPath();
            this.drawPath(ctx);
            ctx.fill();
        },

        draw: function(/* CanvasContext */ ctx) {
            ctx.save();
            ctx.translate(this.box.x0, this.box.y0);
            if (this.fillStyle) {
                ctx.fillStyle = this.fillStyle;
                this.fill(ctx);
            }
            if (this.strokeStyle) {
                ctx.lineWidth = this.lineWidth;
                ctx.strokeStyle = this.strokeStyle;
                this.stroke(ctx);
            }
            ctx.restore();
        },

        drawPath: function(/* CanvasContext */ ctx) {
            for (var i = 0; i < this.cmds.length; i++) {
                var args = this.args[i];
                // little hack to pass the args. actually it would be easier to call the CTX directly, but we
                // can't resolve to the canvas context without an object.
                args[0] = ctx;
                this.cmds[i].apply(this, args);
                args[0] = null;
            }
        },

        toObject: function() {
            var obj = {
                path: this.toSVGPath(),
                box: this.box
            };
            if (this.strokeStyle) {
                obj.strokeStyle = this.strokeStyle;
                obj.lineWidth = this.lineWidth;
            }
            if (this.fillStyle) {
                obj.fillStyle = this.fillStyle;
            }
            if (this.domainBox) {
                obj.domainBox = this.domainBox;
            }
            if (this.type) {
                obj.type = this.type;
            }
            return obj;
        },

        clear: function() {
            this.cmds = [];
            this.args = [];
            this.chrs = [];
            this.box = { x0: 0, y0: 0, x1: 0, y1: 0 };
            this.lineStyle = null;
            this.fillStyle = null;
        },

        toSVGPath: function() {
            // todo: calculate when adding commands
            var ret = "";
            for (var i = 0; i < this.cmds.length; i++) {
                if (i > 0) {
                    ret += " ";
                }
                ret += this.chrs[i];
                var args = this.args[i];
                for (var j = 1; j < args.length; j++) {
                    ret += " " + args[j];
                }
            }
            return ret;
        },

        addCommand: function(/* String */ cmd, points, idx) {
            switch (cmd) {
                case "Z":
                    this.cmds.push(cmdClosePath);
                    this.args.push([ null ]);
                    this.chrs.push(cmd);
                    return 0;
                case "M":
                    this.cmds.push(cmdMoveTo);
                    this.args.push(getArgs(points, idx, 2));
                    this.chrs.push(cmd);
                    return 2;
                case "L":
                    this.cmds.push(cmdLineTo);
                    this.args.push(getArgs(points, idx, 2));
                    this.chrs.push(cmd);
                    return 2;
                case "C":
                    this.cmds.push(cmdBezierTo);
                    this.args.push(getArgs(points, idx, 6));
                    this.chrs.push(cmd);
                    return 6;
                case "Q":
                    this.cmds.push(cmdQuadTo);
                    this.args.push(getArgs(points, idx, 4));
                    this.chrs.push(cmd);
                    return 4;
                default:
                    console.log("unknown command", cmd); // eslint-disable-line no-console
                    return 0;
            }
        },

        addPath: function(/* String */ svgPath) {
            var cs = svgPath.split(/\s+/);
            for (var i = 0; i < cs.length; i++) {
                i += this.addCommand(cs[i], cs, i + 1);
            }
        }
    }.constructor(arguments[0], arguments[1], arguments[2]);
};

Granite.UI.Annotation.Shape.fromObject = function(obj, d2vMapping, scope) {
    "use strict";

    var shp;
    if (obj.domainBox && d2vMapping) {
        // remap box to viewport
        var dBox = obj.domainBox;
        var p0 = d2vMapping.call(scope, { x: dBox.x0, y: dBox.y0 });
        var p1 = d2vMapping.call(scope, { x: dBox.x1, y: dBox.y1 });
        var box = { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y };
        // create a special annotation shape
        if (obj.type === "arrow") {
            var p2 = d2vMapping.call(scope, { x: dBox.ctlx, y: dBox.ctly });
            box.ctlx = p2.x;
            box.ctly = p2.y;
            shp = Granite.UI.Annotation.Shape.createArrow(box);
        } else if (obj.type === "ellipse") {
            shp = Granite.UI.Annotation.Shape.createEllipse(box);
        }
    }
    // otherwise just create a new shape
    if (!shp) {
        shp = new Granite.UI.Annotation.Shape(obj.path, obj.box, obj.type);
    }
    if (obj.fillStyle) {
        shp.fillStyle = obj.fillStyle;
    }
    if (obj.strokeStyle) {
        shp.strokeStyle = obj.strokeStyle;
        shp.lineWidth = obj.lineWidth || 1;
    }
    if (obj.domainBox) {
        shp.domainBox = obj.domainBox;
    }
    return shp;
};

Granite.UI.Annotation.Shape.createArrow = function(bb, v2dMapping) {
    "use strict";

    function rotate(px, py, idx, len, a) {
        var sina = Math.sin(a);
        var cosa = Math.cos(a);
        while (len-- > 0) {
            var xx = cosa * px[idx] - sina * py[idx];
            var yy = sina * px[idx] + cosa * py[idx];
            px[idx] = xx;
            py[idx++] = yy;
        }
    }

    function translate(px, py, idx, len, dx, dy) {
        while (len-- > 0) {
            px[idx] += dx;
            py[idx++] += dy;
        }
    }

    //
    //       2
    //       |\
    // 0-----1 \
    // |        3
    // 6-----5 /
    //       |/
    //       4
    if (!bb.l) {
        var pw = bb.x0 - bb.x1;
        var ph = bb.y0 - bb.y1;
        bb.l = Math.sqrt(pw * pw + ph * ph);
    }
    var scale = Math.min(1.0, bb.l / 100.0);
    var aih = 5 * scale; // arrow inner height (p5-p1)
    var ah = 15 * scale; // arrow height (p4-p2)
    var aw = 20 * scale; // arrow width (p3-p1)
    var sh = 2 * scale; // arrow base height (p6-p0)
    var acw = 3; // arrow curve width
    var rot = Math.atan2(bb.y1 - bb.y0, bb.x1 - bb.x0);
    var cx;
    var cy;
    var ctlx;
    var ctly;
    var cax;
    var cay;

    if (bb.ctlx) {
        // rotate the control points back
        cax = [ ctlx = bb.ctlx ];
        cay = [ ctly = bb.ctly ];
        rotate(cax, cay, 0, 1, -rot);
        cx = cax[0];
        cy = cay[0];
    } else {
        cx = bb.l / 2; // cubic curve control point x
        cy = bb.maxD * 2; // cubic curve control point y
        // calculate the control point coordinates for reverse mapping
        cax = [ cx ];
        cay = [ cy ];
        rotate(cax, cay, 0, 1, rot);
        ctlx = cax[0];
        ctly = cay[0];
    }

    // tangent angle of curve into arrow
    var a = Math.atan2(-cy, bb.l - cx);

    // define the points (note p2 - p5 are still based at 0/0)
    //          p0     cp0    p1   p2  p3  p4   p5     pc1  p6
    var ax = [ 0, cx, 0, 0, aw, 0, 0, cx, 0 ];
    var ay = [ -sh, cy - acw, -aih, -ah, 0, ah, aih, cy + acw, sh ];

    // rotate arrow points p1-p5, centered at 0 / 0
    rotate(ax, ay, 2, 5, a);
    // and move them to the end of the line
    translate(ax, ay, 2, 5, bb.l, 0);

    // transform entire arrow along the drawing line
    rotate(ax, ay, 0, ax.length, rot);

    // translate all points to beginning of line
    // translate(ax, ay, 0, ax.length, bb.px0, bb.py0);

    // create SVG path
    var svgPath = "";
    for (var i = 0; i < ax.length; i++) {
        if (i === 0) {
            svgPath += "M " + ax[i] + " " + ay[i] + " ";
        } else if (i === 1 || i === 7) {
            svgPath += "Q " + ax[i] + " " + ay[i] + " " + ax[i + 1] + " " + ay[i + 1] + " ";
            i++;
        } else {
            svgPath += "L " + ax[i] + " " + ay[i] + " ";
        }
    }
    svgPath += "Z";
    return new Granite.UI.Annotation.Shape(svgPath, {
        x0: bb.x0,
        y0: bb.y0,
        x1: bb.x1,
        y1: bb.y1,
        ctlx: ctlx,
        ctly: ctly
    }, "arrow");
};

Granite.UI.Annotation.Shape.createEllipse = function(bb, v2dMapping) {
    "use strict";

    var w = bb.x1 - bb.x0;
    var h = bb.y1 - bb.y0;
    var kappa = 0.5522848;
    var ox = (w / 2) * kappa; // control point offset horizontal
    var oy = (h / 2) * kappa; // control point offset vertical
    var xm = w / 2; // x-middle
    var ym = h / 2; // y-middle

    var shape = new Granite.UI.Annotation.Shape(null, bb, "ellipse");
    shape.addCommand("M", [ 0, ym ], 0);
    shape.addCommand("C", [ 0, ym - oy, xm - ox, 0, xm, 0 ], 0);
    shape.addCommand("C", [ xm + ox, 0, w, ym - oy, w, ym ], 0);
    shape.addCommand("C", [ w, ym + oy, xm + ox, h, xm, h ], 0);
    shape.addCommand("C", [ xm - ox, h, 0, ym + oy, 0, ym ], 0);
    shape.addCommand("Z");
    return shape;
};

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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

// AdobePatentID="3657US01"

// virtual canvas where an annotation is drawn
Granite.UI.Annotation.Canvas = function() {
    "use strict";

    return {
        ctx: null,
        px: [],
        py: [],
        bb: {
            x0: 0,
            y0: 0, // origin corner of bounding box
            x1: 0,
            y1: 0, // end corner of bounding box
            px0: 0,
            py0: 0, // start of drawing
            px1: 0,
            py1: 0, // end of drawing
            w: 0,
            h: 0, // width and height of bounding box
            cx: 0,
            cy: 0, // center of bounding box
            l: 0, // length of diagonal
            avgD: 0, // avg line distance,
            maxD: 0, // max line distance,
            type: "" // detected annotation type. 'a' == arrow, 'e' == ellipse
        },
        color: "#ffcc00",

        constructor: function(ctx) {
            this.ctx = ctx;
            return this;
        },

        addPoint: function(x, y) {
            var len = this.px.length;
            this.px[len] = x;
            this.py[len++] = y;
        },

        clear: function() {
            this.px = [];
            this.py = [];
            this.bb.w = 0;
        },

        calc: function() {
            var px = this.px;
            var py = this.py;
            var bb = this.bb;
            var len = px.length;
            var x;
            var y;
            if (len > 1) {
                // calculate bounding box.
                bb.x0 = bb.x1 = px[0];
                bb.y0 = bb.y1 = py[0];
                for (var i = 1; i < len; i++) {
                    x = px[i];
                    y = py[i];
                    if (x < bb.x0) {
                        bb.x0 = x;
                    }
                    if (x > bb.x1) {
                        bb.x1 = x;
                    }
                    if (y < bb.y0) {
                        bb.y0 = y;
                    }
                    if (y > bb.y1) {
                        bb.y1 = y;
                    }
                }
                bb.w = bb.x1 - bb.x0;
                bb.h = bb.y1 - bb.y0;

                // calculate center
                bb.cx = bb.x0 + bb.w / 2;
                bb.cy = bb.y0 + bb.h / 2;

                // start and end points
                bb.px0 = px[0];
                bb.py0 = py[0];
                bb.px1 = px[len - 1];
                bb.py1 = py[len - 1];
                var pw = bb.px0 - bb.px1;
                var ph = bb.py0 - bb.py1;
                bb.l = Math.sqrt(pw * pw + ph * ph);
                // adjust corners, we want p0 to be the point the drawing started.
                var t;
                if (bb.px0 > bb.px1) {
                    t = bb.x0;
                    bb.x0 = bb.x1;
                    bb.x1 = t;
                }
                if (bb.py0 > bb.py1) {
                    t = bb.y0;
                    bb.y0 = bb.y1;
                    bb.y1 = t;
                }

                // calculate avg distances from points to the line from start to end point
                // var a = y0 - y1, b = x1 - x0, c = x0 * y1 - y0 * x1;
                var a = bb.py0 - bb.py1;
                var b = bb.px1 - bb.px0;
                var c = bb.px0 * bb.py1 - bb.py0 * bb.px1;
                var d = Math.sqrt(a * a + b * b);
                var dist = 0;
                var maxD = 0;
                var maxS = 1;
                for (i = 0; i < len; i++) {
                    // distance to line
                    x = px[i];
                    y = py[i];
                    var dss = a * x + b * y + c;
                    var ds = Math.abs(dss) / d;
                    if (ds > maxD) {
                        maxD = ds;
                        maxS = dss > 0 ? 1 : -1;
                    }
                    dist += ds;
                }
                bb.avgD = dist / len;
                bb.maxD = maxS * maxD;
                bb.type = bb.avgD / bb.l < 0.2 ? "a" : "e";
            }
        },

        getShape: function() {
            var bb = this.bb;
            var shp = null;
            if (bb.w > 0) {
                if (bb.type === "a") {
                    // draw arrow
                    shp = Granite.UI.Annotation.Shape.createArrow({
                        x0: bb.px0,
                        y0: bb.py0,
                        x1: bb.px1,
                        y1: bb.py1,
                        l: bb.l,
                        maxD: bb.maxD
                    });
                    shp.strokeStyle = this.color;
                    shp.lineWidth = 1;
                    shp.fillStyle = this.color;
                } else {
                    // draw bounding ellipse
                    var x0 = Math.min(bb.x0, bb.x1);
                    var y0 = Math.min(bb.y0, bb.y1);
                    var normBB = {
                        x0: x0,
                        y0: y0,
                        x1: x0 + bb.w,
                        y1: y0 + bb.h
                    };
                    shp = Granite.UI.Annotation.Shape.createEllipse(normBB);
                    shp.strokeStyle = this.color;
                    shp.lineWidth = 5;
                    shp.fillStyle = null;
                }
            }
            return shp;
        },

        draw: function(showWires) {
            var px = this.px;
            var py = this.py;
            var bb = this.bb;
            var ctx = this.ctx;
            if (px.length === 0 && bb.w === 0) {
                return;
            }
            if (showWires && px.length > 0) {
                // draw bounding box
                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(0,255,0,0.9)";
                ctx.beginPath();
                ctx.moveTo(bb.x0, bb.y0);
                ctx.lineTo(bb.x1, bb.y0);
                ctx.lineTo(bb.x1, bb.y1);
                ctx.lineTo(bb.x0, bb.y1);
                ctx.closePath();
                ctx.stroke();
            }
            var shp = this.getShape();
            if (shp) {
                shp.draw(ctx);
            }
            if (px.length > 0) {
                // draw user input
                ctx.strokeStyle = "rgba(128,128,128,0.8)";
                ctx.lineWidth = 5;
                ctx.lineCap = "round";
                ctx.beginPath();
                for (var i = 0; i < px.length; i++) {
                    if (i === 0) {
                        ctx.moveTo(px[0], py[0]);
                    } else {
                        ctx.lineTo(px[i], py[i]);
                    }
                }
                if (px.length === 1) {
                    ctx.lineTo(px[0] + 1, py[0] + 1);
                }
                ctx.stroke();
            }
        }

    }.constructor(arguments[0]);
};

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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

// helper event that enables resize events on all HTML elements
// todo: move to granite shared ?

(function($) {
    "use strict";

    // A collection of elements to which the resize event is bound.
    var elements = $([]);

    // An id with which the polling loop can be canceled.
    var timeoutId;

    // Special event definition.
    $.event.special.resize = {
        setup: function() {
            var $elem = $(this);

            // Add this element to the internal collection.
            elements = elements.add($elem);

            // Initialize default plugin data on this element.
            $elem.data("resize", { w: $elem.width(), h: $elem.height() });

            // If this is the first element to which the event has been bound,
            // start the polling loop.
            if (elements.length === 1) {
                poll();
            }
        },
        teardown: function() {
            var $elem = $(this);

            // Remove this element from the internal collection.
            elements = elements.not($elem);

            // Remove plugin data from this element.
            $elem.removeData("resize");

            // If this is the last element to which the event was bound, cancel
            // the polling loop.
            if (!elements.length) {
                clearTimeout(timeoutId);
            }
        }
    };

    // As long as a "resize" event is bound, this function will execute
    // repeatedly.
    function poll() {
        // Iterate over all elements in the internal collection.
        elements.each(function() {
            var $elem = $(this);
            var data = $elem.data("resize");
            var width = $elem.width();
            var height = $elem.height();

            // If element size has changed since the last time, update the element
            // data store and trigger the "resize" event.
            if (width !== data.w || height !== data.h) {
                data.w = width;
                data.h = height;
                $elem.triggerHandler("resize");
            }
        });

        // Poll, setting timeoutId so the polling loop can be canceled.
        timeoutId = setTimeout(poll, 250);
    }
/* global jQuery:false */
})(jQuery);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2012 Adobe
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

// AdobePatentID="3657US01"

/**
 * jquery annotation plugin.
 *
 * Implementation note regarding domain/view mapping:
 * ==================================================
 *
 * When drawing a shape on an image or chart, the shape position and size
 * (i.e. bounding box) in domain coordinates and the dimensions of the current
 * viewport needs to be stored. When the shape needs to be rendered again
 * for a different domain scaling, eg. when the chart is resized, moved, scaled,
 * or if the image is resized, the bounding box and mapping information needs to
 * be reversed.
 * In order to simplify the chart and image use case, we assume that
 * the image has virtual domain dimensions of 1000x1000, so we don't need to know
 * the real image dimensions, and we can store the bounding box of the shape only
 * in domain coordinates.
 *
 * Example:
 * Viewport while creating: 600x400 (Wv x Hv)
 * Real image dimensions:  1200x800 (Wr x Hr)
 * Virtual dimensions 1000x1000 (Wi x Hi)
 *
 * Drawn shape in vp at (100,100):
 *   Xv = 100, Xi = Xv * (Wi / Wv) = 100 * (1000/600) = 166.6
 *   Yv = 100, Yi = Yv * (Hi / Hv) = 100 * (1000/400) = 250
 *
 * Resized Viewport while drawing: 1200x800
 *   Xi = 166.6, Xv = Xi * (Wv / Wi) = 166.6 * (1200 / 1000) = 200
 *   Yi = 250  , Yv = Yi * (Hv / Hi) = 250 * (800 / 1000) = 200
 */
(function(window, $) {
    "use strict";

    var logError = function(message) {
        if (window.console) {
            window.console.error(message);
        }
    };

    /**
     * Creates a new annotation instance.
     * @param options annotation options.
     * @param element HTML element to bind the annotation to
     * @constructor
     */
    $.Annotation = function(options, element) {
        this.$el = $(element);
        this._init(options);
    };

    $.Annotation.prototype = {
        options: {

            /**
             * Name of the CSS class to add to the canvas element. If empty, default style properties are set.
             */
            canvasClass: null,

            /**
             * Name of the CSS class to add when drawing is active. If empty, default style properties are set.
             */
            activeClass: null,

            /**
             * Enables resize watch. only use if you expect the target element to change often.
             */
            resizeWatch: false
        },
        ctx: null, // the canvas context
        dimension: { w: 0, h: 0 }, // dimension of image this annotation is made for
        shapes: [], // shapes of this annotation
        texts: [], // texts of this annotation
        imageData: null, // temporary image data (see canvas.toDataUrl()) not included in toJson serialization!
        damCanvas: null, // temporary dam canvas while adding
        isDrawing: false, // flag indicating if drawing during mouse down
        $canvas: null, // our canvas
        d2vMapping: null, // domain-to-view mapping
        v2dMapping: null, // view-to-domain mapping

        _init: function(options) {
            this.options = options || {};
            this.d2vMapping = this._defaultD2VMapping;
            this.v2dMapping = this._defaultV2DMapping;
        },

        _defaultD2VMapping: function(p) {
            if (this.dimension.w) {
                p.x = p.x / 1000 * this.dimension.w;
                p.y = p.y / 1000 * this.dimension.h;
            }
            return p;
        },
        _defaultV2DMapping: function(p) {
            if (this.dimension.w) {
                p.x = p.x / this.dimension.w * 1000;
                p.y = p.y / this.dimension.h * 1000;
            }
            return p;
        },
        _bindEvents: function() {
            var $canvas = this.$canvas;
            if ($canvas) {
                // bind mouse events
                $canvas.on({
                    "mousedown touchstart": this._beginDraw,
                    "mouseup touchend": this._endDraw,
                    "mousemove touchmove": this._userDraw
                }, { self: this });

                // also enable drawing CSS
                if (this.options.activeClass) {
                    $canvas.addClass(this.options.activeClass);
                } else {
                    $canvas.css({
                        cursor: "crosshair"
                    });
                }
                this.$el.trigger("annotateStart", this);
            }
        },

        _unbindEvents: function() {
            var $canvas = this.$canvas;
            if ($canvas) {
                $canvas.off({
                    "mousedown touchstart": this._beginDraw,
                    "mouseup touchend": this._endDraw,
                    "movemove touchmove": this._userDraw
                });
                // also disable drawing CSS
                if (this.options.activeClass) {
                    $canvas.removeClass(this.options.activeClass);
                } else {
                    $canvas.css("cursor", "");
                }
            }
        },

        _draw: function() {
            var ctx = this.ctx;
            if (ctx) {
                var cw = ctx.canvas.width;
                var ch = ctx.canvas.height;
                ctx.clearRect(0, 0, cw, ch);

                if (this.damCanvas) {
                    this.damCanvas.draw(false);
                }

                for (var i = 0; i < this.shapes.length; i++) {
                    this.shapes[i].draw(ctx);
                }
            }
        },

        _userDraw: function(e) {
            var self = e.data.self;
            if (self.isDrawing && self.damCanvas) {
                var touch = e;
                var touches = e.originalEvent.targetTouches;
                if (touches) {
                    touch = touches[0];
                }
                var o = self.$canvas.offset();
                var x = touch.pageX - o.left;
                var y = touch.pageY - o.top;
                self.damCanvas.addPoint(x, y);
                self.damCanvas.calc();
                self._draw();
            }
            return false;
        },

        _beginDraw: function(e) {
            var self = e.data.self;
            if (self.damCanvas) {
                self.annotation = null;
                self.isDrawing = true;
                self.$el.trigger("annotateBegin", self);
            }
            return false;
        },

        _endDraw: function(e) {
            var self = e.data.self;
            if (self.damCanvas) {
                self.isDrawing = false;
                var shp = self.damCanvas.getShape();
                self.damCanvas = null;
                if (shp) {
                    if (self.v2dMapping) {
                        var p0 = {
                            x: shp.box.x0,
                            y: shp.box.y0
                        };
                        var p1 = {
                            x: shp.box.x1,
                            y: shp.box.y1
                        };
                        self.v2dMapping(p0);
                        self.v2dMapping(p1);
                        shp.domainBox = {
                            x0: p0.x,
                            y0: p0.y,
                            x1: p1.x,
                            y1: p1.y
                        };
                        if (shp.box.ctlx) {
                            p1 = { x: shp.box.ctlx, y: shp.box.ctly };
                            self.v2dMapping(p1);
                            shp.domainBox.ctlx = p1.x;
                            shp.domainBox.ctly = p1.y;
                        }
                    }
                    self.addShape(shp);
                }
                self._draw();
                if (shp) {
                    self.setImageData(self.ctx.canvas.toDataURL("image/png", 1.0));
                    self.$el.trigger("annotateEnd", [ self, shp ]);
                }
                self._unbindEvents();
            }
            return false;
        },

        /**
         * Opens a new annotation and adds the canvas element.
         * @returns {*}
         */
        open: function() {
            if (!this.ctx) {
                var $el = this.$el;
                var $canvas = this.$canvas = $("<canvas></canvas>");
                if (this.options.canvasClass) {
                    $canvas.addClass(this.options.canvasClass);
                } else {
                    $canvas.css({
                        position: "absolute",
                        display: "block",
                        "z-index": 100
                    });
                }
                $canvas.insertBefore($el);
                this.ctx = $canvas.get(0).getContext("2d");
                var w = $el.width();
                var h = $el.height();
                this.dimension = { w: w, h: h };
                $canvas.attr("width", w);
                $canvas.attr("height", h);

                // detect image load
                $el.on("load", { self: this }, this.onResize);
                if (this.options.resizeWatch) {
                    $el.on("resize", { self: this }, this.onResize);
                }
                this.$el.trigger("annotateOpen", this);
            }
            return this;
        },

        /**
         * Closes the annotation and removes the canvas element.
         */
        close: function() {
            if (this.$canvas) {
                this._unbindEvents();
                this.$el.off("load resize");
                this.$canvas.remove();
                this.ctx = null;
                this.$canvas = null;
                this.$el.trigger("annotateClose", this);
                this.shapes = [];
                this.texts = [];
            }
        },

        onResize: function(e) {
            var self = e.data.self;
            var instance = $.data(this, "annotation");
            if (instance) {
                self = instance;
            }
            var $canvas = self.$canvas;
            if ($canvas) {
                var w = self.$el.width();
                var h = self.$el.height();
                self.dimension = { w: w, h: h };

                $canvas.attr("width", w);
                $canvas.attr("height", h);

                // rebuild shapes
                for (var i = 0; i < self.shapes.length; i++) {
                    self.shapes[i] = Granite.UI.Annotation.Shape.fromObject(self.shapes[i], self.d2vMapping, self);
                }

                self._draw();
            }
        },

        show: function() {
            if (this.$canvas) {
                this._draw();
                this.$canvas.show();
            } else {
                logError("Annotation canvas needs to be open before it can be shown.");
            }
        },

        hide: function() {
            if (this.$canvas) {
                this.$canvas.hide();
            }
        },

        start: function() {
            if (!this.ctx) {
                logError("Annotation canvas needs to be open before you can draw.");
                return;
            }
            if (!this.damCanvas) {
                this.damCanvas = new Granite.UI.Annotation.Canvas(this.ctx);
                this.show();
                this._bindEvents();
            }
            return this;
        },

        addShape: function(shape) {
            this.shapes.push(shape);
            return this;
        },

        addText: function(text) {
            this.texts.push(text);
            return this;
        },

        clear: function() {
            this.shapes = [];
            this.texts = [];
            this._draw();
        },

        setV2DMapping: function(mapping) {
            this.v2dMapping = mapping;
        },

        setD2VMapping: function(mapping) {
            this.d2vMapping = mapping;
        },

        toJson: function(indentation) {
            var shapes = [];
            for (var i = 0; i < this.shapes.length; i++) {
                shapes.push(this.shapes[i].toObject());
            }
            return JSON.stringify({
                dimension: this.dimension,
                shapes: shapes,
                texts: this.texts
            }, null, indentation);
        },

        fromJson: function(jsonString) {
            var data = JSON.parse(jsonString);
            if (!data || !data.shapes) {
                return false;
            }
            this.shapes = [];
            for (var i = 0; i < data.shapes.length; i++) {
                var shp = Granite.UI.Annotation.Shape.fromObject(data.shapes[i], this.d2vMapping, this);
                this.shapes.push(shp);
            }
            this.text = data.text;
            this.dimension = data.dimension;
            return true;
        },

        setImageData: function(data) {
            this.imageData = data;
        },

        getImageData: function() {
            return this.imageData;
        }
    };

    // plugin bridge
    $.fn.annotation = function(options) {
        var ret = this;
        var instance;
        if (options === undefined) {
            instance = $.data(this[0], "annotation");
            if (!instance) {
                logError("Annotation instance not initialized. Call $.annotation({}) first.");
                return;
            }
            return instance;
        } else if (typeof options === "string") {
            // call method
            var args = Array.prototype.slice.call(arguments, 1);
            this.each(function() {
                var instance = $.data(this, "annotation");
                if (!instance) {
                    logError("Annotation instance not initialized. Call $.annotation({}) first.");
                    return;
                }
                if (!$.isFunction(instance[options]) || options.charAt(0) === "_") {
                    logError("no such method '" + options + "' for annotation instance");
                    return;
                }
                // apply method
                var tmpRet = instance[options].apply(instance, args);
                if (tmpRet !== undefined) {
                    ret = tmpRet;
                }
            });
            return ret;
        } else {
            instance = $.data(this[0], "annotation");
            if (instance) {
                // apply options & init
                // instance.option(options);
                instance._init(options);
            } else {
                // initialize new instance
                instance = new $.Annotation(options, this[0]);
                $.data(this[0], "annotation", instance);
            }
            return instance;
        }
    };
/* global jQuery:false */
})(window, jQuery);

