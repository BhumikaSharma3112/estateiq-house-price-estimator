from pathlib import Path
import json
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import requests
from dotenv import load_dotenv
load_dotenv()

BASE = Path(__file__).resolve().parent
MODEL_PATH = BASE / "model.joblib"
DATA_PATH = BASE / "data" / "housing.csv"
METRICS_PATH = BASE / "model_metrics.json"

app = FastAPI(title="EstateIQ House Price API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionInput(BaseModel):
    location: str = Field(min_length=1, max_length=100)
    property_type: str = Field(min_length=1, max_length=50)
    area_sqft: float = Field(gt=100, le=100000)
    bedrooms: int = Field(ge=1, le=20)
    bathrooms: int = Field(ge=1, le=20)
    age_years: float = Field(ge=0, le=200)

def load_model():
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="Model is not trained yet. Run: python train_model.py")
    return joblib.load(MODEL_PATH)

@app.get("/api/health")
def health():
    return {"status": "ok", "model_ready": MODEL_PATH.exists()}

@app.get("/api/summary")
def summary():
    if not DATA_PATH.exists():
        return {"average_price": 0, "total_listings": 0, "highest_price": 0, "lowest_price": 0, "demo_data": True}
    df = pd.read_csv(DATA_PATH)
    prices = df["price_inr"]
    return {
        "average_price": round(float(prices.mean())),
        "total_listings": int(len(df)),
        "highest_price": round(float(prices.max())),
        "lowest_price": round(float(prices.min())),
        "demo_data": True
    }

@app.get("/api/market-insights")
def market_insights():
    df = pd.read_csv(DATA_PATH)
    trend = (df.groupby("location", as_index=False)
             .agg(avg_price=("price_inr", "mean"), avg_price_per_sqft=("price_inr", lambda s: 0))
             .sort_values("avg_price", ascending=False))
    loc_stats = df.assign(price_per_sqft=df["price_inr"] / df["area_sqft"]).groupby("location").agg(
        avg_price=("price_inr", "mean"), avg_price_per_sqft=("price_per_sqft", "mean"), listings=("price_inr", "size")
    ).reset_index().sort_values("avg_price_per_sqft", ascending=False)
    bins = [0, 5_000_000, 10_000_000, 15_000_000, 20_000_000, float("inf")]
    labels = ["< ₹50L", "₹50L–1Cr", "₹1–1.5Cr", "₹1.5–2Cr", "> ₹2Cr"]
    distribution = pd.cut(df["price_inr"], bins=bins, labels=labels, right=False).value_counts().reindex(labels, fill_value=0)
    return {
        "locations": [{"location": r.location, "average_price": round(float(r.avg_price)), "price_per_sqft": round(float(r.avg_price_per_sqft)), "listings": int(r.listings)} for r in loc_stats.itertuples()],
        "distribution": [{"range": str(k), "count": int(v)} for k, v in distribution.items()],
        "note": "Illustrative results from bundled synthetic demo data."
    }

@app.post("/api/predict")
def predict(payload: PredictionInput):
    model = load_model()
    data = pd.DataFrame([payload.model_dump()])
    price = float(model["pipeline"].predict(data[model["features"]])[0])
    return {
        "estimated_price_inr": max(0, round(price)),
        "price_per_sqft": max(0, round(price / payload.area_sqft)),
        "currency": "INR",
        "note": "Demo estimate based on synthetic training data. Not a real valuation."
    }

@app.get("/api/model-metrics")
def model_metrics():
    if not METRICS_PATH.exists():
        return {"trained": False}
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))

@app.get("/api/live-listings")
def live_listings(city: str = "Delhi"):
    api_key = os.getenv("SCRAPPA_API_KEY")

    if not api_key:
        return {"error": "API key missing"}

    response = requests.get(
        "https://scrappa.co/api/99acres/v1/city-listings",
        headers={"x-api-key": api_key},
        params={"city": city},
        timeout=30
    )

    return response.json()