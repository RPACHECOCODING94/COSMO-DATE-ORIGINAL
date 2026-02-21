from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, date
import hashlib
import jwt
import re

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
SECRET_KEY = os.environ.get('SECRET_KEY', 'cosmo_date_secret_key_2025')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================== ZODIAC COMPATIBILITY ========================

ZODIAC_SIGNS = {
    "Aries": {"element": "Fire", "modality": "Cardinal", "dates": [(3, 21), (4, 19)]},
    "Taurus": {"element": "Earth", "modality": "Fixed", "dates": [(4, 20), (5, 20)]},
    "Gemini": {"element": "Air", "modality": "Mutable", "dates": [(5, 21), (6, 20)]},
    "Cancer": {"element": "Water", "modality": "Cardinal", "dates": [(6, 21), (7, 22)]},
    "Leo": {"element": "Fire", "modality": "Fixed", "dates": [(7, 23), (8, 22)]},
    "Virgo": {"element": "Earth", "modality": "Mutable", "dates": [(8, 23), (9, 22)]},
    "Libra": {"element": "Air", "modality": "Cardinal", "dates": [(9, 23), (10, 22)]},
    "Scorpio": {"element": "Water", "modality": "Fixed", "dates": [(10, 23), (11, 21)]},
    "Sagittarius": {"element": "Fire", "modality": "Mutable", "dates": [(11, 22), (12, 21)]},
    "Capricorn": {"element": "Earth", "modality": "Cardinal", "dates": [(12, 22), (1, 19)]},
    "Aquarius": {"element": "Air", "modality": "Fixed", "dates": [(1, 20), (2, 18)]},
    "Pisces": {"element": "Water", "modality": "Mutable", "dates": [(2, 19), (3, 20)]}
}

# Compatibility matrix based on traditional astrology
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
    """Determine zodiac sign from date of birth"""
    month = dob.month
    day = dob.day
    
    if (month == 3 and day >= 21) or (month == 4 and day <= 19):
        return "Aries"
    elif (month == 4 and day >= 20) or (month == 5 and day <= 20):
        return "Taurus"
    elif (month == 5 and day >= 21) or (month == 6 and day <= 20):
        return "Gemini"
    elif (month == 6 and day >= 21) or (month == 7 and day <= 22):
        return "Cancer"
    elif (month == 7 and day >= 23) or (month == 8 and day <= 22):
        return "Leo"
    elif (month == 8 and day >= 23) or (month == 9 and day <= 22):
        return "Virgo"
    elif (month == 9 and day >= 23) or (month == 10 and day <= 22):
        return "Libra"
    elif (month == 10 and day >= 23) or (month == 11 and day <= 21):
        return "Scorpio"
    elif (month == 11 and day >= 22) or (month == 12 and day <= 21):
        return "Sagittarius"
    elif (month == 12 and day >= 22) or (month == 1 and day <= 19):
        return "Capricorn"
    elif (month == 1 and day >= 20) or (month == 2 and day <= 18):
        return "Aquarius"
    else:
        return "Pisces"

def get_compatibility_percentage(sign1: str, sign2: str) -> int:
    """Get compatibility percentage between two zodiac signs"""
    return COMPATIBILITY_MATRIX.get(sign1, {}).get(sign2, 50)

# ======================== CURP VALIDATION ========================

def validate_curp(curp: str) -> bool:
    """Validate Mexican CURP format (18 characters)"""
    # CURP pattern: 4 letters + 6 digits + 1 letter (gender) + 2 letters (state) + 3 consonants + 2 chars
    curp_pattern = r'^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$'
    return bool(re.match(curp_pattern, curp.upper()))

# ======================== MODELS ========================

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    date_of_birth: str  # Format: YYYY-MM-DD
    curp: str = Field(..., min_length=18, max_length=18)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=6, max_length=10)
    profile_photo: str  # Base64 encoded
    gender: str  # masculino, femenino, otros
    disclaimer_accepted: bool
    
    @validator('password')
    def validate_password(cls, v):
        if not re.match(r'^[a-zA-Z0-9]+$', v):
            raise ValueError('La contraseña debe ser alfanumérica')
        return v
    
    @validator('curp')
    def validate_curp_field(cls, v):
        if not validate_curp(v):
            raise ValueError('Formato de CURP inválido')
        return v.upper()
    
    @validator('gender')
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
    
    @validator('preferred_gender')
    def validate_preferred_gender(cls, v):
        if v and v.lower() not in ['masculino', 'femenino', 'otros', 'todos']:
            raise ValueError('Preferencia de género inválida')
        return v.lower() if v else v

class SwipeAction(BaseModel):
    target_user_id: str
    action: str  # "like" or "dislike"
    
    @validator('action')
    def validate_action(cls, v):
        if v.lower() not in ['like', 'dislike']:
            raise ValueError('Acción inválida')
        return v.lower()

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
    date_type: str  # cena, baile, cine
    proposed_datetime: str  # ISO format
    
    @validator('date_type')
    def validate_date_type(cls, v):
        if v.lower() not in ['cena', 'baile', 'cine']:
            raise ValueError('Tipo de cita inválido')
        return v.lower()

class AdminPremiumUpdate(BaseModel):
    user_id: str
    is_premium: bool

# ======================== AUTHENTICATION ========================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow().timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

# ======================== AUTH ENDPOINTS ========================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    """Register a new user"""
    # Validate age (18+)
    try:
        dob = datetime.strptime(user_data.date_of_birth, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 18:
            raise HTTPException(status_code=400, detail="Debes tener al menos 18 años para registrarte")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
    
    # Check disclaimer
    if not user_data.disclaimer_accepted:
        raise HTTPException(status_code=400, detail="Debes aceptar el disclaimer para registrarte")
    
    # Check for duplicate CURP
    existing_curp = await db.users.find_one({"curp": user_data.curp.upper()})
    if existing_curp:
        raise HTTPException(status_code=400, detail="Esta CURP ya está registrada")
    
    # Check for duplicate email
    existing_email = await db.users.find_one({"email": user_data.email.lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail="Este correo electrónico ya está registrado")
    
    # Check for duplicate phone
    existing_phone = await db.users.find_one({"phone": user_data.phone})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Este teléfono ya está registrado")
    
    # Get zodiac sign
    zodiac_sign = get_zodiac_sign(dob)
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "full_name": user_data.full_name,
        "date_of_birth": user_data.date_of_birth,
        "curp": user_data.curp.upper(),
        "email": user_data.email.lower(),
        "phone": user_data.phone,
        "password": hash_password(user_data.password),
        "profile_photo": user_data.profile_photo,
        "gender": user_data.gender.lower(),
        "zodiac_sign": zodiac_sign,
        "bio": "",
        "preferred_gender": "todos",
        "is_premium": False,
        "is_admin": False,
        "location": "Hermosillo, Sonora",
        "profile_complete": False,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Remove sensitive data from response
    user.pop("password", None)
    user.pop("_id", None)
    
    return {
        "message": "Registro exitoso",
        "user": user,
        "zodiac_sign": zodiac_sign
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Correo electrónico o contraseña incorrectos")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Correo electrónico o contraseña incorrectos")
    
    token = create_token(user["id"])
    
    # Remove sensitive data
    user.pop("password", None)
    user.pop("_id", None)
    
    return {
        "message": "Inicio de sesión exitoso",
        "token": token,
        "user": user
    }

# ======================== USER ENDPOINTS ========================

@api_router.get("/users/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    current_user.pop("password", None)
    current_user.pop("_id", None)
    return current_user

@api_router.put("/users/profile")
async def update_profile(profile: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    update_data = {}
    
    if profile.bio is not None:
        update_data["bio"] = profile.bio
    if profile.preferred_gender is not None:
        update_data["preferred_gender"] = profile.preferred_gender
    if profile.profile_photo is not None:
        update_data["profile_photo"] = profile.profile_photo
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow().isoformat()
        update_data["profile_complete"] = True
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    updated_user.pop("password", None)
    updated_user.pop("_id", None)
    
    return {"message": "Perfil actualizado", "user": updated_user}

@api_router.get("/users/potential-matches")
async def get_potential_matches(current_user: dict = Depends(get_current_user)):
    """Get potential matches based on preferences and zodiac compatibility"""
    user_id = current_user["id"]
    preferred_gender = current_user.get("preferred_gender", "todos")
    user_zodiac = current_user["zodiac_sign"]
    
    # Build query
    query = {
        "id": {"$ne": user_id},
        "location": "Hermosillo, Sonora"
    }
    
    # Filter by preferred gender
    if preferred_gender != "todos":
        query["gender"] = preferred_gender
    
    # Get users that current user has already swiped on
    existing_swipes = await db.swipes.find({"swiper_id": user_id}).to_list(1000)
    swiped_user_ids = [s["target_id"] for s in existing_swipes]
    
    if swiped_user_ids:
        query["id"] = {"$ne": user_id, "$nin": swiped_user_ids}
    
    # Get potential matches
    potential_matches = await db.users.find(query).to_list(50)
    
    # Add compatibility percentage and clean up data
    result = []
    for match in potential_matches:
        match.pop("password", None)
        match.pop("_id", None)
        match["compatibility"] = get_compatibility_percentage(user_zodiac, match["zodiac_sign"])
        result.append(match)
    
    # Sort by compatibility (highest first)
    result.sort(key=lambda x: x["compatibility"], reverse=True)
    
    return {"potential_matches": result}

# ======================== MATCHING ENDPOINTS ========================

@api_router.post("/matches/swipe")
async def swipe(action: SwipeAction, current_user: dict = Depends(get_current_user)):
    """Swipe on a user (like or dislike)"""
    user_id = current_user["id"]
    target_id = action.target_user_id
    
    # Check if target user exists
    target_user = await db.users.find_one({"id": target_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Check if already swiped
    existing_swipe = await db.swipes.find_one({"swiper_id": user_id, "target_id": target_id})
    if existing_swipe:
        raise HTTPException(status_code=400, detail="Ya has dado tu opinión sobre este usuario")
    
    # Record swipe
    swipe_record = {
        "id": str(uuid.uuid4()),
        "swiper_id": user_id,
        "target_id": target_id,
        "action": action.action,
        "created_at": datetime.utcnow().isoformat()
    }
    await db.swipes.insert_one(swipe_record)
    
    # Check for mutual like (match)
    is_match = False
    if action.action == "like":
        mutual_like = await db.swipes.find_one({
            "swiper_id": target_id,
            "target_id": user_id,
            "action": "like"
        })
        
        if mutual_like:
            # Create match
            match_id = str(uuid.uuid4())
            match_record = {
                "id": match_id,
                "user1_id": user_id,
                "user2_id": target_id,
                "compatibility": get_compatibility_percentage(
                    current_user["zodiac_sign"], 
                    target_user["zodiac_sign"]
                ),
                "created_at": datetime.utcnow().isoformat()
            }
            await db.matches.insert_one(match_record)
            is_match = True
            
            return {
                "message": "¡Es un match!",
                "is_match": True,
                "match_id": match_id,
                "matched_user": {
                    "id": target_user["id"],
                    "full_name": target_user["full_name"],
                    "profile_photo": target_user["profile_photo"],
                    "zodiac_sign": target_user["zodiac_sign"],
                    "compatibility": match_record["compatibility"]
                }
            }
    
    return {"message": "Swipe registrado", "is_match": False}

@api_router.get("/matches")
async def get_matches(current_user: dict = Depends(get_current_user)):
    """Get all matches for current user"""
    user_id = current_user["id"]
    
    # Find all matches where user is involved
    matches = await db.matches.find({
        "$or": [{"user1_id": user_id}, {"user2_id": user_id}]
    }).to_list(100)
    
    result = []
    for match in matches:
        # Get the other user's info
        other_user_id = match["user2_id"] if match["user1_id"] == user_id else match["user1_id"]
        other_user = await db.users.find_one({"id": other_user_id})
        
        if other_user:
            other_user.pop("password", None)
            other_user.pop("_id", None)
            
            # Get last message
            last_message = await db.messages.find_one(
                {"match_id": match["id"]},
                sort=[("created_at", -1)]
            )
            
            result.append({
                "match_id": match["id"],
                "compatibility": match["compatibility"],
                "matched_at": match["created_at"],
                "user": other_user,
                "last_message": last_message["content"] if last_message else None,
                "last_message_at": last_message["created_at"] if last_message else None
            })
    
    # Sort by last message date
    result.sort(key=lambda x: x.get("last_message_at") or x["matched_at"], reverse=True)
    
    return {"matches": result}

# ======================== MESSAGING ENDPOINTS ========================

@api_router.post("/messages")
async def send_message(message: MessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a message in a match"""
    user_id = current_user["id"]
    
    # Verify match exists and user is part of it
    match = await db.matches.find_one({
        "id": message.match_id,
        "$or": [{"user1_id": user_id}, {"user2_id": user_id}]
    })
    
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    # Create message
    msg_record = {
        "id": str(uuid.uuid4()),
        "match_id": message.match_id,
        "sender_id": user_id,
        "content": message.content,
        "created_at": datetime.utcnow().isoformat()
    }
    await db.messages.insert_one(msg_record)
    
    # Remove MongoDB's _id before returning
    msg_record.pop("_id", None)
    
    return {"message": "Mensaje enviado", "data": msg_record}

@api_router.get("/messages/{match_id}")
async def get_messages(match_id: str, current_user: dict = Depends(get_current_user)):
    """Get all messages for a match"""
    user_id = current_user["id"]
    
    # Verify match exists and user is part of it
    match = await db.matches.find_one({
        "id": match_id,
        "$or": [{"user1_id": user_id}, {"user2_id": user_id}]
    })
    
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    messages = await db.messages.find({"match_id": match_id}).sort("created_at", 1).to_list(500)
    
    # Clean up messages
    for msg in messages:
        msg.pop("_id", None)
    
    return {"messages": messages}

# ======================== DATE REQUEST ENDPOINTS (Premium) ========================

@api_router.post("/dates/request")
async def create_date_request(date_req: DateRequestCreate, current_user: dict = Depends(get_current_user)):
    """Request a date (Premium feature)"""
    if not current_user.get("is_premium"):
        raise HTTPException(status_code=403, detail="Esta función es solo para usuarios Premium")
    
    user_id = current_user["id"]
    
    # Verify match exists
    match = await db.matches.find_one({
        "id": date_req.match_id,
        "$or": [{"user1_id": user_id}, {"user2_id": user_id}]
    })
    
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    # Get the other user
    other_user_id = match["user2_id"] if match["user1_id"] == user_id else match["user1_id"]
    
    # Create date request
    date_record = {
        "id": str(uuid.uuid4()),
        "match_id": date_req.match_id,
        "requester_id": user_id,
        "recipient_id": other_user_id,
        "date_type": date_req.date_type,
        "proposed_datetime": date_req.proposed_datetime,
        "status": "pending",  # pending, accepted, rejected
        "payment_status": "pending",  # pending, paid
        "created_at": datetime.utcnow().isoformat()
    }
    await db.date_requests.insert_one(date_record)
    
    return {"message": "Solicitud de cita enviada", "date_request": date_record}

@api_router.get("/dates")
async def get_date_requests(current_user: dict = Depends(get_current_user)):
    """Get all date requests for current user"""
    user_id = current_user["id"]
    
    date_requests = await db.date_requests.find({
        "$or": [{"requester_id": user_id}, {"recipient_id": user_id}]
    }).to_list(50)
    
    result = []
    for dr in date_requests:
        dr.pop("_id", None)
        
        # Get other user info
        other_user_id = dr["recipient_id"] if dr["requester_id"] == user_id else dr["requester_id"]
        other_user = await db.users.find_one({"id": other_user_id})
        
        if other_user:
            dr["other_user"] = {
                "id": other_user["id"],
                "full_name": other_user["full_name"],
                "profile_photo": other_user["profile_photo"]
            }
        
        dr["is_requester"] = dr["requester_id"] == user_id
        result.append(dr)
    
    return {"date_requests": result}

@api_router.put("/dates/{date_id}/respond")
async def respond_to_date(date_id: str, response: str, current_user: dict = Depends(get_current_user)):
    """Accept or reject a date request"""
    if response not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Respuesta inválida")
    
    user_id = current_user["id"]
    
    date_request = await db.date_requests.find_one({
        "id": date_id,
        "recipient_id": user_id,
        "status": "pending"
    })
    
    if not date_request:
        raise HTTPException(status_code=404, detail="Solicitud de cita no encontrada")
    
    await db.date_requests.update_one(
        {"id": date_id},
        {"$set": {"status": response, "responded_at": datetime.utcnow().isoformat()}}
    )
    
    return {"message": f"Cita {response}"}

# ======================== SUPPORT ENDPOINTS ========================

@api_router.post("/support/tickets")
async def create_support_ticket(ticket: SupportTicketCreate, current_user: dict = Depends(get_current_user)):
    """Create a support ticket"""
    ticket_record = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["full_name"],
        "subject": ticket.subject,
        "status": "open",  # open, in_progress, closed
        "messages": [{
            "id": str(uuid.uuid4()),
            "sender_id": current_user["id"],
            "sender_name": current_user["full_name"],
            "content": ticket.message,
            "is_admin": False,
            "created_at": datetime.utcnow().isoformat()
        }],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    await db.support_tickets.insert_one(ticket_record)
    ticket_record.pop("_id", None)
    
    return {"message": "Ticket creado", "ticket": ticket_record}

@api_router.get("/support/tickets")
async def get_support_tickets(current_user: dict = Depends(get_current_user)):
    """Get user's support tickets"""
    user_id = current_user["id"]
    
    tickets = await db.support_tickets.find({"user_id": user_id}).to_list(50)
    
    for ticket in tickets:
        ticket.pop("_id", None)
    
    return {"tickets": tickets}

@api_router.post("/support/tickets/{ticket_id}/message")
async def add_ticket_message(ticket_id: str, msg: SupportMessageCreate, current_user: dict = Depends(get_current_user)):
    """Add a message to a support ticket"""
    ticket = await db.support_tickets.find_one({
        "id": ticket_id,
        "user_id": current_user["id"]
    })
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    new_message = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "content": msg.message,
        "is_admin": False,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"messages": new_message},
            "$set": {"updated_at": datetime.utcnow().isoformat()}
        }
    )
    
    return {"message": "Mensaje añadido", "data": new_message}

# ======================== ADMIN ENDPOINTS ========================

@api_router.put("/admin/users/{user_id}/premium")
async def update_user_premium(user_id: str, update: AdminPremiumUpdate, current_user: dict = Depends(get_current_user)):
    """Update user premium status (Admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo administradores pueden realizar esta acción")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_premium": update.is_premium, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": f"Estado Premium actualizado a {update.is_premium}"}

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (Admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo administradores pueden realizar esta acción")
    
    users = await db.users.find().to_list(1000)
    
    for user in users:
        user.pop("password", None)
        user.pop("_id", None)
    
    return {"users": users}

@api_router.get("/admin/support/tickets")
async def get_all_tickets(current_user: dict = Depends(get_current_user)):
    """Get all support tickets (Admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo administradores pueden realizar esta acción")
    
    tickets = await db.support_tickets.find().to_list(100)
    
    for ticket in tickets:
        ticket.pop("_id", None)
    
    return {"tickets": tickets}

# ======================== HEALTH CHECK ========================

@api_router.get("/")
async def root():
    return {"message": "Cosmo Date API - Hermosillo, Sonora", "status": "active"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
