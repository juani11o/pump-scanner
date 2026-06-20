import os

filepath = r"c:\Users\jagl_\AntigravityWorkspace\pump-scanner\backend\main.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

bad_chunk = """    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user
async def shutdown_event():"""

good_chunk = """    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user

async def get_current_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    return user

@app.on_event("startup")
async def startup_event():
    # If scanner was marked active in persistent settings, don't start automatically anymore
    if scanner.settings.get("active", False):
        logger.info("[STARTUP] Scanner was active in saved state, but auto-start is disabled.")
        
    # Start the log broadcast task in the background
    asyncio.create_task(broadcast_logs())

@app.on_event("shutdown")
async def shutdown_event():"""

content = content.replace(bad_chunk, good_chunk)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied.")
