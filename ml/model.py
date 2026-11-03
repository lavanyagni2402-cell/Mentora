"""Deadline-risk model, explainable scoring and learner segmentation."""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pickle
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.metrics import silhouette_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from synthetic import FEATURES, generate

MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "risk_model.pkl"
META_PATH = MODEL_DIR / "risk_model.json"

# Engineered inputs to the model, and which raw feature each one "explains"
ENGINEERED = {
    "days_left": "days_left",
    "hours_per_day_needed": "est_remaining_minutes",
    "log_est_minutes": "est_remaining_minutes",
    "priority_level": "priority_level",
    "difficulty": "difficulty",
    "log_subject_minutes": "subject_minutes_7d",
    "user_ontime_rate": "user_ontime_rate",
    "pending_count": "pending_count",
}
PRIORITY_NORM = np.array([0.3, 0.6, 1.0])


def engineer(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    days = d["days_left"].clip(lower=-3, upper=30)
    out = pd.DataFrame({
        "days_left": days,
        "hours_per_day_needed": d["est_remaining_minutes"] / 60 / (days.clip(lower=0) + 1),
        "log_est_minutes": np.log1p(d["est_remaining_minutes"]),
        "priority_level": d["priority_level"],
        "difficulty": d["difficulty"],
        "log_subject_minutes": np.log1p(d["subject_minutes_7d"]),
        "user_ontime_rate": d["user_ontime_rate"],
        "pending_count": d["pending_count"].clip(upper=30),
    })
    return out[list(ENGINEERED)]


def _metrics(y, proba):
    pred = (proba >= 0.5).astype(int)
    return {
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y, proba)), 4),
    }


class RiskModel:
    def __init__(self):
        self.pipe: Pipeline | None = None
        self.meta: dict = {}

    # ---------- training ----------
    def train(self, real_rows: list[dict] | None = None, real_weight: float = 3.0) -> dict:
        synth = generate()
        synth["w"] = 1.0
        n_real = 0
        if real_rows:
            real = pd.DataFrame(real_rows)
            real = real[[c for c in FEATURES if c in real.columns] + ["missed"]].dropna()
            for c in FEATURES:
                if c not in real.columns:
                    real[c] = 0
            real["w"] = real_weight
            n_real = len(real)
            data = pd.concat([synth, real[FEATURES + ["missed", "w"]]], ignore_index=True)
        else:
            data = synth
        X, y, w = engineer(data), data["missed"].astype(int).values, data["w"].values

        candidates = {
            "logistic_regression": Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression(max_iter=1000))]),
            "random_forest": RandomForestClassifier(n_estimators=200, max_depth=8, min_samples_leaf=10, random_state=0, n_jobs=-1),
            "gradient_boosting": GradientBoostingClassifier(random_state=0),
        }
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
        comparison = {}
        for name, est in candidates.items():
            proba = cross_val_predict(est, X, y, cv=cv, method="predict_proba")[:, 1]
            comparison[name] = _metrics(y, proba)

        # Production model: logistic regression, because every prediction can be explained
        # as a sum of feature contributions (the basis for the "why this task" reasons).
        pipe = candidates["logistic_regression"]
        pipe.fit(X, y, clf__sample_weight=w)
        self.pipe = pipe
        coefs = dict(zip(ENGINEERED, pipe.named_steps["clf"].coef_[0].round(4).tolist()))
        version = "lr-" + dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        self.meta = {
            "version": version,
            "trained_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "algorithm": "Logistic Regression (StandardScaler + L2)",
            "n_samples": int(len(data)),
            "n_real": int(n_real),
            "positive_rate": round(float(y.mean()), 4),
            "metrics": comparison["logistic_regression"],
            "comparison": comparison,
            "coefficients": coefs,
            "features": FEATURES,
        }
        MODEL_DIR.mkdir(exist_ok=True)
        MODEL_PATH.write_bytes(pickle.dumps(pipe))
        META_PATH.write_text(json.dumps(self.meta, indent=2))
        return self.meta

    def load_or_train(self):
        if MODEL_PATH.exists() and META_PATH.exists():
            self.pipe = pickle.loads(MODEL_PATH.read_bytes())
            self.meta = json.loads(META_PATH.read_text())
        else:
            self.train()

    # ---------- inference ----------
    def score(self, tasks: list[dict]) -> list[dict]:
        df = pd.DataFrame(tasks)
        X = engineer(df)
        risk = self.pipe.predict_proba(X)[:, 1]
        scaler, clf = self.pipe.named_steps["scale"], self.pipe.named_steps["clf"]
        contrib = scaler.transform(X) * clf.coef_[0]          # per-feature log-odds contribution
        days = df["days_left"].values
        urgency = np.where(days < 0, 1.0, np.clip(1 - days / 14, 0, 1))
        prio = PRIORITY_NORM[df["priority_level"].astype(int).values]
        score = 0.55 * risk + 0.25 * prio + 0.20 * urgency
        out = []
        for i, t in enumerate(tasks):
            agg: dict[str, float] = {}
            for j, name in enumerate(ENGINEERED):
                base = ENGINEERED[name]
                agg[base] = agg.get(base, 0.0) + float(contrib[i, j])
            out.append({
                "id": t.get("id"),
                "risk": round(float(risk[i]), 4),
                "score": round(float(score[i]), 4),
                "contributions": {k: round(v, 3) for k, v in agg.items()},
            })
        return out


SEGMENT_FEATURES = ["weekly_minutes", "sessions_per_week", "avg_session_minutes", "ontime_rate"]


def segment_learners(users: list[dict], k: int = 3) -> dict:
    """K-Means clustering of students by study behaviour, for admin analytics."""
    if len(users) < k:
        return {"k": 0, "clusters": [], "assignments": {}, "message": f"Need at least {k} active students to form segments."}
    df = pd.DataFrame(users)
    X = StandardScaler().fit_transform(df[SEGMENT_FEATURES].astype(float))
    km = KMeans(n_clusters=k, n_init=10, random_state=0).fit(X)
    df["cluster"] = km.labels_
    sil = float(silhouette_score(X, km.labels_)) if len(df) > k else None
    cent = df.groupby("cluster")[SEGMENT_FEATURES].mean()
    # name clusters by engagement = standardised study time + on-time rate
    eng = (cent["weekly_minutes"] - cent["weekly_minutes"].mean()) / (cent["weekly_minutes"].std() + 1e-9) \
        + (cent["ontime_rate"] - cent["ontime_rate"].mean()) / (cent["ontime_rate"].std() + 1e-9)
    order = eng.sort_values(ascending=False).index.tolist()
    names = {order[0]: "Consistent planners", order[-1]: "Needs support"}
    for c in order[1:-1]:
        names[c] = "Irregular studiers"
    advice = {
        "Consistent planners": "Keep them engaged with streaks and harder goals.",
        "Irregular studiers": "Nudge with reminders and shorter 25-minute sessions.",
        "Needs support": "Prioritise early deadline alerts and mentor check-ins.",
    }
    clusters = []
    for c in order:
        row = cent.loc[c]
        clusters.append({
            "id": int(c), "name": names[c], "advice": advice[names[c]], "size": int((df.cluster == c).sum()),
            "centroid": {f: round(float(row[f]), 2) for f in SEGMENT_FEATURES},
        })
    return {"k": k, "silhouette": round(sil, 3) if sil is not None else None, "clusters": clusters,
            "assignments": {str(r.id): names[r.cluster] for r in df.itertuples()}}
