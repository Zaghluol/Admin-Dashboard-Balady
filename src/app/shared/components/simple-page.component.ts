import { Component, input } from '@angular/core';

@Component({
  selector: 'app-simple-page',
  template: `
    <section class="simple-page panel">
      <p class="eyebrow">Balady Admin</p>
      <h1>{{ title() }}</h1>
      <p class="description">{{ description() }}</p>
    </section>
  `,
  styles: [`
    .simple-page {
      display: grid;
      gap: 0.6rem;
      min-height: 18rem;
      align-content: start;
      padding: clamp(1rem, 3vw, 1.5rem);
    }

    .eyebrow {
      margin: 0;
      color: var(--accent-cyan);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.6rem, 4vw, 2.4rem);
      line-height: 1.15;
    }

    .description {
      max-width: 42rem;
      margin: 0;
      color: var(--text-secondary);
      font-size: 1rem;
    }
  `],
})
export class SimplePageComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
