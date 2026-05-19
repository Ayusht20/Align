from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from supabase import create_client
from models import User  # Fixed import path
from auth import get_current_user # Fixed import path
import os
import uuid

router = APIRouter(prefix="/api/upload", tags=["Upload"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "post-images")
MAX_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_MB", "2")) * 1024 * 1024

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type.")

    contents = await file.read()

    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large (Max 5MB).")

    ext = ALLOWED_TYPES[file.content_type]
    filename = f"{current_user.id}_{uuid.uuid4().hex}{ext}"

    try:
        # Perform the upload
        res = supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=filename,
            file=contents,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(filename)
        return {"url": public_url, "filename": filename}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")