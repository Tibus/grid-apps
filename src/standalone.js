let navigator = { userAgent: "" };
let self = global.self = {
    THREE: global.THREE,
    kiri : { driver: {}, loader: [] },
    location : { hostname: 'local', port: 0, protocol: 'fake' },
    postMessage : (msg) => {
        self.kiri.client.onmessage({data:msg});
    }
};

// fake fetch for worker to get wasm, if needed
let fetch = function(url) {
    console.log({fake_fetch: url});
    let buf = global.fs.readFileSync("./" + url);
    return new Promise((resolve, reject) => {
        resolve(new Promise((resolve, reject) => {
            resolve({
                arrayBuffer: function() {
                    return buf;
                }
            });
        }));
    });
};

class Worker {
    constructor(url) {
        console.log({fake_worker: url});
    }

    postMessage(msg) {
        setImmediate(() => {
            self.kiri.worker.onmessage({data:msg});
        });
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