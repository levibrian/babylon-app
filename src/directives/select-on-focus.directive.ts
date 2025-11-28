import { Directive, HostListener } from '@angular/core';

/**
 * Directive that automatically moves the cursor to the end of number inputs when they receive focus.
 * This improves UX by preventing the cursor from being placed randomly based on click position.
 */
@Directive({
  selector: 'input[type="number"]',
  standalone: true,
})
export class SelectOnFocusDirective {
  @HostListener('focus', ['$event'])
  onFocus(event: FocusEvent): void {
    this.moveCursorToEnd(event.target as HTMLInputElement);
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.moveCursorToEnd(event.target as HTMLInputElement);
  }

  private moveCursorToEnd(input: HTMLInputElement): void {
    // Use setTimeout to ensure this runs after the browser's default behavior
    setTimeout(() => {
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }, 0);
  }
}
