import random
from typing import Dict, Any, List


def detect_forgery(text: str, extracted_fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulate an AI-based forgery detection:
    - Penalize if 'Unknown' fields appear
    - Random small chance to fail
    - Confidence based on heuristics and randomness
    """
    reasons: List[str] = []
    base = 0.6

    if "Unknown" in extracted_fields.get("name", ""):
        reasons.append("Name could not be reliably extracted")
        base -= 0.1
    if "Unknown" in extracted_fields.get("institution", ""):
        reasons.append("Institution not clearly identified")
        base -= 0.1
    if not extracted_fields.get("year"):
        reasons.append("Graduation year missing")
        base -= 0.1

    # Randomization to simulate model variance
    noise = random.uniform(-0.1, 0.2)
    confidence = max(0.1, min(0.95, base + noise))

    # Verdict logic: if low confidence or multiple issues, fail; else pass
    verdict = "pass" if confidence >= 0.55 and len(reasons) <= 2 else "fail"
    return {"verdict": verdict, "confidence": confidence, "reasons": reasons}