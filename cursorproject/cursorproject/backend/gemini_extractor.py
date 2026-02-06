import os
import base64
import json
import hashlib
import logging
from typing import Dict, Any, Optional
import requests
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# You would need to set this environment variable with your actual API key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent"

# AES encryption key (32 bytes for AES-256)
# In production, this should be securely stored and not hardcoded
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "trustededucationcertificatesecuritykey").encode()[:32]
IV = b"trustededucation"[:16]  # 16 bytes initialization vector

def encrypt_data(data: str) -> str:
    """Encrypt data using AES-256 encryption"""
    try:
        # Convert data to bytes
        data_bytes = data.encode()
        
        # Add padding
        padder = padding.PKCS7(algorithms.AES.block_size).padder()
        padded_data = padder.update(data_bytes) + padder.finalize()
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(ENCRYPTION_KEY),
            modes.CBC(IV),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        # Encrypt data
        encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
        
        # Return base64 encoded string
        return base64.b64encode(encrypted_data).decode()
    except Exception as e:
        logger.error(f"Encryption error: {str(e)}")
        return ""

def decrypt_data(encrypted_data: str) -> str:
    """Decrypt data using AES-256 encryption"""
    try:
        # Decode base64 string
        encrypted_bytes = base64.b64decode(encrypted_data)
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(ENCRYPTION_KEY),
            modes.CBC(IV),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        # Decrypt data
        decrypted_padded = decryptor.update(encrypted_bytes) + decryptor.finalize()
        
        # Remove padding
        unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
        decrypted_data = unpadder.update(decrypted_padded) + unpadder.finalize()
        
        # Return decoded string
        return decrypted_data.decode()
    except Exception as e:
        logger.error(f"Decryption error: {str(e)}")
        return ""

def generate_hash(data: Dict[str, Any]) -> str:
    """Generate SHA-256 hash from certificate data"""
    try:
        # Convert dictionary to sorted JSON string to ensure consistent hashing
        data_str = json.dumps(data, sort_keys=True)
        # Generate hash
        hash_obj = hashlib.sha256(data_str.encode())
        return hash_obj.hexdigest()
    except Exception as e:
        logger.error(f"Hash generation error: {str(e)}")
        return ""

def extract_certificate_data(image_bytes: bytes) -> Dict[str, Any]:
    """
    Extract certificate data using Google's Gemini API
    """
    import random
    from datetime import datetime
    
    try:
        # Encode image as base64
        base64_image = base64.b64encode(image_bytes).decode()
        
        # Prepare request payload
        payload = {
            "contents": [{
                "parts": [
                    {"text": "Extract the following information from this certificate image: student_name, certificate_id, issue_date, institution_name. Return the data in JSON format with these exact field names."},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }]
        }
        
        # Make API request
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Check if request was successful
        if response.status_code != 200:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            return {"error": "Failed to extract certificate data"}
        
        # Parse response
        result = response.json()
        
        # Extract text from response
        text_content = ""
        try:
            text_content = result["candidates"][0]["content"]["parts"][0]["text"]
            # Try to extract JSON from the text response
            import re
            
            # Find JSON-like content in the response
            json_match = re.search(r'\{.*\}', text_content, re.DOTALL)
            if json_match:
                extracted_json = json_match.group(0)
                extracted_data = json.loads(extracted_json)
                
                # Ensure all required fields exist
                required_fields = ["student_name", "certificate_id", "issue_date", "institution_name"]
                for field in required_fields:
                    if field not in extracted_data:
                        extracted_data[field] = "Not found"
                
                # Encrypt sensitive data using AES-256
                encrypted_data = {
                    "student_name": encrypt_data(extracted_data["student_name"]),
                    "certificate_id": encrypt_data(extracted_data["certificate_id"]),
                    "issue_date": encrypt_data(extracted_data["issue_date"]),
                    "institution_name": encrypt_data(extracted_data["institution_name"])
                }
                
                # Add encrypted data to the result
                extracted_data["encrypted_data"] = encrypted_data
                
                # Generate hash for the certificate data
                file_hash = generate_hash(extracted_data)
                extracted_data["file_hash"] = file_hash
                
                return extracted_data
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
        
        # Fallback to default values if parsing fails
        default_data = {
            "student_name": "Unknown",
            "certificate_id": f"AUTO-{random.randint(10000, 99999)}",
            "issue_date": datetime.now().strftime("%Y-%m-%d"),
            "institution_name": "Unknown Institution"
        }
        
        # Encrypt default data
        encrypted_default = {
            "student_name": encrypt_data(default_data["student_name"]),
            "certificate_id": encrypt_data(default_data["certificate_id"]),
            "issue_date": encrypt_data(default_data["issue_date"]),
            "institution_name": encrypt_data(default_data["institution_name"])
        }
        
        default_data["encrypted_data"] = encrypted_default
        default_data["file_hash"] = generate_hash(default_data)
        
        return default_data
    except Exception as e:
        logger.error(f"Gemini API extraction error: {e}")
        return {"error": str(e)}