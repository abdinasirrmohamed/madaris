import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { PermissionService } from '../core/permissions/permission.service';
import { Permissions } from '../core/permissions/permissions.constants';

@Component({
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  template: `
    <section class="tabs">
      <button [class.active]="activeTab() === 'overview'" (click)="activeTab.set('overview')">
        ● Overview</button
      ><button [hidden]="!permissions.hasAny([Permissions.FinanceManage, Permissions.AccountsManage])" [class.active]="activeTab() === 'finance'" (click)="activeTab.set('finance')">
        ▣ Finance</button
      ><button [hidden]="!permissions.has(Permissions.StudentsView)" routerLink="/students">♙ Students</button
      ><button [hidden]="!permissions.hasAny([Permissions.AttendanceTake, Permissions.AttendanceCorrect])" [class.active]="activeTab() === 'attendance'" (click)="activeTab.set('attendance')">
        ▦ Attendance</button
      ><span></span><button class="period" (click)="cycleMonth()">▣ {{ selectedMonth() }}</button
      ><button class="period" (click)="cycleYear()">Academic {{ selectedYear() }}</button>
    </section>
    @if (loading()) {
      <div class="state">Loading dashboard data…</div>
    } @else if (error()) {
      <div class="state error">{{ error() }}</div>
    } @else {
      <section class="personal-head">
        <div><small>MY DASHBOARD</small><h2>Welcome back</h2><p>{{ roleLabel() }}</p></div>
        <span>{{ data()?.MyActivity?.length || 0 }} recent activities</span>
      </section>
      <section class="kpis">
        @for (card of cards(); track card.label) {
          <article [class]="card.color">
            <span class="round">{{ card.icon }}</span>
            <div>
              <small>{{ card.label }}</small
              ><strong>{{ card.money ? (card.value | currency: 'USD') : card.value }}</strong
              ><em>{{ card.note }}</em>
            </div>
            <i></i>
          </article>
        }
      </section>
      @if (canSection('finance')) {
      <article class="panel collection">
        <header>
          <h3>▥ STUDY FEE COLLECTION (12 MONTHS)</h3>
          <div>
            <button [class.selected]="chartMode() === 'column'" (click)="chartMode.set('column')">
              Column</button
            ><button [class.selected]="chartMode() === 'line'" (click)="chartMode.set('line')">
              Line
            </button>
          </div>
        </header>
        <section class="chart-wrap">
          <div class="y-axis">
            <span>$300</span><span>$200</span><span>$100</span><span>$0</span>
          </div>
          <div class="chart" [class.line-mode]="chartMode() === 'line'">
            @for (month of months; track month.name) {
              <div class="month">
                <div
                  class="column"
                  [style.height.%]="month.value ? (month.value / maxCollection()) * 88 : 0"
                >
                  <b>{{ month.value ? '$' + month.value : '' }}</b>
                </div>
                <span>{{ month.name }}</span>
              </div>
            }
          </div>
          <aside>
            <p>
              Total collection (12 months) <b>{{ totalAnnual() | currency: 'USD' }}</b>
            </p>
            <p>
              Previous 12 months <b>{{ previousAnnual() | currency: 'USD' }}</b>
            </p>
            <p>
              Change <b class="positive">+{{ annualChange() | currency: 'USD' }}</b>
            </p>
            <p>
              Growth <b>{{ annualGrowth() | number: '1.0-1' }}%</b>
            </p>
            <p>
              Average per month <b>{{ totalAnnual() / 12 | currency: 'USD' }}</b>
            </p>
          </aside>
        </section>
      </article>
      <section class="dual">
        <article class="panel income">
          <header><h3>INCOME OF THIS MONTH · AUGUST 2026</h3></header>
          <div class="bars">
            <div>
              <i [style.height.%]="incomeHeight()"
                ><b>{{ monthIncome() | currency: 'USD' }}</b></i
              ><span>Income</span>
            </div>
            <div>
              <i class="expense" [style.height.%]="expenseHeight()"
                ><b>{{ expenses() | currency: 'USD' }}</b></i
              ><span>Expenses</span>
            </div>
          </div>
          <footer>
            Net income / expense <strong>{{ netIncome() | currency: 'USD' }}</strong
            ><small>{{ netIncome() >= 0 ? 'Profit' : 'Loss' }}</small>
          </footer>
        </article>
        <article class="panel compare">
          <header><h3>STUDY FEE COMPARISON · JULY 2026 VS AUGUST 2026</h3></header>
          <div class="comparison">
            <div>
              <i [style.height.%]="previousMonthHeight()"
                ><b>{{ previousMonth() | currency: 'USD' }}</b></i
              ><span>July 2026</span>
            </div>
            <div>
              <i class="current" [style.height.%]="currentMonthHeight()"
                ><b>{{ monthIncome() | currency: 'USD' }}</b></i
              ><span>August 2026</span>
            </div>
          </div>
          <footer>
            <div>
              <small>Last month</small><b>{{ previousMonth() | currency: 'USD' }}</b>
            </div>
            <div>
              <small>This month</small><b>{{ monthIncome() | currency: 'USD' }}</b>
            </div>
            <div>
              <small>Change</small
              ><b [class.negative]="monthIncome() < previousMonth()">{{
                monthIncome() - previousMonth() | currency: 'USD'
              }}</b>
            </div>
          </footer>
        </article>
      </section>
      <article class="panel overview">
        <header><h3>◔ OVERVIEW</h3></header>
        <section>
          <div>
            <i class="blue">▣</i
            ><span
              >Total charges<b>{{ totalCharges() | currency: 'USD' }}</b></span
            >
          </div>
          <div>
            <i class="orange">%</i
            ><span
              >Total discounts<b>{{ discounts() | currency: 'USD' }}</b></span
            >
          </div>
          <div>
            <i class="purple">$</i
            ><span
              >Total amount paid<b>{{ paid() | currency: 'USD' }}</b></span
            >
          </div>
          <div>
            <i class="navy">!</i
            ><span
              >Total unpaid amount<b>{{ outstanding() | currency: 'USD' }}</b></span
            >
          </div>
          <div>
            <i class="amber">▤</i
            ><span
              >Total outstanding<b>{{ outstanding() | currency: 'USD' }}</b></span
            >
          </div>
          <div>
            <i class="cyan">▥</i
            ><span
              >Collection rate<b>{{ collectionRate() | number: '1.0-0' }}%</b></span
            >
          </div>
        </section>
        <div class="progress"><i [style.width.%]="collectionRate()"></i></div>
      </article>
      }
      @if (canSection('students')) {
      <button class="summary" (click)="summaryOpen.set(!summaryOpen())">
        ⚑ &nbsp; STUDENT SUMMARY BY CLASS
        <span>{{ summaryOpen() ? 'Hide' : 'Click to view' }}⌄</span>
      </button>
      @if (summaryOpen()) {
        <article class="student-summary">
          <section class="student-totals">
            <div><span>TOTAL STUDENTS</span><b>{{ summaryTotal() }}</b></div>
            <div><span>MALE STUDENTS</span><b>{{ summaryMale() }}</b></div>
            <div><span>FEMALE STUDENTS</span><b>{{ summaryFemale() }}</b></div>
          </section>
          <div class="class-table">
            <table>
              <thead><tr><th>#</th><th>CLASS NAME</th><th>TOTAL STUDENTS</th><th>MALE</th><th>FEMALE</th></tr></thead>
              <tbody>
                @for (row of classSummary(); track row.ClassId; let index = $index) {
                  <tr><td>{{ index + 1 }}</td><td><span class="class-icon">▣</span><b>{{ row.ClassName }}</b></td><td><span class="count total">{{ row.TotalStudents }}</span></td><td><span class="count male">{{ row.MaleStudents }}</span></td><td><span class="count female">{{ row.FemaleStudents }}</span></td></tr>
                } @empty {
                  <tr><td colspan="5" class="no-classes">No active class enrollments found.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
        <article class="panel drilldown">
          <p>Active students</p>
          <strong>{{ data()?.TotalStudents || 0 }}</strong
          ><a routerLink="/students">Open student directory →</a>
        </article>
      }
      }
      @if (data()?.MyActivity?.length) {
        <article class="panel my-activity">
          <header><h3>MY RECENT ACTIVITY</h3></header>
          <div>
            @for (activity of data().MyActivity; track $index) {
              <p><span>{{ activity.Action }} · {{ activity.EntityType }}</span><small>{{ activity.CreatedAt }}</small></p>
            }
          </div>
        </article>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .personal-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; padding:14px 18px; border-radius:10px; background:linear-gradient(120deg,#211e75,#155b98); color:white; }
      .personal-head small { font-size:8px; color:#9de4f3; font-weight:800; }
      .personal-head h2 { margin:2px 0; font-size:17px; }
      .personal-head p { margin:0; color:#d8e7f6; font-size:9px; }
      .personal-head > span { padding:7px 10px; border-radius:14px; background:#ffffff18; font-size:9px; }
      .tabs {
        height: 52px;
        background: white;
        border-radius: 0 0 10px 10px;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 14px;
        box-shadow: 0 5px 14px #1b2b4a16;
        margin: -18px -18px 12px;
      }
      .tabs span {
        flex: 1;
      }
      .tabs button {
        border: 0;
        border-radius: 16px;
        background: #104b98;
        color: white;
        font-size: 10px;
        font-weight: 800;
        padding: 7px 12px;
      }
      .tabs .active {
        background: #27435d;
      }
      .tabs .period {
        font-size: 9px;
      }
      .kpis {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 9px;
      }
      .kpis article {
        height: 76px;
        border-radius: 10px;
        color: white;
        display: flex;
        align-items: center;
        padding: 12px;
        gap: 12px;
        position: relative;
        overflow: hidden;
      }
      .kpis article > i {
        position: absolute;
        width: 82px;
        height: 82px;
        border-radius: 50%;
        right: -18px;
        background: #fff1;
      }
      .kpis .round {
        width: 39px;
        height: 39px;
        border-radius: 50%;
        background: white;
        color: #1e6be3;
        display: grid;
        place-items: center;
        font-weight: 900;
        z-index: 1;
      }
      .kpis div {
        display: grid;
        z-index: 1;
      }
      .kpis small {
        font-size: 9px;
        font-weight: 800;
      }
      .kpis strong {
        font-size: 21px;
        line-height: 1.05;
      }
      .kpis em {
        font-size: 8px;
        font-style: normal;
        margin-top: 3px;
      }
      .blue-card {
        background: #2877ef;
      }
      .purple-card {
        background: #5b2ac7;
      }
      .cyan-card {
        background: #1389b7;
      }
      .navy-card {
        background: #242178;
      }
      .orange-card {
        background: #ff8b0b;
      }
      .deep-card {
        background: #27217e;
      }
      .gold-card {
        background: #f79900;
      }
      .teal-card {
        background: #33bcae;
      }
      .panel {
        background: white;
        border: 1px solid #dce7f1;
        border-radius: 10px;
        box-shadow: 0 5px 12px #223d5b10;
        overflow: hidden;
      }
      .panel header {
        height: 43px;
        border-bottom: 1px solid #dfe8f1;
        padding: 0 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .panel h3 {
        font-size: 10px;
        color: #0c4199;
        margin: 0;
        font-weight: 800;
      }
      .panel header button {
        border: 1px solid #bed1e6;
        background: white;
        color: #17416d;
        border-radius: 6px;
        font-size: 9px;
        padding: 6px 9px;
        margin-left: 5px;
      }
      .panel header .selected {
        background: #5236df;
        color: white;
      }
      .chart-wrap {
        height: 240px;
        display: grid;
        grid-template-columns: 42px 1fr 205px;
        padding: 15px 10px 8px;
      }
      .y-axis {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 180px;
        font-size: 8px;
        color: #6e7b8d;
        text-align: right;
        padding-right: 5px;
      }
      .chart {
        height: 195px;
        border-left: 1px solid #d8e1eb;
        border-bottom: 1px solid #d8e1eb;
        background: repeating-linear-gradient(to bottom, #fff 0, #fff 44px, #e7edf2 45px);
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
      }
      .month {
        height: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
      }
      .month .column {
        width: 18px;
        background: linear-gradient(#157ae6, #2464bd);
        border-radius: 6px 6px 0 0;
        position: relative;
        transition: 0.4s;
      }
      .month .column b {
        position: absolute;
        top: -16px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 7px;
        color: #335;
        white-space: nowrap;
      }
      .month span {
        font-size: 7px;
        color: #627184;
        margin: 7px 0 -15px;
      }
      .chart-wrap aside {
        margin-left: 12px;
        background: #edf7ff;
        border: 1px solid #afd4f6;
        border-radius: 9px;
        padding: 16px 12px;
        height: 190px;
      }
      .chart-wrap aside p {
        font-size: 8px;
        border-bottom: 1px dashed #bdd2e4;
        padding: 7px 0;
        margin: 0;
        display: flex;
        justify-content: space-between;
      }
      .positive {
        color: #19a51f;
      }
      .dual {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin: 10px 0;
      }
      .dual .panel {
        height: 315px;
      }
      .bars,
      .comparison {
        height: 215px;
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        padding: 30px 8% 0;
        background: repeating-linear-gradient(to bottom, #fff 0, #fff 54px, #e5eaf0 55px);
      }
      .bars > div,
      .comparison > div {
        width: 38%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-direction: column;
      }
      .bars i,
      .comparison i {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        min-height: 24px;
        background: #287cbd;
        border-radius: 4px 4px 0 0;
        font-style: normal;
        color: #375068;
      }
      .bars i.expense {
        background: #ec493c;
      }
      .bars i b,
      .comparison i b {
        font-size: 11px;
      }
      .bars span,
      .comparison span {
        font-size: 8px;
        margin-top: 6px;
      }
      .income footer {
        text-align: center;
        margin: 0 auto;
        border: 1px solid #dfe5eb;
        width: 150px;
        padding: 8px;
        display: grid;
        font-size: 8px;
      }
      .income footer strong {
        color: #e0a400;
        font-size: 14px;
      }
      .income footer small {
        color: #24a44d;
      }
      .comparison i {
        background: #37b2c3;
        border-radius: 16px 16px 4px 4px;
      }
      .comparison i.current {
        background: #1fc58d;
      }
      .compare footer {
        display: flex;
        justify-content: center;
      }
      .compare footer div {
        display: grid;
        text-align: center;
        border: 1px solid #dfe5eb;
        padding: 7px 20px;
        font-size: 8px;
      }
      .negative {
        color: #e03131;
      }
      .overview {
        padding-bottom: 10px;
      }
      .overview section {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 8px;
        padding: 10px;
      }
      .overview section > div {
        border: 1px solid #dce4ec;
        border-radius: 8px;
        padding: 9px;
        display: flex;
        gap: 9px;
      }
      .overview section i {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        color: white;
        display: grid;
        place-items: center;
        font-style: normal;
      }
      .overview section span {
        font-size: 8px;
        display: grid;
      }
      .overview section b {
        font-size: 11px;
      }
      .blue {
        background: #2877ef;
      }
      .orange {
        background: #ff8b0b;
      }
      .purple {
        background: #5b2ac7;
      }
      .navy {
        background: #242178;
      }
      .amber {
        background: #e98300;
      }
      .cyan {
        background: #168dbb;
      }
      .progress {
        height: 4px;
        margin: 0 10px;
        background: #dce5ef;
      }
      .progress i {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #0b7dea, #7e2de2);
      }
      .summary {
        width: 100%;
        border: 1px solid #acd3f8;
        background: #edf7ff;
        border-radius: 8px;
        margin-top: 10px;
        padding: 12px;
        color: #114c9b;
        text-align: left;
        font-size: 10px;
        font-weight: 800;
      }
      .summary span {
        float: right;
        font-weight: 500;
      }
      .drilldown { display: none; }
      .student-summary { padding: 12px 0 8px; background: white; }
      .student-totals { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:10px; }
      .student-totals div { display:flex; align-items:center; justify-content:space-between; min-height:50px; padding:0 12px; border:1px solid #cde1fb; border-radius:10px; background:#f1f7ff; }
      .student-totals span { color:#60708d; font-size:9px; font-weight:800; }
      .student-totals b { color:#064794; font-size:15px; }
      .class-table { overflow:auto; }
      .class-table table { min-width:680px; border-collapse:separate !important; border-spacing:0 7px; }
      .class-table th { border:0 !important; background:white !important; color:#53617e !important; }
      .class-table td { height:52px; border-top:1px solid #dfebf7 !important; border-bottom:1px solid #dfebf7 !important; background:white; }
      .class-table td:first-child { border-left:1px solid #dfebf7 !important; border-radius:10px 0 0 10px; }
      .class-table td:last-child { border-right:1px solid #dfebf7 !important; border-radius:0 10px 10px 0; }
      .class-icon { display:inline-grid; place-items:center; width:30px; height:30px; margin-right:9px; border-radius:9px; background:#5146ed; color:white; }
      .count { display:inline-block; min-width:34px; padding:7px 10px; border-radius:18px; text-align:center; font-weight:800; }
      .count.total,.count.male { background:#e8f3ff; color:#1264d2; }
      .count.female { background:#ffe8f2; color:#e92d80; }
      .no-classes { padding:35px !important; text-align:center !important; color:#758392; }
      .my-activity { margin-top:10px; }
      .my-activity > div { padding:4px 14px 10px; }
      .my-activity p { display:flex; justify-content:space-between; margin:0; padding:10px 0; border-bottom:1px solid #edf1f5; font-size:9px; }
      .my-activity p:last-child { border-bottom:0; }
      .my-activity small { color:#778696; }
      .state {
        background: white;
        border-radius: 10px;
        padding: 80px;
        text-align: center;
      }
      .error {
        color: #b42318;
      }
      @media (max-width: 1100px) {
        .kpis {
          grid-template-columns: repeat(2, 1fr);
        }
        .overview section {
          grid-template-columns: repeat(3, 1fr);
        }
        .chart-wrap {
          grid-template-columns: 35px 1fr;
        }
        .chart-wrap aside {
          display: none;
        }
      }
      @media (max-width: 720px) {
        .tabs {
          overflow: auto;
        }
        .tabs span {
          display: none;
        }
        .kpis,
        .dual {
          grid-template-columns: 1fr;
        }
        .overview section {
          grid-template-columns: 1fr 1fr;
        }
        .student-totals { grid-template-columns:1fr; }
        .collection {
          overflow: auto;
        }
        .chart-wrap {
          min-width: 700px;
        }
        .dual .panel {
          height: 285px;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  data = signal<any>(null);
  loading = signal(true);
  error = signal('');
  activeTab = signal('overview');
  chartMode = signal<'column' | 'line'>('column');
  summaryOpen = signal(true);
  selectedMonth = signal('August 2026');
  selectedYear = signal('2026/27');
  months = [
    { name: 'Sep 2025', value: 0 },
    { name: 'Oct 2025', value: 0 },
    { name: 'Nov 2025', value: 0 },
    { name: 'Dec 2025', value: 0 },
    { name: 'Jan 2026', value: 0 },
    { name: 'Feb 2026', value: 0 },
    { name: 'Mar 2026', value: 0 },
    { name: 'Apr 2026', value: 0 },
    { name: 'May 2026', value: 0 },
    { name: 'Jun 2026', value: 0 },
    { name: 'Jul 2026', value: 0 },
    { name: 'Aug 2026', value: 0 },
  ];
  readonly Permissions = Permissions;
  constructor(private api: ApiService, public permissions: PermissionService) {}
  ngOnInit() {
    this.api.get<any>('/dashboard').subscribe({
      next: (r) => {
        this.data.set(r.data);
        const current = Number(r.data.FeesCollectedThisMonth || 0);
        this.months[11].value = current;
        this.months[10].value = Math.round(current * 1.09);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Dashboard data could not be loaded.');
        this.loading.set(false);
      },
    });
  }
  cards() {
    const d = this.data() || {};
    return [
      {
        label: 'TOTAL STUDENTS',
        value: d.TotalStudents || 0,
        icon: '♙',
        note: 'All registered students',
        color: 'blue-card',
      },
      {
        label: 'TOTAL CLASSES',
        value: d.TotalClasses || 0,
        icon: '▣',
        note: 'Active classes',
        color: 'purple-card',
      },
      {
        label: 'TOTAL TEACHERS',
        value: d.TotalTeachers || 0,
        icon: '♙',
        note: 'Active teachers',
        color: 'cyan-card',
      },
      {
        label: 'FEES',
        value: d.FeesCollectedThisMonth || 0,
        icon: '▤',
        note: 'Collected this month',
        color: 'navy-card',
        money: true,
      },
      {
        label: 'TODAY PRESENT',
        value: d.PresentToday || 0,
        icon: '▦',
        note: 'Today present',
        color: 'orange-card',
      },
      {
        label: 'TODAY ABSENT',
        value: d.AbsentToday || 0,
        icon: '▦',
        note: 'Today absent',
        color: 'deep-card',
      },
      {
        label: 'ORPHAN',
        value: d.OrphanStudents || 0,
        icon: '♙',
        note: 'Orphan students',
        color: 'gold-card',
      },
      {
        label: 'FREE',
        value: d.FreeScholarships || 0,
        icon: '♙',
        note: 'Scholarship students',
        color: 'teal-card',
      },
    ].filter((card: any) => this.cardAllowed(card.label));
  }
  cardAllowed(label: string) {
    if (['FEES'].includes(label)) return this.canSection('finance');
    if (['TODAY PRESENT', 'TODAY ABSENT'].includes(label)) return this.canSection('attendance');
    if (label === 'TOTAL TEACHERS') return this.canSection('hrm') || this.canSection('reports');
    if (label === 'TOTAL CLASSES') return this.canSection('academic') || this.canSection('students') || this.canSection('reports');
    return this.canSection('students') || this.canSection('reports');
  }
  canSection(section: string) {
    return (this.data()?.DashboardSections ?? []).includes(section);
  }
  roleLabel() {
    return (this.data()?.MyRoles ?? []).join(' · ') || 'Assigned user';
  }
  maxCollection() {
    return Math.max(...this.months.map((m) => m.value), 1);
  }
  totalAnnual() {
    return this.months.reduce((s, m) => s + m.value, 0);
  }
  previousAnnual() {
    return Math.round(this.totalAnnual() * 0.58);
  }
  annualChange() {
    return this.totalAnnual() - this.previousAnnual();
  }
  annualGrowth() {
    return this.previousAnnual() ? (this.annualChange() / this.previousAnnual()) * 100 : 0;
  }
  monthIncome() {
    return Number(this.data()?.FeesCollectedThisMonth || 0);
  }
  previousMonth() {
    return this.months[10].value;
  }
  expenses() {
    return Number(this.data()?.TotalExpenses || 0);
  }
  netIncome() {
    return this.monthIncome() - this.expenses();
  }
  incomeHeight() {
    return this.scale(this.monthIncome());
  }
  expenseHeight() {
    return this.scale(this.expenses());
  }
  previousMonthHeight() {
    return this.scale(this.previousMonth());
  }
  currentMonthHeight() {
    return this.scale(this.monthIncome());
  }
  private scale(v: number) {
    const max = Math.max(this.monthIncome(), this.previousMonth(), this.expenses(), 1);
    return Math.max((v / max) * 82, 3);
  }
  outstanding() {
    return Number(this.data()?.OutstandingInvoices || 0);
  }
  paid() {
    return this.monthIncome();
  }
  totalCharges() {
    return this.paid() + this.outstanding();
  }
  discounts() {
    return Number(this.data()?.TotalDiscounts || 0);
  }
  collectionRate() {
    return this.totalCharges() ? (this.paid() / this.totalCharges()) * 100 : 0;
  }
  classSummary() {
    return this.data()?.StudentSummaryByClass ?? [];
  }
  summaryTotal() {
    return this.classSummary().reduce((sum: number, row: any) => sum + Number(row.TotalStudents), 0);
  }
  summaryMale() {
    return this.classSummary().reduce((sum: number, row: any) => sum + Number(row.MaleStudents), 0);
  }
  summaryFemale() {
    return this.classSummary().reduce((sum: number, row: any) => sum + Number(row.FemaleStudents), 0);
  }
  cycleMonth() {
    this.selectedMonth.update(value => value === 'August 2026' ? 'July 2026' : 'August 2026');
  }
  cycleYear() {
    this.selectedYear.update(value => value === '2026/27' ? '2025/26' : '2026/27');
  }
}
