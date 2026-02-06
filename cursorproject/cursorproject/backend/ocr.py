import io
import os
import logging
import re
import numpy as np
from typing import Optional, Dict, Any

try:
    import pytesseract  # type: ignore
    from PIL import Image, ImageEnhance, ImageFilter  # type: ignore
    import cv2  # type: ignore

    # Allow configuring Tesseract install path via env var; fall back to common default on Windows
    configured_path = os.environ.get("TESSERACT_PATH")
    default_win_path = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
    if configured_path and os.path.exists(configured_path):
        pytesseract.pytesseract.tesseract_cmd = configured_path  # type: ignore[attr-defined]
    elif os.name == "nt" and os.path.exists(default_win_path):
        pytesseract.pytesseract.tesseract_cmd = default_win_path  # type: ignore[attr-defined]

    TESS_AVAILABLE = True
except Exception as e:
    logging.error(f"Error initializing OCR dependencies: {str(e)}")
    TESS_AVAILABLE = False


def preprocess_image(image):
    """
    Apply image preprocessing techniques to improve OCR accuracy
    """
    # Convert PIL Image to OpenCV format
    img = np.array(image)
    
    # Convert to grayscale if it's not already
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    else:
        gray = img
        
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    # Noise removal
    kernel = np.ones((1, 1), np.uint8)
    opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    # Convert back to PIL Image
    return Image.fromarray(opening)


def extract_structured_data(text: str) -> Dict[str, Any]:
    """
    Extract structured data from OCR text using regex patterns
    """
    data = {
        "name": "Unknown Name",
        "institution": "Unknown Institution",
        "year": 0,
        "certificate_id": ""
    }
    
    # Extract name (looking for common patterns in certificates)
    name_patterns = [
        r"(?:name|awarded to|presented to|certify that)\s*[:\-]?\s*([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})",
        r"(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})"
    ]
    
    for pattern in name_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["name"] = match.group(1).strip()
            break
    
    # Extract institution
    institution_patterns = [
        r"(?:from|by|at|of)\s+(?:the)?\s*([A-Z][a-z]+(?: [A-Z][a-z]+){1,5}(?:\s+(?:University|College|Institute|School)))",
        r"([A-Z][a-z]+(?: [A-Z][a-z]+){0,3}(?:\s+(?:University|College|Institute|School)))"
    ]
    
    for pattern in institution_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["institution"] = match.group(1).strip()
            break
    
    # Extract year
    year_match = re.search(r"(?:year|in|dated?|20[0-2]\d)", text, re.IGNORECASE)
    if year_match:
        year_str = year_match.group(0)
        year_digits = re.search(r"20[0-2]\d", year_str)
        if year_digits:
            try:
                data["year"] = int(year_digits.group(0))
            except ValueError:
                pass
    
    # Extract certificate ID
    id_match = re.search(r"(?:certificate|cert|id|no|number)[.\s:\-]?\s*([A-Za-z0-9-]+)", text, re.IGNORECASE)
    if id_match:
        data["certificate_id"] = id_match.group(1).strip()
    
    return data


def extract_text_from_file(filename: str, file_bytes: bytes) -> str:
    """
    Try OCR for images if Tesseract is available; otherwise, return a simulated text.
    For PDFs or if OCR is not available, return a simple mock text embedding the filename.
    """
    lower = filename.lower()
    if TESS_AVAILABLE and (lower.endswith(".png") or lower.endswith(".jpg") or lower.endswith(".jpeg")):
        try:
            # Open image
            image = Image.open(io.BytesIO(file_bytes))
            
            # Try multiple preprocessing and OCR configurations for best results
            results = []
            
            # 1. Original image with optimized settings
            text1 = pytesseract.image_to_string(
                image, 
                config="--oem 3 --psm 3 -l eng --dpi 300"
            )
            results.append(text1)
            
            # 2. Enhanced contrast
            enhancer = ImageEnhance.Contrast(image)
            enhanced_img = enhancer.enhance(2.0)
            text2 = pytesseract.image_to_string(
                enhanced_img, 
                config="--oem 3 --psm 4 -l eng --dpi 300"
            )
            results.append(text2)
            
            # 3. Advanced preprocessing
            try:
                preprocessed = preprocess_image(image)
                text3 = pytesseract.image_to_string(
                    preprocessed,
                    config="--oem 3 --psm 6 -l eng --dpi 300"
                )
                results.append(text3)
            except Exception as e:
                logging.warning(f"Advanced preprocessing failed: {str(e)}")
            
            # Combine results, prioritizing longer texts
            results.sort(key=len, reverse=True)
            combined_text = "\n".join(filter(lambda x: x.strip(), results))
            
            if combined_text and combined_text.strip():
                # Extract structured data and append to text
                structured_data = extract_structured_data(combined_text)
                
                # Format the extracted data for better parsing
                formatted_data = "\n".join([
                    f"EXTRACTED_NAME: {structured_data['name']}",
                    f"EXTRACTED_INSTITUTION: {structured_data['institution']}",
                    f"EXTRACTED_YEAR: {structured_data['year']}",
                    f"EXTRACTED_CERTIFICATE_ID: {structured_data['certificate_id']}",
                    "\nRAW_OCR_TEXT:",
                    combined_text
                ])
                
                return formatted_data
        except Exception as e:
            logging.error(f"OCR processing error for '{filename}': {str(e)}")

    # Fallback when OCR is not available or file type unsupported
    # Important: Do NOT include tokens like Name/Institution/Year to avoid false matches
    logging.warning("OCR unavailable or unsupported file type for '%s'. Returning minimal placeholder text.", filename)
    return f"NO_OCR_AVAILABLE\nFILEPATH={filename}"

