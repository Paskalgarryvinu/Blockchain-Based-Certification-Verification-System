from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends

DEMO_USERS = {
    "admin@trusted.dev": {"password": "admin123", "role": "admin", "name": "Admin User", "token": "admin-token"},
    "verifier@trusted.dev": {"password": "verify123", "role": "verifier", "name": "Verifier User", "token": "verifier-token"},
}

TOKEN_TO_USER = {v["token"]: {"email": k, **v} for k, v in DEMO_USERS.items()}


def authenticate_demo_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    user = DEMO_USERS.get(email)
    if user and user["password"] == password:
        return {"email": email, "role": user["role"], "name": user["name"], "token": user["token"]}
    return None


def get_current_user_or_401(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1]
    else:
        token = authorization.strip()
    user = TOKEN_TO_USER.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def require_role(required: str):
    def checker(user=Depends(get_current_user_or_401)):  # type: ignore[name-defined]
        if user.get("role") != required:
            raise HTTPException(status_code=403, detail=f"Requires role: {required}")
        return user
    return checker