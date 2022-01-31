/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

(function () {

    if (!self.kiri) {
        let kiri = self.kiri = {
            beta: 3204,
            driver: {}, // driver modules
            loader: [], // module loading: array of functions
            load: (fn) => kiri.loader.push(fn)
        };
    }

})();
