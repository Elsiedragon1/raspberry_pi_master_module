#!/usr/bin/env python3
import minimalmodbus
import serial

instrument = minimalmodbus.Instrument(
    "/dev/ttyUSB0", 10
)  # port name, slave address (in decimal)

ledstatus = input("Give in 0 or 1 to turn on or off the led: ")
instrument.write_register(
    1, int(ledstatus), 0
)  # Registernumber, value, number of decimals for storage

readledstatus = instrument.read_register(1, 0)  # Registernumber, number of decimals
print(readledstatus)
