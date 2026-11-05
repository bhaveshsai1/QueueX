import asyncio
import json
import uuid
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .models import (
    PatientCreate, Token, Doctor, Department, DelayRequest,
    CallNextRequest, PreemptEmergencyRequest, NotificationAlert,
    TriagePriority, SlotType, TokenStatus, DoctorStatus,
    UserRole, User, LoginRequest, RegisterRequest, AuthResponse
)
from .firebase_service import firebase_manager
from .queue_engine import queue_engine
from .notification_service import notification_service

app = FastAPI(
    title="Smart OPD Queue Engine API",
    description="Real-time adaptive outpatient queue management with emergency preemption and dynamic delay broadcasts",
    version="1.0.0"
)

# CORS setup for Next.js frontend across any domain (Vercel, Render, Localhost, Mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# WebSocket Connection Manager for Realtime Broadcasts
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

async def notify_clients(event_type: str, data: dict = None):
    try:
        await manager.broadcast({
            "type": event_type,
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        print(f"Broadcast error: {e}")

# ----------------- ROUTES ----------------- #

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Smart OPD Adaptive Queue System",
        "firebase_connected": firebase_manager.is_connected,
        "firebase_mode": firebase_manager.get_status_info()["mode"]
    }

@app.get("/api/firebase/status")
def get_firebase_status():
    return firebase_manager.get_status_info()

@app.post("/api/firebase/sync")
def sync_firebase_data():
    return firebase_manager.sync_to_firestore(overwrite_existing=True)

# ----------------- AUTHENTICATION ROUTES ----------------- #

@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user_data = firebase_manager.get_user_by_identifier(req.identifier)
    if not user_data:
        raise HTTPException(status_code=401, detail="User not found with this email or mobile number.")
    
    if user_data.get("password") != req.password:
        raise HTTPException(status_code=401, detail="Invalid password.")
    
    # Optional role check if logging into a specific portal
    if req.role and user_data.get("role") != req.role:
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied: You are attempting to sign in as a {req.role.value}, but your account role is {user_data.get('role')}."
        )

    user_obj = User(
        id=user_data["id"],
        name=user_data["name"],
        email=user_data.get("email"),
        phone=user_data.get("phone"),
        role=user_data["role"],
        doctor_id=user_data.get("doctor_id"),
        department_id=user_data.get("department_id"),
        department_name=user_data.get("department_name"),
        room_number=user_data.get("room_number"),
        created_at=user_data.get("created_at", datetime.now().isoformat())
    )

    token_str = f"auth-{user_data['id']}-{uuid.uuid4().hex[:12]}"
    return AuthResponse(token=token_str, user=user_obj)

@app.post("/api/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    ident = req.email or req.phone
    if not ident:
        raise HTTPException(status_code=400, detail="Either email or phone is required.")
    
    existing = firebase_manager.get_user_by_identifier(ident)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or phone already exists.")

    user_id = f"usr-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().isoformat()

    new_user_dict = {
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "password": req.password,
        "role": req.role,
        "doctor_id": None,
        "department_id": req.department_id,
        "department_name": None,
        "room_number": req.room_number,
        "created_at": now_str
    }

    if req.role == UserRole.DOCTOR:
        # Link or create doctor profile
        doc_id = f"doc-{uuid.uuid4().hex[:6]}"
        new_user_dict["doctor_id"] = doc_id
        dept_name = "General Medicine"
        for d in firebase_manager.get_departments():
            if d.get("id") == req.department_id:
                dept_name = d.get("name")
                break
        new_user_dict["department_name"] = dept_name
        
        # Also register doctor in doctors list
        new_doc = {
            "id": doc_id,
            "name": req.name,
            "department_id": req.department_id or "dept-gen",
            "department_name": dept_name,
            "room_number": req.room_number or "105",
            "status": "AVAILABLE",
            "avg_consultation_minutes": 8,
            "delay_minutes": 0,
            "delay_reason": None,
            "current_token_id": None,
            "consultation_start_time": None,
            "total_patients_served_today": 0
        }
        firebase_manager.update_doctor(new_doc)

    firebase_manager.save_user(new_user_dict)

    user_obj = User(
        id=user_id,
        name=req.name,
        email=req.email,
        phone=req.phone,
        role=req.role,
        doctor_id=new_user_dict.get("doctor_id"),
        department_id=new_user_dict.get("department_id"),
        department_name=new_user_dict.get("department_name"),
        room_number=new_user_dict.get("room_number"),
        created_at=now_str
    )

    token_str = f"auth-{user_id}-{uuid.uuid4().hex[:12]}"
    return AuthResponse(token=token_str, user=user_obj)

@app.get("/api/auth/me", response_model=User)
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    
    clean_token = authorization.replace("Bearer ", "").strip()
    if not clean_token.startswith("auth-"):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    body = clean_token[5:]  # remove "auth-" prefix
    user_id = body.rsplit("-", 1)[0] if "-" in body else body
    user_data = firebase_manager.get_user_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    return User(
        id=user_data["id"],
        name=user_data["name"],
        email=user_data.get("email"),
        phone=user_data.get("phone"),
        role=user_data["role"],
        doctor_id=user_data.get("doctor_id"),
        department_id=user_data.get("department_id"),
        department_name=user_data.get("department_name"),
        room_number=user_data.get("room_number"),
        created_at=user_data.get("created_at", datetime.now().isoformat())
    )

@app.get("/api/patient/tokens")
def get_patient_tokens(user_id: Optional[str] = None, phone: Optional[str] = None):
    if not user_id and not phone:
        raise HTTPException(status_code=400, detail="Provide user_id or phone")
    tokens = firebase_manager.get_tokens_by_user(user_id or "", phone)
    return tokens

@app.get("/api/departments", response_model=List[Department])
def get_departments():
    return [Department(**d) for d in firebase_manager.get_departments()]

@app.get("/api/doctors", response_model=List[Doctor])
def get_doctors():
    return [Doctor(**d) for d in firebase_manager.get_doctors()]

@app.get("/api/doctors/{doctor_id}", response_model=Doctor)
def get_doctor(doctor_id: str):
    doc = firebase_manager.get_doctor(doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return Doctor(**doc)

@app.get("/api/tokens")
def get_tokens(department_id: Optional[str] = None, doctor_id: Optional[str] = None):
    tokens = [Token(**t) for t in firebase_manager.get_tokens()]
    if department_id:
        tokens = [t for t in tokens if t.department_id == department_id]
    if doctor_id:
        tokens = [t for t in tokens if t.doctor_id == doctor_id]
    return tokens

@app.get("/api/tokens/{token_id}")
def get_token(token_id: str):
    tok = firebase_manager.get_token(token_id)
    if not tok:
        raise HTTPException(status_code=404, detail="Token not found")
    
    # Enrich with latest doctor status
    token_obj = Token(**tok)
    doc_data = firebase_manager.get_doctor(token_obj.doctor_id)
    doctor = Doctor(**doc_data) if doc_data else None

    return {
        "token": token_obj,
        "doctor": doctor
    }

@app.post("/api/tokens/checkin")
async def patient_checkin(patient_data: PatientCreate):
    token, notifs = queue_engine.create_token(patient_data)
    await notify_clients("TOKEN_CREATED", {"token_id": token.id, "doctor_id": token.doctor_id})
    return {"token": token, "notifications": notifs}

@app.post("/api/doctors/{doctor_id}/call-next")
async def doctor_call_next(doctor_id: str):
    next_token, notifs = queue_engine.call_next(doctor_id)
    await notify_clients("QUEUE_UPDATED", {"doctor_id": doctor_id, "next_token_id": next_token.id if next_token else None})
    return {
        "success": True,
        "current_token": next_token,
        "notifications": notifs
    }

@app.post("/api/doctors/{doctor_id}/delay")
async def doctor_report_delay(doctor_id: str, request: DelayRequest):
    notifs = queue_engine.set_doctor_delay(doctor_id, request.delay_minutes, request.reason)
    await notify_clients("DOCTOR_DELAYED", {
        "doctor_id": doctor_id,
        "delay_minutes": request.delay_minutes,
        "reason": request.reason
    })
    return {"success": True, "notifications": notifs}

@app.post("/api/doctors/{doctor_id}/resume")
async def doctor_resume_queue(doctor_id: str):
    notifs = queue_engine.clear_doctor_delay(doctor_id)
    await notify_clients("DOCTOR_RESUMED", {"doctor_id": doctor_id})
    return {"success": True, "notifications": notifs}

@app.post("/api/queue/emergency-preempt")
async def emergency_preemption(request: PreemptEmergencyRequest):
    token, notifs = queue_engine.trigger_emergency_preemption(request.patient)
    await notify_clients("EMERGENCY_PREEMPTION", {
        "token_id": token.id,
        "doctor_id": token.doctor_id
    })
    return {"token": token, "notifications": notifs}

@app.post("/api/tokens/{token_id}/missed")
async def mark_token_missed(token_id: str):
    notif = queue_engine.mark_missed_or_noshow(token_id)
    await notify_clients("TOKEN_MISSED", {"token_id": token_id})
    return {"success": True, "notification": notif}

@app.post("/api/tokens/{token_id}/recall")
async def recall_token(token_id: str):
    token, notifs = queue_engine.recall_token(token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    await notify_clients("TOKEN_RECALLED", {"token_id": token_id, "doctor_id": token.doctor_id})
    return {"success": True, "token": token, "notifications": notifs}

@app.get("/api/notifications")
def get_notifications(limit: int = 30):
    return firebase_manager.get_notifications(limit)

@app.get("/api/stats")
def get_stats():
    raw_tokens = firebase_manager.get_tokens()
    waiting_tokens = [t for t in raw_tokens if t.get("status") in [TokenStatus.WAITING, TokenStatus.APPROACHING]]
    completed_tokens = [t for t in raw_tokens if t.get("status") == TokenStatus.COMPLETED]
    emergency_tokens = [t for t in raw_tokens if t.get("patient", {}).get("priority") == TriagePriority.EMERGENCY]
    
    doctors = firebase_manager.get_doctors()
    delayed_doctors = [d for d in doctors if d.get("delay_minutes", 0) > 0]

    avg_wait = 0
    if waiting_tokens:
        avg_wait = int(sum(t.get("estimated_wait_minutes", 0) for t in waiting_tokens) / len(waiting_tokens))

    return {
        "total_waiting": len(waiting_tokens),
        "total_completed": len(completed_tokens),
        "emergency_count": len(emergency_tokens),
        "active_delays_count": len(delayed_doctors),
        "average_wait_minutes": avg_wait,
        "total_doctors_active": len(doctors)
    }

@app.post("/api/simulation/seed")
async def seed_simulation_data():
    """Seeds realistic demo data for the hackathon presentation"""
    demo_patients = [
        # Cardiology patients for Dr. Sarah Jenkins (Room 102)
        PatientCreate(
            name="Robert Miller",
            age=68,
            gender="Male",
            phone="+1 555-0191",
            department_id="dept-cardio",
            priority=TriagePriority.SENIOR_CHILD,
            slot_type=SlotType.WALK_IN,
            symptoms="Mild palpitations and blood pressure checkup"
        ),
        PatientCreate(
            name="David Vance",
            age=34,
            gender="Male",
            phone="+1 555-0192",
            department_id="dept-cardio",
            priority=TriagePriority.SCHEDULED,
            slot_type=SlotType.ONLINE_BOOKED,
            appointment_id="APP-8842",
            booked_time="10:30 AM",
            symptoms="Post-angioplasty routine follow-up"
        ),
        PatientCreate(
            name="Emily Watson",
            age=29,
            gender="Female",
            phone="+1 555-0193",
            department_id="dept-cardio",
            priority=TriagePriority.NORMAL,
            slot_type=SlotType.WALK_IN,
            symptoms="General chest discomfort after workout"
        ),
        # Orthopedics patients for Dr. Rajesh Sharma (Room 204)
        PatientCreate(
            name="James O'Connor",
            age=45,
            gender="Male",
            phone="+1 555-0194",
            department_id="dept-ortho",
            priority=TriagePriority.URGENT,
            slot_type=SlotType.WALK_IN,
            symptoms="Acute ankle twist, severe swelling"
        ),
        PatientCreate(
            name="Samantha Green",
            age=38,
            gender="Female",
            phone="+1 555-0195",
            department_id="dept-ortho",
            priority=TriagePriority.NORMAL,
            slot_type=SlotType.WALK_IN,
            symptoms="Knee physiotherapy review"
        ),
        # General Medicine for Dr. Ananya Roy (Room 108)
        PatientCreate(
            name="Arthur Pendelton",
            age=72,
            gender="Male",
            phone="+1 555-0196",
            department_id="dept-gen",
            priority=TriagePriority.SENIOR_CHILD,
            slot_type=SlotType.WALK_IN,
            symptoms="Chronic diabetic sugar level review"
        ),
        PatientCreate(
            name="Maya Patel",
            age=26,
            gender="Female",
            phone="+1 555-0197",
            department_id="dept-gen",
            priority=TriagePriority.NORMAL,
            slot_type=SlotType.ONLINE_BOOKED,
            appointment_id="APP-9102",
            booked_time="11:00 AM",
            symptoms="Seasonal throat infection and fever"
        )
    ]

    for p in demo_patients:
        queue_engine.create_token(p)

    # Put first patient in consultation for doc-1 (Dr. Sarah Jenkins)
    queue_engine.call_next("doc-1")

    await notify_clients("SIMULATION_SEEDED", {})
    return {"success": True, "message": "Demo data populated with active consultation, waiting tokens, and interleaving."}

@app.post("/api/simulation/reset")
async def reset_simulation_data():
    firebase_manager.reset_all()
    await notify_clients("SIMULATION_RESET", {})
    return {"success": True, "message": "OPD Queue state reset."}

@app.websocket("/ws/queue")
async def websocket_queue_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial snapshot
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "data": {
                "doctors": firebase_manager.get_doctors(),
                "departments": firebase_manager.get_departments(),
                "notifications": firebase_manager.get_notifications(15)
            }
        })
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

