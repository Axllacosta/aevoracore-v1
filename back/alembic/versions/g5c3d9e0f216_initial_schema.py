"""Create the initial application schema."""

from alembic import op
import sqlalchemy as sa

revision = "g5c3d9e0f216"
down_revision = None
branch_labels = None
depends_on = None


def money(name):
    return sa.Column(name, sa.Numeric(12, 2), nullable=False)


def upgrade() -> None:
    op.create_table('categorias',
    sa.Column('id_categoria', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(length=100), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=True),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id_categoria'),
    sa.UniqueConstraint('nombre')
    )
    op.create_table('clientes',
    sa.Column('id_cliente', sa.Integer(), nullable=False),
    sa.Column('dni', sa.String(length=8), nullable=True),
    sa.Column('nombres', sa.String(length=100), nullable=True),
    sa.Column('apellidos', sa.String(length=100), nullable=True),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id_cliente'),
    sa.UniqueConstraint('dni')
    )
    op.create_table('roles',
    sa.Column('id_rol', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(length=30), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=True),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id_rol'),
    sa.UniqueConstraint('nombre')
    )
    op.create_table('productos',
    sa.Column('id_producto', sa.Integer(), nullable=False),
    sa.Column('id_categoria', sa.Integer(), nullable=False),
    sa.Column('sku', sa.String(length=60), nullable=False),
    sa.Column('nombre', sa.String(length=160), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=True),
    sa.Column('color', sa.String(length=60), nullable=True),
    sa.Column('acabado', sa.String(length=80), nullable=True),
    sa.Column('material', sa.String(length=100), nullable=True),
    sa.Column('alto', sa.Numeric(precision=8, scale=2), nullable=True),
    sa.Column('ancho', sa.Numeric(precision=8, scale=2), nullable=True),
    sa.Column('profundidad', sa.Numeric(precision=8, scale=2), nullable=True),
    sa.Column('precio_base', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('costo_referencia', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('(alto IS NULL OR alto > 0) AND (ancho IS NULL OR ancho > 0) AND (profundidad IS NULL OR profundidad > 0)', name='ck_producto_dimensiones_positivas'),
    sa.CheckConstraint('costo_referencia IS NULL OR costo_referencia >= 0', name='ck_producto_costo_no_negativo'),
    sa.CheckConstraint('precio_base >= 0', name='ck_producto_precio_no_negativo'),
    sa.ForeignKeyConstraint(['id_categoria'], ['categorias.id_categoria'], ),
    sa.PrimaryKeyConstraint('id_producto'),
    sa.UniqueConstraint('sku')
    )
    op.create_table('usuarios',
    sa.Column('id_usuario', sa.Integer(), nullable=False),
    sa.Column('id_rol', sa.Integer(), nullable=False),
    sa.Column('dni', sa.String(length=8), nullable=True),
    sa.Column('nombres', sa.String(length=100), nullable=False),
    sa.Column('apellidos', sa.String(length=100), nullable=False),
    sa.Column('email', sa.String(length=254), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['id_rol'], ['roles.id_rol'], ),
    sa.PrimaryKeyConstraint('id_usuario'),
    sa.UniqueConstraint('dni'),
    sa.UniqueConstraint('email')
    )
    op.create_table('autorizaciones_ajuste_inventario',
    sa.Column('id_usuario', sa.Integer(), nullable=False),
    sa.Column('autorizado', sa.Boolean(), nullable=False),
    sa.Column('actualizado_por', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['actualizado_por'], ['usuarios.id_usuario'], ),
    sa.ForeignKeyConstraint(['id_usuario'], ['usuarios.id_usuario'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_usuario')
    )
    op.create_table('inventarios',
    sa.Column('id_inventario', sa.Integer(), nullable=False),
    sa.Column('id_producto', sa.Integer(), nullable=False),
    sa.Column('stock_actual', sa.Integer(), nullable=False),
    sa.Column('stock_minimo', sa.Integer(), nullable=False),
    sa.Column('fecha_actualizacion', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('stock_actual >= 0', name='ck_inventario_stock_no_negativo'),
    sa.CheckConstraint('stock_minimo >= 0', name='ck_inventario_stock_minimo_no_negativo'),
    sa.ForeignKeyConstraint(['id_producto'], ['productos.id_producto'], ),
    sa.PrimaryKeyConstraint('id_inventario'),
    sa.UniqueConstraint('id_producto')
    )
    op.create_table('ventas',
    sa.Column('id_venta', sa.Integer(), nullable=False),
    sa.Column('id_cliente', sa.Integer(), nullable=False),
    sa.Column('id_usuario', sa.Integer(), nullable=False),
    sa.Column('canal_venta', sa.Enum('PRESENCIAL', 'WHATSAPP', name='canalventa', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('estado', sa.Enum('CONFIRMADA', 'CANCELADA', name='estadoventa', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=False),
    sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('descuento_total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('motivo_cancelacion', sa.Text(), nullable=True),
    sa.Column('fecha_cancelacion', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('descuento_total <= subtotal', name='ck_venta_descuento_no_supera_subtotal'),
    sa.CheckConstraint('descuento_total >= 0', name='ck_venta_descuento_no_negativo'),
    sa.CheckConstraint('subtotal >= 0', name='ck_venta_subtotal_no_negativo'),
    sa.CheckConstraint('total = subtotal - descuento_total', name='ck_venta_total_consistente'),
    sa.CheckConstraint('total >= 0', name='ck_venta_total_no_negativo'),
    sa.ForeignKeyConstraint(['id_cliente'], ['clientes.id_cliente'], ),
    sa.ForeignKeyConstraint(['id_usuario'], ['usuarios.id_usuario'], ),
    sa.PrimaryKeyConstraint('id_venta')
    )
    op.create_table('detalles_venta',
    sa.Column('id_detalle_venta', sa.Integer(), nullable=False),
    sa.Column('id_venta', sa.Integer(), nullable=False),
    sa.Column('id_producto', sa.Integer(), nullable=False),
    sa.Column('cantidad', sa.Integer(), nullable=False),
    sa.Column('precio_unitario_base', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('descuento_porcentaje', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('descuento_importe', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('subtotal_linea', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total_linea', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.CheckConstraint('cantidad > 0', name='ck_detalle_cantidad_positiva'),
    sa.CheckConstraint('descuento_importe <= subtotal_linea', name='ck_detalle_descuento_no_supera_subtotal'),
    sa.CheckConstraint('descuento_importe >= 0', name='ck_detalle_descuento_no_negativo'),
    sa.CheckConstraint('descuento_porcentaje >= 0 AND descuento_porcentaje <= 100', name='ck_detalle_porcentaje_descuento'),
    sa.CheckConstraint('precio_unitario_base >= 0', name='ck_detalle_precio_no_negativo'),
    sa.CheckConstraint('subtotal_linea >= 0 AND total_linea >= 0', name='ck_detalle_importes_no_negativos'),
    sa.CheckConstraint('total_linea = subtotal_linea - descuento_importe', name='ck_detalle_total_consistente'),
    sa.ForeignKeyConstraint(['id_producto'], ['productos.id_producto'], ),
    sa.ForeignKeyConstraint(['id_venta'], ['ventas.id_venta'], ),
    sa.PrimaryKeyConstraint('id_detalle_venta')
    )
    op.create_table('pagos',
    sa.Column('id_pago', sa.Integer(), nullable=False),
    sa.Column('id_venta', sa.Integer(), nullable=False),
    sa.Column('medio_pago', sa.Enum('EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA', name='mediopago', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('importe', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('estado', sa.Enum('REGISTRADO', 'REVERTIDO', name='estadopago', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=False),
    sa.Column('fecha_reversion', sa.DateTime(timezone=True), nullable=True),
    sa.Column('motivo_reversion', sa.Text(), nullable=True),
    sa.CheckConstraint('importe > 0', name='ck_pago_importe_positivo'),
    sa.ForeignKeyConstraint(['id_venta'], ['ventas.id_venta'], ),
    sa.PrimaryKeyConstraint('id_pago'),
    sa.UniqueConstraint('id_venta')
    )
    op.create_table('movimientos_inventario',
    sa.Column('id_movimiento', sa.Integer(), nullable=False),
    sa.Column('id_producto', sa.Integer(), nullable=False),
    sa.Column('id_usuario', sa.Integer(), nullable=False),
    sa.Column('id_detalle_venta', sa.Integer(), nullable=True),
    sa.Column('id_venta_cancelada', sa.Integer(), nullable=True),
    sa.Column('tipo_movimiento', sa.Enum('ENTRADA', 'SALIDA', 'AJUSTE', name='tipomovimiento', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('direccion_ajuste', sa.Enum('INCREMENTO', 'DECREMENTO', name='direccionajuste', native_enum=False, create_constraint=True), nullable=True),
    sa.Column('cantidad', sa.Integer(), nullable=False),
    sa.Column('stock_anterior', sa.Integer(), nullable=False),
    sa.Column('stock_posterior', sa.Integer(), nullable=False),
    sa.Column('motivo', sa.Text(), nullable=True),
    sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("\n            (\n                tipo_movimiento = 'AJUSTE'\n                AND direccion_ajuste IS NOT NULL\n            )\n            OR\n            (\n                tipo_movimiento IN ('ENTRADA', 'SALIDA')\n                AND direccion_ajuste IS NULL\n            )\n            ", name='ck_movimiento_direccion_segun_tipo'),
    sa.CheckConstraint("\n            (\n                tipo_movimiento = 'AJUSTE'\n                AND id_detalle_venta IS NULL\n            )\n            OR tipo_movimiento <> 'AJUSTE'\n            ", name='ck_movimiento_ajuste_sin_detalle_venta'),
    sa.CheckConstraint('cantidad > 0', name='ck_movimiento_cantidad_positiva'),
    sa.CheckConstraint('stock_anterior >= 0 AND stock_posterior >= 0', name='ck_movimiento_stocks_no_negativos'),
    sa.ForeignKeyConstraint(['id_detalle_venta'], ['detalles_venta.id_detalle_venta'], ),
    sa.ForeignKeyConstraint(['id_producto'], ['productos.id_producto'], ),
    sa.ForeignKeyConstraint(['id_usuario'], ['usuarios.id_usuario'], ),
    sa.ForeignKeyConstraint(['id_venta_cancelada'], ['ventas.id_venta'], ),
    sa.PrimaryKeyConstraint('id_movimiento')
    )

    op.create_table('imagenes_productos',
    sa.Column('id_imagen', sa.Integer(), nullable=False),
    sa.Column('id_producto', sa.Integer(), nullable=False),
    sa.Column('url_imagen', sa.String(length=500), nullable=False),
    sa.Column('nombre_archivo', sa.String(length=255), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.Column('es_principal', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['id_producto'], ['productos.id_producto'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_imagen')
    )
    op.create_index(op.f('ix_imagenes_productos_id_producto'), 'imagenes_productos', ['id_producto'], unique=False)

    op.add_column("clientes", sa.Column("ruc", sa.String(11), nullable=True))
    op.add_column("clientes", sa.Column("correo", sa.String(160), nullable=True))
    op.add_column("clientes", sa.Column("telefono", sa.String(9), nullable=True))
    op.create_unique_constraint("uq_clientes_ruc", "clientes", ["ruc"])

    op.add_column("productos", sa.Column("controlar_stock", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.drop_constraint("ck_inventario_stock_no_negativo", "inventarios", type_="check")
    op.drop_constraint("ck_movimiento_stocks_no_negativos", "movimientos_inventario", type_="check")
    op.drop_constraint("pagos_id_venta_key", "pagos", type_="unique")
    op.create_index("ix_pagos_id_venta", "pagos", ["id_venta"])

    op.create_table(
        "categorias_gasto",
        sa.Column("id_categoria_gasto", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(100), nullable=False, unique=True),
        sa.Column("requiere_descripcion", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "gastos",
        sa.Column("id_gasto", sa.Integer(), primary_key=True),
        sa.Column("id_categoria_gasto", sa.Integer(), sa.ForeignKey("categorias_gasto.id_categoria_gasto"), nullable=False),
        sa.Column("id_usuario", sa.Integer(), sa.ForeignKey("usuarios.id_usuario"), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("importe", sa.Numeric(12, 2), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("importe > 0", name="ck_gasto_importe_positivo"),
    )
    op.create_index("ix_gastos_fecha", "gastos", ["fecha"])
    categories = sa.table("categorias_gasto", sa.column("nombre", sa.String()), sa.column("requiere_descripcion", sa.Boolean()))
    op.bulk_insert(categories, [
        {"nombre": name, "requiere_descripcion": name == "OTROS"}
        for name in ("LUZ", "AGUA", "ARBITRIOS", "NÓMINA", "MATERIALES", "HERRAMIENTAS", "INCIDENCIAS", "OTROS")
    ])

    op.alter_column("detalles_venta", "descuento_porcentaje", existing_type=sa.Numeric(5, 2), nullable=True)

    op.add_column("clientes", sa.Column("tipo_persona", sa.String(10), server_default="NATURAL", nullable=False))
    op.add_column("clientes", sa.Column("razon_social", sa.String(200)))
    op.add_column("clientes", sa.Column("direccion_fiscal", sa.String(500)))
    op.add_column("ventas", sa.Column("clave_idempotencia", sa.String(36)))
    op.add_column("ventas", sa.Column("hash_solicitud", sa.String(64)))
    op.create_unique_constraint("uq_venta_idempotencia", "ventas", ["clave_idempotencia"])
    op.create_table("emisores",
        sa.Column("id_emisor", sa.Integer, primary_key=True),
        sa.Column("ruc", sa.String(11), nullable=False, unique=True),
        sa.Column("razon_social", sa.String(200), nullable=False),
        sa.Column("direccion", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("tipos_comprobante",
        sa.Column("id_tipo_comprobante", sa.Integer, primary_key=True),
        sa.Column("codigo", sa.String(20), nullable=False, unique=True),
        sa.CheckConstraint("codigo IN ('BOLETA', 'FACTURA')", name="ck_tipo_comprobante_codigo"))
    op.create_table("series_comprobante",
        sa.Column("id_serie", sa.Integer, primary_key=True),
        sa.Column("id_emisor", sa.Integer, sa.ForeignKey("emisores.id_emisor"), nullable=False),
        sa.Column("id_tipo_comprobante", sa.Integer, sa.ForeignKey("tipos_comprobante.id_tipo_comprobante"), nullable=False),
        sa.Column("serie", sa.String(20), nullable=False),
        sa.Column("ultimo_correlativo", sa.Integer, nullable=False),
        sa.UniqueConstraint("id_emisor", "id_tipo_comprobante", name="uq_serie_emisor_tipo"),
        sa.CheckConstraint("ultimo_correlativo >= 0", name="ck_serie_correlativo"))
    op.create_table("comprobantes",
        sa.Column("id_comprobante", sa.Integer, primary_key=True),
        sa.Column("id_venta", sa.Integer, sa.ForeignKey("ventas.id_venta"), nullable=False, unique=True),
        sa.Column("id_serie", sa.Integer, sa.ForeignKey("series_comprobante.id_serie"), nullable=False),
        sa.Column("id_usuario_emisor", sa.Integer, sa.ForeignKey("usuarios.id_usuario"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("serie", sa.String(20), nullable=False),
        sa.Column("correlativo", sa.Integer, nullable=False),
        sa.Column("fecha_emision", sa.DateTime(timezone=True), nullable=False),
        sa.Column("moneda", sa.String(3), nullable=False),
        sa.Column("emisor_ruc", sa.String(11), nullable=False),
        sa.Column("emisor_razon_social", sa.String(200), nullable=False),
        sa.Column("emisor_direccion", sa.String(500), nullable=False),
        sa.Column("receptor_tipo_documento", sa.String(10), nullable=False),
        sa.Column("receptor_numero_documento", sa.String(20)),
        sa.Column("receptor_nombre", sa.String(200), nullable=False),
        sa.Column("receptor_direccion", sa.String(500)),
        money("subtotal"), money("descuento_total"), money("total"),
        sa.Column("version_plantilla", sa.String(20), nullable=False),
        sa.UniqueConstraint("id_serie", "correlativo", name="uq_comprobante_numero"),
        sa.CheckConstraint("correlativo > 0", name="ck_comprobante_correlativo"),
        sa.CheckConstraint("subtotal >= 0 AND descuento_total >= 0 AND total > 0 AND total = subtotal - descuento_total", name="ck_comprobante_importes"))
    op.create_index("ix_comprobantes_id_serie", "comprobantes", ["id_serie"])
    op.create_table("detalles_comprobante",
        sa.Column("id_detalle_comprobante", sa.Integer, primary_key=True),
        sa.Column("id_comprobante", sa.Integer, sa.ForeignKey("comprobantes.id_comprobante"), nullable=False),
        sa.Column("id_detalle_venta", sa.Integer, sa.ForeignKey("detalles_venta.id_detalle_venta"), nullable=False, unique=True),
        sa.Column("numero_linea", sa.Integer, nullable=False),
        sa.Column("sku", sa.String(60), nullable=False),
        sa.Column("descripcion", sa.Text, nullable=False),
        sa.Column("unidad_medida", sa.String(20), nullable=False),
        sa.Column("cantidad", sa.Integer, nullable=False),
        money("precio_unitario"), money("subtotal"), money("descuento"), money("total"),
        sa.UniqueConstraint("id_comprobante", "numero_linea", name="uq_comprobante_linea"),
        sa.CheckConstraint("cantidad > 0 AND numero_linea > 0", name="ck_comprobante_linea_cantidad"),
        sa.CheckConstraint("precio_unitario >= 0 AND subtotal >= 0 AND descuento >= 0 AND total >= 0 AND total = subtotal - descuento", name="ck_comprobante_linea_importes"))
    op.create_index("ix_detalles_comprobante_id_comprobante", "detalles_comprobante", ["id_comprobante"])


def downgrade() -> None:
    op.drop_table("detalles_comprobante")
    op.drop_table("comprobantes")
    op.drop_table("series_comprobante")
    op.drop_table("tipos_comprobante")
    op.drop_table("emisores")
    op.drop_constraint("uq_venta_idempotencia", "ventas", type_="unique")
    op.drop_column("ventas", "hash_solicitud")
    op.drop_column("ventas", "clave_idempotencia")
    for column in ("direccion_fiscal", "razon_social", "tipo_persona"):
        op.drop_column("clientes", column)

    op.execute("UPDATE detalles_venta SET descuento_porcentaje = CASE WHEN subtotal_linea > 0 THEN ROUND(descuento_importe * 100 / subtotal_linea, 2) ELSE 0 END WHERE descuento_porcentaje IS NULL")
    op.alter_column("detalles_venta", "descuento_porcentaje", existing_type=sa.Numeric(5, 2), nullable=False)

    op.drop_index("ix_gastos_fecha", table_name="gastos")
    op.drop_table("gastos")
    op.drop_table("categorias_gasto")

    incompatible = op.get_bind().execute(sa.text("""
        SELECT EXISTS (SELECT 1 FROM inventarios WHERE stock_actual < 0)
        OR EXISTS (SELECT 1 FROM movimientos_inventario WHERE stock_anterior < 0 OR stock_posterior < 0)
        OR EXISTS (SELECT 1 FROM pagos GROUP BY id_venta HAVING COUNT(*) > 1)
    """)).scalar()
    if incompatible:
        raise RuntimeError("No se puede revertir: existen saldos negativos o ventas con varios pagos.")
    op.drop_index("ix_pagos_id_venta", table_name="pagos")
    op.create_unique_constraint("pagos_id_venta_key", "pagos", ["id_venta"])
    op.create_check_constraint("ck_movimiento_stocks_no_negativos", "movimientos_inventario", "stock_anterior >= 0 AND stock_posterior >= 0")
    op.create_check_constraint("ck_inventario_stock_no_negativo", "inventarios", "stock_actual >= 0")
    op.drop_column("productos", "controlar_stock")

    op.drop_constraint("uq_clientes_ruc", "clientes", type_="unique")
    op.drop_column("clientes", "telefono")
    op.drop_column("clientes", "correo")
    op.drop_column("clientes", "ruc")

    op.drop_index(op.f('ix_imagenes_productos_id_producto'), table_name='imagenes_productos')
    op.drop_table('imagenes_productos')

    op.drop_table('movimientos_inventario')
    op.drop_table('pagos')
    op.drop_table('detalles_venta')
    op.drop_table('ventas')
    op.drop_table('inventarios')
    op.drop_table('autorizaciones_ajuste_inventario')
    op.drop_table('usuarios')
    op.drop_table('productos')
    op.drop_table('roles')
    op.drop_table('clientes')
    op.drop_table('categorias')
