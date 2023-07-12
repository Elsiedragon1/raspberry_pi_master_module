#include <ModbusMaster.h>
#include <AltSoftSerial.h>

// Can't use PWM on D10
AltSoftSerial rpiSerial;
const uint32_t rpiBaud = 57600; // 9600;

ModbusMaster node;
const uint32_t baud = 115200; // 9600
const uint8_t config = SERIAL_8E1;
uint8_t dePin = 2;

uint8_t maxRetries= 2;
uint8_t retries = 0;

uint8_t score = 0;

enum MODE {
  IDLE = 0,
  BUSK = 1,
  GAME = 2,
  FAIL = 3
};

uint8_t mode = 0;

// idle callback function; gets called during idle time between TX and RX
void idle()
{
    delay(2);
}
// preTransmission callback function; gets called before writing a Modbus message
void preTransmission()
{
    // Figure out what this should be for a given baud!
    delay(2);
    digitalWrite(dePin, HIGH);
}
// postTransmission callback function; gets called after a Modbus message has been sent
void postTransmission()
{
    digitalWrite(dePin, LOW);
}

void setup()
{
    pinMode(dePin, OUTPUT);
    digitalWrite(dePin, LOW);

    Serial.begin(baud, config);

    rpiSerial.begin(rpiBaud);

    node.begin(Serial);

    node.idle(idle);
    node.preTransmission(preTransmission);
    node.postTransmission(postTransmission);

    
}

uint16_t resend_last_response()
{
    retries += 1;
    if ( retries <= maxRetries )
    {
        uint8_t result = node.readInputRegisters(1,1,1);

        if (result == 0)
        {   
            retries = 0;
            return node.getResponseBuffer(0x00);
        } else {
            return resend_last_response();
        }
    } else {
        // Retry failure: 0 is ignored by the flamethrowers as a non-touch!
        retries = 0;
        return 0;
    }
}

uint16_t get_triggered_drum()
{
    uint8_t result = node.readInputRegisters(0,1,1);

    if (result == 0)
    {
        return node.getResponseBuffer(0x00);
    } else {
        return resend_last_response();
    }
}

int16_t get_mode()
{
    uint8_t result = node.readInputRegisters(2,1,1);

    if (result == 0)
    {
        return node.getResponseBuffer(0x00);
    } else {
        return -1;
    }
}

int16_t get_score()
{
    uint8_t result = node.readInputRegisters(3,1,1);
    
    if (result == 0)
    {
        return node.getResponseBuffer(0x00);
    } else {
        return -1;
    }
}

uint32_t current_tick;

uint32_t last_drum_tick = 0;
uint32_t drum_interval = 1000/30;

uint32_t last_mode_tick = 0;
uint32_t mode_interval = 1000/5;

void updateRPi()
{
    //  Making this easy to change for now ...
    rpiSerial.write(0xFF);  // Delimiter / Message Start!
    rpiSerial.write(mode);
    rpiSerial.write(score);
}

void loop()
{
    current_tick = millis();

    if (mode == GAME)
    {
        if (current_tick - last_drum_tick > drum_interval)
        {
            uint16_t answer = get_triggered_drum();
            if (answer != 0)
            {
                node.writeSingleCoil(answer,1,2);
                //  Keep track of score using drum triggers!
                score += 1;
                updateRPi();
            }
            /*
            uint8_t result = node.readInputRegisters(0,1,1);

            switch (result) {
                case 0x00: // ku8MBSuccess
                    //success
                    uint16_t answer = node.getResponseBuffer(0x00);
                    if (answer > 0)
                    {
                        node.writeSingleCoil(answer,1,2);
                    }
                    break;
                case 0xE2: // ku8MBResponseTimedOut:
                    // Fallthrough
                case 0xE3: // ku8MBInvalidCRC:
                    // Fallthrough
                default:
                    // Fallthrough
                    // RESEND!
            }*/

            last_drum_tick = current_tick;
        }
    }

    if (current_tick - last_mode_tick > mode_interval)
    {
        int16_t newMode = get_mode();

        if (newMode >= 0 && newMode != mode)    // Only switch if the mode has changed
        {
            mode = newMode;

            if (newMode == GAME)
            {
                //  If the newMode is a GAME ... reset the score!
                score = 0;
            }

            updateRPi();
        }

        if (mode == GAME)
        {
            //  We only need to ask for the score if a game is currently being played
            int16_t newScore = get_score();

            if (newScore != score)
            {
                score = newScore;

                updateRPi();
            }
        }

        last_mode_tick = current_tick;
    }
}
