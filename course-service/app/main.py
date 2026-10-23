
import os
import jwt

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db
from .schemas import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    EnrollmentCreate,
    EnrollmentResponse,
)

# JWT configuration
SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = "HS256"

if not SECRET_KEY:
    raise RuntimeError(
        "AUTH_SECRET_KEY is missing. Set it before starting the service."
    )

security = HTTPBearer(auto_error=False)

app = FastAPI(
    title="Course Management Service",
    description="Course CRUD and student enrollment APIs with JWT authentication",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)


# Verify JWT token
def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
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

        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


@app.get("/")
def home():
    return {"message": "Course service is running"}


# Create a course
@app.post(
    "/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_course(
    course_data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token),
):
    course = models.Course(**course_data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# List all courses
@app.get("/courses", response_model=list[CourseResponse])
def get_courses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token),
):
    return db.query(models.Course).order_by(models.Course.id).all()


# Get one course
@app.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token),
):
    course = db.query(models.Course).filter(
        models.Course.id == course_id
    ).first()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    return course


# Update a course
@app.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    course_data: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token),
):
    course = db.query(models.Course).filter(
        models.Course.id == course_id
    ).first()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    for field, value in course_data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


# Delete a course and its enrollments
@app.delete("/courses/{course_id}")
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token),
):
    course = db.query(models.Course).filter(
        models.Course.id == course_id
    ).first()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id
    ).delete(synchronize_session=False)

    db.delete(course)
    db.commit()

    return {"message": "Course and its enrollments deleted successfully"}


# Assign a student to a course
@app.post(
    "/courses/{course_id}/enrollments",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def enroll_student(
    course_id: int,
    enrollment_data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token),
):
    course = db.query(models.Course).filter(
        models.Course.id == course_id
    ).first()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id,
        models.Enrollment.student_id == enrollment_data.student_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Student is already enrolled in this course",
        )

    enrollment = models.Enrollment(
        course_id=course_id,
        student_id=enrollment_data.student_id,
    )

    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return enrollment


# List student IDs enrolled in a course
@app.get(
    "/courses/{course_id}/students",
    response_model=list[EnrollmentResponse],
)
def get_enrolled_students(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token),
):
    course = db.query(models.Course).filter(
        models.Course.id == course_id
    ).first()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    return db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id
    ).all()
