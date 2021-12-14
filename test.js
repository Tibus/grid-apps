let addon3D;

try {
  addon3D = require('./build/Debug/gridapp');
} catch (error) {
  addon3D = require('./build/Release/gridapp');
}

console.log("addon3D :", addon3D.test());

let fs = require('fs');

/* ---------------------------- */
/* only if THREE is not defined */
/* ---------------------------- */
exports = {};
THREE = {}
eval(fs.readFileSync("./node_modules/three/build/three.min.js").toString());
Object.assign(THREE, exports);

/* ---------------------------- */
/* only if THREE is not defined */
/* ---------------------------- */


// eval(fs.readFileSync("./code/standalone.js").toString());
let kiri = require("./code/test.js").kiri;

let engine = kiri.newEngine();
global.forceUsingJSInsteadOfCPP = false;

let buf = new Uint8Array(fs.readFileSync('./web/obj/cube.stl')).buffer;
// return;

// let buf = fs.readFileSync('./web/obj/poussin.stl').buffer;
// engine.setListener((mess)=>{console.log("mess", mess)});

console.time("slicing");
engine.parse(buf)
    .then(data => {
        // console.log({loaded: data});
    })
    .then(() => engine.moveTo(1,1,1))
    .then(() => engine.setProcess({
        "sName":"Ender3_test",
        "sliceHeight":0.25,
        "sliceShells":3,
        "sliceShellOrder":"in-out",
        "sliceLayerStart":"last",
        "sliceFillAngle":45,
        "sliceFillOverlap":0.3,
        "sliceFillSparse":0.2,
        "sliceFillType":"grid",
        "sliceAdaptive":false,
        "sliceMinHeight":0,
        "sliceSupportDensity":0.25,
        "sliceSupportOffset":0.4,
        "sliceSupportGap":1,
        "sliceSupportSize":6,
        "sliceSupportArea":1,
        "sliceSupportExtra":0,
        "sliceSupportAngle":50,
        "sliceSupportNozzle":0,
        "sliceSolidMinArea":10,
        "sliceSolidLayers":3,
        "sliceBottomLayers":3,
        "sliceTopLayers":3,
        "firstLayerRate":10,
        "firstLayerPrintMult":1.15,
        "firstLayerYOffset":0,
        "firstLayerBrim":0,
        "firstLayerBeltLead":3,
        "outputTemp":210,
        "outputBedTemp":60,
        "outputFeedrate":50,
        "outputFinishrate":50,
        "outputSeekrate":80,
        "outputShellMult":1.25,
        "outputFillMult":1.25,
        "outputSparseMult":1.25,
        "outputRetractDist":4,
        "outputRetractSpeed":30,
        "outputRetractDwell":30,
        "outputShortPoly":100,
        "outputMinSpeed":10,
        "outputCoastDist":0.1,
        "outputLayerRetract":true,
        "detectThinWalls":true,
        "zHopDistance":0,
        "antiBacklash":0,
        "outputOriginCenter":false,
        "sliceFillRate":0,
        "sliceSupportEnable":false,
        "firstSliceHeight":0.25,
        "firstLayerFillRate":35,
        "firstLayerLineMult":1,
        "firstLayerNozzleTemp":0,
        "firstLayerBedTemp":0,
        "firstLayerBrimTrig":0,
        "outputRaft":false,
        "outputRaftSpacing":0.2,
        "outputRetractWipe":0,
        "outputBrimCount":2,
        "outputBrimOffset":2,
        "outputLoopLayers":null,
        "outputInvertX":false,
        "outputInvertY":false,
        "arcTolerance":0,
        "gcodePause":"",
        "ranges":[],
        "firstLayerFanSpeed":0,
        "outputFanSpeed":255
    }))
    .then(() => engine.setDevice({
        "noclone":false,
        "mode":"FDM",
        "internal":0,
        "imageURL":"",
        "imageScale":0.75,
        "imageAnchor":0,
        "bedHeight":2.5,
        "bedWidth":220,
        "bedDepth":220,
        "bedRound":false,
        "bedBelt":false,
        "maxHeight":300,
        "originCenter":false,
        "extrudeAbs":true,
        "spindleMax":0,
        "gcodeFan":[ "M106 S{fan_speed}" ],
        "gcodeTrack":[],
        "gcodeLayer":[],
        "gcodePre":[
            "M107                     ; turn off filament cooling fan",
            "G90                      ; set absolute positioning mode",
            "M82                      ; set absolute positioning for extruder",
            "M104 S{temp} T{tool}     ; set extruder temperature",
            "M140 S{bed_temp} T{tool} ; set bed temperature",
            "G28                      ; home axes",
            "G92 X0 Y0 Z0 E0          ; reset all axes positions",
            "G1 X0 Y0 Z0.25 F180      ; move XY to 0,0 and Z 0.25mm over bed",
            "G92 E0                   ; zero the extruded",
            "M190 S{bed_temp} T{tool} ; wait for bed to reach target temp",
            "M109 S{temp} T{tool}     ; wait for extruder to reach target temp",
            "G92 E0                   ; zero the extruded",
            "G1 F225                  ; set feed speed"
        ],
        "gcodePost":[
            "M107                     ; turn off filament cooling fan",
            "M104 S0 T{tool}          ; turn off right extruder",
            "M140 S0 T{tool}          ; turn off bed",
            "G1 X0 Y300 F1200         ; end move",
            "M84                      ; disable stepper motors"
        ],
        "gcodeProc":"",
        "gcodePause":[],
        "gcodeDwell":[],
        "gcodeSpindle":[],
        "gcodeChange":[],
        "gcodeFExt":"gcode",
        "gcodeSpace":true,
        "gcodeStrip":false,
        "gcodeLaserOn":[],
        "gcodeLaserOff":[],
        "extruders":[
        {
            "extFilament":1.75,
            "extNozzle":0.4,
            "extSelect":[ "T0" ],
            "extDeselect":[],
            "extOffsetX":0,
            "extOffsetY":0
        }
        ],
        "new":false,
        "deviceName":"Creality.Ender.3"
    }))
    .then(eng => eng.slice())
    .then(eng => eng.prepare())
    .then(eng => engine.export())
    .then(gcode => {
        fs.writeFileSync("standalone.gcode", gcode);
        console.timeEnd("slicing");
    })
    .catch(error => {
        console.log({error});
    });
