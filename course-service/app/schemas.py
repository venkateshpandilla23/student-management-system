
from pydantic import BaseModel, ConfigDict, Field


class CourseCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    duration: str = Field(min_length=1, max_length=50)
    department: str = Field(min_length=2, max_length=100)


class CourseUpdate(CourseCreate):
    pass


class CourseResponse(CourseCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class EnrollmentCreate(BaseModel):
    student_id: int = Field(gt=0)


class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int

    model_config = ConfigDict(from_attributes=True)
