from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class UserRole(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"

class User(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.PATIENT
    doctor_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    room_number: Optional[str] = None
    created_at: str

class LoginRequest(BaseModel):
    identifier: str # Email or Phone
    password: str
    role: Optional[UserRole] = None # Optional role enforcement

class RegisterRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: UserRole = UserRole.PATIENT
    department_id: Optional[str] = None
    room_number: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: User

class TriagePriority(str, Enum):
    EMERGENCY = "EMERGENCY"           # Weight: 100 - Immediate slot jump
    URGENT = "URGENT"                 # Weight: 75  - High acute pain/triage
    SENIOR_CHILD = "SENIOR_CHILD"     # Weight: 50  - Senior citizen / infant
    SCHEDULED = "SCHEDULED"           # Weight: 40  - Pre-booked online slot
    NORMAL = "NORMAL"                 # Weight: 20  - Standard walk-in

class SlotType(str, Enum):
    WALK_IN = "WALK_IN"
    ONLINE_BOOKED = "ONLINE_BOOKED"

class TokenStatus(str, Enum):
    WAITING = "WAITING"
    APPROACHING = "APPROACHING"       # Top 3 in queue
    IN_CONSULTATION = "IN_CONSULTATION"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    CANCELLED = "CANCELLED"

class DoctorStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    IN_CONSULTATION = "IN_CONSULTATION"
    ON_DELAY = "ON_DELAY"
    EMERGENCY_SURGERY = "EMERGENCY_SURGERY"
    ON_BREAK = "ON_BREAK"

class PatientCreate(BaseModel):
    user_id: Optional[str] = None
    name: str
    age: int
    gender: str = "Other"
    phone: str
    department_id: str
    doctor_id: Optional[str] = None
    priority: TriagePriority = TriagePriority.NORMAL
    slot_type: SlotType = SlotType.WALK_IN
    appointment_id: Optional[str] = None
    booked_time: Optional[str] = None
    symptoms: Optional[str] = None

class Patient(PatientCreate):
    id: str
    check_in_time: str

class Token(BaseModel):
    id: str
    token_number: str
    patient: Patient
    doctor_id: str
    doctor_name: str
    department_id: str
    department_name: str
    room_number: str
    status: TokenStatus = TokenStatus.WAITING
    queue_position: int = 0
    estimated_wait_minutes: int = 0
    estimated_start_time: str = ""
    created_at: str
    called_at: Optional[str] = None
    completed_at: Optional[str] = None
    delay_offset_minutes: int = 0
    notifications_sent: List[str] = []

class Doctor(BaseModel):
    id: str
    name: str
    department_id: str
    department_name: str
    room_number: str
    status: DoctorStatus = DoctorStatus.AVAILABLE
    avg_consultation_minutes: int = 8
    delay_minutes: int = 0
    delay_reason: Optional[str] = None
    current_token_id: Optional[str] = None
    consultation_start_time: Optional[str] = None
    total_patients_served_today: int = 0

class Department(BaseModel):
    id: str
    name: str
    code: str
    room_range: str
    description: str

class NotificationAlert(BaseModel):
    id: str
    token_id: str
    patient_name: str
    patient_phone: str
    type: str # 'PROXIMITY_ALERT', 'DELAY_BROADCAST', 'EMERGENCY_SHIFT', 'CALLED_NOW', 'MISSED_TURN'
    title: str
    message: str
    channel: str # 'SMS', 'WHATSAPP', 'IVR'
    timestamp: str

class DelayRequest(BaseModel):
    doctor_id: str
    delay_minutes: int
    reason: str = "Doctor attended emergency / ward round"

class CallNextRequest(BaseModel):
    doctor_id: str

class PreemptEmergencyRequest(BaseModel):
    patient: PatientCreate
    force_immediate_slot: bool = True

