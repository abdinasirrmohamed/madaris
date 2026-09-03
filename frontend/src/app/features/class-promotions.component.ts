import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { DialogService } from '../core/dialog.service';
import { ToastService } from '../core/toast.service';

interface StudentCandidate {
  StudentId: number;
  AdmissionNo: string;
  StudentName: string;
  Gender: string;
  EnrollmentId: number;
  EnrolledAt: string;
  ExamCount: number;
  AverageScore: number | null;
  MinimumPromotionScore: number;
  Passed: boolean;
  ProposedStatus: 'Promoted' | 'Graduated' | 'Retained';
  Action: 'Promoted' | 'Graduated' | 'Retained' | 'Leave' | 'Skip';
  MissingExamCount: number;
  UnfinishedExamCount: number;
  EligibilityReason: string;
  SuggestedClassId: number | null;
  TargetClassId: number | null;
  Selected: boolean;
}

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <small>ACADEMIC MANAGEMENT</small>
        <h1>Class Promotions (Dallacsiinta Fasallada)</h1>
        <p>U dallacsii ardayda fasallada xiga, u reeb fasalkooda, ama la soco taariikhda dallacsiinta.</p>
      </div>
      <div class="head-actions">
        <button class="btn-back" (click)="router.navigate(['/academic/classes'])">
          ← Ku noqo Fasallada
        </button>
      </div>
    </header>

    <!-- TABS -->
    <nav class="nav-tabs">
      <button [class.active]="activeTab() === 'workspace'" (click)="setTab('workspace')">
        🎓 Dallacsiin Fasal (Promotion Workspace)
      </button>
      <button [class.active]="activeTab() === 'logs'" (click)="setTab('logs')">
        📜 Diiwaanka Dallacsiinta (Promotion History)
      </button>
    </nav>

    <!-- LOADING SPINNER -->
    @if (loading()) {
      <div class="loading-bar">Xogta waa la soo rarayaa…</div>
    }

    <!-- ========================================================================= -->
    <!-- TAB 1: PROMOTION WORKSPACE (WIZARD & CANDIDATES) -->
    <!-- ========================================================================= -->
    @if (activeTab() === 'workspace') {
      <!-- STEP 1: CLASS MAPPING PANEL -->
      <section class="panel mapping-panel">
        <header class="panel-header">
          <div>
            <h3>1. Dooro Fasalka Hore iyo Fasalka Loo Dallacsiinayo</h3>
            <p>Dooro fasalka aad rabto inaad ardaydiisa dallacsiiso iyo fasalka cusub ee ay u gudbayaan.</p>
          </div>
        </header>

        <div class="mapping-grid">
          <!-- SOURCE BOX -->
          <div class="mapping-box source-box">
            <div class="box-tag">Fasalkii Hore (Source)</div>
            <div class="form-group">
              <label>Laanta (Branch)</label>
              <select [(ngModel)]="selectedBranchId" (change)="onBranchChange()">
                <option [value]="null" disabled>Dooro Laan</option>
                @for (b of branches(); track b.BranchId) {
                  <option [value]="b.BranchId">{{ b.Name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Sannad-Dugsiyeedka Hore</label>
              <select [(ngModel)]="selectedSourceYearId" (change)="clearCandidates()">
                <option [value]="null" disabled>Dooro Sannad Hore</option>
                @for (y of academicYears(); track y.AcademicYearId) {
                  <option [value]="y.AcademicYearId">{{ y.Name }} {{ y.IsDefault ? '(Hadda)' : '' }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Fasalka Hore (Class to Promote)</label>
              <select [(ngModel)]="selectedSourceClassId" (change)="onSourceClassChange()">
                <option [value]="null" disabled>Dooro Fasal</option>
                @for (c of branchSourceClasses(); track c.ClassId) {
                  <option [value]="c.ClassId">{{ c.Name }} ({{ c.LevelName || 'Level' }})</option>
                }
              </select>
            </div>
          </div>

          <!-- CONNECTOR ARROW -->
          <div class="mapping-connector">
            <div class="connector-circle">➜</div>
            <span class="connector-label">U dallacsiinaya</span>
          </div>

          <!-- TARGET BOX -->
          <div class="mapping-box target-box">
            <div class="box-tag target-tag">Fasalka Cusub (Target)</div>
            <div class="form-group">
              <label>Sannad-Dugsiyeedka Cusub</label>
              <select [(ngModel)]="selectedTargetYearId">
                <option [value]="null" disabled>Dooro Sannad Cusub</option>
                @for (y of academicYears(); track y.AcademicYearId) {
                  <option [value]="y.AcademicYearId">{{ y.Name }} {{ y.IsDefault ? '(Hadda)' : '' }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Fasalka Cusub (Next Class)</label>
              <select [(ngModel)]="selectedTargetClassId" (change)="onTargetClassChange()">
                <option [value]="null" disabled>Dooro Fasalka Xiga</option>
                @for (c of branchTargetClasses(); track c.ClassId) {
                  <option [value]="c.ClassId">{{ c.Name }} ({{ c.LevelName || 'Level' }})</option>
                }
              </select>
            </div>

            <!-- TARGET CLASS CAPACITY INFO -->
            @if (targetClassInfo(); as tc) {
              <div class="capacity-info-card" [class.full]="tc.AvailableSeats <= 0">
                <div class="cap-header">
                  <span>Kuraasta Fasalka Cusub:</span>
                  <b>{{ tc.CurrentEnrolled }} / {{ tc.Capacity }}</b>
                </div>
                <div class="cap-bar-track">
                  <div class="cap-bar-fill" [style.width.%]="capacityPercent(tc)"></div>
                </div>
                <div class="cap-seats">
                  @if (tc.AvailableSeats > 0) {
                    <span class="seats-ok">✓ Waxaa bannaan <b>{{ tc.AvailableSeats }}</b> kuraas</span>
                  } @else {
                    <span class="seats-full">⚠️ Kuraastu waa buuxaan (Capacity Buuxa)</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="mapping-actions">
          <button class="primary btn-load-students" [disabled]="!canLoadCandidates()" (click)="loadCandidates()">
            👥 Soo Saar Liiska Ardayda
          </button>
        </div>
      </section>

      <!-- STEP 2: STUDENT CANDIDATES TABLE -->
      @if (candidatesLoaded()) {
        <section class="panel candidates-panel">
          <header class="panel-header-rich">
            <div>
              <h3>2. Liiska Ardayda & Go'aannada Dallacsiinta</h3>
              <p>
                Waxaa la helay {{ candidates().length }} arday. Dhibcaha ugu yar ee u gudubka waa
                <b>{{ minScore() }}%</b>.
              </p>
            </div>
            <div class="bulk-quick-actions">
              <button class="btn-bulk-promoted" (click)="setAllAction('Promoted')">
                ✓ Dhammaan ka dhig: Dallacay
              </button>
              <button class="btn-bulk-retained" (click)="setAllAction('Retained')">
                ↺ Dhammaan ka dhig: Ku Celiyay
              </button>
            </div>
          </header>

          <!-- KPI SUMMARY STATS -->
          <div class="stats-ribbon">
            <div class="stat-item total">
              <span>Wadarta Ardayda</span>
              <b>{{ candidates().length }}</b>
            </div>
            <div class="stat-item promoted">
              <span>Loo Dallacsiinayo</span>
              <b>{{ countPromoted() }}</b>
            </div>
            <div class="stat-item retained">
              <span>Fasalka ku celinaya</span>
              <b>{{ countRetained() }}</b>
            </div>
            <div class="stat-item leave">
              <span>Ka tagay / Reebtay</span>
              <b>{{ countLeave() }}</b>
            </div>
            <div class="stat-item capacity" [class.alert]="capacityExceeded()">
              <span>Kuraasta Harsan ee Fasalka Cusub</span>
              <b>{{ targetClassInfo() ? targetClassInfo().AvailableSeats - countPromoted() : '—' }}</b>
            </div>
          </div>

          <!-- TABLE -->
          <div class="table-wrap">
            <table class="candidates-table">
              <thead>
                <tr>
                  <th style="width: 40px;">
                    <input type="checkbox" [checked]="allCandidatesSelected()" (change)="toggleSelectAll($event)" />
                  </th>
                  <th>ARDAYGA</th>
                  <th>JINSIGA</th>
                  <th>CELCELISKA IMIXAANKA</th>
                  <th>GO'AANKA DALLACSIINTA</th>
                  <th>FASALKA CUSUB EE LOO DIRAYO</th>
                </tr>
              </thead>
              <tbody>
                @for (student of candidates(); track student.StudentId) {
                  <tr [class.row-promoted]="student.Action === 'Promoted'" [class.row-retained]="student.Action === 'Retained'" [class.row-leave]="student.Action === 'Leave'">
                    <td>
                      <input type="checkbox" [(ngModel)]="student.Selected" />
                    </td>
                    <td>
                      <div class="student-profile-cell">
                        <div class="avatar">{{ getInitials(student.StudentName) }}</div>
                        <div>
                          <b class="s-name">{{ student.StudentName }}</b>
                          <div class="s-admn">Ref: {{ student.AdmissionNo }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="gender-pill" [class.female]="student.Gender === 'Female'">
                        {{ student.Gender === 'Female' ? 'Dhedig' : 'Lab' }}
                      </span>
                    </td>
                    <td>
                      @if (student.AverageScore !== null) {
                        <div class="score-box" [class.pass]="student.Passed" [class.fail]="!student.Passed">
                          <b class="score-num">{{ student.AverageScore }}%</b>
                          <span class="score-badge">{{ student.Passed ? 'Gudbay' : student.EligibilityReason }}</span>
                        </div>
                      } @else {
                        <span class="no-exams">{{ student.EligibilityReason }}</span>
                      }
                    </td>
                    <td>
                      <div class="decision-pill-group">
                        <button
                          type="button"
                          class="pill-btn promoted"
                          [class.active]="student.Action === 'Promoted'"
                          [disabled]="!student.Passed || isFinalClass()"
                          (click)="setStudentAction(student, 'Promoted')"
                        >
                          🟢 Dallacay
                        </button>
                        @if(isFinalClass()) {<button type="button" class="pill-btn promoted" [class.active]="student.Action === 'Graduated'" [disabled]="!student.Passed" (click)="setStudentAction(student, 'Graduated')">🎓 Graduated</button>}
                        <button
                          type="button"
                          class="pill-btn retained"
                          [class.active]="student.Action === 'Retained'"
                          (click)="setStudentAction(student, 'Retained')"
                        >
                          🟡 Ku Celiyay
                        </button>
                        <button
                          type="button"
                          class="pill-btn leave"
                          [class.active]="student.Action === 'Leave'"
                          (click)="setStudentAction(student, 'Leave')"
                        >
                          🔴 Ka Tagay
                        </button>
                      </div>
                    </td>
                    <td>
                      @if (student.Action === 'Graduated') {<span class="retained-note">Wuxuu dhammeeyey final class — status: Graduated</span>} @else if (student.Action === 'Promoted') {
                        <select [(ngModel)]="student.TargetClassId" class="inline-class-select">
                          @for (c of branchTargetClasses(); track c.ClassId) {
                            <option [value]="c.ClassId">{{ c.Name }} ({{ c.LevelName || 'Level' }})</option>
                          }
                        </select>
                      } @else if (student.Action === 'Retained') {
                        <span class="retained-note">Kuma gudbayo (Wuxuu joogayaa fasalka)</span>
                      } @else {
                        <span class="leave-note">Diiwaanka waa laga saarayaa</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- EXECUTION FOOTER -->
          <footer class="promotion-footer">
            <div class="footer-summary">
              <label class="override-checkbox">
                <input type="checkbox" [(ngModel)]="overrideCapacity" />
                <b>U oggolow fasalka inuu dhaafo kuraasta (Override Class Capacity)</b>
              </label>
              @if (capacityExceeded() && !overrideCapacity) {
                <div class="capacity-warning">
                  ⚠️ Tirada ardayda la dallacsiinayo ({{ countPromoted() }}) waxay ka badan tahay kuraasta bannaan ({{ targetClassInfo()?.AvailableSeats || 0 }}). Fadlan dooro "Override Class Capacity" si aad u fuliso.
                </div>
              }
            </div>

            <div class="footer-buttons">
              <button class="secondary" (click)="clearCandidates()">Jooji</button>
              <button
                class="primary btn-execute-promote"
                [disabled]="executingPromotion() || (!overrideCapacity && capacityExceeded()) || !hasSelectedActions()"
                (click)="confirmAndExecutePromotion()"
              >
                {{ executingPromotion() ? 'Waa la fulinayaa…' : '🚀 Fuli Dallacsiinta (' + countPromoted() + ' Arday)' }}
              </button>
            </div>
          </footer>
        </section>
      }
    }

    <!-- ========================================================================= -->
    <!-- TAB 2: PROMOTION HISTORY & LOGS -->
    <!-- ========================================================================= -->
    @if (activeTab() === 'logs') {
      <section class="panel logs-panel">
        <header class="panel-header-rich">
          <div>
            <h3>Diiwaanka Taariikhda Dallacsiinta (Promotion Logs)</h3>
            <p>La soco dhammaan ardayda hore loo dallacsiiyay ama fasallada ku celiyay.</p>
          </div>
          <button class="btn-export-csv" (click)="exportLogsCsv()">📥 Dhoofso CSV</button>
        </header>

        <!-- KPI SUMMARY CARDS -->
        <div class="logs-kpis">
          <div class="kpi-card">
            <span>Wadarta Dallacsiinta Hore</span>
            <b>{{ logsSummary().Total || logs().length }}</b>
          </div>
          <div class="kpi-card green">
            <span>Kuwa Dallacay</span>
            <b>{{ logsSummary().Promoted || 0 }}</b>
          </div>
          <div class="kpi-card orange">
            <span>Kuwa Ku Celiyay</span>
            <b>{{ logsSummary().Retained || 0 }}</b>
          </div>
        </div>

        <!-- SEARCH AND FILTERS -->
        <div class="logs-filters-bar">
          <div class="search-input-wrap">
            <input
              type="text"
              [(ngModel)]="logsSearch"
              (keyup.enter)="loadLogs()"
              placeholder="Raadi magaca ardayga, admission number..."
            />
            @if (logsSearch) {
              <button class="clear-btn" (click)="logsSearch = ''; loadLogs()">×</button>
            }
          </div>

          <select [(ngModel)]="logsStatusFilter" (change)="loadLogs()">
            <option value="">Dhammaan Xaaladaha</option>
            <option value="Promoted">Dallacay (Promoted)</option>
            <option value="Retained">Ku Celiyay (Retained)</option>
          </select>

          <button class="primary" (click)="loadLogs()">Raadi</button>
          <button class="secondary" (click)="resetLogsFilters()">Nadiifi</button>
        </div>

        <!-- LOGS TABLE -->
        <div class="table-wrap">
          <table class="logs-table">
            <thead>
              <tr>
                <th>REF</th>
                <th>ARDAYGA</th>
                <th>FASALKII HORE</th>
                <th>FASALKA CUSUB</th>
                <th>XAALADDA</th>
                <th>MAAMULAHA</th>
                <th>TAARIIKHDA</th>
                <th>FICIL</th>
              </tr>
            </thead>
            <tbody>
              @for (log of logs(); track log.PromotionLogId) {
                <tr>
                  <td><span class="ref-badge">#{{ log.PromotionLogId }}</span></td>
                  <td>
                    <div class="student-profile-cell">
                      <div class="avatar">{{ getInitials(log.StudentName) }}</div>
                      <div>
                        <b>{{ log.StudentName }}</b>
                        <div class="s-admn">{{ log.AdmissionNo }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="class-cell-item">
                      <b>{{ log.FromClassName || '—' }}</b>
                      <small>{{ log.FromYearName }}</small>
                    </div>
                  </td>
                  <td>
                    <div class="class-cell-item target">
                      <b>{{ log.ToClassName || '—' }}</b>
                      <small>{{ log.ToYearName }}</small>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" [class.promoted]="log.Status === 'Promoted'" [class.retained]="log.Status === 'Retained'">
                      {{ log.Status === 'Promoted' ? '🟢 Dallacay' : '🟡 Ku Celiyay' }}
                    </span>
                  </td>
                  <td>
                    <span class="user-tag">👤 {{ log.PromotedByName || 'Admin' }}</span>
                  </td>
                  <td>
                    <div class="log-date">{{ log.CreatedAt | date: 'dd/MM/yyyy' }}</div>
                    <small class="log-time">{{ log.CreatedAt | date: 'HH:mm' }}</small>
                  </td>
                  <td>
                    <button class="btn-revert" (click)="revertPromotion(log)" title="Ka noqo dallacsiintan">
                      ↺ Ka Noqo
                    </button>
                  </td>
                </tr>
              }
              @if (!logs().length) {
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <div class="empty-icon">📜</div>
                      <h4>Diiwaan lama helin</h4>
                      <p>Weli ma jiraan arday hore loo dallacsiiyay ama shaandhaynta waxba kuma jiraan.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        color: #1d2939;
        font-family: inherit;
      }
      * {
        box-sizing: border-box;
      }
      .page-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;
      }
      .page-head small {
        color: #15549c;
        font-weight: 850;
        letter-spacing: 0.12em;
        font-size: 11px;
      }
      .page-head h1 {
        margin: 4px 0;
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
      }
      .page-head p {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 13px;
      }
      .btn-back {
        border: 1px solid #cbd5e1;
        background: white;
        color: #1e293b;
        padding: 8px 14px;
        border-radius: 8px;
        font-weight: 650;
        font-size: 12px;
        cursor: pointer;
      }
      .btn-back:hover {
        background: #f8fafc;
      }

      /* TABS */
      .nav-tabs {
        display: flex;
        gap: 6px;
        margin: 16px 0 20px;
        padding: 6px;
        border-radius: 10px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
      }
      .nav-tabs button {
        border: 0;
        background: transparent;
        color: #64748b;
        padding: 9px 18px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .nav-tabs button:hover {
        color: #0f172a;
        background: #e2e8f0;
      }
      .nav-tabs button.active {
        background: #1e3a8a;
        color: white;
        box-shadow: 0 2px 6px rgba(30, 58, 138, 0.25);
      }

      .loading-bar {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2000;
        padding: 10px 16px;
        border-radius: 8px;
        background: #1e3a8a;
        color: white;
        box-shadow: 0 10px 25px rgba(30, 58, 138, 0.35);
        font-weight: 650;
        font-size: 13px;
      }

      /* PANEL */
      .panel {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        overflow: hidden;
      }
      .panel-header {
        padding: 18px 22px;
        border-bottom: 1px solid #f1f5f9;
      }
      .panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 750;
        color: #0f172a;
      }
      .panel-header p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 12px;
      }
      .panel-header-rich {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 22px;
        border-bottom: 1px solid #f1f5f9;
        flex-wrap: wrap;
        gap: 12px;
      }
      .panel-header-rich h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 750;
        color: #0f172a;
      }
      .panel-header-rich p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 12px;
      }

      /* MAPPING GRID */
      .mapping-grid {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 20px;
        padding: 22px;
        align-items: center;
        background: #fafbfc;
      }
      .mapping-box {
        position: relative;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      }
      .box-tag {
        position: absolute;
        top: -10px;
        left: 16px;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 750;
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
      }
      .box-tag.target-tag {
        background: #eff6ff;
        color: #1d4ed8;
        border-color: #bfdbfe;
      }
      .mapping-connector {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .connector-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #1e3a8a;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(30, 58, 138, 0.25);
      }
      .connector-label {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-bottom: 12px;
      }
      .form-group label {
        font-size: 11px;
        font-weight: 650;
        color: #475569;
      }
      select, input {
        padding: 9px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: white;
        font: inherit;
        font-size: 13px;
        outline: none;
      }
      select:focus, input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }

      /* CAPACITY CARD */
      .capacity-info-card {
        margin-top: 10px;
        padding: 12px 14px;
        border-radius: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }
      .capacity-info-card.full {
        background: #fef2f2;
        border-color: #fecaca;
      }
      .cap-header {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #475569;
        margin-bottom: 6px;
      }
      .cap-bar-track {
        height: 6px;
        border-radius: 3px;
        background: #e2e8f0;
        overflow: hidden;
        margin-bottom: 6px;
      }
      .cap-bar-fill {
        height: 100%;
        background: #2563eb;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .capacity-info-card.full .cap-bar-fill {
        background: #dc2626;
      }
      .cap-seats {
        font-size: 11px;
      }
      .seats-ok {
        color: #15803d;
        font-weight: 600;
      }
      .seats-full {
        color: #b91c1c;
        font-weight: 700;
      }

      .mapping-actions {
        padding: 16px 22px;
        background: white;
        border-top: 1px solid #f1f5f9;
        display: flex;
        justify-content: flex-end;
      }
      button.primary {
        border: 0;
        border-radius: 8px;
        background: linear-gradient(135deg, #1e3a8a, #2563eb);
        color: white;
        padding: 10px 20px;
        font-size: 13px;
        font-weight: 750;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        transition: all 0.15s ease;
      }
      button.primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #172554, #1d4ed8);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
      }
      button.secondary {
        border: 1px solid #cbd5e1;
        background: white;
        color: #334155;
        padding: 9px 16px;
        border-radius: 8px;
        font-weight: 650;
        font-size: 13px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      /* STATS RIBBON */
      .stats-ribbon {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        padding: 16px 22px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }
      .stat-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 14px;
      }
      .stat-item span {
        display: block;
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
      }
      .stat-item b {
        display: block;
        font-size: 18px;
        color: #0f172a;
        margin-top: 3px;
      }
      .stat-item.promoted {
        border-color: #86efac;
        background: #f0fdf4;
      }
      .stat-item.promoted b {
        color: #15803d;
      }
      .stat-item.retained {
        border-color: #fde68a;
        background: #fffbeb;
      }
      .stat-item.retained b {
        color: #b45309;
      }
      .stat-item.capacity.alert {
        border-color: #fca5a5;
        background: #fef2f2;
      }
      .stat-item.capacity.alert b {
        color: #b91c1c;
      }

      /* BULK QUICK ACTIONS */
      .bulk-quick-actions {
        display: flex;
        gap: 8px;
      }
      .btn-bulk-promoted {
        border: 1px solid #86efac;
        background: #f0fdf4;
        color: #15803d;
        padding: 7px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 750;
        cursor: pointer;
      }
      .btn-bulk-retained {
        border: 1px solid #fde68a;
        background: #fffbeb;
        color: #b45309;
        padding: 7px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 750;
        cursor: pointer;
      }

      /* CANDIDATES TABLE */
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        white-space: nowrap;
      }
      th {
        padding: 12px 14px;
        background: #f8fafc;
        color: #475569;
        font-size: 11px;
        font-weight: 750;
        text-align: left;
        border-bottom: 2px solid #e2e8f0;
      }
      td {
        padding: 12px 14px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 12px;
        vertical-align: middle;
      }
      tr.row-promoted {
        background: #fafffb;
      }
      tr.row-retained {
        background: #fffef7;
      }
      tr.row-leave {
        background: #fffbfb;
      }

      .student-profile-cell {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1e3a8a, #3b82f6);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 750;
        flex-shrink: 0;
      }
      .s-name {
        color: #0f172a;
        font-size: 12px;
      }
      .s-admn {
        font-size: 10px;
        color: #64748b;
      }
      .gender-pill {
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 650;
        background: #f1f5f9;
        color: #475569;
      }
      .gender-pill.female {
        background: #fce7f3;
        color: #be185d;
      }

      .score-box {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
      }
      .score-box.pass {
        background: #dcfce7;
        color: #15803d;
      }
      .score-box.fail {
        background: #fee2e2;
        color: #b91c1c;
      }
      .score-badge {
        font-size: 9px;
        font-weight: 750;
        text-transform: uppercase;
      }
      .no-exams {
        font-size: 11px;
        color: #64748b;
        font-style: italic;
      }

      /* DECISION PILLS */
      .decision-pill-group {
        display: flex;
        gap: 4px;
      }
      .pill-btn {
        border: 1px solid #e2e8f0;
        background: white;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 650;
        cursor: pointer;
      }
      .pill-btn.promoted.active {
        background: #15803d;
        border-color: #15803d;
        color: white;
      }
      .pill-btn.retained.active {
        background: #b45309;
        border-color: #b45309;
        color: white;
      }
      .pill-btn.leave.active {
        background: #b91c1c;
        border-color: #b91c1c;
        color: white;
      }

      .inline-class-select {
        padding: 5px 8px;
        font-size: 11px;
        border-radius: 6px;
      }
      .retained-note {
        font-size: 11px;
        color: #b45309;
        font-weight: 600;
      }
      .leave-note {
        font-size: 11px;
        color: #b91c1c;
        font-style: italic;
      }

      /* PROMOTION FOOTER */
      .promotion-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 22px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        flex-wrap: wrap;
        gap: 16px;
      }
      .override-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        cursor: pointer;
      }
      .capacity-warning {
        margin-top: 6px;
        font-size: 11px;
        color: #b91c1c;
        font-weight: 650;
      }
      .footer-buttons {
        display: flex;
        gap: 10px;
      }
      .btn-execute-promote {
        font-size: 14px;
        padding: 12px 24px;
      }

      /* LOGS TAB STYLES */
      .logs-kpis {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        padding: 18px 22px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }
      .kpi-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px 16px;
      }
      .kpi-card span {
        display: block;
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
      }
      .kpi-card b {
        display: block;
        font-size: 22px;
        color: #0f172a;
        margin-top: 4px;
      }
      .kpi-card.green b { color: #15803d; }
      .kpi-card.orange b { color: #b45309; }

      .logs-filters-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 22px;
        border-bottom: 1px solid #f1f5f9;
        flex-wrap: wrap;
      }
      .search-input-wrap {
        position: relative;
        flex: 1;
        min-width: 240px;
      }
      .search-input-wrap input {
        width: 100%;
        padding-right: 26px;
      }
      .clear-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        border: 0;
        background: transparent;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
      }
      .btn-export-csv {
        border: 1px solid #cbd5e1;
        background: white;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 650;
        cursor: pointer;
      }

      .ref-badge {
        font-family: monospace;
        font-weight: 700;
        color: #475569;
        background: #f1f5f9;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
      }
      .class-cell-item b {
        display: block;
        font-size: 12px;
        color: #0f172a;
      }
      .class-cell-item small {
        color: #64748b;
        font-size: 10px;
      }
      .class-cell-item.target b {
        color: #1d4ed8;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 9px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
      }
      .status-badge.promoted {
        background: #dcfce7;
        color: #15803d;
      }
      .status-badge.retained {
        background: #fef3c7;
        color: #b45309;
      }
      .user-tag {
        font-size: 11px;
        color: #475569;
      }
      .btn-revert {
        border: 1px solid #fecaca;
        background: #fef2f2;
        color: #b91c1c;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-revert:hover {
        background: #fee2e2;
      }

      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #64748b;
      }
      .empty-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }
      .empty-state h4 {
        margin: 0 0 4px;
        color: #0f172a;
        font-size: 15px;
      }

      @media (max-width: 900px) {
        .mapping-grid {
          grid-template-columns: 1fr;
        }
        .mapping-connector {
          transform: rotate(90deg);
        }
        .stats-ribbon {
          grid-template-columns: repeat(2, 1fr);
        }
        .logs-kpis {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ClassPromotionsComponent implements OnInit {
  activeTab = signal<'workspace' | 'logs'>('workspace');
  loading = signal(false);
  executingPromotion = signal(false);

  // References
  branches = signal<any[]>([]);
  academicYears = signal<any[]>([]);
  levels = signal<any[]>([]);
  classes = signal<any[]>([]);

  // Selection form
  selectedBranchId: number | null = null;
  selectedSourceYearId: number | null = null;
  selectedSourceClassId: number | null = null;
  selectedTargetYearId: number | null = null;
  selectedTargetClassId: number | null = null;
  overrideCapacity = false;

  // Candidates
  candidatesLoaded = signal(false);
  candidates = signal<StudentCandidate[]>([]);
  minScore = signal(50);
  targetClassInfo = signal<any>(null);
  isFinalClass = signal(false);

  // Logs
  logs = signal<any[]>([]);
  logsSummary = signal<any>({});
  logsSearch = '';
  logsStatusFilter = '';

  // Computed properties
  branchSourceClasses = computed(() => {
    const bId = Number(this.selectedBranchId);
    return this.classes().filter((c) => !bId || Number(c.BranchId) === bId);
  });

  branchTargetClasses = computed(() => {
    const bId = Number(this.selectedBranchId);
    return this.classes().filter((c) => !bId || Number(c.BranchId) === bId);
  });

  countPromoted = computed(() => this.candidates().filter((c) => c.Action === 'Promoted').length);
  countGraduated = computed(() => this.candidates().filter((c) => c.Action === 'Graduated').length);
  countRetained = computed(() => this.candidates().filter((c) => c.Action === 'Retained').length);
  countLeave = computed(() => this.candidates().filter((c) => c.Action === 'Leave').length);

  capacityExceeded = computed(() => {
    const tc = this.targetClassInfo();
    if (!tc) return false;
    return this.countPromoted() > (tc.AvailableSeats || 0);
  });

  allCandidatesSelected = computed(
    () => this.candidates().length > 0 && this.candidates().every((c) => c.Selected),
  );

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private dialog: DialogService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.loadReferences();
  }

  setTab(tab: 'workspace' | 'logs') {
    this.activeTab.set(tab);
    if (tab === 'logs') {
      this.loadLogs();
    }
  }

  loadReferences() {
    this.loading.set(true);
    this.api.get<any>('/academic/promotions/references').subscribe({
      next: (r) => {
        this.branches.set(r.data.Branches || []);
        this.academicYears.set(r.data.AcademicYears || []);
        this.levels.set(r.data.Levels || []);
        this.classes.set(r.data.Classes || []);

        if (r.data.Branches?.length) {
          this.selectedBranchId = r.data.Branches[0].BranchId;
        }
        if (r.data.AcademicYears?.length) {
          const defYear = r.data.AcademicYears.find((y: any) => y.IsDefault) || r.data.AcademicYears[0];
          this.selectedSourceYearId = defYear.AcademicYearId;
          this.selectedTargetYearId = defYear.AcademicYearId;
        }

        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.show(e.error?.message || 'References could not be loaded.', 'error');
      },
    });
  }

  onBranchChange() {
    this.selectedSourceClassId = null;
    this.selectedTargetClassId = null;
    this.clearCandidates();
  }

  onSourceClassChange() {
    this.clearCandidates();
    // Pre-calculate suggested next class
    const sourceClass = this.classes().find((c) => c.ClassId === Number(this.selectedSourceClassId));
    if (sourceClass && sourceClass.LevelSequence) {
      const nextClass = this.classes().find(
        (c) =>
          Number(c.BranchId) === Number(this.selectedBranchId) &&
          c.LevelSequence > sourceClass.LevelSequence,
      );
      if (nextClass) {
        this.selectedTargetClassId = nextClass.ClassId;
        this.updateTargetClassInfo(nextClass.ClassId);
      }
    }
  }

  onTargetClassChange() {
    if (this.selectedTargetClassId) {
      this.updateTargetClassInfo(Number(this.selectedTargetClassId));
      // Update proposed target for all promoted students
      const newTarget = Number(this.selectedTargetClassId);
      this.candidates.update((list) =>
        list.map((c) => ({
          ...c,
          TargetClassId: c.Action === 'Promoted' ? newTarget : c.TargetClassId,
        })),
      );
    }
  }

  updateTargetClassInfo(classId: number) {
    const cls = this.classes().find((c) => c.ClassId === classId);
    this.targetClassInfo.set(cls || null);
  }

  canLoadCandidates(): boolean {
    return !!(this.selectedBranchId && this.selectedSourceYearId && this.selectedSourceClassId);
  }

  clearCandidates() {
    this.candidatesLoaded.set(false);
    this.candidates.set([]);
  }

  loadCandidates() {
    if (!this.canLoadCandidates()) return;
    this.loading.set(true);

    const params = {
      BranchId: String(this.selectedBranchId),
      AcademicYearId: String(this.selectedSourceYearId),
      ClassId: String(this.selectedSourceClassId),
    };

    this.api.get<any>('/academic/promotions/candidates', params).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.minScore.set(r.data.MinimumPromotionScore || 50);
        this.isFinalClass.set(!!r.data.IsFinalClass);
        if(r.data.IsFinalClass){this.selectedTargetClassId=null;this.targetClassInfo.set(null)}

        if (r.data.SuggestedTargetClassId && !this.selectedTargetClassId) {
          this.selectedTargetClassId = r.data.SuggestedTargetClassId;
          this.updateTargetClassInfo(r.data.SuggestedTargetClassId);
        } else if (this.selectedTargetClassId) {
          this.updateTargetClassInfo(Number(this.selectedTargetClassId));
        }

        const targetId = this.selectedTargetClassId || r.data.SuggestedTargetClassId || null;

        const candidateList: StudentCandidate[] = (r.data.Candidates || []).map((c: any) => ({
          ...c,
          Action: c.ProposedStatus || 'Promoted',
          TargetClassId: c.ProposedStatus === 'Promoted' ? targetId : c.ProposedStatus === 'Graduated' ? null : this.selectedSourceClassId,
          Selected: true,
        }));

        this.candidates.set(candidateList);
        this.candidatesLoaded.set(true);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.show(e.error?.message || 'Ardayda lama soo saari karin.', 'error');
      },
    });
  }

  capacityPercent(tc: any): number {
    if (!tc || !tc.Capacity) return 0;
    return Math.min(100, Math.round((tc.CurrentEnrolled / tc.Capacity) * 100));
  }

  getInitials(name: string): string {
    if (!name) return 'A';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  setAllAction(action: 'Promoted' | 'Retained') {
    const targetId = Number(this.selectedTargetClassId);
    const sourceId = Number(this.selectedSourceClassId);

    this.candidates.update((list) =>
      list.map((c) => ({
        ...c,
        Action: action === 'Promoted' && this.isFinalClass() && c.Passed ? 'Graduated' : action === 'Promoted' && !c.Passed ? 'Retained' : action,
        TargetClassId: action === 'Promoted' && !this.isFinalClass() && c.Passed ? targetId : action === 'Retained' || !c.Passed ? sourceId : null,
      })),
    );
  }

  toggleSelectAll(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.candidates.update((list) => list.map((c) => ({ ...c, Selected: checked })));
  }

  setStudentAction(student: StudentCandidate, action: 'Promoted' | 'Graduated' | 'Retained' | 'Leave') {
    if((action==='Promoted'||action==='Graduated')&&!student.Passed){this.toast.show(student.EligibilityReason||'Ardaygu uma qalmo dallacsiin.','error');return}
    student.Action = action;
    if (action === 'Promoted') {
      student.TargetClassId = Number(this.selectedTargetClassId);
    } else if(action === 'Graduated') {
      student.TargetClassId = null;
    } else if (action === 'Retained') {
      student.TargetClassId = Number(this.selectedSourceClassId);
    } else {
      student.TargetClassId = null;
    }
  }

  hasSelectedActions(): boolean {
    return this.candidates().some((c) => c.Selected && c.Action !== 'Skip');
  }

  async confirmAndExecutePromotion() {
    const selected = this.candidates().filter((c) => c.Selected);
    if (!selected.length) {
      this.toast.show('Fadlan dooro ugu yaraan hal arday.', 'error');
      return;
    }

    if (!this.isFinalClass() && !this.selectedTargetClassId) {
      this.toast.show('Fadlan dooro fasalka loo dallacsiinayo.', 'error');
      return;
    }

    const pCount = this.countPromoted();
    const rCount = this.countRetained();
    const gCount = this.countGraduated();

    const confirmed = await this.dialog.confirm(
      'Xaqiiji Dallacsiinta',
      `Ma hubtaa inaad fuliso dallacsiintan?\n\n` +
        `• ${pCount} arday ayaa loo dallacsiinayaa fasalka xiga.\n` +
        `• ${rCount} arday ayaa fasalka ku celinaya.\n\n` +
        `• ${gCount} arday ayaa Graduated noqonaya.\n\n` +
        `Fasalladii hore ee ardayda si nabad ah ayaa loo dhamaystirayaa, diiwaanna waa loo furayaa.`,
    );

    if (!confirmed) return;

    this.executingPromotion.set(true);

    const payload = {
      BranchId: this.selectedBranchId,
      FromAcademicYearId: this.selectedSourceYearId,
      FromClassId: this.selectedSourceClassId,
      ToAcademicYearId: this.selectedTargetYearId,
      ToClassId: this.selectedTargetClassId,
      OverrideCapacity: this.overrideCapacity,
      Students: selected.map((c) => ({
        StudentId: c.StudentId,
        Action: c.Action,
        ToClassId: c.Action==='Graduated'?null:(c.TargetClassId || this.selectedTargetClassId),
        ToAcademicYearId: this.selectedTargetYearId,
      })),
    };

    this.api.post<any>('/academic/promotions/promote', payload).subscribe({
      next: (r) => {
        this.executingPromotion.set(false);
        this.toast.show(r.message || 'Dallacsiinta si guul leh ayaa loo fuliyay!');
        this.clearCandidates();
        this.loadReferences();
        this.setTab('logs');
      },
      error: (e) => {
        this.executingPromotion.set(false);
        this.toast.show(e.error?.message || 'Dallacsiinta waa la waayay.', 'error');
      },
    });
  }

  // LOGS METHODS
  loadLogs() {
    const params: any = {};
    if (this.logsSearch) params.Search = this.logsSearch;
    if (this.logsStatusFilter) params.Status = this.logsStatusFilter;

    this.api.get<any>('/academic/promotions/logs', params).subscribe({
      next: (r) => {
        this.logs.set(r.data || []);
        this.logsSummary.set(r.summary || {});
      },
      error: (e) => {
        this.toast.show(e.error?.message || 'Logs-ka lama soo saari karin.', 'error');
      },
    });
  }

  resetLogsFilters() {
    this.logsSearch = '';
    this.logsStatusFilter = '';
    this.loadLogs();
  }

  async revertPromotion(log: any) {
    const confirmed = await this.dialog.confirm(
      'Ka Noqo Dallacsiinta',
      `Ma hubtaa inaad ka noqoto dallacsiinta ardayga ${log.StudentName}?\n\n` +
        `Ardaygu wuxuu dib ugu laaban doonaa fasalkiisii hore (${log.FromClassName}).`,
    );

    if (!confirmed) return;

    this.api.post<any>(`/academic/promotions/${log.PromotionLogId}/revert`, {}).subscribe({
      next: (r) => {
        this.toast.show(r.message || 'Dallacsiintii waa laga noqday.');
        this.loadLogs();
        this.loadReferences();
      },
      error: (e) => {
        this.toast.show(e.error?.message || 'Ka noqoshada waa lagu guuldareystay.', 'error');
      },
    });
  }

  exportLogsCsv() {
    const rows = [
      ['Ref', 'Ardayga', 'Admission No', 'Fasalkii Hore', 'Sannadkii Hore', 'Fasalka Cusub', 'Sannadka Cusub', 'Xaaladda', 'Maamulaha', 'Taariikhda'],
      ...this.logs().map((x) => [
        x.PromotionLogId,
        x.StudentName,
        x.AdmissionNo,
        x.FromClassName || '',
        x.FromYearName || '',
        x.ToClassName || '',
        x.ToYearName || '',
        x.Status,
        x.PromotedByName || '',
        x.CreatedAt || '',
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `madaaris-promotions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
