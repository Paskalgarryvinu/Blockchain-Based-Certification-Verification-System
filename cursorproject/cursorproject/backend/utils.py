import os
import json
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional, List
from storage import LEDGER_FILE


def compute_sha256_hex(data: bytes) -> str:
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()


def append_ledger_block(path: str, block: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(block, ensure_ascii=False) + "\n")


def read_ledger_last_block(path: str) -> Optional[Dict[str, Any]]:
    if not os.path.exists(path):
        return None
    last = None
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            last = json.loads(line)
    return last


def verify_certificate_hash(ledger_path: str, file_hash: str) -> Optional[Dict[str, Any]]:
    """
    Verify if a certificate hash exists in the blockchain ledger.
    
    Args:
        ledger_path: Path to the ledger file
        file_hash: SHA-256 hash of the certificate file to verify
        
    Returns:
        The block containing the certificate data if found, None otherwise
    """
    if not os.path.exists(ledger_path):
        return None
        
    with open(ledger_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
                
            block = json.loads(line)
            if block.get("certificate_file_hash") == file_hash:
                return block
                
    return None


def get_student_certificates(ledger_path: str, student_id: str) -> List[Dict[str, Any]]:
    """
    Get all certificates for a specific student from the blockchain ledger.
    
    Args:
        ledger_path: Path to the ledger file
        student_id: ID of the student
        
    Returns:
        List of certificate blocks for the student
    """
    certificates = []
    
    if not os.path.exists(ledger_path):
        return certificates
        
    with open(ledger_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
                
            block = json.loads(line)
            cert_data = block.get("certificate_data", {})
            
            if cert_data.get("student_id") == student_id:
                certificates.append(block)
                
    return certificates


def create_certificate_block(student_id: str, certificate_data: Dict[str, Any], file_hash: str) -> Dict[str, Any]:
    """
    Create a new certificate block for the blockchain ledger.
    
    Args:
        student_id: ID of the student
        certificate_data: Certificate metadata
        file_hash: SHA-256 hash of the certificate file
        
    Returns:
        The created block
    """
    last_block = read_ledger_last_block(LEDGER_FILE)
    prev_hash = last_block.get("block_hash") if last_block else "GENESIS"
    
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Create the block
    block = {
        "timestamp": timestamp,
        "student_id": student_id,
        "certificate_data": certificate_data,
        "certificate_file_hash": file_hash,
        "prev_block_hash": prev_hash,
    }
    
    # Calculate block hash
    block_hash = compute_sha256_hex(
        (prev_hash + file_hash + timestamp).encode("utf-8")
    )
    
    block["block_hash"] = block_hash
    
    return block
