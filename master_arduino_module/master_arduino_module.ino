#include <ModbusMaster.h>
#include <AltSoftSerial.h>

// Can't use PWM on D10
//AltSoftSerial rpiSerial;
//const uint32_t rpiBaud = 9600;

ModbusMaster node;
const uint32_t baud = 115200; // 9600
const uint8_t config = SERIAL_8E1;
uint8_t dePin = 2;

uint8_t maxRetries= 2;
uint8_t retries = 0;

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
    //rpiSerial.begin(rpiBaud);

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

uint16_t get_drum_slave_response()
{
    uint8_t result = node.readInputRegisters(0,1,1);

    if (result == 0)
    {
        return node.getResponseBuffer(0x00);
    } else {
        return resend_last_response();
    }
}

uint32_t current_tick;
uint32_t last_tick = 0;
uint32_t interval = 1000/30;

void loop()
{
    current_tick = millis();

    if (current_tick - last_tick > interval)
    {
        uint16_t answer = get_drum_slave_response();
        node.writeSingleCoil(answer,1,2);

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

        last_tick = current_tick;
    }
}
