import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import open from 'open';
import modbusRTU from 'modbus-serial';

//  Serial Ports
const rpiPort = {
    port: '/dev/serial/by-id/usb-1a86_USB_Single_Serial_556F024543-if00',
    //port: '/dev/serial/by-id/usb-1a86_USB_Single_Serial_5659012619-if00',
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
    socket.on('debugMode', () => {
        serverSerial.close(clientConnect);
        console.log("Switching to debug ...");
        state = 'DEBUG';
    });
    socket.on('gameMode', () => {
        client.close(serverConnect);
        console.log("Switching to game ...");
        state = 'GAME';
    });
    socket.on('reset', () => {
        client.setID(1);
        client.writeRegisters(1, [0, 0]);
    });
    socket.on('snakeFlame', (arg) => {
        client.setID(1);
        if (arg ==5)
        {
            if (snakeFlameChase == true)
            {
                snakeFlameChase = false;
            }
            else
            {
                snakeFlameChase = true;
            }
        }
        else
        {
            client.writeCoil(arg, true, function(err, data) {
                if (data)
                {
                    console.log(data);
                }
                else
                {
                    console.log(err);
                }
            });
        }
    });
    socket.on('snakeEye', (arg) => {
        client.setID(1);
        //  Register 1
        client.writeRegister(1, arg, function(err, data) {
            if (data)
            {
                console.log(data);
            }
            else
            {
                console.log(err);
            }
        });
    });
    socket.on('snakeMouth', (arg) => {
        client.setID(1);
        //  Register 2
        client.writeRegister(2, arg, function(err, data) {
            if (data)
            {
                console.log(data);
            }
            else
            {
                console.log(err);
            }
        });
    });
    socket.on('saxaphone', (arg) => {
        client.setID(3);
        client.writeCoil(arg, true, function(err, data) {
            if (data)
            {
                console.log(data);
            }
            else
            {
                console.log(err);
            }
        });
    });
    socket.on('scissor', (arg) => {
        console.log("Scissor Lift");
        client.setID(4);
        client.writeRegister(0, Number(arg), function(err, data) {
            if (data)
            {
                console.log(data);
            }
            else
            {
                console.log(err);
            }
        });
    });
    socket.on('snakeBody', (arg) => {
        console.log("Snake Body");
        client.setID(2);
        client.writeRegister(0, Number(arg), function(err, data) {
            if (data)
            {
                console.log(data);
            }
            else
            {
                console.log(err);
            }
        });
    });
    socket.on('disconnect', () => {
        // Housekeeping can be done here after browser is closed/disconnected
    });
});

app.listen(8000);
open('http://localhost:8000', {app: {name: 'chromium-browser', arguments: ['--start-fullscreen']}});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//  This keeps track of if the RPi is acting as client or server!
let state = "GAME";

//  This keeps track of the game mode!
let mode = "IDLE";
//  Possible states:
//  IDLE            -   Attract?                0
//  TUTORIAL        -   Instructions            1
//  GAMEMODE        -   Score display?          2
//  RESET           -   Message to wait ...     3

let lastScore = 0;
let highScore = 0;

// process.kill(process.pid, "SIGINT"); <-- Send myself a termination signal!

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    Server.close(() => {
        console.log('Http server closed.');
        process.exit(0);
    });
});

//  MODBUS Controller Configuration
let client = new modbusRTU;

function clientConnect()
{
    client = new modbusRTU;
    //client.connectRTUBuffered('COM10', { baudRate: 115200, unitID: 6, dataBits: 8, parity: 'even', stopBits: 1, flowcontrol: false });
    client.connectRTUBuffered('/dev/serial/by-id/usb-1a86_USB_Single_Serial_556F024543-if00', { baudRate: 115200, unitID: 6, dataBits: 8, parity: 'even', stopBits: 1, flowcontrol: false });
}

//  MODBUS Node Configuration
const holdingRegisters = { [0]: 0, [1]: 0 };
//const coils = {};
//const inputRegisters = {};
//const discreteInputs = {};

const SCORE_REGISTER = 0;
const MODE_REGISTER = 1;

const vector = {
    setRegister: function(addr, value) {
        holdingRegisters[addr] = value;
        console.log(addr + ":" + value);
        return;
    }
};

let serverSerial = new modbusRTU.ServerSerial( vector, rpiPort );
//let serverSerial = new modbusRTU.ServerSerial( vector, windowsPort );

serverSerial.on("error", function(err) {
    console.log(err);
});

serverSerial.on("initialized", function() {
    console.log("Initialised!");
});

serverSerial.on("socketError", function(err) {
    console.log(err);
    serverSerial.close(serverClose);
});

function serverConnect() {
    serverSerial = new modbusRTU.ServerSerial( vector, rpiPort );
    //serverSerial = new modbusRTU.ServerSerial( vector, windowsPort );
}

function serverClose() {
    console.log("Modbus Server Shutdown");
    //process.kill(process.pid, "SIGINT");
}

let snakeFlameChase = false;
let flameChaseId = 1;
let skip = true;


function update()
{
    io.emit('score', holdingRegisters[0]);

    if (snakeFlameChase == true)
    {
        if (skip == true)
        {
            skip = false;
        }
        else
        {
            client.setID(1);
            client.writeCoil(flameChaseId, true, function(err, data) {
                if (data)
                {
                    console.log(data);
                }
                else
                {
                    console.log(err);
                }
            });

            flameChaseId = flameChaseId + 1;
            if (flameChaseId > 5)
            {
                flameChaseId = 1;
            }
            skip = true;
        }
    }

    setTimeout(update, 200);
}

update();
