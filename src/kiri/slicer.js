/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

/**
 * Slicing engine used by FDM, Laser, and SLA
 */
(function() {

    if (self.kiri.slicer) return;

    self.kiri.slicer = {
        slice,
        sliceZ,
        sliceWidget,
        connectLines,
        createSlice
    };

    let KIRI = self.kiri,
        BASE = self.base,
        ConsoleTool = self.consoleTool,
        CONF = BASE.config,
        UTIL = BASE.util,
        POLY = BASE.polygons,
        time = UTIL.time,
        tracker = UTIL.pwait,
        newSlice = KIRI.newSlice,
        newOrderedLine = BASE.newOrderedLine,
        beltfact = Math.cos(Math.PI/4);

    /**
     * Convenience method. Gets a Widget's points and calls slice()
     *
     * @param {Widget} widget
     * @param {Object} options
     * @param {Function} ondone callback when slicing complete
     * @param {Function} onupdate callback on incremental updates
     */
    function sliceWidget(widget, options, ondone, onupdate) {
        // ConsoleTool.timeStepStart("slicer_sliceWidget");
        slice(widget.getPoints(), widget.getBoundingBox(), options, ondone, onupdate);
        // ConsoleTool.timeStepEnd("slicer_sliceWidget");
    }

    /**
     * Given an array of points as triples, a bounding box and a set of
     * slicing controls, emit an array of Slice objects to the ondone()
     * function. onupdate() will be called with two parameters (% completion
     * and an optional message) so that the UI can report progress to the user.
     *
     * @param {Array} points vertex array
     * @param {Bounds} bounds bounding box for points
     * @param {Object} options slicing parameters
     * @param {Function} ondone callback when slicing done
     * @param {Function} onupdate callback to report slicing progress
     */
    function slice(points, bounds, options, ondone, onupdate) {
        let useFlats = options.flats,
            isBelt = options.isBelt || false,
            zPress = options.zPress || 0, // lower z values less than zPress (flaten bottoms)
            zCut = options.zCut || 0, // cut bottom off model below bed/belt
            xray = options.xray,
            ox = 0,
            oy = 0;

        // ConsoleTool.timeStepStart("slicer_slice_firstPart");

        // support moving parts below bed to "cut" them in Z
        // and/or flatten part bottoms belowa a given thresold
        if (zCut || zPress) {
            for (let p of points) {
                if (!p._z) {
                    p._z = p.z;
                    if (zPress) {
                        if (isBelt) {
                            let zb = (p.z - p.y) * beltfact;
                            if (zb > 0 && zb <= zPress) {
                                p.y += zb * beltfact;
                                p.z -= zb * beltfact;
                            }
                        } else {
                            if (p.z <= zPress) p.z = 0;
                        }
                    }
                    if (zCut && !isBelt) {
                        p.z -= zCut;
                    }
                }
            }
        }

        let zMin = options.zmin || options.firstHeight || Math.floor(bounds.min.z),
            zMax = options.zmax || Math.ceil(bounds.max.z),
            zInc = options.height,
            zIncMin = options.minHeight,
            zIncFirst = options.firstHeight || zInc,
            zOff = true ? zInc / 2 : 0,
            zHeights = [],      // heights for zIndexes in adaptive mode
            zIndexes = [],      // auto-detected z slicing offsets (laser/cam)
            zOrdered = [],      // ordered list of Z indexes
            zThick = [],        // ordered list of Z slice thickness (laser)
            zList = {},         // map count of z index points for adaptive slicing
            zFlat = {},         // map area of z index flat areas (cam)
            zLines = {},        // map count of z index lines
            zScale,             // bucket span in z units
            timeStart = time(),
            zSum = 0.0,
            buckets = [],
            i, j = 0, k, p1, p2, p3, px,
            CPRO = KIRI.driver.CAM.process,
            useAssembly = options.useAssembly,
            concurrent = options.concurrent ? KIRI.minions.concurrent : 0;

        if (options.add) {
            zMax += zInc;
        }

        function countZ(z) {
            z = UTIL.round(z,5);
            zList[z] = (zList[z] || 0) + 1;
        }

        // gather z-index stats
        // these are used for auto-slicing in laser
        // and to flats detection in CAM mode
        for (i = 0; i < points.length;) {
            p1 = points[i++];
            p2 = points[i++];
            p3 = points[i++];
            // used to calculate buckets
            zSum += (Math.abs(p1.z - p2.z) + Math.abs(p2.z - p3.z) + Math.abs(p3.z - p1.z));
            // laser auto-detect z slice points
            if (zInc === 0 || zIncMin) {
                countZ(p1.z);
                countZ(p2.z);
                countZ(p3.z);
            }
            // use co-flat and co-line detection to adjust slice Z
            if (p1.z === p2.z && p2.z === p3.z && p1.z > bounds.min.z) {
                // detect zFlat faces to avoid slicing directly on them
                let zkey = p1.z.toFixed(5),
                    area = Math.abs(UTIL.area2(p1,p2,p3)) / 2;
                if (!zFlat[zkey]) {
                    zFlat[zkey] = area;
                } else {
                    zFlat[zkey] += area;
                }
            } else if (true || options.trace) {
                // detect zLines (curved region tops/bottoms)
                // mark these layers for ball and v mill tracing
                if (p1.z === p2.z && p1.z > bounds.min.z) {
                    let zkey = p1.z.toFixed(5);
                    let zval = zLines[zkey];
                    zLines[zkey] = (zval || 0) + 1;
                }
                if (p2.z === p3.z && p2.z > bounds.min.z) {
                    let zkey = p2.z.toFixed(5);
                    let zval = zLines[zkey];
                    zLines[zkey] = (zval || 0) + 1;
                }
                if (p3.z === p1.z && p3.z > bounds.min.z) {
                    let zkey = p3.z.toFixed(5);
                    let zval = zLines[zkey];
                    zLines[zkey] = (zval || 0) + 1;
                }
            }
        }

        /** short-circuit for microscopic and invalid objects */
        if (zMax == 0 || zSum == 0 || points.length == 0) {
            return ondone([]);
        }

        /**
         * bucket polygons into z-bounded groups (inside or crossing)
         * to reduce the search space in complex models
         */
        let bucketCount = Math.max(1, Math.ceil(zMax / (zSum / points.length)) - 1);

        if (concurrent > 1) {
            if (bucketCount < concurrent) {
                bucketCount = concurrent;
            }
        }
        bucketCount = Math.min(bucketCount, 100);

        zScale = 1 / (zMax / bucketCount);

        if (bucketCount > 1) {
            // create empty buckets
            for (i = 0; i < bucketCount + 1; i++) {
                buckets.push({ points: [], slices: [] });
            }

            // copy triples into all matching z-buckets
            for (i = 0; i < points.length;) {
                p1 = points[i++];
                p2 = points[i++];
                p3 = points[i++];
                let zm = Math.min(p1.z, p2.z, p3.z),
                    zM = Math.max(p1.z, p2.z, p3.z),
                    bm = Math.floor(zm * zScale),
                    bM = Math.ceil(zM * zScale);
                if (bm < 0) bm = 0;
                for (j = bm; j < bM; j++) {
                    buckets[j].points.push(p1);
                    buckets[j].points.push(p2);
                    buckets[j].points.push(p3);
                }
            }
        } else {
            buckets.push({ points, slices: [] });
        }

        // we need Z ordered list for laser auto or adaptive fdm slicing
        if (zInc === 0 || zIncMin) {
            for (let key in zList) {
                if (!zList.hasOwnProperty(key)) continue;
                zOrdered.push(parseFloat(key));
            }
            zOrdered.sort(function(a,b) { return a - b});
        }

        if (options.indices) {
            zIndexes = options.indices;
            zHeights = zIndexes.map(v => options.height);
        } else if (useFlats) {
            zIndexes.appendAll(zOrdered);
        } else if (options.single) {
            // usually for laser single slice
            zIndexes.push(zMin + zInc);
        } else if (zInc === 0) {
            // use Z indices in auto slice mode for laser
            // find unique z-index offsets for slicing
            let zl = zOrdered
            // if zIncMin also present, then merge adjacent
            // slices less than that value
            if (zIncMin) {
                let last = undefined;
                zl = zl.filter(v => {
                    if (last !== undefined && v - last < zIncMin) {
                        return false;
                    }
                    last = v;
                    return true;
                });
            }
            for (i = 0; i < zl.length - 1; i++) {
                zIndexes.push((zl[i] + zl[i+1]) / 2);
                zThick.push(zl[i+1] - zl[i]);
            }
        } else if (zIncMin) {
            // console.log('adaptive slicing', zIncMin, ':', zInc, 'from', zMin, 'to', zMax);
            // FDM adaptive slicing
            let zPos = zIncFirst,
                zOI = 0,
                zDelta,
                zDivMin,
                zDivMax,
                zStep,
                nextZ,
                lzp = zPos;

            // first slice is fixed
            zHeights.push(zIncFirst);
            zIndexes.push(zIncFirst / 2);
            // console.log({zIncFirst, zOrdered})
            while (zPos < zMax && zOI < zOrdered.length) {
                nextZ = zOrdered[zOI++];
                if (zPos >= nextZ) {
                    // console.log('skip',{zPos},'>=',{nextZ});
                    continue;
                }
                zDelta = nextZ - zPos;
                if (zDelta < zIncMin) {
                    // console.log('skip',{zDelta},'<',{zIncMin});
                    continue;
                }

                zDivMin = Math.floor(zDelta / zIncMin);
                zDivMax = Math.floor(zDelta / zInc);

                if (zDivMax && zDivMax <= zDivMin) {
                    if (zDelta % zInc > 0.01) zDivMax++;
                    zStep = zDelta / zDivMax;
                    // console.log(`--- zDivMax <= zDivMin ---`, zStep, zDelta % zInc)
                } else {
                    zStep = zDelta;
                }
                // console.log({nextZ, zPos, zDelta, zStep, zDivMin, zDivMax})
                while (zPos < nextZ) {
                    zHeights.push(zStep);
                    zIndexes.push(zPos + zStep / 2);
                    zPos += zStep;
                    // console.log({D: zPos - lzp, zPos})
                    // lzp = zPos;
                }
            }
        } else {
            // console.log('fixed slicing', zInc, 'from', zMin, 'to', zMax);
            // FDM fixed slicing
            if (options.firstHeight) {
                zIndexes.push(options.firstHeight / 2);
                zHeights.push(options.firstHeight);
                zMin = options.firstHeight;
            }
            for (i = zMin + zOff; i < zMax; i += zInc) {
                zIndexes.push(i);
                zHeights.push(zInc);
            }
        }

        // create buckets data structure
        for (let i = 0; i < zIndexes.length; i++) {
            let ik = zIndexes[i].toFixed(5),
                onFlat = false,
                onLine = false;
            // ensure no slice through horizontal lines or planes
            if (zFlat[ik]) onFlat = true;
            if (zLines[ik]) onLine = true;
            if (!useFlats && (onFlat || onLine)) {
                zIndexes[i] -= -0.001;
            }
            bucketZ(i, zIndexes[i], zHeights[i], onFlat, onLine, zThick[i]);
            onupdate((i / zIndexes.length) * 0.1);
        }
        // ConsoleTool.timeStepEnd("slicer_slice_firstPart");
        // create slices from each bucketed region
        // ConsoleTool.timeStepStart("slicer_slice_sliceBuckets");
        sliceBuckets().then(slices => {
            // ConsoleTool.timeStepEnd("slicer_slice_sliceBuckets");
            // ConsoleTool.timeStepStart("slicer_slice_afterSliceBuckets");

            slices = slices.sort((a,b) => a.index - b.index);

            // connect slices into linked list for island/bridge projections
            for (i=1; i<slices.length; i++) {
                slices[i-1].up = slices[i];
                slices[i].down = slices[i-1];
            }

            slices.slice_time = time() - timeStart;
            // ConsoleTool.timeStepEnd("slicer_slice_afterSliceBuckets");

            // pass Slices array back to ondone function
            ondone(slices);
        });

        function bucketZ(index, z, height, thick) {
            buckets[Math.floor(z * zScale)].slices.push({
                index, z, height, thick, total: zIndexes.length
            });
        }

        async function sliceBuckets() {
            let output = [];
            if (concurrent) {
                let promises = buckets.map(
                    bucket => KIRI.minions.sliceBucket(bucket, options, output)
                );
                await tracker(promises, (i,t,d) => {
                    onupdate(0.1 + (i / t) * 0.9);
                });
            } else {
                let count = 0;
                for (let bucket of buckets) {
                    for (let params of bucket.slices) {
                        output.push(createSlice(
                            params,
                            sliceZ(params.z, bucket.points, options, params),
                            options
                        ));
                        onupdate(0.1 + (count++ / zIndexes.length) * 0.9);
                    }
                }
            }
            return output;
        }

    }

    function createSlice(params, data, options = {}) {
        //ConsoleTool.timeStepStart("slicer_createSlice");

        let { index, z, height, thick } = params;
        let { lines, groups, tops, clip } = data;
        let slice = newSlice(z).addTops(tops);
        slice.height = height;
        slice.index = index;
        slice.thick = thick;
        slice.clips = clip || slice.topSimples();
        // when debugging individual layers, attach lines and groups
        if (options.xray) {
            slice.lines = lines;
            slice.groups = groups;
            slice.xray = options.xray;
        }
        //ConsoleTool.timeStepEnd("slicer_createSlice");

        return slice;
    }

    /** ***** SLICING FUNCTIONS ***** */

    /**
     * given a point, append to the correct
     * 'where' objec tarray (on, over or under)
     *
     * @param {Point} p
     * @param {number} z offset
     * @param {Obejct} where
     */
    function checkUnderOverOn(p, z, where) {
        //ConsoleTool.timeStepStart("slicer_checkUnderOverOn");

        let delta = p.z - z;
        if (Math.abs(delta) < CONF.precision_slice_z) { // on
            where.on.push(p);
        } else if (delta < 0) { // under
            where.under.push(p);
        } else { // over
            where.over.push(p);
        }
        //ConsoleTool.timeStepEnd("slicer_checkUnderOverOn");

    }

    /**
     * Given a point over and under a z offset, calculate
     * and return the intersection point on that z plane
     *
     * @param {Point} over
     * @param {Point} under
     * @param {number} z offset
     * @returns {Point} intersection point
     */
    function intersectPoints(over, under, z) {
        //ConsoleTool.timeStepStart("slicer_intersectPoints");

        let ip = [];
        for (let i = 0; i < over.length; i++) {
            for (let j = 0; j < under.length; j++) {
                ip.push(over[i].intersectZ(under[j], z));
            }
        }
        //ConsoleTool.timeStepEnd("slicer_intersectPoints");

        return ip;
    }

    /**
     * Ensure points are unique with a cache/key algorithm
     */
    function getCachedPoint(phash, p) {
        let cached = phash[p.key];
        if (!cached) {
            phash[p.key] = p;
            return p;
        }
        return cached;
    }

    /**
     * Given two points and hints about their edges,
     * return a new Line object with points sorted
     * lexicographically by key.  This allows for future
     * line de-duplication and joins.
     *
     * @param {Object} phash
     * @param {Point} p1
     * @param {Point} p2
     * @param {boolean} [coplanar]
     * @param {boolean} [edge]
     * @returns {Line}
     */
    function makeZLine(phash, p1, p2, coplanar, edge) {
        //ConsoleTool.timeStepStart("slicer_makeZLine");

        p1 = getCachedPoint(phash, p1);
        p2 = getCachedPoint(phash, p2);
        let line = newOrderedLine(p1,p2);
        line.coplanar = coplanar || false;
        line.edge = edge || false;
        //ConsoleTool.timeStepEnd("slicer_makeZLine");

        return line;
    }

    /**
     * process a single z-slice on a single mesh and
     * add to slices array
     *
     * @param {number} z
     * @param {number} [height] optional real height (fdm)
     */
    function sliceZ(z, points, options = {}, params = {}) {
        let phash = {},
            lines = [],
            p1, p2, p3;

        // iterate over matching buckets for this z offset
        for (let i = 0; i < points.length; ) {
            p1 = points[i++];
            p2 = points[i++];
            p3 = points[i++];
            let where = {under: [], over: [], on: []};
            checkUnderOverOn(p1, z, where);
            checkUnderOverOn(p2, z, where);
            checkUnderOverOn(p3, z, where);
            if (where.under.length === 3 || where.over.length === 3) {
                // does not intersect (all 3 above or below)
            } else if (where.on.length === 2) {
                // one side of triangle is on the Z plane and 3rd is below
                // drop lines with 3rd above because that leads to ambiguities
                // with complex nested polygons on flat surface
                if (where.under.length === 1) {
                    lines.push(makeZLine(phash, where.on[0], where.on[1], false, true));
                }
            } else if (where.on.length === 3) {
                // triangle is coplanar with Z
                // we drop these because this face is attached to 3 others
                // that will satisfy the if above (line) with 2 points
            } else if (where.under.length === 0 || where.over.length === 0) {
                // does not intersect but one point is on the slice Z plane
            } else {
                // compute two point intersections and construct line
                let line = intersectPoints(where.over, where.under, z);
                if (line.length < 2 && where.on.length === 1) {
                    line.push(where.on[0]);
                }
                if (line.length === 2) {
                    lines.push(makeZLine(phash, line[0], line[1]));
                } else {
                    console.log({msg: "invalid ips", line: line, where: where});
                }
            }
        }

        if (lines.length == 0 && options.noEmpty) {
            return;
        }

        // de-dup and group lines
        lines = removeDuplicateLines(lines);
        let groups = connectLines(lines, z, {
            debug: options.debug,
            union: options.union
        });

        // simplistic healing of bad meshes
        if (options.union) {
            groups = POLY.flatten(POLY.union(POLY.nest(groups), 0.1, true), null, true);
        }

        let tops = POLY.nest(groups);
        let data = { lines, groups, tops };

        // look for driver-specific slice post-processor
        if (options.mode) {
            let fn = KIRI.driver[options.mode].slicePost;
            if (fn) {
                fn(data, options, params);
            }
        }

        return data;
    }

    /**
     * Given an array of input lines (line soup), find the path through
     * joining line ends that encompasses the greatest area without self
     * interesection.  Eliminate used points and repeat.  Unjoined lines
     * are permitted and handled after all other cases are handled.
     *
     * @param {Line[]} input
     * @param {number} [index]
     * @returns {Array}
     */
    function connectLines(input, z, opt = {}) {
        let { debug, union } = opt;
        //ConsoleTool.timeStepStart("slicer_connectLines");

        // map points to all other points they're connected to
        let CONF = BASE.config,
            pmap = {},
            points = [],
            output = [],
            connect = [],
            search = 1,
            nextMod = 1,
            emitted = 0,
            forks = false,
            frays = false,
            bridge = CONF.bridgeLineGapDistance,
            bridgeMax = CONF.bridgeLineGapDistanceMax,
            p1, p2, gl;

        function cachedPoint(p) {
            let cp = pmap[p.key];
            if (cp) return cp;
            points.push(p);
            pmap[p.key] = p;
            return p;
        }

        function addConnected(p1, p2) {
            if (!p1.group) p1.group = [ p2 ];
            else p1.group.push(p2);
        }

        function perimeter(array) {
            if (!array.perimeter) {
                array.perimeter = BASE.newPolygon().addPoints(array).perimeter();
            }
            return array.perimeter;
        }

        /**
         * follow points through connected lines to form candidate output paths
         */
        function findNextPath(point, current, branches, depth = 1) {
            let path = [];
            if (current) {
                current.push(path);
            }

            for (;;) {
                // prevent point re-use
                point.del = true;
                // add point to path
                path.push(point);

                let links = point.group.filter(p => !p.del);

                // no need to recurse at the start
                if (links.length === 2 && depth === 1) {
                    point = links[0];
                    // if (debug) console.log({start_mid: point, depth});
                    continue;
                }

                // if fork in the road, follow all paths to their end
                // and find the longest path
                let root = !current, nc;
                if (links.length > 1) {
                    // if (debug) console.log('fork!', {links: links.length, depth, root});
                    if (root) {
                        current = [ path ];
                        branches = [ ];
                    }
                    for (let p of links) {
                        branches.push(nc = current.slice());
                        let rpath = findNextPath(p, nc, branches, depth + 1);
                        // allow point re-use in other path searches
                        for (let p of rpath) p.del = false;
                    }
                    // flatten and sort in ascending perimeter
                    let flat = branches.map(b => b.flat()).sort((a,b) => {
                        return perimeter(b) - perimeter(a);
                    });
                    let npath = flat[0];
                    if (debug) console.log({
                        root,
                        branches: branches.slice(),
                        flat, path, npath
                    });
                    if (root) {
                        for (let p of npath) p.del = true;
                        return npath;
                    } else {
                        return path;
                    }
                    // return root ? npath : path;
                } else {
                    // choose next (unused) point
                    point = links[0];
                }

                // hit an open end or branch
                if (!point || point.del) {
                    return path;
                }
            }

            throw "invalid state";
        }

        // emit a polygon if it can be cleaned and still have 2 or more points
        function emit(poly) {
            emitted += poly.length;
            poly = poly.clean();
            if (poly.length > 2 || true) output.push(poly);
            if (debug) console.log('xray',poly);
        }

        // given an array of paths, emit longest to shortest
        // eliminating points from the paths as they are emitted
        // shorter paths any point eliminated are eliminated as candidates.
        function emitPath(path) {
            let closed = path[0].group.indexOf(path.peek()) >= 0;
            if (closed && path.length > 2) {
                if (debug) console.log({ closed: path.length, path });
                emit(BASE.newPolygon().addPoints(path));
            } else if (path.length > 1) {
                let gap = path[0].distTo2D(path.peek()).round(4);
                if (debug) console.log({ open: path.length, gap, path });
                connect.push(path);
            }
        }

        // create point map, unique point list and point group arrays
        input.forEach(function(line) {
            p1 = cachedPoint(line.p1.round(3));
            p2 = cachedPoint(line.p2.round(3));
            addConnected(p1,p2);
            addConnected(p2,p1);
        });

        // console.log({points, forks: points.filter(p => p.group.length !== 2)});
        // for each unused point, find the longest non-intersecting path

        for (let point of points) {
            gl = point.group.length;
            forks = forks || gl > 2;
            frays = frays || gl < 2;
        }
        if (debug && (forks || frays)) console.log({forks, frays});

        // process paths starting with forks
        if (forks) {
        if (debug) console.log('process forks');
        for (let point of points) {
            // must not have been used and be a dangling end
            if (!point.del && point.group.length > 2) {
                let path = findNextPath(point);
                if (path) emitPath(path);
            }
        } }

        // process paths with dangling endpoints
        if (frays) {
        if (debug) console.log('process frays');
        for (let point of points) {
            // must not have been used and be a dangling end
            if (!point.del && point.group.length === 1) {
                let path = findNextPath(point);
                if (path) emitPath(path);
            }
        } }

        // process normal paths
        if (debug) console.log('process mids');
        for (let point of points) {
            // must not have been used and be a dangling end
            if (!point.del) {
                let path = findNextPath(point);
                if (path) emitPath(path);
            }
        }

        if (debug) console.log({
            points,
            emitted,
            used: points.filter(p => p.del),
            free: points.filter(p => !p.del),
        });

        if (debug && connect.length) console.log({connect});
        if (debug) connect = connect.map(a => a.slice());

        // progressively connect open polygons within a bridge distance
        let iter = 1000;
        let mingap;
        if (true) do {
            mingap = Infinity;

            outer: for (let i=0; i<connect.length; i++) {
                if (!bridge) {
                    emit(BASE.newPolygon().addPoints(root).setOpen());
                    continue;
                }

                // rollup root with arrays after until no more ends match
                inner: while (true) {
                    let root = connect[i];

                    if (root.delete) break;

                    let rfirst = root[0],
                        rlast = root.peek(),
                        dist = rfirst.distToSq2D(rlast),
                        closest = { dist };

                    for (let j=i+1; j<connect.length; j++) {
                        let next = connect[j];

                        if (next.delete) continue;

                        let nfirst = next[0];
                        let nlast = next.peek();

                        // test last to next first
                        dist = rlast.distToSq2D(nfirst);
                        mingap = Math.min(mingap, dist);
                        if (dist < closest.dist && dist <= bridge) {
                            closest = { dist, next }
                        }

                        // test last to next last
                        dist = rlast.distToSq2D(nlast);
                        mingap = Math.min(mingap, dist);
                        if (dist < closest.dist && dist <= bridge) {
                            closest = { dist, next, reverse: next };
                        }

                        // test first to next first
                        dist = rfirst.distToSq2D(nfirst);
                        mingap = Math.min(mingap, dist);
                        if (dist < closest.dist && dist <= bridge) {
                            closest = { dist, next, reverse: root };
                        }

                        // test last to next last
                        dist = rfirst.distToSq2D(nlast);
                        mingap = Math.min(mingap, dist);
                        if (dist < closest.dist && dist <= bridge) {
                            closest = { dist, next, swap: j };
                        }
                    }

                    let { next, reverse, swap } = closest;

                    if (next && closest.dist < bridge) {
                        if (debug) console.log({
                            rollup: root.slice(),
                            next: next.slice(),
                            reverse,
                            swap
                        });
                        if (reverse) {
                            reverse.reverse();
                        }
                        if (swap) {
                            next.appendAll(root);
                            connect[i] = next;
                            connect[swap] = root;
                            root.delete = true;
                            next.merged = true;
                        } else {
                            root.appendAll(next);
                            next.delete = true;
                            root.merged = true;
                        }
                    } else {
                        break inner;
                    }
                }
            }

            bridge = mingap < Infinity ? Math.max(mingap + 0.01, bridge + 0.1) : bridge + 0.1;
            if (debug) console.log({iter, bridge, mingap, bridgeMax});

        } while (iter-- > 0 && bridge && bridge < bridgeMax && mingap < bridgeMax);

        if (debug) console.log({ remain: connect.filter(c => !c.delete) });

        for (let array of connect) {
            if (array.delete) continue;

            let first = array[0];
            let last = array.peek();
            let dist = first.distToSq2D(last);

            if (debug) console.log({
                dist: dist.round(4),
                merged: array.merged || false,
                array
            });
            if (dist <= bridge) {
                // tail meets head (close)
                emit(BASE.newPolygon().addPoints(array));
            } else {
                // tail meets head (far)
                emit(BASE.newPolygon().addPoints(array)
                    // .setOpen()
                );
            }
        }
        //ConsoleTool.timeStepEnd("slicer_connectLines");

        if (debug) console.log({ emitted });
        if (debug && emitted < points.length) console.log({ leftovers:points.length - emitted });

        return output;
    }

    /**
     * eliminate duplicate lines and interior-only lines (coplanar)
     *
     * lines are sorted using lexicographic point keys such that
     * they are comparable even if their points are reversed. hinting
     * for deletion, co-planar and suspect shared edge is detectable at
     * this time.
     *
     * @param {Line[]} lines
     * @returns {Line[]}
     */
    function removeDuplicateLines(lines) {
        let output = [],
            tmplines = [],
            points = [],
            pmap = {};

        function cachePoint(p) {
            let cp = pmap[p.key];
            if (cp) return cp;
            points.push(p);
            pmap[p.key] = p;
            return p;
        }

        function addLinesToPoint(point, line) {
            cachePoint(point);
            if (!point.group) point.group = [ line ];
            else point.group.push(line);
        }

        // mark duplicates for deletion preserving edges
        lines.sort(function (l1, l2) {
            if (l1.key === l2.key) {
                l1.del = !l1.edge;
                l2.del = !l2.edge;
                return 0;
            }
            return l1.key < l2.key ? -1 : 1;
        });

        // associate points with their lines, cull deleted
        for (let line of lines) {
            if (!line.del) {
                tmplines.push(line);
                addLinesToPoint(line.p1, line);
                addLinesToPoint(line.p2, line);
            }
        }

        // merge collinear lines
        for (let point of points) {
            // only merge when point connects to exactly one other point
            if (point.group.length != 2) {
                continue;
            }
            let l1 = point.group[0],
                l2 = point.group[1];
            if (l1.isCollinear(l2)) {
                l1.del = true;
                l2.del = true;
                // find new endpoints that are not shared point
                let p1 = l1.p1 != point ? l1.p1 : l1.p2,
                    p2 = l2.p1 != point ? l2.p1 : l2.p2,
                    newline = BASE.newOrderedLine(p1,p2);
                // remove deleted lines from associated points
                p1.group.remove(l1);
                p1.group.remove(l2);
                p2.group.remove(l1);
                p2.group.remove(l2);
                // associate new line with points
                p1.group.push(newline);
                p2.group.push(newline);
                // add new line to lines array
                newline.edge = l1.edge || l2.edge;
                tmplines.push(newline);
            }
        }

        // mark duplicates for deletion
        // but preserve one if it's an edge
        tmplines.sort(function (l1, l2) {
            if (l1.key === l2.key) {
                l1.del = true;
                l2.del = !l2.edge;
                return 0;
            }
            return l1.key < l2.key ? -1 : 1;
        });

        // create new line array culling deleted
        for (let line of tmplines) {
            if (!line.del) {
                output.push(line);
                line.p1.group = null;
                line.p2.group = null;
            }
        }

        return output;
    }

})();
