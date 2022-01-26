/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

(function() {

    const KIRI = self.kiri,
        CAM = KIRI.driver.CAM = {
            // init,        // src/mode/cam/client.js
            // slice,       // src/mode/cam/slice.js
            // prepare,     // src/mode/cam/prepare.js
            // export       // src/mode/cam/export.js
        },
        CPRO = CAM.process = {
            LEVEL: 1,
            ROUGH: 2,
            OUTLINE: 3,
            CONTOUR_X: 4,
            CONTOUR_Y: 5,
            TRACE: 6,
            DRILL: 7
        };

        // defer loading until KIRI.client and KIRI.worker exist
        KIRI.loader.push(function(API) {

            if (KIRI.client)
            CAM.traces = function(ondone, single) {
                KIRI.client.sync();
                let settings = API.conf.get();
                let widgets = API.widgets.map();
                KIRI.client.send("cam_traces", { settings, single }, output => {
                    let ids = [];
                    KIRI.codec.decode(output).forEach(rec => {
                        ids.push(rec.id);
                        widgets[rec.id].traces = rec.traces;
                    });
                    ondone(ids);
                });
            };

            if (KIRI.worker)
            KIRI.worker.cam_traces = function(data, send) {
                const { settings, single } = data;
                const widgets = Object.values(wcache);
                const fresh = widgets.filter(widget => CAM.traces(settings, widget, single));
                send.done(KIRI.codec.encode(fresh.map(widget => { return {
                    id: widget.id,
                    traces: widget.traces,
                } } )));
            };

        });

})();
