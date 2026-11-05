import uuid
from datetime import datetime
from typing import List, Optional
from .models import NotificationAlert, Token, Doctor
from .firebase_service import firebase_manager

class NotificationService:
    def __init__(self):
        self.channel_templates = {
            "PROXIMITY": {
                "title": "📍 You're Almost Up (3 Patients Ahead)",
                "channel": "WHATSAPP",
                "text": "Hello {name}, your token {token} is now 3rd in queue for {doctor} ({dept}, Room {room}). Please head towards the waiting area outside Room {room}. Estimated wait: ~{wait} mins."
            },
            "DELAY": {
                "title": "⏱️ Doctor Schedule Update",
                "channel": "SMS",
                "text": "OPD Alert: {doctor} has a delay of {delay} mins ({reason}). Your revised ETA is {eta}. Relax at the hospital cafeteria or courtyard; we will notify you before your turn."
            },
            "EMERGENCY_PREEMPT": {
                "title": "🚨 Emergency Preemption Notice",
                "channel": "SMS",
                "text": "OPD Priority Notice: An urgent triage case arrived at {dept}. Tokens have shifted by ~{shift} mins. Your live tracking link updates automatically."
            },
            "CALLED": {
                "title": "🔔 Your Turn: Please Enter Room",
                "channel": "WHATSAPP",
                "text": "Ding! Token {token} ({name}), {doctor} is waiting for you in Room {room} ({dept}). Please proceed inside now."
            },
            "MISSED": {
                "title": "📞 Automated IVR Call Triggered",
                "channel": "IVR",
                "text": "Automated IVR Voice Call triggered to {phone}: 'Attention {name}, your OPD token {token} was called. Please report to Room {room} within 2 minutes.'"
            }
        }

    def send_proximity_alert(self, token: Token, doctor: Doctor) -> NotificationAlert:
        template = self.channel_templates["PROXIMITY"]
        msg = template["text"].format(
            name=token.patient.name,
            token=token.token_number,
            doctor=doctor.name,
            dept=token.department_name,
            room=doctor.room_number,
            wait=token.estimated_wait_minutes
        )
        alert = NotificationAlert(
            id=f"notif-{uuid.uuid4().hex[:8]}",
            token_id=token.id,
            patient_name=token.patient.name,
            patient_phone=token.patient.phone,
            type="PROXIMITY_ALERT",
            title=template["title"],
            message=msg,
            channel=template["channel"],
            timestamp=datetime.now().strftime("%I:%M %p")
        )
        firebase_manager.save_notification(alert.model_dump())
        return alert

    def send_delay_broadcast(self, doctor: Doctor, affected_tokens: List[Token], delay_minutes: int, reason: str) -> List[NotificationAlert]:
        alerts = []
        template = self.channel_templates["DELAY"]
        for t in affected_tokens:
            msg = template["text"].format(
                doctor=doctor.name,
                delay=delay_minutes,
                reason=reason,
                eta=t.estimated_start_time
            )
            alert = NotificationAlert(
                id=f"notif-{uuid.uuid4().hex[:8]}",
                token_id=t.id,
                patient_name=t.patient.name,
                patient_phone=t.patient.phone,
                type="DELAY_BROADCAST",
                title=f"⏱️ Delay Notice: {doctor.name} (+{delay_minutes}m)",
                message=msg,
                channel=template["channel"],
                timestamp=datetime.now().strftime("%I:%M %p")
            )
            firebase_manager.save_notification(alert.model_dump())
            alerts.append(alert)
        return alerts

    def send_emergency_shift_notice(self, doctor: Doctor, affected_tokens: List[Token], shift_minutes: int) -> List[NotificationAlert]:
        alerts = []
        template = self.channel_templates["EMERGENCY_PREEMPT"]
        for t in affected_tokens:
            msg = template["text"].format(
                dept=doctor.department_name,
                shift=shift_minutes
            )
            alert = NotificationAlert(
                id=f"notif-{uuid.uuid4().hex[:8]}",
                token_id=t.id,
                patient_name=t.patient.name,
                patient_phone=t.patient.phone,
                type="EMERGENCY_SHIFT",
                title=template["title"],
                message=msg,
                channel=template["channel"],
                timestamp=datetime.now().strftime("%I:%M %p")
            )
            firebase_manager.save_notification(alert.model_dump())
            alerts.append(alert)
        return alerts

    def send_called_alert(self, token: Token, doctor: Doctor) -> NotificationAlert:
        template = self.channel_templates["CALLED"]
        msg = template["text"].format(
            token=token.token_number,
            name=token.patient.name,
            doctor=doctor.name,
            room=doctor.room_number,
            dept=token.department_name
        )
        alert = NotificationAlert(
            id=f"notif-{uuid.uuid4().hex[:8]}",
            token_id=token.id,
            patient_name=token.patient.name,
            patient_phone=token.patient.phone,
            type="CALLED_NOW",
            title=template["title"],
            message=msg,
            channel=template["channel"],
            timestamp=datetime.now().strftime("%I:%M %p")
        )
        firebase_manager.save_notification(alert.model_dump())
        return alert

    def send_missed_alert(self, token: Token, doctor: Doctor) -> NotificationAlert:
        template = self.channel_templates["MISSED"]
        msg = template["text"].format(
            phone=token.patient.phone,
            name=token.patient.name,
            token=token.token_number,
            room=doctor.room_number
        )
        alert = NotificationAlert(
            id=f"notif-{uuid.uuid4().hex[:8]}",
            token_id=token.id,
            patient_name=token.patient.name,
            patient_phone=token.patient.phone,
            type="MISSED_TURN",
            title=template["title"],
            message=msg,
            channel=template["channel"],
            timestamp=datetime.now().strftime("%I:%M %p")
        )
        firebase_manager.save_notification(alert.model_dump())
        return alert

notification_service = NotificationService()

