const ping = require('ping');
const mqtt = require('mqtt');

// ข้อมูลอุปกรณ์ที่ต้อง ping
const devices = {
    raspberrypi_status: '10.34.12.201',
    adm_status: '10.34.12.202',
    compressor_status: '10.34.12.203',
    ac_control_status: '10.34.12.204',
    ac_energy_status: '10.34.12.205',
    cctv_status: '10.34.12.206'
};

// ThingsBoard
const THINGSBOARD_HOST = 'mqtt://10.34.112.192';
const ACCESS_TOKEN = 'j7D79Q1Mz8MdlbHaiehT';
const TB_TOPIC = 'v1/devices/StatusGateway/telemetry';

// เช็คทุก 1 นาที
setInterval(async () => {
    let statusPayload = {};

    // Ping ทุกอุปกรณ์
    for (const [key, ip] of Object.entries(devices)) {
        try {
            const res = await ping.promise.probe(ip);
            const status = res.alive ? "online" : "offline";
            statusPayload[key] = status;
            console.log(`[${new Date().toLocaleString()}] ${key} (${ip}) is ${status}`);
        } catch (err) {
            console.error(`❌ Error pinging ${ip}:`, err);
            statusPayload[key] = "error";
        }
    }

    // ส่ง MQTT ไปยัง ThingsBoard
    const client = mqtt.connect(THINGSBOARD_HOST, {
        username: ACCESS_TOKEN
    });

    client.on('connect', () => {
        const payload = JSON.stringify(statusPayload);
        client.publish(TB_TOPIC, payload, {}, () => {
            client.end();
        });
    });

    client.on('error', (err) => {
        console.error("MQTT Connection Error:", err);
    });

}, 60000);

