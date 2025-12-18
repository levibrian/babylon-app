import { Component, EventEmitter, OnInit, Output, inject, ElementRef, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface SearchResult {
  ticker: string;
  name: string;
  type: string;
  exchange: string;
}

@Component({
  selector: 'app-add-security-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './add-security-search.component.html',
  styleUrls: ['./add-security-search.component.scss']
})
export class AddSecuritySearchComponent implements OnInit {
  @Output() securitySelected = new EventEmitter<string>();
  
  private http = inject(HttpClient);
  private elementRef = inject(ElementRef);
  private apiUrl = `${environment.apiUrl}/api/v1/market/search`;

  searchControl = new FormControl('');
  results$: Observable<SearchResult[]> = of([]);
  isDropdownVisible = signal(false);

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownVisible.set(false);
    }
  }


  onFocus() {
    if (this.searchControl.value) {
      this.isDropdownVisible.set(true);
    }
  }
  
  ngOnInit() {
    this.results$ = this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(term => {
         if (term) this.isDropdownVisible.set(true); 
         else this.isDropdownVisible.set(false);
      }),
      switchMap(term => this.searchSecurities(term || ''))
    );
  }

  private searchSecurities(term: string): Observable<SearchResult[]> {
    if (!term || term.length < 1) {
      return of([]);
    }
    
    // Call the API
    const params = new HttpParams().set('query', term);
    
    return this.http.get<SearchResult[]>(this.apiUrl, { params }).pipe(
      catchError(err => {
        console.error('Search error', err);
        return of([]);
      })
    );
  }

  selectSecurity(ticker: string) {
    this.securitySelected.emit(ticker);
    this.searchControl.setValue(''); // Clear search after selection
    this.isDropdownVisible.set(false);
  }
}
