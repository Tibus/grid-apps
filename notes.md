# Grid:Apps TODOs and Notes

# Kiri:Moto

## `C` cosmetic, `F` functional, `P` performance, `B` bug fix

* `B` origin (and bed size) bug (Onshape?) when switching device modes
* `B` can't drag slider bar on ipad / ios -- touch pad scrolling dodgy

* `P` duplicate objects should share same slice data unless rotated or scaled
* `P` allow selection to be decimated on demand (context menu?)
* `P` explore widget vertex reloading / replacing (Onshape) (issue #48)
* `P` move all persisted / workspace settings/data to IndexedDB (LS limitations)
* `P` do not move (average) endpoints connected to long lines in decimate

* `F` create event-driven do/undo stack and port relevant actions to this
* `F` show slider range values in workspace units (on hover?)
* `F` allow select of a range by typing in values in slices or workspace units
* `F` add % field type with conversion (like units)
* `F` complete and expose grouping feature
* `F` add svgnest-like arrange algorithm
* `F` warn if part hanging in negative Z space or off bed in general
* `F` add instancing support for 3MF files on import

# FDM

* `B` fix support projection/end with grouped parts
* `B` multi-extruder rendering of raft fails to offset the rest of the print
* `B` multi-extruder purge blocks fail to generate properly for rafts

* `F` support pillar top/bottom should conform to part
* `F` support pillar should have solid top/bottom
* `F` more explicit line width control with ranges and min/max adaptive
* `F` test outlining solid projected areas (internally)
* `F` control for size of purge block (with 0=disabled)
* `F` gradient infill https://www.youtube.com/watch?v=hq53gsYREHU&feature=emb_logo
* `F` feather sharp tips by reducing extrusion in area of overlap
* `F` first layer segment large flat areas for better fill reliability
* `F` enable purge blocks when quick layers are detected
* `F` option to support interior bridges when 0% infill
* `F` calculate filament use per extruder per print
* `F` apply finish speed to exposed top and underside flat areas
* `F` expand internal supporting flats / solids before projection

* `P` refactor skirt, brim, raft as synth widget instead of in path routing
* `P` extruder + filament max flow rate cap in planner
* `P` revisit path routing / optimization
* `P` solid fill the tops of supports for down facing flats

# FDM - SLA

# `P` common support area detection (fork new fdm code)
* `P` prioritize supports by length of unsupported span. mandatory when circularity > X
*     or % area of inner to outer poly is high (making it a thin shell)

# FDM - BELT

* `B` auto bed resizing leaves the origin in the wrong place at first
* `B` re-add progress calls for all work units

* `F` promote forced layer retraction to a range parameter
* `F` test and enable arcs in belt more
* `F` refactor brims to be generated at slice time
* `F` anchors should be generated anywhere needed in the print, not just head
* `F` slightly angle supports to lean into the Z of the part
* `F` arrange should align down Z, not side to side.

# CAM

* `B` tabs are not cut to exact height
* `B` tabs do not properly track widget mirror events
* `B` first rough step too far down in certain circumstances?
* `B` need to force cut line at synthetic z bottom (midlines, etc)
* `B` contour does not honor clip to stock?

* `F` roughing flats should be constrained to flat region
* `F` option to output discrete operations as a zip of .gcode files
* `F` limit cut depth to flute length of selected tool (or warn)
* `F` add ease-down support to trace op
* `F` add linear clearing strategy
* `F` add adaptive clearing strategy
* `F` user-defined origin (issue #28)
* `F` intelligently turn circle hole pocket clear into spiral down
* `F` trace follow hole that matches endmill should turn into a drill op
* `F` add climb/conventional into each operation
* `F` update analyzer to detect overhangs from faces, not slices
* `F` extend acute roughing on inside polys to clear small voids
* `F` option to use part / STL coordinate space to determine X,Y origin
* `F` validate muti-part layout and spacing exceeds largest outside tool diameter
* `F` polygon simplification option in tracing (for image derived maps)
* `F` parameterize dropping close points in prep.js. ensure long segments remain straight
* `F` flat and volumetric rendering of paths
* `F` z planar settings visualizations
* `F` convert acute angles to arcs to avoid jerk
* `F` lead-in milling
* `F` trapezoidal tabs in Z
* `F` ease-in and ease-out especially on tab cut-out start/stop
* `F` add option to spiral in vs out (optimal tool life) vs mixed (optimal path)
* `F` add support for tapered ball mills
* `F` can animation clear the mesh in areas where the cuts go through the stock?
* `F` support lathe mode / A-axis / rotary
* `F` gcode output option as zip for multiple or flip ops or tool change
* `F` maintain several part orientations + op chains in a single profile

* `P` decrease cutting speed when entire tool is engaged (start of roughing)
* `P` port arc code from FDM export to CAM export
* `P` common part pre-analyze to speed up 'slice' and improve shadow (overhangs)
* `P` redo all path route / planning in prepare to account for terrain before camOut
* `P` detect render message backlog and pause or warn?
* `P` allow faster z movements when contouring (not plunging)
* `P` common / faster shadow generator using vertices shared with ledges

# Laser

* `F` add PLT / HP-GL output format (https://en.wikipedia.org/wiki/HP-GL)

# OctoPrint plugin

* subfolder parameter for dropped files
* auto-kick check box in preferences


# Mesh:Tool

* add section view. local clip. raycast skip points above plane
* add isolate op = separate bodies
* add decimate op = face reduction
* add flatten/crush op: for z bottoms
* face selection: find regions with < delta to normal
* better z snap using just vertexes from face intersected
* allow setting model/group origin for scale/rotate
* fix mirror to work with groups (just models currently)
* bounding box toggle should be global, not selection
* add analyze results dialog

* rename analyze > patch
* remove repair function?

# Other / Links

* investigate libtess https://www.npmjs.com/package/libtess b/c earcut sometimes wrong
* https://stackoverflow.com/questions/40927728/three-js-determine-if-points-are-co-planar-and-mapping-co-planar-points-onto-x
* https://stackoverflow.com/questions/52818307/determine-whether-one-polygon-contains-another
