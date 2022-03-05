/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

// dep: geo.base
// dep: geo.point
// use: ext.clip2
// use: geo.slope
// use: geo.polygon
gapp.register("base.polygons", [], (root, exports) => {

    const { base } = root;
    const { util, config, newPoint } = base;
    const { sqr, numOrDefault } = util;

    const DEG2RAD = Math.PI / 180,
        SQRT = Math.sqrt,
        SQR = util.sqr,
        Shape2D = self.Shape2D,
        ConsoleTool = self.consoleTool,
        ABS = Math.abs;

    const clib = self.ClipperLib,
        clip = clib.Clipper,
        ctyp = clib.ClipType,
        ptyp = clib.PolyType,
        cfil = clib.PolyFillType;

    const POLYS = base.polygons = {
        rayIntersect,
        alignWindings,
        setWinding,
        fillArea,
        subtract,
        flatten,
        offset,
        trimTo,
        expand,
        expand_lines,
        points,
        route,
        union,
        inset,
        nest,
        diff,
        setZ,
        filter,
        toClipper,
        fromClipperNode,
        fromClipperTree,
        fromClipperTreeUnion,
        cleanClipperTree,
        fingerprintCompare,
        fingerprint
    };

    function setZ(polys, z) {
        for (let poly of polys) {
            poly.setZ(z);
        }
        return polys;
    }

    function toClipper(polys = []) {
        let out = [];
        for (let poly of polys) {
            poly.toClipper(out);
        }
        //ConsoleTool.timeStepEnd("polygons_toClipper");
        return out;
    }

    function ToInt32Array(polys = []) {
        //ConsoleTool.timeStepStart("polygons_ToInt32Array");
        let out = [];
        for (let poly of polys) {
            poly.toInt32Array(out);
        }
        //ConsoleTool.timeStepEnd("polygons_ToInt32Array");
        return out;
    }

    function fromClipperNode(tnode, z) {
        //ConsoleTool.timeStepStart("polygons_fromClipperNode");
        let poly = base.newPolygon();
        if(tnode.m_polygonBuffer){
            let indices = new Int32Array(tnode.m_polygonBuffer.buffer, tnode.m_polygonBuffer.byteOffset);
            for (let i = 0; i<indices.length; i+=2) {
                poly.push(base.pointFromClipper({X: indices[i], Y: indices[i+1]}, z));
            }
            tnode.m_polygonBuffer = null;
            indices = null;

        }else{
            for (let point of tnode.m_polygon) {
                poly.push(base.pointFromClipper(point, z));
            }
        }
        poly.open = tnode.IsOpen;
        //ConsoleTool.timeStepEnd("polygons_fromClipperNode");
        return poly;
    };

    function fromClipperTree(tnode, z, tops, parent, minarea) {
        //ConsoleTool.timeStepStart("polygons_fromClipperTree");

        let poly,
            polys = tops || [],
            min = numOrDefault(minarea, 0.1);

        if(tnode.m_AllPolysBuffer){
            polys.m_AllPolys = base.newPolygon();
            let indices = new Int32Array(tnode.m_AllPolysBuffer.buffer, tnode.m_AllPolysBuffer.byteOffset);
            for (let i = 0; i<indices.length; i+=2) {
                polys.m_AllPolys.push(base.pointFromClipper({X: indices[i], Y: indices[i+1]}, z));
            }
            indices = null;
            tnode.m_AllPolysBuffer = null;
        }

        for (let child of tnode.m_Childs) {
            poly = fromClipperNode(child, z);
            // throw out all tiny polygons
            if (!poly.open && poly.area() < min) {
                continue;
            }
            if (parent) {
                parent.addInner(poly);
            } else {
                polys.push(poly);
            }
            if (child.m_Childs) {
                fromClipperTree(child, z, polys, parent ? null : poly, minarea);
            }
        }

        //ConsoleTool.timeStepEnd("polygons_fromClipperTree");

        return polys;
    };

    function fromClipperTreeUnion(tnode, z, minarea, tops, parent) {
        //ConsoleTool.timeStepStart("polygons_fromClipperTreeUnion");
        let polys = tops || [], poly;

        for (let child of tnode.m_Childs) {
            poly = fromClipperNode(child, z);
            if (!poly.open && minarea && poly.area() < minarea) {
                continue;
            }
            if (parent) {
                parent.addInner(poly);
            } else {
                polys.push(poly);
            }
            if (child.m_Childs) {
                fromClipperTreeUnion(child, z, minarea, polys, parent ? null : poly);
            }
        }
        //ConsoleTool.timeStepEnd("polygons_fromClipperTreeUnion");

        return polys;
    };

    function cleanClipperTree(tree) {
        //ConsoleTool.timeStepStart("polygons_cleanClipperTree");

        if (tree.m_Childs)
            for (let child of tree.m_Childs) {
                child.m_polygon = clip.CleanPolygon(child.m_polygon, config.clipperClean);
                cleanClipperTree(child.m_Childs);
            }

        //ConsoleTool.timeStepEnd("polygons_cleanClipperTree");

        return tree;
    };

    function filter(array, output, fn) {
        //ConsoleTool.timeStepStart("polygons_filter");
        for (let poly of array) {
            poly = fn(poly);
            if (poly) {
                if (Array.isArray(poly)) {
                    output.appendAll(poly);
                } else {
                    output.push(poly);
                }
            }
        }
        //ConsoleTool.timeStepEnd("polygons_filter");
        return output;
    }

    function points(polys) {
        return polys.length ? polys.map(p => p.deepLength).reduce((a,v) => a+v) : 0;
    }

    /**
     * todo use clipper polytree?
     *
     * use bounding boxes and sliceIntersection
     * to determine parent/child nesting. returns a
     * array of trees.
     *
     * @param {Polygon[]} polygon soup
     * @param {boolean} deep allow nesting beyond 2 levels
     * @param {boolean} opentop prevent open polygons from having inners
     * @returns {Polygon[]} top level parent polygons
     */
    function nest(polygons, deep, opentop) {
        if (!polygons) {
            return polygons;
        }
        //ConsoleTool.timeStepStart("polygons_nest");
        // sort groups by size
        polygons.sort(function (a, b) {
            return a.area() - b.area();
        });
        let i, poly;
        // clear parent/child links if they exist
        for (i = 0; i < polygons.length; i++) {
            poly = polygons[i];
            poly.parent = null;
            poly.inner = null;
        }
        // nest groups if fully contained by a parent
        for (i = 0; i < polygons.length - 1; i++) {
            poly = polygons[i];
            // find the smallest suitable parent
            for (let j = i + 1; j < polygons.length; j++) {
                let parent = polygons[j];
                // prevent open polys from having inners
                if (opentop && parent.isOpen()) {
                    continue;
                }
                if (poly.isNested(parent)) {
                    parent.addInner(poly);
                    break;
                }
            }
        }
        // tops have an even # depth
        let tops = [],
            p;
        // assign a depth level to each group
        for (i = 0; i < polygons.length; i++) {
            p = polygons[i];
            poly = p;
            poly.depth = 0;
            while (p.parent) {
                poly.depth++;
                p = p.parent;
            }
            if (deep) {
                if (poly.depth === 0) tops.push(poly);
            } else {
                if (poly.depth % 2 === 0) {
                    tops.push(poly);
                } else {
                    poly.inner = null;
                }
            }
        }
        //ConsoleTool.timeStepEnd("polygons_nest");
        return tops;
    }

    /**
     * sets windings for parents one way
     * and children in opposition
     *
     * @param {Polygon[]} array
     * @param {boolean} CW
     * @param {boolean} [recurse]
     */
    function setWinding(array, CW, recurse) {
        if (!array) return;
        //ConsoleTool.timeStepStart("polygons_setWinding");
        let poly, i = 0;
        while (i < array.length) {
            poly = array[i++];
            if (poly.isClockwise() !== CW) poly.reverse();
            if (recurse && poly.inner) setWinding(poly.inner, !CW, false);
        }
        //ConsoleTool.timeStepEnd("polygons_setWinding");
    }

    /**
     * ensure all polygons have the same winding direction.
     * try to use reversals that touch the fewest nodes.
     *
     * @param {Polygon[]} polys
     * @return {boolean} true if aligned clockwise
     */
    function alignWindings(polys) {
        //ConsoleTool.timeStepStart("polygons_alignWindings");
        let len = polys.length,
            fwd = 0,
            pts = 0,
            i = 0,
            setCW,
            poly;
        while (i < len) {
            poly = polys[i++];
            pts += poly.length;
            if (poly.isClockwise()) fwd += poly.length;
        }
        i = 0;
        setCW = fwd > (pts/2);
        while (i < len) {
            poly = polys[i++];
            if (poly.isClockwise() != setCW) poly.reverse();
        }
        //ConsoleTool.timeStepEnd("polygons_alignWindings");
        return setCW;
    }

    function setContains(setA, poly) {
        for (let i=0; i<setA.length; i++) {
            if (setA[i].contains(poly)) return true;
        }
        return false;
    }

    function flatten(polys, to, crush) {
        //ConsoleTool.timeStepStart("polygons_flatten");

        to = to || [];
        polys.forEach(function(poly) {
            poly.flattenTo(to);
            if (crush) poly.inner = null;
        });
        //ConsoleTool.timeStepEnd("polygons_flatten");
        return to;
    }

    /**
     * Diff two sets of polygons and return A-B, B-A.
     * no polygons in a given set can overlap ... only between sets
     *
     * @param {Polygon[]} setA
     * @param {Polygon[]} setB
     * @param {Polygon[]} outA
     * @param {Polygon[]} outB
     * @param {number} [z]
     * @param {number} [minArea]
     * @returns {Polygon[]} out
     */
    function subtract(setA, setB, outA, outB, z, minArea, opt = {}) {
        //ConsoleTool.timeStepStart("polygons_subtract");

        let min = minArea || 0.1,
            out = [];

        function filter(from, to = []) {
            from.forEach(function(poly) {
                if (poly.area() >= min) {
                    to.push(poly);
                    out.push(poly);
                }
            });
            return to;
        }

        if (opt.prof) {
            if (setA.length === 0 || setB.length === 0) {
                console.log('sub_zero', {setA, setB});
            }
            opt.prof.pin = (opt.prof.pin || 0) + points(setA) + points(setB);
            opt.prof.call = (opt.prof.call || 0) + 1;
        }

        // wasm diff currently doesn't seem to be any faster
        if (false && opt.wasm && geo.wasm) {
            let oA = outA ? [] : undefined;
            let oB = outB ? [] : undefined;
            geo.wasm.js.diff(setA, setB, z, oA, oB);
            if (oA) {
                outA.appendAll(filter(oA));
            }
            if (oB) {
                outB.appendAll(filter(oB));
            }
        } else if(opt.cpp !== false && self.forceUsingJSInsteadOfCPP == false){
            let successCpp = false;

            // console.log("----- subtract ------");

            let sp1 = ToInt32Array(setA),
                sp2 = ToInt32Array(setB);

            let {success, error, polytreeA, polytreeB} = Shape2D.clipperDualSubtractPathToPolyTree(sp1, sp2, config.clipperClean, !!outA, !!outB);

            if(success && polytreeA){
                successCpp = true;
                filter(fromClipperTree(polytreeA, z, null, null, min), outA);

            }
            if(success && polytreeB){
                successCpp = true;
                filter(fromClipperTree(polytreeB, z, null, null, min), outB);
            }

            if(!successCpp){
                console.log("success", success/*, error*/);
                opt.cpp = false;
                //ConsoleTool.timeStepEnd("polygons_subtract");
                return subtract(setA, setB, outA, outB, z, minArea, opt);
            }
        } else {
            let clip = new clib.Clipper(),
                ctre = new clib.PolyTree(),
                sp1 = toClipper(setA),
                sp2 = toClipper(setB);

            // more expensive? worth it?
            clip.StrictlySimple = true;
            if (outA) {
                clip.AddPaths(sp1, ptyp.ptSubject, true);
                clip.AddPaths(sp2, ptyp.ptClip, true);
                if (clip.Execute(ctyp.ctDifference, ctre, cfil.pftEvenOdd, cfil.pftEvenOdd)) {
                    cleanClipperTree(ctre);
                    filter(fromClipperTree(ctre, z, null, null, min), outA);
                }
            }
            if (outB) {
                if (outA) {
                    ctre.Clear();
                    clip.Clear();
                }
                clip.AddPaths(sp2, ptyp.ptSubject, true);
                clip.AddPaths(sp1, ptyp.ptClip, true);
                if (clip.Execute(ctyp.ctDifference, ctre, cfil.pftEvenOdd, cfil.pftEvenOdd)) {
                    cleanClipperTree(ctre);
                    filter(fromClipperTree(ctre, z, null, null, min), outB);
                }
            }
        }

        if (opt.prof) {
            opt.prof.pout = (opt.prof.pout || 0) + points(out);
        }

        //ConsoleTool.timeStepEnd("polygons_subtract");
        return out;
    }

    /**
     * Slice.doProjectedFills()
     * Print.init w/ brims
     *
     * clipper is natively less efficient at merging many polygons. this iterative
     * approach skips attempting to merge polys lacking overlapping bounding boxes
     * and can quickly check if the attempt to union two polys outputs the same
     * two input polys. the latter bit is the key to greater speed.
     *
     * @param {Polygon[]} polys
     * @returns {Polygon[]}
     */
    function union(polys, minarea, all, opt = {}) {
        if (polys.length < 2) return polys;

        //ConsoleTool.timeStepStart("polygons_union");

        if (false && opt.wasm && geo.wasm) {
            let min = minarea || 0.01;
            // let deepLength = polys.map(p => p.deepLength).reduce((a,v) => a+v);
            // if (deepLength < 15000)
            try {
                return geo.wasm.js.union(polys, polys[0].getZ()).filter(p => p.area() > min);
            } catch (e) {
                console.log({union_fail: polys, minarea, all});
            }
        }

        let out = polys.slice(), i, j, union, uset = [];

        outer: for (i=0; i<out.length; i++) {
            if (!out[i]) continue;
            for (j=i+1; j<out.length; j++) {
                if (!out[j]) continue;
                union = out[i].union(out[j], minarea, all);
                if (union && union.length) {
                    out[i] = null;
                    out[j] = null;
                    if (all) {
                        out.appendAll(union);
                    } else {
                        out.push(union);
                    }
                    continue outer;
                }
            }
        }

        for (i=0; i<out.length; i++) {
            if (out[i]) uset.push(out[i]);
        }

        //ConsoleTool.timeStepEnd("polygons_union");
        return uset;
    }

    /**
     * @param {Polygon} poly clipping mask
     * @returns {?Polygon[]}
     */
    function diff(setA, setB, z) {
        //ConsoleTool.timeStepStart("polygons_diff");

        let clip = new clib.Clipper(),
            ctre = new clib.PolyTree(),
            sp1 = toClipper(setA),
            sp2 = toClipper(setB);

        clip.AddPaths(sp1, ptyp.ptSubject, true);
        clip.AddPaths(sp2, ptyp.ptClip, true);

        if (clip.Execute(ctyp.ctDifference, ctre, cfil.pftEvenOdd, cfil.pftEvenOdd)) {
            let res =  fromClipperTree(ctre, z);
            //ConsoleTool.timeStepEnd("polygons_diff");
            return res;
        } else {
            return null;
        }
    };

    /**
     * Slice.doProjectedFills()
     *
     * @param {Polygon[]} setA source set
     * @param {Polygon[]} setB mask set
     * @returns {Polygon[]}
     */
    function trimTo(setA, setB) {
        //ConsoleTool.timeStepStart("polygons_trimTo");
        // handle null/empty slices
        if (setA === setB || setA === null || setB === null) return null;

        let out = [], tmp;
        util.doCombinations(setA, setB, {}, function(a, b) {
            if (tmp = a.mask(b)) {
                out.appendAll(tmp);
            }
        });
        //ConsoleTool.timeStepEnd("polygons_trimTo");
        return out;
    }

    function sumCirc(polys) {
        let sum = 0.0;
        polys.forEach(function(poly) {
            sum += poly.circularityDeep();
        });
        return sum;
    }

    /**
     * @param {Polygon[]} polys
     * @param {number} distance offset
     * @param {number} [z] defaults to 0
     */
    function expand_lines(poly, distance, z) {
        //ConsoleTool.timeStepStart("polygons_expand_lines");
        let fact = config.clipper,
            cjnt = clib.JoinType,
            cety = clib.EndType,
            coff = new clib.ClipperOffset(),
            ctre = new clib.PolyTree();

        coff.AddPaths(poly.toClipper(), cjnt.jtMiter, cety.etOpenSquare);
        coff.Execute(ctre, distance * fact);

        let res = fromClipperTree(ctre, z, null, null, 0);

        //ConsoleTool.timeStepEnd("polygons_expand_lines");
        return res;
    }

    /**
     * @param {Polygon[]} polys
     * @param {number} distance offset
     * @param {number} [z] defaults to 0
     * @param {Polygon[]} [out] optional collector
     * @param {number} [count] offset passes (0 == until no space left)
     * @param {number} [distance2] after first offset pass
     * @param {Function} [collector] receives output of each pass
     * @returns {Polygon[]} last offset
     */
    function expand(polys, distance, z, out, count, distance2, collector, min) {
        //ConsoleTool.timeStepStart("polygons_expand");

        let res = offset(polys, [distance, distance2 || distance], {
            z, outs: out, call: collector, minArea: min, count, flat: true
        });
        //ConsoleTool.timeStepEnd("polygons_expand");

        return res;
    }

    /**
     * offset an array of polygons by distance with options to recurse
     * and return resulting gaps from offsets for thin wall detection in
     * in FDM mode and uncleared areas in CAM mode.
     */
    function offset(polys, dist, opts = {}) {
        //ConsoleTool.timeStepStart("polygons_offset");
        // do not offset open lines
        //ConsoleTool.timeStepStart("polygons_offset_filter");
        polys = polys.filter(p => !p.open);
        //ConsoleTool.timeStepEnd("polygons_offset_filter");


        // cause inner / outer polys to be reversed from each other
        //ConsoleTool.timeStepStart("polygons_offset_alignWindings");
        alignWindings(polys);
        for (let poly of polys) {
            if (poly.inner) {
                setWinding(poly.inner, !poly.isClockwise());
            }
        }
        //ConsoleTool.timeStepEnd("polygons_offset_alignWindings");

        //ConsoleTool.timeStepStart("polygons_offset_value");

        let orig = polys,
            count = numOrDefault(opts.count, 1),
            depth = numOrDefault(opts.depth, 0),
            clean = opts.clean !== false,
            simple = opts.simple !== false,
            fill = numOrDefault(opts.fill, clib.PolyFillType.pftNonZero),
            join = numOrDefault(opts.join, clib.JoinType.jtMiter),
            type = numOrDefault(opts.type, clib.EndType.etClosedPolygon),
            // if dist is array with values, shift out next offset
            offs = Array.isArray(dist) ? (dist.length > 1 ? dist.shift() : dist[0]) : dist,
            mina = numOrDefault(opts.minArea, 0.1),
            zed = opts.z || 0;

        //ConsoleTool.timeStepEnd("polygons_offset_value");
        //ConsoleTool.timeStepStart("polygons_offset_clipper");

        if (opts.wasm && geo.wasm) {
            try {
                polys = geo.wasm.js.offset(polys, offs, zed, clean ? config.clipperClean : 0, simple ? 1 : 0);
            } catch (e) {
                console.log('wasm error', e.message || e);
                opts.wasm = false;
                return offset(polys, dist, opts);
            }
        } else if(opts.cpp !== false && self.forceUsingJSInsteadOfCPP == false){
            // console.log("-------------- offset -----------");
            let polysCpp = [];
            for (let poly of orig) {
                polysCpp.push(poly.toInt32Array());
            }

            let {success, error, polytree} = Shape2D.clipperOffsetToPolyTree(polysCpp, join, type, clean, config.clipperClean, simple, fill, offs * config.clipper, 1);

            if(!success){
                console.log("success", success, error);
                opts.cpp = false;
                //ConsoleTool.timeStepEnd("polygons_offset");
                return offset(polys, dist, opts);
            }

            //ConsoleTool.timeStepStart("polygons_offset_fromClipperTree");
            polys = fromClipperTree(polytree, zed, null, null, mina);
            //ConsoleTool.timeStepEnd("polygons_offset_fromClipperTree");
        } else {
            let coff = new clib.ClipperOffset(opts.miter, opts.arc),
                ctre = new clib.PolyTree();

            // setup offset
            for (let poly of polys) {
                // convert to clipper format
                poly = poly.toClipper();
                if (clean) poly = clib.Clipper.CleanPolygons(poly, config.clipperClean);
                if (simple) poly = clib.Clipper.SimplifyPolygons(poly, fill);
                coff.AddPaths(poly, join, type);
            }
            // perform offset
            coff.Execute(ctre, offs * config.clipper);
            // convert back from clipper output format
            polys = fromClipperTree(ctre, zed, null, null, mina);
        }

        //ConsoleTool.timeStepEnd("polygons_offset_clipper");
        //ConsoleTool.timeStepStart("polygons_offset_end");
        // if specified, perform offset gap analysis
        if (opts.gaps && polys.length) {
            let oneg = offset(polys, -offs, {
                fill: opts.fill, join: opts.join, type: opts.type, z: opts.z, minArea: mina
            });
            let suba = [];
            let diff = subtract(orig, oneg, suba, null, zed);
            opts.gaps.append(suba, opts.flat);
        }

        // if offset fails, consider last polygons as gap areas
        if (opts.gaps && !polys.length) {
            opts.gaps.append(orig, opts.flat);
        }

        // if specified, perform up to *count* successive offsets
        if (polys.length) {
            // ensure opts has offset accumulator array
            opts.outs = opts.outs || [];
            // store polys in accumulator
            opts.outs.append(polys, opts.flat);
            // callback for expand() compatibility
            if (opts.call) {
                opts.call(polys, count, depth);
            }
            // check for more offsets
            if (count > 1) {
                // decrement count, increment depth
                opts.count = count - 1;
                opts.depth = depth + 1;
                // call next offset
                offset(polys, dist, opts);
            }
        }
        //ConsoleTool.timeStepEnd("polygons_offset_end");

        //ConsoleTool.timeStepEnd("polygons_offset");
        return opts.flat ? opts.outs : polys;
    }

    /**
     * progressive insetting that does inset + outset to debur as well
     * as performing subtractive analysis between initial layer shell (ref)
     * and last offset (cmp) to produce gap candidates (for thinfill)
     */
    function inset(polys, dist, count, z, wasm) {
        //ConsoleTool.timeStepStart("polygons_inset");
        let total = count;
        let layers = [];
        let ref = polys;
        let depth = 0;
        while (count-- > 0 && ref && ref.length) {
            let off = offset(ref, -dist, {z, wasm});
            let mid = offset(off, dist / 2, {z, wasm});
            let cmp = offset(off, dist, {z, wasm});
            let gap = [];
            let aref = ref.map(p => p.areaDeep()).reduce((a,p) => a +p);
            let cref = cmp.length ? cmp.map(p => p.areaDeep()).reduce((a,p) => a + p) : 0;
            // threshold subtraction to area deltas > 0.1 % to filter out false
            // positives where inset/outset are identical floating point error
            if (Math.abs(aref - cref) >  1 - (Math.abs(aref / cref) / 1000)) {
                subtract(ref, cmp, gap, null, z);
            }
            layers.push({idx: total-count, off, mid, gap});
            // fixup depth cues
            for (let m of mid) {
                m.depth = depth++;
                if (m.inner) {
                    for (let mi of m.inner) {
                        mi.depth = m.depth;
                    }
                }
            }
            ref = off;
        }
        //ConsoleTool.timeStepEnd("polygons_inset");
        return layers;
    }

    /**
     * todo use clipper opne poly clipping?
     *
     * @param {Polygon[]} polys
     * @param {number} angle (-90 to 90)
     * @param {number} spacing
     * @param {Polygon[]} [output]
     * @param {number} [minLen]
     * @param {number} [maxLen]
     * @returns {Point[]} supplied output or new array
     */
    function fillArea(polys, angle, spacing, output, minLen, maxLen, opt={}) {
        if (polys.length === 0) return;

        //ConsoleTool.timeStepStart("polygons_fillArea");

        let i = 1,
            p0 = polys[0],
            zpos = p0.getZ(),
            bounds = p0.bounds.clone(),
            raySlope;

        // ensure angle is in the -90:90 range
        angle = angle % 180;
        while (angle < -90) angle += 180;
        while (angle > 90) angle -= 180;

        // X,Y ray slope derived from angle
        raySlope = base.newSlope(0,0,
            Math.cos(angle * DEG2RAD) * spacing,
            Math.sin(angle * DEG2RAD) * spacing
        );

        //ConsoleTool.timeStepStart("polygons_fillArea_while");
        // compute union of top boundaries
        while (i < polys.length) {
            bounds.merge(polys[i++].bounds);
        }
        //ConsoleTool.timeStepEnd("polygons_fillArea_while");

        // ray stepping is an axis from the line perpendicular to the ray
        let rayint = output || [],
            stepX = -raySlope.dy,
            stepY = raySlope.dx,
            iterX = ABS(ABS(stepX) > 0 ? bounds.width() / stepX : 0),
            iterY = ABS(ABS(stepY) > 0 ? bounds.height() / stepY : 0),
            dist = SQRT(SQR(iterX * stepX) + SQR(iterY * stepY)),
            step = SQRT(SQR(stepX) + SQR(stepY)),
            steps = Math.ceil(dist / step),
            start = angle < 0 ? { x:bounds.minx, y:bounds.miny, z:zpos } : { x:bounds.maxx, y:bounds.miny, z:zpos },
            clip = new clib.Clipper(),
            ctre = new clib.PolyTree(),
            minlen = base.config.clipper * (minLen || 0),
            maxlen = base.config.clipper * (maxLen || 0),
            lines = [];

        // store origin as start/affinity point for fill
        rayint.origin = newPoint(start.x, start.y, start.z);

        //ConsoleTool.timeStepStart("polygons_fillArea_AddPaths");
        if(opt.cpp !== false && self.forceUsingJSInsteadOfCPP == false){

            let int32 = new Int32Array(steps * 4);
            for (i = 0; i < steps; i++) {
                int32[i*4] = (start.x - raySlope.dx * 1000) * config.clipper;
                int32[i*4 + 1] =  (start.y - raySlope.dy * 1000) * config.clipper;
                int32[i*4 + 2] =  (start.x + raySlope.dx * 1000) * config.clipper;
                int32[i*4 + 3] =  (start.y + raySlope.dy * 1000) * config.clipper;

                start.x += stepX;
                start.y += stepY;
            }

            let linesInput = int32.buffer,
                polysInput = ToInt32Array(polys);

            let {success, error, polytree} = Shape2D.clipperFillAreaToPolyTree(linesInput, polysInput, false);

            if (success && polytree) {
                for (let poly of polytree.m_Childs) {
                    poly = fromClipperNode(poly, zpos);

                    if (minlen || maxlen) {
                        let plen = clib.JS.PerimeterOfPath(poly.m_polygon, false, 1);
                        if (minlen && plen < minlen) continue;
                        if (maxlen && plen > maxlen) continue;
                    }

                    let p1 = poly.points[0];//base.pointFromClipper(poly.m_polygon[0], zpos);
                    let p2 = poly.points[1];//base.pointFromClipper(poly.m_polygon[1], zpos);
                    let od = rayint.origin.distToLineNew(p1,p2) / spacing;
                    lines.push([p1, p2, od]);

                }
            }

            if(!success){
                console.log("success", success, error);
                opt.cpp = false;
                //ConsoleTool.timeStepEnd("polygons_fillArea");
                //ConsoleTool.timeStepEnd("polygons_fillArea_AddPaths");
                return fillArea(polys, angle, spacing, output, minLen, maxLen, opt)
            }

        }else {

            for (i = 0; i < steps; i++) {
                lines.push([
                    {
                        X: (start.x - raySlope.dx * 1000) * config.clipper,
                        Y: (start.y - raySlope.dy * 1000) * config.clipper
                    }, {
                        X: (start.x + raySlope.dx * 1000) * config.clipper,
                        Y: (start.y + raySlope.dy * 1000) * config.clipper
                    }
                ]);
                start.x += stepX;
                start.y += stepY;
            }

            clip.AddPaths(lines, ptyp.ptSubject, false);
            clip.AddPaths(toClipper(polys), ptyp.ptClip, true);

            lines = [];

            if (clip.Execute(ctyp.ctIntersection, ctre, cfil.pftNonZero, cfil.pftEvenOdd)) {
                for (let poly of ctre.m_AllPolys) {
                    if (minlen || maxlen) {
                        let plen = clib.JS.PerimeterOfPath(poly.m_polygon, false, 1);
                        if (minlen && plen < minlen) continue;
                        if (maxlen && plen > maxlen) continue;
                    }
                    let p1 = base.pointFromClipper(poly.m_polygon[0], zpos);
                    let p2 = base.pointFromClipper(poly.m_polygon[1], zpos);
                    let od = rayint.origin.distToLineNew(p1, p2) / spacing;
                    lines.push([p1, p2, od]);
                }
            }
        }
        //ConsoleTool.timeStepEnd("polygons_fillArea_AddPaths");

        //ConsoleTool.timeStepStart("polygons_fillArea_sort");
        lines.sort(function(a,b) {
            return a[2] - b[2];
        })
        //ConsoleTool.timeStepEnd("polygons_fillArea_sort");

        //ConsoleTool.timeStepStart("polygons_fillArea_for");
        for (let line of lines) {
            let dist = Math.round(line[2]);
            line[0].index = dist;
            line[1].index = dist;
            rayint.push(line[0]);
            rayint.push(line[1]);
        }
        //ConsoleTool.timeStepEnd("polygons_fillArea_for");


        //ConsoleTool.timeStepEnd("polygons_fillArea");
        return rayint;
    }

    /**
     * tracing a ray through a slice's polygons, find and return
     * a sorted list of all intersecting points.
     *
     * @param {Point} start
     * @param {Slope} slope
     * @param {Polygon[]} polygons
     * @param {boolean} [for_fill]
     * @returns {Point[]}
     */
    function rayIntersect(start, slope, polygons, for_fill) {
        //ConsoleTool.timeStepStart("polygons_rayIntersect");

        let i = 0,
            flat = [],
            points = [],
            conf = base.config,
            merge_dist = for_fill ? conf.precision_fill_merge : conf.precision_merge;
        // todo use new flatten() function above
        polygons.forEach(function(p) {
            p.flattenTo(flat);
        });
        polygons = flat;
        while (i < polygons.length) {
            let polygon = polygons[i++],
                pp = polygon.points,
                pl = pp.length;;
            for (let j = 0; j < pl; j++) {
                let j2 = (j + 1) % pl,
                    ip = util.intersectRayLine(start, slope, pp[j], pp[j2]);
                if (ip) {
                    // add group object to point for cull detection
                    ip.group = polygon;
                    // add point to point list
                    points.push(ip);
                    // if point is near a group endpoint, add position marker for culling
                    if (ip.isNear(pp[j], merge_dist)) {
                        ip.pos = j;
                        ip.mod = pl;
                    } else if (ip.isNear(pp[j2], merge_dist)) {
                        ip.pos = j2;
                        ip.mod = pl;
                    }
                }
            }
        }
        if (points.length > 0) {
            let del = false;
            // sort on distance from ray origin
            points.sort(function (p1, p2) {
                // handle passing through line-common end points
                if (!(p1.del || p2.del) && p1.isNear(p2, merge_dist)) {
                    let line = [];
                    if (!p1.isNear(p1.p1, merge_dist)) line.push(p1.p1);
                    if (!p1.isNear(p1.p2, merge_dist)) line.push(p1.p2);
                    if (!p2.isNear(p2.p1, merge_dist)) line.push(p2.p1);
                    if (!p2.isNear(p2.p2, merge_dist)) line.push(p2.p2);
                    /**
                     * when true, points are coincident on collinear lines but
                     * not passing through endpoints on each. kill them. this case
                     * was added later. see below for what else can happen.
                     */
                    if (line.length < 2) {
                        console.log("sliceInt: line common ep fail: "+line.length);
                    } else
                    if (line.length > 2) {
                        p1.del = true;
                        p2.del = true;
                    } else
                        /**
                         * when a ray intersects two equal points, they are either inside or outside.
                         * to determine which, we create a line from the two points connected to them
                         * and test intersect the ray with that line. if it intersects, the points are
                         * inside and we keep one of them. otherwise, they are outside and we drop both.
                         */
                    if (!util.intersectRayLine(start, slope, line[0], line[1])) {
                        del = true;
                        p1.del = true;
                        p2.del = true;
                    } else {
                        del = true;
                        p1.del = true;
                    }
                }
                return p1.dist - p2.dist; // sort on 'a' dist from ray origin
            });
            /**
             * cull invalid lines between groups on same/different levels depending
             * ok = same level (even), same group
             * ok = same level (odd), diff group
             * ok = diff level (even-odd)
             */
            if (for_fill) {
                let p1, p2;
                i = 0;
                pl = points.length;
                while (i < pl) {
                    p1 = points[i++];
                    while (p1 && p1.del && i < pl) p1 = points[i++];
                    p2 = points[i++];
                    while (p2 && p2.del && i < pl) p2 = points[i++];
                    if (p1 && p2 && p1.group && p1.group) {
                        let p1g = p1.group,
                            p2g = p2.group,
                            even = (p1g.depth % 2 === 0), // point is on an even depth group
                            same = (p1g === p2g); // points intersect same group
                        if (p1g.depth === p2g.depth) {
                            // TODO this works sometimes and not others
                            //if ((even && !same) || (same && !even)) {
                            //    p1.del = true;
                            //    p2.del = true;
                            //    del = true;
                            //}
                            // check cull co-linear with group edge
                            if (same && p1.mod && p2.mod) {
                                let diff = ABS(p1.pos - p2.pos);
                                if (diff === 1 || diff === p1.mod - 1) {
                                    p1.del = true;
                                    p2.del = true;
                                    del = true;
                                }
                            }
                        }
                    }
                }
            }
            // handle deletions, if found
            if (del) {
                let np = [];
                for (i = 0; i < points.length; i++) {
                    let p = points[i];
                    if (!p.del) {
                        np.push(p);
                    }
                }
                points = np;
            }
        }

        //ConsoleTool.timeStepEnd("polygons_rayIntersect");
        return points;
    }

    function fingerprint(polys) {
        //ConsoleTool.timeStepStart("polygons_fingerprint");

        let finger = [];
        flatten(polys).sort((a,b) => {
            return a.area() > b.area();
        }).forEach(p => {
            finger.push({
                c: p.circularityDeep(),
                p: p.perimeterDeep(),
                b: p.bounds
            });
        });
        //ConsoleTool.timeStepEnd("polygons_fingerprint");
        return finger;
    }

// compare fingerprint arrays
    function fingerprintCompare(a, b) {
        // true if array is the same object
        if (a === b) {
            return true;
        }
        // fail on missing array
        if (!a || !b) {
            return false;
        }
        // require identical length arrays
        if (a.length !== b.length) {
            return false;
        }
        for (let i=0; i<a.length; i++) {
            let ra = a[i];
            let rb = b[i];
            // test circularity
            if (Math.abs(ra.c - rb.c) > 0.001) {
                return false;
            }
            // test perimeter
            if (Math.abs(ra.p - rb.p) > 0.01) {
                return false;
            }
            // test bounds
            if (ra.b.delta(rb.b) > 0.01) {
                return false;
            }
        }
        return true;
    }

// plan a route through an array of polygon center points
// starting with the polygon center closest to "start"
    function route(polys, start) {
        let centers = [];
        let first, minDist = Infinity;
        for (let poly of polys) {
            let center = poly.average();
            let rec = {poly, center, used: false};
            let dist = center.distTo2D(start);
            if (dist < minDist) {
                first = rec;
                minDist = dist;
            }
            centers.push(rec);
        }
        first.used = true;
        let routed = [ first ];
        for (;;) {
            let closest;
            let minDist = Infinity;
            for (let rec of centers) {
                if (!rec.used) {
                    let dist = rec.center.distTo2D(first.center);
                    if (dist < minDist) {
                        minDist = dist;
                        closest = rec;
                    }
                }
            }
            if (!closest) {
                break;
            } else {
                closest.used = true;
                routed.push(first = closest);
            }
        }
        return routed.map(r => r.poly);
    }

});
