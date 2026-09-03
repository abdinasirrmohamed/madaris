import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { DialogService } from '../core/dialog.service';
import { ToastService } from '../core/toast.service';

interface GradCandidate {
  StudentId: number;
  AdmissionNo: string;
  StudentName: string;
  Gender: string;
  EnrollmentId: number;
  EnrolledAt: string;
  ExamCount: number;
  AverageScore: number | null;
  MinimumPromotionScore: number;
  CourseCompleted: boolean;
  TotalInvoiced: number;
  TotalPaid: number;
  OutstandingBalance: number;
  UnpaidInvoicesCount: number;
  FinanceCleared: boolean;
  AlreadyGraduated: boolean;
  CertificateNo: string | null;
  IsEligible: boolean;
  Selected: boolean;
}

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, CurrencyPipe],
  template: `
    <header class="page-head">
      <div>
        <small>ACADEMIC MANAGEMENT</small>
        <h1>Academic Graduations (Qalin-jabinta & Shahaadooyinka)</h1>
        <p>Maamul dhamaystirka koorsooyinka, hubinta maaliyadda, qalin-jabinta ardayda, iyo bixinta shahaadooyinka rasmiga ah.</p>
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
        🎓 Qalin-jabin Cusub (Graduation Workspace)
      </button>
      <button [class.active]="activeTab() === 'records'" (click)="setTab('records')">
        📜 Diiwaanka Qalin-jabiyayaasha (Graduates Archive)
      </button>
    </nav>

    <!-- LOADING BAR -->
    @if (loading()) {
      <div class="loading-bar">Xogta waa la soo rarayaa…</div>
    }

    <!-- ========================================================================= -->
    <!-- TAB 1: GRADUATION WORKSPACE -->
    <!-- ========================================================================= -->
    @if (activeTab() === 'workspace') {
      <section class="panel filter-panel">
        <header class="panel-header">
          <div>
            <h3>1. Dooro Fasalka Qalin-jabinaya & Taariikhda</h3>
            <p>Dooro laanta, sannad-dugsiyeedka, fasalka ay ardaydu ka qalin-jabinayaan iyo taariikhda xafladda/shahaadada.</p>
          </div>
        </header>

        <div class="selection-grid">
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
            <label>Sannad-Dugsiyeedka</label>
            <select [(ngModel)]="selectedYearId" (change)="clearCandidates()">
              <option [value]="null" disabled>Dooro Sannad</option>
              @for (y of academicYears(); track y.AcademicYearId) {
                <option [value]="y.AcademicYearId">{{ y.Name }} {{ y.IsDefault ? '(Hadda)' : '' }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>Fasalka Qalin-jabinaya (Course / Class)</label>
            <select [(ngModel)]="selectedClassId" (change)="clearCandidates()">
              <option [value]="null" disabled>Dooro Fasal</option>
              @for (c of branchClasses(); track c.ClassId) {
                <option [value]="c.ClassId">{{ c.Name }} ({{ c.LevelName || 'Level' }})</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>Taariikhda Qalin-jabinta (Graduation Date)</label>
            <input type="date" [(ngModel)]="graduationDate" />
          </div>
        </div>

        <div class="selection-actions">
          <button class="primary" [disabled]="!canLoadCandidates()" (click)="loadCandidates()">
            👥 Soo Saar Liiska Ardayda Fasalka
          </button>
        </div>
      </section>

      <!-- CANDIDATES TABLE -->
      @if (candidatesLoaded()) {
        <section class="panel candidates-panel">
          <header class="panel-header-rich">
            <div>
              <h3>2. Qiimeynta Ardayda (Dhamaystirka Koorsada & Hubinta Maaliyadda)</h3>
              <p>
                Wadarta ardayda fasalka waa {{ candidates().length }}. Shahaadada waxaa helaya ardayda dhameysay koorsada oo aan wax deyn ah lagu lahayn.
              </p>
            </div>
            <div class="quick-selectors">
              <button class="btn-select-eligible" (click)="selectOnlyEligible()">
                ✓ Dooro Kuwa Xorta ah (Eligible Only)
              </button>
              <button class="btn-select-all" (click)="toggleSelectAll(!allSelected())">
                {{ allSelected() ? 'Ka Noqo Dhammaan' : 'Dooro Dhammaan' }}
              </button>
            </div>
          </header>

          <!-- KPI RIBBON -->
          <div class="stats-ribbon">
            <div class="stat-item">
              <span>Ardayda Fasalka</span>
              <b>{{ candidates().length }}</b>
            </div>
            <div class="stat-item green">
              <span>U Qalma Qalin-jabin (Cleared)</span>
              <b>{{ eligibleCount() }}</b>
            </div>
            <div class="stat-item red">
              <span>Deyn Ku Dhiman (Financial Hold)</span>
              <b>{{ financialHoldCount() }}</b>
            </div>
            <div class="stat-item blue">
              <span>La Doortay (Selected)</span>
              <b>{{ selectedCount() }}</b>
            </div>
          </div>

          <!-- TABLE -->
          <div class="table-wrap">
            <table class="candidates-table">
              <thead>
                <tr>
                  <th style="width: 40px;">
                    <input type="checkbox" [checked]="allSelected()" (change)="toggleSelectAll($event)" />
                  </th>
                  <th>ARDAYGA</th>
                  <th>JINSIGA</th>
                  <th>DHAMAYSTIRKA KOORSADA</th>
                  <th>XAALADDA MAALIYADDA (TUITION / EXAM / CEREMONY)</th>
                  <th>XAALADDA SHURUUDDA</th>
                  <th>DIIWAANKA</th>
                </tr>
              </thead>
              <tbody>
                @for (student of candidates(); track student.StudentId) {
                  <tr
                    [class.row-eligible]="student.IsEligible"
                    [class.row-hold]="!student.FinanceCleared"
                    [class.row-graduated]="student.AlreadyGraduated"
                  >
                    <td>
                      <input
                        type="checkbox"
                        [(ngModel)]="student.Selected"
                        [disabled]="student.AlreadyGraduated"
                      />
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
                        <div class="score-box" [class.pass]="student.CourseCompleted" [class.fail]="!student.CourseCompleted">
                          <b>{{ student.AverageScore }}%</b>
                          <span class="score-badge">{{ student.CourseCompleted ? 'Gudbay' : 'Dhacay' }}</span>
                        </div>
                      } @else {
                        <span class="score-ok">✓ Koorsada Waa Dhameeyay</span>
                      }
                    </td>
                    <td>
                      <div class="finance-cell">
                        @if (student.FinanceCleared) {
                          <span class="finance-badge cleared">
                            🟢 Lacag La'aan ($0 Haray)
                          </span>
                        } @else {
                          <span class="finance-badge debt" title="Tuition / Exam / Certificate / Ceremony fee unpaid">
                            🔴 Deyn: {{ student.OutstandingBalance | currency: 'USD' }} Haray
                          </span>
                          <small class="debt-details">Wadarta: {{ student.TotalInvoiced | currency: 'USD' }} · La bixiyay: {{ student.TotalPaid | currency: 'USD' }}</small>
                        }
                      </div>
                    </td>
                    <td>
                      @if (student.AlreadyGraduated) {
                        <span class="status-pill graduated">🎓 Hore u Qalin-jabiyay</span>
                        <div class="cert-no">{{ student.CertificateNo }}</div>
                      } @else if (student.IsEligible) {
                        <span class="status-pill eligible">✓ Diyaar u ah Shahaado</span>
                      } @else {
                        <span class="status-pill hold">⚠️ Xayiran (Deyn baa ku dhiman)</span>
                      }
                    </td>
                    <td>
                      @if (student.AlreadyGraduated) {
                        <span class="already-done">Shahaado La Siiyay</span>
                      } @else {
                        <span class="ready-flag">{{ student.Selected ? 'Waa la qalin-jabinayaa' : 'Lama dooran' }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- FOOTER -->
          <footer class="graduation-footer">
            <div class="footer-overrides">
              <label class="override-checkbox">
                <input type="checkbox" [(ngModel)]="overrideFinancialHold" />
                <b>U oggolow ardayda deynta leh inay qalin-jabiyaan (Override Financial Hold)</b>
              </label>
              @if (hasDebtInSelected() && !overrideFinancialHold) {
                <div class="override-warning">
                  ⚠️ Waxaa ku jira arday lacag lagu leeyahay. Fadlan calaamadee "Override Financial Hold" haddii aad doonayso inaad shahaado siiso ardaydaas.
                </div>
              }
            </div>

            <div class="footer-actions">
              <button class="secondary" (click)="clearCandidates()">Jooji</button>
              <button
                class="primary btn-execute-grad"
                [disabled]="executingGraduation() || (!overrideFinancialHold && hasDebtInSelected()) || selectedCount() === 0"
                (click)="confirmAndExecuteGraduation()"
              >
                {{ executingGraduation() ? 'Shahaadooyinka waa la soo saarayaa…' : '🎓 Qalin-jabi oo Soo Saar Shahaadooyinka (' + selectedCount() + ' Arday)' }}
              </button>
            </div>
          </footer>
        </section>
      }
    }

    <!-- ========================================================================= -->
    <!-- TAB 2: GRADUATES ARCHIVE & CERTIFICATES -->
    <!-- ========================================================================= -->
    @if (activeTab() === 'records') {
      <section class="panel archive-panel">
        <header class="panel-header-rich">
          <div>
            <h3>Diiwaanka Qalin-jabiyayaasha & Shahaadooyinka (Graduates Archive)</h3>
            <p>Dhammaan ardayda qalin-jabisay, lambarrada shahaadooyinka, iyo dib-u-daabacaaddooda.</p>
          </div>
          <button class="btn-export-csv" (click)="exportGraduatesCsv()">📥 Dhoofso CSV</button>
        </header>

        <!-- KPI CARDS -->
        <div class="archive-kpis">
          <div class="kpi-card gold">
            <span>Wadarta Ardayda Qalin-jabisay</span>
            <b>{{ recordsSummary().TotalGraduated || records().length }}</b>
          </div>
          <div class="kpi-card blue">
            <span>Wadarta Shahaadooyinka Rasmiga ah</span>
            <b>{{ recordsSummary().TotalCertificates || records().length }}</b>
          </div>
        </div>

        <!-- SEARCH AND FILTER -->
        <div class="filters-bar">
          <div class="search-input-wrap">
            <input
              type="text"
              [(ngModel)]="recordsSearch"
              (keyup.enter)="loadRecords()"
              placeholder="Raadi magaca ardayga, admission no, certificate no..."
            />
            @if (recordsSearch) {
              <button class="clear-btn" (click)="recordsSearch = ''; loadRecords()">×</button>
            }
          </div>

          <button class="primary" (click)="loadRecords()">Raadi</button>
          <button class="secondary" (click)="recordsSearch = ''; loadRecords()">Nadiifi</button>
        </div>

        <!-- RECORDS TABLE -->
        <div class="table-wrap">
          <table class="archive-table">
            <thead>
              <tr>
                <th>LAMBARKA SHAHAADADA</th>
                <th>ARDAYGA</th>
                <th>FASALKA / HEERKA</th>
                <th>SANNADKA</th>
                <th>TAARIIKHDA QALIN-JABINTA</th>
                <th>OGOLAADE</th>
                <th>FICIL</th>
              </tr>
            </thead>
            <tbody>
              @for (r of records(); track r.GraduationId) {
                <tr>
                  <td>
                    <div class="cert-badge">
                      <span class="cert-icon">📜</span>
                      <b>{{ r.CertificateNo }}</b>
                    </div>
                  </td>
                  <td>
                    <div class="student-profile-cell">
                      <div class="avatar">{{ getInitials(r.StudentName) }}</div>
                      <div>
                        <b>{{ r.StudentName }}</b>
                        <div class="s-admn">Ref: {{ r.AdmissionNo }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="class-title">
                      <b>{{ r.ClassName }}</b>
                      <small>{{ r.LevelName || 'Heerka Sare' }}</small>
                    </div>
                  </td>
                  <td>{{ r.AcademicYearName }}</td>
                  <td>
                    <b>{{ r.GraduationDate | date: 'dd/MM/yyyy' }}</b>
                  </td>
                  <td>
                    <span class="approver-tag">👤 {{ r.ApprovedByName || 'Director' }}</span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-cert-view" (click)="viewCertificate(r)">
                        🖨️ Daabac Shahaadada
                      </button>
                      <button class="btn-revert" (click)="revertGraduation(r)" title="Ka noqo qalin-jabintan">
                        ↺ Ka Noqo
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (!records().length) {
                <tr>
                  <td colspan="7">
                    <div class="empty-state">
                      <div class="empty-icon">🎓</div>
                      <h4>Weli ma jiraan arday qalin-jabisay</h4>
                      <p>Dooro "Qalin-jabin Cusub" si aad ardayda u qalin-jabiso una soo saarto shahaadooyinkooda.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

    <!-- ========================================================================= -->
    <!-- MODAL: ROYAL HIGH-RESOLUTION PRINTABLE CERTIFICATE -->
    <!-- ========================================================================= -->
    @if (certificateModalOpen()) {
      <div class="cert-modal-backdrop" (click)="closeCertificateModal()">
        <div class="cert-modal-dialog" (click)="$event.stopPropagation()">
          <div class="cert-modal-actions no-print">
            <button class="btn-print-now primary" (click)="printCertificate()">
              🖨️ Daabac Shahaadada (Print / Save as PDF)
            </button>
            <button class="btn-close-modal" (click)="closeCertificateModal()">✕ Xir</button>
          </div>

          <!-- THE CERTIFICATE (PRINT READY) -->
          @if (activeCertificate(); as cert) {
            <div class="printable-certificate-container" id="printable-cert">
              <div class="cert-sheet">
                <header class="modern-cert-header">
                  <div class="cert-brand-mark"><span></span></div>
                  <div class="cert-brand-copy">
                    <strong>{{ cert.SchoolName }}</strong>
                    <small>{{ cert.BranchName || 'Xarunta Guud' }}</small>
                  </div>
                </header>
                <section class="modern-cert-heading">
                  <h2>Certificate of Achievement</h2>
                  <p>This certificate is proudly presented to</p>
                </section>
                <section class="modern-cert-band">
                  <div class="modern-student-name">{{ cert.StudentName }}</div>
                  <p>In recognition of successfully completing all academic requirements for
                    <strong>{{ cert.ClassName }} — {{ cert.LevelName }}</strong>, demonstrating dedication,
                    discipline, and academic excellence throughout the {{ cert.AcademicYear }} school year.</p>
                  <div class="modern-cert-meta">
                    <span>GRADE <b>{{ cert.GradeLabel }} · {{ cert.AverageScore }}%</b></span>
                    <span>ADMISSION NO <b>{{ cert.AdmissionNo }}</b></span>
                  </div>
                  <time>{{ cert.GraduationDate | date: 'MMM dd, yyyy' }}</time>
                </section>
                <footer class="modern-cert-footer">
                  <div class="modern-signature">
                    <div class="modern-signature-script">{{ cert.ApprovedByName || 'Academic Director' }}</div>
                    <div class="modern-signature-line"></div>
                    <span>Prepared By</span><strong>ACADEMIC DIRECTOR</strong>
                  </div>
                  <div class="modern-seal-wrap">
                    <div class="modern-seal"><div class="modern-seal-ring">MADAARIS · VERIFIED ·</div><b>M</b></div>
                    <div class="modern-seal-ribbons"><i></i><i></i></div>
                    <small>{{ cert.CertificateNo }}</small>
                  </div>
                  <div class="modern-signature">
                    <div class="modern-signature-script">Dr. C/raxmaan Cali</div>
                    <div class="modern-signature-line"></div>
                    <span>Awarded By</span><strong>SCHOOL PRINCIPAL</strong>
                  </div>
                </footer>
              </div>
              <!-- ORNATE OUTER FRAME -->
              <div class="cert-outer-border legacy-certificate">
                <div class="cert-inner-border">
                  <!-- CORNER DECORATIONS -->
                  <div class="cert-corner top-left">❖</div>
                  <div class="cert-corner top-right">❖</div>
                  <div class="cert-corner bottom-left">❖</div>
                  <div class="cert-corner bottom-right">❖</div>

                  <!-- HEADER EMBLEM & ISLAMIC MOTIF -->
                  <div class="cert-header">
                    <div class="cert-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                    <div class="cert-school-name">{{ cert.SchoolName }}</div>
                    <div class="cert-branch-name">{{ cert.BranchName || 'Xarunta Guud' }}</div>
                    <div class="cert-ribbon-divider">
                      <span class="line"></span>
                      <span class="crest">★ MADAARIS ACADEMIC EXCELLENCE ★</span>
                      <span class="line"></span>
                    </div>
                  </div>

                  <!-- TITLE -->
                  <div class="cert-title-block">
                    <h2 class="cert-title-en">CERTIFICATE OF GRADUATION & COMPLETION</h2>
                    <h3 class="cert-title-so">SHAHAADADA QALIN-JABINTA & DHAMAYSTIRKA KOORSADA</h3>
                  </div>

                  <!-- BODY TEXT -->
                  <div class="cert-body">
                    <p class="cert-intro">Waxaa si rasmi ah loo xaqiijinayaa in ardayga hoos ku xusan / This is to certify that:</p>
                    <div class="cert-student-name">{{ cert.StudentName }}</div>
                    <div class="cert-student-admn">Lambarka Aqoonsiga / Admission No: <b>{{ cert.AdmissionNo }}</b></div>

                    <p class="cert-achievement">
                      uu si guul iyo sharaf leh u dhamaystiray dhammaan shuruudihii waxbarasho, culuumta diinta, iyo manhajka heerka:
                      <br />
                      <span class="cert-course-name">{{ cert.ClassName }} — {{ cert.LevelName }}</span>
                      <br />
                      Sannad-Dugsiyeedkii <b>{{ cert.AcademicYear }}</b> isagoo ku helay darajada:
                      <b class="cert-grade">{{ cert.GradeLabel }} ({{ cert.AverageScore }}%)</b>.
                    </p>
                  </div>

                  <!-- FOOTER METRICS & SIGNATURES -->
                  <div class="cert-footer">
                    <!-- LEFT: DATE & CERT NO -->
                    <div class="cert-col left">
                      <div class="cert-meta-item">
                        <span class="label">Lambarka Shahaadada:</span>
                        <b class="val-gold">{{ cert.CertificateNo }}</b>
                      </div>
                      <div class="cert-meta-item">
                        <span class="label">Taariikhda Bixinta:</span>
                        <b class="val">{{ cert.GraduationDate | date: 'dd MMMM yyyy' }}</b>
                      </div>
                      <div class="cert-qr-box">
                        <div class="qr-mock">QR CODE VERIFIED</div>
                        <small>Scan to Verify</small>
                      </div>
                    </div>

                    <!-- CENTER: EMBOSSED OFFICIAL SEAL -->
                    <div class="cert-col center">
                      <div class="gold-embossed-seal">
                        <div class="seal-inner">
                          <div class="seal-star">★</div>
                          <div class="seal-text-top">MADAARIS</div>
                          <div class="seal-text-mid">OFFICIAL SEAL</div>
                          <div class="seal-text-bot">★ VERIFIED ★</div>
                        </div>
                      </div>
                    </div>

                    <!-- RIGHT: SIGNATURES -->
                    <div class="cert-col right">
                      <div class="sig-block">
                        <div class="sig-line">
                          <span class="sig-script">{{ cert.ApprovedByName }}</span>
                        </div>
                        <span class="sig-title">Agaasimaha Waxbarashada</span>
                        <span class="sig-sub">Academic Director</span>
                      </div>
                      <div class="sig-block">
                        <div class="sig-line">
                          <span class="sig-script">Dr. C/raxmaan Cali</span>
                        </div>
                        <span class="sig-title">Guddoomiyaha Dugsiga</span>
                        <span class="sig-sub">School Principal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
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

      /* SELECTION GRID */
      .selection-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        padding: 22px;
        background: #fafbfc;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
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

      .selection-actions {
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
        grid-template-columns: repeat(4, 1fr);
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
      .stat-item.green {
        border-color: #86efac;
        background: #f0fdf4;
      }
      .stat-item.green b { color: #15803d; }
      .stat-item.red {
        border-color: #fca5a5;
        background: #fef2f2;
      }
      .stat-item.red b { color: #b91c1c; }
      .stat-item.blue {
        border-color: #bfdbfe;
        background: #eff6ff;
      }
      .stat-item.blue b { color: #1d4ed8; }

      .quick-selectors {
        display: flex;
        gap: 8px;
      }
      .btn-select-eligible {
        border: 1px solid #86efac;
        background: #f0fdf4;
        color: #15803d;
        padding: 7px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 750;
        cursor: pointer;
      }
      .btn-select-all {
        border: 1px solid #cbd5e1;
        background: white;
        color: #475569;
        padding: 7px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 650;
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
      tr.row-eligible {
        background: #fafffb;
      }
      tr.row-hold {
        background: #fffcfc;
      }
      tr.row-graduated {
        background: #f8fafc;
        opacity: 0.75;
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
      .score-ok {
        font-size: 11px;
        color: #15803d;
        font-weight: 600;
      }

      .finance-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .finance-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
      }
      .finance-badge.cleared {
        background: #dcfce7;
        color: #15803d;
      }
      .finance-badge.debt {
        background: #fee2e2;
        color: #b91c1c;
      }
      .debt-details {
        font-size: 10px;
        color: #64748b;
      }

      .status-pill {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
      }
      .status-pill.eligible {
        background: #dcfce7;
        color: #15803d;
      }
      .status-pill.hold {
        background: #fef3c7;
        color: #b45309;
      }
      .status-pill.graduated {
        background: #e0e7ff;
        color: #3730a3;
      }
      .cert-no {
        font-size: 10px;
        font-family: monospace;
        color: #475569;
        margin-top: 2px;
      }
      .ready-flag {
        font-size: 11px;
        color: #15803d;
        font-weight: 600;
      }
      .already-done {
        font-size: 11px;
        color: #64748b;
        font-style: italic;
      }

      /* FOOTER */
      .graduation-footer {
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
      .override-warning {
        margin-top: 6px;
        font-size: 11px;
        color: #b91c1c;
        font-weight: 650;
      }
      .footer-actions {
        display: flex;
        gap: 10px;
      }
      .btn-execute-grad {
        font-size: 14px;
        padding: 12px 24px;
      }

      /* ARCHIVE TAB */
      .archive-kpis {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
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
      .kpi-card.gold b { color: #b45309; }
      .kpi-card.blue b { color: #1d4ed8; }

      .filters-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 22px;
        border-bottom: 1px solid #f1f5f9;
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

      .cert-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #fef3c7;
        color: #92400e;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-family: monospace;
      }
      .class-title b {
        display: block;
        font-size: 12px;
        color: #0f172a;
      }
      .class-title small {
        color: #64748b;
        font-size: 10px;
      }
      .approver-tag {
        font-size: 11px;
        color: #475569;
      }
      .action-buttons {
        display: flex;
        gap: 6px;
      }
      .btn-cert-view {
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1d4ed8;
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 750;
        cursor: pointer;
      }
      .btn-cert-view:hover {
        background: #dbeafe;
      }
      .btn-revert {
        border: 1px solid #fecaca;
        background: #fef2f2;
        color: #b91c1c;
        padding: 5px 10px;
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

      /* ========================================================================= */
      /* CERTIFICATE MODAL & PRINT STYLES */
      /* ========================================================================= */
      .cert-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(4px);
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow-y: auto;
      }
      .cert-modal-dialog {
        background: white;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        max-width: 1050px;
        width: 100%;
        overflow: hidden;
      }
      .cert-modal-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        background: #0f172a;
        color: white;
      }
      .btn-print-now {
        font-size: 13px;
        padding: 8px 18px;
      }
      .btn-close-modal {
        border: 0;
        background: transparent;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
      }
      .btn-close-modal:hover { color: white; }

      /* PRINTABLE CERTIFICATE CONTAINER */
      .printable-certificate-container {
        padding: 24px;
        background: #e8e8e8;
      }
      .legacy-certificate { display: none; }
      .cert-sheet {
        --cert-navy: #102d4d;
        --cert-gold: #edae22;
        position: relative;
        overflow: hidden;
        aspect-ratio: 1.414 / 1;
        display: grid;
        grid-template-rows: 1fr .65fr 2.15fr 1.45fr;
        background-color: #fff;
        background-image: repeating-linear-gradient(135deg, rgba(16,45,77,.035) 0 2px, transparent 2px 7px);
        color: #132033;
        text-align: center;
        box-shadow: 0 18px 40px rgba(15,23,42,.2);
      }
      .modern-cert-header {
        display: flex; align-items: center; justify-content: center; align-self: end;
        gap: 9px; padding-top: 18px;
      }
      .cert-brand-mark { width: 34px; height: 38px; position: relative; }
      .cert-brand-mark::before, .cert-brand-mark::after {
        content: ''; position: absolute; width: 12px; height: 32px; border-radius: 100% 0;
        background: var(--cert-gold); transform-origin: bottom center;
      }
      .cert-brand-mark::before { left: 7px; transform: rotate(-43deg); }
      .cert-brand-mark::after { right: 4px; transform: rotate(43deg) scale(.75); opacity: .8; }
      .cert-brand-copy { text-align: left; line-height: 1; }
      .cert-brand-copy strong { display: block; font-size: 21px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; }
      .cert-brand-copy small { display: block; margin-top: 4px; color: #7b8490; font-size: 8px; letter-spacing: .2em; text-transform: uppercase; }
      .modern-cert-heading { align-self: center; }
      .modern-cert-heading h2 { margin: 0; font: 700 31px/1.05 Georgia, 'Times New Roman', serif; letter-spacing: -.04em; }
      .modern-cert-heading p { margin: 4px 0 0; color: #7c8490; font: 11px Georgia, serif; }
      .modern-cert-band {
        position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 16px 12%; color: white; background-color: var(--cert-navy);
        background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.018) 0 2px, transparent 2px 6px);
      }
      .modern-cert-band::before, .modern-cert-band::after {
        content: ''; position: absolute; top: -12px; height: 12px; width: 19%; background: var(--cert-gold);
      }
      .modern-cert-band::before { left: 0; clip-path: polygon(0 0,92% 0,100% 100%,0 100%); }
      .modern-cert-band::after { right: 0; top: auto; bottom: -12px; clip-path: polygon(8% 0,100% 0,100% 100%,0 100%); }
      .modern-student-name { color: var(--cert-gold); font: italic 42px/1.05 'Brush Script MT','Segoe Script',cursive; text-shadow: 0 1px rgba(0,0,0,.25); }
      .modern-cert-band p { max-width: 720px; margin: 9px auto; font: 10px/1.55 Arial,sans-serif; color: #e5edf5; }
      .modern-cert-band p strong { color: #fff; }
      .modern-cert-meta { display: flex; gap: 22px; margin-bottom: 8px; font-size: 7px; letter-spacing: .12em; color: #adc0d3; }
      .modern-cert-meta b { color: white; }
      .modern-cert-band time { padding: 4px 9px; border: 1px solid var(--cert-gold); font: 700 9px Arial,sans-serif; }
      .modern-cert-footer { display: grid; grid-template-columns: 1fr 140px 1fr; align-items: center; gap: 36px; padding: 19px 12% 16px; }
      .modern-signature { text-align: center; min-width: 0; }
      .modern-signature-script { min-height: 25px; color: #172335; font: italic 20px 'Brush Script MT','Segoe Script',cursive; }
      .modern-signature-line { height: 1px; margin: 0 auto 5px; max-width: 190px; background: #273444; }
      .modern-signature span { display: block; color: #8c9299; font: 8px Arial,sans-serif; }
      .modern-signature strong { display: block; margin-top: 3px; color: #4c5662; font: 7px Arial,sans-serif; letter-spacing: .08em; }
      .modern-seal-wrap { position: relative; align-self: start; }
      .modern-seal { position: relative; z-index: 2; width: 72px; height: 72px; margin: 0 auto; display: grid; place-items: center; border-radius: 50%; color: white; background: var(--cert-navy); border: 5px double #d9e2eb; box-shadow: 0 0 0 2px var(--cert-navy); }
      .modern-seal-ring { position: absolute; inset: 8px; display: grid; place-items: center; border: 1px dashed #afc1d2; border-radius: 50%; font: 5px Arial; letter-spacing: .08em; }
      .modern-seal b { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%; background: #244b70; font: 700 14px Georgia,serif; }
      .modern-seal-ribbons { position: absolute; z-index: 1; top: 59px; left: 50%; width: 48px; transform: translateX(-50%); display: flex; justify-content: center; }
      .modern-seal-ribbons i { width: 17px; height: 27px; background: var(--cert-navy); clip-path: polygon(0 0,100% 8%,80% 100%,50% 77%,12% 100%); transform: rotate(9deg); }
      .modern-seal-ribbons i:first-child { transform: rotate(-9deg); }
      .modern-seal-wrap small { display: block; margin-top: 17px; color: #6f7882; font: 7px monospace; letter-spacing: .04em; }
      @media (max-width: 700px) {
        .modern-cert-heading h2 { font-size: 22px; }
        .modern-student-name { font-size: 30px; }
        .modern-cert-band p { font-size: 8px; }
        .modern-cert-footer { grid-template-columns: 1fr 85px 1fr; gap: 12px; padding-left: 6%; padding-right: 6%; }
      }
      .cert-outer-border {
        border: 8px double #b45309;
        padding: 12px;
        background: #fffefb;
        box-shadow: inset 0 0 20px rgba(180, 83, 9, 0.1);
      }
      .cert-inner-border {
        position: relative;
        border: 2px solid #d97706;
        padding: 35px 40px;
        text-align: center;
      }
      .cert-corner {
        position: absolute;
        color: #b45309;
        font-size: 20px;
        line-height: 1;
      }
      .cert-corner.top-left { top: 6px; left: 8px; }
      .cert-corner.top-right { top: 6px; right: 8px; }
      .cert-corner.bottom-left { bottom: 6px; left: 8px; }
      .cert-corner.bottom-right { bottom: 6px; right: 8px; }

      .cert-header {
        margin-bottom: 20px;
      }
      .cert-bismillah {
        font-family: 'Amiri', 'Traditional Arabic', serif;
        font-size: 20px;
        color: #78350f;
        margin-bottom: 8px;
      }
      .cert-school-name {
        font-size: 24px;
        font-weight: 900;
        color: #1e3a8a;
        letter-spacing: 0.08em;
      }
      .cert-branch-name {
        font-size: 12px;
        color: #64748b;
        font-weight: 600;
        margin-top: 2px;
      }
      .cert-ribbon-divider {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        margin-top: 12px;
      }
      .cert-ribbon-divider .line {
        height: 1px;
        width: 100px;
        background: #d97706;
      }
      .cert-ribbon-divider .crest {
        font-size: 11px;
        font-weight: 800;
        color: #b45309;
        letter-spacing: 0.15em;
      }

      .cert-title-block {
        margin: 20px 0;
      }
      .cert-title-en {
        margin: 0;
        font-size: 22px;
        font-weight: 850;
        color: #0f172a;
        letter-spacing: 0.05em;
      }
      .cert-title-so {
        margin: 4px 0 0;
        font-size: 14px;
        font-weight: 700;
        color: #92400e;
        letter-spacing: 0.03em;
      }

      .cert-body {
        margin: 25px 0;
      }
      .cert-intro {
        font-size: 13px;
        color: #475569;
        margin: 0 0 10px;
      }
      .cert-student-name {
        font-size: 32px;
        font-weight: 900;
        color: #1e3a8a;
        font-family: 'Times New Roman', serif;
        border-bottom: 2px solid #e2e8f0;
        display: inline-block;
        padding: 0 30px 4px;
        margin-bottom: 6px;
      }
      .cert-student-admn {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 16px;
      }
      .cert-achievement {
        font-size: 14px;
        line-height: 1.8;
        color: #334155;
        max-width: 780px;
        margin: 0 auto;
      }
      .cert-course-name {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
      }
      .cert-grade {
        color: #15803d;
      }

      .cert-footer {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 20px;
        align-items: flex-end;
        margin-top: 35px;
        padding-top: 20px;
        border-top: 1px dashed #cbd5e1;
      }
      .cert-col.left {
        text-align: left;
      }
      .cert-meta-item {
        margin-bottom: 6px;
        font-size: 11px;
      }
      .cert-meta-item .label {
        color: #64748b;
        margin-right: 6px;
      }
      .cert-meta-item .val-gold {
        color: #b45309;
        font-family: monospace;
        font-weight: 800;
      }
      .cert-qr-box {
        margin-top: 10px;
        display: inline-block;
        text-align: center;
      }
      .qr-mock {
        width: 64px;
        height: 64px;
        background: #0f172a;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        text-align: center;
        border-radius: 4px;
        padding: 4px;
      }
      .cert-qr-box small {
        display: block;
        font-size: 9px;
        color: #64748b;
        margin-top: 2px;
      }

      /* GOLD EMBOSSED SEAL */
      .gold-embossed-seal {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: radial-gradient(circle, #fef3c7 0%, #f59e0b 60%, #b45309 100%);
        border: 4px solid #fff;
        box-shadow: 0 4px 12px rgba(180, 83, 9, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
      }
      .seal-inner {
        width: 84px;
        height: 84px;
        border-radius: 50%;
        border: 1px dashed #78350f;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #78350f;
        text-align: center;
      }
      .seal-star { font-size: 14px; line-height: 1; }
      .seal-text-top { font-size: 8px; font-weight: 900; letter-spacing: 0.1em; }
      .seal-text-mid { font-size: 9px; font-weight: 800; margin: 1px 0; }
      .seal-text-bot { font-size: 7px; font-weight: 700; }

      .cert-col.right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 18px;
      }
      .sig-block {
        text-align: center;
        width: 180px;
      }
      .sig-line {
        border-bottom: 1.5px solid #0f172a;
        padding-bottom: 4px;
        margin-bottom: 4px;
      }
      .sig-script {
        font-family: 'Brush Script MT', 'Dancing Script', cursive, serif;
        font-size: 18px;
        color: #1e3a8a;
      }
      .sig-title {
        display: block;
        font-size: 11px;
        font-weight: 750;
        color: #0f172a;
      }
      .sig-sub {
        display: block;
        font-size: 9px;
        color: #64748b;
      }

      /* PRINT MEDIA */
      @media print {
        body * {
          visibility: hidden;
        }
        .no-print {
          display: none !important;
        }
        #printable-cert,
        #printable-cert * {
          visibility: visible;
        }
        #printable-cert {
          position: fixed;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          padding: 0;
          margin: 0;
          background: white !important;
        }
        .cert-sheet {
          width: 297mm;
          height: 210mm;
          aspect-ratio: auto;
          box-shadow: none;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        @page { size: A4 landscape; margin: 0; }
      }

      @media (max-width: 900px) {
        .selection-grid { grid-template-columns: 1fr; }
        .stats-ribbon { grid-template-columns: repeat(2, 1fr); }
        .archive-kpis { grid-template-columns: 1fr; }
        .cert-footer { grid-template-columns: 1fr; text-align: center; }
        .cert-col.right { align-items: center; }
      }
    `,
  ],
})
export class AcademicGraduationsComponent implements OnInit {
  activeTab = signal<'workspace' | 'records'>('workspace');
  loading = signal(false);
  executingGraduation = signal(false);

  // References
  branches = signal<any[]>([]);
  academicYears = signal<any[]>([]);
  levels = signal<any[]>([]);
  classes = signal<any[]>([]);

  // Selection
  selectedBranchId: number | null = null;
  selectedYearId: number | null = null;
  selectedClassId: number | null = null;
  graduationDate: string = new Date().toISOString().slice(0, 10);
  overrideFinancialHold = false;

  // Candidates
  candidatesLoaded = signal(false);
  candidates = signal<GradCandidate[]>([]);

  // Records
  records = signal<any[]>([]);
  recordsSummary = signal<any>({});
  recordsSearch = '';

  // Certificate Modal
  certificateModalOpen = signal(false);
  activeCertificate = signal<any>(null);

  // Computed
  branchClasses = computed(() => {
    const bId = Number(this.selectedBranchId);
    return this.classes().filter((c) => !bId || Number(c.BranchId) === bId);
  });

  eligibleCount = computed(() => this.candidates().filter((c) => c.IsEligible).length);
  financialHoldCount = computed(() => this.candidates().filter((c) => !c.FinanceCleared).length);
  selectedCount = computed(() => this.candidates().filter((c) => c.Selected).length);

  allSelected = computed(
    () =>
      this.candidates().length > 0 &&
      this.candidates().filter((c) => !c.AlreadyGraduated).every((c) => c.Selected),
  );

  hasDebtInSelected = computed(() =>
    this.candidates().some((c) => c.Selected && !c.FinanceCleared),
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

  setTab(tab: 'workspace' | 'records') {
    this.activeTab.set(tab);
    if (tab === 'records') {
      this.loadRecords();
    }
  }

  loadReferences() {
    this.loading.set(true);
    this.api.get<any>('/academic/graduations/references').subscribe({
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
          this.selectedYearId = defYear.AcademicYearId;
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
    this.selectedClassId = null;
    this.clearCandidates();
  }

  canLoadCandidates(): boolean {
    return !!(this.selectedBranchId && this.selectedYearId && this.selectedClassId);
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
      AcademicYearId: String(this.selectedYearId),
      ClassId: String(this.selectedClassId),
    };

    this.api.get<any>('/academic/graduations/candidates', params).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.candidates.set(r.data.Candidates || []);
        this.candidatesLoaded.set(true);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.show(e.error?.message || 'Ardayda lama soo saari karin.', 'error');
      },
    });
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

  selectOnlyEligible() {
    this.candidates.update((list) =>
      list.map((c) => ({
        ...c,
        Selected: c.IsEligible && !c.AlreadyGraduated,
      })),
    );
  }

  toggleSelectAll(checkedOrEvent: boolean | Event) {
    const checked =
      typeof checkedOrEvent === 'boolean'
        ? checkedOrEvent
        : (checkedOrEvent.target as HTMLInputElement).checked;

    this.candidates.update((list) =>
      list.map((c) => ({
        ...c,
        Selected: c.AlreadyGraduated ? false : checked,
      })),
    );
  }

  async confirmAndExecuteGraduation() {
    const selected = this.candidates().filter((c) => c.Selected && !c.AlreadyGraduated);
    if (!selected.length) {
      this.toast.show('Fadlan dooro ugu yaraan hal arday oo qalin-jabinaya.', 'error');
      return;
    }

    const count = selected.length;
    const debtCount = selected.filter((c) => !c.FinanceCleared).length;

    let warningText = '';
    if (debtCount > 0) {
      warningText = `\n\n⚠️ DIGNIIN: Waxaa ku jira ${debtCount} arday oo lacag lagu leeyahay laakiin aad dooratay 'Override Financial Hold'.`;
    }

    const confirmed = await this.dialog.confirm(
      'Xaqiiji Qalin-jabinta',
      `Ma hubtaa inaad qalin-jabiso ${count} arday?\n\n` +
        `• Waxaa loo soo saari doonaa shahaadooyin rasmi ah.\n` +
        `• Xaaladdooda diiwaanka waxay noqon doontaa 'Graduated'.${warningText}`,
    );

    if (!confirmed) return;

    this.executingGraduation.set(true);

    const payload = {
      BranchId: this.selectedBranchId,
      AcademicYearId: this.selectedYearId,
      ClassId: this.selectedClassId,
      GraduationDate: this.graduationDate,
      OverrideFinancialHold: this.overrideFinancialHold,
      Notes: 'Official graduation ceremony and certificate issuance.',
      Students: selected.map((c) => ({
        StudentId: c.StudentId,
        EnrollmentId: c.EnrollmentId,
        Selected: true,
      })),
    };

    this.api.post<any>('/academic/graduations/graduate', payload).subscribe({
      next: (r) => {
        this.executingGraduation.set(false);
        this.toast.show(r.message || 'Qalin-jabinta si guul leh ayaa loo fuliyay!');
        this.clearCandidates();
        this.loadReferences();
        this.setTab('records');
      },
      error: (e) => {
        this.executingGraduation.set(false);
        this.toast.show(e.error?.message || 'Qalin-jabinta waa la waayay.', 'error');
      },
    });
  }

  // ARCHIVE & CERTIFICATE METHODS
  loadRecords() {
    const params: any = {};
    if (this.recordsSearch) params.Search = this.recordsSearch;

    this.api.get<any>('/academic/graduations/records', params).subscribe({
      next: (r) => {
        this.records.set(r.data || []);
        this.recordsSummary.set(r.summary || {});
      },
      error: (e) => {
        this.toast.show(e.error?.message || 'Diiwaanka qalin-jabinta lama soo saari karin.', 'error');
      },
    });
  }

  viewCertificate(r: any) {
    this.loading.set(true);
    this.api.get<any>(`/academic/graduations/${r.GraduationId}/certificate`).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.activeCertificate.set(res.data);
        this.certificateModalOpen.set(true);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.show(e.error?.message || 'Shahaadada lama soo saari karin.', 'error');
      },
    });
  }

  closeCertificateModal() {
    this.certificateModalOpen.set(false);
    this.activeCertificate.set(null);
  }

  printCertificate() {
    window.print();
  }

  async revertGraduation(r: any) {
    const confirmed = await this.dialog.confirm(
      'Ka Noqo Qalin-jabinta',
      `Ma hubtaa inaad ka noqoto qalin-jabinta ardayga ${r.StudentName}?\n\n` +
        `Shahaadadiisa (${r.CertificateNo}) waa la burinayaa, waxaana dib loogu celinayaa diiwaanka ardayda firfircoon.`,
    );

    if (!confirmed) return;

    this.api.post<any>(`/academic/graduations/${r.GraduationId}/revert`, {}).subscribe({
      next: (res) => {
        this.toast.show(res.message || 'Qalin-jabintii waa laga noqday.');
        this.loadRecords();
        this.loadReferences();
      },
      error: (e) => {
        this.toast.show(e.error?.message || 'Ka noqoshada waa lagu guuldareystay.', 'error');
      },
    });
  }

  exportGraduatesCsv() {
    const rows = [
      ['Certificate No', 'Ardayga', 'Admission No', 'Gender', 'Fasalka', 'Heerka', 'Sannadka', 'Taariikhda Qalin-jabinta', 'Approved By'],
      ...this.records().map((x) => [
        x.CertificateNo,
        x.StudentName,
        x.AdmissionNo,
        x.Gender,
        x.ClassName || '',
        x.LevelName || '',
        x.AcademicYearName || '',
        x.GraduationDate || '',
        x.ApprovedByName || '',
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `madaaris-graduates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
