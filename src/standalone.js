
let electron;
try{
    electron = require('electron'); 
}catch(e){}

let fs;
if (electron?.remote){
  fs = electron.remote.require("fs");
}else{
  fs = require("fs");
}

self.postMessage = (msg) => {
    self.kiri.client.onmessage({data:msg});
}

class Worker {
    constructor(url) {
        console.log({fake_worker: url});
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