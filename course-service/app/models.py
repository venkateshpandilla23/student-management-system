
from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from .database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=False, default="")
    duration = Column(String(50), nullable=False)
    department = Column(String(100), nullable=False)


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    course_id = Column(
        Integer,
        ForeignKey("courses.id"),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "course_id",
            name="unique_student_course",
        ),
    )
