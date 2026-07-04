import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '@core/services/adminservice';
import { ToastService } from '@core/services/toast.service';
import type { Category, CategoryPayload } from '@core/interfaces/Index';

@Component({
  selector: 'app-categories',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section>
      <header class="page-header">
        <div>
          <h1>Categories</h1>
          <p>Create and organize product categories with live product counts.</p>
        </div>
        <button type="button" class="btn-primary" (click)="startCreate()">New category</button>
      </header>

      <div class="panel toolbar">
        <label class="field">
          Search
          <input type="search" [(ngModel)]="search" (keyup.enter)="loadCategories(1)" placeholder="Category name" />
        </label>
        <button type="button" class="btn-secondary" (click)="loadCategories(1)">Search</button>
      </div>

      @if (editing()) {
        <form class="panel category-form" [formGroup]="categoryForm" (ngSubmit)="saveCategory()">
          <div class="form-head">
            <h2>{{ selectedCategory() ? 'Update category' : 'Create category' }}</h2>
            <button type="button" class="btn-ghost" (click)="cancelEdit()">Cancel</button>
          </div>
          <div class="form-grid">
            <label class="field">
              Name
              <input formControlName="name" />
            </label>
            <label class="check-field">
              <input type="checkbox" formControlName="isActive" />
              Active
            </label>
            <label class="field span-2">
              Description
              <textarea rows="3" formControlName="description"></textarea>
            </label>
          </div>
          <button type="submit" class="btn-primary" [disabled]="categoryForm.invalid || saving()">
            {{ saving() ? 'Saving...' : 'Save category' }}
          </button>
        </form>
      }

      <div class="panel table-wrap">
        @if (loading()) {
          <div class="empty-state">Loading categories...</div>
        } @else if (!categories().length) {
          <div class="empty-state">No categories found.</div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Products</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (category of categories(); track category.id) {
                <tr>
                  <td><strong>{{ category.name }}</strong></td>
                  <td class="muted">{{ category.description || 'No description' }}</td>
                  <td>{{ category.productCount ?? 0 }}</td>
                  <td><span class="badge">{{ category.isActive === false ? 'Inactive' : 'Active' }}</span></td>
                  <td class="row-actions">
                    <button type="button" class="btn-secondary" (click)="startEdit(category)">Edit</button>
                    <button type="button" class="btn-danger" (click)="deleteCategory(category)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="pagination">
        <button type="button" class="btn-secondary" (click)="loadCategories(page() - 1)" [disabled]="page() <= 1">Previous</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button type="button" class="btn-secondary" (click)="loadCategories(page() + 1)" [disabled]="page() >= totalPages()">Next</button>
      </div>
    </section>
  `,
  styles: [`
    .toolbar,
    .category-form {
      margin-bottom: 1rem;
      padding: 1rem;
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem;
      align-items: end;
    }

    .form-head,
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
      grid-template-columns: minmax(0, 1fr) auto;
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

    .table-wrap {
      overflow-x: auto;
    }

    .row-actions {
      white-space: nowrap;
    }

    .pagination {
      margin-top: 1rem;
    }

    @media (max-width: 760px) {
      .toolbar,
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .toolbar,
      .category-form {
        padding: 0.85rem;
      }

      .form-head,
      .pagination {
        display: grid;
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
export class CategoriesComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected search = '';
  protected readonly categories = signal<Category[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  protected readonly selectedCategory = signal<Category | null>(null);

  protected readonly categoryForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    isActive: [true],
  });

  ngOnInit() {
    this.loadCategories();
  }

  protected loadCategories(page = this.page()) {
    this.loading.set(true);
    this.admin.getCategories({ search: this.search, page, pageSize: 10 }).subscribe({
      next: result => {
        this.categories.set(result.items);
        this.page.set(result.page);
        this.totalPages.set(Math.max(result.totalPages, 1));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.open('Categories could not be loaded.');
      },
    });
  }

  protected startCreate() {
    this.selectedCategory.set(null);
    this.categoryForm.reset({ name: '', description: '', isActive: true });
    this.editing.set(true);
  }

  protected startEdit(category: Category) {
    this.selectedCategory.set(category);
    this.categoryForm.reset({
      name: category.name,
      description: category.description ?? '',
      isActive: category.isActive !== false,
    });
    this.editing.set(true);
  }

  protected cancelEdit() {
    this.editing.set(false);
    this.selectedCategory.set(null);
  }

  protected saveCategory() {
    if (this.categoryForm.invalid) return;

    const payload = this.categoryForm.getRawValue() satisfies CategoryPayload;
    const category = this.selectedCategory();
    this.saving.set(true);

    const request = category
      ? this.admin.updateCategory(category.id, payload)
      : this.admin.createCategory(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
        this.toast.open('Category saved.');
        this.loadCategories();
      },
      error: () => {
        this.saving.set(false);
        this.toast.open('Category could not be saved.');
      },
    });
  }

  protected deleteCategory(category: Category) {
    if (!window.confirm(`Delete ${category.name}?`)) return;

    this.admin.deleteCategory(category.id).subscribe({
      next: () => {
        this.toast.open('Category deleted.');
        this.loadCategories();
      },
      error: () => this.toast.open('Category could not be deleted.'),
    });
  }
}
