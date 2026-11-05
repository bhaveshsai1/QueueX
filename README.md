# 🏥 Smart OPD System — Adaptive Virtual Queue Engine

> **A real-time, intelligent Outpatient Department (OPD) queue management system that replaces physical waiting rooms with an automated, adaptive virtual queue.**

Built for high-pressure healthcare environments where emergencies strike, doctor delays occur, and walk-in arrivals collide with pre-booked appointments.

---

## 🌟 The Problem
Patients in hospital Outpatient Departments (OPDs) face painfully long wait times — often waiting over an hour for just a 5–10 minute consultation with a doctor. Because traditional hospital queue systems are static and physical:
- Hospitals struggle to absorb sudden trauma or emergency cases without disrupting the entire day.
- Doctor delays (e.g., called into emergency surgery or ward rounds) cause severe bottlenecks and confusion.
- Overcrowded waiting halls cause patient frustration, high risk of spreading nosocomial infections, and elevated stress for hospital staff.

---

## 💡 The Solution: Core Features

1. **Virtual Smart Queue & Digital Token with Live Smartphone Tracking**:
   - Patients check in at a self-service touchscreen kiosk or scan a QR code on arrival.
   - Generates an instant digital token (e.g., `CARD-101`) and a live web-tracking link with real-time ETA countdown.
   - Patients can wait comfortably anywhere nearby (hospital cafeteria, garden courtyard, pharmacy).

2. **Emergency & Priority Preemption (Triage Scoring)**:
   - Acute trauma cases automatically jump to Slot #1 in the doctor's queue.
   - The queue engine dynamically recalculates and shifts all subsequent patient ETAs with zero manual staff effort.

3. **Dynamic Doctor Delay Management**:
   - If a doctor is delayed (+15m, +30m, or emergency surgery call), a single dashboard click updates all queued tokens.
   - Broadcasts real-time delay notifications with revised ETAs across patient mobile trackers.

4. **Smart Proximity Alerts**:
   - Automated alerts fire when 3 patients remain ahead: *"You are 3rd in line! Please head to consultation room 102."*
   - Supported by automated IVR call simulations if a called patient misses their turn.

5. **Intelligent Slot Interleaving**:
   - Dynamically blends pre-booked online appointments with walk-in tokens based on rolling doctor throughput.
   - Prevents walk-in starvation while eliminating doctor idle gaps.

6. **Public Waiting Room TV Board**:
   - Large-format display designed for hospital waiting hall screens with high-contrast token numbers, doctors on duty, and hospital chime voice announcements.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Lucide Icons + Web Audio API Chime Synthesizer
- **Backend**: Python 3.10+ + FastAPI + Uvicorn + Pydantic v2 + WebSockets
- **Database / Cloud**: Firebase Firestore (with dual-mode high-fidelity fallback store so it runs instantly out-of-the-box with or without credentials)

---

## 🚀 Quick Start (Running the Prototype)

### Option 1: One-Click Launch (Windows)
Double-click `start-all.bat` in the root directory. It automatically boots the Python backend and Next.js frontend in separate console windows!

### Option 2: Manual Launch

#### 1. Start Python Backend
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

#### 2. Start Next.js Frontend
```bash
cd frontend
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 📱 Navigation & Portals

| Portal | URL | Access / Role | Description |
|---|---|---|---|
| **Overview & Hub** | `http://localhost:3000` | Public | Landing hub with system metrics and quick navigation |
| **Patient Health Portal** | `http://localhost:3000/patient` | **Patient** | Personal patient dashboard: active token tracking, wait times, appointments, and visit history |
| **Patient Sign-In** | `http://localhost:3000/auth/patient-login` | Public | Patient login & registration with 1-click demo patient sign-in |
| **Doctor OPD Console** | `http://localhost:3000/doctor` | **Doctor / Staff** | Clinical consultation dashboard: call next, audio chime, delay management, and emergency preemption |
| **Doctor Login** | `http://localhost:3000/auth/doctor-login` | Staff | Hospital clinical gatekeeper with 1-click logins for Dr. Sarah, Dr. Rajesh, etc. |
| **Self Kiosk** | `http://localhost:3000/kiosk` | Public (Lobby) | Patient check-in (Walk-in triage & Pre-booked slot interleaving) |
| **Waiting Room TV** | `http://localhost:3000/display` | Public (Wall TV) | High-contrast public LED screen with audible chimes & current tokens |
| **Mobile Live Tracker** | `http://localhost:3000/track/[id]` | Direct Link | Live smartphone tracking screen with dynamic ETA & proximity alerts |
| **Admin & Simulator** | `http://localhost:3000/admin` | Staff / Admin | Hackathon live event simulator (Seed queue, inject emergency, surgery delay) |

---

## 🔑 Demo Login Credentials (Pre-Configured)

### 🩺 Doctor / Clinical Staff Portal:
- **Dr. Sarah Jenkins (Cardiology, Room 102)**: `dr.sarah@hospital.org` / `doctor123`
- **Dr. Rajesh Sharma (Orthopedics, Room 204)**: `dr.rajesh@hospital.org` / `doctor123`
- **Dr. Ananya Roy (General Medicine, Room 108)**: `dr.ananya@hospital.org` / `doctor123`
- **Dr. Michael Chen (Pediatrics, Room 302)**: `dr.michael@hospital.org` / `doctor123`
*(Both the Doctor login page and Navbar include **1-Click Demo Sign-in buttons** for instant testing).*

### 👤 Patient Portal:
- **Rahul Sharma**: `rahul@gmail.com` or `+91 98765 43210` / `patient123`
*(Or click "1-Click Demo Patient" or register any new patient with mobile/email).*

---

## 🧪 Hackathon Demo Scenario Guide (For Judges)

1. Open `http://localhost:3000/admin` in one browser tab.
2. Click **"1. Seed OPD Scenario"**:
   - Seeds realistic patients across Cardiology, Orthopedics, and General Medicine.
   - Pre-books and interleaves online slots with walk-ins.
3. Open `http://localhost:3000/doctor` in a second tab:
   - Notice Dr. Sarah Jenkins consulting `CARD-001` with an active consultation timer.
   - Click **"Complete & Call Next Patient"** to hear the hospital chime and see the queue shift.
4. Open `http://localhost:3000/display` on a third window to view the public waiting room TV board.
5. In the Admin tab, click **"2. Inject Emergency Triage"**:
   - Watch the emergency patient instantly preempt the queue to Slot #1 and push all downstream ETAs by ~8–10 minutes!
6. Click **"3. Doctor Surgery (+25m)"**:
   - Watch the delay banner propagate across the Doctor console, TV board, and patient tracking links.

---

## 🔒 Firebase Configuration (Optional)
The system runs in **High-Fidelity Firestore Sync Mode** by default. To connect to your real Google Cloud Firebase project:
1. Place your `firebase-service-account.json` in `backend/`
2. Or set the environment variable:
   ```bash
   set FIREBASE_CREDENTIALS=path/to/firebase-service-account.json
   ```
The backend automatically switches from local persistence to live Firebase Firestore!

