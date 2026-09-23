# PackCheck AI — User Edition

A user-facing packaged commodity compliance assistant.

## Features
- Product image upload and OCR analysis
- Extracted declaration checks
- Inspection history
- PDF reports
- Analytics dashboard
- Workspace settings
- Official Department of Consumer Affairs / CCPA update feed
- Evidence-first human review workflow

## Run

### Backend
```powershell
cd backend
uv run uvicorn main:app --reload
```

If `uv` is unavailable:
```powershell
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

The backend runs at http://127.0.0.1:8000.

## OCR
The backend currently uses Tesseract OCR. Install the Tesseract Windows engine and ensure `tesseract.exe` is available on PATH.

## Important
Department updates shown in the UI are selected official notices for product context. Always verify the latest official notification/rule before treating a requirement as legally current.
