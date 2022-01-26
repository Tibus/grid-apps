
let electron;
try{
    electron = require('electron');
}catch(e){}

let fs;
if (electron && electron.remote){
  fs = electron.remote.require("fs");
}else{
  fs = require("fs");
}

let THREE = global.THREE = require("@mango3d/three");

let navigator = { userAgent: "" };
let self = {
    THREE: THREE,
    forceUsingJSInsteadOfCPP: false,
    kiri : { driver: {}, loader: [] },
    location : { hostname: 'local', port: 0, protocol: 'fake' },
}

let gapp = {
    register:(file)=>{
        //...
    }
}

self.postMessage = (msg) => {
    self.kiri.client.onmessage({data:msg});
}


// fake fetch for worker to get wasm, if neededlet fetch = function(url) {
    let buf = fs.readFileSync(__dirname + "/../"+url);
    return new Promise((resolve, reject) => {
        resolve(new Promise((resolve, reject) => {
            resolve({
                arrayBuffer: function() {
                    return buf;
                }            });
        }));
    });
};

class Worker {
    constructor(url) {
    }

    postMessage(msg) {
        // setImmediate(() => {
            self.kiri.worker.onmessage({data:msg});
        // });
    }

    onmessage(msg) {
        // if we end up here, something went wrong
        console.trace('worker-recv', msg);
    }

    terminate() {
        // if we end up here, something went wrong
        console.trace('worker terminate');
    }
}

// node is missing these functions so put them in scope during eval
function atob(a) {
    return Buffer.from(a).toString('base64');
}

function btoa(b) {
    return Buffer.from(b, 'base64').toString();
}
