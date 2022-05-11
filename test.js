//Do Not more/remove/modify this lines, it's for "in addon" running
global.self = null;

let fs = require('fs');

// Without concat :
const files = [...fs.readFileSync("./scripts/concatModuleScripts.txt").toString().split(/\r?\n/)];
// With concat :
// const files = ["./code/module.js"];

files.map(f => f && (/*console.log(f) || */require(f)));
let kiri = self.kiri;
let engine = kiri.newEngine();

// If you want to force using JS instead of CPP, uncommand this line :
// self.forceUsingJSInsteadOfCPP = true;

// let buf = new Uint8Array(fs.readFileSync('./web/obj/cube.stl')).buffer;
// let buf = new Uint8Array(fs.readFileSync('./web/obj/torus_cylinder.stl')).buffer;
// let buf = new Uint8Array(fs.readFileSync('./web/obj/poussin.stl')).buffer;
let buf = new Uint8Array(fs.readFileSync('./web/obj/text.stl')).buffer;
// let buf = new Uint8Array(fs.readFileSync('./web/obj/bigCube.stl')).buffer;

engine.setListener((mess) => {
    // console.log("mess", mess)
});

console.time("test_totalSlicing");
engine.parse(buf)
    .then(data => {
        // console.log({loaded: data});
    })
    .then(() => {
        console.time("test_move");
        // engine.moveTo(1, 1, 1);
    })
    .then(() => {
        return engine.setProcess({
            "processName": "test",
            "sliceHeight": 0.2,
            "sliceShells": 2,
            "sliceShellOrder": "in-out",
            "sliceLayerStart": "last",
            "sliceLineWidth": 0,
            "sliceFillAngle": 45,
            "sliceFillWidth": 1,
            "sliceFillOverlap": 0.35,
            "sliceFillSparse": 0.2,
            "sliceFillRepeat": 1,
            "sliceFillRate": 0,
            "sliceFillType": "gyroid",
            "sliceSupportDensity": 0.5,
            "sliceSupportOffset": 0.5,
            "sliceSupportGap": 0,
            "sliceSupportSize": 10,
            "sliceSupportArea": 0.1,
            "sliceSupportExtra": 2,
            "sliceSupportAngle": 50,
            "sliceSupportNozzle": 0,
            "sliceSupportEnable": false,
            "sliceSolidMinArea": 1,
            "sliceSolidLayers": 3,
            "sliceBottomLayers": 3,
            "sliceTopLayers": 3,
            "firstSliceHeight": 0.2,
            "firstLayerRate": 30,
            "firstLayerFillRate": 35,
            "firstLayerPrintMult": 1,
            "firstLayerLineMult": 1,
            "firstLayerYOffset": 0,
            "firstLayerNozzleTemp": 0,
            "firstLayerBedTemp": 0,
            "firstLayerBrim": 0,
            "firstLayerBrimIn": 0,
            "firstLayerBrimTrig": 0,
            "firstLayerBrimGap": 0,
            "firstLayerBeltLead": 3,
            "firstLayerBeltBump": 0,
            "firstLayerFanSpeed": 0,
            "outputRaft": false,
            "outputRaftSpacing": 0.2,
            "outputTemp": 200,
            "outputBedTemp": 60,
            "outputFeedrate": 50,
            "outputFinishrate": 50,
            "outputSeekrate": 80,
            "outputShellMult": 1.25,
            "outputFillMult": 1.25,
            "outputSparseMult": 1.25,
            "outputFanSpeed": 255,
            "outputRetractDist": 1.5,
            "outputRetractSpeed": 40,
            "outputRetractWipe": 0,
            "outputRetractDwell": 20,
            "outputBrimCount": 2,
            "outputBrimOffset": 2,
            "outputShortPoly": 100,
            "outputMinSpeed": 10,
            "outputCoastDist": 0,
            "outputPurgeTower": 0,
            "outputBeltFirst": false,
            "outputLayerRetract": false,
            "outputOriginCenter": false,
            "outputLoops": 0,
            "outputInvertX": false,
            "outputInvertY": false,
            "detectThinWalls": false,
            "sliceMinHeight": 0,
            "sliceAdaptive": false,
            "zHopDistance": 0.2,
            "arcTolerance": 0,
            "antiBacklash": 1,
            "ranges": [],
            "sliceSupportSpan": 5,
            "sliceSupportOutline": true,
            "firstLayerFlatten": 0,
            "outputAvoidGaps": true,
            "beltAnchor": 3
        });
    })
    .then(() => {
        console.timeEnd("test_move");
        console.time("test_setDevice");
        return engine.setDevice({
            "noclone": false,
            "mode": "FDM",
            "internal": 0,
            "imageURL": "",
            "imageScale": 0.75,
            "imageAnchor": 0,
            "bedHeight": 2.5,
            "bedWidth": 220,
            "bedDepth": 220,
            "bedRound": false,
            "bedBelt": false,
            "resolutionX": 1600,
            "resolutionY": 900,
            "deviceZMax": 0,
            "maxHeight": 150,
            "originCenter": false,
            "extrudeAbs": false,
            "spindleMax": 0,
            "gcodeFan": [
                "M106 S{fan_speed}"
            ],
            "gcodeTrack": [],
            "gcodeLayer": [],
            "gcodePre": [
                "M104 S{temp} T{tool}     ; set extruder temperature",
                "M140 S{bed_temp} T{tool} ; set bed temperature",
                "G90                      ; set absolute positioning mode",
                "M83                      ; set relative positioning for extruder",
                "M107                     ; turn off filament cooling fan",
                "G28                      ; home axes",
                "G92 X0 Y0 Z0 E0          ; reset all axes positions",
                "G1 X0 Y0 Z0.25 F180      ; move xy to 0,0 and z 0.25mm over bed",
                "G92 E0                   ; zero the extruded",
                "M190 S{bed_temp} T{tool} ; wait for bed to reach target temp",
                "M109 S{temp} T{tool}     ; wait for extruder to reach target temp",
                "G1 E15 F200              ; purge 15mm from extruder",
                "G92 E0                   ; zero the extruded",
                "G1 F225                  ; set feed speed"
            ],
            "gcodePost": [
                "M107                     ; turn off filament cooling fan",
                "M104 S0 T{tool}          ; turn off right extruder",
                "M140 S0 T{tool}          ; turn off bed",
                "G1 Z{z_max} F1200        ; drop bed",
                "G28 X0 Y0                ; home XY axes",
                "M84                      ; disable stepper motors"
            ],

            "gcodeProc": "",
            "gcodeDwell": [],
            "gcodeSpindle": [],
            "gcodeChange": [],
            "gcodeFExt": "gcode",
            "gcodeSpace": true,
            "gcodeStrip": false,
            "gcodeLaserOn": [],
            "gcodeLaserOff": [],
            "extruders": [
                {
                    "extFilament": 1.75,
                    "extNozzle": 0.4,
                    "extSelect": [
                        "T0"
                    ],
                    "extDeselect": [],
                    "extOffsetX": 0,
                    "extOffsetY": 0
                },
                {
                    "extFilament": 1.75,
                    "extNozzle": 0.4,
                    "extSelect": [
                        "T1"
                    ],
                    "extDeselect": [],
                    "extOffsetX": 30,
                    "extOffsetY": 0
                }
            ],
            "new": false,
            "deviceName": "Any.Generic.Marlin",
            "fwRetract": false
        });
    })
    .then(eng => {
        console.timeEnd("test_setDevice");
        console.time("test_slice");
        return eng.slice();

    })
    .then(eng => {
        console.timeEnd("test_slice");
        console.time("test_prepare");
        return eng.prepare()
    })
    .then(eng => {
        console.timeEnd("test_prepare");
        console.time("test_export");
        return eng.export();
        //console.timeEnd("export");
    })
    .then((gcode) => {
        console.timeEnd("test_export");
        fs.writeFileSync("standalone.gcode", gcode);
        console.timeEnd("test_totalSlicing");
    })
    .catch(error => {
        console.log({error});
    }).then(() => {
    //self.consoleTool.logCount();
    //self.consoleTool.logValue();
    // self.consoleTool.logAllTimeStep();
    self.consoleTool.logAllTimeStepWithMin(50);
    // self.Shape2D.logAll();
});
