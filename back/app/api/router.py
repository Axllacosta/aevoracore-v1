from fastapi import APIRouter

from app.api.auth.router import router as auth_router
from app.api.product_categories.router import router as categories_router
from app.api.products.router import router as products_router
from app.api.customers.router import router as customers_router
from app.api.inventory.router import router as inventory_router
from app.api.sales.router import router as sales_router
from app.api.expenses.router import router as expenses_router
from app.api.dashboard.router import router as dashboard_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(categories_router)
router.include_router(products_router)
router.include_router(customers_router)
router.include_router(inventory_router)
router.include_router(sales_router)
router.include_router(expenses_router)
router.include_router(dashboard_router)
