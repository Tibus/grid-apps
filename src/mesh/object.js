/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

(function() {

gapp.register("mesh.object", [
    "add.three",    // dep: add.three
    "moto.license", // dep: moto.license
]);

let mesh = self.mesh = self.mesh || {};
if (mesh.object) return;

mesh.object = class MeshObject {

    // @returns {THREE.Object3D}
    object() {
        throw "object() requires implementation";
    }

    bounds() {
        return mesh.util.bounds(this.object());
    }

    floor() {
        let b = this.bounds();
        this.move(0, 0, -b.min.z);
        return this;
    }

    center(bounds) {
        let b = bounds || this.bounds();
        this.move(-b.center.x, b.center.y, -b.center.z);
        return this;
    }

    centerXY(bounds) {
        let b = bounds || this.bounds();
        this.move(-b.center.x, b.center.y, 0);
        return this;
    }

    move(x = 0, y = 0, z = 0) {
        let pos = this.position();
        pos.set(pos.x + x, pos.y + y, pos.z + z);
        moto.Space.update();
        return this;
    }

    scale() {
        let scale = this.object().scale;
        if (arguments.length === 0) {
            return scale;
        }
        scale.set(...arguments);
        moto.Space.update();
    }

    // use with caution. frames of reference interfere.
    rotation() {
        let rot = this.object().rotation;
        if (arguments.length === 0) {
            return rot;
        }
        rot.set(...arguments);
        moto.Space.update();
    }

    rotate(x = 0, y = 0, z = 0) {
        if (x) this.object().rotateOnWorldAxis(new THREE.Vector3(1,0,0), x);
        if (y) this.object().rotateOnWorldAxis(new THREE.Vector3(0,1,0), y);
        if (z) this.object().rotateOnWorldAxis(new THREE.Vector3(0,0,1), z);
    }

    position() {
        let pos = this.object().position;
        if (arguments.length === 0) {
            return pos;
        }
        pos.set(...arguments);
        moto.Space.update();
    }
};

})();