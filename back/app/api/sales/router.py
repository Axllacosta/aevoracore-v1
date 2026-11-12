from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.sales import service
from app.api.sales import documents
from app.core.exceptions import AppException
from app.api.sales.schemas import (
    SaleCancelRequest,
    SaleCreate,
    SaleResponse,
)
from app.database.connection import get_db
from app.database.models.security import Usuario
from app.api.auth.dependencies import require_roles


router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
)


@router.post(
    "",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sale(
        payload: SaleCreate,
        db: Session = Depends(get_db),
        current_user: Usuario = Depends(
            require_roles("ADMIN", "EMPLEADO")
        ),
) -> SaleResponse:
    return service.create_sale(
        db=db,
        payload=payload,
        user=current_user,
    )


@router.get(
    "",
    response_model=list[SaleResponse],
    status_code=status.HTTP_200_OK,
)
def list_sales(
        limit: int = Query(default=50, ge=1, le=100),
        offset: int = Query(default=0, ge=0),
        db: Session = Depends(get_db),
        current_user: Usuario = Depends(
            require_roles("ADMIN", "EMPLEADO")
        ),
) -> list[SaleResponse]:
    return service.get_sales(
        db=db,
        limit=limit,
        offset=offset,
    )


@router.get("/document-config", response_model=documents.IssuerConfig | None)
def get_document_config(
        db: Session = Depends(get_db),
        current_user: Usuario = Depends(require_roles("ADMIN", "EMPLEADO")),
):
    return documents.get_config(db)


@router.put("/document-config", response_model=documents.IssuerConfig)
def update_document_config(
        payload: documents.IssuerConfig,
        db: Session = Depends(get_db),
        current_user: Usuario = Depends(require_roles("ADMIN")),
):
    try:
        return documents.save_config(db, payload)
    except IntegrityError as exc:
        db.rollback()
        raise AppException("Otra configuración se guardó simultáneamente. Actualiza y reintenta.", 409, "DOCUMENT_CONFIG_CONFLICT") from exc


@router.get("/{sale_id}/pdf", response_class=Response, responses={200: {"content": {"application/pdf": {}}}})
def get_sale_pdf(
        sale_id: int,
        db: Session = Depends(get_db),
        current_user: Usuario = Depends(require_roles("ADMIN", "EMPLEADO")),
):
    from app.api.sales.pdf import render_sale_pdf
    document = documents.get_document(db, sale_id)
    filename = f"{document.tipo}-{document.serie}-{document.correlativo:08d}.pdf"
    return Response(render_sale_pdf(document), media_type="application/pdf", headers={
        "Content-Disposition": f'inline; filename="{filename}"',
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    })


@router.get(
    "/{sale_id}",
    response_model=SaleResponse,
    status_code=status.HTTP_200_OK,
)
def get_sale(
        sale_id: int,
        db: Session = Depends(get_db),
        current_user: Usuario = Depends(
            require_roles("ADMIN", "EMPLEADO")
        ),
) -> SaleResponse:
    return service.get_sale(
        db=db,
        sale_id=sale_id,
    )


@router.post(
    "/{sale_id}/cancel",
    response_model=SaleResponse,
    status_code=status.HTTP_200_OK,
)
def cancel_sale(
        sale_id: int,
        payload: SaleCancelRequest,
        db: Session = Depends(get_db),
        current_user: Usuario = Depends(
            require_roles("ADMIN")
        ),
) -> SaleResponse:
    return service.cancel_sale(
        db=db,
        sale_id=sale_id,
        payload=payload,
        user=current_user,
    )
