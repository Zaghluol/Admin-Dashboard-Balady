import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '@env/environment';
import type {
  DashboardData, Order, AdminUser, Review, Product, ProductPayload, Category, CategoryPayload,
  PaginatedResult, UpdateOrderStatusRequest, AnalyticsData
} from '@core/interfaces/Index';

type RawRecord = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private adminBase = `${environment.apiUrl}/admin`;
  private productBase = `${environment.apiUrl}/Product`;
  private categoryBase = `${environment.apiUrl}/Category`;
  private reviewsBase = `${environment.apiUrl}/reviews`;
  private ordersBase = `${environment.apiUrl}/Orders`;

  // Dashboard
  getDashboard() {
    return this.http.get<unknown>(`${this.adminBase}/dashboard`).pipe(
      map(data => this.toDashboardData(data))
    );
  }

  // Analytics
  getAnalytics() {
    return this.http.get<DashboardData>(`${this.adminBase}/dashboard`).pipe(
      map(data => this.toAnalyticsData(data))
    );
  }

  // Products
  getProducts(params?: {
    search?: string;
    categoryId?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }) {
    return this.http.get<unknown>(`${this.productBase}/search`, {
      params: this.toParams({
        Name: params?.search,
        Category: params?.categoryId,
        SortBy: params?.sortBy,
        SortDirection: params?.sortDirection,
        Page: params?.page,
        PageSize: params?.pageSize,
      }),
    }).pipe(map(result => this.toPaginatedResult(result, item => this.toProduct(item), params?.page, params?.pageSize)));
  }

  getProduct(id: string) {
    return this.http.get<unknown>(`${this.productBase}/${id}`).pipe(
      map(product => this.toProduct(product))
    );
  }

  createProduct(payload: ProductPayload, image?: File | null) {
    return this.http.post<unknown>(this.productBase, this.toProductDto(payload, image)).pipe(
      map(product => this.toProduct(product))
    );
  }

  updateProduct(id: string, payload: ProductPayload, image?: File | null) {
    return this.http.put<unknown>(`${this.productBase}/${id}`, this.toProductDto(payload, image)).pipe(
      map(product => this.toProduct(product))
    );
  }

  deleteProduct(id: string) {
    return this.http.delete<void>(`${this.productBase}/${id}`);
  }

  // Categories
  getCategories(params?: { search?: string; page?: number; pageSize?: number }) {
    return this.http.get<unknown>(this.categoryBase).pipe(
      map(result => this.toPaginatedResult(
        result,
        item => this.toCategory(item),
        params?.page,
        params?.pageSize,
        category => !params?.search || category.name.toLowerCase().includes(params.search.toLowerCase())
      ))
    );
  }

  createCategory(payload: CategoryPayload) {
    return this.http.post<unknown>(this.categoryBase, this.toCategoryDto(payload)).pipe(
      map(category => this.toCategory(category))
    );
  }

  updateCategory(id: string, payload: CategoryPayload) {
    return this.http.put<unknown>(`${this.categoryBase}/${id}`, this.toCategoryDto(payload)).pipe(
      map(category => this.toCategory(category))
    );
  }

  deleteCategory(id: string) {
    return this.http.delete<void>(`${this.categoryBase}/${id}`);
  }

  // Orders
  getOrders(params?: {
    status?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.http.get<unknown>(`${this.adminBase}/orders`, {
      params: this.toParams(params),
    }).pipe(map(result => this.toPaginatedResult(result, item => this.toOrder(item), params?.page, params?.pageSize)));
  }

  getOrder(id: string) {
    return this.http.get<unknown>(`${this.ordersBase}/${id}`).pipe(
      map(order => this.toOrder(order))
    );
  }

  updateOrderStatus(id: string, req: UpdateOrderStatusRequest) {
    return this.http.put<void>(`${this.adminBase}/orders/${id}/status`, JSON.stringify(req.status), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Users
  getUsers(params?: { search?: string; page?: number; pageSize?: number }) {
    return this.http.get<unknown>(`${this.adminBase}/users`, {
      params: this.toParams(params),
    }).pipe(map(result => this.toPaginatedResult(result, item => this.toAdminUser(item), params?.page, params?.pageSize)));
  }

  getUser(id: string) {
    return this.getUsers({ page: 1, pageSize: 1000 }).pipe(
      map(result => {
        const user = result.items.find(item => item.id === id);
        if (!user) throw new Error(`User ${id} was not found.`);
        return user;
      })
    );
  }

  // Reviews
  getReviews(params?: { search?: string; productId?: string; page?: number; pageSize?: number }) {
    if (params?.productId) {
      return this.getProductReviews(params.productId, params);
    }

    return this.getProducts({ page: 1, pageSize: 100 }).pipe(
      switchMap(products => {
        if (!products.items.length) return of([] as Review[]);
        return forkJoin(products.items.map(product =>
          this.http.get<unknown>(`${this.reviewsBase}/product/${product.id}`).pipe(
            map(result => this.toPaginatedResult(result, item => this.toReview(item, product), 1, 1000).items)
          )
        )).pipe(map(groups => groups.flat()));
      }),
      map(reviews => this.toPaginatedArray(
        reviews.filter(review => !params?.search || this.matchesReviewSearch(review, params.search)),
        params?.page,
        params?.pageSize
      ))
    );
  }

  getProductReviews(productId: string, params?: { page?: number; pageSize?: number }) {
    return this.http.get<unknown>(`${this.reviewsBase}/product/${productId}`).pipe(
      map(result => this.toPaginatedResult(result, item => this.toReview(item, { id: productId } as Product), params?.page, params?.pageSize))
    );
  }

  deleteReview(id: string) {
    return this.http.delete<void>(`${this.reviewsBase}/${id}`);
  }

  private toParams(params?: Record<string, string | number | boolean | undefined | null>) {
    let httpParams = new HttpParams();

    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

  private toProductDto(payload: ProductPayload, image?: File | null) {
    return {
      name: payload.name,
      nameAr: payload.name,
      price: payload.price,
      description: payload.description || null,
      descriptionAr: payload.description || null,
      imageUrl: image?.name ?? null,
      categoryId: Number(payload.categoryId),
    };
  }

  private toCategoryDto(payload: CategoryPayload) {
    return {
      name: payload.name,
      nameAr: payload.name,
    };
  }

  private toPaginatedResult<T>(
    result: unknown,
    mapItem: (item: unknown) => T,
    page = 1,
    pageSize = 10,
    filterItem?: (item: T) => boolean
  ): PaginatedResult<T> {
    const source = this.unwrapCollection(result);
    const mapped = source.map(item => mapItem(item)).filter(item => filterItem?.(item) ?? true);
    const record = this.toRecord(this.unwrapResponse(result));
    const totalCount = this.readNumber(record, 'totalCount') ?? this.readNumber(record, 'totalItems') ?? mapped.length;
    const currentPage = this.readNumber(record, 'page') ?? this.readNumber(record, 'pageNumber') ?? page;
    const currentPageSize = this.readNumber(record, 'pageSize') ?? pageSize;
    const totalPages = this.readNumber(record, 'totalPages') ?? Math.max(1, Math.ceil(totalCount / currentPageSize));

    if (this.hasServerPaging(record)) {
      return { items: mapped, totalCount, page: currentPage, pageSize: currentPageSize, totalPages };
    }

    return this.toPaginatedArray(mapped, page, pageSize);
  }

  private toPaginatedArray<T>(items: T[], page = 1, pageSize = 10): PaginatedResult<T> {
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      totalCount: items.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    };
  }

  private toProduct(item: unknown): Product {
    const source = this.toRecord(this.unwrapResponse(item));
    const category = this.toRecord(source['category']);

    return {
      id: this.readId(source, 'id') || this.readId(source, 'productId'),
      name: this.readString(source, 'name') || this.readString(source, 'nameAr') || 'Unnamed product',
      description: this.readString(source, 'description') || this.readString(source, 'descriptionAr') || undefined,
      price: this.readNumber(source, 'price') ?? 0,
      stockQuantity: this.readNumber(source, 'stockQuantity') ?? this.readNumber(source, 'stock') ?? undefined,
      imageUrl: this.readString(source, 'imageUrl') || undefined,
      categoryId: this.readId(source, 'categoryId') || this.readId(category, 'id'),
      categoryName: this.readString(source, 'categoryName') || this.readString(category, 'name') || undefined,
      isActive: this.readBoolean(source, 'isActive') ?? true,
      createdAt: this.readString(source, 'createdAt') || undefined,
      updatedAt: this.readString(source, 'updatedAt') || undefined,
    };
  }

  private toCategory(item: unknown): Category {
    const source = this.toRecord(this.unwrapResponse(item));

    return {
      id: this.readId(source, 'id') || this.readId(source, 'categoryId'),
      name: this.readString(source, 'name') || this.readString(source, 'nameAr') || 'Unnamed category',
      description: this.readString(source, 'description') || undefined,
      productCount: this.readNumber(source, 'productCount') ?? this.readNumber(source, 'productsCount') ?? undefined,
      isActive: this.readBoolean(source, 'isActive') ?? true,
      createdAt: this.readString(source, 'createdAt') || undefined,
    };
  }

  private toOrder(item: unknown): Order {
    const source = this.toRecord(this.unwrapResponse(item));
    const user = this.toRecord(source['user']);
    const shippingAddress = this.toRecord(source['shippingAddress']);

    return {
      id: this.readId(source, 'id') || this.readId(source, 'orderId'),
      userId: this.readId(source, 'userId') || this.readId(user, 'id'),
      userFullName: this.readString(source, 'userFullName') || this.readString(source, 'customerName') || this.readString(user, 'fullName') || undefined,
      userEmail: this.readString(source, 'userEmail') || this.readString(source, 'customerEmail') || this.readString(user, 'email') || undefined,
      phoneNumber: this.readString(source, 'phoneNumber') || this.readString(source, 'phone') || undefined,
      paymentStatus: this.readString(source, 'paymentStatus') || undefined,
      totalAmount: this.readNumber(source, 'totalAmount') ?? this.readNumber(source, 'total') ?? 0,
      status: (this.readString(source, 'status') || 'PendingPayment') as Order['status'],
      createdAt: this.readString(source, 'createdAt') || new Date().toISOString(),
      updatedAt: this.readString(source, 'updatedAt') || undefined,
      items: this.readArray(source, 'items').map(orderItem => this.toOrderItem(orderItem)),
      shippingAddress: Object.keys(shippingAddress).length ? {
        street: this.readString(shippingAddress, 'street') || this.readString(shippingAddress, 'addressLine1') || this.readString(source, 'shippingAddress') || '',
        city: this.readString(shippingAddress, 'city') || '',
        state: this.readString(shippingAddress, 'state') || '',
        zipCode: this.readString(shippingAddress, 'zipCode') || this.readString(shippingAddress, 'postalCode') || '',
        country: this.readString(shippingAddress, 'country') || '',
      } : undefined,
      statusHistory: this.readArray(source, 'statusHistory').map(history => {
        const record = this.toRecord(history);
        return {
          status: (this.readString(record, 'status') || 'PendingPayment') as Order['status'],
          changedAt: this.readString(record, 'changedAt') || this.readString(record, 'createdAt') || '',
          changedBy: this.readString(record, 'changedBy') || undefined,
          note: this.readString(record, 'note') || undefined,
        };
      }),
    };
  }

  private toOrderItem(item: unknown) {
    const source = this.toRecord(item);
    return {
      productId: this.readId(source, 'productId'),
      productName: this.readString(source, 'productName') || this.readString(source, 'name') || 'Product',
      quantity: this.readNumber(source, 'quantity') ?? 0,
      unitPrice: this.readNumber(source, 'unitPrice') ?? this.readNumber(source, 'price') ?? 0,
      totalPrice: this.readNumber(source, 'totalPrice') ?? 0,
      imageUrl: this.readString(source, 'imageUrl') || undefined,
    };
  }

  private toAdminUser(item: unknown): AdminUser {
    const source = this.toRecord(this.unwrapResponse(item));
    const roles = this.readArray(source, 'roles').filter((role): role is string => typeof role === 'string');

    return {
      id: this.readId(source, 'id') || this.readId(source, 'userId'),
      fullName: this.readString(source, 'fullName') || this.readString(source, 'name') || this.readString(source, 'email') || 'User',
      email: this.readString(source, 'email') || '',
      phoneNumber: this.readString(source, 'phoneNumber') || undefined,
      roles,
      createdAt: this.readString(source, 'createdAt') || '',
      isActive: this.readBoolean(source, 'isActive') ?? true,
      totalOrders: this.readNumber(source, 'totalOrders') ?? undefined,
      totalSpent: this.readNumber(source, 'totalSpent') ?? this.readNumber(source, 'totalSpending') ?? undefined,
    };
  }

  private toReview(item: unknown, product?: Product): Review {
    const source = this.toRecord(this.unwrapResponse(item));
    const user = this.toRecord(source['user']);

    return {
      id: this.readId(source, 'id') || this.readId(source, 'reviewId'),
      productId: this.readId(source, 'productId') || product?.id || '',
      productName: this.readString(source, 'productName') || product?.name || 'Product',
      userId: this.readId(source, 'userId') || this.readId(user, 'id'),
      userFullName: this.readString(source, 'userFullName') || this.readString(user, 'fullName') || this.readString(user, 'email') || 'Customer',
      rating: this.readNumber(source, 'rating') ?? 0,
      comment: this.readString(source, 'comment') || '',
      createdAt: this.readString(source, 'createdAt') || '',
      isApproved: this.readBoolean(source, 'isApproved') ?? undefined,
    };
  }

  private toDashboardData(data: unknown): DashboardData {
    const source = this.toRecord(this.unwrapResponse(data));
    const stats = this.toRecord(source['stats'] ?? source);

    return {
      stats: {
        totalUsers: this.readNumber(stats, 'totalUsers') ?? 0,
        totalProducts: this.readNumber(stats, 'totalProducts') ?? undefined,
        totalCategories: this.readNumber(stats, 'totalCategories') ?? undefined,
        totalOrders: this.readNumber(stats, 'totalOrders') ?? 0,
        totalRevenue: this.readNumber(stats, 'totalRevenue') ?? 0,
        pendingOrders: this.readNumber(stats, 'pendingOrders') ?? 0,
        paidOrders: this.readNumber(stats, 'paidOrders') ?? undefined,
        processingOrders: this.readNumber(stats, 'processingOrders') ?? undefined,
        deliveredOrders: this.readNumber(stats, 'deliveredOrders') ?? undefined,
        revenueGrowth: this.readNumber(stats, 'revenueGrowth') ?? undefined,
        ordersGrowth: this.readNumber(stats, 'ordersGrowth') ?? undefined,
        usersGrowth: this.readNumber(stats, 'usersGrowth') ?? undefined,
      },
      revenueOverview: this.readArray(source, 'revenueOverview').map(item => this.toRevenueData(item)),
      ordersByStatus: this.readArray(source, 'ordersByStatus').map(item => {
        const record = this.toRecord(item);
        return {
          status: this.readString(record, 'status') || '',
          count: this.readNumber(record, 'count') ?? 0,
        };
      }),
      monthlySales: this.readArray(source, 'monthlySales').map(item => this.toRevenueData(item)),
      topSellingProducts: this.readArray(source, 'topSellingProducts').map(item => {
        const record = this.toRecord(item);
        return {
          name: this.readString(record, 'name') || 'Product',
          sales: this.readNumber(record, 'sales') ?? this.readNumber(record, 'quantity') ?? 0,
          revenue: this.readNumber(record, 'revenue') ?? undefined,
        };
      }),
      customerGrowth: this.readArray(source, 'customerGrowth').map(item => {
        const record = this.toRecord(item);
        return {
          month: this.readString(record, 'month') || '',
          customers: this.readNumber(record, 'customers') ?? this.readNumber(record, 'count') ?? 0,
        };
      }),
    };
  }

  private toRevenueData(item: unknown) {
    const source = this.toRecord(item);
    return {
      month: this.readString(source, 'month') || this.readString(source, 'label') || '',
      revenue: this.readNumber(source, 'revenue') ?? this.readNumber(source, 'sales') ?? 0,
    };
  }

  private matchesReviewSearch(review: Review, search: string) {
    const value = search.toLowerCase();
    return [review.productName, review.userFullName, review.comment].some(field => field.toLowerCase().includes(value));
  }

  private unwrapCollection(value: unknown): unknown[] {
    const unwrapped = this.unwrapResponse(value);
    if (Array.isArray(unwrapped)) return unwrapped;

    const record = this.toRecord(unwrapped);
    for (const key of ['items', 'data', 'result', 'results', 'values']) {
      const child = record[key];
      if (Array.isArray(child)) return child;
      if (child && typeof child === 'object') {
        const nested = this.unwrapCollection(child);
        if (nested.length) return nested;
      }
    }

    return [];
  }

  private unwrapResponse(value: unknown): unknown {
    const record = this.toRecord(value);
    if ('data' in record && !Array.isArray(record['data'])) return record['data'];
    if ('result' in record && !Array.isArray(record['result'])) return record['result'];
    return value;
  }

  private hasServerPaging(record: RawRecord) {
    return ['totalCount', 'totalItems', 'page', 'pageNumber', 'pageSize', 'totalPages'].some(key => key in record);
  }

  private toRecord(value: unknown): RawRecord {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as RawRecord : {};
  }

  private readArray(source: RawRecord, key: string): unknown[] {
    const value = source[key];
    return Array.isArray(value) ? value : [];
  }

  private readId(source: RawRecord, key: string) {
    const value = source[key];
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }

  private readString(source: RawRecord, key: string) {
    const value = source[key];
    return typeof value === 'string' ? value : null;
  }

  private readNumber(source: RawRecord, key: string) {
    const value = source[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private readBoolean(source: RawRecord, key: string) {
    const value = source[key];
    return typeof value === 'boolean' ? value : null;
  }

  private toAnalyticsData(data: DashboardData): AnalyticsData {
    return {
      totalRevenue: data.stats?.totalRevenue ?? 0,
      revenueGrowth: data.stats?.revenueGrowth ?? 0,
      totalOrders: data.stats?.totalOrders ?? 0,
      ordersGrowth: data.stats?.ordersGrowth ?? 0,
      totalCustomers: data.stats?.totalUsers ?? 0,
      customersGrowth: data.stats?.usersGrowth ?? 0,
      conversionRate: 0,
      conversionGrowth: 0,
      revenueByMonth: data.revenueOverview ?? data.monthlySales ?? [],
      ordersByMonth: [],
      topProducts: data.topSellingProducts?.map(product => ({
        name: product.name,
        sales: product.sales,
        revenue: product.revenue ?? 0,
      })) ?? [],
      topCategories: [],
      topCustomers: [],
      weeklySales: [],
      orderStatusDistribution: data.ordersByStatus ?? [],
    };
  }
}
