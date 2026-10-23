
import os

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

app = FastAPI(
    title="Student Management API Gateway",
    description="Central gateway for authentication, students, and courses",
    version="1.0.0",
)

# Allow the React development server to call the gateway.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Microservice URLs
AUTH_SERVICE_URL = os.getenv(
    "AUTH_SERVICE_URL",
    "http://127.0.0.1:8001",
)

STUDENT_SERVICE_URL = os.getenv(
    "STUDENT_SERVICE_URL",
    "http://127.0.0.1:8002",
)

COURSE_SERVICE_URL = os.getenv(
    "COURSE_SERVICE_URL",
    "http://127.0.0.1:8003",
)

TIMEOUT = httpx.Timeout(15.0)

# Headers managed by the HTTP client should not be forwarded.
HOP_BY_HOP_HEADERS = {
    "host",
    "content-length",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}


@app.get("/")
def home():
    return {
        "message": "API Gateway is running",
        "services": {
            "auth": "/auth",
            "students": "/students",
            "courses": "/courses",
        },
    }


async def forward_request(
    request: Request,
    service_url: str,
    service_path: str = "",
):
    """Forward a request to the appropriate microservice."""

    target_url = service_url.rstrip("/")

    if service_path:
        target_url += "/" + service_path.lstrip("/")

    if request.url.query:
        target_url += "?" + request.url.query

    # Forward request headers, including Authorization when present.
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    }

    body = await request.body()

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            upstream = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )

        # Preserve the upstream response status, body, and safe headers.
        response_headers = {
            key: value
            for key, value in upstream.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS
            and key.lower() not in {"content-encoding"}
        }

        return Response(
            content=upstream.content,
            status_code=upstream.status_code,
            headers=response_headers,
        )

    except httpx.TimeoutException:
        return JSONResponse(
            status_code=504,
            content={
                "detail": "The requested service timed out"
            },
        )

    except httpx.RequestError:
        return JSONResponse(
            status_code=502,
            content={
                "detail": "The requested service is unavailable"
            },
        )


# ---------------- AUTHENTICATION SERVICE ----------------

@app.api_route(
    "/auth",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def auth_root(request: Request):
    return await forward_request(
        request,
        AUTH_SERVICE_URL,
    )


@app.api_route(
    "/auth/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def auth_proxy(request: Request, path: str):
    return await forward_request(
        request,
        AUTH_SERVICE_URL,
        f"auth/{path}",
    )


# ---------------- STUDENT SERVICE ----------------

@app.api_route(
    "/students",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def students_root(request: Request):
    # Forward /students to the student service's /students endpoint.
    return await forward_request(
        request,
        STUDENT_SERVICE_URL,
        "students",
    )


@app.api_route(
    "/students/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def students_proxy(request: Request, path: str):
    # Forward paths such as /students/1 to the student service.
    return await forward_request(
        request,
        STUDENT_SERVICE_URL,
        f"students/{path}",
    )


# ---------------- COURSE SERVICE ----------------

@app.api_route(
    "/courses",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def courses_root(request: Request):
    # Forward /courses to the course service's /courses endpoint.
    return await forward_request(
        request,
        COURSE_SERVICE_URL,
        "courses",
    )


@app.api_route(
    "/courses/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def courses_proxy(request: Request, path: str):
    # Forward paths such as /courses/1 to the course service.
    return await forward_request(
        request,
        COURSE_SERVICE_URL,
        f"courses/{path}",
    )
