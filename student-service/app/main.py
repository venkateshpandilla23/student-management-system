
import os

import jwt
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db
from .schemas import StudentCreate, StudentUpdate, StudentResponse


# --------------------------------------------------
# Application configuration
# --------------------------------------------------

app = FastAPI(
    title="Student Management Service",
    description="CRUD APIs for student records with JWT protection",
    version="1.0.0",
)

# Create database tables if they do not exist.
Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# JWT configuration
# --------------------------------------------------

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = "HS256"

if not SECRET_KEY:
    raise RuntimeError(
        "AUTH_SECRET_KEY is missing. Set it before starting the service."
    )

security = HTTPBearer(auto_error=False)


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Validate the JWT issued by the Authentication Service."""

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        # The Auth Service stores the user ID in the 'sub' claim.
        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/")
def home():
    return {"message": "Student service is running"}


# --------------------------------------------------
# CREATE a student
# --------------------------------------------------

@app.post(
    "/students",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_student(
    student_data: StudentCreate,
    current_user=Depends(verify_token),
    db: Session = Depends(get_db),
):
    existing_student = (
        db.query(models.Student)
        .filter(models.Student.email == student_data.email)
        .first()
    )

    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this email already exists",
        )

    student = models.Student(**student_data.model_dump())

    db.add(student)
    db.commit()
    db.refresh(student)

    return student


# --------------------------------------------------
# READ all students
# --------------------------------------------------

@app.get(
    "/students",
    response_model=list[StudentResponse],
)
def get_students(
    current_user=Depends(verify_token),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Student)
        .order_by(models.Student.id)
        .all()
    )


# --------------------------------------------------
# READ one student
# --------------------------------------------------

@app.get(
    "/students/{student_id}",
    response_model=StudentResponse,
)
def get_student(
    student_id: int,
    current_user=Depends(verify_token),
    db: Session = Depends(get_db),
):
    student = (
        db.query(models.Student)
        .filter(models.Student.id == student_id)
        .first()
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student


# --------------------------------------------------
# UPDATE a student
# --------------------------------------------------

@app.put(
    "/students/{student_id}",
    response_model=StudentResponse,
)
def update_student(
    student_id: int,
    student_data: StudentUpdate,
    current_user=Depends(verify_token),
    db: Session = Depends(get_db),
):
    student = (
        db.query(models.Student)
        .filter(models.Student.id == student_id)
        .first()
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    update_data = student_data.model_dump(exclude_unset=True)

    if "email" in update_data:
        duplicate_email = (
            db.query(models.Student)
            .filter(
                models.Student.email == update_data["email"],
                models.Student.id != student_id,
            )
            .first()
        )

        if duplicate_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another student already uses this email",
            )

    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)

    return student


# --------------------------------------------------
# DELETE a student
# --------------------------------------------------

@app.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    current_user=Depends(verify_token),
    db: Session = Depends(get_db),
):
    student = (
        db.query(models.Student)
        .filter(models.Student.id == student_id)
        .first()
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    db.delete(student)
    db.commit()

    return {"message": "Student deleted successfully"}