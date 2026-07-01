import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AdminService } from '@core/services/adminservice';
import type { AnalyticsData } from '@core/interfaces/Index';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  imports: [CommonModule],
  template: `
    <section>
      <header class="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Revenue, orders, sales, category, product, and customer performance.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="load()" [disabled]="loading()">
          {{ loading() ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      @if (data(); as analytics) {
        <div class="kpi-grid">
          <article class="panel kpi"><span>Revenue</span><strong>{{ analytics.totalRevenue | currency:'USD':'symbol':'1.0-0' }}</strong></article>
          <article class="panel kpi"><span>Orders</span><strong>{{ analytics.totalOrders }}</strong></article>
          <article class="panel kpi"><span>Customers</span><strong>{{ analytics.totalCustomers }}</strong></article>
          <article class="panel kpi"><span>Conversion</span><strong>{{ analytics.conversionRate }}%</strong></article>
        </div>
      } @else if (error()) {
        <div class="panel empty-state">{{ error() }}</div>
      }

      <div class="chart-grid">
        <article class="panel chart-card"><h2>Revenue</h2><canvas #revenueCanvas></canvas></article>
        <article class="panel chart-card"><h2>Orders</h2><canvas #ordersCanvas></canvas></article>
        <article class="panel chart-card"><h2>Weekly Sales</h2><canvas #weeklyCanvas></canvas></article>
        <article class="panel chart-card"><h2>Top Categories</h2><canvas #categoriesCanvas></canvas></article>
        <article class="panel chart-card"><h2>Best Selling Products</h2><canvas #productsCanvas></canvas></article>
        <article class="panel chart-card"><h2>Top Customers</h2><canvas #customersCanvas></canvas></article>
      </div>
    </section>
  `,
  styles: [`
    .kpi-grid,
    .chart-grid {
      display: grid;
      gap: 1rem;
    }

    .kpi-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 1rem;
    }

    .kpi {
      padding: 1rem;
    }

    .kpi span {
      color: var(--text-secondary);
    }

    .kpi strong {
      display: block;
      font-size: 1.6rem;
    }

    .chart-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .chart-card {
      display: grid;
      gap: 0.75rem;
      min-height: 22rem;
      padding: 1rem;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
    }

    canvas {
      width: 100% !important;
      height: 18rem !important;
    }

    @media (max-width: 980px) {
      .kpi-grid,
      .chart-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly charts: Chart[] = [];
  private viewReady = false;

  @ViewChild('revenueCanvas') private revenueCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersCanvas') private ordersCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('weeklyCanvas') private weeklyCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoriesCanvas') private categoriesCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsCanvas') private productsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('customersCanvas') private customersCanvas?: ElementRef<HTMLCanvasElement>;

  protected readonly data = signal<AnalyticsData | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  protected load() {
    this.loading.set(true);
    this.error.set(null);
    this.admin.getAnalytics().subscribe({
      next: data => {
        this.data.set(data);
        this.loading.set(false);
        this.renderCharts();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Analytics data could not be loaded.');
      },
    });
  }

  private renderCharts() {
    if (!this.viewReady || !this.data()) return;
    this.destroyCharts();

    const data = this.data();
    if (!data) return;

    this.addChart(this.revenueCanvas, this.lineConfig(
      data.revenueByMonth.map(item => item.month),
      data.revenueByMonth.map(item => item.revenue),
      'Revenue',
      '#34d399'
    ));
    this.addChart(this.ordersCanvas, this.lineConfig(
      data.ordersByMonth.map(item => item.month),
      data.ordersByMonth.map(item => item.orders),
      'Orders',
      '#22d3ee'
    ));
    this.addChart(this.weeklyCanvas, this.barConfig(
      data.weeklySales?.map(item => item.week) ?? [],
      data.weeklySales?.map(item => item.sales) ?? [],
      'Weekly sales',
      '#6366f1'
    ));
    this.addChart(this.categoriesCanvas, this.barConfig(
      data.topCategories?.map(item => item.name) ?? [],
      data.topCategories?.map(item => item.sales) ?? [],
      'Sales',
      '#fbbf24'
    ));
    this.addChart(this.productsCanvas, this.barConfig(
      data.topProducts.map(item => item.name),
      data.topProducts.map(item => item.sales),
      'Units sold',
      '#f43f5e'
    ));
    this.addChart(this.customersCanvas, this.barConfig(
      data.topCustomers?.map(item => item.name) ?? [],
      data.topCustomers?.map(item => item.spending) ?? [],
      'Spending',
      '#22d3ee'
    ));
  }

  private addChart(canvas: ElementRef<HTMLCanvasElement> | undefined, config: ChartConfiguration) {
    const context = canvas?.nativeElement.getContext('2d');
    if (context) this.charts.push(new Chart(context, config));
  }

  private destroyCharts() {
    this.charts.splice(0).forEach(chart => chart.destroy());
  }

  private lineConfig(labels: string[], values: number[], label: string, color: string): ChartConfiguration {
    return {
      type: 'line',
      data: { labels, datasets: [{ label, data: values, borderColor: color, backgroundColor: `${color}33`, tension: 0.35, fill: true }] },
      options: this.chartOptions(),
    };
  }

  private barConfig(labels: string[], values: number[], label: string, color: string): ChartConfiguration {
    return {
      type: 'bar',
      data: { labels, datasets: [{ label, data: values, backgroundColor: color, borderRadius: 6 }] },
      options: this.chartOptions(),
    };
  }

  private chartOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#f1f5f9' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    };
  }
}
