import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = '/api/v1';
  constructor(private http: HttpClient) {}
  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.http.get<T>(this.base + path, { params });
  }
  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.base + path, body);
  }
  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.base + path, body);
  }
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.base + path);
  }
}
