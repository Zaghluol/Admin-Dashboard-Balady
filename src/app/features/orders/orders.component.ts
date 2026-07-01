import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/adminservice';
import { ToastService } from '@core/services/toast.service';
import type { Order, OrderStatus } from '@core/interfaces/Index';

const STATUS_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  Paid: 'Processing',
  Processing: 'Shipped',
  Shipped: 'Delivered',
};

const STATUSES: Array<OrderStatus | ''> = ['', 'PendingPayment', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Failed'];

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <header class="page-header">
        <div>
          <h1>Orders</h1>
          <p>Search, inspect details, and advance fulfillment status safely.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="loadOrders()" [disabled]="loading()">
          {{ loading() ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      <div class="panel toolbar">
        <label class="field">
          Search
          <input type="search" [(ngModel)]="search" (keyup.enter)="loadOrders(1)" placeholder="Order, customer, or email" />
        </label>
        <label class="field">
          Status
          <select [(ngModel)]="status" (change)="loadOrders(1)">
            @for (item of statuses; track item) {
              <option [value]="item">{{ item || 'All statuses' }}</option>
            }
          </select>
        </label>
        <button type="button" class="btn-secondary" (click)="loadOrders(1)">Apply</button>
      </div>

      <div class="orders-grid">
        <div class="panel table-wrap">
          @if (loading()) {
            <div class="empty-state">Loading orders...</div>
          } @else if (!orders().length) {
            <div class="empty-state">No orders found.</div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (order of orders(); track order.id) {
                  <tr [class.selected]="selectedOrder()?.id === order.id">
                    <td><strong>#{{ shortId(order.id) }}</strong></td>
                    <td>
                      <strong>{{ order.userFullName || 'Customer' }}</strong>
                      <small>{{ order.userEmail || order.userId }}</small>
                    </td>
                    <td>{{ order.totalAmount | currency:'USD':'symbol':'1.2-2' }}</td>
                    <td><span class="badge">{{ order.status }}</span></td>
                    <td>{{ order.createdAt | date:'mediumDate' }}</td>
                    <td>
                      <button type="button" class="btn-secondary" (click)="selectOrder(order)">Details</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <aside class="panel details">
          @if (detailsLoading()) {
            <div class="empty-state">Loading order details...</div>
          } @else if (selectedOrder(); as order) {
            <div class="details-head">
              <div>
                <h2>Order #{{ shortId(order.id) }}</h2>
                <p class="muted">{{ order.createdAt | date:'medium' }}</p>
              </div>
              <span class="badge">{{ order.status }}</span>
            </div>

            <section>
              <h3>Customer</h3>
              <p><strong>{{ order.userFullName || 'Customer' }}</strong></p>
              <p class="muted">{{ order.userEmail || 'No email' }}</p>
              <p class="muted">{{ order.phoneNumber || 'No phone number' }}</p>
            </section>

            <section>
              <h3>Shipping Address</h3>
              @if (order.shippingAddress; as address) {
                <p>{{ address.street }}</p>
                <p class="muted">{{ address.city }}, {{ address.state }} {{ address.zipCode }}</p>
                <p class="muted">{{ address.country }}</p>
              } @else {
                <p class="muted">No shipping address provided.</p>
              }
            </section>

            <section>
              <h3>Payment</h3>
              <p>{{ order.paymentStatus || (order.status === 'Paid' ? 'Paid' : 'Not paid') }}</p>
            </section>

            <section>
              <h3>Items</h3>
              @if (order.items?.length) {
                <div class="items">
                  @for (item of order.items; track item.productId) {
                    <div class="item-row">
                      <span>{{ item.productName }}</span>
                      <strong>{{ item.quantity }} x {{ item.unitPrice | currency:'USD':'symbol':'1.2-2' }}</strong>
                    </div>
                  }
                </div>
              } @else {
                <p class="muted">No items returned for this order.</p>
              }
            </section>

            <section>
              <h3>Status History</h3>
              @if (order.statusHistory?.length) {
                <ol class="history">
                  @for (entry of order.statusHistory; track entry.changedAt + entry.status) {
                    <li>
                      <strong>{{ entry.status }}</strong>
                      <span>{{ entry.changedAt | date:'short' }}</span>
                    </li>
                  }
                </ol>
              } @else {
                <p class="muted">No status history returned.</p>
              }
            </section>

            <section>
              <h3>Fulfillment</h3>
              @if (nextStatus(order.status); as next) {
                <button type="button" class="btn-primary" (click)="advanceStatus(order, next)" [disabled]="updatingStatus()">
                  Move to {{ next }}
                </button>
              } @else {
                <p class="muted">{{ statusHelp(order.status) }}</p>
              }
            </section>
          } @else {
            <div class="empty-state">Select an order to review customer, shipping, payment, and item details.</div>
          }
        </aside>
      </div>

      <div class="pagination">
        <button type="button" class="btn-secondary" (click)="loadOrders(page() - 1)" [disabled]="page() <= 1">Previous</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button type="button" class="btn-secondary" (click)="loadOrders(page() + 1)" [disabled]="page() >= totalPages()">Next</button>
      </div>
    </section>
  `,
  styles: [`
    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 15rem auto;
      gap: 0.75rem;
      align-items: end;
      margin-bottom: 1rem;
      padding: 1rem;
    }

    .orders-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(20rem, 28rem);
      gap: 1rem;
      align-items: start;
    }

    .table-wrap {
      overflow-x: auto;
    }

    tr.selected {
      background: rgba(99, 102, 241, 0.08);
    }

    td small,
    .details p {
      display: block;
      margin: 0;
    }

    .details {
      display: grid;
      gap: 1rem;
      padding: 1rem;
    }

    .details-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    h2,
    h3 {
      margin: 0;
    }

    h2 {
      font-size: 1.1rem;
    }

    h3 {
      margin-bottom: 0.35rem;
      color: var(--text-secondary);
      font-size: 0.82rem;
      text-transform: uppercase;
    }

    .items,
    .history {
      display: grid;
      gap: 0.5rem;
      padding: 0;
      margin: 0;
    }

    .item-row,
    .history li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-light);
    }

    .history {
      list-style: none;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1rem;
    }

    @media (max-width: 1100px) {
      .orders-grid,
      .toolbar {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class OrdersComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly statuses = STATUSES;
  protected search = '';
  protected status: OrderStatus | '' = '';
  protected readonly orders = signal<Order[]>([]);
  protected readonly selectedOrder = signal<Order | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly detailsLoading = signal(false);
  protected readonly updatingStatus = signal(false);

  ngOnInit() {
    this.loadOrders();
  }

  protected loadOrders(page = this.page()) {
    this.loading.set(true);
    this.admin.getOrders({
      search: this.search,
      status: this.status || undefined,
      page,
      pageSize: 10,
    }).subscribe({
      next: result => {
        this.orders.set(result.items);
        this.page.set(result.page);
        this.totalPages.set(Math.max(result.totalPages, 1));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.open('Orders could not be loaded.');
      },
    });
  }

  protected selectOrder(order: Order) {
    this.detailsLoading.set(true);
    this.admin.getOrder(order.id).subscribe({
      next: detail => {
        this.selectedOrder.set(detail);
        this.detailsLoading.set(false);
      },
      error: () => {
        this.selectedOrder.set(order);
        this.detailsLoading.set(false);
        this.toast.open('Full order details could not be loaded.');
      },
    });
  }

  protected nextStatus(status: OrderStatus): OrderStatus | null {
    return STATUS_FLOW[status] ?? null;
  }

  protected statusHelp(status: OrderStatus) {
    if (status === 'PendingPayment') return 'Pending payments can only become Paid through the payment webhook.';
    if (status === 'Delivered') return 'This order has already been delivered.';
    if (status === 'Cancelled' || status === 'Failed') return 'This order cannot be advanced.';
    return 'No valid admin transition is available.';
  }

  protected advanceStatus(order: Order, status: OrderStatus) {
    if (this.nextStatus(order.status) !== status) {
      this.toast.open('Invalid order status transition.');
      return;
    }

    this.updatingStatus.set(true);
    this.admin.updateOrderStatus(order.id, { status }).subscribe({
      next: () => {
        this.updatingStatus.set(false);
        this.toast.open(`Order moved to ${status}.`);
        this.loadOrders();
        this.selectOrder({ ...order, status });
      },
      error: () => {
        this.updatingStatus.set(false);
        this.toast.open('Order status could not be updated.');
      },
    });
  }

  protected shortId(id: string) {
    return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
  }
}
