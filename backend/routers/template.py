from fastapi import APIRouter
from fastapi.responses import Response

from template_utils import TEMPLATE_FILENAME, XLSX_MEDIA_TYPE, build_template_xlsx

router = APIRouter(prefix="/api/template", tags=["template"])

# Publik tanpa token (dipakai juga oleh halaman Coba Tanpa Akun) dan tidak
# menyentuh database -- isinya file statis yang sama untuk semua orang.


@router.get("")
def download_template():
    return Response(
        content=build_template_xlsx(),
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{TEMPLATE_FILENAME}"'},
    )
