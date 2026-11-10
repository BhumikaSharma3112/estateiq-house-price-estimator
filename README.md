# EstateIQ — Real Estate House Price Estimator

A React + FastAPI starter project with a scikit-learn regression pipeline.

> **Important:** `backend/data/housing.csv` contains synthetic demo data generated for development. Predictions are illustrative, not real property valuations. Replace it with a properly licensed, representative dataset before relying on estimates.

## Requirements
- Node.js 18+
- Python 3.10+

## 1. Start the backend
Windows PowerShell:
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python train_model.py
uvicorn main:app --reload
```
If PowerShell blocks activation, use `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`, then run `.\.venv\Scripts\python.exe train_model.py` and `.\.venv\Scripts\python.exe -m uvicorn main:app --reload`.

Backend runs at http://127.0.0.1:8000. API docs: http://127.0.0.1:8000/docs

## 2. Start the frontend (new terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## 3. Use your own dataset
Replace `backend/data/housing.csv` with your dataset. Keep these columns, or update `train_model.py` and `main.py` together:
- `location` (categorical, e.g. Jaipur)
- `property_type` (categorical, e.g. Apartment)
- `area_sqft` (numeric)
- `bedrooms` (integer)
- `bathrooms` (integer)
- `age_years` (numeric)
- `price_inr` (target, numeric INR)

Then rerun `python train_model.py` to create `model.joblib`. Check data quality, currency units, location coverage, and evaluation metrics before using predictions in a real setting.

## API
- `GET /api/health`
- `GET /api/summary`
- `GET /api/market-insights`
- `POST /api/predict`

## Troubleshooting
- CORS: keep frontend on Vite's default localhost:5173, or add its origin to `allow_origins` in `main.py`.
- Model missing: run `python train_model.py` from `backend`.
- Port in use: use `uvicorn main:app --port 8001` and update frontend `VITE_API_URL`.
