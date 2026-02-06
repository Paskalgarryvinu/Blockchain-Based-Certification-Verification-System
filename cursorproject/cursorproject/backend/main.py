import os
import io
import json
import hashlib
import time
import random
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging

# Import Gemini extractor instead of OCR
from gemini_extractor import extract_certificate_data, generate_hash
from ai import detect_forgery
from utils import (
    compute_sha256_hex, 
    append_ledger_block, 
    read_ledger_last_block, 
    create_certificate_block, 
    get_student_certificates, 
    verify_certificate_hash
)
from auth import authenticate_demo_user, get_current_user_or_401, require_role
from storage import (
	DB_DIR,
	INSTITUTIONS_JSON,
	VERIFICATIONS_JSON,
	LEDGER_FILE,
	read_json_file,
	write_json_file,
	ensure_storage,
	merge_institutions,
)

logging.basicConfig(level=logging.INFO)

ensure_storage()

app = FastAPI(title="TrustEd Backend", version="0.1.0")

app.add_middleware(
	CORSMiddleware,
	# Allow any dev origin while supporting credentials
	allow_origin_regex=r".*",
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


class LoginRequest(BaseModel):
	email: str
	password: str


class LoginResponse(BaseModel):
	token: str
	role: str
	name: str


class VerificationReport(BaseModel):
	id: str
	status: str  # valid | suspicious
	confidence: float
	reasons: List[str]
	extracted: Dict[str, Any]
	institution_match: Optional[Dict[str, Any]] = None
	file_hash: str
	created_at: str  # ISO


class VerificationListResponse(BaseModel):
	items: List[VerificationReport]
	total: int


class InstitutionsListResponse(BaseModel):
	items: List[Dict[str, Any]]
	total: int


@app.get("/")
def root():
	return {"status": "ok", "service": "trusted-backend"}


@app.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
	logging.info("/login attempt for email=%s", body.email)
	demo_user = authenticate_demo_user(body.email, body.password)
	if not demo_user:
		logging.info("/login failed for email=%s", body.email)
		raise HTTPException(status_code=401, detail="Invalid credentials")
	logging.info("/login success for email=%s role=%s", body.email, demo_user["role"])
	return LoginResponse(token=demo_user["token"], role=demo_user["role"], name=demo_user["name"])


@app.get("/institutions", response_model=InstitutionsListResponse)
def get_institutions(
	institution: Optional[str] = Query(None),
	year: Optional[int] = Query(None),
):
	data = read_json_file(INSTITUTIONS_JSON)
	items = data.get("items", [])
	if institution:
		items = [i for i in items if institution.lower() in str(i.get("institution", "")).lower()]
	if year:
		items = [i for i in items if int(i.get("year", 0)) == int(year)]
	return InstitutionsListResponse(items=items, total=len(items))


@app.post("/institutions/bulk")
def bulk_upload_institutions(
	file: UploadFile = File(...),
	user=Depends(require_role("admin")),
):
	content = file.file.read()
	try:
		text = content.decode("utf-8")
	except Exception:
		raise HTTPException(status_code=400, detail="Invalid CSV encoding, expected UTF-8")

	merged, added = merge_institutions(text)
	return {"message": "Bulk upload processed", "added": added, "total": len(merged)}


@app.post("/verify", response_model=VerificationReport)
async def verify_certificate(
	file: UploadFile = File(...),
	user=Depends(get_current_user_or_401),
):
	# Read file bytes
	file_bytes = await file.read()

	# Compute raw file hash for ledger
	file_hash_hex = compute_sha256_hex(file_bytes)

	# Extract text via OCR (or simulated)
	extracted_text = extract_text_from_file(file.filename, file_bytes)

	# Very simple field extraction heuristics
	extracted_fields = extract_fields_from_text(extracted_text)

	# AI forgery detection (simulated heuristics/random)
	ai_result = detect_forgery(extracted_text, extracted_fields)

	# Cross-verify against institutional DB (mock)
	inst_db = read_json_file(INSTITUTIONS_JSON).get("items", [])
	match = find_institution_match(extracted_fields, inst_db)

	# Check if certificate exists in blockchain ledger
	blockchain_record = verify_certificate_hash(LEDGER_FILE, file_hash_hex)
	
	reasons: List[str] = []
	confidence = ai_result["confidence"]

	if match:
		reasons.append("Institutional record found")
		# Boost confidence a little if we have a match
		confidence = min(0.98, confidence + 0.1)
	else:
		reasons.append("No exact institutional record match")
	
	# Verify against blockchain
	if blockchain_record:
		reasons.append("Certificate verified in blockchain ledger")
		confidence = min(0.99, confidence + 0.2)
		
		# Compare extracted data with blockchain data
		cert_data = blockchain_record.get("certificate_data", {})
		if cert_data.get("student_name") == extracted_fields.get("name"):
			reasons.append("Student name matches blockchain record")
			confidence = min(0.99, confidence + 0.1)
		
		if cert_data.get("institution_name") == extracted_fields.get("institution"):
			reasons.append("Institution name matches blockchain record")
			confidence = min(0.99, confidence + 0.1)
		
		if cert_data.get("year") == extracted_fields.get("year"):
			reasons.append("Year matches blockchain record")
			confidence = min(0.99, confidence + 0.1)
	else:
		reasons.append("Certificate not found in blockchain ledger")
		confidence = max(0.01, confidence - 0.3)

	# Aggregate status
	status = "valid" if (ai_result["verdict"] == "pass" and match and blockchain_record) else "suspicious"
	if ai_result["verdict"] == "fail" or not blockchain_record:
		reasons.extend(ai_result["reasons"])

	# Persist verification
	verification_record = {
		"id": f"vrf_{int(time.time()*1000)}",
		"status": status,
		"confidence": round(confidence, 2),
		"reasons": reasons,
		"extracted": extracted_fields,
		"institution_match": match,
		"blockchain_verified": blockchain_record is not None,
		"file_hash": file_hash_hex,
		"created_at": datetime.utcnow().isoformat() + "Z",
	}

	# Save to verifications "table"
	save_verification(verification_record)

	# Append to blockchain-like ledger
	append_verification_to_ledger(file_hash_hex)

	return VerificationReport(**verification_record)


@app.get("/institution/certificates")
async def get_institution_certificates(
    user=Depends(require_role("institution")),
):
    """
    Get all certificates uploaded by the institution.
    Returns a list of certificates with their hashes and metadata.
    """
    # Read the ledger file to find all certificates
    certificates = []
    
    if os.path.exists(LEDGER_FILE):
        with open(LEDGER_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    block = json.loads(line)
                    # Check if this is a certificate block (has certificate_data)
                    if "certificate_data" in block:
                        cert_data = block.get("certificate_data", {})
                        # Check if uploaded by current institution
                        if cert_data.get("uploaded_by") == user["email"]:
                            certificates.append({
                                "student_name": cert_data.get("student_name", "Unknown"),
                                "student_id": cert_data.get("student_id", "Unknown"),
                                "institution_name": cert_data.get("institution_name", "Unknown"),
                                "year": cert_data.get("year", 0),
                                "certificate_id": cert_data.get("certificate_id", "Unknown"),
                                "file_name": cert_data.get("file_name", "Unknown"),
                                "upload_date": cert_data.get("upload_date", ""),
                                "file_hash": block.get("certificate_file_hash", ""),
                                "block_hash": block.get("block_hash", "")
                            })
                except Exception as e:
                    logging.error(f"Error parsing ledger entry: {e}")
    
    # Sort by upload date (newest first)
    certificates.sort(key=lambda x: x.get("upload_date", ""), reverse=True)
    
    return {"certificates": certificates}


@app.post("/institution/upload-certificate")
async def upload_certificate(
    file: UploadFile = File(...),
    student_id: str = Form(None),
    student_name: str = Form(None),
    institution_name: str = Form(None),
    year: int = Form(None),
    certificate_id: str = Form(None),
    user=Depends(require_role("institution")),
):
    """
    Upload a single certificate with automatic field extraction using Gemini API.
    If fields are not provided, the system will attempt to extract them from the certificate image.
    Implements SHA-256 hash generation and AES-256 encryption for data security.
    """
    try:
        # Read file bytes
        file_bytes = await file.read()

        # Extract data using Gemini API instead of OCR
        extracted_data = extract_certificate_data(file_bytes)
        
        # Check if extraction failed
        if "error" in extracted_data:
            return {"success": False, "message": f"Certificate extraction failed: {extracted_data['error']}"}
        
        # Generate SHA-256 hash for the certificate data
        file_hash_hex = extracted_data.get("file_hash", "")
        
        # Use provided fields or fall back to extracted fields
        final_student_name = student_name or extracted_data.get("student_name", "Unknown Name")
        final_institution_name = institution_name or extracted_data.get("institution_name", "Unknown Institution")
        final_year = year or int(datetime.now().year)
        final_certificate_id = certificate_id or extracted_data.get("certificate_id", f"AUTO-{random.randint(10000, 99999)}")
        final_issue_date = extracted_data.get("issue_date", datetime.now().strftime("%Y-%m-%d"))
        
        # Generate student ID if not provided
        final_student_id = student_id or f"STU-{random.randint(1000, 9999)}"
    
        # Create certificate data
        certificate_data = {
            "student_name": final_student_name,
            "institution_name": final_institution_name,
            "year": final_year,
            "certificate_id": final_certificate_id,
            "issue_date": final_issue_date,
            "file_name": file.filename,
            "uploaded_by": user["email"],
            "upload_date": datetime.utcnow().isoformat() + "Z",
            "extracted_from_gemini": student_name is None or institution_name is None or year is None or certificate_id is None
        }
        
        # Create blockchain block
        block = create_certificate_block(final_student_id, certificate_data, file_hash_hex)
        
        # Append to blockchain ledger
        append_ledger_block(LEDGER_FILE, block)
        
        # Add to institutions database for future verification
        add_to_institutions_db(final_student_name, final_institution_name, final_year, final_certificate_id)
        
        return {
            "success": True,
            "message": "Certificate uploaded and secured successfully",
            "student_id": final_student_id,
            "student_name": final_student_name,
            "institution_name": final_institution_name,
            "year": final_year,
            "certificate_id": final_certificate_id,
            "issue_date": final_issue_date,
            "extracted_fields": extracted_data,
            "file_hash": file_hash_hex,
            "block_hash": block["block_hash"]
        }
    except Exception as e:
        logger.error(f"Certificate upload error: {str(e)}")
        return {"success": False, "message": f"Certificate upload failed: {str(e)}"}

@app.post("/institution/upload-certificates-csv")
async def upload_certificates_csv(
    csv_file: UploadFile = File(...),
    user=Depends(require_role("institution")),
):
    """
    Upload multiple certificates via CSV file.
    CSV must include: student_id,student_name,institution_name,year,certificate_id,image_filename
    The image_filename column should reference image files that will be uploaded separately.
    """
    # Read CSV file
    csv_content = await csv_file.read()
    try:
        csv_text = csv_content.decode("utf-8")
        import pandas as pd
        from io import StringIO
        
        # Parse CSV
        df = pd.read_csv(StringIO(csv_text))
        required_columns = {"student_id", "student_name", "institution_name", "year", "certificate_id", "image_filename"}
        
        if not required_columns.issubset(set(df.columns)):
            missing = required_columns - set(df.columns)
            raise HTTPException(
                status_code=400, 
                detail=f"CSV missing required columns: {', '.join(missing)}"
            )
            
        # Return the parsed data for frontend to use in subsequent image uploads
        records = df.to_dict(orient="records")
        
        return {
            "message": "CSV processed successfully",
            "records": records,
            "total": len(records)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

@app.post("/institution/batch-upload-certificate")
async def batch_upload_certificate(
    file: UploadFile = File(...),
    student_id: str = Form(...),
    student_name: str = Form(...),
    institution_name: str = Form(...),
    year: int = Form(...),
    certificate_id: str = Form(...),
    user=Depends(require_role("institution")),
):
    """
    Upload a single certificate as part of a batch process.
    This endpoint is called for each certificate image after CSV processing.
    """
    # Read file bytes
    file_bytes = await file.read()

    # Compute file hash for blockchain
    file_hash_hex = compute_sha256_hex(file_bytes)
    
    # Extract text via OCR
    extracted_text = extract_text_from_file(file.filename, file_bytes)
    
    # Create certificate data
    certificate_data = {
        "student_name": student_name,
        "institution_name": institution_name,
        "year": year,
        "certificate_id": certificate_id,
        "file_name": file.filename,
        "uploaded_by": user["email"],
        "upload_date": datetime.utcnow().isoformat() + "Z",
        "batch_upload": True
    }
    
    # Create blockchain block
    block = create_certificate_block(student_id, certificate_data, file_hash_hex)
    
    # Append to blockchain ledger
    append_ledger_block(LEDGER_FILE, block)
    
    return {
        "message": "Certificate uploaded successfully",
        "student_id": student_id,
        "file_hash": file_hash_hex,
        "block_hash": block["block_hash"]
    }

@app.get("/verifications", response_model=VerificationListResponse)
def list_verifications(
	institution: Optional[str] = Query(None),
	year: Optional[int] = Query(None),
	status: Optional[str] = Query(None),
	user=Depends(get_current_user_or_401),
):
	data = read_json_file(VERIFICATIONS_JSON).get("items", [])
	items = data
	if institution:
		items = [i for i in items if institution.lower() in str(i.get("extracted", {}).get("institution", "")).lower()]
	if year:
		items = [i for i in items if int(i.get("extracted", {}).get("year", 0)) == int(year)]
	if status:
		items = [i for i in items if i.get("status") == status]
	return VerificationListResponse(items=items, total=len(items))


def extract_fields_from_text(text: str) -> Dict[str, Any]:
    # Heuristic extraction without explicit labels. Works on typical certificate layouts.
    lines = [l.strip() for l in text.splitlines() if l and l.strip()]
    joined = " \n ".join(lines)

    # Candidate patterns
    import re

    # 1) Find a likely year (1900-2099)
    year_int = 0
    year_match = re.search(r"\b(19\d{2}|20\d{2})\b", joined)
    if year_match:
        try:
            year_int = int(year_match.group(1))
        except Exception:
            year_int = 0

    # 2) Institution: look for lines containing university/institute/college/academy/board
    institution = ""
    inst_regex = re.compile(r"(university|institute|college|academy|school|board|institute of technology)", re.I)
    for line in lines[:12]:  # usually near top
        if 5 <= len(line) <= 120 and inst_regex.search(line):
            institution = line
            break
    if not institution:
        for line in lines[12:25]:
            if 5 <= len(line) <= 120 and inst_regex.search(line):
                institution = line
                break

    # 3) Certificate/roll number: look for alnum tokens with separators and some digits
    cert_id = ""
    id_regex = re.compile(r"\b([A-Z]{1,4}[\-\/_]?[A-Z0-9]{3,}[-\/_]?[A-Z0-9]{2,})\b", re.I)
    for line in lines[:40]:
        m = id_regex.search(line.replace(" ", ""))
        if m and any(ch.isdigit() for ch in m.group(1)):
            cert_id = m.group(1)
            break

    # 4) Name: pick the longest human-like capitalized line near top that is not institution
    def looks_like_name(s: str) -> bool:
        s_clean = re.sub(r"[^A-Za-z '\.-]", "", s).strip()
        if len(s_clean) < 3 or len(s_clean.split()) > 6:
            return False
        # At least one space, at least one vowel
        if " " not in s_clean:
            return False
        if not re.search(r"[AEIOUaeiou]", s_clean):
            return False
        # Title case-ish
        words = s_clean.split()
        caps = sum(1 for w in words if w[:1].isupper())
        return caps >= max(2, len(words) - 1)

    name = ""
    for line in lines[:15]:
        if line == institution:
            continue
        if 3 <= len(line) <= 60 and looks_like_name(line):
            name = line
            break

    return {
        "name": name or "Unknown Name",
        "institution": institution or "Unknown Institution",
        "year": year_int or 0,
        "certificate_id": cert_id or f"AUTO-{random.randint(10000, 99999)}",
        "raw_text_preview": joined[:500],
    }


def find_institution_match(extracted: Dict[str, Any], institutions: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
	# Exact-ish match on certificate_id or (name+year+institution contains)
	cert_id = extracted.get("certificate_id", "").strip().lower()
	name = extracted.get("name", "").strip().lower()
	year = int(extracted.get("year", 0))
	inst_name = extracted.get("institution", "").strip().lower()

	if cert_id:
		for rec in institutions:
			if str(rec.get("certificate_id", "")).strip().lower() == cert_id:
				return rec

	# Relaxed fuzzy contains on name and institution, exact on year if provided
	for rec in institutions:
		rname = str(rec.get("name", "")).strip().lower()
		rinstitution = str(rec.get("institution", "")).strip().lower()
		ryear = int(rec.get("year", 0))
		if year and ryear != year:
			continue
		if name and name in rname and inst_name and inst_name in rinstitution:
			return rec

	return None


def save_verification(record: Dict[str, Any]) -> None:
	blob = read_json_file(VERIFICATIONS_JSON)
	items = blob.get("items", [])
	items.insert(0, record)
	write_json_file(VERIFICATIONS_JSON, {"items": items})


def append_verification_to_ledger(file_hash_hex: str) -> None:
	last_block = read_ledger_last_block(LEDGER_FILE)
	prev_hash = last_block.get("block_hash") if last_block else "GENESIS"
	payload = {
		"timestamp": datetime.utcnow().isoformat() + "Z",
		"certificate_file_hash": file_hash_hex,
		"prev_block_hash": prev_hash,
	}
	# Block hash = sha256(prev_hash + file_hash + timestamp)
	block_hash = compute_sha256_hex(
		(prev_hash + file_hash_hex + payload["timestamp"]).encode("utf-8")
	)
	append_ledger_block(LEDGER_FILE, {**payload, "block_hash": block_hash})


def add_to_institutions_db(name, institution, year, certificate_id):
    """
    Add a certificate record to the institutions database for future verification.
    """
    institutions = read_json_file(INSTITUTIONS_JSON).get("items", [])
    
    # Check if record already exists
    for record in institutions:
        if record.get("certificate_id") == certificate_id:
            # Record already exists, no need to add
            return
    
    # Add new record
    new_record = {
        "name": name,
        "institution": institution,
        "year": year,
        "certificate_id": certificate_id
    }
    
    institutions.append(new_record)
    write_json_file(INSTITUTIONS_JSON, {"items": institutions})
    return


@app.get("/healthz")
def healthz():
	return {"status": "ok"}