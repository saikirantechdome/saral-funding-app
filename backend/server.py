from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from schemes_seed import SCHEMES_SEED
from ai_service import advisor_chat, match_schemes_with_llm

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Saral Funding API")
api_router = APIRouter(prefix="/api")


# ----------------- Models -----------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class OtpRequest(BaseModel):
    mobile: str
    language: Optional[str] = "en"


class OtpVerify(BaseModel):
    mobile: str
    code: str
    language: Optional[str] = "en"


class UserOut(BaseModel):
    id: str
    mobile: str
    language: str
    full_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    category: Optional[str] = None
    onboarding_step: str = "profile"


class ProfileIn(BaseModel):
    full_name: str
    state: str
    district: str
    gender: str
    age: int
    category: str  # General / OBC / SC / ST / Minority


class BusinessProfileIn(BaseModel):
    business_stage: str  # "existing" or "new"
    industry: str  # Manufacturing / Service / Trading / Agriculture
    funding_required: int
    annual_turnover: int
    employees: int
    gst_available: bool
    udyam_available: bool


class AssessmentIn(BaseModel):
    business_type: str
    funding_requirement: int
    business_location: str
    existing_business: bool
    woman_entrepreneur: bool
    gst_registration: bool
    udyam_registration: bool
    existing_loans: bool


class ConsultationIn(BaseModel):
    consultation_type: str  # Funding Guidance / Government Schemes / Business Loan Consultation / Subsidy Consultation
    date: str  # YYYY-MM-DD
    time_slot: str
    notes: Optional[str] = ""


class AdvisorMessageIn(BaseModel):
    message: str
    language: Optional[str] = "en"


# ----------------- Auth helpers -----------------
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.replace("Bearer ", "").strip()
    user = await db.users.find_one({"id": token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


# ----------------- Routes -----------------
@api_router.get("/")
async def root():
    return {"message": "Saral Funding API"}


@api_router.post("/auth/send-otp")
async def send_otp(req: OtpRequest):
    # Mock OTP — always 123456
    if not req.mobile or len(req.mobile) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    return {"success": True, "message": "OTP sent (use 123456 in this MVP)", "mock_code": "123456"}


@api_router.post("/auth/verify-otp")
async def verify_otp(req: OtpVerify):
    if req.code != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP. Use 123456 in this MVP.")
    user = await db.users.find_one({"mobile": req.mobile}, {"_id": 0})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "mobile": req.mobile,
            "language": req.language or "en",
            "full_name": None,
            "state": None,
            "district": None,
            "gender": None,
            "age": None,
            "category": None,
            "onboarding_step": "profile",
            "created_at": now_iso(),
        }
        await db.users.insert_one(user.copy())
        # welcome notification
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "title": "Welcome to Saral Funding",
            "body": "Complete your profile to see funding schemes you're eligible for.",
            "type": "platform",
            "read": False,
            "created_at": now_iso(),
        })
    else:
        await db.users.update_one({"id": user["id"]}, {"$set": {"language": req.language or user.get("language", "en")}})
        user["language"] = req.language or user.get("language", "en")
    return {"token": user["id"], "user": UserOut(**user).dict()}


@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return UserOut(**user).dict()


@api_router.post("/profile")
async def save_profile(body: ProfileIn, user=Depends(get_current_user)):
    update = body.dict()
    update["onboarding_step"] = "business"
    update["updated_at"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return UserOut(**updated).dict()


@api_router.post("/business-profile")
async def save_business(body: BusinessProfileIn, user=Depends(get_current_user)):
    doc = body.dict()
    doc["user_id"] = user["id"]
    doc["updated_at"] = now_iso()
    await db.business_profiles.update_one(
        {"user_id": user["id"]}, {"$set": doc}, upsert=True,
    )
    await db.users.update_one({"id": user["id"]}, {"$set": {"onboarding_step": "assessment"}})
    return {"ok": True, "business_profile": doc}


@api_router.get("/business-profile")
async def get_business(user=Depends(get_current_user)):
    bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return bp or {}


@api_router.post("/funding-assessment")
async def save_assessment(body: AssessmentIn, user=Depends(get_current_user)):
    doc = body.dict()
    doc["user_id"] = user["id"]
    doc["updated_at"] = now_iso()
    await db.funding_assessments.update_one(
        {"user_id": user["id"]}, {"$set": doc}, upsert=True,
    )
    await db.users.update_one({"id": user["id"]}, {"$set": {"onboarding_step": "done"}})
    # compute matches immediately
    await compute_and_store_matches(user["id"])
    return {"ok": True}


@api_router.get("/funding-assessment")
async def get_assessment(user=Depends(get_current_user)):
    a = await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0})
    return a or {}


@api_router.get("/schemes")
async def list_schemes(category: Optional[str] = None, q: Optional[str] = None, state: Optional[str] = None):
    query: Dict[str, Any] = {}
    if category and category.lower() != "all":
        query["categories"] = category
    if state and state.lower() != "all":
        query["$or"] = [{"states": "All India"}, {"states": state}]
    if q:
        query["$or"] = (query.get("$or") or []) + [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    schemes = await db.schemes.find(query, {"_id": 0}).to_list(200)
    return schemes


@api_router.get("/schemes/{scheme_id}")
async def get_scheme(scheme_id: str):
    s = await db.schemes.find_one({"id": scheme_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return s


async def compute_and_store_matches(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    bp = await db.business_profiles.find_one({"user_id": user_id}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user_id}, {"_id": 0}) or {}
    schemes = await db.schemes.find({}, {"_id": 0}).to_list(200)
    matches = await match_schemes_with_llm(user or {}, bp, fa, schemes)
    doc = {
        "user_id": user_id,
        "matches": matches,
        "computed_at": now_iso(),
    }
    await db.scheme_matches.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    # notification
    if matches:
        top = matches[0]
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": f"You may qualify for {top['name']}",
            "body": f"Your eligibility score is {top['score']}%. Explore in your dashboard.",
            "type": "recommendation",
            "read": False,
            "created_at": now_iso(),
        })
    return doc


@api_router.get("/match/me")
async def get_my_matches(user=Depends(get_current_user)):
    m = await db.scheme_matches.find_one({"user_id": user["id"]}, {"_id": 0})
    if not m:
        m = await compute_and_store_matches(user["id"])
    # Compute dashboard summary
    matches: List[Dict[str, Any]] = m.get("matches", [])
    funding_estimate = sum(int(x.get("funding_estimate", 0) or 0) for x in matches[:5])
    subsidy_estimate = sum(int(x.get("subsidy_estimate", 0) or 0) for x in matches[:5])
    avg_score = int(sum(x.get("score", 0) for x in matches[:5]) / max(1, len(matches[:5]))) if matches else 0
    return {
        "matches": matches,
        "funding_estimate": funding_estimate,
        "subsidy_estimate": subsidy_estimate,
        "readiness_score": avg_score,
        "computed_at": m.get("computed_at"),
    }


@api_router.post("/match/recompute")
async def recompute(user=Depends(get_current_user)):
    return await compute_and_store_matches(user["id"])


@api_router.post("/advisor/chat")
async def advisor_chat_endpoint(body: AdvisorMessageIn, user=Depends(get_current_user)):
    # Load history
    history_doc = await db.ai_conversations.find_one({"user_id": user["id"]}, {"_id": 0})
    history = history_doc.get("messages", []) if history_doc else []
    schemes = await db.schemes.find({}, {"_id": 0}).to_list(200)
    bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    reply = await advisor_chat(
        user_id=user["id"],
        user_profile=user,
        business_profile=bp,
        assessment=fa,
        schemes=schemes,
        message=body.message,
        language=body.language or user.get("language", "en"),
        history=history,
    )
    new_history = history + [
        {"role": "user", "content": body.message, "ts": now_iso()},
        {"role": "assistant", "content": reply, "ts": now_iso()},
    ]
    await db.ai_conversations.update_one(
        {"user_id": user["id"]},
        {"$set": {"user_id": user["id"], "messages": new_history, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"reply": reply, "messages": new_history}


@api_router.get("/advisor/history")
async def advisor_history(user=Depends(get_current_user)):
    doc = await db.ai_conversations.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"messages": doc.get("messages", []) if doc else []}


@api_router.delete("/advisor/history")
async def advisor_clear(user=Depends(get_current_user)):
    await db.ai_conversations.delete_one({"user_id": user["id"]})
    return {"ok": True}


@api_router.post("/consultations")
async def book_consultation(body: ConsultationIn, user=Depends(get_current_user)):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["status"] = "confirmed"
    doc["created_at"] = now_iso()
    await db.consultations.insert_one(doc.copy())
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": "Consultation Booked",
        "body": f"Your {doc['consultation_type']} on {doc['date']} at {doc['time_slot']} is confirmed.",
        "type": "reminder",
        "read": False,
        "created_at": now_iso(),
    })
    doc.pop("_id", None)
    return doc


@api_router.get("/consultations/me")
async def my_consultations(user=Depends(get_current_user)):
    items = await db.consultations.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items


@api_router.get("/notifications/me")
async def my_notifications(user=Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


@api_router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.post("/language")
async def update_language(body: Dict[str, Any], user=Depends(get_current_user)):
    lang = body.get("language", "en")
    await db.users.update_one({"id": user["id"]}, {"$set": {"language": lang}})
    return {"ok": True, "language": lang}


# ----------------- Startup -----------------
@app.on_event("startup")
async def seed_db():
    count = await db.schemes.count_documents({})
    if count == 0:
        for s in SCHEMES_SEED:
            await db.schemes.insert_one(s.copy())
        logging.info(f"Seeded {len(SCHEMES_SEED)} schemes")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
