const axios = require('axios');
const mqtt = require('mqtt');
const schedule = require('node-schedule');

// 🔐 REST API สำหรับ ThingsBoard
const TB_REST_URL = 'http://10.34.112.192:8080';
const TB_USERNAME = 'papavarin.khm@student.mahidol.edu';
const TB_PASSWORD = 'ict555';
const SHARED_ATTR_DEVICE_ID = '390c9ec0-f96b-11ef-8636-93168e2858a5';

// 🔐 Token และค่าคงที่
const API_KEY = "8LY6DvvW0LWCkCxHCsYmc9A5HjCgbrKqFawSOIomCNbmqQF9wWALZDYEgUNwuXVgtiwBsYbCHzy2qDw5hht7o1cjgsYRcNwmwkFxSVeieTqm7mbeNfL50Mlf6Hg5EH3X";
const THINGSBOARD_HOST = "mqtt://10.34.112.192:1883";

const DEVICE_DETAILS_TOKEN = "d071ND5LkgO9twGhLSRR";
const DEVICE_STATUS_TOKEN = "EnrHmHjZKrNe1ROOnp1B";
const DEVICE_ADM_TOKEN = "yioun5nI0WhECbn3wa8t";
const DEVICE_AIR_TOKEN = "jNhMOrcRgExYWvg5C44s";

const TOPIC_DETAILS = "v1/devices/RoomBooking/telemetry";
const TOPIC_STATUS = "v1/devices/RoomBooking/telemetry";
const TOPIC_DEVICE = "v1/devices/me/attributes";

// 🕘 เวลาปัจจุบัน (ภาษาไทย)
function getCurrentTime() {
  return new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
}

// 🔍 ตรวจสอบสถานะห้อง
function getOverallRoomStatus(bookingData) {
  const now = new Date();
  let hasActive = false;
  let hasUpcoming = false;

  for (const booking of bookingData) {
    const startTime = new Date(`${booking.StartDate.split('T')[0]}T${booking.StartTime}`);
    const endTime = new Date(`${booking.EndDate.split('T')[0]}T${booking.EndTime}`);

    if (now >= startTime && now < endTime) {
      hasActive = true;
    } else if (now < startTime) {
      hasUpcoming = true;
    }
  }

  if (hasActive) return "Available";
  if (hasUpcoming) return "Unavailable";
  return "Unavailable";
}

// 📡 ส่งข้อมูล MQTT
async function sendToMQTT(client, topic, payload, retain = false) {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1, retain }, (error) => {
      if (error) {
        console.error(`❌ [${getCurrentTime()}] Publish error:`, error);
        reject(error);
      } else {
        console.log(`📤 [${getCurrentTime()}] Sent Data to ${topic}:`, payload);
        resolve();
      }
    });
  });
}

// 📆 ดึงข้อมูลการจอง
async function fetchBookingData() {
  const todayDate = new Date().toLocaleDateString('en-CA');
  const apiUrl = `https://www3.ict.mahidol.ac.th/building/roombooking/api/booking/?Date=${todayDate}&RoomNo=IT211-212`;
  console.log("📅 Today Date:", todayDate);

  try {
    const response = await axios.get(apiUrl, {
      headers: { "x-api-key": API_KEY }
    });
    console.log(`✅ [${getCurrentTime()}] API Response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ [${getCurrentTime()}] Error fetching booking data:`, error.message);
    return [];
  }
}

// 🚪 ส่งสถานะห้องไปยังอุปกรณ์ต่างๆ
async function sendRoomStatusToDevices(status) {
  const devices = [
    { token: DEVICE_ADM_TOKEN, name: "ADM" },
    { token: DEVICE_AIR_TOKEN, name: "AIR" }
  ];

  for (const device of devices) {
    const client = mqtt.connect(THINGSBOARD_HOST, {
      clientId: `room_status_${device.name}`,
      username: device.token,
      clean: true
    });

    client.on('connect', async () => {
      console.log(`✅ [${getCurrentTime()}] Connected to ThingsBoard MQTT (${device.name})`);
      const payload = JSON.stringify({ room_status: status });
      await sendToMQTT(client, TOPIC_DEVICE, payload, true);

      setTimeout(() => {
        console.log(`🔌 [${getCurrentTime()}] Closing MQTT connection (${device.name})...`);
        client.end();
      }, 3000);
    });

    client.on('error', (error) => {
      console.error(`❌ [${getCurrentTime()}] MQTT error (${device.name}):`, error);
    });
  }
}

// 🔁 อัปเดตสถานะห้อง
async function updateRoomStatus() {
  console.log(`📡 [${getCurrentTime()}] Updating room status...`);
  const bookingData = await fetchBookingData();
  const overallRoomStatus = getOverallRoomStatus(bookingData);

  const clientStatus = mqtt.connect(THINGSBOARD_HOST, {
    clientId: "room_booking_status_client",
    username: DEVICE_STATUS_TOKEN,
    clean: true
  });

  clientStatus.on('connect', async () => {
    console.log(`✅ [${getCurrentTime()}] Connected to ThingsBoard MQTT (Status)`);
    const payload = JSON.stringify({ room_status: overallRoomStatus });
    await sendToMQTT(clientStatus, TOPIC_STATUS, payload, true);

    setTimeout(() => {
      console.log(`🔌 [${getCurrentTime()}] Closing MQTT connection (Status)...`);
      clientStatus.end();
    }, 3000);
  });

  clientStatus.on('error', (error) => {
    console.error(`❌ [${getCurrentTime()}] MQTT error (Status):`, error);
  });

  await sendRoomStatusToDevices(overallRoomStatus);
  await sendSharedAttributeToThingsBoard(overallRoomStatus);
}

// 📄 ส่งรายละเอียดการจองไป MQTT
async function fetchDataAndSendToMQTT() {
  const bookingData = await fetchBookingData();

  const clientDetails = mqtt.connect(THINGSBOARD_HOST, {
    clientId: "room_booking_details_client",
    username: DEVICE_DETAILS_TOKEN,
    clean: true
  });

  clientDetails.on('connect', async () => {
    console.log(`✅ [${getCurrentTime()}] Connected to ThingsBoard MQTT (Details)`);

    if (!bookingData.length) {
      const emptyPayload = JSON.stringify({ ts: Date.now(), values: { room_status: "timeout of use" } });
      await sendToMQTT(clientDetails, TOPIC_DETAILS, emptyPayload);
    } else {
      for (let i = 0; i < bookingData.length; i++) {
        const booking = bookingData[i];
        const payload = JSON.stringify({
          ts: Date.now(),
          values: {
            room_id: booking.RoomID,
            room: booking.Room,
            start_time: booking.StartTime,
            end_time: booking.EndTime,
            activity_id: booking.ActivityID,
            activity_name: booking.ActivityName,
            remarks: booking.Remarks,
            requester_id: booking.RequesterID,
            username: booking.Username,
            display_name: booking.DispName,
            request_date: booking.RequestDate,
            status_id: booking.StatusID
          }
        });
        console.log(`📤 [${getCurrentTime()}] Sending Booking Data [${i + 1}]:`, payload);
        await sendToMQTT(clientDetails, TOPIC_DETAILS, payload);
      }
    }

    setTimeout(() => {
      console.log(`🔌 [${getCurrentTime()}] Closing MQTT connection (Details)...`);
      clientDetails.end();
    }, 3000);
  });

  clientDetails.on('error', (error) => {
    console.error(`❌ [${getCurrentTime()}] MQTT error (Details):`, error);
  });
}

// 🌐 ส่ง Shared Attribute ไปยัง ThingsBoard ผ่าน REST API
async function sendSharedAttributeToThingsBoard(statusValue) {
  try {
    const loginRes = await axios.post(`${TB_REST_URL}/api/auth/login`, {
      username: TB_USERNAME,
      password: TB_PASSWORD
    });

    const jwtToken = loginRes.data.token;
    console.log(`🔐 [${getCurrentTime()}] Logged in. JWT: ${jwtToken.substring(0, 20)}...`);

    const sharedAttributes = { room_status: statusValue };

    const res = await axios.post(
      `${TB_REST_URL}/api/plugins/telemetry/DEVICE/${SHARED_ATTR_DEVICE_ID}/attributes/SHARED_SCOPE`,
      sharedAttributes,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${jwtToken}`
        }
      }
    );

    console.log(`✅ [${getCurrentTime()}] Shared Attribute sent to device ${SHARED_ATTR_DEVICE_ID}:`, sharedAttributes);
  } catch (error) {
    console.error(`❌ [${getCurrentTime()}] Failed to send Shared Attribute:`, error.response?.data || error.message);
  }
}

// ⏰ Schedule Job
schedule.scheduleJob('00 08 * * *', fetchDataAndSendToMQTT);
schedule.scheduleJob('*/15 * * * *', updateRoomStatus);

console.log(`🚀 [${getCurrentTime()}] Running updateRoomStatus() immediately...`);
updateRoomStatus();
