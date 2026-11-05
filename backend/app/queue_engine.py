import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from .models import (
    Token, TokenStatus, Doctor, DoctorStatus, Patient,
    PatientCreate, TriagePriority, SlotType, NotificationAlert
)
from .firebase_service import firebase_manager
from .notification_service import notification_service

class QueueEngine:
    def __init__(self):
        self.fb = firebase_manager

    def _get_priority_score(self, token: Token) -> int:
        p = token.patient.priority
        if p == TriagePriority.EMERGENCY:
            return 1000
        elif p == TriagePriority.URGENT:
            return 500
        elif p == TriagePriority.SENIOR_CHILD:
            return 250
        elif p == TriagePriority.SCHEDULED:
            return 150
        return 100

    def generate_token_number(self, department_code: str) -> str:
        tokens = self.fb.get_tokens()
        today_prefix = datetime.now().strftime("%y%m%d")
        dept_tokens = [t for t in tokens if t.get("department_id") and t.get("token_number", "").startswith(department_code)]
        seq = len(dept_tokens) + 1
        return f"{department_code}-{seq:03d}"

    def auto_assign_doctor(self, department_id: str, requested_doc_id: Optional[str] = None) -> Doctor:
        doctors = [Doctor(**d) for d in self.fb.get_doctors() if d.get("department_id") == department_id]
        if not doctors:
            # Fallback to first doctor
            all_docs = [Doctor(**d) for d in self.fb.get_doctors()]
            return all_docs[0]

        if requested_doc_id:
            for doc in doctors:
                if doc.id == requested_doc_id:
                    return doc

        # Load queue counts for doctors to balance load
        all_tokens = [Token(**t) for t in self.fb.get_tokens() if t.get("status") in [TokenStatus.WAITING, TokenStatus.APPROACHING]]
        doc_load = {d.id: 0 for d in doctors}
        for t in all_tokens:
            if t.doctor_id in doc_load:
                doc_load[t.doctor_id] += 1

        # Return doctor with least load
        best_doc_id = min(doc_load, key=doc_load.get)
        for doc in doctors:
            if doc.id == best_doc_id:
                return doc
        return doctors[0]

    def create_token(self, patient_data: PatientCreate) -> Tuple[Token, List[NotificationAlert]]:
        # Pick Doctor
        doctor = self.auto_assign_doctor(patient_data.department_id, patient_data.doctor_id)
        dept_list = [d for d in self.fb.get_departments() if d.get("id") == patient_data.department_id]
        dept_name = dept_list[0]["name"] if dept_list else "General OPD"
        dept_code = dept_list[0]["code"] if dept_list else "GEN"

        token_id = f"tok-{uuid.uuid4().hex[:8]}"
        token_number = self.generate_token_number(dept_code)
        now_str = datetime.now().isoformat()

        patient = Patient(
            id=f"pat-{uuid.uuid4().hex[:8]}",
            check_in_time=now_str,
            **patient_data.model_dump()
        )

        new_token = Token(
            id=token_id,
            token_number=token_number,
            patient=patient,
            doctor_id=doctor.id,
            doctor_name=doctor.name,
            department_id=patient_data.department_id,
            department_name=dept_name,
            room_number=doctor.room_number,
            status=TokenStatus.WAITING,
            queue_position=0,
            estimated_wait_minutes=0,
            estimated_start_time="",
            created_at=now_str,
            delay_offset_minutes=doctor.delay_minutes,
            notifications_sent=[]
        )

        # Save initial token
        self.fb.save_token(new_token.model_dump())

        # Recalculate Queue for Doctor
        notifications = self.recalculate_doctor_queue(doctor.id)

        # Retrieve updated token
        updated = Token(**self.fb.get_token(token_id))
        return updated, notifications

    def recalculate_doctor_queue(self, doctor_id: str) -> List[NotificationAlert]:
        doc_data = self.fb.get_doctor(doctor_id)
        if not doc_data:
            return []
        doctor = Doctor(**doc_data)

        raw_tokens = self.fb.get_tokens()
        all_tokens = [Token(**t) for t in raw_tokens]

        # Filter waiting tokens for this doctor
        waiting = [t for t in all_tokens if t.doctor_id == doctor_id and t.status in [TokenStatus.WAITING, TokenStatus.APPROACHING]]

        # Intelligent sorting & interleaving
        # 1. Emergency tokens jump to top
        # 2. Urgent triage next
        # 3. Interleaving between Scheduled and Walk-ins
        def sort_key(tok: Token):
            score = self._get_priority_score(tok)
            # Inverse score so highest priority comes first
            created_dt = datetime.fromisoformat(tok.created_at) if tok.created_at else datetime.now()
            return (-score, created_dt)

        waiting.sort(key=sort_key)

        now = datetime.now()
        notifications: List[NotificationAlert] = []

        # Calculate remaining time for active patient
        consult_remaining = 0
        if doctor.current_token_id and doctor.consultation_start_time:
            try:
                start_dt = datetime.fromisoformat(doctor.consultation_start_time)
                elapsed_mins = int((now - start_dt).total_seconds() / 60)
                consult_remaining = max(1, doctor.avg_consultation_minutes - elapsed_mins)
            except Exception:
                consult_remaining = doctor.avg_consultation_minutes
        elif doctor.current_token_id:
            consult_remaining = doctor.avg_consultation_minutes

        accumulated_mins = consult_remaining + doctor.delay_minutes

        for idx, tok in enumerate(waiting):
            pos = idx + 1
            tok.queue_position = pos
            tok.estimated_wait_minutes = accumulated_mins
            eta_dt = now + timedelta(minutes=accumulated_mins)
            tok.estimated_start_time = eta_dt.strftime("%I:%M %p")
            tok.delay_offset_minutes = doctor.delay_minutes

            # Smart Proximity Alert Check (3 patients ahead)
            if pos <= 3:
                tok.status = TokenStatus.APPROACHING
                if "PROXIMITY_3_AHEAD" not in tok.notifications_sent:
                    notif = notification_service.send_proximity_alert(tok, doctor)
                    tok.notifications_sent.append("PROXIMITY_3_AHEAD")
                    notifications.append(notif)
            else:
                tok.status = TokenStatus.WAITING

            accumulated_mins += doctor.avg_consultation_minutes

        # Update tokens back in store
        tokens_dict_map = {t.id: t.model_dump() for t in waiting}
        for i, t in enumerate(raw_tokens):
            if t["id"] in tokens_dict_map:
                raw_tokens[i] = tokens_dict_map[t["id"]]
        self.fb.save_all_tokens(raw_tokens)

        return notifications

    def call_next(self, doctor_id: str) -> Tuple[Optional[Token], List[NotificationAlert]]:
        doc_data = self.fb.get_doctor(doctor_id)
        if not doc_data:
            return None, []
        doctor = Doctor(**doc_data)

        now = datetime.now()
        notifications: List[NotificationAlert] = []

        # 1. Complete previous patient if any
        if doctor.current_token_id:
            curr_tok_data = self.fb.get_token(doctor.current_token_id)
            if curr_tok_data:
                curr_tok = Token(**curr_tok_data)
                curr_tok.status = TokenStatus.COMPLETED
                curr_tok.completed_at = now.isoformat()
                self.fb.save_token(curr_tok.model_dump())

                # Dynamically update rolling average consultation duration
                if doctor.consultation_start_time:
                    try:
                        start_dt = datetime.fromisoformat(doctor.consultation_start_time)
                        actual_mins = max(2, int((now - start_dt).total_seconds() / 60))
                        doctor.avg_consultation_minutes = max(3, min(30, int(0.7 * doctor.avg_consultation_minutes + 0.3 * actual_mins)))
                    except Exception:
                        pass
                doctor.total_patients_served_today += 1

        # 2. Pick next patient from queue
        raw_tokens = self.fb.get_tokens()
        waiting = [Token(**t) for t in raw_tokens if t.get("doctor_id") == doctor_id and t.get("status") in [TokenStatus.WAITING, TokenStatus.APPROACHING]]
        
        # Sort using queue position
        waiting.sort(key=lambda t: t.queue_position)

        if not waiting:
            # No waiting patients
            doctor.current_token_id = None
            doctor.status = DoctorStatus.AVAILABLE
            doctor.consultation_start_time = None
            self.fb.update_doctor(doctor.model_dump())
            return None, []

        next_token = waiting[0]
        next_token.status = TokenStatus.IN_CONSULTATION
        next_token.queue_position = 0
        next_token.estimated_wait_minutes = 0
        next_token.called_at = now.isoformat()

        # Send CALLED notification
        called_notif = notification_service.send_called_alert(next_token, doctor)
        next_token.notifications_sent.append("CALLED_NOW")
        notifications.append(called_notif)

        self.fb.save_token(next_token.model_dump())

        # Update Doctor
        doctor.current_token_id = next_token.id
        doctor.status = DoctorStatus.IN_CONSULTATION
        doctor.consultation_start_time = now.isoformat()
        self.fb.update_doctor(doctor.model_dump())

        # Recalculate remaining queue
        recalc_notifs = self.recalculate_doctor_queue(doctor_id)
        notifications.extend(recalc_notifs)

        return next_token, notifications

    def set_doctor_delay(self, doctor_id: str, delay_minutes: int, reason: str) -> List[NotificationAlert]:
        doc_data = self.fb.get_doctor(doctor_id)
        if not doc_data:
            return []
        doctor = Doctor(**doc_data)

        doctor.delay_minutes += delay_minutes
        doctor.delay_reason = reason
        if "surgery" in reason.lower() or "emergency" in reason.lower():
            doctor.status = DoctorStatus.EMERGENCY_SURGERY
        else:
            doctor.status = DoctorStatus.ON_DELAY

        self.fb.update_doctor(doctor.model_dump())

        # Recalculate queue
        self.recalculate_doctor_queue(doctor_id)

        # Broadcast delay notifications
        raw_tokens = self.fb.get_tokens()
        affected = [Token(**t) for t in raw_tokens if t.get("doctor_id") == doctor_id and t.get("status") in [TokenStatus.WAITING, TokenStatus.APPROACHING]]
        notifs = notification_service.send_delay_broadcast(doctor, affected, delay_minutes, reason)
        return notifs

    def clear_doctor_delay(self, doctor_id: str) -> List[NotificationAlert]:
        doc_data = self.fb.get_doctor(doctor_id)
        if not doc_data:
            return []
        doctor = Doctor(**doc_data)
        doctor.delay_minutes = 0
        doctor.delay_reason = None
        doctor.status = DoctorStatus.IN_CONSULTATION if doctor.current_token_id else DoctorStatus.AVAILABLE
        self.fb.update_doctor(doctor.model_dump())

        return self.recalculate_doctor_queue(doctor_id)

    def trigger_emergency_preemption(self, patient_data: PatientCreate) -> Tuple[Token, List[NotificationAlert]]:
        # Ensure priority is EMERGENCY
        patient_data.priority = TriagePriority.EMERGENCY
        doctor = self.auto_assign_doctor(patient_data.department_id, patient_data.doctor_id)

        token, _ = self.create_token(patient_data)

        # Notify waiting patients about the emergency shift
        raw_tokens = self.fb.get_tokens()
        waiting_affected = [Token(**t) for t in raw_tokens if t.get("doctor_id") == doctor.id and t.get("id") != token.id and t.get("status") in [TokenStatus.WAITING, TokenStatus.APPROACHING]]
        shift_notifs = notification_service.send_emergency_shift_notice(doctor, waiting_affected, doctor.avg_consultation_minutes)

        return token, shift_notifs

    def mark_missed_or_noshow(self, token_id: str) -> Optional[NotificationAlert]:
        tok_data = self.fb.get_token(token_id)
        if not tok_data:
            return None
        token = Token(**tok_data)
        token.status = TokenStatus.MISSED
        self.fb.save_token(token.model_dump())

        doc_data = self.fb.get_doctor(token.doctor_id)
        doctor = Doctor(**doc_data) if doc_data else None
        if doctor:
            # If this was the active token, free the doctor
            if doctor.current_token_id == token.id:
                doctor.current_token_id = None
                doctor.status = DoctorStatus.AVAILABLE
                doctor.consultation_start_time = None
                self.fb.update_doctor(doctor.model_dump())
            notif = notification_service.send_missed_alert(token, doctor)
            self.recalculate_doctor_queue(doctor.id)
            return notif
        return None

    def recall_token(self, token_id: str) -> Tuple[Optional[Token], List[NotificationAlert]]:
        tok_data = self.fb.get_token(token_id)
        if not tok_data:
            return None, []
        token = Token(**tok_data)
        token.status = TokenStatus.WAITING
        self.fb.save_token(token.model_dump())
        notifs = self.recalculate_doctor_queue(token.doctor_id)
        updated = Token(**self.fb.get_token(token_id))
        return updated, notifs

queue_engine = QueueEngine()

