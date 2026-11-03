"""Tests for the ML service. Run from the ml folder:  python -m unittest"""
import random
import unittest

from model import RiskModel, segment_learners

BASE = dict(priority_level=1, difficulty=3, est_remaining_minutes=60, subject_minutes_7d=60,
            user_ontime_rate=0.7, pending_count=5, task_age_days=0)


class ModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = RiskModel()
        cls.meta = cls.model.train()

    def test_model_is_accurate_enough(self):
        self.assertGreater(self.meta["metrics"]["roc_auc"], 0.7)
        self.assertEqual(set(self.meta["comparison"]), {"logistic_regression", "random_forest", "gradient_boosting"})

    def test_urgent_task_is_riskier(self):
        r = self.model.score([{**BASE, "id": "soon", "days_left": 1, "est_remaining_minutes": 240},
                              {**BASE, "id": "later", "days_left": 14}])
        risk = {x["id"]: x["risk"] for x in r}
        self.assertGreater(risk["soon"], risk["later"])
        self.assertIn("days_left", r[0]["contributions"])

    def test_segments(self):
        random.seed(1)
        users = [dict(id=str(i), weekly_minutes=random.uniform(0, 600), sessions_per_week=random.uniform(0, 12),
                      avg_session_minutes=random.uniform(15, 60), ontime_rate=random.uniform(0.2, 1)) for i in range(30)]
        s = segment_learners(users)
        self.assertEqual(s["k"], 3)
        self.assertEqual(sum(c["size"] for c in s["clusters"]), 30)


if __name__ == "__main__":
    unittest.main()
