import { DashboardResponse } from '../../../core/models/dashboard.model';
import { CanalVenta } from '../../../core/models/sale.model';
import type { DashboardChartConfig } from '../components/dashboard-chart/dashboard-chart.component';

const money = (value: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
export const channelLabel = (channel: CanalVenta) =>
  channel === 'WHATSAPP' ? 'WhatsApp' : 'Presencial';
export const channelColor = (channel: CanalVenta) =>
  channel === 'WHATSAPP' ? '#008eb5' : '#2563eb';
export const monthLabel = (year: number, month: number, short = false) =>
  new Intl.DateTimeFormat('es-PE', { month: short ? 'short' : 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );

export function channelChart(data: DashboardResponse): DashboardChartConfig {
  return {
    type: 'doughnut',
    data: {
      labels: data.canales.map((c) => channelLabel(c.canal_venta)),
      datasets: [
        {
          data: data.canales.map((c) => Number(c.importe)),
          backgroundColor: data.canales.map((c) => channelColor(c.canal_venta)),
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '74%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.label}: ${money(Number(context.raw))} (${data.canales[context.dataIndex].porcentaje}%)`,
          },
        },
      },
    },
  };
}

export function balanceChart(data: DashboardResponse): DashboardChartConfig {
  return {
    type: 'line',
    data: {
      labels: data.balance_mensual.map((m) => monthLabel(m.anio, m.mes, true)),
      datasets: [
        {
          label: 'Balance',
          data: data.balance_mensual.map((m) => Number(m.balance)),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.09)',
          fill: 'origin',
          tension: 0,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4f46e5',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (context) => `Balance: ${money(Number(context.raw))}` } },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => money(Number(value)) },
          grid: {
            color: (context) =>
              context.tick.value === 0 ? '#94a3b8' : 'rgba(148, 163, 184, 0.15)',
          },
        },
        x: { grid: { display: false } },
      },
    },
  };
}
