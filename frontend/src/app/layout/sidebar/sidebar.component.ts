import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '../../core/permissions/permission.service';
import { LanguageService } from '../../core/language.service';
import { MADAARIS_NAVIGATION, NavigationItem } from '../navigation.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside [class.compact]="collapsed">
      <header>
        <div class="brand-mark"><img src="/assets/branding/madaaris-logo-transparent.png" alt="Madaaris logo" /></div>
        <div class="brand-name"><b>Madaaris</b><small>QUR'AN SCHOOL</small></div>
        <button class="mobile-close" (click)="closeMobile.emit()" aria-label="Close menu">×</button>
      </header>

      <p class="section-label">MENU</p>
      <nav>
        @for (item of visibleItems(); track item.label) {
          @if (item.children?.length) {
            <details [attr.data-tooltip]="language.translate(item.label)">
              <summary (click)="openSection(item, $event)">
                <span class="item-main"><i>{{ item.icon }}</i><span class="label">{{ language.translate(item.label) }}</span></span>
                <b class="chevron">›</b>
              </summary>
              <div class="submenu">
                @for (child of visibleChildren(item); track child.label) {
                  <a [routerLink]="child.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMobile.emit()">{{ language.translate(child.label) }}</a>
                }
              </div>
            </details>
          } @else {
            <a class="nav-item" [routerLink]="item.route" routerLinkActive="active" (click)="closeMobile.emit()" [attr.data-tooltip]="language.translate(item.label)">
              <i>{{ item.icon }}</i><span class="label">{{ language.translate(item.label) }}</span>
            </a>
          }
        }
      </nav>

      <footer>
        <button (click)="logout.emit()" data-tooltip="Logout"><i>↪</i><span class="label">{{ language.translate('Logout') }}</span></button>
      </footer>
    </aside>
  `,
  styles: [`
    :host,aside{display:block;height:100%}*{box-sizing:border-box}
    aside{position:relative;display:flex;flex-direction:column;color:#d4d7ef;background:linear-gradient(180deg,#171541 0%,#211e75 55%,#171554 100%);border-right:1px solid #ffffff12;box-shadow:7px 0 30px #17154b26;overflow:visible;transition:width .28s cubic-bezier(.2,.8,.2,1)}
    header{height:82px;padding:0 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #ffffff0c;white-space:nowrap;overflow:hidden}
    .brand-mark{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:13px;background:#ffffff0d;border:1px solid #5c72e64a}.brand-mark img{width:37px;height:34px;object-fit:contain;filter:drop-shadow(0 5px 7px #08062f99)}
    .brand-name{min-width:0;transition:opacity .15s}.brand-name b{display:block;color:#fff;font-size:15px;letter-spacing:.01em}.brand-name small{display:block;margin-top:2px;color:#62dfcf;font-size:7px;font-weight:800;letter-spacing:.14em}
    .mobile-close{display:none;margin-left:auto;border:0;background:none;color:white;font-size:24px;cursor:pointer}.section-label{height:24px;margin:17px 20px 5px;color:#777eae;font-size:8px;font-weight:900;letter-spacing:.18em;white-space:nowrap;overflow:hidden}
    nav{padding:0 10px 12px;overflow-x:visible;overflow-y:auto;flex:1;scrollbar-width:thin;scrollbar-color:#31415d transparent}a,summary{position:relative;display:flex;align-items:center;min-height:43px;border-radius:11px;color:inherit;text-decoration:none;cursor:pointer;list-style:none;font-size:11px;font-weight:650;transition:color .18s,background .18s,transform .18s}summary{padding:7px 11px;justify-content:space-between}.item-main,.nav-item{display:flex;align-items:center}.nav-item{gap:11px;padding:7px 11px;margin:3px 0}.item-main{gap:11px}
    i{width:22px;height:22px;flex:0 0 22px;display:grid;place-items:center;color:#9aa3d4;font-style:normal;font-size:16px;transition:color .18s,transform .18s}.label{white-space:nowrap;overflow:hidden}.chevron{color:#858dc1;font-size:19px;transition:transform .2s}details[open]>.submenu{display:grid}details[open]>summary .chevron{transform:rotate(90deg)}summary:hover,.nav-item:hover{color:#fff;background:#ffffff0d}summary:hover i,.nav-item:hover i{color:#63dfd0;transform:scale(1.05)}
    .nav-item.active{color:#fff;background:linear-gradient(90deg,#315fc999,#167a9e75);box-shadow:inset 3px 0 #62dfcf,0 5px 16px #08072f42}.nav-item.active i{color:#6ce7d7}.submenu{display:none;margin:0 0 6px 22px;padding:5px 0 5px 15px;border-left:1px solid #4b4b96}.submenu a{min-height:32px;padding:6px 10px;border-radius:8px;font-size:9px;color:#aeb3d8}.submenu a:hover,.submenu a.active{color:#fff;background:linear-gradient(90deg,#315fc966,#155b9877)}.submenu a.active:before{content:'';position:absolute;left:-18px;width:5px;height:5px;border-radius:50%;background:#62dfcf;box-shadow:0 0 7px #62dfcf}
    footer{padding:12px 10px 16px;border-top:1px solid #ffffff0d}footer button{position:relative;width:100%;min-height:42px;padding:8px 11px;display:flex;align-items:center;gap:11px;border:0;border-radius:11px;background:#ffffff06;color:#aebad0;font:inherit;font-size:11px;font-weight:700;cursor:pointer;transition:.18s}footer button:hover{background:#f0444420;color:#ff8a8a}footer button:hover i{color:#ff7373}
    .compact header{justify-content:center;padding:0}.compact .brand-name,.compact .section-label,.compact .label,.compact .chevron,.compact .submenu{display:none}.compact nav{padding-inline:9px}.compact .nav-item,.compact summary,.compact footer button{justify-content:center;padding-inline:0}.compact .nav-item{gap:0}.compact details{position:relative}.compact details[open] .submenu{display:none}.compact i{width:28px;height:28px;flex-basis:28px}.compact footer{padding-inline:9px}
    .compact [data-tooltip]:hover:after{content:attr(data-tooltip);position:absolute;left:58px;top:50%;z-index:1000;transform:translateY(-50%);padding:8px 11px;border-radius:8px;background:#25217e;color:#fff;box-shadow:0 8px 25px #100d4a70;white-space:nowrap;font-size:10px;font-weight:700;pointer-events:none;animation:tip .15s ease-out}.compact [data-tooltip]:hover:before{content:'';position:absolute;left:53px;top:50%;z-index:1001;transform:translateY(-50%);border-width:5px 5px 5px 0;border-style:solid;border-color:transparent #25217e transparent transparent}
    @keyframes tip{from{opacity:0;transform:translate(5px,-50%)}to{opacity:1;transform:translate(0,-50%)}}
    @media(max-width:760px){aside.compact .brand-name,aside.compact .section-label,aside.compact .label,aside.compact .chevron{display:block}aside.compact header{justify-content:flex-start;padding:0 18px}aside.compact nav{padding-inline:10px}aside.compact .nav-item,aside.compact summary,aside.compact footer button{justify-content:flex-start;padding-inline:11px}aside.compact .nav-item{gap:11px}.compact [data-tooltip]:after,.compact [data-tooltip]:before{display:none}.mobile-close{display:block}}
    @media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
  `],
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() logout = new EventEmitter<void>();
  @Output() closeMobile = new EventEmitter<void>();
  readonly items = MADAARIS_NAVIGATION;
  constructor(public permissions: PermissionService, public language: LanguageService, private router: Router) {}
  visibleItems() { return this.items.filter((item) => this.permissions.has(item.permission)); }
  visibleChildren(item: NavigationItem) { return (item.children ?? []).filter((child) => this.permissions.has(child.permission)); }
  openSection(item: NavigationItem, event: MouseEvent) {
    if (!this.collapsed || matchMedia('(max-width:760px)').matches) return;
    event.preventDefault();
    const destination = this.visibleChildren(item).find((child) => child.route)?.route;
    if (destination) this.router.navigateByUrl(destination);
  }
}
