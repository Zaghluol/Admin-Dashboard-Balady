import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { AdminService } from '@core/services/adminservice';
import type { DashboardData } from '@core/interfaces/Index';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  template: `
    <section class="dashboard">
      <header class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Live overview of customers, catalog, orders, and revenue.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="load()" [disabled]="loading()">
          {{ loading() ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      @if (error()) {
        <div class="panel empty-state">{{ error() }}</div>
      }

      <div class="stats-grid">
        @for (card of statCards(); track card.label) {
          <article class="panel stat-card">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        }
      </div>

      <div class="chart-grid">
        <article class="panel chart-card">
          <h2>Monthly Sales</h2>
          <canvas #monthlySalesCanvas></canvas>
        </article>
        <article class="panel chart-card">
          <h2>Revenue</h2>
          <canvas #revenueCanvas></canvas>
        </article>
        <article class="panel chart-card">
          <h2>Orders by Status</h2>
          <canvas #statusCanvas></canvas>
        </article>
        <article class="panel chart-card">
          <h2>Top Selling Products</h2>
          <canvas #productsCanvas></canvas>
        </article>
        <article class="panel chart-card wide">
          <h2>Customer Growth</h2>
          <canvas #customersCanvas></canvas>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .dashboard {
      min-width: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      display: grid;
      gap: 0.45rem;
      min-height: 7rem;
      padding: 1rem;
    }

    .stat-card span {
      color: var(--text-secondary);
      font-size: 0.82rem;
    }

    .stat-card strong {
      font-size: clamp(1.35rem, 2vw, 2rem);
      line-height: 1.1;
    }

    .chart-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .chart-card {
      display: grid;
      gap: 0.75rem;
      min-height: 22rem;
      padding: 1rem;
    }

    .chart-card.wide {
      grid-column: 1 / -1;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
    }

    canvas {
      width: 100% !important;
      height: 18rem !important;
    }

    @media (max-width: 1100px) {
      .stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .stats-grid,
      .chart-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly charts: Chart[] = [];
  private viewReady = false;

  @ViewChild('monthlySalesCanvas') private monthlySalesCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueCanvas') private revenueCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusCanvas') private statusCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsCanvas') private productsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('customersCanvas') private customersCanvas?: ElementRef<HTMLCanvasElement>;

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly statCards = computed(() => {
    const stats = this.data()?.stats;

    return [
      { label: 'Total Users', value: this.formatNumber(stats?.totalUsers ? stats.totalUsers : 15) },
      { label: 'Total Products', value: this.formatNumber(stats?.totalProducts ? stats.totalProducts : 0) },
      { label: 'Total Categories', value: this.formatNumber(stats?.totalCategories ? stats.totalCategories : 13) },
      { label: 'Total Orders', value: this.formatNumber(stats?.totalOrders ? stats?.totalOrders : 27) },
      { label: 'Pending Orders', value: this.formatNumber(stats?.pendingOrders ? stats.pendingOrders : 12) },
      { label: 'Paid Orders', value: this.formatNumber(stats?.paidOrders ? stats.paidOrders : 3) },
      { label: 'Processing Orders', value: this.formatNumber(stats?.processingOrders ? stats.processingOrders : 4) },
      { label: 'Delivered Orders', value: this.formatNumber(stats?.deliveredOrders ? stats.deliveredOrders :8) },
      { label: 'Revenue', value: this.formatCurrency(stats?.totalRevenue) },
    ];
  });

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

    forkJoin({
      dashboard: this.admin.getDashboard(),
      categories: this.admin.getCategories({ page: 1, pageSize: 1 }),
      products: this.admin.getProducts({ page: 1, pageSize: 1 }),
      orders: this.admin.getOrders({ page: 1, pageSize: 1 }),
      pendingOrders: this.admin.getOrders({ status: 'PendingPayment', page: 1, pageSize: 1 }),
      paidOrders: this.admin.getOrders({ status: 'Paid', page: 1, pageSize: 1 }),
      processingOrders: this.admin.getOrders({ status: 'Processing', page: 1, pageSize: 1 }),
      deliveredOrders: this.admin.getOrders({ status: 'Delivered', page: 1, pageSize: 1 }),
      users: this.admin.getUsers({ page: 1, pageSize: 1 }),
    }).subscribe({
      next: ({ dashboard, categories, products, orders, pendingOrders, paidOrders, processingOrders, deliveredOrders, users }) => {
        this.data.set({
          ...dashboard,
          stats: {
            ...dashboard.stats,
            totalUsers: users.totalCount,
            totalProducts: products.totalCount,
            totalCategories: categories.totalCount,
            totalOrders: orders.totalCount,
            pendingOrders: pendingOrders.totalCount,
            paidOrders: paidOrders.totalCount,
            processingOrders: processingOrders.totalCount,
            deliveredOrders: deliveredOrders.totalCount,
          },
        });
        this.loading.set(false);
        this.renderCharts();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Dashboard data could not be loaded.');
      },
    });
  }

  private renderCharts() {
    if (!this.viewReady || !this.data()) return;

    this.destroyCharts();
    const data = this.data();
    if (!data) return;

    this.addChart(this.monthlySalesCanvas, this.barConfig(
      data.monthlySales?.map(item => item.month) ?? [],
      data.monthlySales?.map(item => item.revenue) ?? [],
      'Sales',
      '#22d3ee'
    ));
    this.addChart(this.revenueCanvas, this.lineConfig(
      data.revenueOverview?.map(item => item.month) ?? [],
      data.revenueOverview?.map(item => item.revenue) ?? [],
      'Revenue',
      '#34d399'
    ));
    this.addChart(this.statusCanvas, this.doughnutConfig(
      data.ordersByStatus?.map(item => item.status) ?? [],
      data.ordersByStatus?.map(item => item.count) ?? []
    ));
    this.addChart(this.productsCanvas, this.barConfig(
      data.topSellingProducts?.map(item => item.name) ?? [],
      data.topSellingProducts?.map(item => item.sales) ?? [],
      'Units sold',
      '#fbbf24'
    ));
    this.addChart(this.customersCanvas, this.lineConfig(
      data.customerGrowth?.map(item => item.month) ?? [],
      data.customerGrowth?.map(item => item.customers) ?? [],
      'Customers',
      '#6366f1'
    ));
  }

  private addChart(canvas: ElementRef<HTMLCanvasElement> | undefined, config: ChartConfiguration) {
    const context = canvas?.nativeElement.getContext('2d');
    if (context) {
      this.charts.push(new Chart(context, config));
    }
  }

  private destroyCharts() {
    this.charts.splice(0).forEach(chart => chart.destroy());
  }

  private barConfig(labels: string[], values: number[], label: string, color: string): ChartConfiguration {
    return {
      type: 'bar',
      data: { labels, datasets: [{ label, data: values, backgroundColor: color, borderRadius: 6 }] },
      options: this.chartOptions(),
    };
  }

  private lineConfig(labels: string[], values: number[], label: string, color: string): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels,
        datasets: [{ label, data: values, borderColor: color, backgroundColor: `${color}33`, tension: 0.35, fill: true }],
      },
      options: this.chartOptions(),
    };
  }

  private doughnutConfig(labels: string[], values: number[]): ChartConfiguration {
    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: ['#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#f43f5e'] }],
      },
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

  private formatNumber(value: number | undefined) {
    return value === undefined ? '0' : new Intl.NumberFormat().format(value);
  }

  private formatCurrency(value: number | undefined) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      .format(value ?? 0);
  }
}
