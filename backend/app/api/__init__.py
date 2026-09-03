from fastapi import APIRouter
from backend.app.api.routes_auth import router as auth_router
from backend.app.api.routes_emails import router as emails_router
from backend.app.api.routes_cases import router as cases_router
from backend.app.api.routes_settings import router as settings_router
from backend.app.api.routes_debug import router as debug_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(emails_router)
api_router.include_router(cases_router)
api_router.include_router(settings_router)
api_router.include_router(debug_router)

__all__ = ["api_router"]

