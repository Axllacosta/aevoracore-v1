import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardFacade } from '../../data-access/dashboard.facade';
import { DashboardResponse } from '../../../../core/models/dashboard.model';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { balanceChart, channelChart } from '../../utils/dashboard-charts';

const data: DashboardResponse = {
  anio: 2027,
  mes: 1,
  generado_en: '2027-01-08T18:00:00Z',
  ranking_desde: '2026-11-01',
  ranking_hasta: '2027-01-31',
  kpis: {
    ventas_totales: 105,
    productos_vendidos: 210,
    ingresos: '30.00',
    egresos: '40.00',
    balance: '-10.00',
  },
  canales: [
    { canal_venta: 'PRESENCIAL', importe: '20.00', porcentaje: '66.67' },
    { canal_venta: 'WHATSAPP', importe: '10.00', porcentaje: '33.33' },
  ],
  productos_mas_vendidos: [
    { id_producto: 1, sku: 'MESA', nombre: 'Mesa', unidades_vendidas: 210, importe: '30.00' },
  ],
  balance_mensual: [8, 9, 10, 11, 12, 1].map((mes, index) => ({
    anio: mes === 1 ? 2027 : 2026,
    mes,
    ingresos: index === 5 ? '30.00' : '0.00',
    egresos: index === 5 ? '40.00' : '0.00',
    balance: index === 5 ? '-10.00' : '0.00',
  })),
};

describe('Dashboard complete reporting data', () => {
  let facade: DashboardFacade;
  let requests: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DashboardFacade],
    });
    facade = TestBed.inject(DashboardFacade);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());
  it('uses complete server statistics without loading paginated sales or inventory', async () => {
    const pending = facade.load();
    requests.expectOne(API_BASE_URL + '/dashboard').flush(data);
    await pending;
    expect(facade.data()?.kpis.ventas_totales).toBe(105);
    expect(facade.data()?.kpis.productos_vendidos).toBe(210);
    expect(facade.data()?.kpis.balance).toBe('-10.00');
    expect(facade.data()?.balance_mensual).toHaveLength(6);
    expect(facade.loading()).toBe(false);
    requests.expectNone((r) => r.url.endsWith('/sales') || r.url.endsWith('/inventory'));
  });
  it('shows unavailable data rather than zero figures when refreshing fails, and supports retry', async () => {
    let pending = facade.load();
    requests.expectOne(API_BASE_URL + '/dashboard').flush(data);
    await pending;
    pending = facade.load();
    expect(facade.data()).toBeNull();
    requests
      .expectOne(API_BASE_URL + '/dashboard')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await pending;
    expect(facade.data()).toBeNull();
    expect(facade.error()).not.toBe('');
    expect(facade.loading()).toBe(false);
    pending = facade.load();
    requests.expectOne(API_BASE_URL + '/dashboard').flush(data);
    await pending;
    expect(facade.error()).toBe('');
    expect(facade.data()).not.toBeNull();
  });
});

describe('Chart.js dashboard series', () => {
  it('uses channel revenue as donut weights in soles, with percentages from the server', () => {
    const chart = channelChart(data);
    expect(chart.type).toBe('doughnut');
    expect(chart.data.labels).toEqual(['Presencial', 'WhatsApp']);
    expect(chart.data.datasets[0].data).toEqual([20, 10]);
    expect(data.canales.map((c) => c.porcentaje)).toEqual(['66.67', '33.33']);
  });
  it('keeps six chronological monthly balances, zeros and negative values across years', () => {
    const chart = balanceChart(data);
    expect(chart.type).toBe('line');
    expect(chart.data.datasets[0].data).toEqual([0, 0, 0, 0, 0, -10]);
    expect(chart.data.labels).toHaveLength(6);
    expect(chart.data.labels?.[0]).toContain('2026');
    expect(chart.data.labels?.[5]).toContain('2027');
    expect(chart.options?.scales?.['y']).toMatchObject({ beginAtZero: true });
  });
});
