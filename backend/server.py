from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, date
import hashlib
import jwt
import re
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'cosmo_date')]

# Create the main app
app = FastAPI(title="Cosmo Date API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================== PROJECTIONS (Optimización) ========================

# Campos a excluir siempre
USER_PROJECTION = {"_id": 0, "password": 0}
USER_PUBLIC_PROJECTION = {"_id": 0, "password": 0, "curp": 0, "phone": 0, "email": 0}
USER_MINI_PROJECTION = {"_id": 0, "id": 1, "full_name": 1, "profile_photo": 1, "zodiac_sign": 1, "bio": 1, "gender": 1}
SWIPE_PROJECTION = {"_id": 0, "target_id": 1}
MESSAGE_PROJECTION = {"_id": 0}
MATCH_PROJECTION = {"_id": 0}

# ======================== HELPER FUNCTIONS ========================

def clean_doc(doc):
    """Remove MongoDB _id from document"""
    if doc and "_id" in doc:
        del doc["_id"]
    return doc

# ======================== ZODIAC COMPATIBILITY ========================

COMPATIBILITY_MATRIX = {
    "Aries": {"Aries": 50, "Taurus": 38, "Gemini": 83, "Cancer": 42, "Leo": 97, "Virgo": 63, "Libra": 85, "Scorpio": 50, "Sagittarius": 93, "Capricorn": 47, "Aquarius": 78, "Pisces": 67},
    "Taurus": {"Aries": 38, "Taurus": 65, "Gemini": 33, "Cancer": 97, "Leo": 73, "Virgo": 90, "Libra": 65, "Scorpio": 88, "Sagittarius": 30, "Capricorn": 98, "Aquarius": 58, "Pisces": 85},
    "Gemini": {"Aries": 83, "Taurus": 33, "Gemini": 60, "Cancer": 65, "Leo": 88, "Virgo": 68, "Libra": 93, "Scorpio": 28, "Sagittarius": 60, "Capricorn": 68, "Aquarius": 85, "Pisces": 53},
    "Cancer": {"Aries": 42, "Taurus": 97, "Gemini": 65, "Cancer": 75, "Leo": 35, "Virgo": 90, "Libra": 43, "Scorpio": 94, "Sagittarius": 53, "Capricorn": 83, "Aquarius": 27, "Pisces": 98},
    "Leo": {"Aries": 97, "Taurus": 73, "Gemini": 88, "Cancer": 35, "Leo": 45, "Virgo": 35, "Libra": 97, "Scorpio": 58, "Sagittarius": 93, "Capricorn": 35, "Aquarius": 68, "Pisces": 38},
    "Virgo": {"Aries": 63, "Taurus": 90, "Gemini": 68, "Cancer": 90, "Leo": 35, "Virgo": 65, "Libra": 68, "Scorpio": 88, "Sagittarius": 48, "Capricorn": 95, "Aquarius": 30, "Pisces": 88},
    "Libra": {"Aries": 85, "Taurus": 65, "Gemini": 93, "Cancer": 43, "Leo": 97, "Virgo": 68, "Libra": 75, "Scorpio": 35, "Sagittarius": 73, "Capricorn": 55, "Aquarius": 90, "Pisces": 88},
    "Scorpio": {"Aries": 50, "Taurus": 88, "Gemini": 28, "Cancer": 94, "Leo": 58, "Virgo": 88, "Libra": 35, "Scorpio": 80, "Sagittarius": 28, "Capricorn": 95, "Aquarius": 73, "Pisces": 97},
    "Sagittarius": {"Aries": 93, "Taurus": 30, "Gemini": 60, "Cancer": 53, "Leo": 93, "Virgo": 48, "Libra": 73, "Scorpio": 28, "Sagittarius": 45, "Capricorn": 60, "Aquarius": 90, "Pisces": 63},
    "Capricorn": {"Aries": 47, "Taurus": 98, "Gemini": 68, "Cancer": 83, "Leo": 35, "Virgo": 95, "Libra": 55, "Scorpio": 95, "Sagittarius": 60, "Capricorn": 75, "Aquarius": 68, "Pisces": 88},
    "Aquarius": {"Aries": 78, "Taurus": 58, "Gemini": 85, "Cancer": 27, "Leo": 68, "Virgo": 30, "Libra": 90, "Scorpio": 73, "Sagittarius": 90, "Capricorn": 68, "Aquarius": 45, "Pisces": 45},
    "Pisces": {"Aries": 67, "Taurus": 85, "Gemini": 53, "Cancer": 98, "Leo": 38, "Virgo": 88, "Libra": 88, "Scorpio": 97, "Sagittarius": 63, "Capricorn": 88, "Aquarius": 45, "Pisces": 60}
}

def get_zodiac_sign(dob: date) -> str:
    month, day = dob.month, dob.day
    if (month == 3 and day >= 21) or (month == 4 and day <= 19): return "Aries"
    if (month == 4 and day >= 20) or (month == 5 and day <= 20): return "Taurus"
    if (month == 5 and day >= 21) or (month == 6 and day <= 20): return "Gemini"
    if (month == 6 and day >= 21) or (month == 7 and day <= 22): return "Cancer"
    if (month == 7 and day >= 23) or (month == 8 and day <= 22): return "Leo"
    if (month == 8 and day >= 23) or (month == 9 and day <= 22): return "Virgo"
    if (month == 9 and day >= 23) or (month == 10 and day <= 22): return "Libra"
    if (month == 10 and day >= 23) or (month == 11 and day <= 21): return "Scorpio"
    if (month == 11 and day >= 22) or (month == 12 and day <= 21): return "Sagittarius"
    if (month == 12 and day >= 22) or (month == 1 and day <= 19): return "Capricorn"
    if (month == 1 and day >= 20) or (month == 2 and day <= 18): return "Aquarius"
    return "Pisces"

def get_compatibility(sign1: str, sign2: str) -> int:
    return COMPATIBILITY_MATRIX.get(sign1, {}).get(sign2, 50)

# ======================== CURP VALIDATION ========================

def validate_curp(curp: str) -> bool:
    pattern = r'^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$'
    return bool(re.match(pattern, curp.upper()))

# ======================== MODELS ========================

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    date_of_birth: str
    curp: str = Field(..., min_length=18, max_length=18)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=6, max_length=10)
    profile_photo: str
    gender: str
    disclaimer_accepted: bool
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not re.match(r'^[a-zA-Z0-9]+$', v):
            raise ValueError('Contraseña debe ser alfanumérica')
        return v
    
    @field_validator('curp')
    @classmethod
    def validate_curp_field(cls, v):
        if not validate_curp(v):
            raise ValueError('Formato de CURP inválido')
        return v.upper()
    
    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v):
        if v.lower() not in ['masculino', 'femenino', 'otros']:
            raise ValueError('Género inválido')
        return v.lower()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    preferred_gender: Optional[str] = None
    profile_photo: Optional[str] = None

class SwipeAction(BaseModel):
    target_user_id: str
    action: str

class MessageCreate(BaseModel):
    match_id: str
    content: str = Field(..., min_length=1, max_length=1000)

class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=5, max_length=100)
    message: str = Field(..., min_length=10, max_length=1000)

class SupportMessageCreate(BaseModel):
    ticket_id: str
    message: str = Field(..., min_length=1, max_length=1000)

class DateRequestCreate(BaseModel):
    match_id: str
    date_type: str
    proposed_datetime: str

# ======================== AUTHENTICATION ========================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.utcnow().timestamp() + 86400 * 7}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, USER_PROJECTION)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

# ======================== AUTH ENDPOINTS ========================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    try:
        dob = datetime.strptime(user_data.date_of_birth, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 18:
            raise HTTPException(status_code=400, detail="Debes tener al menos 18 años")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido (YYYY-MM-DD)")
    
    if not user_data.disclaimer_accepted:
        raise HTTPException(status_code=400, detail="Debes aceptar el disclaimer")
    
    # Verificaciones con proyección optimizada
    if await db.users.find_one({"curp": user_data.curp.upper()}, {"_id": 1}):
        raise HTTPException(status_code=400, detail="CURP ya registrada")
    if await db.users.find_one({"email": user_data.email.lower()}, {"_id": 1}):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    if await db.users.find_one({"phone": user_data.phone}, {"_id": 1}):
        raise HTTPException(status_code=400, detail="Teléfono ya registrado")
    
    user = {
        "id": str(uuid.uuid4()),
        "full_name": user_data.full_name,
        "date_of_birth": user_data.date_of_birth,
        "curp": user_data.curp.upper(),
        "email": user_data.email.lower(),
        "phone": user_data.phone,
        "password": hash_password(user_data.password),
        "profile_photo": user_data.profile_photo,
        "gender": user_data.gender.lower(),
        "zodiac_sign": get_zodiac_sign(dob),
        "bio": "",
        "preferred_gender": "todos",
        "is_premium": False,
        "is_admin": False,
        "location": "Hermosillo, Sonora",
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(user)
    user_response = {k: v for k, v in user.items() if k not in ["password", "_id"]}
    return {"message": "Registro exitoso", "user": user_response, "zodiac_sign": user["zodiac_sign"]}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or hash_password(credentials.password) != user["password"]:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    token = create_token(user["id"])
    user.pop("password", None)
    user.pop("_id", None)
    return {"message": "Login exitoso", "token": token, "user": user}

# ======================== USER ENDPOINTS ========================

@api_router.get("/users/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.put("/users/profile")
async def update_profile(profile: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if profile.bio is not None:
        update_data["bio"] = profile.bio
    if profile.preferred_gender is not None:
        update_data["preferred_gender"] = profile.preferred_gender.lower()
    if profile.profile_photo is not None:
        update_data["profile_photo"] = profile.profile_photo
    
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": current_user["id"]}, USER_PROJECTION)
    return {"message": "Perfil actualizado", "user": updated}

@api_router.get("/users/potential-matches")
async def get_potential_matches(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    pref = current_user.get("preferred_gender", "todos")
    
    # Obtener IDs ya swipeados con proyección optimizada
    swiped_cursor = db.swipes.find({"swiper_id": user_id}, SWIPE_PROJECTION)
    swiped_ids = [s["target_id"] async for s in swiped_cursor]
    
    # Query optimizada
    query = {"id": {"$ne": user_id, "$nin": swiped_ids} if swiped_ids else {"$ne": user_id}, "location": "Hermosillo, Sonora"}
    if pref != "todos":
        query["gender"] = pref
    
    # Obtener matches potenciales con proyección
    matches = await db.users.find(query, USER_PUBLIC_PROJECTION).limit(50).to_list(50)
    
    # Agregar compatibilidad
    for m in matches:
        m["compatibility"] = get_compatibility(current_user["zodiac_sign"], m.get("zodiac_sign", ""))
    
    matches.sort(key=lambda x: x["compatibility"], reverse=True)
    return {"potential_matches": matches}

# ======================== MATCHING ENDPOINTS ========================

@api_router.post("/matches/swipe")
async def swipe(action: SwipeAction, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    target_id = action.target_user_id
    
    # Verificar target con proyección mínima
    target = await db.users.find_one({"id": target_id}, USER_MINI_PROJECTION)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar swipe existente
    if await db.swipes.find_one({"swiper_id": user_id, "target_id": target_id}, {"_id": 1}):
        raise HTTPException(status_code=400, detail="Ya votaste este usuario")
    
    await db.swipes.insert_one({
        "id": str(uuid.uuid4()),
        "swiper_id": user_id,
        "target_id": target_id,
        "action": action.action.lower(),
        "created_at": datetime.utcnow().isoformat()
    })
    
    if action.action.lower() == "like":
        mutual = await db.swipes.find_one({"swiper_id": target_id, "target_id": user_id, "action": "like"}, {"_id": 1})
        if mutual:
            match_id = str(uuid.uuid4())
            await db.matches.insert_one({
                "id": match_id,
                "user1_id": user_id,
                "user2_id": target_id,
                "compatibility": get_compatibility(current_user["zodiac_sign"], target.get("zodiac_sign", "")),
                "created_at": datetime.utcnow().isoformat()
            })
            return {
                "message": "¡Es un match!",
                "is_match": True,
                "match_id": match_id,
                "matched_user": target
            }
    
    return {"message": "Swipe registrado", "is_match": False}

@api_router.get("/matches")
async def get_matches(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Obtener todos los matches
    matches = await db.matches.find(
        {"$or": [{"user1_id": user_id}, {"user2_id": user_id}]},
        MATCH_PROJECTION
    ).to_list(100)
    
    if not matches:
        return {"matches": []}
    
    # Recolectar IDs de otros usuarios y match_ids (OPTIMIZACIÓN: batch query)
    other_user_ids = []
    match_ids = []
    for m in matches:
        other_id = m["user2_id"] if m["user1_id"] == user_id else m["user1_id"]
        other_user_ids.append(other_id)
        match_ids.append(m["id"])
    
    # Batch query para usuarios (ELIMINA N+1)
    users_cursor = db.users.find({"id": {"$in": other_user_ids}}, USER_PUBLIC_PROJECTION)
    users_dict = {u["id"]: u async for u in users_cursor}
    
    # Batch query para últimos mensajes usando agregación (ELIMINA N+1)
    pipeline = [
        {"$match": {"match_id": {"$in": match_ids}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$match_id", "content": {"$first": "$content"}, "created_at": {"$first": "$created_at"}}}
    ]
    last_messages_cursor = db.messages.aggregate(pipeline)
    last_messages_dict = {msg["_id"]: msg async for msg in last_messages_cursor}
    
    # Construir resultado
    result = []
    for m in matches:
        other_id = m["user2_id"] if m["user1_id"] == user_id else m["user1_id"]
        other_user = users_dict.get(other_id)
        if other_user:
            last_msg = last_messages_dict.get(m["id"])
            result.append({
                "match_id": m["id"],
                "compatibility": m["compatibility"],
                "matched_at": m["created_at"],
                "user": other_user,
                "last_message": last_msg["content"] if last_msg else None,
                "last_message_at": last_msg["created_at"] if last_msg else None
            })
    
    result.sort(key=lambda x: x.get("last_message_at") or x["matched_at"], reverse=True)
    return {"matches": result}

# ======================== MESSAGING ENDPOINTS ========================

@api_router.post("/messages")
async def send_message(message: MessageCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    match = await db.matches.find_one(
        {"id": message.match_id, "$or": [{"user1_id": user_id}, {"user2_id": user_id}]},
        {"_id": 1}
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    msg = {
        "id": str(uuid.uuid4()),
        "match_id": message.match_id,
        "sender_id": user_id,
        "content": message.content,
        "created_at": datetime.utcnow().isoformat()
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return {"message": "Mensaje enviado", "data": msg}

@api_router.get("/messages/{match_id}")
async def get_messages(match_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    match = await db.matches.find_one(
        {"id": match_id, "$or": [{"user1_id": user_id}, {"user2_id": user_id}]},
        {"_id": 1}
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    messages = await db.messages.find({"match_id": match_id}, MESSAGE_PROJECTION).sort("created_at", 1).to_list(500)
    return {"messages": messages}

# ======================== DATE REQUEST ENDPOINTS ========================

@api_router.post("/dates/request")
async def create_date_request(date_req: DateRequestCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_premium"):
        raise HTTPException(status_code=403, detail="Función solo para usuarios Premium")
    
    user_id = current_user["id"]
    match = await db.matches.find_one(
        {"id": date_req.match_id, "$or": [{"user1_id": user_id}, {"user2_id": user_id}]},
        {"_id": 0, "user1_id": 1, "user2_id": 1}
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    other_id = match["user2_id"] if match["user1_id"] == user_id else match["user1_id"]
    
    date_record = {
        "id": str(uuid.uuid4()),
        "match_id": date_req.match_id,
        "requester_id": user_id,
        "recipient_id": other_id,
        "date_type": date_req.date_type.lower(),
        "proposed_datetime": date_req.proposed_datetime,
        "status": "pending",
        "payment_status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    await db.date_requests.insert_one(date_record)
    date_record.pop("_id", None)
    return {"message": "Solicitud de cita enviada", "date_request": date_record}

@api_router.get("/dates")
async def get_date_requests(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Obtener todas las citas
    dates = await db.date_requests.find(
        {"$or": [{"requester_id": user_id}, {"recipient_id": user_id}]},
        {"_id": 0}
    ).to_list(50)
    
    if not dates:
        return {"date_requests": []}
    
    # Recolectar IDs de otros usuarios (OPTIMIZACIÓN: batch query)
    other_user_ids = set()
    for d in dates:
        other_id = d["recipient_id"] if d["requester_id"] == user_id else d["requester_id"]
        other_user_ids.add(other_id)
    
    # Batch query para usuarios (ELIMINA N+1)
    users_cursor = db.users.find(
        {"id": {"$in": list(other_user_ids)}},
        {"_id": 0, "id": 1, "full_name": 1, "profile_photo": 1}
    )
    users_dict = {u["id"]: u async for u in users_cursor}
    
    # Construir resultado
    result = []
    for d in dates:
        other_id = d["recipient_id"] if d["requester_id"] == user_id else d["requester_id"]
        other_user = users_dict.get(other_id)
        if other_user:
            d["other_user"] = other_user
        d["is_requester"] = d["requester_id"] == user_id
        result.append(d)
    
    return {"date_requests": result}

@api_router.put("/dates/{date_id}/respond")
async def respond_to_date(date_id: str, response: str, current_user: dict = Depends(get_current_user)):
    if response not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Respuesta inválida")
    
    result = await db.date_requests.update_one(
        {"id": date_id, "recipient_id": current_user["id"], "status": "pending"},
        {"$set": {"status": response}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    return {"message": f"Cita {response}"}

# ======================== SUPPORT ENDPOINTS ========================

@api_router.post("/support/tickets")
async def create_support_ticket(ticket: SupportTicketCreate, current_user: dict = Depends(get_current_user)):
    ticket_record = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["full_name"],
        "subject": ticket.subject,
        "status": "open",
        "messages": [{
            "id": str(uuid.uuid4()),
            "sender_id": current_user["id"],
            "sender_name": current_user["full_name"],
            "content": ticket.message,
            "is_admin": False,
            "created_at": datetime.utcnow().isoformat()
        }],
        "created_at": datetime.utcnow().isoformat()
    }
    await db.support_tickets.insert_one(ticket_record)
    ticket_record.pop("_id", None)
    return {"message": "Ticket creado", "ticket": ticket_record}

@api_router.get("/support/tickets")
async def get_support_tickets(current_user: dict = Depends(get_current_user)):
    tickets = await db.support_tickets.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(50)
    return {"tickets": tickets}

@api_router.post("/support/tickets/{ticket_id}/message")
async def add_ticket_message(ticket_id: str, msg: SupportMessageCreate, current_user: dict = Depends(get_current_user)):
    new_msg = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "content": msg.message,
        "is_admin": False,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await db.support_tickets.update_one(
        {"id": ticket_id, "user_id": current_user["id"]},
        {"$push": {"messages": new_msg}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    return {"message": "Mensaje añadido", "data": new_msg}

# ======================== ADMIN ENDPOINTS ========================

@api_router.put("/admin/users/{user_id}/premium")
async def update_premium(user_id: str, is_premium: bool, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_premium": is_premium}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": f"Premium actualizado a {is_premium}"}

# ======================== HEALTH CHECK ========================

@api_router.get("/")
async def root():
    return {"message": "Cosmo Date API - Hermosillo, Sonora", "status": "active"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
