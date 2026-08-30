import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="page"><div><small>{{ section }}</small><h1>{{ title }}</h1><p>{{ description }}</p></div></header>
    <section class="workspace">
      <div class="icon">{{ icon }}</div><h2>{{ title }}</h2><p>{{ help }}</p>
      <div class="info"><span>✓ Separate page and route</span><span>✓ Role-protected access</span><span>✓ Ready for dedicated records</span></div>
      <a [routerLink]="backRoute">← Back to {{ section }}</a>
    </section>
  `,
  styles:[`:host{display:block}.page small{color:#155b98;font-size:9px;font-weight:900;letter-spacing:.13em}.page h1{margin:5px 0;color:#183552}.page p{margin:0;color:#768694;font-size:11px}.workspace{min-height:390px;margin-top:18px;padding:50px 24px;display:grid;place-items:center;align-content:center;text-align:center;border:1px solid #dce5ed;border-radius:14px;background:linear-gradient(145deg,#fff,#f5f8fc);box-shadow:0 8px 24px #17324a0b}.icon{width:62px;height:62px;display:grid;place-items:center;border-radius:18px;background:linear-gradient(135deg,#211e75,#155b98);color:white;font-size:25px;box-shadow:0 12px 25px #211e7530}.workspace h2{margin:18px 0 6px;color:#211e75}.workspace>p{max-width:520px;color:#718391;font-size:11px;line-height:1.7}.info{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:15px}.info span{padding:7px 10px;border-radius:12px;background:#e8f7f3;color:#14745f;font-size:8px;font-weight:800}.workspace a{margin-top:8px;color:#155b98;font-size:10px;font-weight:800;text-decoration:none}`]
})
export class OperationWorkspaceComponent {
  private route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] || 'Workspace';
  section = this.route.snapshot.data['section'] || 'SYSTEM';
  description = this.route.snapshot.data['description'] || 'Dedicated management workspace.';
  help = this.route.snapshot.data['help'] || 'This function now has its own page and no longer shares another menu table.';
  icon = this.route.snapshot.data['icon'] || '▦';
  backRoute = this.route.snapshot.data['backRoute'] || '/dashboard';
}
