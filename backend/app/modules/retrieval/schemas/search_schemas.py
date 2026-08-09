from typing import Literal

from pydantic import BaseModel


class SearchResultItem(BaseModel):
    file_path: str
    match_type: Literal["semantic", "symbol", "exact"]
    snippet: str
    score: float
