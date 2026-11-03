"""Synthetic bootstrap dataset for the deadline-risk model.

A brand-new deployment has no history, so the model starts from simulated
student behaviour. Each simulated student has a 'discipline' trait; tasks are
generated with realistic deadlines, workloads and study patterns, and the
outcome (deadline missed or not) is drawn from a noisy ground-truth process.
As real students use Mentora, the admin retrains on real outcomes from the
central database, which are weighted more heavily than synthetic rows.
"""
import numpy as np
import pandas as pd

FEATURES = [
    "days_left", "priority_level", "difficulty", "est_remaining_minutes",
    "subject_minutes_7d", "user_ontime_rate", "pending_count", "task_age_days",
]


def generate(n_students: int = 400, tasks_per_student: int = 15, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    for _ in range(n_students):
        discipline = rng.beta(4, 2.2)                     # 0..1, most students fairly disciplined
        ontime = np.clip(discipline + rng.normal(0, 0.08), 0.05, 0.98)
        weekly_study = rng.gamma(2.0 + 4 * discipline, 40)  # minutes per subject per week
        for _ in range(tasks_per_student):
            days_left = int(np.clip(rng.gamma(2.2, 2.6), 0, 21))
            priority = rng.choice([0, 1, 2], p=[0.25, 0.45, 0.30])
            difficulty = int(rng.integers(1, 6))
            est = float(np.clip(rng.lognormal(4.1, 0.6), 15, 600))
            subj_min = float(max(0, rng.normal(weekly_study, weekly_study * 0.6)))
            pending = int(rng.integers(1, 14))
            hours_per_day = est / 60 / (days_left + 1)
            z = (
                -1.0
                + 1.25 * hours_per_day
                - 0.16 * days_left
                + 0.28 * (difficulty - 3)
                - 0.35 * (priority - 1)
                - 0.009 * subj_min
                - 4.2 * (ontime - 0.7)
                + 0.11 * pending
                + rng.normal(0, 0.55)
            )
            p = 1 / (1 + np.exp(-z))
            rows.append({
                "days_left": days_left, "priority_level": int(priority), "difficulty": difficulty,
                "est_remaining_minutes": round(est), "subject_minutes_7d": round(subj_min),
                "user_ontime_rate": round(float(ontime), 3), "pending_count": pending, "task_age_days": 0,
                "missed": int(rng.random() < p),
            })
    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = generate()
    print(df.describe().T[["mean", "min", "max"]])
    print("missed rate:", df.missed.mean().round(3))
