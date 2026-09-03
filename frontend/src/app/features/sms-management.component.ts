import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { DialogService } from '../core/dialog.service';
import { ToastService } from '../core/toast.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <small>SMS MANAGEMENT</small>
        <h1>{{ title() }}</h1>
        <p>Maamul fariimaha, xusuusinta lacagaha, jadwalka iyo taariikhda dirista.</p>
      </div>
      <div class="head-actions">
        @if (view() === 'history') {
          @if ((historySummary()?.Queued || 0) > 0) {
            <button class="primary btn-dispatch-head" (click)="processAllQueue()" [disabled]="processingQueue()">
              <span>🚀</span> {{ processingQueue() ? 'Waa la dirayaa…' : 'Dir Safka Sugaya (' + historySummary()?.Queued + ')' }}
            </button>
          } @else {
            <button class="secondary btn-check-head" (click)="processAllQueue()" [disabled]="processingQueue()">
              <span>🔄</span> {{ processingQueue() ? 'Waa la hubinayaa…' : 'Hubi Safka' }}
            </button>
          }
        }
      </div>
    </header>

    <nav class="tabs">
      @for (tab of tabs; track tab.key) {
        <button [class.active]="view() === tab.key" (click)="switchView(tab.key)">{{ tab.label }}</button>
      }
    </nav>

    @if (loading()) {
      <div class="loading">Xogta waa la soo rarayaa…</div>
    }

    <!-- DASHBOARD VIEW -->
    @if (view() === 'dashboard' && dashboard()) {
      <section class="metrics">
        @for (card of metricCards(); track card.label) {
          <article>
            <span>{{ card.label }}</span>
            <b>{{ card.value }}</b>
            <i [class]="card.tone"></i>
          </article>
        }
      </section>
      <section class="grid two">
        <article class="panel">
          <header><h3>Isticmaalka SMS-ka bil kasta</h3></header>
          <div class="chart">
            @for (point of dashboard().Usage; track point.Month) {
              <div>
                <i [style.height.%]="usageHeight(point.Total)"></i>
                <small>{{ point.Month }}</small>
                <b>{{ point.Total }}</b>
              </div>
            }
            @if (!dashboard().Usage?.length) {
              <p class="empty">Weli xog isticmaal ma jirto.</p>
            }
          </div>
        </article>
        <article class="panel">
          <header><h3>Waxqabadkii dhowaa</h3></header>
          <div class="activity">
            @for (row of dashboard().Recent; track row.SmsLogId) {
              <div>
                <span class="badge" [class]="'badge ' + row.Status">{{ statusLabel(row.Status) }}</span>
                <p>
                  {{ row.RecipientPhone }}
                  <small>{{ row.MessageBody }}</small>
                </p>
                <time>{{ row.CreatedAt | date: 'short' }}</time>
              </div>
            }
            @if (!dashboard().Recent?.length) {
              <p class="empty">Fariimo wali lama dirin.</p>
            }
          </div>
        </article>
      </section>
    }

    <!-- MANUAL SEND VIEW -->
    @if (view() === 'send') {
      <section class="panel form-panel">
        <header>
          <div>
            <h3>Dir SMS gacanta ah</h3>
            <p>U dir hal waalid ama lambarka aad doorato.</p>
          </div>
        </header>
        <form [formGroup]="manualForm" (ngSubmit)="sendManual()">
          <label>
            Lambarka telefoonka
            <input formControlName="RecipientPhone" placeholder="061XXXXXXX ama 25261XXXXXXX" />
          </label>
          <label>
            Fariinta
            <textarea formControlName="MessageBody" rows="7" placeholder="Qor fariinta…"></textarea>
            <small>{{ manualForm.controls.MessageBody.value?.length || 0 }} xaraf · {{ segments(manualForm.controls.MessageBody.value || '') }} SMS</small>
          </label>
          <label>
            Waqtiga jadwalka (ikhtiyaari)
            <input type="datetime-local" formControlName="ScheduledAt" />
          </label>
          <button class="primary" [disabled]="manualForm.invalid || saving()">
            {{ saving() ? 'Waa la dirayaa…' : 'Dir Hadda / Jadwal geli' }}
          </button>
        </form>
      </section>
    }

    <!-- BULK FEE REMINDER VIEW -->
    @if (view() === 'bulk-fee-reminder') {
      <section class="panel">
        <header>
          <div>
            <h3>Shaandhaynta lacagaha maqan</h3>
            <p>Ardayda bixisay lacagta oo dhan laguma soo darayo.</p>
          </div>
          <button class="primary" (click)="loadRecipients()">Soo saar waalidiinta</button>
        </header>
        <form class="filters" [formGroup]="bulkForm">
          <label>Sannad-dugsiyeed
            <select formControlName="AcademicYearId">
              <option value="">Dhammaan</option>
              @for (x of refs().AcademicYears || []; track x.AcademicYearId) {
                <option [value]="x.AcademicYearId">{{ x.Name }}</option>
              }
            </select>
          </label>
          <label>Bisha<input type="number" min="1" max="12" formControlName="Month" /></label>
          <label>Sannadka<input type="number" formControlName="Year" /></label>
          <label>Fasalka
            <select formControlName="ClassId">
              <option value="">Dhammaan</option>
              @for (x of refs().Classes || []; track x.ClassId) {
                <option [value]="x.ClassId">{{ x.Name }}</option>
              }
            </select>
          </label>
          <label>Heerka
            <select formControlName="LevelId">
              <option value="">Dhammaan</option>
              @for (x of refs().Levels || []; track x.LevelId) {
                <option [value]="x.LevelId">{{ x.Name }}</option>
              }
            </select>
          </label>
          <label>Shift-ka
            <select formControlName="ShiftId">
              <option value="">Dhammaan</option>
              @for (x of refs().Shifts || []; track x.ShiftId) {
                <option [value]="x.ShiftId">{{ x.Name }}</option>
              }
            </select>
          </label>
          <label>Nooca lacagta
            <select formControlName="FeeTypeId">
              <option value="">Dhammaan</option>
              @for (x of refs().FeeTypes || []; track x.FeeTypeId) {
                <option [value]="x.FeeTypeId">{{ x.FeeTypeName }}</option>
              }
            </select>
          </label>
          <label>Xaaladda bixinta
            <select formControlName="PaymentStatus">
              <option value="all_outstanding">Dhammaan kuwa wax ku maqan yihiin</option>
              <option value="unpaid">Weli ma bixin</option>
              <option value="partially_paid">Qayb baa dhiman</option>
              <option value="overdue">Waqtigu dhaafay</option>
            </select>
          </label>
          <label>Waqtiga ugu dambeeya<input type="date" formControlName="DueDate" /></label>
          <label>Waqtiga dirista<input type="datetime-local" formControlName="ScheduledAt" /></label>
          <label>Template
            <select formControlName="SmsTemplateId">
              @for (x of refs().Templates || []; track x.SmsTemplateId) {
                <option [value]="x.SmsTemplateId">{{ x.TemplateName }}</option>
              }
            </select>
          </label>
        </form>

        @if (recipients().length) {
          <div class="summary">
            <article><span>Waalidiinta xaqa u leh</span><b>{{ eligibleCount() }}</b></article>
            <article><span>La doortay</span><b>{{ selectedCount() }}</b></article>
            <div>
              <button (click)="selectAll(true)">Dooro dhammaan</button>
              <button (click)="selectAll(false)">Ka noqo</button>
              <button class="primary" [disabled]="!selectedCount()" (click)="generatePreview()">Hor-u-eeg fariimaha</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)" /></th>
                  <th>Arday</th>
                  <th>Waalid</th>
                  <th>Telefoon</th>
                  <th>Fasalka</th>
                  <th>Haraaga</th>
                  <th>Waqtiga</th>
                  <th>Xaalad</th>
                </tr>
              </thead>
              <tbody>
                @for (row of recipients(); track row.InvoiceId) {
                  <tr>
                    <td>
                      <input type="checkbox" [checked]="selected()[row.InvoiceId]" [disabled]="!row.SmsEligible" (change)="toggleRow(row.InvoiceId)" />
                    </td>
                    <td><b>{{ row.StudentName }}</b><small>{{ row.AdmissionNo }}</small></td>
                    <td>{{ row.ParentName }}</td>
                    <td>{{ row.NormalizedPhone || row.PrimaryPhone || 'Lambar ma jiro' }}</td>
                    <td>{{ row.ClassName }}</td>
                    <td>{{ row.RemainingBalance | currency }}</td>
                    <td>{{ row.DueDate | date: 'shortDate' }}</td>
                    <td>
                      <span class="badge" [class]="'badge ' + (row.SmsEligible ? 'delivered' : 'failed')">
                        {{ row.SmsEligible ? 'Diyaar' : row.IneligibleReason }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      @if (preview()) {
        <section class="panel">
          <header>
            <div>
              <h3>Hor-u-eegista fariimaha</h3>
              <p>{{ preview().RecipientCount }} waalid · {{ preview().StudentCount }} arday · {{ preview().SmsCount }} SMS segment</p>
            </div>
            <button class="primary" [disabled]="saving()" (click)="sendBulk()">
              {{ saving() ? 'Waa la dirayaa…' : 'Xaqiiji oo Dir Hadda' }}
            </button>
          </header>
          <div class="cards">
            @for (msg of previewMessages(); track msg.IdempotencyKey) {
              <article>
                <span>{{ msg.RecipientPhone }}</span>
                <p>{{ msg.MessageBody }}</p>
              </article>
            }
          </div>
        </section>
      }
    }

    <!-- TEMPLATES VIEW -->
    @if (view() === 'templates') {
      <section class="panel">
        <header>
          <div>
            <h3>Qaababka Fariimaha (Templates)</h3>
            <p>Habeey nuxurka fariimaha tooska ah iyo xusuusinta lacagaha.</p>
          </div>
          <button class="primary" (click)="openTemplateModal()">Template Cusub</button>
        </header>
        <div class="cards">
          @for (tpl of templates(); track tpl.SmsTemplateId) {
            <article>
              <div class="tag-row">
                <span class="badge">{{ tpl.TemplateType }}</span>
                @if (tpl.IsDefault) { <span class="badge delivered">Default</span> }
              </div>
              <h4>{{ tpl.TemplateName }}</h4>
              <p>{{ tpl.TemplateBody }}</p>
              <footer>
                <button (click)="editTemplate(tpl)">Wax ka beddel</button>
                <button class="danger-link" (click)="deleteTemplate(tpl)">Tirtir</button>
              </footer>
            </article>
          }
        </div>
      </section>
    }

    <!-- SCHEDULED SMS VIEW -->
    @if (view() === 'scheduled-sms') {
      <section class="panel">
        <header>
          <div>
            <h3>Jadwalka Fariimaha Tooska ah</h3>
            <p>Fariimaha bishiiba mar toos loogu diro waalidiinta lacagtu ku maqan tahay.</p>
          </div>
          <button class="primary" (click)="openScheduleModal()">Jadwal Cusub</button>
        </header>
        <div class="cards">
          @for (sch of schedules(); track sch.SmsScheduleId) {
            <article>
              <div class="tag-row">
                <span class="badge" [class.delivered]="sch.IsEnabled">{{ sch.IsEnabled ? 'Shidan' : 'Daran' }}</span>
                <span class="badge">Maalinta {{ sch.DayOfMonth }} · {{ sch.SendTime }}</span>
              </div>
              <h4>{{ sch.Name }}</h4>
              <p>Template: {{ sch.TemplateName || 'Default' }}</p>
              <footer>
                <button (click)="editSchedule(sch)">Wax ka beddel</button>
                <button class="danger-link" (click)="deleteSchedule(sch)">Tirtir</button>
              </footer>
            </article>
          }
        </div>
      </section>
    }

    <!-- ========================================================================= -->
    <!-- SMS HISTORY VIEW (UPGRADED, RICH, COMPREHENSIVE) -->
    <!-- ========================================================================= -->
    @if (view() === 'history') {
      <section class="panel history-panel">
        <header class="panel-header-rich">
          <div>
            <div class="title-with-badge">
              <h3>SMS History & Dirista Waalidiinta</h3>
              <span class="pulse-indicator"></span>
            </div>
            <p>La soco xaaladda fariin kasta ilaa ay toos uga gaarto gacanta waalidka.</p>
          </div>
          <div class="header-action-group">
            @if ((historySummary()?.Queued || 0) > 0) {
              <button class="primary btn-glow" (click)="processAllQueue()" [disabled]="processingQueue()">
                <span>🚀</span> {{ processingQueue() ? 'Waa la dirayaa…' : 'Dir Dhammaan Sugaya (' + historySummary()?.Queued + ')' }}
              </button>
            } @else {
              <button class="secondary" (click)="processAllQueue()" [disabled]="processingQueue()">
                <span>🔄</span> {{ processingQueue() ? 'Waa la hubinayaa…' : 'Cusbooneysii & Hubi Safka' }}
              </button>
            }
            <button class="btn-outline" (click)="exportHistory()">📥 Dhoofso CSV</button>
          </div>
        </header>

        <!-- KPI SUMMARY CARDS -->
        <div class="history-metrics-grid">
          <div class="hist-kpi total">
            <div class="kpi-icon">📊</div>
            <div class="kpi-body">
              <span>Wadarta Fariimaha</span>
              <b>{{ historySummary()?.Total ?? history().length }}</b>
            </div>
          </div>
          <div class="hist-kpi queued" [class.highlight]="(historySummary()?.Queued || 0) > 0">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-body">
              <span>Safka ku jira (Queued)</span>
              <b>{{ historySummary()?.Queued ?? 0 }}</b>
            </div>
            @if ((historySummary()?.Queued || 0) > 0) {
              <div class="kpi-badge">U baahan diris</div>
            }
          </div>
          <div class="hist-kpi sent">
            <div class="kpi-icon">📤</div>
            <div class="kpi-body">
              <span>La diray (Sent)</span>
              <b>{{ historySummary()?.Sent ?? 0 }}</b>
            </div>
          </div>
          <div class="hist-kpi delivered">
            <div class="kpi-icon">✅</div>
            <div class="kpi-body">
              <span>Gaartay (Delivered)</span>
              <b>{{ historySummary()?.Delivered ?? 0 }}</b>
            </div>
          </div>
          <div class="hist-kpi failed" [class.alert]="(historySummary()?.Failed || 0) > 0">
            <div class="kpi-icon">⚠️</div>
            <div class="kpi-body">
              <span>Fashilantay (Failed)</span>
              <b>{{ historySummary()?.Failed ?? 0 }}</b>
            </div>
          </div>
        </div>

        <!-- SEARCH AND FILTERS BAR -->
        <div class="history-filter-box">
          <form class="filters-rich" [formGroup]="historyForm" (ngSubmit)="loadHistory()">
            <div class="filter-group">
              <label>Laga bilaabo</label>
              <input type="date" formControlName="From" />
            </div>
            <div class="filter-group">
              <label>Ilaa taariikh</label>
              <input type="date" formControlName="To" />
            </div>
            <div class="filter-group">
              <label>Xaaladda fariinta</label>
              <select formControlName="Status">
                <option value="">Dhammaan Xaaladaha</option>
                @for (x of statuses; track x) {
                  <option [value]="x">{{ statusLabel(x) }}</option>
                }
              </select>
            </div>
            <div class="filter-group search-group">
              <label>Raadi (Telefoon, Arday, Waalid)</label>
              <div class="search-input-wrap">
                <input formControlName="Search" placeholder="Lambar, magac arday ama waalid..." />
                @if (historyForm.controls.Search.value) {
                  <button type="button" class="btn-clear-search" (click)="historyForm.patchValue({ Search: '' }); loadHistory()">×</button>
                }
              </div>
            </div>
            <div class="filter-buttons">
              <button type="submit" class="primary btn-search">🔍 Raadi</button>
              <button type="button" class="btn-reset" (click)="resetHistoryFilters()">Nadiifi</button>
            </div>
          </form>
        </div>

        <!-- STATUS FLOW BARS -->
        <div class="status-flow">
          @for (item of statusFlow; track item.key; let last = $last) {
            <div class="flow-step" [class.selected-step]="historyForm.controls.Status.value === item.key" (click)="filterByStatus(item.key)">
              <span [class]="'badge ' + item.key">{{ statusLabel(item.key) }}</span>
              <small>{{ item.text }}</small>
            </div>
            @if (!last) {
              <b class="flow-arrow">→</b>
            }
          }
        </div>

        <!-- RICH TABLE -->
        <div class="table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th class="th-ref">REF</th>
                <th class="th-person">ARDAY / WAALID</th>
                <th class="th-phone">TELEFOON</th>
                <th class="th-type">NOOCA</th>
                <th class="th-msg">FARIINTA</th>
                <th class="th-status">XAALAD</th>
                <th class="th-attempts">ISKU DAY</th>
                <th class="th-date">LA DIRAY / JADWAL</th>
                <th class="th-actions">FICIL</th>
              </tr>
            </thead>
            <tbody>
              @for (row of history(); track row.SmsLogId) {
                <tr [class.row-queued]="row.Status === 'queued'" [class.row-failed]="row.Status === 'failed'">
                  <td class="ref-col">
                    <span class="ref-badge">#{{ row.SmsLogId }}</span>
                  </td>
                  <td class="person-cell">
                    @if (row.StudentName) {
                      <div class="person-wrap">
                        <div class="avatar-circle">{{ getInitials(row.StudentName) }}</div>
                        <div class="person-details">
                          <b class="student-name">{{ row.StudentName }}</b>
                          <div class="meta-row">
                            @if (row.AdmissionNo) {
                              <span class="meta-pill admn">{{ row.AdmissionNo }}</span>
                            }
                            @if (row.ClassName) {
                              <span class="meta-pill class-pill">{{ row.ClassName }}</span>
                            }
                            <span class="parent-name">👤 {{ row.ParentName || 'Waalid' }}</span>
                          </div>
                        </div>
                      </div>
                    } @else {
                      <div class="person-wrap">
                        <div class="avatar-circle announcement">📢</div>
                        <div class="person-details">
                          <b class="student-name notice">Fariin Guud / Toos</b>
                          <div class="meta-row">
                            <span class="parent-name">👤 {{ row.ParentName || 'Waalid / Masuul' }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  </td>
                  <td class="phone-cell">
                    <div class="phone-chip" (click)="copyToClipboard(row.RecipientPhone)" title="Guji si aad u koobiyeysato">
                      <span class="phone-icon">📞</span>
                      <b>{{ row.RecipientPhone }}</b>
                    </div>
                  </td>
                  <td>
                    <span class="type-tag" [class]="row.MessageType">{{ typeLabel(row.MessageType) }}</span>
                  </td>
                  <td class="preview-cell">
                    <div class="message-preview-card" (click)="openMessagePreview(row)" title="Guji si aad u aragto fariinta oo dhan">
                      <p class="preview-line">{{ row.MessageBody }}</p>
                      <div class="preview-sub">
                        <span>{{ row.MessageBody?.length || 0 }} xaraf</span> · <span>{{ segments(row.MessageBody || '') }} SMS</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="status-cell" (click)="showStatus(row)" title="Guji si aad u aragto faahfaahinta">
                      <span class="status-pill" [class]="row.Status">
                        @if (row.Status === 'queued') {
                          <span class="dot-indicator queued"></span>
                        } @else if (row.Status === 'processing') {
                          <span class="dot-indicator processing"></span>
                        } @else if (row.Status === 'sent' || row.Status === 'delivered') {
                          <span class="dot-indicator sent">✓</span>
                        } @else if (row.Status === 'failed') {
                          <span class="dot-indicator failed">!</span>
                        }
                        {{ statusLabel(row.Status) }}
                      </span>
                    </div>
                  </td>
                  <td class="attempts-cell">
                    <span class="attempts-pill" [class.multi]="row.Attempts > 1" [class.maxed]="row.Attempts >= 3">
                      {{ row.Attempts || 0 }}/3
                    </span>
                  </td>
                  <td class="date-cell">
                    @if (row.SentAt) {
                      <div class="date-main">{{ row.SentAt | date: 'dd/MM/yyyy' }}</div>
                      <small class="date-time">{{ row.SentAt | date: 'HH:mm:ss' }}</small>
                    } @else if (row.ScheduledAt) {
                      <div class="date-scheduled">Jadwal: {{ row.ScheduledAt | date: 'dd/MM/yyyy HH:mm' }}</div>
                    } @else {
                      <div class="date-created">{{ row.CreatedAt | date: 'dd/MM/yyyy HH:mm' }}</div>
                    }
                  </td>
                  <td class="actions-cell">
                    <div class="action-btn-group">
                      @if (row.Status === 'queued' || row.Status === 'retrying') {
                        <button class="btn-action-primary" (click)="sendNow(row)" title="Dir fariintan hadda waalidka">
                          ⚡ Dir Hadda
                        </button>
                      }
                      @if (row.Status === 'failed') {
                        <button class="btn-action-retry" (click)="retry(row)" title="Dib u tijaabi dirista">
                          🔄 Retry
                        </button>
                      }
                      <button class="btn-action-details" (click)="showStatus(row)" title="Faahfaahin & Raadraac">
                        ℹ Faahfaahin
                      </button>
                      <button class="btn-action-resend" (click)="resend(row)" title="Dib ugu dir waalidka">
                        🔁 Resend
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (!history()?.length) {
                <tr>
                  <td colspan="9">
                    <div class="empty-state-box">
                      <div class="empty-icon-large">📱</div>
                      <h4>Fariimo lama helin</h4>
                      <p>Kama helin fariimo shuruudaha aad dooratay ama weli fariin lama dirin.</p>
                      <button class="primary" (click)="resetHistoryFilters()">Dib u celi shaandhada</button>
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
    <!-- SMS SETTINGS VIEW (GATEWAY CONFIGURATION & LIVE SENDER) -->
    <!-- ========================================================================= -->
    @if (view() === 'settings') {
      <section class="panel form-panel settings-panel">
        <header class="panel-header-rich">
          <div>
            <h3>Isku-xirka SMS Gateway & Dejimaha</h3>
            <p>Ku xir dugsiga adeeg-bixiyahaaga SMS (Hormuud, SomSMS, Telesom, Twilio ama HTTP REST) si fariimuhu toos ugu dhacaan taleefannada waalidiinta.</p>
          </div>
          <span class="badge-status-lg" [class.live]="settingsForm.controls.IsLive.value">
            {{ settingsForm.controls.IsLive.value ? '🟢 LIVE MODE (Toos u diraya)' : '🟡 TEST MODE (Tijaabo bilaash ah)' }}
          </span>
        </header>

        <!-- LIVE VS TEST MODE BANNER -->
        <div class="mode-callout" [class.live]="settingsForm.controls.IsLive.value">
          <div class="mode-icon">{{ settingsForm.controls.IsLive.value ? '🚀' : '🧪' }}</div>
          <div class="mode-desc">
            @if (settingsForm.controls.IsLive.value) {
              <b>Nidaamku wuxuu ku jiraa LIVE MODE</b>
              <p>Fariin kasta oo aad dirto waxay toos ugu dhacaysaa taleefanka gacanta ee waalidka. Hubi in akoonkaaga SMS-ku leeyahay credit kugu filan.</p>
            } @else {
              <b>Nidaamku wuxuu ku jiraa TEST / SIMULATION MODE</b>
              <p>Fariimaha si dhab ah looma dirayo lagamana jaro lacag akoonkaaga. Waa hab bilaash ah oo aad ku tijaabin karto qaabka fariimuhu u baxaan.</p>
            }
          </div>
          <button type="button" class="btn-toggle-mode" (click)="toggleLiveMode()">
            {{ settingsForm.controls.IsLive.value ? 'U beddel Test Mode' : 'U beddel Live Mode' }}
          </button>
        </div>

        <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">
          <!-- PROVIDER CONFIGURATION SECTION -->
          <div class="settings-section">
            <h4 class="section-title">1. Adeeg-bixiyaha SMS (Gateway Provider)</h4>
            <div class="form-grid">
              <label>
                Nooca Gateway-ga (Provider Type)
                <select formControlName="ProviderType">
                  <option value="generic_http">Generic HTTP REST (Standard JSON POST)</option>
                  <option value="hormuud">Hormuud SMS API / Enterprise SMS</option>
                  <option value="som_sms">SomSMS / Somali Aggregator</option>
                  <option value="twilio">Twilio SMS Gateway</option>
                </select>
              </label>
              <label>
                Magaca Adeeg-bixiyaha
                <input formControlName="ProviderName" placeholder="Tusaale: Hormuud SMS, SomSMS, iwm" />
              </label>
              <label class="full-width">
                Gateway API URL
                <input formControlName="ApiUrl" placeholder="https://api.provider.com/sms/v1/send" />
                <small class="help-text">URL-ka rasmiga ah ee uu ku siiyey adeeg-bixiyahaaga SMS.</small>
              </label>
              <label>
                Sender ID (Magaca Fariinta ka muuqanaya)
                <input formControlName="SenderId" placeholder="MADAARIS ama Magaca Dugsiga" />
              </label>
              <label>
                API Key / Username
                <input type="password" formControlName="ApiKey" placeholder="Ka tag madhan si kii hore loo hayo" />
                @if (settingsForm.controls.CredentialsConfigured.value) {
                  <small class="cred-ok">✓ Furaha waa la keydiyay hore</small>
                }
              </label>
              <label class="full-width">
                API Secret / Password (haddii loo baahan yahay)
                <input type="password" formControlName="ApiSecret" placeholder="Furaha labaad ama password-ka" />
                @if (settingsForm.controls.SecretConfigured.value) {
                  <small class="cred-ok">✓ Secret-ka waa la keydiyay hore</small>
                }
              </label>
            </div>
          </div>

          <!-- SYSTEM POLICIES SECTION -->
          <div class="settings-section">
            <h4 class="section-title">2. Xeerarka Dirista & Kharashka</h4>
            <div class="form-grid">
              <label>Timezone<input formControlName="Timezone" /></label>
              <label>Maalinta reminder-ka bisha (1-28)<input type="number" min="1" max="28" formControlName="ReminderDay" /></label>
              <label>Saacadda dirista tooska ah<input type="time" formControlName="ReminderTime" /></label>
              <label>Maximum retries (isku dayada)<input type="number" min="1" max="10" formControlName="MaximumAttempts" /></label>
              <label>Kharashka hal fariin / segment ($)<input type="number" step="0.001" formControlName="EstimatedSegmentCost" placeholder="0.015" /></label>
              <label>Batch size<input type="number" formControlName="BatchSize" /></label>
            </div>
            <div class="checks-rich">
              <label><input type="checkbox" formControlName="IsActive" /> SMS Module-ku ha shaqeeyo</label>
              <label><input type="checkbox" formControlName="AutomaticRemindersEnabled" /> Xusuusinta tooska ah ee bil kasta (Automatic Reminders)</label>
              <label><input type="checkbox" formControlName="CombineSiblings" /> Walaalaha hal fariin isugu dar (Combine Siblings)</label>
            </div>
          </div>

          <div class="form-submit-row">
            <button class="primary btn-save-settings" [disabled]="saving()">
              {{ saving() ? 'Waa la kaydinayaa…' : '💾 Kaydi Dejimaha SMS' }}
            </button>
          </div>
        </form>

        <!-- DIRECT TEST SMS TOOL -->
        <div class="test-tool-card">
          <header class="test-header">
            <h4>🧪 Tijaabi Dirista Mobile-kaaga (Test SMS)</h4>
            <p>Geli lambarkaaga si aad isla goobta u xaqiijiso in fariintu usoo dhacayso taleefankaaga.</p>
          </header>
          <div class="test-form-row">
            <input type="text" [(ngModel)]="testPhoneInput" placeholder="Lambarkaaga: 061XXXXXXX ama 25261XXXXXXX" class="test-phone-input" />
            <input type="text" [(ngModel)]="testMsgInput" placeholder="Fariinta tijaabada ah (ikhtiyaari)..." class="test-msg-input" />
            <button type="button" class="btn-run-test" (click)="runTestSms()" [disabled]="testingProvider()">
              {{ testingProvider() ? 'Waa la dirayaa…' : '🚀 Dir Fariin Tijaabo ah' }}
            </button>
          </div>

          @if (testResult()) {
            <div class="test-result-banner" [class.success]="testResult().success" [class.fail]="!testResult().success">
              <div class="result-icon">{{ testResult().success ? '✅' : '❌' }}</div>
              <div class="result-text">
                <b>{{ testResult().message }}</b>
                @if (testResult().providerId) {
                  <small>Provider Ref: {{ testResult().providerId }}</small>
                }
              </div>
            </div>
          }
        </div>
      </section>
    }

    <!-- ========================================================================= -->
    <!-- MODALS: HISTORY DETAILS & MESSAGE PREVIEW -->
    <!-- ========================================================================= -->
    @if (historyDetailOpen() && activeHistoryItem()) {
      <div class="modal" (click)="historyDetailOpen.set(false)">
        <section class="modal-detail-box" (click)="$event.stopPropagation()">
          <header>
            <div>
              <h2>SMS #{{ activeHistoryItem().SmsLogId }} — Faahfaahinta Raadraaca</h2>
              <p>Xogta buuxda ee dirista iyo xaaladda gaarista waalidka</p>
            </div>
            <button (click)="historyDetailOpen.set(false)">×</button>
          </header>
          <div class="modal-body-pad">
            <div class="detail-status-banner" [class]="activeHistoryItem().Status">
              <span class="status-indicator-dot"></span>
              <div>
                <b>Xaaladda hadda: {{ statusLabel(activeHistoryItem().Status) }}</b>
                <small>Attempts: {{ activeHistoryItem().Attempts || 0 }} jeer</small>
              </div>
            </div>

            <div class="detail-grid">
              <div>
                <span class="label-dim">Telefoonka Waalidka</span>
                <b>{{ activeHistoryItem().RecipientPhone }}</b>
              </div>
              <div>
                <span class="label-dim">Ardayga / Fasalka</span>
                <b>{{ activeHistoryItem().StudentName || 'Ogeysiis Toos ah' }}</b>
                @if (activeHistoryItem().ClassName) {
                  <small>({{ activeHistoryItem().ClassName }})</small>
                }
              </div>
              <div>
                <span class="label-dim">Magaca Waalidka</span>
                <b>{{ activeHistoryItem().ParentName || '—' }}</b>
              </div>
              <div>
                <span class="label-dim">Nooca Fariinta</span>
                <b>{{ typeLabel(activeHistoryItem().MessageType) }}</b>
              </div>
              <div>
                <span class="label-dim">Safka la geliyey</span>
                <time>{{ activeHistoryItem().CreatedAt | date: 'medium' }}</time>
              </div>
              <div>
                <span class="label-dim">Provider-ka loo diray</span>
                <time>{{ activeHistoryItem().SentAt ? (activeHistoryItem().SentAt | date: 'medium') : 'Weli' }}</time>
              </div>
              @if (activeHistoryItem().ProviderName) {
                <div>
                  <span class="label-dim">Adeeg-bixiyaha (Provider)</span>
                  <b>{{ activeHistoryItem().ProviderName }}</b>
                </div>
              }
              @if (activeHistoryItem().ProviderMessageId) {
                <div>
                  <span class="label-dim">Provider Message ID</span>
                  <code class="code-ref">{{ activeHistoryItem().ProviderMessageId }}</code>
                </div>
              }
            </div>

            <div class="detail-message-box">
              <span class="label-dim">Nuxurka Fariinta:</span>
              <p class="full-message-text">{{ activeHistoryItem().MessageBody }}</p>
              <div class="msg-meta-bar">
                <span>{{ activeHistoryItem().MessageBody?.length || 0 }} xaraf</span>
                <span>{{ segments(activeHistoryItem().MessageBody || '') }} SMS segment</span>
              </div>
            </div>

            @if (activeHistoryItem().FailedReason || activeHistoryItem().Queue?.LastError) {
              <div class="failure-callout">
                <span class="fail-head">⚠️ Sababta Fashilka:</span>
                <p>{{ activeHistoryItem().FailedReason || activeHistoryItem().Queue?.LastError }}</p>
              </div>
            }

            @if (activeHistoryItem().ProviderResponse) {
              <div class="provider-resp-box">
                <span class="label-dim">Jawaabta Provider-ka:</span>
                <code>{{ activeHistoryItem().ProviderResponse }}</code>
              </div>
            }
          </div>
          <footer>
            @if (activeHistoryItem().Status === 'queued' || activeHistoryItem().Status === 'retrying') {
              <button class="primary" (click)="sendNow(activeHistoryItem()); historyDetailOpen.set(false)">⚡ Dir Hadda</button>
            }
            @if (activeHistoryItem().Status === 'failed') {
              <button class="primary" (click)="retry(activeHistoryItem()); historyDetailOpen.set(false)">🔄 Retry</button>
            }
            <button (click)="resend(activeHistoryItem()); historyDetailOpen.set(false)">🔁 Resend</button>
            <button class="btn-close" (click)="historyDetailOpen.set(false)">Xir</button>
          </footer>
        </section>
      </div>
    }

    <!-- MESSAGE PREVIEW MODAL -->
    @if (messagePreviewOpen() && selectedMessagePreview()) {
      <div class="modal" (click)="messagePreviewOpen.set(false)">
        <section class="modal-preview-box" (click)="$event.stopPropagation()">
          <header>
            <h2>Nuxurka Fariinta SMS</h2>
            <button (click)="messagePreviewOpen.set(false)">×</button>
          </header>
          <div class="modal-body-pad">
            <div class="preview-recipient-header">
              <span>Ku socota: <b>{{ selectedMessagePreview().RecipientPhone }}</b></span>
              @if (selectedMessagePreview().StudentName) {
                <span>Arday: <b>{{ selectedMessagePreview().StudentName }}</b></span>
              }
            </div>
            <div class="preview-content-area">
              <p>{{ selectedMessagePreview().MessageBody }}</p>
            </div>
            <div class="preview-stats-footer">
              <span>Tirada xarfaha: <b>{{ selectedMessagePreview().MessageBody?.length || 0 }}</b></span>
              <span>Tirada SMS: <b>{{ segments(selectedMessagePreview().MessageBody || '') }}</b></span>
            </div>
          </div>
          <footer>
            <button (click)="copyToClipboard(selectedMessagePreview().MessageBody)">📋 Koobiyeey Fariinta</button>
            <button class="primary" (click)="messagePreviewOpen.set(false)">Xir</button>
          </footer>
        </section>
      </div>
    }

    <!-- TEMPLATE MODAL -->
    @if (templateOpen()) {
      <div class="modal" (click)="templateOpen.set(false)">
        <section (click)="$event.stopPropagation()">
          <header>
            <h2>{{ editingTemplateId() ? 'Wax ka beddel template' : 'Template cusub' }}</h2>
            <button (click)="templateOpen.set(false)">×</button>
          </header>
          <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()">
            <label>Magaca<input formControlName="TemplateName" /></label>
            <div class="form-grid">
              <label>Nooca
                <select formControlName="TemplateType">
                  @for (x of templateTypes; track x) {
                    <option>{{ x }}</option>
                  }
                </select>
              </label>
              <label>Luqadda
                <select formControlName="Language">
                  <option value="so">Somali</option>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </label>
            </div>
            <label>
              Fariinta
              <textarea rows="7" formControlName="TemplateBody"></textarea>
              <small>{{ templateForm.controls.TemplateBody.value?.length || 0 }} xaraf · {{ segments(templateForm.controls.TemplateBody.value || '') }} SMS</small>
            </label>
            <div class="variable-buttons">
              @for (v of variables; track v) {
                <button type="button" (click)="insertVariable(v)">{{ v }}</button>
              }
            </div>
            <div class="preview-box">{{ templatePreview() }}</div>
            <div class="checks">
              <label><input type="checkbox" formControlName="IsActive" /> Firfircoon</label>
              <label><input type="checkbox" formControlName="IsDefault" /> Default</label>
            </div>
            <footer>
              <button type="button" (click)="templateOpen.set(false)">Jooji</button>
              <button class="primary">Kaydi</button>
            </footer>
          </form>
        </section>
      </div>
    }

    <!-- SCHEDULE MODAL -->
    @if (scheduleOpen()) {
      <div class="modal" (click)="scheduleOpen.set(false)">
        <section (click)="$event.stopPropagation()">
          <header>
            <h2>Jadwalka SMS</h2>
            <button (click)="scheduleOpen.set(false)">×</button>
          </header>
          <form [formGroup]="scheduleForm" (ngSubmit)="saveSchedule()">
            <label>Magaca<input formControlName="Name" /></label>
            <div class="form-grid">
              <label>Maalinta bisha<input type="number" min="1" max="28" formControlName="DayOfMonth" /></label>
              <label>Saacadda<input type="time" formControlName="SendTime" /></label>
              <label>Timezone<input formControlName="Timezone" /></label>
              <label>Template
                <select formControlName="SmsTemplateId">
                  @for (x of refs().Templates || []; track x.SmsTemplateId) {
                    <option [value]="x.SmsTemplateId">{{ x.TemplateName }}</option>
                  }
                </select>
              </label>
              <label>Reminder count<input type="number" formControlName="NumberOfReminders" /></label>
              <label>Maalmaha u dhexeeya<input type="number" formControlName="DaysBetweenReminders" /></label>
              <label>Batch size<input type="number" formControlName="BatchSize" /></label>
              <label>Maximum retries<input type="number" formControlName="MaximumAttempts" /></label>
            </div>
            <div class="checks">
              <label><input type="checkbox" formControlName="IsEnabled" /> Shidan</label>
              <label><input type="checkbox" formControlName="SkipWeekends" /> Ka bood weekend</label>
              <label><input type="checkbox" formControlName="CombineSiblings" /> Isku dar walaalaha</label>
            </div>
            <footer>
              <button type="button" (click)="scheduleOpen.set(false)">Jooji</button>
              <button class="primary">Kaydi jadwalka</button>
            </footer>
          </form>
        </section>
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
        gap: 20px;
        align-items: center;
        margin-bottom: 5px;
      }
      .page-head small {
        color: #15549c;
        font-weight: 900;
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
        margin: 2px 0;
        color: #64748b;
        font-size: 13px;
      }
      .head-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      button {
        border: 1px solid #d0d7e2;
        border-radius: 8px;
        background: white;
        color: #334155;
        padding: 9px 15px;
        font: inherit;
        font-size: 12px;
        font-weight: 650;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      button:hover:not(:disabled) {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      button.primary {
        border-color: #1e3a8a;
        background: linear-gradient(135deg, #1e3a8a, #2563eb);
        color: white;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
      }
      button.primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #172554, #1d4ed8);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      }
      button.secondary {
        border-color: #cbd5e1;
        background: white;
        color: #1e293b;
      }
      button.btn-outline {
        background: white;
        border: 1px solid #cbd5e1;
      }
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      /* TABS NAVIGATION */
      .tabs {
        display: flex;
        gap: 4px;
        overflow-x: auto;
        margin: 14px 0 16px;
        padding: 5px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
      }
      .tabs button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: #64748b;
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
      .tabs button:hover {
        background: #edeef2;
        color: #0f172a;
      }
      .tabs button.active {
        background: #1e3a8a;
        color: white;
        box-shadow: 0 2px 5px rgba(30, 58, 138, 0.25);
      }

      .loading {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 1000;
        padding: 10px 16px;
        border-radius: 9px;
        background: #1e3a8a;
        color: white;
        box-shadow: 0 10px 25px rgba(30, 58, 138, 0.35);
        font-size: 13px;
        font-weight: 600;
      }

      /* PANEL BASE */
      .panel {
        margin-bottom: 16px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: white;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .panel-header-rich {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 20px;
        border-bottom: 1px solid #f1f5f9;
        background: #ffffff;
      }
      .title-with-badge {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .panel h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 750;
        color: #0f172a;
      }
      .panel-header-rich p {
        margin: 3px 0 0;
        color: #64748b;
        font-size: 12px;
      }
      .header-action-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* KPI METRICS IN HISTORY */
      .history-metrics-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        padding: 16px 20px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }
      .hist-kpi {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: white;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      }
      .kpi-icon {
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: #f1f5f9;
      }
      .kpi-body span {
        display: block;
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
      }
      .kpi-body b {
        display: block;
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
        margin-top: 2px;
      }
      .hist-kpi.queued.highlight {
        border-color: #f59e0b;
        background: #fffbeb;
      }
      .hist-kpi.queued.highlight .kpi-icon {
        background: #fde68a;
      }
      .hist-kpi.failed.alert {
        border-color: #fca5a5;
        background: #fef2f2;
      }
      .hist-kpi.failed.alert .kpi-icon {
        background: #fee2e2;
      }
      .kpi-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 2px 6px;
        border-radius: 10px;
        background: #f59e0b;
        color: white;
        font-size: 9px;
        font-weight: 700;
      }

      /* SEARCH & FILTERS */
      .history-filter-box {
        padding: 14px 20px;
        border-bottom: 1px solid #f1f5f9;
        background: white;
      }
      .filters-rich {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 12px;
      }
      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 140px;
      }
      .filter-group label {
        font-size: 11px;
        font-weight: 650;
        color: #475569;
      }
      .search-group {
        flex: 1;
        min-width: 220px;
      }
      .search-input-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-input-wrap input {
        padding-right: 28px;
      }
      .btn-clear-search {
        position: absolute;
        right: 8px;
        border: 0;
        background: transparent;
        color: #94a3b8;
        font-size: 14px;
        cursor: pointer;
        padding: 2px;
      }
      .filter-buttons {
        display: flex;
        gap: 8px;
      }
      input, select, textarea {
        width: 100%;
        padding: 9px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: white;
        color: #0f172a;
        font: inherit;
        font-size: 12px;
        outline: none;
        transition: border 0.15s ease;
      }
      input:focus, select:focus, textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }

      /* STATUS FLOW */
      .status-flow {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        overflow-x: auto;
        border-bottom: 1px solid #f1f5f9;
        background: #fbfcfe;
      }
      .flow-step {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .flow-step:hover {
        background: #f1f5f9;
      }
      .flow-step.selected-step {
        background: #e2e8f0;
      }
      .flow-step small {
        color: #64748b;
        font-size: 11px;
      }
      .flow-arrow {
        color: #cbd5e1;
        font-size: 12px;
      }

      /* HISTORY TABLE */
      .table-wrap {
        overflow-x: auto;
        max-width: 100%;
      }
      table.history-table {
        width: 100%;
        border-collapse: collapse;
        white-space: nowrap;
      }
      th {
        padding: 12px 14px;
        border-bottom: 2px solid #e2e8f0;
        background: #f8fafc;
        color: #475569;
        font-size: 11px;
        font-weight: 750;
        letter-spacing: 0.04em;
        text-align: left;
      }
      td {
        padding: 12px 14px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
        font-size: 12px;
        color: #1e293b;
      }
      tr:hover {
        background: #fafbfc;
      }
      tr.row-queued {
        background: #fffdf5;
      }
      tr.row-failed {
        background: #fffafa;
      }

      /* PERSON CELL */
      .person-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .avatar-circle {
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
      .avatar-circle.announcement {
        background: #f1f5f9;
        font-size: 14px;
      }
      .person-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .student-name {
        font-size: 12px;
        color: #0f172a;
      }
      .student-name.notice {
        color: #475569;
        font-style: italic;
      }
      .meta-row {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;
        color: #64748b;
      }
      .meta-pill {
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
      }
      .meta-pill.admn {
        background: #f1f5f9;
        color: #334155;
      }
      .meta-pill.class-pill {
        background: #e0f2fe;
        color: #0369a1;
      }
      .parent-name {
        color: #64748b;
      }

      /* REF */
      .ref-badge {
        font-family: monospace;
        font-weight: 700;
        color: #475569;
        background: #f1f5f9;
        padding: 3px 6px;
        border-radius: 5px;
        font-size: 11px;
      }

      /* PHONE */
      .phone-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 8px;
        border-radius: 6px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .phone-chip:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }
      .phone-icon {
        font-size: 10px;
      }

      /* TYPE TAG */
      .type-tag {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 650;
        background: #f1f5f9;
        color: #475569;
      }
      .type-tag.fee_reminder, .type-tag.bulk_fee_reminder, .type-tag.individual_fee_reminder {
        background: #eff6ff;
        color: #1d4ed8;
      }
      .type-tag.general_announcement {
        background: #f0fdf4;
        color: #15803d;
      }

      /* MESSAGE PREVIEW */
      .preview-cell {
        max-width: 280px;
      }
      .message-preview-card {
        padding: 5px 8px;
        border-radius: 6px;
        background: #f8fafc;
        border: 1px solid #f1f5f9;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .message-preview-card:hover {
        background: #edf2f7;
        border-color: #cbd5e1;
      }
      .preview-line {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        color: #334155;
      }
      .preview-sub {
        margin-top: 2px;
        font-size: 9px;
        color: #64748b;
      }

      /* STATUS PILLS */
      .status-cell {
        cursor: pointer;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
      }
      .status-pill.queued {
        background: #fef3c7;
        color: #92400e;
      }
      .status-pill.processing {
        background: #dbeafe;
        color: #1e40af;
      }
      .status-pill.sent {
        background: #e0f2fe;
        color: #0369a1;
      }
      .status-pill.delivered {
        background: #dcfce7;
        color: #15803d;
      }
      .status-pill.failed {
        background: #fee2e2;
        color: #991b1b;
      }
      .status-pill.retrying {
        background: #ffedd5;
        color: #9a3412;
      }
      .status-pill.cancelled {
        background: #f1f5f9;
        color: #475569;
      }
      .dot-indicator {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
      }
      .dot-indicator.queued {
        background: #d97706;
        animation: pulse 1.5s infinite;
      }
      .dot-indicator.processing {
        background: #2563eb;
      }
      .dot-indicator.sent {
        font-size: 10px;
      }
      .dot-indicator.failed {
        font-size: 10px;
        font-weight: 900;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.2); }
      }

      /* ATTEMPTS */
      .attempts-pill {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        background: #f1f5f9;
        color: #475569;
      }
      .attempts-pill.multi {
        background: #fef3c7;
        color: #b45309;
      }
      .attempts-pill.maxed {
        background: #fee2e2;
        color: #b91c1c;
      }

      /* DATES */
      .date-main {
        font-weight: 650;
        color: #0f172a;
        font-size: 11px;
      }
      .date-time, .date-scheduled, .date-created {
        font-size: 10px;
        color: #64748b;
      }
      .date-scheduled {
        color: #d97706;
      }

      /* ACTION BUTTONS */
      .action-btn-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .btn-action-primary {
        background: #1e3a8a;
        border-color: #1e3a8a;
        color: white;
        padding: 5px 9px;
        font-size: 10px;
        font-weight: 750;
      }
      .btn-action-primary:hover {
        background: #172554;
      }
      .btn-action-retry {
        background: #ef4444;
        border-color: #dc2626;
        color: white;
        padding: 5px 9px;
        font-size: 10px;
        font-weight: 750;
      }
      .btn-action-details {
        background: white;
        border-color: #cbd5e1;
        color: #334155;
        padding: 5px 9px;
        font-size: 10px;
      }
      .btn-action-resend {
        background: white;
        border-color: #cbd5e1;
        color: #1e3a8a;
        padding: 5px 9px;
        font-size: 10px;
      }

      /* EMPTY STATE */
      .empty-state-box {
        text-align: center;
        padding: 50px 20px;
        color: #64748b;
      }
      .empty-icon-large {
        font-size: 38px;
        margin-bottom: 8px;
      }
      .empty-state-box h4 {
        margin: 0 0 6px;
        font-size: 16px;
        color: #0f172a;
      }
      .empty-state-box p {
        margin: 0 0 16px;
        font-size: 12px;
      }

      /* SETTINGS PAGE STYLES */
      .settings-panel {
        max-width: 860px;
      }
      .badge-status-lg {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 750;
        background: #fef3c7;
        color: #92400e;
      }
      .badge-status-lg.live {
        background: #dcfce7;
        color: #166534;
      }
      .mode-callout {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 20px;
        margin: 16px 20px 0;
        border-radius: 10px;
        border: 1px solid #fde68a;
        background: #fffbeb;
      }
      .mode-callout.live {
        border-color: #bbf7d0;
        background: #f0fdf4;
      }
      .mode-icon {
        font-size: 26px;
      }
      .mode-desc b {
        display: block;
        font-size: 13px;
        color: #0f172a;
      }
      .mode-desc p {
        margin: 3px 0 0;
        font-size: 11px;
        color: #475569;
      }
      .btn-toggle-mode {
        margin-left: auto;
        white-space: nowrap;
        background: white;
        border: 1px solid #cbd5e1;
        font-size: 11px;
        font-weight: 700;
      }
      .settings-section {
        padding: 18px 20px;
        border-bottom: 1px solid #f1f5f9;
      }
      .section-title {
        margin: 0 0 14px;
        font-size: 13px;
        font-weight: 750;
        color: #1e293b;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .full-width {
        grid-column: 1 / -1;
      }
      .help-text {
        font-size: 10px;
        color: #64748b;
        margin-top: 2px;
      }
      .cred-ok {
        font-size: 10px;
        color: #16a34a;
        font-weight: 650;
      }
      .checks-rich {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 14px;
      }
      .checks-rich label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        cursor: pointer;
      }
      .checks-rich input {
        width: auto;
      }
      .form-submit-row {
        padding: 16px 20px;
        display: flex;
        justify-content: flex-end;
      }
      .btn-save-settings {
        padding: 11px 24px;
        font-size: 13px;
      }

      /* DIRECT TEST TOOL */
      .test-tool-card {
        margin: 10px 20px 24px;
        padding: 18px 20px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
      }
      .test-header h4 {
        margin: 0 0 4px;
        font-size: 13px;
        color: #0f172a;
      }
      .test-header p {
        margin: 0 0 12px;
        font-size: 11px;
        color: #64748b;
      }
      .test-form-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .test-phone-input {
        flex: 1;
        min-width: 180px;
      }
      .test-msg-input {
        flex: 2;
        min-width: 240px;
      }
      .btn-run-test {
        background: #1e3a8a;
        color: white;
        border-color: #1e3a8a;
        font-weight: 700;
      }
      .test-result-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
        padding: 12px 16px;
        border-radius: 8px;
      }
      .test-result-banner.success {
        background: #dcfce7;
        border: 1px solid #86efac;
        color: #14532d;
      }
      .test-result-banner.fail {
        background: #fee2e2;
        border: 1px solid #fca5a5;
        color: #7f1d1d;
      }
      .result-text b {
        display: block;
        font-size: 12px;
      }
      .result-text small {
        font-size: 10px;
        opacity: 0.85;
      }

      /* MODALS */
      .modal {
        position: fixed;
        inset: 0;
        z-index: 6000;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(5px);
      }
      .modal > section {
        width: min(650px, 100%);
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        border-radius: 14px;
        background: white;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
      }
      .modal section > header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 22px;
        border-bottom: 1px solid #e2e8f0;
      }
      .modal h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 750;
        color: #0f172a;
      }
      .modal header button {
        border: 0;
        font-size: 22px;
        color: #64748b;
        background: transparent;
        padding: 4px 8px;
      }
      .modal-body-pad {
        padding: 20px;
      }
      .detail-status-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        background: #f1f5f9;
      }
      .detail-status-banner.delivered, .detail-status-banner.sent {
        background: #dcfce7;
        color: #14532d;
      }
      .detail-status-banner.queued {
        background: #fef3c7;
        color: #78350f;
      }
      .detail-status-banner.failed {
        background: #fee2e2;
        color: #7f1d1d;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f1f5f9;
      }
      .label-dim {
        display: block;
        font-size: 10px;
        color: #64748b;
        font-weight: 600;
        margin-bottom: 2px;
      }
      .code-ref {
        font-family: monospace;
        font-size: 11px;
        background: #f1f5f9;
        padding: 2px 5px;
        border-radius: 4px;
      }
      .detail-message-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 14px;
      }
      .full-message-text {
        margin: 6px 0;
        font-size: 12px;
        line-height: 1.6;
        color: #1e293b;
        white-space: pre-wrap;
      }
      .msg-meta-bar {
        display: flex;
        gap: 12px;
        font-size: 10px;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        padding-top: 6px;
        margin-top: 6px;
      }
      .failure-callout {
        padding: 12px 14px;
        border-radius: 8px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        margin-bottom: 14px;
      }
      .fail-head {
        font-weight: 750;
        color: #991b1b;
        font-size: 11px;
        display: block;
      }
      .failure-callout p {
        margin: 4px 0 0;
        font-size: 11px;
        color: #7f1d1d;
      }
      .modal footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 22px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      /* MESSAGE PREVIEW MODAL SPECIFIC */
      .preview-recipient-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 12px;
      }
      .preview-content-area {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .preview-stats-footer {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        font-size: 11px;
        color: #64748b;
      }

      /* METRICS DASHBOARD */
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .metrics article {
        position: relative;
        overflow: hidden;
        padding: 18px;
        border: 1px solid #e2e8f0;
        border-radius: 11px;
        background: white;
      }
      .metrics span {
        display: block;
        color: #64748b;
        font-size: 11px;
        font-weight: 650;
      }
      .metrics b {
        display: block;
        margin-top: 6px;
        font-size: 24px;
        color: #0f172a;
      }
      .metrics i {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 6px;
        height: 100%;
        background: #94a3b8;
      }
      .metrics i.good { background: #16a34a; }
      .metrics i.bad { background: #dc2626; }
      .metrics i.blue { background: #2563eb; }
      .metrics i.orange { background: #d97706; }

      .grid.two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .chart {
        height: 250px;
        display: flex;
        align-items: flex-end;
        gap: 12px;
        padding: 20px;
      }
      .chart > div {
        height: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        gap: 5px;
      }
      .chart i {
        display: block;
        width: 80%;
        min-height: 4px;
        border-radius: 6px 6px 2px 2px;
        background: linear-gradient(#3b82f6, #1e3a8a);
      }
      .chart small { font-size: 9px; color: #64748b; }
      .chart b { font-size: 10px; color: #0f172a; }
      .activity > div {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px 18px;
        border-bottom: 1px solid #f1f5f9;
      }
      .activity p {
        min-width: 0;
        flex: 1;
        margin: 0;
        font-size: 12px;
        font-weight: 600;
      }
      .activity small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #64748b;
        font-weight: 400;
        font-size: 11px;
      }
      .activity time {
        font-size: 10px;
        color: #94a3b8;
      }

      /* TEMPLATES & SCHEDULES CARDS */
      .cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        padding: 18px;
      }
      .cards article {
        padding: 16px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: white;
      }
      .cards h4 {
        margin: 8px 0 6px;
        font-size: 13px;
        color: #0f172a;
      }
      .cards p {
        min-height: 52px;
        color: #475569;
        font-size: 11px;
        line-height: 1.5;
        margin: 0;
      }
      .cards footer {
        display: flex;
        gap: 8px;
        margin-top: 14px;
      }
      .tag-row {
        display: flex;
        gap: 6px;
      }
      .danger-link {
        color: #dc2626;
      }

      /* RESPONSIVE */
      @media (max-width: 1050px) {
        .history-metrics-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .metrics {
          grid-template-columns: repeat(2, 1fr);
        }
        .cards {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 750px) {
        .history-metrics-grid,
        .metrics,
        .grid.two,
        .cards,
        .form-grid {
          grid-template-columns: 1fr;
        }
        .page-head {
          flex-direction: column;
          align-items: flex-start;
        }
        .header-action-group {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class SmsManagementComponent implements OnInit, OnDestroy {
  tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'history', label: 'SMS History' },
    { key: 'send', label: 'Dir SMS' },
    { key: 'bulk-fee-reminder', label: 'Bulk Fee Reminder' },
    { key: 'templates', label: 'Templates' },
    { key: 'scheduled-sms', label: 'Jadwalka SMS' },
    { key: 'settings', label: 'Gateway Settings' },
  ];

  templateTypes = [
    'fee_created',
    'fee_reminder',
    'partial_payment',
    'payment_overdue',
    'payment_received',
    'general_announcement',
  ];

  statuses = ['queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'retrying'];

  statusFlow = [
    { key: 'queued', text: 'Saf ku jira' },
    { key: 'processing', text: 'Farsamaynta' },
    { key: 'sent', text: 'La diray' },
    { key: 'delivered', text: 'Waalidka gaartay' },
  ];

  variables = [
    '{school_name}',
    '{parent_name}',
    '{student_name}',
    '{admission_number}',
    '{class_name}',
    '{fee_type}',
    '{month}',
    '{year}',
    '{total_fee}',
    '{paid_amount}',
    '{amount_due}',
    '{remaining_amount}',
    '{due_date}',
    '{payment_status}',
    '{school_phone}',
  ];

  view = signal('dashboard');
  loading = signal(false);
  saving = signal(false);
  processingQueue = signal(false);
  testingProvider = signal(false);

  dashboard = signal<any>(null);
  refs = signal<any>({});
  recipients = signal<any[]>([]);
  selected = signal<Record<number, boolean>>({});
  preview = signal<any>(null);
  templates = signal<any[]>([]);
  history = signal<any[]>([]);
  historySummary = signal<any>(null);
  schedules = signal<any[]>([]);

  templateOpen = signal(false);
  scheduleOpen = signal(false);
  historyDetailOpen = signal(false);
  messagePreviewOpen = signal(false);

  activeHistoryItem = signal<any>(null);
  selectedMessagePreview = signal<any>(null);
  testResult = signal<any>(null);

  editingTemplateId = signal<number | null>(null);
  editingScheduleId = signal<number | null>(null);

  testPhoneInput = '';
  testMsgInput = '';

  private historyTimer?: ReturnType<typeof setInterval>;

  manualForm = new FormGroup({
    RecipientPhone: new FormControl('', Validators.required),
    MessageBody: new FormControl('', [Validators.required, Validators.maxLength(1500)]),
    ScheduledAt: new FormControl(''),
  });

  bulkForm = new FormGroup({
    AcademicYearId: new FormControl<any>(''),
    Month: new FormControl<any>(new Date().getMonth() + 1),
    Year: new FormControl<any>(new Date().getFullYear()),
    ClassId: new FormControl<any>(''),
    LevelId: new FormControl<any>(''),
    ShiftId: new FormControl<any>(''),
    FeeTypeId: new FormControl<any>(''),
    PaymentStatus: new FormControl('all_outstanding'),
    DueDate: new FormControl(''),
    ScheduledAt: new FormControl(''),
    SmsTemplateId: new FormControl<any>(''),
  });

  historyForm = new FormGroup({
    From: new FormControl(''),
    To: new FormControl(''),
    Status: new FormControl(''),
    Phone: new FormControl(''),
    Search: new FormControl(''),
  });

  templateForm = new FormGroup({
    TemplateName: new FormControl('', Validators.required),
    TemplateType: new FormControl('fee_reminder'),
    Language: new FormControl('so'),
    TemplateBody: new FormControl('', Validators.required),
    IsActive: new FormControl(true),
    IsDefault: new FormControl(false),
  });

  scheduleForm = new FormGroup({
    Name: new FormControl('Monthly fee reminder'),
    IsEnabled: new FormControl(true),
    DayOfMonth: new FormControl(1),
    SendTime: new FormControl('08:00'),
    Timezone: new FormControl('Africa/Mogadishu'),
    SmsTemplateId: new FormControl<any>(''),
    NumberOfReminders: new FormControl(1),
    DaysBetweenReminders: new FormControl(7),
    SkipWeekends: new FormControl(true),
    CombineSiblings: new FormControl(true),
    BatchSize: new FormControl(50),
    MaximumAttempts: new FormControl(3),
  });

  settingsForm = new FormGroup({
    ProviderName: new FormControl('Generic SMS'),
    ProviderType: new FormControl('generic_http'),
    SenderId: new FormControl('MADAARIS'),
    ApiUrl: new FormControl(''),
    ApiKey: new FormControl(''),
    ApiSecret: new FormControl(''),
    IsActive: new FormControl(true),
    IsLive: new FormControl(false),
    AutomaticRemindersEnabled: new FormControl(true),
    ReminderDay: new FormControl(1),
    ReminderTime: new FormControl('08:00'),
    Timezone: new FormControl('Africa/Mogadishu'),
    CombineSiblings: new FormControl(true),
    BatchSize: new FormControl(50),
    MaximumAttempts: new FormControl(3),
    EstimatedSegmentCost: new FormControl<any>(null),
    CredentialsConfigured: new FormControl(false),
    SecretConfigured: new FormControl(false),
  });

  previewMessages = computed(() => (this.preview()?.Messages || []).slice(0, 9));
  selectedCount = computed(() => Object.values(this.selected()).filter(Boolean).length);
  eligibleCount = computed(() => this.recipients().filter((x) => x.SmsEligible).length);
  allSelected = computed(
    () =>
      !!this.recipients().length &&
      this.recipients()
        .filter((x) => x.SmsEligible)
        .every((x) => this.selected()[x.InvoiceId]),
  );

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private dialog: DialogService,
  ) {}

  ngOnInit() {
    this.route.data.subscribe((data) => {
      this.view.set(data['smsView'] || 'dashboard');
      this.loadView();
    });

    this.api.get<any>('/sms/references').subscribe({
      next: (r) => {
        this.refs.set(r.data);
        const feeTemplate =
          r.data.Templates?.find((x: any) => x.TemplateType === 'fee_reminder' && x.IsDefault) ||
          r.data.Templates?.find((x: any) => x.TemplateType === 'fee_reminder');
        this.bulkForm.patchValue({
          AcademicYearId: '',
          Month: '',
          Year: '',
          ClassId: '',
          LevelId: '',
          ShiftId: '',
          FeeTypeId: '',
          PaymentStatus: 'all_outstanding',
          DueDate: '',
          ScheduledAt: '',
          SmsTemplateId: feeTemplate?.SmsTemplateId || '',
        });
        this.scheduleForm.patchValue({ SmsTemplateId: feeTemplate?.SmsTemplateId || '' });
        if (this.view() === 'bulk-fee-reminder') this.loadRecipients();
      },
    });

    this.historyTimer = setInterval(() => {
      if (this.view() === 'history') {
        this.loadHistorySilent();
      }
    }, 15000);
  }

  ngOnDestroy() {
    if (this.historyTimer) clearInterval(this.historyTimer);
  }

  title() {
    return (
      {
        dashboard: 'SMS Dashboard',
        send: 'Dir SMS',
        'bulk-fee-reminder': 'Bulk Fee Reminder',
        templates: 'SMS Templates',
        'scheduled-sms': 'Scheduled SMS',
        history: 'SMS History',
        settings: 'SMS Gateway & Settings',
      }[this.view()] || 'SMS Management'
    );
  }

  switchView(key: string) {
    const routeMap: Record<string, string> = {
      dashboard: '/sms/dashboard',
      send: '/sms/send',
      'bulk-fee-reminder': '/sms/bulk-fee-reminder',
      templates: '/sms/templates',
      'scheduled-sms': '/sms/scheduled-sms',
      history: '/sms/history',
      settings: '/sms/settings',
    };
    if (routeMap[key]) {
      this.router.navigate([routeMap[key]]);
    } else {
      this.view.set(key);
      this.loadView();
    }
  }

  loadView() {
    const v = this.view();
    if (v === 'dashboard') this.loadDashboard();
    if (v === 'templates') this.loadTemplates();
    if (v === 'history') {
      this.loadHistory();
      this.loadHistorySummary();
    }
    if (v === 'scheduled-sms') this.loadSchedules();
    if (v === 'settings') this.loadSettings();
  }

  loadDashboard() {
    this.loading.set(true);
    this.api.get<any>('/sms/dashboard').subscribe({
      next: (r) => {
        this.dashboard.set(r.data);
        this.loading.set(false);
      },
      error: (e) => this.fail(e),
    });
  }

  metricCards() {
    const d = this.dashboard();
    if (!d) return [];
    return [
      { label: 'Wadarta SMS la diray', value: d.TotalSms, tone: 'good' },
      { label: 'Maanta la diray', value: d.SentToday, tone: 'blue' },
      { label: 'Safka ku jira', value: d.Pending, tone: 'orange' },
      { label: 'Fashilmay', value: d.Failed, tone: 'bad' },
    ];
  }

  usageHeight(val: number) {
    const max = Math.max(...(this.dashboard()?.Usage || []).map((x: any) => x.Total), 1);
    return Math.max(8, Math.round((val / max) * 100));
  }

  segments(text: string) {
    const len = text.length;
    if (!len) return 0;
    return len <= 160 ? 1 : Math.ceil(len / 153);
  }

  sendManual() {
    if (this.manualForm.invalid) return;
    this.saving.set(true);
    this.api.post<any>('/sms/send', this.manualForm.getRawValue()).subscribe({
      next: (r) => {
        this.toast.show(r.message || 'Fariinta waa la diray.');
        this.saving.set(false);
        this.manualForm.reset();
        this.switchView('history');
      },
      error: (e) => this.fail(e),
    });
  }

  loadRecipients() {
    this.loading.set(true);
    this.api
      .get<any>(
        '/sms/eligible-recipients',
        Object.fromEntries(
          Object.entries(this.bulkForm.getRawValue())
            .filter(([, v]) => v !== '' && v !== null)
            .map(([k, v]) => [k, String(v)]),
        ),
      )
      .subscribe({
        next: (r) => {
          this.recipients.set(r.data);
          const sel: Record<number, boolean> = {};
          r.data.forEach((x: any) => {
            if (x.SmsEligible) sel[x.InvoiceId] = true;
          });
          this.selected.set(sel);
          this.loading.set(false);
          this.preview.set(null);
        },
        error: (e) => this.fail(e),
      });
  }

  selectAll(flag: boolean) {
    const sel: Record<number, boolean> = {};
    if (flag) {
      this.recipients().forEach((x) => {
        if (x.SmsEligible) sel[x.InvoiceId] = true;
      });
    }
    this.selected.set(sel);
  }

  toggleAll(e: Event) {
    this.selectAll((e.target as HTMLInputElement).checked);
  }

  toggleRow(id: number) {
    this.selected.update((s) => ({ ...s, [id]: !s[id] }));
  }

  generatePreview() {
    const ids = Object.entries(this.selected())
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    this.loading.set(true);
    this.api
      .post<any>('/sms/preview', {
        ...this.bulkForm.getRawValue(),
        InvoiceIds: ids,
        CombineSiblings: true,
        Filters: this.bulkForm.getRawValue(),
      })
      .subscribe({
        next: (r) => {
          this.preview.set(r.data);
          this.loading.set(false);
        },
        error: (e) => this.fail(e),
      });
  }

  sendBulk() {
    const ids = Object.entries(this.selected())
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    this.saving.set(true);
    this.api
      .post<any>('/sms/send-bulk-fee-reminders', {
        ...this.bulkForm.getRawValue(),
        InvoiceIds: ids,
        CombineSiblings: true,
        Filters: this.bulkForm.getRawValue(),
      })
      .subscribe({
        next: (r) => {
          this.toast.show(r.message || 'Fariimihii waa la diray.');
          this.saving.set(false);
          this.preview.set(null);
          this.switchView('history');
        },
        error: (e) => this.fail(e),
      });
  }

  loadTemplates() {
    this.api.get<any>('/sms/templates').subscribe({
      next: (r) => this.templates.set(r.data),
      error: (e) => this.fail(e),
    });
  }

  openTemplateModal() {
    this.editingTemplateId.set(null);
    this.templateForm.reset({
      TemplateName: '',
      TemplateType: 'fee_reminder',
      Language: 'so',
      TemplateBody: '',
      IsActive: true,
      IsDefault: false,
    });
    this.templateOpen.set(true);
  }

  editTemplate(t: any) {
    this.editingTemplateId.set(t.SmsTemplateId);
    this.templateForm.patchValue(t);
    this.templateOpen.set(true);
  }

  insertVariable(v: string) {
    const cur = this.templateForm.controls.TemplateBody.value || '';
    this.templateForm.controls.TemplateBody.setValue(cur + (cur ? ' ' : '') + v);
  }

  templatePreview() {
    const tpl = this.templateForm.controls.TemplateBody.value || '';
    return tpl
      .replace('{school_name}', 'Al-Huda School')
      .replace('{parent_name}', 'Ahmed Cali')
      .replace('{student_name}', 'Cumar Ahmed')
      .replace('{admission_number}', 'STD-1002')
      .replace('{class_name}', 'Fasalka 1aad')
      .replace('{fee_type}', 'Bisha')
      .replace('{month}', 'September')
      .replace('{year}', '2026')
      .replace('{total_fee}', '$30.00')
      .replace('{paid_amount}', '$0.00')
      .replace('{amount_due}', '$30.00')
      .replace('{remaining_amount}', '$30.00')
      .replace('{due_date}', '10/09/2026')
      .replace('{payment_status}', 'Maqan')
      .replace('{school_phone}', '0615000000');
  }

  saveTemplate() {
    if (this.templateForm.invalid) return;
    const id = this.editingTemplateId();
    const req = id
      ? this.api.put<any>(`/sms/templates/${id}`, this.templateForm.getRawValue())
      : this.api.post<any>('/sms/templates', this.templateForm.getRawValue());
    req.subscribe({
      next: (r) => {
        this.toast.show(r.message);
        this.templateOpen.set(false);
        this.loadTemplates();
        this.refreshRefs();
      },
      error: (e) => this.fail(e),
    });
  }

  async deleteTemplate(t: any) {
    if (!(await this.dialog.confirm('Tirtir template', `Ma tirtirtaa ${t.TemplateName}?`, true)))
      return;
    this.api.delete<any>(`/sms/templates/${t.SmsTemplateId}`).subscribe({
      next: (r) => {
        this.toast.show(r.message);
        this.loadTemplates();
        this.refreshRefs();
      },
      error: (e) => this.fail(e),
    });
  }

  loadSchedules() {
    this.api.get<any>('/sms/schedules').subscribe({
      next: (r) => this.schedules.set(r.data),
      error: (e) => this.fail(e),
    });
  }

  openScheduleModal() {
    this.editingScheduleId.set(null);
    this.scheduleForm.reset({
      Name: 'Monthly fee reminder',
      IsEnabled: true,
      DayOfMonth: 1,
      SendTime: '08:00',
      Timezone: 'Africa/Mogadishu',
      SmsTemplateId: this.refs().Templates?.[0]?.SmsTemplateId || '',
      NumberOfReminders: 1,
      DaysBetweenReminders: 7,
      SkipWeekends: true,
      CombineSiblings: true,
      BatchSize: 50,
      MaximumAttempts: 3,
    });
    this.scheduleOpen.set(true);
  }

  editSchedule(s: any) {
    this.editingScheduleId.set(s.SmsScheduleId);
    this.scheduleForm.patchValue({
      ...s,
      SendTime: String(s.SendTime || '08:00').slice(0, 5),
    });
    this.scheduleOpen.set(true);
  }

  saveSchedule() {
    if (this.scheduleForm.invalid) return;
    const id = this.editingScheduleId();
    const req = id
      ? this.api.put<any>(`/sms/schedules/${id}`, this.scheduleForm.getRawValue())
      : this.api.post<any>('/sms/schedules', this.scheduleForm.getRawValue());
    req.subscribe({
      next: (r) => {
        this.toast.show(r.message);
        this.scheduleOpen.set(false);
        this.loadSchedules();
      },
      error: (e) => this.fail(e),
    });
  }

  async deleteSchedule(row: any) {
    if (!(await this.dialog.confirm('Tirtir jadwalka', `Ma tirtirtaa ${row.Name}?`, true))) return;
    this.api.delete<any>(`/sms/schedules/${row.SmsScheduleId}`).subscribe({
      next: (r) => {
        this.toast.show(r.message);
        this.loadSchedules();
      },
      error: (e) => this.fail(e),
    });
  }

  // =========================================================================
  // SMS HISTORY METHODS (ENHANCED)
  // =========================================================================
  loadHistory() {
    this.api
      .get<any>(
        '/sms/history',
        Object.fromEntries(
          Object.entries(this.historyForm.getRawValue())
            .filter(([, v]) => v !== '' && v !== null)
            .map(([k, v]) => [k, String(v)]),
        ),
      )
      .subscribe({
        next: (r) => {
          this.history.set(r.data);
          this.loadHistorySummary();
        },
        error: (e) => this.fail(e),
      });
  }

  loadHistorySilent() {
    this.api
      .get<any>(
        '/sms/history',
        Object.fromEntries(
          Object.entries(this.historyForm.getRawValue())
            .filter(([, v]) => v !== '' && v !== null)
            .map(([k, v]) => [k, String(v)]),
        ),
      )
      .subscribe({
        next: (r) => {
          this.history.set(r.data);
          this.loadHistorySummary();
        },
      });
  }

  loadHistorySummary() {
    this.api.get<any>('/sms/history-summary').subscribe({
      next: (r) => this.historySummary.set(r.data),
      error: () => {},
    });
  }

  filterByStatus(statusKey: string) {
    if (this.historyForm.controls.Status.value === statusKey) {
      this.historyForm.patchValue({ Status: '' });
    } else {
      this.historyForm.patchValue({ Status: statusKey });
    }
    this.loadHistory();
  }

  resetHistoryFilters() {
    this.historyForm.reset({
      From: '',
      To: '',
      Status: '',
      Phone: '',
      Search: '',
    });
    this.loadHistory();
  }

  processAllQueue() {
    this.processingQueue.set(true);
    this.api.post<any>('/sms/queue/process-all', {}).subscribe({
      next: (r) => {
        this.processingQueue.set(false);
        this.toast.show(r.message || 'Farsamayntii safku waa dhammaatay.');
        this.loadHistory();
      },
      error: (e) => {
        this.processingQueue.set(false);
        this.fail(e);
      },
    });
  }

  sendNow(row: any) {
    this.api.post<any>(`/sms/${row.SmsLogId}/send-now`, {}).subscribe({
      next: (r) => {
        this.toast.show(r.message || 'Fariinta si toos ah ayaa loo diray.');
        this.loadHistory();
      },
      error: (e) => this.fail(e),
    });
  }

  statusLabel(status: string) {
    return (
      {
        queued: 'Saf ku jira',
        processing: 'Waa la dirayaa…',
        sent: 'La diray',
        delivered: 'Gaartay',
        retrying: 'Dib loo tijaabinayaa',
        failed: 'Fashilantay',
        cancelled: 'La joojiyey',
      } as Record<string, string>
    )[status] || status;
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      fee_reminder: 'Xusuusin Lacag',
      individual_fee_reminder: 'Xusuusin Gaar ah',
      bulk_fee_reminder: 'Xusuusin Wadareed',
      scheduled_fee_reminder: 'Jadwal Lacag',
      general_announcement: 'Ogeysiis Guud',
      manual: 'Gacanta',
      fee_created: 'Bixinta Lacag',
      payment_received: 'Lacag La Helay',
    };
    return map[type] || type || 'Fariin';
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

  copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      this.toast.show(`Waa la koobiyeeyay: ${text}`);
    });
  }

  showStatus(row: any) {
    this.api.get<any>(`/sms/history/${row.SmsLogId}`).subscribe({
      next: (r) => {
        this.activeHistoryItem.set(r.data);
        this.historyDetailOpen.set(true);
      },
      error: (e) => this.fail(e),
    });
  }

  openMessagePreview(row: any) {
    this.selectedMessagePreview.set(row);
    this.messagePreviewOpen.set(true);
  }

  retry(row: any) {
    const qId = row.SmsQueueId || row.SmsLogId;
    this.api.post<any>(`/sms/${qId}/retry`, {}).subscribe({
      next: (r) => {
        this.toast.show(r.message || 'Fariintii dib ayaa loo diray.');
        this.loadHistory();
      },
      error: (e) => this.fail(e),
    });
  }

  async resend(row: any) {
    const reason = await this.dialog.prompt('Sababta dib-u-dirista fariintan:');
    if (!reason) return;
    this.api.post<any>(`/sms/${row.SmsLogId}/resend`, { Reason: reason }).subscribe({
      next: (r) => {
        this.toast.show(r.message || 'Fariinta dib ayaa loo diray.');
        this.loadHistory();
      },
      error: (e) => this.fail(e),
    });
  }

  exportHistory() {
    const rows = [
      ['Ref', 'Arday', 'Waalid', 'Telefoon', 'Nooca', 'Xaalad', 'Isku-dayada', 'La Diray', 'Fariinta'],
      ...this.history().map((x) => [
        x.SmsLogId,
        x.StudentName || '',
        x.ParentName || '',
        x.RecipientPhone,
        x.MessageType,
        x.Status,
        x.Attempts || 0,
        x.SentAt || x.CreatedAt || '',
        x.MessageBody || '',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `madaaris-sms-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // =========================================================================
  // SMS SETTINGS METHODS (ENHANCED)
  // =========================================================================
  loadSettings() {
    this.api.get<any>('/sms/settings').subscribe({
      next: (r) => {
        if (r.data) {
          this.settingsForm.patchValue({
            ...r.data,
            ApiKey: '',
            ApiSecret: '',
            ReminderTime: String(r.data.ReminderTime || '08:00').slice(0, 5),
          });
        }
      },
      error: (e) => this.fail(e),
    });
  }

  toggleLiveMode() {
    const cur = this.settingsForm.controls.IsLive.value;
    this.settingsForm.patchValue({ IsLive: !cur });
  }

  saveSettings() {
    const v: any = this.settingsForm.getRawValue();
    delete v.CredentialsConfigured;
    delete v.SecretConfigured;
    if (!v.ApiKey) delete v.ApiKey;
    if (!v.ApiSecret) delete v.ApiSecret;
    this.saving.set(true);
    this.api.put<any>('/sms/settings', v).subscribe({
      next: (r) => {
        this.toast.show(r.message || 'Dejimaha SMS-ka waa la kaydiyay.');
        this.saving.set(false);
        this.loadSettings();
      },
      error: (e) => this.fail(e),
    });
  }

  runTestSms() {
    if (!this.testPhoneInput.trim()) {
      this.toast.show('Fadlan geli lambarka taleefanka aad u dirayso tijaabada.', 'error');
      return;
    }
    this.testingProvider.set(true);
    this.testResult.set(null);
    this.api
      .post<any>('/sms/provider/test', {
        RecipientPhone: this.testPhoneInput.trim(),
        Message: this.testMsgInput.trim() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.testingProvider.set(false);
          this.testResult.set({
            success: true,
            message: r.message,
            providerId: r.data?.ProviderId,
          });
          this.toast.show(r.message || 'Fariinta tijaabada ah si guul leh ayaa loo diray.');
          this.loadHistory();
        },
        error: (e) => {
          this.testingProvider.set(false);
          const err = e.error?.message || e.message || 'Dirista tijaabada waa lagu guuldareystay.';
          this.testResult.set({
            success: false,
            message: err,
          });
          this.toast.show(err, 'error');
        },
      });
  }

  refreshRefs() {
    this.api.get<any>('/sms/references').subscribe((r) => this.refs.set(r.data));
  }

  fail(e: any) {
    this.loading.set(false);
    this.saving.set(false);
    const errors = e.error?.errors;
    this.toast.show(
      errors ? Object.values(errors).flat().join(' ') : e.error?.message || 'Waxbaa khaldamay.',
      'error',
    );
  }
}
