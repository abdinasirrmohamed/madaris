import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, FooterComponent],
  template: `<div class="shell" [class.compact]="collapsed()" [class.mobile-open]="mobileOpen()">
    <div class="overlay" (click)="mobileOpen.set(false)"></div>
    <app-sidebar
      [collapsed]="collapsed()"
      (logout)="auth.logout()"
      (closeMobile)="mobileOpen.set(false)"
    />
    <section>
      <app-header (toggleMenu)="toggleNavigation()" />
      <main><router-outlet /></main>
      <app-footer />
    </section>
  </div>`,
  styles: [
    `
      .shell {
        display: grid;
        grid-template-columns: 205px 1fr;
        min-height: 100vh;
        background: #eff4f8;
        color: #18302e;
      }
      .shell > app-sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        z-index: 30;
      }
      .shell > section {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .compact {
        grid-template-columns: 64px 1fr;
      }
      main {
        padding: 18px;
        flex: 1;
      }
      .overlay {
        display: none;
      }
      @media (max-width: 760px) {
        .shell {
          display: block;
        }
        .shell > app-sidebar {
          position: fixed;
          left: -230px;
          top: 0;
          width: 220px;
          transition: left 0.2s;
        }
        .shell.mobile-open > app-sidebar {
          left: 0;
        }
        .mobile-open .overlay {
          display: block;
          position: fixed;
          inset: 0;
          background: #11182788;
          z-index: 20;
        }
        main {
          padding: 12px;
        }
      }
    `,
  ],
})
export class ShellComponent {
  collapsed = signal(false);
  mobileOpen = signal(false);
  constructor(public auth: AuthService) {}
  toggleNavigation() {
    if (matchMedia('(max-width:760px)').matches) this.mobileOpen.update((x) => !x);
    else this.collapsed.update((x) => !x);
  }
}
