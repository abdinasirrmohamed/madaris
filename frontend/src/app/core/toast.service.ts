import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastMessage { id: number; text: string; kind: ToastKind; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  private nextId = 1;
  show(text: string, kind: ToastKind = 'success') {
    const id = this.nextId++;
    this.messages.update(items => [...items, { id, text, kind }]);
    window.setTimeout(() => this.dismiss(id), 4500);
  }
  dismiss(id: number) { this.messages.update(items => items.filter(item => item.id !== id)); }
}
