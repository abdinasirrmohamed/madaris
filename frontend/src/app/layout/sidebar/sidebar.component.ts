import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '../../core/permissions/permission.service';
import { MADAARIS_NAVIGATION, NavigationItem } from '../navigation.model';
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `<aside [class.compact]="collapsed">
    <header>
      <img class="logo" src="/assets/branding/madaaris-logo.png" alt="Madaaris logo" />
      <div><b>Madaaris</b><small>QUR'AN SCHOOL</small></div>
      <button class="close" (click)="closeMobile.emit()">×</button>
    </header>
    <nav>
      @for (item of visibleItems(); track item.label) {
        @if (item.children?.length) {
          <details>
            <summary>
              <span
                ><i>{{ item.icon }}</i
                >{{ item.label }}</span
              ><b>›</b>
            </summary>
            @for (child of visibleChildren(item); track child.label) {
              <a
                [routerLink]="child.route"
                routerLinkActive="active"
                (click)="closeMobile.emit()"
                >{{ child.label }}</a
              >
            }
          </details>
        } @else {
          <a [routerLink]="item.route" routerLinkActive="active" (click)="closeMobile.emit()"
            ><i>{{ item.icon }}</i
            ><span>{{ item.label }}</span></a
          >
        }
      }
    </nav>
    <footer>
      <button (click)="logout.emit()">↪ <span>Logout</span></button>
    </footer>
  </aside>`,
  styles: [
    `
      :host,
      aside {
        display: block;
        height: 100%;
      }
      aside {
        background: #211e75;
        color: #eef1ff;
        display: flex;
        flex-direction: column;
      }
      header {
        height: 74px;
        padding: 0 13px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: #25217e;
        border-bottom: 1px solid #ffffff16;
      }
      .logo {
        width: 45px;
        height: 45px;
        flex: 0 0 auto;
        background: white;
        object-fit: contain;
        border: 2px solid #d9bd61;
        border-radius: 9px;
      }
      header b {
        display: block;
        font-size: 15px;
      }
      header small {
        font-size: 7px;
        letter-spacing: 0.12em;
        color: #b8c3e1;
      }
      .close {
        display: none;
        margin-left: auto;
        background: none;
        border: 0;
        color: white;
        font-size: 24px;
      }
      nav {
        padding: 5px 0;
        overflow: auto;
        flex: 1;
      }
      a,
      summary {
        display: flex;
        gap: 10px;
        align-items: center;
        min-height: 38px;
        padding: 8px 12px;
        color: inherit;
        text-decoration: none;
        cursor: pointer;
        list-style: none;
        font-size: 11px;
        font-weight: 600;
      }
      summary {
        justify-content: space-between;
      }
      summary span {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      i {
        width: 15px;
        text-align: center;
        font-style: normal;
      }
      a.active {
        background: #0879a4;
        color: white;
        box-shadow: inset 4px 0 #24b7d5;
      }
      details a {
        font-size: 10px;
        padding-left: 37px;
        background: #19175e;
      }
      footer {
        padding: 8px;
        border-top: 1px solid #ffffff18;
      }
      footer button {
        background: none;
        border: 0;
        color: #eef1ff;
        padding: 9px;
      }
      .compact header div,
      .compact a span,
      .compact details a,
      .compact footer span {
        display: none;
      }
      .compact a,
      .compact summary {
        justify-content: center;
      }
      .compact summary b {
        display: none;
      }
      .compact header {
        justify-content: center;
        padding: 0;
      }
      .compact .logo {
        width: 39px;
        height: 39px;
      }
      @media (max-width: 760px) {
        .close {
          display: block;
        }
      }
    `,
  ],
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() logout = new EventEmitter<void>();
  @Output() closeMobile = new EventEmitter<void>();
  readonly items = MADAARIS_NAVIGATION;
  constructor(public permissions: PermissionService) {}
  visibleItems() {
    return this.items.filter((x) => this.permissions.has(x.permission));
  }
  visibleChildren(item: NavigationItem) {
    return (item.children ?? []).filter((x) => this.permissions.has(x.permission));
  }
}
