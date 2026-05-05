print('hello before utime')
import utime
# utime.sleep(1)
print('hello')
utime.sleep_ms(200)

# after having waited - if you are having trouble starting main.py
print('Sleep Done')
# from machine import Pin
from umqtt.simple import MQTTClient
import ubinascii
import machine
from machine import Pin
import network
import usocket
import urequests # handles making and servicing network requests
import dht
import errno
import json
import socket
import select
import sys


# Simple-ish DHT class to simplify working with the sensor
class DHT:
    def __init__(self, pin: int):
        self.pin = self.setPin(pin)
        self.sensor = self.setDht(self.pin)

    def setDht(self, pin: Pin):
        return dht.DHT11(pin)

    def setPin(self, pin: int):
        return Pin(pin)

    def measure(self):
        self.sensor.measure()

    def getTemperature(self):
        return self.sensor.temperature()

    def getHumidity(self):
        return self.sensor.humidity()

led = Pin(27, Pin.OUT)

# Fill in your network name (ssid) and password here:
ssid = 'Wokwi-GUEST'
password = ''

def connect(ssid, passw):
    #Connect to WLAN
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(ssid, password)
    while wlan.isconnected() == False:
        print('Waiting for connection...')
        utime.sleep(1)
    print(wlan.ifconfig())

connect(ssid, password)

print('Waiting a little bit before the Mosquitto loop starts.')

timeElapsed = 0

while timeElapsed < 5:
    timeElapsed += 1
    print(f"{timeElapsed} out of 5 seconds passed...")
    utime.sleep_ms(1000)

# mqqt stuff below
MQTT_BROKER = "my-secret-id.s1.eu.hivemq.cloud"
MQTT_PORT = "8883"
CLIENT_ID = ubinascii.hexlify(machine.unique_id())
SUBSCRIBE_TOPIC = b"test/topic"
PUBLISH_TOPIC = b"test/temperature"
ssl_params = {
    "server_hostname": MQTT_BROKER
}

# callback stuff
def sub_cb(topic, msg):
    print(f'Callback message: {msg.decode()}')

# mqtt stuff starts
mqttClient = MQTTClient(CLIENT_ID, MQTT_BROKER, keepalive=60, user=b"my-username", password=b"my-password", ssl=True, ssl_params=ssl_params)
mqttClient.set_callback(sub_cb)

print(mqttClient.user)
mqttClient.connect()
mqttClient.subscribe(SUBSCRIBE_TOPIC)




dht_sensor = DHT(33)
counter = 0
while True:
    # mqtt stuff ends
    counter += 1
    print('hi, starting')
    dht_sensor.measure()
    humidity = dht_sensor.getHumidity()
    temperature = dht_sensor.getTemperature()
    led.on()
    utime.sleep_ms(500)
    led.off()

    print('alive')
    print(f"Temperature: {temperature}° C\nHumidity: {humidity}%")
    # attempt to publish
    mqttClient.publish(topic=PUBLISH_TOPIC, msg=str(temperature).encode(), retain=False, qos=0)
    utime.sleep_ms(3000)