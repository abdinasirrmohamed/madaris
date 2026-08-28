import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<header class="page">
      <div>
        <p>ISLAMIC / QUR'AN</p>
        <h1>Qur'an learning</h1>
        <span>Assignments, memorization assessments, mistakes and progress.</span>
      </div>
      <button (click)="openAssign()">＋ Assign lesson</button>
    </header>
    <nav>
      <button
        [class.active]="tab() === 'assignments'"
        (click)="tab.set('assignments'); loadAssignments()"
      >
        Assignments</button
      ><button [class.active]="tab() === 'progress'" (click)="tab.set('progress'); loadProgress()">
        Progress report</button
      ><button [class.active]="tab() === 'mistakes'" (click)="tab.set('mistakes'); loadMistakes()">
        Mistake analysis</button
      ><button [class.active]="tab() === 'surahs'" (click)="tab.set('surahs')">Surah list</button>
    </nav>
    @if (message()) {
      <p class="notice">{{ message() }}</p>
    }
    @if (tab() === 'assignments') {
      <section class="filters">
        <label
          >Status<select [formControl]="status">
            <option value="">All statuses</option>
            <option>Assigned</option>
            <option>In progress</option>
            <option>Completed</option>
            <option>Needs revision</option>
            <option>Cancelled</option>
          </select></label
        ><button (click)="loadAssignments()">Filter</button>
      </section>
      <section class="card">
        @if (!assignments().length) {
          <div class="empty">No Qur'an assignments found.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Lesson</th>
                <th>Range</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (a of assignments(); track a.QuranAssignmentId) {
                <tr>
                  <td>
                    <b>{{ a.FirstName }} {{ a.LastName }}</b
                    ><small>{{ a.AdmissionNo }}</small>
                  </td>
                  <td>{{ a.LessonType }}</td>
                  <td>Surah {{ a.SurahNo }}, {{ a.FromAyah }}–{{ a.ToAyah }}</td>
                  <td>{{ a.DueDate }}</td>
                  <td>
                    <select [value]="a.Status" (change)="changeStatus(a, $event)">
                      <option>Assigned</option>
                      <option>In progress</option>
                      <option>Completed</option>
                      <option>Needs revision</option>
                      <option>Cancelled</option>
                    </select>
                  </td>
                  <td><button class="assess" (click)="openAssessment(a)">Assess</button></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    } @else if (tab() === 'progress') {
      <section class="card">
        @if (!progress().length) {
          <div class="empty">No assessments have been recorded.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Surah / ayahs</th>
                <th>Accuracy</th>
                <th>Fluency</th>
                <th>Tajweed</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              @for (r of progress(); track r.QuranAssessmentId) {
                <tr>
                  <td>{{ r.AssessmentDate }}</td>
                  <td>
                    <b>{{ r.FirstName }} {{ r.LastName }}</b
                    ><small>{{ r.AdmissionNo }}</small>
                  </td>
                  <td>{{ r.SurahNo }} · {{ r.FromAyah }}–{{ r.ToAyah }}</td>
                  <td>{{ r.AccuracyScore }}%</td>
                  <td>{{ r.FluencyScore }}%</td>
                  <td>{{ r.TajweedScore }}%</td>
                  <td>
                    <span class="outcome" [class.fail]="r.Outcome !== 'Passed'">{{
                      r.Outcome
                    }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    } @else if (tab() === 'mistakes') {
      <section class="card">
        @if (!mistakes().length) {
          <div class="empty">No recitation mistakes have been recorded.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Mistake type</th>
                <th>Occurrences</th>
                <th>Assessments affected</th>
              </tr>
            </thead>
            <tbody>
              @for (m of mistakes(); track m.MistakeType) {
                <tr>
                  <td>
                    <b>{{ m.MistakeType }}</b>
                  </td>
                  <td>{{ m.Occurrences }}</td>
                  <td>{{ m.Assessments }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    } @else {
      <section class="surah-grid">
        @for (surah of surahs(); track surah.SurahId) {
          <article>
            <strong>{{ surah.SurahId }}</strong>
            <div>
              <b>{{ surah.NameEnglish }}</b
              ><small>{{ surah.TotalAyahs }} ayahs</small>
            </div>
          </article>
        }
      </section>
    }
    @if (drawer()) {
      <aside class="drawer">
        <header>
          <div>
            <small>{{
              drawer() === 'assign' ? 'NEW ASSIGNMENT' : 'MEMORIZATION ASSESSMENT'
            }}</small>
            <h2>
              {{
                drawer() === 'assign' ? 'Assign Qur’an lesson' : 'Assess ' + selected()?.FirstName
              }}
            </h2>
          </div>
          <button (click)="drawer.set(null)">×</button>
        </header>
        @if (drawer() === 'assign') {
          <form [formGroup]="assignForm" (ngSubmit)="saveAssignment()">
            <label
              >Student<select formControlName="StudentId">
                @for (s of students(); track s.StudentId) {
                  <option [value]="s.StudentId">
                    {{ s.AdmissionNo }} · {{ s.FirstName }} {{ s.LastName }}
                  </option>
                }
              </select></label
            ><label
              >Branch<select formControlName="BranchId">
                @for (b of branches(); track b.BranchId) {
                  <option [value]="b.BranchId">{{ b.Name }}</option>
                }
              </select></label
            ><label
              >Lesson type<select formControlName="LessonType">
                <option>Farbar</option>
                <option>Subac</option>
                <option>Dareeris</option>
                <option>Revision</option>
                <option>New lesson</option>
              </select></label
            >
            <div class="triple">
              <label
                >Surah<select formControlName="SurahNo" (change)="surahChanged()">
                  @for (surah of surahs(); track surah.SurahId) {
                    <option [value]="surah.SurahId">
                      {{ surah.SurahId }} · {{ surah.NameEnglish }}
                    </option>
                  }
                </select></label
              ><label>From ayah<input type="number" min="1" formControlName="FromAyah" /></label
              ><label>To ayah<input type="number" min="1" formControlName="ToAyah" /></label>
            </div>
            <div class="pair">
              <label>Assigned date<input type="date" formControlName="AssignedDate" /></label
              ><label>Due date<input type="date" formControlName="DueDate" /></label>
            </div>
            <label
              >Repetition target<input
                type="number"
                min="1"
                formControlName="RepetitionTarget" /></label
            ><label>Notes<textarea formControlName="Notes"></textarea></label
            ><button class="primary">Create assignment</button>
          </form>
        } @else {
          <form [formGroup]="assessmentForm" (ngSubmit)="saveAssessment()">
            <label>Assessment date<input type="date" formControlName="AssessmentDate" /></label>
            <div class="triple">
              <label
                >Accuracy %<input
                  type="number"
                  min="0"
                  max="100"
                  formControlName="AccuracyScore" /></label
              ><label
                >Fluency %<input
                  type="number"
                  min="0"
                  max="100"
                  formControlName="FluencyScore" /></label
              ><label
                >Tajweed %<input type="number" min="0" max="100" formControlName="TajweedScore"
              /></label>
            </div>
            <label
              >Outcome<select formControlName="Outcome">
                <option>Passed</option>
                <option>Needs revision</option>
                <option>Failed</option>
              </select></label
            ><label>Teacher notes<textarea formControlName="TeacherNotes"></textarea></label>
            <h3>Recitation mistake <small>(optional)</small></h3>
            <div class="pair">
              <label>Exact ayah<input type="number" formControlName="MistakeAyah" /></label
              ><label
                >Mistake type<select formControlName="MistakeType">
                  <option value="">None</option>
                  @for (m of mistakeTypes; track m) {
                    <option>{{ m }}</option>
                  }
                </select></label
              >
            </div>
            <label
              >Occurrence count<input
                type="number"
                min="1"
                formControlName="OccurrenceCount" /></label
            ><button class="primary">Save assessment</button>
          </form>
        }
      </aside>
    }`,
  styles: [
    `
      :host {
        display: block;
      }
      .page {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .page p {
        margin: 0;
        color: #1554a1;
        font-size: 10px;
        font-weight: 800;
      }
      .page h1 {
        margin: 5px 0;
      }
      .page span {
        color: #758392;
        font-size: 12px;
      }
      .page > button,
      .primary {
        background: #211e75;
        color: white;
        border: 0;
        border-radius: 7px;
        padding: 11px 15px;
      }
      nav {
        display: flex;
        gap: 5px;
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 6px;
        margin: 18px 0 10px;
      }
      nav button {
        border: 0;
        background: none;
        padding: 9px 14px;
        color: #687887;
      }
      nav .active {
        background: #211e75;
        color: white;
        border-radius: 6px;
      }
      .filters {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
      }
      .filters label {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 9px;
      }
      .filters select {
        padding: 8px;
        border: 1px solid #d6e0e8;
        border-radius: 6px;
      }
      .filters button {
        background: #15549c;
        color: white;
        border: 0;
        border-radius: 6px;
        padding: 8px 12px;
      }
      .card {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        overflow: auto;
        min-height: 340px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #edf1f4;
        font-size: 10px;
      }
      th {
        font-size: 8px;
        color: #748391;
        background: #f8fafc;
      }
      td small {
        display: block;
        color: #7b8792;
      }
      td select {
        border: 1px solid #d5e0e8;
        border-radius: 12px;
        padding: 5px;
        font-size: 9px;
      }
      .assess {
        border: 0;
        background: #e8f1fb;
        color: #15549c;
        border-radius: 6px;
        padding: 7px 9px;
      }
      .outcome {
        background: #e4f7ef;
        color: #147b55;
        border-radius: 12px;
        padding: 5px 8px;
      }
      .outcome.fail {
        background: #fff0e8;
        color: #b64d18;
      }
      .empty {
        height: 280px;
        display: grid;
        place-items: center;
        color: #758392;
      }
      .drawer {
        position: fixed;
        right: 0;
        top: 44px;
        bottom: 0;
        width: min(520px, 100%);
        background: white;
        z-index: 20;
        box-shadow: -10px 0 30px #17324c2d;
        overflow: auto;
      }
      .drawer > header {
        display: flex;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e1e8ee;
      }
      .drawer h2 {
        margin: 4px 0;
      }
      .drawer header small {
        color: #15549c;
        font-weight: 800;
      }
      .drawer header button {
        border: 0;
        background: none;
        font-size: 26px;
      }
      .drawer form {
        padding: 20px;
      }
      .drawer label {
        display: grid;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .drawer input,
      .drawer select,
      .drawer textarea {
        border: 1px solid #d6e0e8;
        border-radius: 7px;
        padding: 10px;
      }
      .drawer textarea {
        min-height: 60px;
      }
      .pair,
      .triple {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 9px;
      }
      .triple {
        grid-template-columns: repeat(3, 1fr);
      }
      .primary {
        width: 100%;
      }
      .notice {
        background: #e5f7ee;
        color: #147a54;
        padding: 10px;
        border-radius: 7px;
      }
      .surah-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 8px;
      }
      .surah-grid article {
        display: flex;
        align-items: center;
        gap: 10px;
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 10px;
      }
      .surah-grid strong {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #211e75;
        color: white;
        font-size: 10px;
      }
      .surah-grid b,
      .surah-grid small {
        display: block;
        font-size: 10px;
      }
      .surah-grid small {
        color: #788693;
        margin-top: 3px;
      }
      @media (max-width: 700px) {
        .pair,
        .triple {
          grid-template-columns: 1fr;
        }
        .drawer {
          top: 0;
        }
      }
    `,
  ],
})
export class QuranComponent implements OnInit {
  tab = signal('assignments');
  drawer = signal<'assign' | 'assess' | null>(null);
  assignments = signal<any[]>([]);
  progress = signal<any[]>([]);
  mistakes = signal<any[]>([]);
  surahs = signal<any[]>([]);
  students = signal<any[]>([]);
  branches = signal<any[]>([]);
  selected = signal<any>(null);
  message = signal('');
  status = new FormControl('');
  mistakeTypes = [
    'Tajweed',
    'Makhraj',
    'Harakah',
    'Omission',
    'Addition',
    'Hesitation',
    'Sequence',
    'Other',
  ];
  today = new Date().toISOString().slice(0, 10);
  assignForm = new FormGroup({
    BranchId: new FormControl<any>(''),
    StudentId: new FormControl<any>('', Validators.required),
    LessonType: new FormControl('New lesson'),
    SurahNo: new FormControl(1),
    FromAyah: new FormControl(1),
    ToAyah: new FormControl(7),
    AssignedDate: new FormControl(this.today),
    DueDate: new FormControl(this.today),
    RepetitionTarget: new FormControl(3),
    Notes: new FormControl(''),
  });
  assessmentForm = new FormGroup({
    AssessmentDate: new FormControl(this.today),
    AccuracyScore: new FormControl(100),
    FluencyScore: new FormControl(100),
    TajweedScore: new FormControl(100),
    Outcome: new FormControl('Passed'),
    TeacherNotes: new FormControl(''),
    MistakeAyah: new FormControl<any>(''),
    MistakeType: new FormControl(''),
    OccurrenceCount: new FormControl(1),
  });
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.loadAssignments();
    this.api.get<any>('/quran/surahs').subscribe((r) => this.surahs.set(r.data));
    this.api.get<any>('/students', { per_page: '100' }).subscribe((r) => this.students.set(r.data));
    this.api.get<any>('/branches').subscribe((r) => {
      this.branches.set(r.data);
      this.assignForm.patchValue({ BranchId: r.data[0]?.BranchId });
    });
  }
  loadAssignments() {
    const p: any = {};
    if (this.status.value) p.Status = this.status.value;
    this.api.get<any>('/quran/assignments', p).subscribe((r) => this.assignments.set(r.data));
  }
  loadProgress() {
    this.api.get<any>('/quran/reports/progress').subscribe((r) => this.progress.set(r.data));
  }
  loadMistakes() {
    this.api.get<any>('/quran/reports/mistakes').subscribe((r) => this.mistakes.set(r.data));
  }
  surahChanged() {
    const surah = this.surahs().find((row) => row.SurahId == this.assignForm.value.SurahNo);
    if (surah && Number(this.assignForm.value.ToAyah) > surah.TotalAyahs) {
      this.assignForm.patchValue({ ToAyah: surah.TotalAyahs });
    }
  }
  openAssign() {
    this.drawer.set('assign');
  }
  saveAssignment() {
    const v: any = this.assignForm.getRawValue();
    this.api
      .post<any>('/quran/assignments', {
        ...v,
        BranchId: Number(v.BranchId),
        StudentId: Number(v.StudentId),
      })
      .subscribe((r) => {
        this.message.set(r.message);
        this.drawer.set(null);
        this.loadAssignments();
      });
  }
  changeStatus(a: any, e: Event) {
    this.api
      .put<any>(`/quran/assignments/${a.QuranAssignmentId}/status`, {
        Status: (e.target as HTMLSelectElement).value,
      })
      .subscribe((r) => this.message.set(r.message));
  }
  openAssessment(a: any) {
    this.selected.set(a);
    this.drawer.set('assess');
  }
  saveAssessment() {
    const v: any = this.assessmentForm.getRawValue();
    const mistakes = v.MistakeType
      ? [
          {
            AyahNo: Number(v.MistakeAyah),
            MistakeType: v.MistakeType,
            OccurrenceCount: Number(v.OccurrenceCount),
          },
        ]
      : [];
    this.api
      .post<any>(`/quran/assignments/${this.selected().QuranAssignmentId}/assessments`, {
        AssessmentDate: v.AssessmentDate,
        AccuracyScore: Number(v.AccuracyScore),
        FluencyScore: Number(v.FluencyScore),
        TajweedScore: Number(v.TajweedScore),
        Outcome: v.Outcome,
        TeacherNotes: v.TeacherNotes,
        Mistakes: mistakes,
      })
      .subscribe((r) => {
        this.message.set(r.message);
        this.drawer.set(null);
        this.loadAssignments();
      });
  }
}
