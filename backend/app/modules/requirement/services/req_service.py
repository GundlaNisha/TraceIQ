import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.requirement.models.req import Requirement, RequirementVersion


async def create_requirement(db: AsyncSession, user_id: uuid.UUID, repository_id: uuid.UUID, title: str, text: str) -> Requirement:
    req = Requirement(user_id=user_id, repository_id=repository_id, title=title, text=text, version_number=1)
    db.add(req)
    await db.flush()  # get ID before inserting version
    
    v1 = RequirementVersion(requirement_id=req.id, version_number=1, title=title, text=text)
    from app.modules.audit.models.audit import AuditLog
    audit = AuditLog(
        user_id=str(user_id),
        action="requirement.create",
        resource_type="requirement",
        resource_id=str(req.id)
    )
    db.add(v1)
    db.add(audit)
    await db.commit()
    await db.refresh(req)
    return req

async def update_requirement(db: AsyncSession, req: Requirement, title: str, text: str) -> Requirement:
    # NEVER update the existing RequirementVersion — always insert a new one
    req.title = title
    req.text = text
    req.version_number += 1
    
    new_version = RequirementVersion(
        requirement_id=req.id, 
        version_number=req.version_number, 
        title=title, 
        text=text
    )
    from app.modules.audit.models.audit import AuditLog
    audit = AuditLog(
        user_id=str(req.user_id),
        action="requirement.update",
        resource_type="requirement",
        resource_id=str(req.id)
    )
    db.add(new_version)
    db.add(audit)
    await db.commit()
    await db.refresh(req)
    return req
