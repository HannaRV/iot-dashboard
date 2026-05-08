"""
IoT device firmware for the 1DV027 IoT assignment.

Reads temperature and humidity from a DHT22 sensor and publishes the values
as JSON to broker.emqx.io every 2 seconds. Subscribes to a command topic
and toggles an LED in response to incoming control messages.

Reconnects automatically if the MQTT connection is lost.
"""

__author__ = 'Hanna Rubio Vretby <hr222sy@student.lnu.se>'
__version__ = '1.1.0'

import json
import random
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
RECONNECT_DELAY_SEC = 5

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


def connect_mqtt():
    """Create and connect MQTT client, then subscribe to the command topic."""
    client_id = ubinascii.hexlify(machine.unique_id())
    client = MQTTClient(
        client_id,
        MQTT_BROKER,
        port=MQTT_PORT,
        keepalive=MQTT_KEEPALIVE
    )
    client.set_callback(on_command)
    client.connect()
    client.subscribe(TOPIC_COMMAND_LED)
    print(f'Connected to {MQTT_BROKER}:{MQTT_PORT}, subscribed to {TOPIC_COMMAND_LED.decode()}')
    return client


def reconnect_mqtt():
    """Reconnect to the MQTT broker after a disconnection, retrying until successful."""
    print('MQTT connection lost. Reconnecting...')
    while True:
        try:
            return connect_mqtt()
        except OSError as e:
            print(f'Reconnect failed: {e}. Retrying in {RECONNECT_DELAY_SEC}s...')
            utime.sleep(RECONNECT_DELAY_SEC)


# ----- Main -----
connect_wifi(WIFI_SSID, WIFI_PASSWORD)
sync_time()
mqtt_client = connect_mqtt()


while True:
    # Process any pending command messages without blocking.
    try:
        mqtt_client.check_msg()
    except OSError as e:
        print(f'check_msg failed: {e}')
        mqtt_client = reconnect_mqtt()
        continue

    # Read sensor.
    try:
        dht_sensor.measure()
        # Add small random noise to simulate real DHT22 sensor variation (spec: ±0.5°C, ±2-5% RH).
        temperature = round(dht_sensor.temperature() + random.uniform(-0.3, 0.3), 1)
        humidity = round(dht_sensor.humidity() + random.uniform(-1.0, 1.0), 1)
    except OSError as e:
        print(f'Sensor read failed: {e}')
        utime.sleep(PUBLISH_INTERVAL_SEC)
        continue

    # Build and publish payload.
    payload = {
        'temperature': temperature,
        'humidity': humidity,
        'timestamp': utime.time()
    }
    try:
        mqtt_client.publish(TOPIC_SENSOR, json.dumps(payload).encode())
        print(f'Published: {payload}')
    except OSError as e:
        print(f'Publish failed: {e}')
        mqtt_client = reconnect_mqtt()
        continue

    utime.sleep(PUBLISH_INTERVAL_SEC)