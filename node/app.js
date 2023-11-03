import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import open from 'open';
import modbusRTU from 'modbus-serial';

const client = new modbusRTU;
client.connectRTUBuffered('COM9', {baudRate: 115200, dataBits: 8, parity: 'even', stopBits: 1, flowcontrol: false});

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
    //let pathname = path.join('/home/medusa/raspberry_pi_master_module/node/', directory);
    let pathname = path.join('C:\\Users\\nwill\\Documents\\GitHub\\raspberry_pi_master_module\\node', directory);


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
        client.setID(2);
        client.writeCoil(arg, true, function(err, data) {
            console.log(data);
        });
    });
    socket.on('scissor', (arg) => {
        console.log("Scissor Lift");
        client.setID(4);
        client.writeRegister(0, Number(arg), function(err, data) {
            console.log(data);
        });
    });
});

app.listen(8000);
open('http://localhost:8000', {app: {name: 'chromium-browser', arguments: ['--start-fullscreen']}});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let state = "DEBUG";
let stateInitialised = false;
let waitingForReset = true;

function changeState( new_state )
{
    state = new_state;
    stateInitialised = false;
    waitingForReset = false;
}

setInterval(function()
{
    if (state == "DEBUG")
    {
        debugState();
    }
    else if (state == "GAME")
    {
        gameState();
    }
}, 1000/10);

async function debugState() {
    client.setID(4);
    client.readHoldingRegisters(0,1,function(err, data) {
        if (data)
        {
            //console.log(data.data);
            io.emit('scissorStatus', data.data);
        }
    });
    await sleep(50);    //  Wait for 50ms
    client.readCoils(0, 3, function(err, data)
    {
        if (data)
        {
            //console.log(data.data);
            //  readCoils always gives an 8 byte array ... why?
            //  Only emit what we need!
            let new_data = data.data.slice(0,3);
            io.emit('scissorStop', new_data);
        }
        else
        {
            console.log("no data");
        }
        
    });
};

let maxRetries = 3;
let retries = 0;

async function resendLastTriggeredDrum()
{
    retries += 1;
    //  Assume client.setID(6); ?
    if (retries <= maxRetries)
    {
        client.readInputRegisters(1,1, function(err, data){
            if (data)
            {
                return data.data;
            }
            if (err)
            {
                return resendLastTriggeredDrum();
                //wait?
            }
        });
    }
    else
    {
        //  Retry failure! Move on!
        retries = 0;
        return 0;
    }
}

function getTriggeredDrum()
{
    client.setID(6);
    client.readInputRegisters(0, 1, function(err, data)
    {
        if (data)
        {
            return data.data;
        }
        if (err)
        {
            // resend data!
            return resendLastTriggeredDrum();
        }
    })
}

function gameState()
{
    if (stateInitialised)
    {
        //  if !waitingforreset
        //      If state = game
        //          Game code!
        //          Ask Drums for hits! => Get triggerred drum ... on error retry x 3!
        //          If score > 10 && not 5
        //              send to snake heads
        //          else
        //              send to saxaphones
        //          if (score > 10)
        //              checkLiftStatus
        //                  raiseLift
        //          check for game over every second! (x number of refreshes!)
        //      if gameover reset!
        //          stateInitised = false;
        //          waitingforReset = false;
        // 
    }
    else
    {
        if (waitingForReset)
        {
            // Checking for code to be initialised!

            // SUCCESS => stateInitialised = true;
            // SUCCESS => waitingForReset = false;
        }
        else
        {
            // Initialising code!
            // SUCCESS => waitingForReset = true;

        }
    }

};


// process.kill(process.pid, "SIGINT"); <-- Send myself a termination signal!

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
        console.log('Http server closed.');
        process.exit(0);
    });
});
