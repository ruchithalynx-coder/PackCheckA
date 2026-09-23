import os, re, uuid, tempfile
from datetime import datetime
from typing import Any
import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

app = FastAPI(title="PackCheck AI", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def preprocess(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (3,3), 0)
    return cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

def ocr_image(img):
    processed = preprocess(img)
    data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
    items = []
    for i, txt in enumerate(data["text"]):
        txt = (txt or "").strip()
        try:
            conf = float(data["conf"][i])
        except:
            conf = 0
        if txt and conf >= 20:
            # coordinates refer to the preprocessed image; scale back approximately
            items.append({
                "text": txt,
                "confidence": round(conf / 100, 2),
                "bbox": [
                    int(data["left"][i] / 1.5),
                    int(data["top"][i] / 1.5),
                    int(data["width"][i] / 1.5),
                    int(data["height"][i] / 1.5)
                ]
            })
    return items

def extract_fields(items):
    text = " ".join(x["text"] for x in items)
    lines = [x["text"] for x in items]

    def first(pattern):
        m = re.search(pattern, text, re.I)
        return m.group(1).strip() if m else None

    mrp = first(r"(?:MRP|M\.R\.P)[^\d₹Rs]{0,12}(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)")
    quantity = first(r"(\d+(?:\.\d+)?)\s*(kg|g|mg|l|ml)\b")
    date = first(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-]\d{2,4})\b")
    phone = first(r"\b((?:\+91[-\s]?)?[6-9]\d{9})\b")

    manufacturer = None
    for key in ["manufactured by", "manufactured & packed by", "packed by", "manufacturer"]:
        m = re.search(re.escape(key) + r"\s*:?\s*(.{3,100})", text, re.I)
        if m:
            manufacturer = m.group(1).strip()
            break

    product_name = lines[0] if lines else None
    return {
        "product_name": product_name,
        "mrp": f"₹{mrp}" if mrp else None,
        "net_quantity": f"{quantity[0]} {quantity[1]}" if isinstance(quantity, tuple) else quantity,
        "manufacturing_date": date,
        "manufacturer": manufacturer,
        "consumer_care": phone,
    }

def assess(fields):
    checks = []
    labels = [
        ("Product Name", "product_name"),
        ("Net Quantity", "net_quantity"),
        ("MRP", "mrp"),
        ("Manufacturer / Packer", "manufacturer"),
        ("Date Information", "manufacturing_date"),
        ("Consumer Care", "consumer_care"),
    ]
    for label, key in labels:
        value = fields.get(key)
        checks.append({
            "label": label,
            "field": key,
            "value": value,
            "status": "detected" if value else "review",
            "message": "Detected by OCR" if value else "Not confidently detected — human review required"
        })
    missing = [x for x in checks if x["status"] == "review"]
    overall = "REVIEW REQUIRED" if missing else "NO ISSUE DETECTED"
    return {"overall": overall, "checks": checks}

@app.get("/api/health")
def health():
    return {"ok": True, "service": "PackCheck AI"}

@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image.")
    raw = await file.read()
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Could not read image.")

    try:
        items = ocr_image(img)
    except Exception as e:
        raise HTTPException(500, f"OCR failed. Is Tesseract installed? {e}")

    fields = extract_fields(items)
    assessment = assess(fields)
    return {
        "inspection_id": "INS-" + uuid.uuid4().hex[:8].upper(),
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "ocr": items,
        "fields": fields,
        "assessment": assessment
    }

@app.post("/api/report")
async def report(payload: dict[str, Any]):
    path = os.path.join(tempfile.gettempdir(), f"{payload.get('inspection_id','inspection')}.pdf")
    c = canvas.Canvas(path, pagesize=A4)
    y = 800
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, y, "PACKCHECK AI")
    y -= 30
    c.setFont("Helvetica", 10)
    c.drawString(50, y, "AI-assisted packaged commodity inspection report")
    y -= 30
    c.drawString(50, y, f"Inspection ID: {payload.get('inspection_id','')}")
    y -= 20
    c.drawString(50, y, f"Date: {payload.get('timestamp','')}")
    y -= 35
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "Extracted declarations")
    y -= 25
    c.setFont("Helvetica", 11)
    for k, v in payload.get("fields", {}).items():
        c.drawString(60, y, f"{k.replace('_',' ').title()}: {v or 'Not detected'}")
        y -= 18
    y -= 15
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "Assessment")
    y -= 22
    c.setFont("Helvetica", 11)
    c.drawString(60, y, payload.get("assessment", {}).get("overall", ""))
    y -= 35
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(50, y, "AI-assisted assessment. Final legal determination requires authorized human review.")
    c.save()
    return FileResponse(path, media_type="application/pdf", filename="PackCheck_Report.pdf")
