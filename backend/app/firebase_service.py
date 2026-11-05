import os
import glob
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger("OPD_Firebase")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Load environment variables if python-dotenv is installed
try:
    from dotenv import load_dotenv
    for env_path in [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
    ]:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            break
except Exception:
    pass

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "opd_state.json")

class FirebaseManager:
    """
    Manages Firebase Firestore persistence with an intelligent local sync fallback.
    If 'firebase-service-account.json', 'serviceAccountKey.json', or FIREBASE_CREDENTIALS
    is present, syncs to Google Cloud Firestore in real time.
    Otherwise, runs a high-fidelity local JSON store with identical schema.
    """
    def __init__(self):
        self.db = None
        self.is_connected = False
        self.credential_source = None
        self.project_id = None
        self._init_local_store()
        self._init_firebase()

    def _find_credentials_file(self) -> Optional[str]:
        # 1. Explicit environment variable
        env_cred = os.environ.get("FIREBASE_CREDENTIALS")
        if env_cred and os.path.exists(env_cred):
            return os.path.abspath(env_cred)

        # 2. Check candidate directories: current dir, backend/, project root
        search_dirs = [
            os.getcwd(),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
        ]
        
        known_names = [
            "firebase-service-account.json",
            "serviceAccountKey.json",
            "firebase-credentials.json",
            "firebase-adminsdk.json"
        ]

        for d in search_dirs:
            if not os.path.exists(d):
                continue
            for name in known_names:
                full_path = os.path.join(d, name)
                if os.path.exists(full_path):
                    return os.path.abspath(full_path)

            # Auto-detect default Google download filename format: *adminsdk*.json
            matches = glob.glob(os.path.join(d, "*adminsdk*.json"))
            if matches:
                return os.path.abspath(matches[0])

        return None

    def _init_firebase(self):
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            cred_path = self._find_credentials_file()
            if cred_path:
                logger.info(f"Detected Firebase service account at: {cred_path}")
                cred = credentials.Certificate(cred_path)
                
                # Read project ID from service account JSON
                try:
                    with open(cred_path, "r", encoding="utf-8") as f:
                        key_data = json.load(f)
                        self.project_id = key_data.get("project_id")
                except Exception:
                    pass

                if not firebase_admin._apps:
                    firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.is_connected = True
                self.credential_source = cred_path
                logger.info(f"Firebase Firestore CONNECTED (Project: {self.project_id or 'default'}).")
                
                # Check and auto-seed if Firestore is empty
                self._auto_seed_firestore_if_empty()
                return

            elif os.environ.get("FIREBASE_PRIVATE_KEY") and os.environ.get("FIREBASE_CLIENT_EMAIL"):
                # Useful for production/cloud environments
                cert_dict = {
                    "type": "service_account",
                    "project_id": os.environ.get("FIREBASE_PROJECT_ID", "smart-opd-system"),
                    "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
                    "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                self.project_id = cert_dict["project_id"]
                cred = credentials.Certificate(cert_dict)
                if not firebase_admin._apps:
                    firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.is_connected = True
                self.credential_source = "environment_variables"
                logger.info(f"Firebase Firestore CONNECTED via env vars (Project: {self.project_id}).")
                self._auto_seed_firestore_if_empty()
                return

            elif os.environ.get("FIREBASE_PROJECT_ID"):
                self.project_id = os.environ.get("FIREBASE_PROJECT_ID")
                if not firebase_admin._apps:
                    firebase_admin.initialize_app()
                self.db = firestore.client()
                self.is_connected = True
                self.credential_source = "default_application_credentials"
                logger.info(f"Firebase Firestore CONNECTED via ADC (Project: {self.project_id}).")
                self._auto_seed_firestore_if_empty()
                return

            else:
                self.is_connected = False
                self.credential_source = None
                logger.info("No Firebase credentials provided. Operating in High-Fidelity Local Sync Mode (Firestore mirror).")

        except Exception as e:
            logger.warning(f"Firebase initialization skipped or failed ({str(e)}). Falling back to local persistent store.")
            self.is_connected = False
            self.credential_source = None

    def _auto_seed_firestore_if_empty(self):
        """Seeds collections to Firestore if departments collection is empty."""
        if not self.is_connected or not self.db:
            return
        try:
            dept_stream = list(self.db.collection("departments").limit(1).stream())
            if not dept_stream:
                logger.info("Firestore database is empty. Auto-seeding initial departments, doctors, and users...")
                self.sync_to_firestore(overwrite_existing=False)
        except Exception as e:
            logger.warning(f"Auto-seed check failed: {e}")

    def sync_to_firestore(self, overwrite_existing: bool = False) -> Dict[str, Any]:
        """
        Uploads local departments, doctors, and default users to Firestore collections.
        """
        if not self.is_connected or not self.db:
            return {"success": False, "message": "Firebase is not connected."}

        try:
            # 1. Departments
            dept_coll = self.db.collection("departments")
            for dept in self.local_data.get("departments", []):
                dept_coll.document(dept["id"]).set(dept)

            # 2. Doctors
            doc_coll = self.db.collection("doctors")
            for doc in self.local_data.get("doctors", []):
                doc_coll.document(doc["id"]).set(doc)

            # 3. Users
            usr_coll = self.db.collection("users")
            for usr in self.local_data.get("users", []):
                usr_coll.document(usr["id"]).set(usr)

            # 4. Tokens
            if overwrite_existing and self.local_data.get("tokens"):
                token_coll = self.db.collection("tokens")
                for tok in self.local_data.get("tokens", []):
                    token_coll.document(tok["id"]).set(tok)

            logger.info("Successfully synced data to Firestore collections: departments, doctors, users.")
            return {"success": True, "message": "Synced to Firebase Firestore successfully."}
        except Exception as e:
            logger.error(f"Error syncing to Firestore: {e}")
            return {"success": False, "error": str(e)}

    def reset_all(self):
        """Wipes active tokens and notifications locally and in Firestore."""
        self.local_data["tokens"] = []
        self.local_data["notifications"] = []
        for d in self.local_data.get("doctors", []):
            d["status"] = "AVAILABLE"
            d["delay_minutes"] = 0
            d["delay_reason"] = None
            d["current_token_id"] = None
            d["consultation_start_time"] = None
        self._save_local()

        if self.is_connected and self.db:
            try:
                # Clear tokens
                token_docs = self.db.collection("tokens").stream()
                for doc in token_docs:
                    doc.reference.delete()

                # Clear notifications
                notif_docs = self.db.collection("notifications").stream()
                for doc in notif_docs:
                    doc.reference.delete()

                # Reset doctors
                for d in self.local_data.get("doctors", []):
                    self.db.collection("doctors").document(d["id"]).set(d)
                logger.info("Cleared Firestore tokens and notifications.")
            except Exception as e:
                logger.error(f"Firestore reset error: {e}")

    def _init_local_store(self):
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
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
            with open(DATA_FILE, "w", encoding="utf-8") as f:
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
                    self.local_data["departments"] = results
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
                    self.local_data["doctors"] = results
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
                self.local_data["tokens"] = results
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

    def delete_token(self, token_id: str):
        tokens = self.local_data.get("tokens", [])
        self.local_data["tokens"] = [t for t in tokens if t.get("id") != token_id]
        self._save_local()
        if self.is_connected and self.db:
            try:
                self.db.collection("tokens").document(token_id).delete()
            except Exception as e:
                logger.error(f"Firestore delete_token error: {e}")

    # --- Notification Operations ---
    def save_notification(self, notif_data: Dict):
        notifs = self.local_data.setdefault("notifications", [])
        notifs.insert(0, notif_data)
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
                    self.local_data["users"] = results
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

    def get_status_info(self) -> Dict[str, Any]:
        return {
            "is_connected": self.is_connected,
            "mode": "Firestore Cloud" if self.is_connected else "Local Persistent JSON (Firestore mirror)",
            "project_id": self.project_id,
            "credential_source": self.credential_source,
            "data_file": DATA_FILE if not self.is_connected else None,
            "departments_count": len(self.get_departments()),
            "doctors_count": len(self.get_doctors()),
            "tokens_count": len(self.get_tokens()),
            "users_count": len(self.get_users()),
        }

# Singleton instance
firebase_manager = FirebaseManager()
