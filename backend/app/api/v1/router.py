from fastapi import APIRouter
from app.api.v1.endpoints import auth, checkins, habits, goals, sessions, analysis, dashboard, journals, metrics, uploads

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(checkins.router)
router.include_router(habits.router)
router.include_router(goals.router)
router.include_router(sessions.router)
router.include_router(analysis.router)
router.include_router(dashboard.router)
router.include_router(journals.router)
router.include_router(metrics.router)
router.include_router(uploads.router)
