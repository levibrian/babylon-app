import { Directive, ElementRef, HostListener, inject, signal, effect } from '@angular/core';

/**
 * Tooltip data interface for displaying tooltips
 */
export interface TooltipData {
  x: number;
  y: number;
  text: string;
  color?: string;
}

/**
 * Service for managing tooltip state across the application.
 * Uses a singleton pattern to ensure tooltips don't conflict.
 */
@Directive({
  selector: '[appInfoTooltip]',
  standalone: true,
})
export class InfoTooltipDirective {
  private elementRef = inject(ElementRef);
  
  // Tooltip text input
  tooltipText = signal<string>('');
  tooltipColor = signal<string>('transparent');

  // Reference to the tooltip service (will be injected)
  private tooltipService: TooltipService | null = null;

  @HostListener('mouseenter', ['$event'])
  onMouseEnter(event: MouseEvent): void {
    if (this.tooltipService && this.tooltipText()) {
      this.tooltipService.showTooltip({
        x: event.clientX,
        y: event.clientY,
        text: this.tooltipText(),
        color: this.tooltipColor(),
      });
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.tooltipService) {
      this.tooltipService.hideTooltip();
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.tooltipService && this.tooltipText()) {
      this.tooltipService.showTooltip({
        x: event.clientX,
        y: event.clientY,
        text: this.tooltipText(),
        color: this.tooltipColor(),
      });
    }
  }

  /**
   * Sets the tooltip service reference (called by parent component)
   */
  setTooltipService(service: TooltipService): void {
    this.tooltipService = service;
  }
}

/**
 * Service for managing tooltip state.
 * Should be provided at the component level where tooltips are used.
 */
export class TooltipService {
  private readonly _activeTooltip = signal<TooltipData | null>(null);
  
  public readonly activeTooltip = this._activeTooltip.asReadonly();

  showTooltip(data: TooltipData): void {
    this._activeTooltip.set(data);
  }

  hideTooltip(): void {
    this._activeTooltip.set(null);
  }
}

