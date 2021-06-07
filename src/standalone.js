navigator = { userAgent: "" };
self = {
    THREE,
    kiri: { driver: {}, loader: [] },
    location: { hostname: 'local', port: 0, protocol: 'fake' },
    postMessage: (msg) => {
        self.kiri.client.onmessage({data:msg});
    }
};