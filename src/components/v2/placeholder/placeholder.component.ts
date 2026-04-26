import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-v2-placeholder',
  standalone: true,
  imports: [],
  template: `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      height:100%;
      color:#52525F;
      font-family:'Inter',sans-serif;
      font-size:13px;
      letter-spacing:0.04em;
    ">{{ label }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);
  label = this.route.snapshot.data['label'] ?? 'Coming soon';
}
