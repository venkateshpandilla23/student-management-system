# Student Management System Using Microservices Architecture

## 1. Project Overview

A full-stack Student Management System built using React, FastAPI, SQLite, and a microservices architecture. Users can register and log in, manage student records and courses, and enroll students in courses.

## 2. Technology Stack

- **Frontend:** React.js, Vite, HTML, CSS, JavaScript
- **Backend:** Python and FastAPI
- **Database:** SQLite
- **Authentication:** JWT
- **API Gateway:** FastAPI
- **API Testing:** Postman
- **Version Control:** Git and GitHub

## 3. Project Architecture

The project contains five components:

1. **Frontend Service:** React application for user interaction.
2. **Authentication Service:** Registration, login, and JWT authentication.
3. **Student Service:** Student CRUD operations.
4. **Course Service:** Course management and student enrollment.
5. **API Gateway:** Centralized routing from the frontend to the backend services.

Each backend service has its own FastAPI application and SQLite database.

## 4. Project Structure

```text
student-management/
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
├── api-gateway/
│   ├── main.py
│   └── requirements.txt
├── auth-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── database.py
│   └── requirements.txt
├── student-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── database.py
│   └── requirements.txt
├── course-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── database.py
│   └── requirements.txt
├── postman/
│   └── collection.json
├── screenshots/
└── README.md
```

## 5. Service URLs

| Component | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API Gateway | http://127.0.0.1:8000 |
| Authentication Service | http://127.0.0.1:8001 |
| Student Service | http://127.0.0.1:8002 |
| Course Service | http://127.0.0.1:8003 |

## 6. Features

- User registration and login
- JWT-based authentication
- Student creation, retrieval, updating, and deletion
- Course creation, retrieval, updating, and deletion
- Student enrollment in courses
- Retrieval of students enrolled in a course
- Dashboard displaying student and course information
- API Gateway routing
- API testing using Postman

## 7. Environment Configuration

Configure the following environment variables where required:

- `AUTH_SECRET_KEY`: Shared JWT signing and verification secret used by the authentication, student, and course services.
- `AUTH_SERVICE_URL`: Authentication Service base URL.
- `STUDENT_SERVICE_URL`: Student Service base URL.
- `COURSE_SERVICE_URL`: Course Service base URL.

For local development, the service URLs are:

```text
AUTH_SERVICE_URL=http://127.0.0.1:8001
STUDENT_SERVICE_URL=http://127.0.0.1:8002
COURSE_SERVICE_URL=http://127.0.0.1:8003
```

Set `AUTH_SECRET_KEY` to the same securely generated value in the authentication, student, and course service terminals. Never commit real secrets or local secret files to GitHub.

## 8. Installation and Setup

### Prerequisites

- Python 3.11 or a compatible Python version
- Node.js and npm
- Git
- Postman (for API testing)

### Backend Services

Open a separate VS Code terminal for each service. The commands below assume that each backend folder has its own `venv` virtual environment and installed dependencies.

#### Authentication Service

```powershell
cd D:\student-management\auth-service
.\venv\Scripts\Activate.ps1
# Set AUTH_SECRET_KEY securely in this terminal
uvicorn app.main:app --port 8001
```

#### Student Service

```powershell
cd D:\student-management\student-service
.\venv\Scripts\Activate.ps1
# Set the same AUTH_SECRET_KEY used by the Authentication Service
uvicorn app.main:app --port 8002
```

#### Course Service

```powershell
cd D:\student-management\course-service
.\venv\Scripts\Activate.ps1
# Set the same AUTH_SECRET_KEY used by the Authentication Service
uvicorn app.main:app --port 8003
```

#### API Gateway

```powershell
cd D:\student-management\api-gateway
.\venv\Scripts\Activate.ps1
# Configure AUTH_SERVICE_URL, STUDENT_SERVICE_URL, and COURSE_SERVICE_URL if needed
uvicorn main:app --port 8000
```

If setting up from a fresh checkout, create each virtual environment and install that folder's requirements before running its service:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run these setup commands from each backend service folder, including `api-gateway`.

### Frontend

Open another terminal:

```powershell
cd D:\student-management\frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## 9. API Documentation

With the services running, open the Swagger UI documentation:

- API Gateway: http://127.0.0.1:8000/docs
- Authentication Service: http://127.0.0.1:8001/docs
- Student Service: http://127.0.0.1:8002/docs
- Course Service: http://127.0.0.1:8003/docs

## 10. Postman Testing

Import `postman/collection.json` into Postman.

The collection covers authentication, student management, course management, and student enrollment endpoints. Protected requests require a valid Bearer token.

## 11. Screenshots

The `screenshots/` folder contains screenshots of the login page, dashboard, student page, course page, successful student API response, and authentication failure without a token.

## 12. Database

SQLite is used for persistent storage. The Authentication, Student, and Course services each maintain a separate database.

## 13. Project Status

The main frontend, backend services, API Gateway, and core Postman tests have been implemented. Review the API documentation and test the services after setup to confirm the environment is configured correctly.
