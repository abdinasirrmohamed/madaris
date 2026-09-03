import { Injectable, signal } from '@angular/core';

export type DialogFieldType = 'text' | 'number' | 'password' | 'email' | 'date' | 'textarea' | 'choice';
export interface DialogChoice { value: string; label: string; }
export interface DialogField { key: string; label: string; type?: DialogFieldType; value?: string | number | null; placeholder?: string; required?: boolean; choices?: DialogChoice[]; }
export interface DialogRequest { title: string; message?: string; fields?: DialogField[]; confirmText?: string; cancelText?: string; danger?: boolean; }

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly request = signal<DialogRequest | null>(null);
  readonly values = signal<Record<string, string>>({});
  readonly error = signal('');
  private resolve?: (value: Record<string, string> | null) => void;

  open(request: DialogRequest): Promise<Record<string, string> | null> {
    if (this.resolve) this.resolve(null);
    this.values.set(Object.fromEntries((request.fields ?? []).map(field => [field.key, String(field.value ?? '')])));
    this.error.set('');
    this.request.set(request);
    return new Promise(resolve => this.resolve = resolve);
  }
  async prompt(title: string, value = '', type: DialogFieldType = 'text'): Promise<string | null> {
    const result = await this.open({ title, fields: [{ key: 'value', label: title, value, type, required: true }] });
    return result?.['value'] ?? null;
  }
  async confirm(title: string, message?: string, danger = false): Promise<boolean> {
    return !!(await this.open({ title, message, danger, confirmText: danger ? 'Delete' : 'Confirm' }));
  }
  async choose(title: string, choices: DialogChoice[], value = ''): Promise<string | null> {
    const result = await this.open({ title, fields: [{ key: 'value', label: title, value, type: 'choice', choices, required: true }] });
    return result?.['value'] ?? null;
  }
  chooseValue(key: string, value: string) { this.setValue(key, value); this.submit(); }
  setValue(key: string, value: string) { this.values.update(values => ({ ...values, [key]: value })); }
  submit() {
    const request = this.request(); if (!request) return;
    const missing = (request.fields ?? []).find(field => field.required && !this.values()[field.key]?.trim());
    if (missing) { this.error.set(`${missing.label} is required.`); return; }
    const resolve = this.resolve; this.close(); resolve?.(this.values());
  }
  cancel() { const resolve = this.resolve; this.close(); resolve?.(null); }
  private close() { this.request.set(null); this.resolve = undefined; this.error.set(''); }
}
