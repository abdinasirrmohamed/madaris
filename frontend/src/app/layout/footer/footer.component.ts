import { Component } from '@angular/core';
@Component({
  selector: 'app-footer',
  standalone: true,
  template: `<footer>Copyright © 2026 · Madaaris Qur'an School Management System</footer>`,
  styles: [
    `
      footer {
        text-align: center;
        background: white;
        padding: 14px;
        font-size: 8px;
        color: #627184;
      }
    `,
  ],
})
export class FooterComponent {}
