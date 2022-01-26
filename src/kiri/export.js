console.log/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

(function() {

    if (self.kiri.export) return;

    const KIRI = self.kiri,
        BASE = self.base,
        UTIL = BASE.util,
        API = KIRI.api,
        SDB = API.sdb,
        UI = API.ui,
        STATS = API.stats,
        MODES = API.const.MODES;

    KIRI.export = exportFile;

    let printSeq = parseInt(SDB['kiri-print-seq'] || SDB['print-seq'] || "0") + 1;

    function exportFile(options) {
        let mode = API.mode.get();
        let names = API.widgets.all().map(w => w.meta ? w.meta.file : undefined)
            .filter(v => v)
            .map(v => v.replace(/ /g,'-'))
            .map(v => v.substring(0,20))
            .map(v => v.split('.')[0]);
        API.event.emit('export', mode);
        switch (mode) {
            case 'LASER': return callExportLaser(options, names);
            case 'FDM': return callExport(options, mode, names);
            case 'CAM': return callExport(options, mode, names);
            case 'SLA': return callExportSLA(options, names);
        }
    }

    function callExport(callback, mode, names) {
        let alert = API.feature.work_alerts ? API.show.alert("Exporting") : null;
        let gcode = [];
        let section = [];
        let sections = { };
        KIRI.client.export(API.conf.get(), (line) => {
            if (typeof line !== 'string') {
                if (line.section) {
                    sections[line.section] = section = [];
                }
                return;
            }
            gcode.push(line);
            section.push(line);
        }, (output, error) => {
            API.hide.alert(alert);
            if (error) {
                API.show.alert(error, 5);
            } else if (callback) {
                callback(gcode.join('\r\n'), output);
            } else {
                exportGCodeDialog(gcode, mode === 'CAM' ? sections : undefined, output, names);
            }
        });
    }

    function callExportLaser(options, names) {
        KIRI.client.export(API.conf.get(), (line) => {
            console.log({unexpected_line: line});
        }, (output, error) => {
            if (error) {
                API.show.alert(error, 5);
            } else {
                exportLaserDialog(output, names);
            }
        });
    }

    function callExportSLA(options, names) {
        KIRI.client.export(API.conf.get(), (line) => {
            API.show.progress(line.progress, "exporting");
        }, (output, error) => {
            API.show.progress(0);
            if (error) {
                API.show.alert(error, 5);
            } else {
                KIRI.driver.SLA.printDownload(output, API, names);
            }
        });
    }

    function exportLaserDialog(data, names) {
        SDB['kiri-print-seq'] = printSeq++;

        const fileroot = names[0] || "laser";
        const filename = `${fileroot}-${(printSeq.toString().padStart(3,"0"))}`;
        const settings = API.conf.get();
        const driver = KIRI.driver.LASER;

        function download_svg() {
            API.util.download(
                driver.exportSVG(settings, data),
                $('print-filename').value + ".svg"
            );
        }

        function download_dxf() {
            API.util.download(
                driver.exportDXF(settings, data),
                $('print-filename').value + ".dxf"
            );
        }

        function download_gcode() {
            API.util.download(
                driver.exportGCode(settings, data),
                $('print-filename').value + ".gcode"
            );
        }

        API.ajax("/kiri/output-laser.html", function(html) {
            let segments = 0;
            data.forEach(layer => { segments += layer.length });
            UI.print.innerHTML = html;
            $('print-filename').value = filename;
            $('print-lines').value = UTIL.comma(segments);
            $('print-svg').onclick = download_svg;
            $('print-dxf').onclick = download_dxf;
            $('print-lg').onclick = download_gcode;
            API.modal.show('print');
        });
    }

    function exportGCodeDialog(gcode, sections, info, names) {
        SDB['kiri-print-seq'] = printSeq++;

        let settings = API.conf.get(),
            MODE = API.mode.get_id(),
            name = names[0] || (MODE === MODES.CAM ? "cnc" : "print"),
            pre = `${name}-${(printSeq.toString().padStart(3,"0"))}`,
            filename = pre,// + (new Date().getTime().toString(36)),
            fileext = settings.device.gcodeFExt || "gcode",
            codeproc = settings.device.gcodeProc,
            octo_host,
            octo_apik,
            grid_host,
            grid_apik,
            grid_target,
            grid_targets = {},
            grid_local,
            grid_uuid;

        // join gcode array into a string
        gcode = gcode.join('\r\n');

        // run gcode post processor function (when supplied and valid)
        if (codeproc && self[codeproc]) {
            gcode = self[codeproc](gcode);
        }

        function getBlob() {
            return new Blob(
                [gcode],
                {type:"application/octet-stream"});
        }

        function sendto_octoprint() {
            if (!(octo_host && octo_apik)) return;

            let form = new FormData(),
                ajax = new XMLHttpRequest(),
                host = octo_host.value.toLowerCase(),
                apik = octo_apik.value;

            if (host.indexOf("http") !== 0) {
                API.show.alert("host missing protocol (http:// or https://)");
                return;
            }
            if (API.const.SECURE && !API.util.isSecure(host)) {
                API.show.alert("host must begin with 'https' on a secure site");
                return;
            }

            SDB['octo-host'] = host.trim();
            SDB['octo-apik'] = apik.trim();

            filename = $('print-filename').value;
            form.append("file", getBlob(), filename+"."+fileext);
            ajax.onreadystatechange = function() {
                if (ajax.readyState === 4) {
                    let status = ajax.status;
                    STATS.add(`ua_${API.mode.get_lower()}_print_octo_${status}`);
                    if (status >= 200 && status < 300) {
                        API.modal.hide();
                    } else {
                        API.show.alert("octoprint error\nstatus: "+status+"\nmessage: "+ajax.responseText);
                    }
                    API.show.progress(0);
                }
                API.show.progress(0);
            };
            ajax.upload.addEventListener('progress', function(evt) {
                API.show.progress(evt.loaded/evt.total, "sending");
            });
            ajax.open("POST", host+"/api/files/local");
            if (apik) {
                ajax.setRequestHeader("X-Api-Key", apik);
            }
            ajax.send(form);
        }

        function gridhost_tracker(host,key) {
            ajax(host+"/api/check?key="+key, function(data) {
                data = js2o(data);
                console.log(data);
                if (!(data.done || data.error)) {
                    setTimeout(function() { gridhost_tracker(host,key) }, 1000);
                }
            });
        }

        function gridlocal_probe(ev, devs) {
            if (ev && ev.code !== 'Enter') return;

            if (!devs && API.probe.local(gridlocal_probe)) return;

            grid_local = devs;

            let gdev = SDB['grid-local'];
            let gloc = $('grid-local');
            let html = [];
            for (let uuid in devs) {
                gdev = gdev || uuid;
                let dev = devs[uuid];
                let sel = uuid === gdev ? ' selected' : '';
                html.push(`<option id="gl-${uuid}" value="${uuid}" ${sel}>${dev.stat.device.name}</option>`);
            }

            if (html.length) {
                gloc.innerHTML = html.join('\n');
                gloc.onchange = (ev) => {
                    SDB['grid-local'] = gloc.options[gloc.selectedIndex].value
                };
                $('send-to-gridhead').style.display = 'flex';
                $('send-to-gridspool').style.display = 'flex';
            } else {
                $('send-to-gridhead').style.display = '';
                $('send-to-gridspool').style.display = '';
            }
        }

        function sendto_gridlocal() {
            let uuid = $('grid-local').value;
            let dev = grid_local[uuid];
            if (dev) {
                let file = $('print-filename').value;
                fetch(
                    `${API.probe.live}/api/grid_send?uuid=${uuid}&file=${encodeURIComponent(file + "." + fileext)}`,
                    {method: "POST", body: gcode}
                )
                .then(t => t.text())
                .then(t => {
                    STATS.add(`ua_${API.mode.get_lower()}_print_local_ok`);
                    console.log({grid_spool_said: t});
                })
                .catch(e => {
                    STATS.add(`ua_${API.mode.get_lower()}_print_local_err`);
                    console.log({grid_local_spool_error: e});
                })
                .finally(() => {
                    API.modal.hide();
                });
            }
        }

        function admin_gridlocal() {
            let dev = grid_local[$('grid-local').value];
            if (dev && dev.stat && dev.stat.device) {
                let dsd = dev.stat.device;
                window.open(`http://${dsd.addr[0]}:${dsd.port || 4080}`, "_grid_admin");
            }
        }

        function gridhost_probe(ev, set_host) {
            if (ev && ev.code !== 'Enter') return;
            if (!(grid_host && grid_apik)) return;

            if (set_host) grid_host.value = set_host;

            let xhtr = new XMLHttpRequest(),
                host = grid_host.value,
                apik = grid_apik.value,
                target = grid_target.value;

            if (!apik) $('gpapik').style.display = 'none';

            if (!host && API.probe.grid(gridhost_probe)) return;

            if (!host) return;

            xhtr.onreadystatechange = function() {
                if (xhtr.readyState === 4) {
                    if (xhtr.status >= 200 && xhtr.status < 300) {
                        SDB['grid-host'] = host;
                        SDB['grid-apik'] = apik;
                        let res = JSON.parse(xhtr.responseText);
                        let sel = false;
                        let match = false;
                        let first = null;
                        let html = [];
                        grid_targets = {};
                        for (let key in res) {
                            first = first || key;
                            if (!SDB['grid-target']) {
                                SDB['grid-target'] = key;
                                sel = true;
                            } else {
                                sel = SDB['grid-target'] === key;
                            }
                            match = match || sel;
                            grid_targets[html.length] = key;
                            html.push(
                                "<option id='gpo-'" + key + " value='" +key + "'" +
                                (sel ? " selected" : "") +
                                ">" +
                                (res[key].comment || key) +
                                "</option>"
                            );
                        }
                        if (!match) {
                            SDB['grid-target'] = first;
                        }
                        grid_target.innerHTML = html.join('\n');
                    } else if (xhtr.status === 401) {
                        $('gpapik').style.display = '';
                    } else {
                        SDB.removeItem('grid-host');
                        SDB.removeItem('grid-apik');
                        console.log("invalid grid:host url");
                    }
                }
            };

            xhtr.open("GET", host + "/api/active?key=" + apik);
            xhtr.send();
        }

        function sendto_gridhost() {
            if (!(grid_host && grid_apik)) return;

            let xhtr = new XMLHttpRequest(),
                host = grid_host.value,
                apik = grid_apik.value,
                target = SDB['grid-target'] || '';

            if (target === '') {
                API.show.alert('invalid or missing target');
                return;
            }
            if (host.indexOf("http") !== 0) {
                API.show.alert("host missing protocol (http:// or https://)");
                return;
            }
            if (host.indexOf("://") < 0) {
                API.show.alert("host:port malformed");
                return;
            }
            if (API.const.SECURE && !API.util.isSecure(host)) {
                API.show.alert("host must begin with 'https' on a secure site");
                return;
            }

            SDB['grid-host'] = host.trim();
            SDB['grid-apik'] = apik.trim();

            xhtr.onreadystatechange = function() {
                if (xhtr.readyState === 4) {
                    let status = xhtr.status;
                    STATS.add(`ua_${API.mode.get_lower()}_print_grid_${status}`);
                    if (status >= 200 && status < 300) {
                        let json = js2o(xhtr.responseText);
                        gridhost_tracker(host,json.key);
                        API.ajax(host+"/api/wait?key="+json.key, function(data) {
                            data = js2o(data);
                            console.log(data);
                            API.show.alert("print to "+target+": "+data.status, 600);
                        });
                    } else {
                        API.show.alert("grid:host error\nstatus: "+status+"\nmessage: "+xhtr.responseText, 10000);
                    }
                    API.show.progress(0);
                }
            };
            xhtr.upload.addEventListener('progress', function(evt) {
                API.show.progress(evt.loaded/evt.total, "sending");
            });
            filename = $('print-filename').value;
            xhtr.open("POST",
                host + "/api/print?" +
                "filename=" + filename +
                "&target=" + target +
                "&key=" + apik +
                "&time=" + Math.round(info.time) +
                "&length=" + Math.round(info.distance) +
                "&image=" + filename
            );
            xhtr.setRequestHeader("Content-Type", "text/plain");
            let snapshot = API.view.snapshot;
            xhtr.send(snapshot ? [gcode,snapshot].join("\0") : gcode);
            API.modal.hide();
        }

        function download() {
            filename = $('print-filename').value;
            API.util.download(gcode, filename + "." + fileext);
            // saveAs(getBlob(), filename + "." + fileext);
        }

        function pad(v) {
            v = v.toString();
            return v.length < 2 ? '0' + v : v;
        }

        function calcWeight() {
            try {
            let density = $('print-density');
            $('print-weight').value = (
                (Math.PI * UTIL.sqr(
                    info.settings.device.extruders[0].extFilament / 2
                )) *
                info.distance *
                (parseFloat(density.value) || 1.25) /
                1000
            ).toFixed(2);
            density.onkeyup = (ev) => {
                if (ev.key === 'Enter') calcWeight();
            };
            } catch (e) { }
        }

        function calcTime() {
            let floor = Math.floor,
                time = floor(info.time),
                hours = floor(time / 3600),
                newtime = time - hours * 3600,
                mins = floor(newtime / 60),
                secs = newtime - mins * 60;

            $('output-time').value = [pad(hours),pad(mins),pad(secs)].join(':');
        }

        fetch("/kiri/output-gcode.html").then(r => r.text()).then(html => {
            UI.print.innerHTML = html;
            let set = API.conf.get();
            let fdm = MODE === MODES.FDM;
            let octo = set.controller.exportOcto && MODE !== MODES.CAM;
            let ghost = set.controller.exportGhost;
            let local = set.controller.exportLocal;
            let preview = set.controller.exportPreview;
            $('code-preview-head').style.display = preview ? '' : 'none';
            $('code-preview').style.display = preview ? '' : 'none';
            $('print-download').onclick = download;
            $('print-filament-head').style.display = fdm ? '' : 'none';
            $('print-filament-info').style.display = fdm ? '' : 'none';
            $('print-filename').value = filename;
            $('print-filesize').value = UTIL.comma(info.bytes);
            $('print-filament').value = Math.round(info.distance);
            calcTime();
            if (fdm) {
                calcWeight();
            }

            // in cam mode, show zip file option
            let downloadZip = $('print-zip');
            downloadZip.style.display = sections ? 'flex' : 'none';
            downloadZip.onclick = function() {
                let files = [];
                for (let [ name, data ] of Object.entries(sections)) {
                    if (name.indexOf('op-') === 0) {
                        let head = sections.header || [];
                        let foot = sections.footer || [];
                        files.push({
                            name: `${name}.${fileext}`,
                            data: [ ...head, ...data, ...foot ].join('\r\n')
                        })
                    }
                }
                KIRI.client.zip(files, progress => {
                    API.show.progress(progress.percent/100, "generating zip files");
                }, output => {
                    API.show.progress(0);
                    API.util.download(output, `${$('print-filename').value}.zip`);
                })
            };

            // in palette mode, show download button
            let downloadPalette = $('print-palette');
            downloadPalette.style.display = info.segments ? 'flex' : 'none';
            // generate MAFX downloadble file
            if (info.segments) {
                // todo: reduce segments to eliminate 0 lenghts and transitions before 150mm
                let { settings, segments } = info;
                let { device, bounds } = settings;
                let { min, max } = bounds;
                let extras = device.extras || {};
                let pinfo = extras.palette || {};
                // filter pings to those occuring after all tubes combined
                let pings = info.purges || [];
                let driveInfo = {};
                let volume = {};
                let length = {};
                // clean up and round pings
                pings.forEach(p => {
                    p.length = p.length.round(3);
                    // p.length = (p.length - pinfo.offset).round(2);
                    // p.length = (p.length + pinfo.offset).round(2);
                    p.extrusion = p.extrusion.round(3);
                });
                // add length of push filament to the last segment
                segments.peek().emitted += pinfo.push;
                let lastEmit = 0;
                let ratioVolume = (0.4 * 0.4) / (1.75 * 1.75);
                for (let seg of segments) {
                    let seginfo = driveInfo[seg.tool] = driveInfo[seg.tool] || { length: 0, volume: 0 };
                    seg.emitted += pinfo.offset;
                    seginfo.length += seg.emitted - lastEmit;
                    seginfo.volume = seginfo.length * ratioVolume;
                    volume[seg.tool+1] = seginfo.volume.round(2);
                    length[seg.tool+1] = seginfo.length.round(2);
                    lastEmit = seg.emitted;
                }
                let totalLength = Object.values(length).reduce((a,v) => a+v).round(2);
                let totalVolume = Object.values(volume).reduce((a,v) => a+v).round(2);
                // console.log({info, device, pinfo, segments, volume, length, totalLength});
                let meta = {
                    version: "3.2",
                    printerProfile: {
                        id: pinfo.printer,
                        name: device.deviceName || "My Printer"
                    },
                    preheatTemperature: { nozzle: [0], bed: 0 },
                    paletteNozzle: 0,
                    time: info.time.round(1),
                    volume,
                    length,
                    totalLength,
                    totalVolume,
                    inputsUsed: Object.keys(driveInfo).length,
                    splices: segments.length,
                    pings: pings.length,
                    boundingBox: {
                        min: [ min.x, min.y, min.z ],
                        max: [ max.x, max.y, max.z ]
                    },
                    filaments: Object.keys(driveInfo).map(v => { return {
                        name: `Color${v}`,
                        type: "Filament",
                        color: `#${v}0${v}0${v}0`,
                        materialId: parseInt(v) + 1,
                        filamentId: parseInt(v) + 1
                    }}),
                };
                let lastDrive;
                let algokeys = {};
                let algorithms = [];
                let defaultSplice = {
                    compression: pinfo.press,
                    cooling: pinfo.cool,
                    heat: pinfo.heat
                };
                for (let key of Object.keys(driveInfo)) {
                    key = parseInt(key) + 1;
                    algorithms.push({
                        ingoingId: key,
                        outgoingId: key,
                        ...defaultSplice
                    });
                }
                let palette = {
                    version: "3.0",
                    drives: [0, 0, 0, 0, 0, 0, 0, 0].map((v,i) => {
                        return driveInfo[i] ? i+1 : 0
                    }),
                    splices: segments.filter(r => {
                        return r.emitted >= 150;
                    }).map(r => {
                        if (lastDrive >= 0 && lastDrive !== r.tool) {
                            let key = `${lastDrive}+${r.tool}`;
                            if (!algokeys[key]) {
                                let rec = algokeys[key] = {
                                    ingoingId: lastDrive + 1,
                                    outgoingId: r.tool + 1,
                                    ...defaultSplice
                                };
                                algorithms.push(rec);
                            }
                        }
                        lastDrive = r.tool;
                        return { id: r.tool + 1, length: r.emitted.round(2) }
                    }),
                    pings,
                    algorithms
                };
                let png;
                KIRI.work.png({}, data => {
                    png = data.png;
                });
                console.log({meta,palette});
                downloadPalette.onclick = function() {
                    KIRI.client.zip([
                        {name:"meta.json", data:JSON.stringify(meta,undefined,4)},
                        {name:"palette.json", data:JSON.stringify(palette,undefined,4)},
                        {name:"thumbnail.png", data:png.buffer}
                    ], progress => {
                        API.show.progress(progress.percent/100, "generating palette files");
                    }, output => {
                        API.show.progress(0);
                        API.util.download(output, `${$('print-filename').value}.mafx`);
                    })
                };
            }

            // octoprint setup
            $('send-to-octohead').style.display = octo ? '' : 'none';
            $('send-to-octoprint').style.display = octo ? '' : 'none';
            if (octo) try {
                $('print-octoprint').onclick = sendto_octoprint;
                octo_host = $('octo-host');
                octo_apik = $('octo-apik');
                if (MODE === MODES.CAM) {
                    $('send-to-octohead').style.display = 'none';
                    $('send-to-octoprint').style.display = 'none';
                } else {
                    $('send-to-octohead').style.display = '';
                    $('send-to-octoprint').style.display = '';
                }
                // hide octoprint when hard-coded in the url
                if (API.const.OCTO) {
                    $('ophost').style.display = 'none';
                    $('opapik').style.display = 'none';
                    $('oph1nt').style.display = 'none';
                    $('send-to-gridhost').style.display = 'none';
                }
                octo_host.value = SDB['octo-host'] || '';
                octo_apik.value = SDB['octo-apik'] || '';
            } catch (e) { console.log(e) }

            // grid:host setup
            $('send-to-hosthead').style.display = ghost ? '' : 'none';
            $('send-to-gridhost').style.display = ghost ? '' : 'none';
            if (ghost) try {
                $('print-gridhost').onclick = sendto_gridhost;
                $('grid-host').onkeyup = gridhost_probe;
                $('grid-apik').onkeyup = gridhost_probe;
                grid_host = $('grid-host');
                grid_apik = $('grid-apik');
                grid_target = $('grid-target');
                grid_target.onchange = function(ev) {
                    SDB['grid-target'] = grid_targets[grid_target.selectedIndex];
                };
                grid_host.value = SDB['grid-host'] || '';
                grid_apik.value = SDB['grid-apik'] || '';
                gridhost_probe();
            } catch (e) { console.log(e) }

            // grid:local setup
            if (local) try {
                gridlocal_probe();
                $('print-gridlocal').onclick = sendto_gridlocal;
                $('admin-gridlocal').onclick = admin_gridlocal;
            } catch (e) { console.log(e) }

            // preview of the generated GCODE (first 64k max)
            if (preview && gcode) $('code-preview-textarea').value = gcode.substring(0,65535);

            // show dialog
            API.modal.show('print');
        });
    }

})();
