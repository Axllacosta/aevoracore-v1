import { Component, computed, inject } from '@angular/core';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { DashboardFacade } from '../../data-access/dashboard.facade';
import { DashboardChart } from '../../components/dashboard-chart/dashboard-chart.component';
import {
  balanceChart,
  channelChart,
  channelColor,
  channelLabel,
  monthLabel,
} from '../../utils/dashboard-charts';

@Component({
  selector: 'app-dashboard',
  imports: [...UI, DashboardChart],
  providers: [DashboardFacade],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class Dashboard {
  readonly facade = inject(DashboardFacade);
  readonly channelLabel = channelLabel;
  readonly channelColor = channelColor;
  readonly monthLabel = monthLabel;
  readonly donut = computed(() => {
    const data = this.facade.data();
    return data ? channelChart(data) : null;
  });
  readonly trend = computed(() => {
    const data = this.facade.data();
    return data ? balanceChart(data) : null;
  });
  readonly hasRevenue = computed(() => Number(this.facade.data()?.kpis.ingresos ?? 0) > 0);
  readonly negativeBalance = computed(() => Number(this.facade.data()?.kpis.balance ?? 0) < 0);
  constructor() {
    void this.facade.load();
  }
}
