
from pydantic import BaseModel, ConfigDict, Field


class StudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        max_length=255,
    )
    phone: str = Field(min_length=7, max_length=20)
    department: str = Field(min_length=2, max_length=100)
    course: str = Field(min_length=2, max_length=100)


class StudentUpdate(StudentCreate):
    pass


class StudentResponse(StudentCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
