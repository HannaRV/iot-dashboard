"""
IoT device firmware for the 1DV027 IoT assignment.

Reads temperature and humidity from a DHT22 sensor and publishes the values
as JSON to broker.emqx.io every 2 seconds. Subscribes to a command topic
and toggles an LED in response to incoming control messages.
"""

__author__ = 'Hanna Rubio Vretby <hr222sy@student.lnu.se>'
__version__ = '1.0.0'

import json
import network
import ubinascii
import machine
import dht
import utime
import ntptime
from machine import Pin
from umqtt.simple import MQTTClient


# ----- Configuration -----
WIFI_SSID = 'Wokwi-GUEST'
WIFI_PASSWORD = ''

MQTT_BROKER = 'broker.emqx.io'
MQTT_PORT = 1883
MQTT_KEEPALIVE = 60

STUDENT_ID = 'hr222sy'
TOPIC_SENSOR = f'lnu/iot/{STUDENT_ID}/sensor'.encode()
TOPIC_COMMAND_LED = f'lnu/iot/{STUDENT_ID}/command/led'.encode()

PIN_DHT = 33
PIN_LED = 27
PUBLISH_INTERVAL_SEC = 2


# ----- Hardware setup -----
led = Pin(PIN_LED, Pin.OUT)
dht_sensor = dht.DHT22(Pin(PIN_DHT))


# ----- Helpers -----
def connect_wifi(ssid, password):
    """Connect to the given Wi-Fi network and block until connected."""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(ssid, password)
    while not wlan.isconnected():
        print('Waiting for Wi-Fi connection...')
        utime.sleep(1)
    print('Wi-Fi connected:', wlan.ifconfig())


def sync_time():
    """Sync the device clock with NTP so timestamps are accurate Unix epoch."""
    try:
        ntptime.settime()
        print('Clock synced via NTP.')
    except Exception as e:
        print('NTP sync failed:', e)


def on_command(topic, msg):
    """Callback for incoming command messages on the LED topic."""
    print(f'Received on {topic.decode()}: {msg.decode()}')
    try:
        payload = json.loads(msg)
        if payload.get('state') is True:
            led.on()
            print('LED turned ON')
        elif payload.get('state') is False:
            led.off()
            print('LED turned OFF')
    except (ValueError, KeyError) as e:
        print('Ignoring invalid command payload:', e)


# ----- Main -----
connect_wifi(WIFI_SSID, WIFI_PASSWORD)
sync_time()

CLIENT_ID = ubinascii.hexlify(machine.unique_id())
mqtt_client = MQTTClient(
    CLIENT_ID,
    MQTT_BROKER,
    port=MQTT_PORT,
    keepalive=MQTT_KEEPALIVE
)
mqtt_client.set_callback(on_command)
mqtt_client.connect()
mqtt_client.subscribe(TOPIC_COMMAND_LED)
print(f'Connected to {MQTT_BROKER}:{MQTT_PORT}, subscribed to {TOPIC_COMMAND_LED.decode()}')


while True:
    # Process any pending command messages without blocking.
    mqtt_client.check_msg()

    # Read sensor.
    try:
        dht_sensor.measure()
        temperature = dht_sensor.temperature()
        humidity = dht_sensor.humidity()
    except OSError as e:
        print('Sensor read failed:', e)
        utime.sleep(PUBLISH_INTERVAL_SEC)
        continue

    # Build and publish payload.
    payload = {
        'temperature': temperature,
        'humidity': humidity,
        'timestamp': utime.time()
    }
    mqtt_client.publish(TOPIC_SENSOR, json.dumps(payload).encode())
    print(f'Published: {payload}')

    utime.sleep(PUBLISH_INTERVAL_SEC)
    