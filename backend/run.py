import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    reload_mode = os.environ.get("RELOAD", "true").lower() in ("true", "1", "yes")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload_mode)
