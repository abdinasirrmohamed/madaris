import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from '../../core/auth.service';
@Component({
  selector: 'app-header',
  standalone: true,
  template: `<header>
    <button class="menu" (click)="toggleMenu.emit()">☰</button
    ><label class="search">⌕ <input placeholder="Search by name" /></label><span class="grow"></span
    ><span class="version">Version 1.0</span><button class="bell">♧</button>
    <div class="avatar">{{ initials() }}</div>
    <div class="user">
      <b>{{ auth.user()?.Name }}</b
      ><small>{{ auth.user()?.Email }}</small>
    </div>
  </header>`,
  styles: [
    `
      header {
        height: 44px;
        background: #171541;
        color: white;
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 12px;
      }
      button {
        border: 0;
        color: white;
      }
      .menu {
        background: #103d57;
        border-radius: 3px;
        padding: 6px 9px;
      }
      .search {
        height: 28px;
        width: 270px;
        border-radius: 7px;
        background: #175a8d;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 8px;
      }
      .search input {
        background: none;
        border: 0;
        outline: 0;
        color: white;
        width: 100%;
        font-size: 10px;
      }
      .grow {
        flex: 1;
      }
      .version {
        font-size: 8px;
      }
      .bell {
        background: none;
      }
      .avatar {
        width: 27px;
        height: 27px;
        background: #c5265a;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 9px;
        font-weight: 800;
      }
      .user {
        display: grid;
        font-size: 9px;
      }
      .user small {
        color: #c2c8dd;
      }
      @media (max-width: 760px) {
        .search {
          width: 170px;
        }
        .version,
        .user {
          display: none;
        }
      }
    `,
  ],
})
export class HeaderComponent {
  @Output() toggleMenu = new EventEmitter<void>();
  constructor(public auth: AuthService) {}
  initials() {
    return (this.auth.user()?.Name || 'MA')
      .split(' ')
      .map((x) => x[0])
      .slice(0, 2)
      .join('');
  }
}
