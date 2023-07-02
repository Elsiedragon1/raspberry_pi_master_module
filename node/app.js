var http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const { SerialPort } = require("serialport");

const { ReadlineParser } = require('@serialport/parser-readline');

var port = new SerialPort({
    path: '/dev/serial0',
    baudRate: 57600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowcontrol: false
});

const parser = port.pipe(new ReadlineParser({delimiter: '\n'}))

const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf' // possibly application/x-font-ttf or applilcation/octet-stream
};

var app = http.createServer(function(req, res) {
    console.log(`${req.method} ${req.url}`);

    // parse URL
    const parsedUrl = url.parse(req.url);

    // extract URL path
    // Avoid https://en.wikipedia.org/wiki/Directory_traversal_attack
    // e.g curl --path-as-is http://localhost:9000/../fileInDanger.txt
    // by limiting the path to current directory only
    const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
    const directory = '/html/' + sanitizePath;
    let pathname = path.join(__dirname, directory);


    // extract URL path
    //let pathname = `.${parsedUrl.pathname}`;
    // prevent root access
    //pathname = pathname.replace(/^(\.)+/, '.');
    // extract file extension
    // maps file extension to MIME type

    //res.setHeader('Access-Control-Allow-Origin', '*');
    //res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    //res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    //res.setHeader('Access-Control-Allow-Credentials', true);

    fs.exists(pathname, function (exist) {
        if (!exist) {
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
        }

        // directory search
        if (fs.statSync(pathname).isDirectory()) {
            pathname += '/index.html';
        }

        fs.readFile(pathname, function(err, data){
            if (err) {
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            } else {
                const ext = path.parse(pathname).ext;
                res.setHeader('Content-type', mimeType[ext] || 'text/plain');
                res.end(data);
            }
        });
    });
});

const { Server } = require("socket.io");
const io = new Server(app);

io.on('connection', function(data){
    console.log(data);
});

parser.on('data', function(data) {
    console.log(data);

    io.emit('data', data);
});

app.listen(8000);