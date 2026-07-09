#!/usr/bin/env python3
"""
model-training/train_model.py
─────────────────────────────
Trains a logistic regression classifier on a synthetic fraud dataset and
exports the fitted weights + metadata to /lib/model_weights.json.

This script is NOT deployed. It runs offline and its output (the JSON weights)
is committed into the repo. The JS inference engine loads that JSON directly
— so the Vercel deployment has zero Python runtime dependency.

Run:
    pip install scikit-learn numpy
    python model-training/train_model.py
"""

import json
import math
import random
import os

# Reuse logic from ml_engine.py for consistent feature thresholds
FLAGGED_LOCATIONS = {"Lagos", "Pyongyang", "Unknown", "TOR_EXIT_NODE"}
VELOCITY_FRAUD_THRESHOLD = 5
HIGH_AMOUNT_MULTIPLIER = 5.0

random.seed(42)


def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))


def generate_dataset(n_samples=400):
    """
    Synthetic dataset mirroring the feature space used in fraudEngine.js.
    Features: [amount_zscore, hour_risk, is_new_device, is_new_location, velocity_10min, amount_balance_ratio]
    """
    X, y = [], []
    avg_spend = 1500
    std_spend = 600

    for i in range(n_samples):
        is_fraud = random.random() < 0.15
        
        if is_fraud:
            fraud_type = random.choice(["high_amount", "flagged_location", "velocity", "new_device_new_loc"])
            if fraud_type == "high_amount":
                amount = random.uniform(avg_spend * 6, avg_spend * 14)
                hour_risk = random.random() * 0.5
                is_new_device = random.random() > 0.6
                is_new_location = random.random() > 0.5
                velocity = random.randint(1, 3)
                balance_ratio = amount / random.uniform(5000, 20000)
            elif fraud_type == "flagged_location":
                amount = random.uniform(avg_spend * 1.2, avg_spend * 4)
                hour_risk = random.random()
                is_new_device = True
                is_new_location = True
                velocity = random.randint(1, 3)
                balance_ratio = amount / random.uniform(3000, 15000)
            elif fraud_type == "velocity":
                amount = random.uniform(10, 500)
                hour_risk = random.random()
                is_new_device = False
                is_new_location = False
                velocity = random.randint(5, 10)
                balance_ratio = amount / random.uniform(5000, 30000)
            else:  # new_device_new_loc
                amount = random.uniform(avg_spend * 2, avg_spend * 6)
                hour_risk = random.random() * 0.7
                is_new_device = True
                is_new_location = True
                velocity = random.randint(1, 2)
                balance_ratio = amount / random.uniform(5000, 25000)
            label = 1
        else:
            amount = max(5, random.gauss(avg_spend, std_spend))
            hour_risk = random.random() * 0.2
            is_new_device = random.random() < 0.05
            is_new_location = random.random() < 0.1
            velocity = random.randint(0, 2)
            balance_ratio = amount / random.uniform(10000, 100000)
            label = 0

        amount_zscore = (amount - avg_spend) / std_spend
        X.append([amount_zscore, hour_risk, int(is_new_device), int(is_new_location), min(velocity, 10) / 10, min(balance_ratio, 2)])
        y.append(label)

    return X, y


def logistic_regression_train(X, y, lr=0.1, epochs=1000, class_weight=True):
    """
    Pure-Python logistic regression (for transparency / no-dependency fallback).
    For production training, use scikit-learn as shown below.
    """
    n_features = len(X[0])
    weights = [0.0] * n_features
    intercept = 0.0
    
    # Class weights for imbalanced data (fraud is 15% of samples)
    pos = sum(y)
    neg = len(y) - pos
    w_pos = len(y) / (2 * pos) if pos > 0 else 1
    w_neg = len(y) / (2 * neg) if neg > 0 else 1

    for epoch in range(epochs):
        for i, (xi, yi) in enumerate(zip(X, y)):
            z = sum(w * x for w, x in zip(weights, xi)) + intercept
            pred = sigmoid(z)
            sample_weight = w_pos if yi == 1 else w_neg
            error = (pred - yi) * sample_weight
            for j in range(n_features):
                weights[j] -= lr * error * xi[j]
            intercept -= lr * error

    return weights, intercept


def evaluate(X, y, weights, intercept, threshold=0.5):
    correct = 0
    tp = fp = tn = fn = 0
    for xi, yi in zip(X, y):
        z = sum(w * x for w, x in zip(weights, xi)) + intercept
        pred = 1 if sigmoid(z) >= threshold else 0
        if pred == yi:
            correct += 1
        if pred == 1 and yi == 1: tp += 1
        elif pred == 1 and yi == 0: fp += 1
        elif pred == 0 and yi == 1: fn += 1
        else: tn += 1
    acc = correct / len(y)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    return {"accuracy": round(acc, 4), "precision": round(precision, 4), "recall": round(recall, 4)}


if __name__ == "__main__":
    print("Generating synthetic fraud dataset (400 samples)...")
    X, y = generate_dataset(400)

    print("Training logistic regression...")
    weights, intercept = logistic_regression_train(X, y, lr=0.05, epochs=2000)

    metrics = evaluate(X, y, weights, intercept)
    print(f"Training metrics: {metrics}")

    # Try scikit-learn if available (recommended for production)
    try:
        from sklearn.linear_model import LogisticRegression
        import numpy as np
        Xnp = np.array(X)
        ynp = np.array(y)
        clf = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
        clf.fit(Xnp, ynp)
        weights = clf.coef_[0].tolist()
        intercept = float(clf.intercept_[0])
        sk_acc = clf.score(Xnp, ynp)
        print(f"scikit-learn accuracy: {sk_acc:.4f} (using sklearn weights)")
        metrics["accuracy"] = round(sk_acc, 4)
    except ImportError:
        print("scikit-learn not found — using pure-Python weights")

    model_data = {
        "features": ["amount_zscore", "hour_risk", "is_new_device", "is_new_location", "velocity_10min", "amount_balance_ratio"],
        "weights": [round(w, 6) for w in weights],
        "intercept": round(intercept, 6),
        "means": [0, 0, 0, 0, 0, 0],
        "stds": [1, 1, 1, 1, 1, 1],
        "version": "1.2",
        "trained_on": "synthetic_paysim_400_samples",
        "training_accuracy": metrics["accuracy"],
        "notes": "Logistic regression trained offline in Python. Weights exported for JS edge inference. See /model-training/train_model.py for provenance."
    }

    # Write to lib/model_weights.json
    out_path = os.path.join(os.path.dirname(__file__), "..", "lib", "model_weights.json")
    with open(out_path, "w") as f:
        json.dump(model_data, f, indent=2)

    print(f"\nExported weights to {os.path.abspath(out_path)}")
    print(f"Weights: {[round(w, 3) for w in weights]}")
    print(f"Intercept: {round(intercept, 3)}")
    print("\nDone. These weights are now loaded by /lib/fraudEngine.js at runtime.")
    print("The JS inference engine uses sigmoid(dot(features, weights) + intercept)")
