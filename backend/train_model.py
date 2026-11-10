from pathlib import Path
import json
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

BASE = Path(__file__).resolve().parent
DATA = BASE / "data" / "housing.csv"
MODEL = BASE / "model.joblib"
METRICS = BASE / "model_metrics.json"

FEATURES = ["location", "property_type", "area_sqft", "bedrooms", "bathrooms", "age_years"]
TARGET = "price_inr"
CATEGORICAL = ["location", "property_type"]
NUMERIC = ["area_sqft", "bedrooms", "bathrooms", "age_years"]

def main():
    df = pd.read_csv(DATA)
    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")
    df = df[FEATURES + [TARGET]].dropna(subset=[TARGET])
    if len(df) < 20:
        raise ValueError("Use at least 20 rows to train; more representative data is strongly recommended.")
    X, y = df[FEATURES], df[TARGET]
    preprocessor = ColumnTransformer([
        ("categorical", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore"))
        ]), CATEGORICAL),
        ("numeric", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scale", StandardScaler())
        ]), NUMERIC)
    ])
    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=250, random_state=42, min_samples_leaf=2))
    ])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    pipeline.fit(X_train, y_train)
    pred = pipeline.predict(X_test)
    metrics = {
        "rows": int(len(df)),
        "mae_inr": round(float(mean_absolute_error(y_test, pred)), 2),
        "r2": round(float(r2_score(y_test, pred)), 4),
        "dataset_note": "Synthetic demo data" if df.get("data_source", pd.Series(dtype=str)).astype(str).str.contains("synthetic", case=False).any() else "Check dataset provenance before deployment"
    }
    joblib.dump({"pipeline": pipeline, "features": FEATURES}, MODEL)
    METRICS.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Model saved to {MODEL}")
    print(json.dumps(metrics, indent=2))
    print("Reminder: metrics on synthetic/demo data do not indicate real-world accuracy.")

if __name__ == "__main__":
    main()
