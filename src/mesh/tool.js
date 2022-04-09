/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

// dep: ext.earcut
// dep: mesh.geom
gapp.register("mesh.tool", [], (root, exports) => {

const { mesh } = root;
const { geom } = mesh;
const { Vector3 } = THREE;

/**
 * tool for identiying defects and healing them
 * copied from base/mesh which is used by KM. the
 * two need to be merged. earcut needs to be migrated
 * to base.util.triagulate
 */
mesh.tool = class MeshTool {
    constructor(params = {}) {
        this.precision = Math.pow(10, params.precision || 6);
    }

    checkVertices(vertices, mod) {
        if (!vertices) {
            throw "missing vertices";
        }
        if (mod && vertices.length % mod !== 0) {
            throw "invalid vertices";
        }
        return vertices;
    }

    /**
     * @param {number[]} vertices non-indexed
     */
    generateFaces(vertices, opt = {}) {
        this.checkVertices(vertices, 3);
        let doClean = opt.clean !== false;
        let doDedup = opt.dedup !== false;
        let faces = [];
        let fcac = {}; // seen face hash
        let fnew = []; // accumulate vertex triplets
        let nuvt = []; // new vertex list
        let hash = {}; // find vertex matches
        let prec = this.precision;
        let dups = 0;
        let cull = 0;
        for (let i=0, l=vertices.length; i<l; i += 3) {
            let x = vertices[i];
            let y = vertices[i+1];
            let z = vertices[i+2];
            let key = [
                (x * prec) | 0,
                (y * prec) | 0,
                (z * prec) | 0
            ].join('');
            let vpos = hash[key];
            if (vpos === undefined) {
                // add new vertex x,y,z and hash entry with index
                hash[key] = vpos = nuvt.length;
                nuvt.push(x);
                nuvt.push(y);
                nuvt.push(z);
            }
            if (doClean) {
                // add vertex position to face accumulator
                fnew.push(vpos);
                if (fnew.length === 3) {
                    // check and emit face if it's unique
                    // cull invalid faces (has 2 or more shared vertices)
                    if (fnew[0] === fnew[1] || fnew[0] === fnew[2] || fnew[1] === fnew[2]) {
                        fnew = [];
                        cull++;
                        continue;
                    }
                    if (doDedup) {
                        let key = fnew.slice().sort().join('-');
                        // drop duplicate faces (sort handles reverse order)
                        if (!fcac[key]) {
                            faces.appendAll(fnew);
                            fcac[key] = key;
                        } else {
                            dups++;
                        }
                    } else {
                        faces.appendAll(fnew);
                    }
                    fnew = [];
                }
            } else {
                faces.push(vpos);
            }
        }
        this.stats = {cull, dups, faces: faces.length/3};
        // unique vertex array
        this.uvert = nuvt;
        // unique face array. elements are offset into vertices
        this.faces = faces;
        return this;
    }

    generateFaceMap(vertices) {
        this.vertices = this.checkVertices(vertices, 3);
        const normals = this.normals = [];
        const sides = this.sides = [];
        const _va = new THREE.Vector3();
        const _vb = new THREE.Vector3();
        const _vc = new THREE.Vector3();
        for (let i=0, l=vertices.length; i<l; ) {
            _va.set(vertices[i++], vertices[i++], vertices[i++]);
            _vb.set(vertices[i++], vertices[i++], vertices[i++]);
            _vc.set(vertices[i++], vertices[i++], vertices[i++]);
            const vn = THREE.computeFaceNormal(_va, _vb, _vc);
            normals.push([vn.x, vn.y, vn.z]);
        }
        const prec = this.precision;
        const vround = vertices.map(v => (v * prec) | 0);
        const sidekeyid = {};
        const side2face = this.side2face = [];
        for (let i=0, side=0, face=0, l=vround.length; i<l; ) {
            const v1 = [ vround[i++], vround[i++], vround[i++] ].join(',');
            const v2 = [ vround[i++], vround[i++], vround[i++] ].join(',');
            const v3 = [ vround[i++], vround[i++], vround[i++] ].join(',');
            const s1 = ( v1 < v2 ? [ v1, v2] : [ v2, v1 ] ).join('=');
            const s2 = ( v2 < v3 ? [ v2, v3] : [ v3, v2 ] ).join('=');
            const s3 = ( v3 < v1 ? [ v3, v1] : [ v1, v3 ] ).join('=');
            const smap = [ s1, s2, s3 ].map(key => {
                let id = sidekeyid[key];
                if (id >= 0) {
                    return id;
                }
                id = sidekeyid[key] = side++;
                side2face.push([]);
                return id;
            });
            for (let sfa of smap.map(id => side2face[id])) {
                sfa.push(face);
            }
            sides[face] = smap;
            face++;
        }
        return this;
    }

    getAdjacentFaces(face) {
        if (!this.sides) {
            throw "missing sides";
        }
        if (!this.side2face) {
            throw "missing side2face";
        }
        const sides = this.sides[face];
        if (!sides) {
            console.log(`no adjacent faces to ${face}`);
            return [];
        }
        return sides.map(side => this.side2face[side].filter(v => v != face)).flat();
    }

    // depends on generateFaceMap() being run first
    findConnectedSurface(faces, radians, filterZ, found = {}) {
        const norms = this.normals;
        if (filterZ) {
            faces = faces.filter(f => norms[f][2] >= filterZ);
        }
        const checked = {};
        const check = faces.slice();
        for (let face of faces) {
            found[face] = 1;
        }
        // const _v1 = new Vector3();
        // const _v2 = new Vector3();
        while (check.length) {
            const face = check.shift();
            const norm = norms[face];
            // if (!norm || norm.length < 3) {
            //     throw `invalid face ${face}`;
            // }
            if (filterZ !== undefined && norm[2] < filterZ) {
                continue;
            }
            const fadj = this.getAdjacentFaces(face);
            for (let f of fadj) {
                if (found[f] || checked[f]) {
                    continue;
                }
                // #1 most accurate
                // const nf = this.normals[f];
                // _v1.set(nf[0], nf[1], nf[2]);
                // _v2.set(norm[0], norm[1], norm[2]);
                // const fn = _v1.angleTo(_v2);
                // #2 slightly less so
                // const pf = Math.PI / 4;
                // const fn = Math.sin(pf * Math.sqrt(this.normals[f]
                //     .map((v,i) => Math.pow(norm[i] - v, 2))
                //     .reduce((a,v) => a + v)));
                // #3 fastest, still good
                const fn = Math.sqrt(norms[f]
                    .map((v,i) => Math.pow(norm[i] - v, 2))
                    .reduce((a,v) => a + v));
                if (fn <= radians) {
                    faces.push(f);
                    check.push(f)
                    checked[f] = 1;
                    found[f] = 1;
                }
            }
        }
        return faces;
    }

    // depends on generateFaceMap() being run first
    isolateBodies() {
        const verts = this.checkVertices(this.vertices);
        const bodies = [];
        const used = {};
        for (let i=0, l=this.normals.length-1; i<l; i++) {
            if (used[i]) {
                continue;
            }
            const body = this.findConnectedSurface([i], Infinity, undefined, used);
            if (body.length) {
                // todo: pre-allocate known length
                // then copy array regions from verts to bverts
                const bverts = [];
                for (let f of body) {
                    bverts.push(...verts.slice(f*9, f*9+9));
                }
                bodies.push(bverts);
            }
        }
        return bodies;
    }

    /**
     * finds edge lines which are line segments on a single face.
     * construct ordered line maps with array of connected edges.
     * connect lines into polys. earcut polys into new faces.
     * requires generateFaces() be run first
     */
    patch(opt = { merge: true }) {
        let vertices = this.checkVertices(this.uvert);
        let faces = this.faces;
        let hash = {}; // key to line map
        let vmap = {}; // vertext to line map
        let lines = [];

        class Line {
            constructor(v1, v2) {
                this.v1 = v1;
                this.v2 = v2;
                this.faces = [];
            }

            addFace(face) {
                if (this.faces.indexOf(face) < 0) {
                    this.faces.push(face);
                } else if (false) {
                    console.log('adding face to line twice', this, face);
                }
                return this;
            }

            adjacentUnused() {
                return vmap[this.v1]
                    .concat(vmap[this.v2])
                    .filter(l => l !== this && !l.used && l.faces.length === 1);
            }

            adjacentUsed() {
                return vmap[this.v1]
                    .concat(vmap[this.v2])
                    .filter(l => l !== this && l.used && l.faces.length === 1);
            }

            touches(line) {
                return this.v1 === line.v1 ||
                    this.v1 === line.v2 ||
                    this.v2 === line.v1 ||
                    this.v2 === line.v2;
            }

            unitVector() {
                if (this.unit !== undefined) {
                    return this.unit;
                }
                let v1 = this.v1;
                let v2 = this.v2;
                let d = [
                    vertices[v1] - vertices[v2],
                    vertices[v1 + 1] - vertices[v2 + 1],
                    vertices[v1 + 2] - vertices[v2 + 2],
                ];
                let max = Math.max(...d.map(v => Math.abs(v)));
                // console.log({d, max});
                return this.unit = d.map(v => v / max);
            }
        }

        function diffUnitVector(uv1, uv2) {
            let diff = 0;
            for (let i=0; i<3; i++) {
                diff += Math.abs(uv1[i] - uv2[i]);
            }
            return diff;
        }

        function getLine(v1, v2) {
            let s1 = vertices[v1] + vertices[v1+1]*1000 + vertices[v1+2]*100000;
            let s2 = vertices[v2] + vertices[v2+1]*1000 + vertices[v2+2]*100000;
            let key = s1 <= s2 ? [v1,v2].join('-') : [v2,v1].join('-');
            let line = hash[key];
            if (!line) {
                // point order will be swapped for reconstructed faces
                // to preserve chirality (assuming face normals are correct)
                line = hash[key] = new Line(v1, v2);
                line.key = key;
                lines.push(line);
                let lm1 = vmap[v1] = vmap[v1] || [];
                let lm2 = vmap[v2] = vmap[v2] || [];
                lm1.push(line);
                lm2.push(line);
            }
            return line;
        }

        function getXYZ(v) {
            return {x: vertices[v], y: vertices[v+1], z: vertices[v+2]};
        }

        for (let i=0, l=this.faces.length; i<l; i += 3) {
            let v1 = faces[i];
            let v2 = faces[i+1];
            let v3 = faces[i+2];
            let l1 = getLine(v1, v2).addFace(i);
            let l2 = getLine(v2, v3).addFace(i);
            let l3 = getLine(v3, v1).addFace(i);
        }

        // array of unique line segment records with vertices
        // and a list of faces. one = edge, two = inside
        // all lines should be inside or object is not manifold
        // but does not preclude self-intersecting geometries
        this.lines = lines;

        // lines belonging to only one face are on the edge of a hole
        let edges = this.edges = lines.filter(l => l.faces.length === 1);

        // arrays of connected edges that form a closed loop
        let loops = this.loops = [];

        // connect edge lines into closed loops
        for (let i=0, l=edges.length; i<l; i++) {
            let line = edges[i];
            if (line.used) {
                continue;
            }
            // cannot start on split
            if (line.adjacentUnused().length > 2) {
                // console.log('cannot start on a split');
                continue;
            }
            // line.used = true;
            let loop = [ ];
            // build line through adjacent lines
            while (true) {
                let adjacent = line.adjacentUnused();
                if (adjacent.length === 0) {
                    let first = loop[0];
                    let last = loop.last();
                    loop.open = loop.length < 3
                        || (first.v1 !== last.v1
                        && first.v2 !== last.v2
                        && first.v1 !== last.v2
                        && first.v2 !== last.v1);
                    // console.log({term: line, adj: line.adjacentUsed(), open, loop});
                    break;
                } else if (adjacent.length === 1) {
                    if (line.v2 !== adjacent[0].v1) {
                        let tmp = adjacent[0].v1;
                        adjacent[0].v1 = adjacent[0].v2;
                        adjacent[0].v2 = tmp;
                        // console.log('chirality mismatch fixed');
                    }
                    line = adjacent[0];
                } else if (adjacent.length === 2) {
                    // follow edges according to chirality
                    line = adjacent[0].v1 === line.v2 ?
                        adjacent[0] :
                        adjacent[1]
                } else {
                    // console.log('error adjacent', line, adjacent, loops.length, loop.length);
                    line.split = adjacent;
                    line = adjacent[0];
                }
                loop.push(line);
                line.used = true;
            }
            if (loop.length) {
                loops.push(loop);
            }
        }

        // attempt to connect open loops
        if (loops.length > 1) {
            outer: for (let i=0; i<loops.length-1; i++) {
                let l1 = loops[i];
                if (!(l1 && l1.open)) {
                    continue;
                }
                for (let j=i+1; j<loops.length; j++) {
                    let l2 = loops[j];
                    if (!(l2 && l2.open)) {
                        continue;
                    }
                    let nuloop;
                    if (l1[0].touches(l2[0])) {
                        nuloop = [...l2.reverse(), ...l1];
                    } else if (l1[0].touches(l2.last())) {
                        nuloop = [...l2, ...l1];
                    } else if (l1.last().touches(l2[0])) {
                        nuloop = [...l1, ...l2];
                    } else if (l1.last().touches(l2.last())) {
                        nuloop = [...l1, ...l2.reverse()];
                    }
                    if (nuloop) {
                        nuloop.open = true;
                        loops.push(nuloop);
                        loops[i] = loops[j] = undefined;
                        continue outer;
                    }
                }

            }
        }

        // store invalid loops for display / culling
        this.shorts = loops.filter(l => l && l.length <= 2);
        // console.log({edges, loops, shorts: this.shorts});

        // filter out null and short loops
        this.loops = loops = loops.filter(l => l && l.length > 2);
        // console.log({loops_filtered: loops});

        // rotate/flatten to Z plane and use earcut to generate faces
        // because earcut emits point indexes, no need to un-rotate
        function emitLoop(loop) {
            let lastPoint;
            let pindex = [];
            let points = [];
            let dx = 0, dy = 0, dz = 0;

            // gather points, find axis with least deviaton to swap with Z
            let loop1 = loop.slice();
            loop1.push(loop[0]);
            for (let i=0; i<loop1.length; i++) {
                let line = loop1[i];
                let nextPoint;
                if (line.v1 === lastPoint) {
                    nextPoint = line.v2;
                } else {
                    nextPoint = line.v1;
                }
                if (i < loop1.length - 1) {
                    pindex.push(nextPoint);
                    points.push([
                        vertices[nextPoint],
                        vertices[nextPoint+1],
                        vertices[nextPoint+2]
                    ]);
                }
                if (lastPoint >= 0) {
                    dx = Math.max(dx, Math.abs(vertices[lastPoint] - vertices[nextPoint]));
                    dy = Math.max(dy, Math.abs(vertices[lastPoint+1] - vertices[nextPoint+1]));
                    dz = Math.max(dz, Math.abs(vertices[lastPoint+2] - vertices[nextPoint+2]));
                }
                lastPoint = nextPoint;
            }

            // swap Z axis with least delta axis
            let swap = 2;
            if (dy < dx && dy < dz) {
                // swap y,z
                swap = 1;
            } else if (dx < dy && dx < dz) {
                // swap x,z
                swap = 0;
            }
            if (swap < 2) {
                // swap x or y for z axes
                for (let point of points) {
                    let tmpz = point[2];
                    point[2] = point[swap];
                    point[swap] = tmpz;
                }
            }

            return  { index: pindex, points: points.flat(), swap };
        }

        // given a loop with holes, emit faces
        function emitFaces(loop) {
            let { index, points } = loop;
            let ec = earcut(points, undefined, 3);
            // map earcut point indexes back to vertex indexes
            return ec.map(p => index[p]);
        }

        function emitTop(rec) {
            let points = rec.loop.points.slice();
            let index = rec.loop.index.slice();
            let holes = [];
            for (let inner of rec.inner) {
                holes.push(points.length / 3);
                points.appendAll(inner.loop.points);
                index.appendAll(inner.loop.index);
            }
            let ec = earcut(points, holes, 3);
            return ec.map(p => index[p]);
        }

        // new patch areas
        let areas = this.areas = [];

        if (opt.compound) {
            // group loops by normal (using swap as crude proxy for now)
            // then attempt to nest them (find holes)
            let polys = loops.map(loop => {
                return emitLoop(loop);
            });

            // return nested mapping
            let nested = geom.nest(polys.map(p => p.points));
            // recover and map loops from point arrays
            for (let rec of nested) {
                rec.loop = polys.filter(loop => loop.points === rec.points)[0];
            }

            // extract tops which have nesting depth mod 2 === 0
            let tops = nested.filter(rec => rec.depth % 2 === 0);
            for (let top of tops) {
                areas.push(emitTop(top));
            }
        } else {
            // create area faces covering loops
            for (let loop of loops) {
                let l2 = emitLoop(loop);
                let fs = emitFaces(l2);
                areas.push(fs);
            }
        }

        // auto-merge newly found enclosed areas
        if (opt.merge) {
            this.merge();
        }

        // de-reference loops and edges
        if (opt.mapped) {
            this.mapped = {
                edges: this.expandLoop(this.edges),
                areas: this.areas.map(a => this.expandArray(a))
            };
        }

        return this;
    }

    // add vertex data from given index into array
    appendVertex(index, array = []) {
        let vertx = this.uvert;
        array.push(vertx[index++]);
        array.push(vertx[index++]);
        array.push(vertx[index]);
        return array;
    }

    // add vertices from a vertex index list to an array
    expandArray(indices, array = []) {
        for (let i of indices) {
            this.appendVertex(i, array);
        }
        return array;
    }

    // turn loop into XYZ vertex array
    expandLoop(loop, array = []) {
        for (let line of loop) {
            this.appendVertex(line.v1, array);
            this.appendVertex(line.v2, array);
        }
        return array;
    }

    // merge generated poly areas into faces
    merge() {
        for (let area of this.areas || []) {
            this.faces.appendAll(area);
        }
    }

    // return non-indexed vertex list (for compatibility)
    unrolled() {
        let out = [];
        for (let face of this.faces) {
            this.appendVertex(face, out);
        }
        return out;
    }
};

});
