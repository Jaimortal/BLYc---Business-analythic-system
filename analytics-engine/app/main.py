from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.api.dataset_routes import router as dataset_router
from app.api.cleaning_routes import router as cleaning_router
from app.api.analytics_routes import router as analytics_router
from app.api.calculation_routes import router as calculation_router

app = FastAPI(
    title="BLYc Analytics Engine",
    description="Python data processing, statistical calculations, and analytical core for BLYc",
    version="1.0.0"
)

# Internal communication only - restricted to localhost callers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(dataset_router)
app.include_router(cleaning_router)
app.include_router(analytics_router)
app.include_router(calculation_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "BLYc Python Analytics Engine",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    # Only listen on 127.0.0.1 loopback for internal security
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
