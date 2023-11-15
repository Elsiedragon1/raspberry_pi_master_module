import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import open from 'open';
import modbusRTU from 'modbus-serial';

const rpiPort = {
    port: '/dev/serial/by-id/usb-1a86_USB_Single_Serial_556F024543-if00',
    baudRate: 115200,
    unitID: 6,
    dataBits: 8,
    parity: 'even',
    stopBits: 1,
    flowcontrol: false
};
const windowsPort = {
    port: 'COM10',
    baudRate: 115200,
    unitID: 6,
    dataBits: 8,
    parity: 'even',
    stopBits: 1,
    flowcontrol: false
};

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
    let pathname = path.join('/home/medusa/raspberry_pi_master_module/node/', directory);
    //let pathname = path.join('C:\\Users\\nwill\\Documents\\GitHub\\raspberry_pi_master_module\\node', directory);

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

import { Server } from "socket.io";
const io = new Server(app);

io.on('connection', (socket) => {
    socket.on('saxaphone', (arg) => {
        console.log("Saxaphones");
    });
    socket.on('scissor', (arg) => {
        console.log("Scissor Lift");
    });
    socket.on('drumMode', (arg) => {

    });
});

app.listen(8000);
open('http://localhost:8000', {app: {name: 'chromium-browser', arguments: ['--start-fullscreen']}});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let state = "DEBUG";

let lastScore = 0;
let highScore = 0;

// process.kill(process.pid, "SIGINT"); <-- Send myself a termination signal!

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
        console.log('Http server closed.');
        process.exit(0);
    });
});

const holdingRegisters = { [0]: 0, [1]: 0 };
//const coils = {};
//const inputRegisters = {};
//const discreteInputs = {};

const SCORE_REGISTER = 0;
const MODE_REGISTER = 1;

const vector = {
    setRegister: function(addr, value) {
        holdingRegisters[addr] = value;
        console.log(value);
        return;
    }
};

const serverSerial = new modbusRTU.ServerSerial( vector, rpiPort );

serverSerial.on("error", function(err) {
    console.log(err);
});

serverSerial.on("initialized", function() {
    console.log("Initialised!");
});

serverSerial.on("socketError", function(err) {
    console.log(err);
    serverSerial.close(closed);
});

function closed() {
    console.log("Server Shutdown");
    process.kill(process.pid, "SIGINT");
}

function update()
{
    io.emit('score', holdingRegisters[0]);

    setTimeout(update, 100);
}

update();