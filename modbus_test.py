#!/usr/bin/env python3
import minimalmodbus
import serial
import time
import RPi.GPIO as GPIO

def switch(instrument, is_write):
    instrument.serial.flush()
    
    # pin_de is a GPIO class instance
    GPIO.output(pin_de, is_write)

pin_de = 7

GPIO.setmode(GPIO.BOARD)
GPIO.setup(pin_de, GPIO.OUT)

instrumentButtons = minimalmodbus.Instrument('/dev/serial0', 1, debug=False, before_transfer=switch)  # port name, slave address (in decimal)
instrumentButtons.serial.baudrate = 9600
instrumentButtons.serial.timeout = 0.1
instrumentButtons.serial.stopbits = 1
instrumentButtons.serial.parity = serial.PARITY_EVEN
instrumentButtons.mode = minimalmodbus.MODE_RTU
        
instrumentLEDs = minimalmodbus.Instrument('/dev/serial0', 2, debug=False, before_transfer = switch)
instrumentLEDs.mode = minimalmodbus.MODE_RTU

def readButtons():
    #print(instrumentButtons.read_bit(1, 1))  # Registernumber, access type
    buttonId = instrumentButtons.read_register(0,0,4)
    #if (buttonId > 0 and buttonId < 5):
        #instrumentLEDs.write_bit(buttonId, True, 5)
    print(buttonId)

def main():
    try:
        FPS = 30
        lastFrameTime = time.time()
        while True:
            currentTime = time.time()
            dt = currentTime - lastFrameTime
            lastFrameTime = currentTime
            
            # UPDATE!
            try:
                readButtons()
            except Exception as e:
                print(e)
        
            sleepTime = 1.0/FPS - (currentTime - lastFrameTime)
            if sleepTime > 0:
                time.sleep(sleepTime)
    except KeyboardInterrupt:
        print("Shutdown requested ...")
    except Exception as e:
        print(e)
    finally:
        GPIO.cleanup() # Cleanup GPIO

if __name__ == "__main__":
    main()
