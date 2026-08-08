import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.deps import get_current_user
from app.modules.auth.models.user import User
from app.modules.requirement.models.req import Requirement, RequirementVersion
from app.modules.requirement.schemas.req_schemas import ReqCreate, ReqUpdate, ReqResponse, VersionResponse
from app.modules.requirement.services.req_service import create_requirement, update_requirement
from app.modules.repository.models.repo import Repository

router = APIRouter(prefix="/api/v1/requirements", tags=["requirements"])

@router.get("/", response_model=list[ReqResponse])
async def list_requirements(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Requirement).where(Requirement.user_id == current_user.id))
    return result.scalars().all()

@router.post("/", response_model=ReqResponse, status_code=201)
async def add_requirement(body: ReqCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        repo_uuid = uuid.UUID(body.repository_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")
        
    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: Repo not found or not owned by user")
        
    return await create_requirement(db, current_user.id, repo_uuid, body.title, body.text)

@router.get("/{req_id}", response_model=ReqResponse)
async def get_requirement(req_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid req UUID")
        
    req = await db.get(Requirement, req_uuid)
    if not req or req.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    return req

@router.patch("/{req_id}", response_model=ReqResponse)
async def patch_requirement(req_id: str, body: ReqUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid req UUID")
        
    req = await db.get(Requirement, req_uuid)
    if not req or req.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    return await update_requirement(db, req, body.title, body.text)

@router.delete("/{req_id}", status_code=204)
async def delete_requirement(req_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid req UUID")
        
    req = await db.get(Requirement, req_uuid)
    if not req or req.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    await db.delete(req)
    await db.commit()
    return None

@router.get("/{req_id}/versions", response_model=list[VersionResponse])
async def list_requirement_versions(req_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid req UUID")
        
    req = await db.get(Requirement, req_uuid)
    if not req or req.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    result = await db.execute(
        select(RequirementVersion)
        .where(RequirementVersion.requirement_id == req_uuid)
        .order_by(RequirementVersion.version_number.desc())
    )
    return result.scalars().all()
