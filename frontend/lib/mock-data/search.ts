export type SearchResultItem = {
  file_path: string;
  match_type: "semantic" | "symbol" | "exact";
  snippet: string;
  score: number;
};

export function mockSearch(query: string): SearchResultItem[] {
  if (!query.trim()) return [];
  return [
    {
      file_path: "src/services/payments/charge.py",
      match_type: "semantic",
      snippet: `async def create_charge(amount: int, currency: str, idempotency_key: str | None = None):`,
      score: 0.91,
    },
    {
      file_path: "src/services/payments/charge.py",
      match_type: "symbol",
      snippet: `class ChargeService:`,
      score: 0.85,
    },
    {
      file_path: "tests/services/test_charge.py",
      match_type: "exact",
      snippet: `def test_create_charge_with_idempotency_key():`,
      score: 0.78,
    },
    {
      file_path: "src/models/charge.py",
      match_type: "semantic",
      snippet: `class Charge(Base):\n    idempotency_key = Column(String(255), unique=True, nullable=True)`,
      score: 0.72,
    },
  ];
}
