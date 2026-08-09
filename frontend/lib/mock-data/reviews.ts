export type ReviewFinding = {
  file_path: string;
  line_number: number | null;
  severity: "high" | "medium" | "low";
  message: string;
};

export type Review = {
  id: string;
  commit_hash: string;
  repository_id: string;
  status: "queued" | "running" | "completed" | "failed";
};

export const mockReview: Review = {
  id: "review_1",
  commit_hash: "a1b2c3d4e5f6",
  repository_id: "repo_1",
  status: "completed",
};

export const mockDiff = `diff --git a/src/services/payments/charge.py b/src/services/payments/charge.py
index 3a2b1c0..9f8e7d6 100644
--- a/src/services/payments/charge.py
+++ b/src/services/payments/charge.py
@@ -12,6 +12,10 @@ from app.models.charge import Charge
 
 async def create_charge(amount: int, currency: str) -> Charge:
+    if amount <= 0:
+        raise ValueError("Amount must be positive")
+    if currency not in SUPPORTED_CURRENCIES:
+        raise ValueError(f"Unsupported currency: {currency}")
     charge = Charge(amount=amount, currency=currency)
     db.add(charge)
     await db.commit()
diff --git a/tests/services/test_charge.py b/tests/services/test_charge.py
index 1c2d3e4..5f6a7b8 100644
--- a/tests/services/test_charge.py
+++ b/tests/services/test_charge.py
@@ -1,4 +1,8 @@
 def test_create_charge():
     result = create_charge(100, "usd")
     assert result.amount == 100
+
+def test_create_charge_negative_amount():
+    with pytest.raises(ValueError):
+        create_charge(-50, "usd")`;

export const mockFindings: ReviewFinding[] = [
  {
    file_path: "src/services/payments/charge.py",
    line_number: 15,
    severity: "high",
    message:
      "SUPPORTED_CURRENCIES is referenced but not imported in this file. This will raise a NameError at runtime.",
  },
  {
    file_path: "src/services/payments/charge.py",
    line_number: null,
    severity: "medium",
    message:
      "No test coverage for the currency validation path added in this diff. Consider adding a test for unsupported currency input.",
  },
  {
    file_path: "tests/services/test_charge.py",
    line_number: 8,
    severity: "low",
    message:
      "Test function name could be more descriptive: test_create_charge_with_negative_amount_raises.",
  },
];
