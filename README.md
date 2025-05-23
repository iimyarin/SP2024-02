# SP2024-02 : IoT Dashboard for Real-Time Energy Monitoring and Control

โปรเจกต์นี้เป็นระบบแดชบอร์ด IoT สำหรับตรวจสอบและควบคุมพลังงานในห้องเรียนหรือห้องปฏิบัติการ โดยประกอบด้วยการเชื่อมต่อกับอุปกรณ์วัดพลังงานไฟฟ้า ระบบควบคุมรีเลย์ และแสดงผลข้อมูลผ่านแพลตฟอร์ม ThingsBoard

## 📁 โครงสร้างโฟลเดอร์หลัก

- `Code/SP2024-02/code/`  
  โฟลเดอร์นี้เก็บซอร์สโค้ดหลักที่นำไปใช้งานบนเซิร์ฟเวอร์ (IP: `10.34.112.192`) โดยโฟลเดอร์ที่ใช้งานจริงอยู่ที่ path: `/home/mec/SP2024-02/code` ภายในประกอบด้วยสคริปต์ต่าง ๆ สำหรับการควบคุมและเชื่อมต่อกับอุปกรณ์ในระบบ ได้แก่
  - DownloadDataReact 
  - GatewayStatus
  - Room-status-script
  
- `Code/Hikivision/`

  โฟลเดอร์นี้ใช้สำหรับเก็บ Source Code สำหรับการนับจำนวนคนที่อยู่ในห้อง (IT211–IT212) แบบเรียลไทม์ โดยใช้ YOLOv8 ในการประมวลผลภาพจากกล้องวิดีโอ (RTSP) ระบบจะ:

  - ดึงภาพจากกล้อง Hikvision

  - ใช้โมเดล YOLO ตรวจจับคน

  - นับจำนวนคนในเฟรม

  - ส่งข้อมูลจำนวนคนเข้า ThingsBoard ผ่าน MQTT



- `NodeRed/`  
  เก็บ flow ของ Node-RED ที่ใช้สำหรับ:
  - ควบคุมรีเลย์เปิด–ปิดอุปกรณ์ ได้แก่ ControlAC และ ControlLight2
  - อ่านค่าจากอุปกรณ์ผ่าน Modbus ได้แก่ Flow3, AC, 1phase


- `Thingsboard/`  
  รวมไฟล์สำหรับนำเข้า (export) ไปยังแพลตฟอร์ม ThingsBoard ได้แก่:
  - Rule Chain
  - Dashboard
  - Device Profile

## 📝 หมายเหตุ

- สามารถดูเอกสารเพิ่มเติมได้จาก [Manual](https://docs.google.com/document/d/1aID9GZPmqdl896SRIIxLvlmYQ17CyNd3oNwgVEyseMo/edit?usp=sharing)


---



## 👥 ทีมผู้จัดทำ

- นางสาว ปภาวรินทร์ ขำอิ่ม — 6487003  
- นางสาว ศิรดา นามบุตร — 6487059  
- นางสาว กมลักษณ์ อุดมไพบูลย์ลาภ — 6487072  

---

## 🛡️ License

โปรเจกต์นี้อยู่ภายใต้สัญญาอนุญาตแบบ MIT (MIT License)  
สามารถใช้งาน แก้ไข และแจกจ่ายได้โดยต้องระบุที่มา

ดูรายละเอียดในไฟล์ [LICENSE](LICENSE)

