from pydantic import BaseModel
from typing import Literal

class SearchResultItem(BaseModel):
    file_path: str
    match_type: Literal["semantic", "symbol", "exact"]
    snippet: str
    score: float
