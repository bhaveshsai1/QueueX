import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger("OPD_Firebase")
logger.setLevel(logging.INFO)

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "opd_state.json")

class FirebaseManager:
    """
    Manages Firebase Firestore persistence with an intelligent local sync fallback.
    If 'firebase-service-account.json' or FIREBASE_CONFIG is present, syncs to Firestore.
    Otherwise, runs a persistent JSON / in-memory store so the app works seamlessly out-of-the-box.
    """
    def __init__(self):
        self.db = None
        self.is_connected = False
        self._init_firebase()
        self._init_local_store()

    def _init_firebase(self):
        cred_path = os.environ.get("FIREBASE_CREDENTIALS", "firebase-service-account.json")
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.is_connected = True
                logger.info("Firebase Firestore connected successfully using service account.")
            elif os.environ.get("FIREBASE_PROJECT_ID"):
                firebase_admin.initialize_app()
                self.db = firestore.client()
                self.is_connected = True
                logger.info("Firebase Firestore initialized with default project credentials.")
            else:
                logger.info("No Firebase credentials provided. Operating in High-Fidelity Local Sync Mode (Firestore mirror).")
        except Exception as e:
            logger.warning(f"Firebase initialization skipped or failed ({str(e)}). Using local persistent store.")
            self.is_connected = False

    def _init_local_store(self):
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r") as f:
                    self.local_data = json.load(f)
                    if not self.local_data.get("users"):
                        self.local_data["users"] = self._get_default_users()
                        self._save_local()
                    return
            except Exception:
                pass
        
        # Default initial data for OPD
        self.local_data = {
            "departments": [
                {"id": "dept-cardio", "name": "Cardiology", "code": "CARD", "room_range": "101 - 105", "description": "Heart, vascular, ECG, and chest care"},
                {"id": "dept-ortho", "name": "Orthopedics", "code": "ORTH", "room_range": "201 - 206", "description": "Bones, fractures, joints, and spine"},
                {"id": "dept-gen", "name": "General Medicine", "code": "GENM", "room_range": "106 - 112", "description": "Fever, diagnostics, flu, and chronic care"},
                {"id": "dept-pedia", "name": "Pediatrics", "code": "PEDI", "room_range": "301 - 308", "description": "Child health, immunization, neonatal"}
            ],
            "doctors": [
                {
                    "id": "doc-1",
                    "name": "Dr. Sarah Jenkins",
                    "department_id": "dept-cardio",
                    "department_name": "Cardiology",
                    "room_number": "102",
                    "status": "AVAILABLE",
                    "avg_consultation_minutes": 8,
                    "delay_minutes": 0,
                    "delay_reason": None,
                    "current_token_id": None,
                    "consultation_start_time": None,
                    "total_patients_served_today": 12
                },
                {
                    "id": "doc-2",
                    "name": "Dr. Rajesh Sharma",
                    "department_id": "dept-ortho",
                    "department_name": "Orthopedics",
                    "room_number": "204",
                    "status": "AVAILABLE",
                    "avg_consultation_minutes": 10,
                    "delay_minutes": 0,
                    "delay_reason": None,
                    "current_token_id": None,
                    "consultation_start_time": None,
                    "total_patients_served_today": 9
                },
                {
                    "id": "doc-3",
                    "name": "Dr. Ananya Roy",
                    "department_id": "dept-gen",
                    "department_name": "General Medicine",
                    "room_number": "108",
                    "status": "AVAILABLE",
                    "avg_consultation_minutes": 6,
                    "delay_minutes": 0,
                    "delay_reason": None,
                    "current_token_id": None,
                    "consultation_start_time": None,
                    "total_patients_served_today": 18
                },
                {
                    "id": "doc-4",
                    "name": "Dr. Michael Chen",
                    "department_id": "dept-pedia",
                    "department_name": "Pediatrics",
                    "room_number": "302",
                    "status": "AVAILABLE",
                    "avg_consultation_minutes": 9,
                    "delay_minutes": 0,
                    "delay_reason": None,
                    "current_token_id": None,
                    "consultation_start_time": None,
                    "total_patients_served_today": 14
                }
            ],
            "tokens": [],
            "notifications": [],
            "users": self._get_default_users()
        }
        self._save_local()

    def _get_default_users(self) -> List[Dict]:
        return [
            {
                "id": "usr-doc-1",
                "name": "Dr. Sarah Jenkins",
                "email": "dr.sarah@hospital.org",
                "phone": "+91 98765 00001",
                "password": "doctor123",
                "role": "DOCTOR",
                "doctor_id": "doc-1",
                "department_id": "dept-cardio",
                "department_name": "Cardiology",
                "room_number": "102",
                "created_at": "2026-01-01T00:00:00"
            },
            {
                "id": "usr-doc-2",
                "name": "Dr. Rajesh Sharma",
                "email": "dr.rajesh@hospital.org",
                "phone": "+91 98765 00002",
                "password": "doctor123",
                "role": "DOCTOR",
                "doctor_id": "doc-2",
                "department_id": "dept-ortho",
                "department_name": "Orthopedics",
                "room_number": "204",
                "created_at": "2026-01-01T00:00:00"
            },
            {
                "id": "usr-doc-3",
                "name": "Dr. Ananya Roy",
                "email": "dr.ananya@hospital.org",
                "phone": "+91 98765 00003",
                "password": "doctor123",
                "role": "DOCTOR",
                "doctor_id": "doc-3",
                "department_id": "dept-gen",
                "department_name": "General Medicine",
                "room_number": "108",
                "created_at": "2026-01-01T00:00:00"
            },
            {
                "id": "usr-doc-4",
                "name": "Dr. Michael Chen",
                "email": "dr.michael@hospital.org",
                "phone": "+91 98765 00004",
                "password": "doctor123",
                "role": "DOCTOR",
                "doctor_id": "doc-4",
                "department_id": "dept-pedia",
                "department_name": "Pediatrics",
                "room_number": "302",
                "created_at": "2026-01-01T00:00:00"
            },
            {
                "id": "usr-pat-1",
                "name": "Rahul Sharma",
                "email": "rahul@gmail.com",
                "phone": "+91 98765 43210",
                "password": "patient123",
                "role": "PATIENT",
                "doctor_id": None,
                "department_id": None,
                "department_name": None,
                "room_number": None,
                "created_at": "2026-01-01T00:00:00"
            },
            {
                "id": "usr-admin-1",
                "name": "Hospital Administrator",
                "email": "admin@hospital.org",
                "phone": "+91 98765 99999",
                "password": "admin123",
                "role": "ADMIN",
                "doctor_id": None,
                "department_id": None,
                "department_name": None,
                "room_number": None,
                "created_at": "2026-01-01T00:00:00"
            }
        ]

    def _save_local(self):
        try:
            with open(DATA_FILE, "w") as f:
                json.dump(self.local_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving local state: {e}")

    # --- Department Operations ---
    def get_departments(self) -> List[Dict]:
        if self.is_connected and self.db:
            try:
                docs = self.db.collection("departments").stream()
                results = [d.to_dict() for d in docs]
                if results:
                    return results
            except Exception as e:
                logger.error(f"Firestore get_departments error: {e}")
        return self.local_data.get("departments", [])

    # --- Doctor Operations ---
    def get_doctors(self) -> List[Dict]:
        if self.is_connected and self.db:
            try:
                docs = self.db.collection("doctors").stream()
                results = [d.to_dict() for d in docs]
                if results:
                    return results
            except Exception as e:
                logger.error(f"Firestore get_doctors error: {e}")
        return self.local_data.get("doctors", [])

    def get_doctor(self, doctor_id: str) -> Optional[Dict]:
        for d in self.get_doctors():
            if d.get("id") == doctor_id:
                return d
        return None

    def update_doctor(self, doctor_data: Dict):
        doc_id = doctor_data.get("id")
        for i, d in enumerate(self.local_data.get("doctors", [])):
            if d.get("id") == doc_id:
                self.local_data["doctors"][i] = doctor_data
                break
        self._save_local()

        if self.is_connected and self.db:
            try:
                self.db.collection("doctors").document(doc_id).set(doctor_data)
            except Exception as e:
                logger.error(f"Firestore update_doctor error: {e}")

    # --- Token Operations ---
    def get_tokens(self) -> List[Dict]:
        if self.is_connected and self.db:
            try:
                docs = self.db.collection("tokens").stream()
                results = [d.to_dict() for d in docs]
                if results:
                    return results
            except Exception as e:
                logger.error(f"Firestore get_tokens error: {e}")
        return self.local_data.get("tokens", [])

    def get_token(self, token_id: str) -> Optional[Dict]:
        for t in self.get_tokens():
            if t.get("id") == token_id:
                return t
        return None

    def save_token(self, token_data: Dict):
        token_id = token_data.get("id")
        tokens = self.local_data.setdefault("tokens", [])
        idx = next((i for i, t in enumerate(tokens) if t.get("id") == token_id), None)
        if idx is not None:
            tokens[idx] = token_data
        else:
            tokens.append(token_data)
        self._save_local()

        if self.is_connected and self.db:
            try:
                self.db.collection("tokens").document(token_id).set(token_data)
            except Exception as e:
                logger.error(f"Firestore save_token error: {e}")

    def save_all_tokens(self, tokens_list: List[Dict]):
        self.local_data["tokens"] = tokens_list
        self._save_local()
        if self.is_connected and self.db:
            try:
                batch = self.db.batch()
                for t in tokens_list:
                    doc_ref = self.db.collection("tokens").document(t.get("id"))
                    batch.set(doc_ref, t)
                batch.commit()
            except Exception as e:
                logger.error(f"Firestore batch save error: {e}")

    # --- Notification Operations ---
    def save_notification(self, notif_data: Dict):
        notifs = self.local_data.setdefault("notifications", [])
        notifs.insert(0, notif_data)
        # Keep last 100 notifications
        if len(notifs) > 100:
            self.local_data["notifications"] = notifs[:100]
        self._save_local()

        if self.is_connected and self.db:
            try:
                self.db.collection("notifications").document(notif_data["id"]).set(notif_data)
            except Exception as e:
                logger.error(f"Firestore save_notification error: {e}")

    def get_notifications(self, limit: int = 30) -> List[Dict]:
        if self.is_connected and self.db:
            try:
                docs = self.db.collection("notifications").order_by("timestamp", direction="DESCENDING").limit(limit).stream()
                results = [d.to_dict() for d in docs]
                if results:
                    return results
            except Exception as e:
                logger.error(f"Firestore get_notifications error: {e}")
        return self.local_data.get("notifications", [])[:limit]

    # --- User & Auth Operations ---
    def get_users(self) -> List[Dict]:
        if self.is_connected and self.db:
            try:
                docs = self.db.collection("users").stream()
                results = [d.to_dict() for d in docs]
                if results:
                    return results
            except Exception as e:
                logger.error(f"Firestore get_users error: {e}")
        return self.local_data.get("users", [])

    def get_user_by_identifier(self, identifier: str) -> Optional[Dict]:
        clean_id = identifier.strip().lower()
        for u in self.get_users():
            user_email = (u.get("email") or "").strip().lower()
            user_phone = (u.get("phone") or "").strip().replace(" ", "").replace("-", "")
            clean_phone = clean_id.replace(" ", "").replace("-", "")
            if clean_id == user_email or clean_phone == user_phone or clean_id == user_phone:
                return u
        return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        for u in self.get_users():
            if u.get("id") == user_id:
                return u
        return None

    def save_user(self, user_data: Dict) -> Dict:
        users = self.local_data.setdefault("users", [])
        user_id = user_data.get("id")
        idx = next((i for i, u in enumerate(users) if u.get("id") == user_id), None)
        if idx is not None:
            users[idx] = user_data
        else:
            users.append(user_data)
        self._save_local()

        if self.is_connected and self.db:
            try:
                self.db.collection("users").document(user_id).set(user_data)
            except Exception as e:
                logger.error(f"Firestore save_user error: {e}")
        return user_data

    def get_tokens_by_user(self, user_id: str, phone: Optional[str] = None) -> List[Dict]:
        tokens = self.get_tokens()
        matched = []
        clean_phone = (phone or "").strip().replace(" ", "").replace("-", "")
        for t in tokens:
            pat = t.get("patient", {})
            tok_phone = (pat.get("phone") or "").strip().replace(" ", "").replace("-", "")
            tok_user_id = pat.get("user_id")
            if (tok_user_id and tok_user_id == user_id) or (clean_phone and tok_phone and clean_phone == tok_phone):
                matched.append(t)
        return matched

# Singleton instance
firebase_manager = FirebaseManager()

