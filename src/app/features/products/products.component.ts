import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/adminservice';
import { ToastService } from '@core/services/toast.service';
import type { Category, Product, ProductPayload } from '@core/interfaces/Index';

@Component({
  selector: 'app-products',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section>
      <header class="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage catalog items, pricing, inventory, categories, and images.</p>
        </div>
        <button type="button" class="btn-primary" (click)="startCreate()">New product</button>
      </header>

      <div class="panel toolbar">
        <label class="field">
          Search
          <input type="search" [(ngModel)]="search" (keyup.enter)="loadProducts(1)" placeholder="Name or description" />
        </label>
        <label class="field">
          Category
          <select [(ngModel)]="categoryId" (change)="loadProducts(1)">
            <option value="">All categories</option>
            @for (category of categories(); track category.id) {
              <option [value]="category.id">{{ category.name }}</option>
            }
          </select>
        </label>
        <label class="field">
          Sort
          <select [(ngModel)]="sortBy" (change)="loadProducts(1)">
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="createdAt">Created date</option>
          </select>
        </label>
        <button type="button" class="btn-secondary" (click)="toggleSort()">
          {{ sortDirection() === 'asc' ? 'Ascending' : 'Descending' }}
        </button>
        <button type="button" class="btn-secondary" (click)="loadProducts(1)">Apply</button>
      </div>

      @if (editing()) {
        <form class="panel product-form" [formGroup]="productForm" (ngSubmit)="saveProduct()">
          <div class="form-head">
            <h2>{{ selectedProduct() ? 'Update product' : 'Create product' }}</h2>
            <button type="button" class="btn-ghost" (click)="cancelEdit()">Cancel</button>
          </div>

          <div class="form-grid">
            <label class="field">
              Name
              <input formControlName="name" />
            </label>
            <label class="field">
              Category
              <select formControlName="categoryId">
                <option value="">Select category</option>
                @for (category of categories(); track category.id) {
                  <option [value]="category.id">{{ category.name }}</option>
                }
              </select>
            </label>
            <label class="field">
              Price
              <input type="number" min="0" step="0.01" formControlName="price" />
            </label>
            <label class="field">
              Stock
              <input type="number" min="0" step="1" formControlName="stockQuantity" />
            </label>
            <label class="field span-2">
              Description
              <textarea rows="3" formControlName="description"></textarea>
            </label>
            <label class="field">
              Image
              <input type="file" accept="image/*" (change)="selectImage($event)" />
            </label>
            <label class="check-field">
              <input type="checkbox" formControlName="isActive" />
              Active
            </label>
          </div>

          @if (imagePreview()) {
            <img class="preview" [src]="imagePreview()" alt="Selected product preview" />
          }

          <div class="actions">
            <button type="submit" class="btn-primary" [disabled]="productForm.invalid || saving()">
              {{ saving() ? 'Saving...' : 'Save product' }}
            </button>
          </div>
        </form>
      }

      <div class="panel table-wrap">
        @if (loading()) {
          <div class="empty-state">Loading products...</div>
        } @else if (!products().length) {
          <div class="empty-state">No products found.</div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (product of products(); track product.id) {
                <tr>
                  <td>
                    <div class="product-cell">
                      @if (product.imageUrl) {
                        <img [src]="product.imageUrl" [alt]="product.name" />
                      }
                      <div>
                        <strong>{{ product.name }}</strong>
                        <small>{{ product.description || 'No description' }}</small>
                      </div>
                    </div>
                  </td>
                  <td>{{ product.categoryName || 'Unassigned' }}</td>
                  <td>{{ product.price | currency:'USD':'symbol':'1.2-2' }}</td>
                  <td>{{ product.stockQuantity ?? 0 }}</td>
                  <td><span class="badge">{{ product.isActive === false ? 'Inactive' : 'Active' }}</span></td>
                  <td class="row-actions">
                    <button type="button" class="btn-secondary" (click)="startEdit(product)">Edit</button>
                    <button type="button" class="btn-danger" (click)="deleteProduct(product)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="pagination">
        <button type="button" class="btn-secondary" (click)="loadProducts(page() - 1)" [disabled]="page() <= 1">Previous</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button type="button" class="btn-secondary" (click)="loadProducts(page() + 1)" [disabled]="page() >= totalPages()">Next</button>
      </div>
    </section>
  `,
  styles: [`
    .toolbar,
    .product-form {
      margin-bottom: 1rem;
      padding: 1rem;
    }

    .toolbar {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr auto auto;
      gap: 0.75rem;
      align-items: end;
    }

    .form-head,
    .actions,
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .form-head h2 {
      margin: 0;
      font-size: 1.1rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
      margin: 1rem 0;
    }

    .span-2 {
      grid-column: 1 / -1;
    }

    .check-field {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
    }

    .preview {
      width: 9rem;
      height: 9rem;
      object-fit: cover;
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .product-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 16rem;
    }

    .product-cell img {
      width: 3rem;
      height: 3rem;
      border-radius: 8px;
      object-fit: cover;
      background: var(--bg-surface);
    }

    .product-cell strong,
    .product-cell small {
      display: block;
    }

    .product-cell small {
      max-width: 24rem;
      color: var(--text-secondary);
    }

    .row-actions {
      white-space: nowrap;
    }

    .pagination {
      margin-top: 1rem;
    }

    @media (max-width: 980px) {
      .toolbar,
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .toolbar,
      .product-form {
        padding: 0.85rem;
      }

      .form-head,
      .actions,
      .pagination {
        display: grid;
      }

      .preview {
        width: min(100%, 12rem);
        height: auto;
        aspect-ratio: 1;
      }

      .product-cell {
        min-width: 13rem;
      }

      .product-cell small {
        max-width: 16rem;
      }

      .row-actions {
        white-space: normal;
      }

      .row-actions .btn-secondary,
      .row-actions .btn-danger,
      .pagination .btn-secondary {
        width: 100%;
      }
    }
  `],
})
export class ProductsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected search = '';
  protected categoryId = '';
  protected sortBy = 'name';
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  private imageFile: File | null = null;

  protected readonly productForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    stockQuantity: [0, [Validators.min(0)]],
    categoryId: ['', Validators.required],
    isActive: [true],
  });

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
  }

  protected loadProducts(page = this.page()) {
    this.loading.set(true);
    this.admin.getProducts({
      search: this.search,
      categoryId: this.categoryId,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection(),
      page,
      pageSize: 10,
    }).subscribe({
      next: result => {
        this.products.set(result.items);
        this.page.set(result.page);
        this.totalPages.set(Math.max(result.totalPages, 1));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.open('Products could not be loaded.');
      },
    });
  }

  protected toggleSort() {
    this.sortDirection.update(value => value === 'asc' ? 'desc' : 'asc');
    this.loadProducts(1);
  }

  protected startCreate() {
    this.selectedProduct.set(null);
    this.imageFile = null;
    this.imagePreview.set(null);
    this.productForm.reset({ name: '', description: '', price: 0, stockQuantity: 0, categoryId: '', isActive: true });
    this.editing.set(true);
  }

  protected startEdit(product: Product) {
    this.selectedProduct.set(product);
    this.imageFile = null;
    this.imagePreview.set(product.imageUrl ?? null);
    this.productForm.reset({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      stockQuantity: product.stockQuantity ?? 0,
      categoryId: product.categoryId,
      isActive: product.isActive !== false,
    });
    this.editing.set(true);
  }

  protected cancelEdit() {
    this.editing.set(false);
    this.selectedProduct.set(null);
    this.imageFile = null;
    this.imagePreview.set(null);
  }

  protected selectImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageFile = file;
    this.imagePreview.set(file ? URL.createObjectURL(file) : this.selectedProduct()?.imageUrl ?? null);
  }

  protected saveProduct() {
    if (this.productForm.invalid) return;

    const payload = this.productForm.getRawValue() satisfies ProductPayload;
    const product = this.selectedProduct();
    this.saving.set(true);

    const request = product
      ? this.admin.updateProduct(product.id, payload, this.imageFile)
      : this.admin.createProduct(payload, this.imageFile);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
        this.toast.open('Product saved.');
        this.loadProducts();
      },
      error: () => {
        this.saving.set(false);
        this.toast.open('Product could not be saved.');
      },
    });
  }

  protected deleteProduct(product: Product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;

    this.admin.deleteProduct(product.id).subscribe({
      next: () => {
        this.toast.open('Product deleted.');
        this.loadProducts();
      },
      error: () => this.toast.open('Product could not be deleted.'),
    });
  }

  private loadCategories() {
    this.admin.getCategories({ page: 1, pageSize: 100 }).subscribe({
      next: result => this.categories.set(result.items),
      error: () => this.toast.open('Categories could not be loaded.'),
    });
  }
}
