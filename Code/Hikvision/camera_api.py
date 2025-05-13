import cv2
import json
import paho.mqtt.client as mqtt
from ultralytics import YOLO

# 🔹 ตั้งค่า ThingsBoard
THINGSBOARD_HOST = "10.34.112.192"  # IP ของ ThingsBoard
ACCESS_TOKEN = "jGQrkRDNbJFtmPSZ5bGT"  # Device ID ใช้เป็น Token
MQTT_TOPIC = "v1/devices/cameraAI/telemetry"

# 🔹 เชื่อมต่อ MQTT
client = mqtt.Client()
client.username_pw_set(ACCESS_TOKEN)  # ใช้ Device ID เป็น Token
client.connect(THINGSBOARD_HOST, 1883, 60)

# 🔹 โหลดโมเดล YOLO
model = YOLO("yolov8x.pt")

# 🔹 RTSP URL ของกล้อง Hikvision
rtsp_url = "rtsp://admin:MUICT123$%@10.34.12.206:554/Streaming/Channels/101"

# 🔹 เปิดสตรีมวิดีโอจากกล้อง
cap = cv2.VideoCapture(rtsp_url)

if not cap.isOpened():
    print("❌ ไม่สามารถเชื่อมต่อกับกล้องได้")
    exit()

print("✅ กำลังสตรีมวิดีโอจากกล้อง...")

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ ไม่สามารถดึงเฟรมจากกล้องได้")
        break

    # 🔹 แสดงขนาดภาพที่อ่านได้จากกล้อง
    print("Frame Size:", frame.shape)

    # 🔹 ขยายภาพเพื่อช่วยให้ YOLO ตรวจจับได้ดีขึ้น
    frame = cv2.resize(frame, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_LINEAR)

    person_count = 0  # ตัวแปรเก็บจำนวนคน

    # 🔹 ใช้ YOLO ตรวจจับคนในภาพ
    results = model(frame)
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = box.conf[0].item()
            cls = int(box.cls[0].item())

            # 🔹 ตรวจจับเฉพาะ "คน" (class=0) และกำหนด threshold
            if cls == 0 and conf > 0.3 and (x2-x1) > 30 and (y2-y1) > 30:
                person_count += 1
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                cv2.putText(frame, f"Person ({conf:.2f})", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    # 🔹 ส่งจำนวนคนไปยัง ThingsBoard
    payload = json.dumps({"people_count": person_count})
    client.publish(MQTT_TOPIC, payload)
    print(f"📡 ส่งข้อมูลไปยัง ThingsBoard: {payload}")

    # 🔹 แสดงจำนวนคนที่ตรวจพบในวิดีโอ
    cv2.putText(frame, f"People Count: {person_count}", (50, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

    # 🔹 แสดงผลวิดีโอ
    cv2.imshow("Hikvision Stream", frame)

    # 🔹 เปิด/ปิดไฟตามจำนวนคน
    if person_count > 0:
        print("💡 เปิดไฟ (มีคนอยู่)")
    else:
        print("🔌 ปิดไฟ (ไม่มีคน)")

    # 🔹 กด 'q' เพื่อออกจาก loop
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# 🔹 ปิดการเชื่อมต่อกล้อง
cap.release()
client.disconnect()
cv2.destroyAllWindows()
