#!/usr/bin/env python3
"""Terminal walkthrough of NexCredit's ML risk model - mirrors MlRiskModel.java 1:1.

Same data, same features, same seed, same gradient descent. Run:
    python3 scripts/ml_explained.py
"""
import csv
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, "..", "src", "main", "resources", "data", "home_credit_sample.csv")

FINANCIAL = ["monthlyIncome", "emiBurden", "creditToIncome", "dependents",
             "employmentYears", "educationScore", "incomeTypeScore", "revolvingLoan"]
BEHAVIOURAL = ["mobile", "transaction", "social"]
FEATURES = FINANCIAL + BEHAVIOURAL

ITERATIONS = 2500
LEARNING_RATE = 0.3
L2 = 0.0005
CENTRE = 0.5
SEED = 20260822
DEF_MEAN, REP_MEAN, NOISE_SD = 0.34, 0.63, 0.17


def sigmoid(z):
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1.0 + e)


def norm(v, lo, hi):
    return max(0.0, min(1.0, (v - lo) / (hi - lo))) if hi > lo else 0.0


def quantile(sorted_v, q):
    idx = int(math.floor(q * (len(sorted_v) - 1)))
    return sorted_v[max(0, min(len(sorted_v) - 1, idx))]


def auc_score(probs, y):
    pairs = sorted(zip(probs, y), key=lambda p: -p[0])
    pos = sum(y)
    neg = len(y) - pos
    tp_seen, auc = 0, 0.0
    for _, label in pairs:
        if label == 1:
            tp_seen += 1
        else:
            auc += tp_seen
    return auc / (pos * neg)


print("=" * 74)
print("STEP 1  LOAD DATA  src/main/resources/data/home_credit_sample.csv")
print("=" * 74)
rows_raw, labels = [], []
with open(CSV) as f:
    reader = csv.reader(f)
    next(reader)
    for c in reader:
        if len(c) < 9:
            continue
        income, credit, annuity = float(c[1]), float(c[2]), float(c[3])
        rows_raw.append([
            math.log10(max(1, income / 12.0)),      # monthlyIncome (log scale)
            annuity / (income / 12.0),               # emiBurden: EMI vs monthly income
            credit / income,                         # creditToIncome
            min(6, float(c[4])),                     # dependents (capped)
            float(c[5]),                             # employmentYears
            float(c[6]),                             # educationScore
            float(c[7]),                             # incomeTypeScore
            float(c[8]),                             # revolvingLoan
        ])
        labels.append(int(c[0]))
n = len(rows_raw)
defaults = sum(labels)
print(f"  loaded {n} real Home Credit loan applications")
print(f"  defaulters (TARGET=1): {defaults} ({defaults/n:.1%})   repayers: {n-defaults}")
print(f"  each row -> {len(FINANCIAL)} engineered financial features:")
print(f"    {', '.join(FINANCIAL)}")

print()
print("=" * 74)
print("STEP 2  BEHAVIOURAL BLOCK (Home Credit has no UPI/app data -> simulated)")
print("=" * 74)
rng = random.Random(SEED)
aug = [list(r) + [0.0, 0.0, 0.0] for r in rows_raw]
for i in range(n):
    mean = DEF_MEAN if labels[i] == 1 else REP_MEAN
    for b in range(3):
        draw = max(0.0, min(1.0, mean + rng.gauss(0, NOISE_SD)))
        aug[i][len(FINANCIAL) + b] = draw - CENTRE
print(f"  fixed seed={SEED}: defaulters draw mobile/txn/social ~ N({DEF_MEAN}, {NOISE_SD}^2)")
print(f"  repayers draw ~ N({REP_MEAN}, {NOISE_SD}^2), centred at {CENTRE}")
print(f"  -> feature vector is now {len(FEATURES)} wide: {', '.join(FEATURES)}")

lo, hi = [float("inf")] * 11, [-float("inf")] * 11
for row in aug:
    for j in range(11):
        lo[j] = min(lo[j], row[j])
        hi[j] = max(hi[j], row[j])
X = [[norm(row[j], lo[j], hi[j]) for j in range(11)] for row in aug]
y = labels

train_n = int(n * 0.8)
x_train, y_train = X[:train_n], y[:train_n]
x_test, y_test = X[train_n:], y[train_n:]

print()
print("=" * 74)
print(f"STEP 3  GRADIENT DESCENT  ({ITERATIONS} iters, lr={LEARNING_RATE}, L2={L2})")
print("=" * 74)
weights = [0.0] * 11
bias = 0.0


def loss(xs, ys):
    total = 0.0
    for xi, yi in zip(xs, ys):
        z = bias + sum(w * xij for w, xij in zip(weights, xi))
        p = sigmoid(z)
        p = min(max(p, 1e-9), 1 - 1e-9)
        total += -(yi * math.log(p) + (1 - yi) * math.log(1 - p))
    return total / len(xs)


for it in range(1, ITERATIONS + 1):
    gw = [0.0] * 11
    gb = 0.0
    for xi, yi in zip(x_train, y_train):
        z = bias + sum(w * xij for w, xij in zip(weights, xi))
        err = sigmoid(z) - yi
        gb += err
        for j in range(11):
            gw[j] += err * xi[j]
    bias -= LEARNING_RATE * (gb / train_n)
    for j in range(11):
        weights[j] -= LEARNING_RATE * (gw[j] / train_n + L2 * weights[j])
    if it % 250 == 0 or it == 1:
        tr_auc = auc_score([sigmoid(bias + sum(w * xij for w, xij in zip(weights, xi)))
                            for xi in x_train], y_train)
        print(f"  iter {it:>5}  logloss={loss(x_train, y_train):.4f}  trainAUC={tr_auc:.4f}")

probs_test = [sigmoid(bias + sum(w * xij for w, xij in zip(weights, xi))) for xi in x_test]
tp = sum(1 for p, t in zip(probs_test, y_test) if p >= 0.5 and t == 1)
tn = sum(1 for p, t in zip(probs_test, y_test) if p < 0.5 and t == 0)
fp = sum(1 for p, t in zip(probs_test, y_test) if p >= 0.5 and t == 0)
fn = sum(1 for p, t in zip(probs_test, y_test) if p < 0.5 and t == 1)
acc = (tp + tn) / len(y_test)

rep = sorted(p for p, t in zip(X and probs_test, y_test) if t == 0)
dfl = sorted(p for p, t in zip(probs_test, y_test) if t == 1)
approve_cut = max(0.05, quantile(rep, 0.90))
gradeA_cut = max(0.02, quantile(rep, 0.50))
reject_cut = max(approve_cut + 0.05, min(quantile(dfl, 0.10) if dfl else 0.95, 0.95))

print()
print("=" * 74)
print("STEP 4  HOLDOUT EVALUATION (1,200 applications never seen in training)")
print("=" * 74)
print(f"  accuracy={acc:.4f}  AUC={auc_score(probs_test, y_test):.4f}")
print(f"  confusion: TN={tn} TP={tp} FP={fp} FN={fn}")

print()
print("=" * 74)
print("STEP 5  LEARNED WEIGHTS (positive weight = pushes default risk UP)")
print("=" * 74)
for f_, w_ in zip(FEATURES, weights):
    bar = "#" * int(abs(w_) * 20)
    sign = "+" if w_ >= 0 else "-"
    print(f"  {f_:<16} {sign}{abs(w_):.4f}  {bar}")
print(f"  {'bias':<16} {bias:+.4f}")
print(f"\n  decision cutoffs calibrated from score distribution:")
print(f"    APPROVE  if PD < {approve_cut:.4f}   GRADE A if PD < {gradeA_cut:.4f}")
print(f"    REJECT   if PD > {reject_cut:.4f}   else MANUAL REVIEW band")

print()
print("=" * 74)
print("STEP 6  SCORE THREE NTC APPLICANTS - full arithmetic trace")
print("=" * 74)


def edu_score(level):
    return {"ACADEMIC": 1.0, "HIGHER": 0.85, "INCOMPLETE_HIGHER": 0.6,
            "SECONDARY": 0.4, "LOWER_SECONDARY": 0.2}.get(level, 0.4)


applicants = [
    {"name": "Aarav  gig worker, thin-file, healthy UPI flow",
     "annualIncome": 540000, "emi": 8000, "amount": 150000, "dep": 0, "yrs": 3,
     "edu": "HIGHER", "type": 0.5, "mobile": 82, "txn": 78, "social": 71},
    {"name": "Meera  self-employed, lumpy income, heavy EMIs",
     "annualIncome": 600000, "emi": 28000, "amount": 400000, "dep": 2, "yrs": 5,
     "edu": "HIGHER", "type": 0.7, "mobile": 55, "txn": 48, "social": 52},
    {"name": "Vikram declares high income but signals disagree",
     "annualIncome": 996000, "emi": 35000, "amount": 900000, "dep": 1, "yrs": 6,
     "edu": "SECONDARY", "type": 0.7, "mobile": 30, "txn": 25, "social": 28},
]

for a in applicants:
    monthly = a["annualIncome"] / 12.0
    raw = [
        math.log10(monthly),
        a["emi"] / monthly,
        a["amount"] / a["annualIncome"],
        min(6, a["dep"]),
        a["yrs"],
        edu_score(a["edu"]),
        a["type"],
        0.0,
        a["mobile"] / 100.0 - CENTRE,
        a["txn"] / 100.0 - CENTRE,
        a["social"] / 100.0 - CENTRE,
    ]
    xn = [norm(raw[j], lo[j], hi[j]) for j in range(11)]
    print(f"\n  --- {a['name']}")
    print(f"      declared monthly income Rs.{monthly:,.0f} | EMI Rs.{a['emi']:,.0f}"
          f" | mobile {a['mobile']} txn {a['txn']} social {a['social']}")
    z = bias
    for f_, w_, xj in zip(FEATURES, weights, xn):
        contrib = w_ * xj
        z += contrib
        print(f"      z += w[{f_:<16}] * x={xj:.3f}  -> {contrib:+.4f}")
    pd_default = sigmoid(z)
    approve_prob = 1 - pd_default
    if pd_default < gradeA_cut:
        grade = "A"
    elif pd_default < approve_cut:
        grade = "B"
    elif pd_default < reject_cut:
        grade = "C"
    else:
        grade = "D"
    print(f"      z_total = {z:+.4f}")
    print(f"      PD(default) = sigmoid(z) = {pd_default:.4f}")
    print(f"      APPROVE probability = 1-PD = {approve_prob:.1%}  grade={grade}"
          f"  riskBand={'LOW' if approve_prob >= .66 else 'HIGH' if approve_prob <= .33 else 'MEDIUM'}")

print()
print("=" * 74)
print("Same numbers as the Java service: verify with")
print("  curl -s localhost:8081/api/credit/model | python3 -m json.tool")
print("=" * 74)
