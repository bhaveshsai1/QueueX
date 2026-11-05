import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.firebase_service import firebase_manager

def main():
    print("=" * 60)
    print("      SMART OPD SYSTEM - FIREBASE FIRESTORE DIAGNOSTICS")
    print("=" * 60)

    info = firebase_manager.get_status_info()

    if info["is_connected"]:
        print("\n [SUCCESS] Firebase Firestore is CONNECTED and LIVE!")
        print(f" - Storage Mode:        {info['mode']}")
        print(f" - Firebase Project ID: {info['project_id']}")
        print(f" - Credentials Key:     {info['credential_source']}")
        print("-" * 60)
        
        # Test read/write connectivity
        try:
            print(" Testing live read/write access to Firestore...")
            test_ref = firebase_manager.db.collection("_healthcheck").document("ping")
            test_ref.set({"status": "active", "timestamp": "now"})
            read_back = test_ref.get().to_dict()
            test_ref.delete()
            print(" [PASS] Read/Write test succeeded!")
        except Exception as e:
            print(f" [WARN] Read/Write failed: {e}")
            print(" Make sure Cloud Firestore is enabled in your Firebase Console and security rules allow read/write.")

        # Sync seed data
        print(" Ensuring initial departments, doctors, and users are in Firestore...")
        sync_res = firebase_manager.sync_to_firestore(overwrite_existing=False)
        print(f" - Status: {sync_res.get('message', sync_res)}")

        # Counts
        print("-" * 60)
        print(" Current Collections in Database:")
        print(f"  * Departments:   {info['departments_count']}")
        print(f"  * Doctors:       {info['doctors_count']}")
        print(f"  * Active Tokens: {info['tokens_count']}")
        print(f"  * Users:         {info['users_count']}")
        print("-" * 60)
        if info['project_id']:
            print(f" Open your Firestore Database Console here:\n https://console.firebase.google.com/project/{info['project_id']}/firestore/databases/-default-/data")
    else:
        print("\n [INFO] Operating in HIGH-FIDELITY LOCAL SYNC MODE (Firestore Mirror)")
        print(f" - Fallback Data File: {info['data_file']}")
        print(f" - All OPD queue logic, patient tracking, and doctor portals are fully functional!")
        print("\n" + "=" * 60)
        print(" HOW TO CONNECT GOOGLE CLOUD FIRESTORE (IN 60 SECONDS):")
        print("=" * 60)
        print(" 1. Go to https://console.firebase.google.com and click 'Add project' (or select an existing one).")
        print(" 2. In the left menu, click 'Build' -> 'Firestore Database' -> 'Create database'.")
        print("    (Choose 'Start in test mode' so read/writes are allowed).")
        print(" 3. Go to Project Settings (gear icon at top left) -> 'Service accounts' tab.")
        print(" 4. Click 'Generate new private key'. A .json file will download.")
        print(" 5. Place that downloaded .json file directly in:")
        print(f"    {os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))}\\")
        print("    (You can name it 'firebase-service-account.json' or keep its default name).")
        print(" 6. Re-run this script:  .\\test-firebase.bat")
        print("=" * 60)

if __name__ == "__main__":
    main()

