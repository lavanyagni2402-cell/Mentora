"""Mentora ML service (FastAPI). Called only by the Node.js API, never by browsers."""
import os
from typing import Optional

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from model import RiskModel, segment_learners

model = RiskModel()


@asynccontextmanager
async def lifespan(_app):
    model.load_or_train()   # trains on the synthetic bootstrap set on first start
    yield


app = FastAPI(title="Mentora ML service", version="1.0", lifespan=lifespan)


class TaskFeatures(BaseModel):
    id: Optional[str] = None
    subject_id: Optional[str] = None
    days_left: float
    priority_level: int = Field(ge=0, le=2)
    difficulty: int = Field(ge=1, le=5)
    est_remaining_minutes: float = Field(ge=0)
    subject_minutes_7d: float = Field(ge=0)
    user_ontime_rate: float = Field(ge=0, le=1)
    pending_count: int = Field(ge=0)
    task_age_days: float = 0


class ScoreIn(BaseModel):
    tasks: list[TaskFeatures]


class TrainRow(BaseModel):
    days_left: float
    priority_level: int
    difficulty: int
    est_remaining_minutes: float
    subject_minutes_7d: float
    user_ontime_rate: float
    pending_count: int
    task_age_days: float = 0
    missed: int = Field(ge=0, le=1)


class TrainIn(BaseModel):
    rows: list[TrainRow] = []


class LearnerIn(BaseModel):
    id: str
    weekly_minutes: float
    sessions_per_week: float
    avg_session_minutes: float
    ontime_rate: float


class SegmentsIn(BaseModel):
    users: list[LearnerIn]


@app.get("/health")
def health():
    return {"status": "ok", "model_version": model.meta.get("version")}


@app.get("/model")
def model_info():
    return model.meta


@app.post("/score")
def score(body: ScoreIn):
    if not body.tasks:
        return {"results": [], "model_version": model.meta.get("version")}
    return {"results": model.score([t.model_dump() for t in body.tasks]), "model_version": model.meta["version"]}


@app.post("/train")
def train(body: TrainIn):
    meta = model.train([r.model_dump() for r in body.rows])
    return {"version": meta["version"], "n_samples": meta["n_samples"], "n_real": meta["n_real"], "metrics": meta["metrics"], "comparison": meta["comparison"]}


@app.post("/segments")
def segments(body: SegmentsIn):
    try:
        return segment_learners([u.model_dump() for u in body.users])
    except Exception as e:  # pragma: no cover
        raise HTTPException(400, str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
