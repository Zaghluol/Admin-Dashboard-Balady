import { Component } from '@angular/core';
import { SimplePageComponent } from '@shared/components/simple-page.component';

@Component({
  selector: 'app-settings',
  imports: [SimplePageComponent],
  template: `
    <app-simple-page
      title="Settings"
      description="Configure admin preferences and dashboard behavior."
    />
  `,
})
export class SettingsComponent {}
