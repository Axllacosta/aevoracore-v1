import { TestBed } from '@angular/core/testing';
import Chart from 'chart.js/auto';
import { DashboardChart, DashboardChartConfig } from './dashboard-chart.component';

vi.mock('chart.js/auto', () => ({
  default: vi.fn(
    class {
      destroy = vi.fn();
    },
  ),
}));

describe('Dashboard chart lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ imports: [DashboardChart] });
  });
  const config = (): DashboardChartConfig => ({
    type: 'doughnut',
    data: { labels: ['Presencial', 'WhatsApp'], datasets: [{ data: [20, 10] }] },
  });

  it('creates Chart.js after the canvas is available and releases it when removed', async () => {
    const fixture = TestBed.createComponent(DashboardChart);
    fixture.componentRef.setInput('config', config());
    fixture.componentRef.setInput('label', 'Ingresos por canal');
    await fixture.whenStable();
    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas.getAttribute('aria-label')).toBe('Ingresos por canal');
    expect(Chart).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Chart).mock.calls[0][0]).toBe(canvas);
    const chart = vi.mocked(Chart).mock.results[0].value;
    fixture.destroy();
    expect(chart.destroy).toHaveBeenCalledOnce();
  });
  it('releases the previous chart before displaying refreshed data', async () => {
    const fixture = TestBed.createComponent(DashboardChart);
    fixture.componentRef.setInput('config', config());
    fixture.componentRef.setInput('label', 'Ingresos por canal');
    await fixture.whenStable();
    const original = vi.mocked(Chart).mock.results[0].value;
    fixture.componentRef.setInput('config', {
      ...config(),
      data: { labels: ['Presencial', 'WhatsApp'], datasets: [{ data: [0, 30] }] },
    });
    await fixture.whenStable();
    expect(original.destroy).toHaveBeenCalledOnce();
    expect(Chart).toHaveBeenCalledTimes(2);
    const latest = vi.mocked(Chart).mock.results[1].value;
    fixture.destroy();
    expect(latest.destroy).toHaveBeenCalledOnce();
  });
});
