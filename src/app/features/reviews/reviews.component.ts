import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/adminservice';
import { ToastService } from '@core/services/toast.service';
import type { Product, Review } from '@core/interfaces/Index';

@Component({
  selector: 'app-reviews',
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <header class="page-header">
        <div>
          <h1>Reviews</h1>
          <p>Moderate product feedback and watch rating distribution.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="loadReviews()" [disabled]="loading()">
          {{ loading() ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      <div class="stats-grid">
        <article class="panel stat"><span>Average rating</span><strong>{{ averageRating() }}</strong></article>
        <article class="panel stat"><span>Total reviews</span><strong>{{ totalCount() }}</strong></article>
        <article class="panel stat"><span>5-star reviews</span><strong>{{ fiveStarCount() }}</strong></article>
      </div>

      <div class="panel toolbar">
        <label class="field">
          Search
          <input type="search" [(ngModel)]="search" (keyup.enter)="loadReviews(1)" placeholder="Customer, product, or comment" />
        </label>
        <label class="field">
          Product
          <select [(ngModel)]="productId" (change)="loadReviews(1)">
            <option value="">All products</option>
            @for (product of products(); track product.id) {
              <option [value]="product.id">{{ product.name }}</option>
            }
          </select>
        </label>
        <button type="button" class="btn-secondary" (click)="loadReviews(1)">Apply</button>
      </div>

      <div class="panel table-wrap">
        @if (loading()) {
          <div class="empty-state">Loading reviews...</div>
        } @else if (!reviews().length) {
          <div class="empty-state">No reviews found.</div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Rating</th>
                <th>Product</th>
                <th>Customer</th>
                <th>Comment</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (review of reviews(); track review.id) {
                <tr>
                  <td><span class="badge">{{ review.rating }}/5</span></td>
                  <td>{{ review.productName }}</td>
                  <td>{{ review.userFullName }}</td>
                  <td class="comment">{{ review.comment }}</td>
                  <td>{{ review.createdAt | date:'mediumDate' }}</td>
                  <td><button type="button" class="btn-danger" (click)="deleteReview(review)">Delete</button></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="pagination">
        <button type="button" class="btn-secondary" (click)="loadReviews(page() - 1)" [disabled]="page() <= 1">Previous</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button type="button" class="btn-secondary" (click)="loadReviews(page() + 1)" [disabled]="page() >= totalPages()">Next</button>
      </div>
    </section>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat {
      padding: 1rem;
    }

    .stat span {
      display: block;
      color: var(--text-secondary);
    }

    .stat strong {
      font-size: 1.75rem;
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 18rem auto;
      gap: 0.75rem;
      align-items: end;
      margin-bottom: 1rem;
      padding: 1rem;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .comment {
      max-width: 28rem;
      color: var(--text-secondary);
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1rem;
    }

    @media (max-width: 900px) {
      .stats-grid,
      .toolbar {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .stat,
      .toolbar {
        padding: 0.85rem;
      }

      .comment {
        max-width: 18rem;
      }

      .pagination {
        display: grid;
      }

      .pagination .btn-secondary {
        width: 100%;
      }
    }
  `],
})
export class ReviewsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected search = '';
  protected productId = '';
  protected readonly products = signal<Product[]>([]);
  protected readonly reviews = signal<Review[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly averageRating = computed(() => {
    const items = this.reviews();
    if (!items.length) return '0.0';
    return (items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(1);
  });
  protected readonly fiveStarCount = computed(() => this.reviews().filter(review => review.rating === 5).length);

  ngOnInit() {
    this.loadProducts();
    this.loadReviews();
  }

  protected loadReviews(page = this.page()) {
    this.loading.set(true);
    this.admin.getReviews({ search: this.search, productId: this.productId, page, pageSize: 10 }).subscribe({
      next: result => {
        this.reviews.set(result.items);
        this.page.set(result.page);
        this.totalPages.set(Math.max(result.totalPages, 1));
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.open('Reviews could not be loaded.');
      },
    });
  }

  protected deleteReview(review: Review) {
    if (!window.confirm(`Delete review for ${review.productName}?`)) return;

    this.admin.deleteReview(review.id).subscribe({
      next: () => {
        this.toast.open('Review deleted.');
        this.loadReviews();
      },
      error: () => this.toast.open('Review could not be deleted.'),
    });
  }

  private loadProducts() {
    this.admin.getProducts({ page: 1, pageSize: 100 }).subscribe({
      next: result => this.products.set(result.items),
      error: () => this.toast.open('Products could not be loaded for review filters.'),
    });
  }
}
