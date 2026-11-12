import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  input,
  viewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';

export type DashboardChartConfig = ChartConfiguration<'doughnut' | 'line', number[], string>;

@Component({
  selector: 'app-dashboard-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-chart.component.html',
  styleUrl: './dashboard-chart.component.scss',
})
export class DashboardChart implements AfterViewInit, OnChanges, OnDestroy {
  readonly config = input.required<DashboardChartConfig>();
  readonly label = input.required<string>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'doughnut' | 'line', number[], string>;

  ngAfterViewInit() {
    this.render();
  }
  ngOnChanges() {
    if (this.chart) this.render();
  }
  private render() {
    this.chart?.destroy();
    this.chart = new Chart(this.canvas().nativeElement, this.config());
  }
  ngOnDestroy() {
    this.chart?.destroy();
  }
}
