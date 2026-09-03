import { Injectable, signal } from '@angular/core';

export type AppLanguage = 'so' | 'en' | 'ar';
type Dictionary = Record<string, [string, string]>;

// English source → [Somali, Arabic]. Dynamic names and user-entered data are intentionally untouched.
const words: Dictionary = {
  'Home':['Bogga Hore','الرئيسية'],'Academic':['Waxbarashada','الشؤون الأكاديمية'],'Students':['Ardayda','الطلاب'],'HRM':['Shaqaalaha','الموارد البشرية'],'Examinations':['Imtixaannada','الامتحانات'],'Attendance':['Xaadirinta','الحضور'],'Islamic / Qur’an':['Qur’aanka','القرآن الكريم'],'Finance':['Maaliyadda','المالية'],'Accounts':['Xisaabaadka','الحسابات'],'Users':['Isticmaalayaasha','المستخدمون'],'Reports':['Warbixinnada','التقارير'],'Settings':['Dejimaha','الإعدادات'],'Logout':['Ka bax','تسجيل الخروج'],
  'Academic Years':['Sannad-dugsiyeedyada','السنوات الدراسية'],'Timetables':['Jadwallada','الجداول'],'Levels':['Heerarka','المستويات'],'Subjects':['Maadooyinka','المواد'],'Lessons':['Casharrada','الدروس'],'Classes':['Fasallada','الفصول'],'Class Promotions':['Dallacsiinta Fasallada','ترقية الفصول'],'Graduations':['Qalin-jabinta','التخرج'],'Shifts':['Wakhtiyada','الفترات'],'All Students':['Dhammaan Ardayda','جميع الطلاب'],'Add Student':['Diiwaangeli Arday','إضافة طالب'],'Graduation':['Qalin-jabin','التخرج'],'Inactive Students':['Ardayda Aan Firfircoonayn','الطلاب غير النشطين'],'Discipline':['Anshaxa','الانضباط'],'Parents / Guardians':['Waalidiinta','أولياء الأمور'],
  'Employees':['Shaqaalaha','الموظفون'],'Employee Attendance':['Xaadirinta Shaqaalaha','حضور الموظفين'],'Attendance Reports':['Warbixinnada Xaadirinta','تقارير الحضور'],'Teachers':['Macallimiinta','المعلمون'],'Teacher Assignments':['Waajibaadka Macallimiinta','تكليفات المعلمين'],'Receive Fee':['Qaado Lacag','استلام الرسوم'],'Receipt List':['Liiska Rasiidhada','قائمة الإيصالات'],'View Invoices':['Eeg Biilasha','عرض الفواتير'],'Student Discounts':['Dhimista Ardayda','خصومات الطلاب'],'Expenses':['Kharashaadka','المصروفات'],'Account Transfers':['Wareejinta Xisaabaadka','تحويلات الحسابات'],'Account Deposits':['Dhigaalka Xisaabaadka','إيداعات الحسابات'],'Account Withdrawals':['La-bixidda Xisaabaadka','سحوبات الحسابات'],'Bank Reconciliation':['Iswaafajinta Bangiga','التسوية البنكية'],'Expense Categories':['Qaybaha Kharashaadka','فئات المصروفات'],'Payroll Setup':['Dejinta Mushaharka','إعداد الرواتب'],'Payroll List':['Liiska Mushaharka','قائمة الرواتب'],'Payroll Adjustments':['Wax-ka-beddelka Mushaharka','تعديلات الرواتب'],
  'Take Attendance':['Qaado Xaadirinta','تسجيل الحضور'],'View Attendance':['Eeg Xaadirinta','عرض الحضور'],'Corrections & Missing':['Sixitaan iyo Maqan','التصحيحات والمفقود'],'Memorization':['Xifdinta','الحفظ'],'View Memorization':['Eeg Xifdinta','عرض الحفظ'],'Memorization Reports':['Warbixinnada Xifdinta','تقارير الحفظ'],'Qur’an Assignments':['Waajibaadka Qur’aanka','واجبات القرآن'],'Surah List':['Liiska Suuradaha','قائمة السور'],'Mistake Types':['Noocyada Khaladaadka','أنواع الأخطاء'],'Qur’an Reports':['Warbixinnada Qur’aanka','تقارير القرآن'],
  'School Profile':['Macluumaadka Dugsiga','بيانات المدرسة'],'Branches':['Laamaha','الفروع'],'Roles':['Doorarka','الأدوار'],'Permissions':['Ogolaanshaha','الصلاحيات'],'System Settings':['Dejimaha Nidaamka','إعدادات النظام'],'Audit Log':['Diiwaanka Hubinta','سجل التدقيق'],'Overview':['Dulmar','نظرة عامة'],'Dashboard':['Dashboard','لوحة التحكم'],'Search':['Raadi','بحث'],'Filter':['Kala saar','تصفية'],'Apply filters':['Adeegso kala-soocidda','تطبيق التصفية'],'Apply filter':['Adeegso kala-soocidda','تطبيق التصفية'],'Refresh':['Cusboonaysii','تحديث'],'Export CSV':['Dhoofso CSV','تصدير CSV'],'Export all CSV':['Dhoofso dhammaan CSV','تصدير الكل CSV'],
  'Name':['Magaca','الاسم'],'Full name':['Magaca oo dhan','الاسم الكامل'],'Email':['Iimayl','البريد الإلكتروني'],'Email address':['Cinwaanka iimaylka','البريد الإلكتروني'],'Password':['Furaha sirta','كلمة المرور'],'Phone':['Telefoon','الهاتف'],'Address':['Cinwaan','العنوان'],'Status':['Xaaladda','الحالة'],'Action':['Ficil','الإجراء'],'Actions':['Ficillada','الإجراءات'],'Date':['Taariikh','التاريخ'],'From date':['Laga bilaabo','من تاريخ'],'To date':['Ilaa taariikh','إلى تاريخ'],'Branch':['Laanta','الفرع'],'Main Branch':['Laanta Weyn','الفرع الرئيسي'],'Currency':['Lacagta','العملة'],'Language':['Luqadda','اللغة'],'Description':['Faahfaahin','الوصف'],'Category':['Qaybta','الفئة'],'Amount':['Lacagta','المبلغ'],'Balance':['Haraaga','الرصيد'],'Method':['Habka','الطريقة'],'Period':['Muddada','الفترة'],'Class':['Fasalka','الفصل'],'Subject':['Maadada','المادة'],'Teacher':['Macallinka','المعلم'],'Student':['Ardayga','الطالب'],'Male':['Lab','ذكر'],'Female':['Dhedig','أنثى'],
  'Active':['Firfircoon','نشط'],'Inactive':['Aan firfircoonayn','غير نشط'],'Suspended':['La hakiyay','موقوف'],'Pending':['Sugaya','قيد الانتظار'],'Completed':['Dhammaystiran','مكتمل'],'Present':['Jooga','حاضر'],'Absent':['Maqan','غائب'],'Late':['Daahay','متأخر'],'Leave':['Fasax','إجازة'],'Save':['Kaydi','حفظ'],'Cancel':['Jooji','إلغاء'],'Close':['Xir','إغلاق'],'Edit':['Wax ka beddel','تعديل'],'Delete':['Tirtir','حذف'],'Create':['Abuur','إنشاء'],'Update':['Cusboonaysii','تحديث'],'Print':['Daabac','طباعة'],'Previous':['Hore','السابق'],'Next':['Xiga','التالي'],'Search reports':['Raadi warbixin','بحث التقارير'],
  'Sign in':['Gal','تسجيل الدخول'],'Gal dashboard-ka':['Gal dashboard-ka','دخول لوحة التحكم'],'SOO DHAWOOW':['SOO DHAWOOW','مرحباً'],'Gal akoonkaaga':['Gal akoonkaaga','سجل الدخول إلى حسابك'],'Muuji':['Muuji','إظهار'],'Qari':['Qari','إخفاء'],'You have no new notifications.':['Ma lihid ogeysiis cusub.','ليس لديك إشعارات جديدة.'],'Loading students…':['Ardayda waa la soo rarayaa…','جارٍ تحميل الطلاب…'],'No students found':['Arday lama helin','لم يتم العثور على طلاب'],'No payments posted.':['Lacag-bixin lama diiwaangelin.','لا توجد مدفوعات مسجلة.'],'No invoices issued.':['Biil lama soo saarin.','لا توجد فواتير صادرة.'],'No employees registered.':['Shaqaale lama diiwaangelin.','لا يوجد موظفون مسجلون.'],
  'Register new school':['Diiwaangeli dugsi cusub','تسجيل مدرسة جديدة'],'Registered schools':['Dugsiyada diiwaangashan','المدارس المسجلة'],'Total schools':['Wadarta dugsiyada','إجمالي المدارس'],'Active schools':['Dugsiyada firfircoon','المدارس النشطة'],'School users':['Isticmaalayaasha dugsiyada','مستخدمو المدارس'],'Create school & owner':['Abuur dugsi iyo maamule','إنشاء المدرسة والمالك'],'School name':['Magaca dugsiga','اسم المدرسة'],'Owner full name':['Magaca maamulaha','اسم المالك الكامل'],'Owner email':['Iimaylka maamulaha','بريد المالك'],'Temporary password':['Fure ku-meel-gaar ah','كلمة مرور مؤقتة'],'Schools':['Dugsiyada','المدارس'],
  'HUMAN RESOURCES':['MAAMULKA SHAQAALAHA','الموارد البشرية'],'Employees, teachers, attendance and payroll.':['Shaqaalaha, macallimiinta, xaadirinta iyo mushaharka.','الموظفون والمعلمون والحضور والرواتب.'],'Add employee':['Ku dar shaqaale','إضافة موظف'],'＋ Add employee':['＋ Ku dar shaqaale','＋ إضافة موظف'],'Prepare payroll':['Diyaari mushahar','إعداد الرواتب'],'＋ Prepare payroll':['＋ Diyaari mushahar','＋ إعداد الرواتب'],'Employee':['Shaqaale','الموظف'],'Employee number':['Lambarka shaqaalaha','رقم الموظف'],'Number':['Lambar','الرقم'],'Gender':['Jinsiga','الجنس'],'Hire date':['Taariikhda shaqaalaynta','تاريخ التوظيف'],'Basic salary':['Mushaharka aasaasiga ah','الراتب الأساسي'],'Salary':['Mushahar','الراتب'],'This employee is a teacher':['Shaqaalahani waa macallin','هذا الموظف معلم'],'Save employee':['Kaydi shaqaalaha','حفظ الموظف'],'Teacher shift':['Wakhtiga macallinka','فترة المعلم'],'Shift':['Wakhtiga','الفترة'],'Select shift':['Dooro wakhtiga','اختر الفترة'],'Not assigned':['Lama qoondeyn','غير معين'],'Yes':['Haa','نعم'],'No':['Maya','لا'],'Payroll':['Mushaharka','الرواتب'],'All present':['Dhammaantood joogaan','الجميع حاضر'],'Save attendance':['Kaydi xaadirinta','حفظ الحضور'],'Report date':['Taariikhda warbixinta','تاريخ التقرير'],'No attendance records found for this date.':['Taariikhdan wax xaadirin ah lagama helin.','لا توجد سجلات حضور لهذا التاريخ.'],'No teachers registered.':['Macallimiin lama diiwaangelin.','لا يوجد معلمون مسجلون.'],'Teacher assignments':['Waajibaadka macallimiinta','تكليفات المعلمين'],'Separate workspace for assigning teachers to classes and subjects.':['Qayb gaar ah oo macallimiinta loogu qoondeeyo fasallo iyo maadooyin.','مساحة منفصلة لتعيين المعلمين للفصول والمواد.'],'Month':['Bisha','الشهر'],'Year':['Sannadka','السنة'],'Allowances':['Gunnooyin','البدلات'],'Deductions':['Jaritaanno','الخصومات'],'Net salary':['Mushaharka saafiga ah','صافي الراتب'],'Basic':['Aasaasi','الأساسي'],'No payroll periods prepared.':['Wax mushahar ah lama diyaarin.','لم يتم إعداد فترات رواتب.'],'Terminated':['Shaqada laga joojiyey','منتهي الخدمة'],'Sick':['Xanuunsan','مريض'],'Holiday':['Fasax guud','عطلة']
  ,'Edit employee':['Wax ka beddel shaqaalaha','تعديل الموظف'],'Update employee':['Cusboonaysii shaqaalaha','تحديث الموظف.'],'Employee updated.':['Shaqaalaha waa la cusboonaysiiyey.','تم تحديث الموظف.'],'Assign teacher':['U qoondee macallin','تعيين معلم'],'Academic Year':['Sannad-dugsiyeedka','السنة الدراسية'],'Save assignment':['Kaydi waajibaadka','حفظ التكليف'],'No teacher assignments registered.':['Weli waajibaad macallin lama diiwaangelin.','لا توجد تكليفات معلمين مسجلة.'],'Delete this teacher assignment?':['Ma tirtirtaa waajibaadkan macallinka?','هل تريد حذف تكليف المعلم؟'],'Teacher assignment saved.':['Waajibaadka macallinka waa la kaydiyey.','تم حفظ تكليف المعلم.'],'Teacher assignment deleted.':['Waajibaadka macallinka waa la tirtiray.','تم حذف تكليف المعلم.'],
  'Class Promotions (Promoting Classes)':['Dallacsiinta Fasallada','ترقية الفصول'],'Promote students to the next class, retain them in their class, or track promotion history.':['U dallacsii ardayda fasallada xiga, u reeb fasalkooda, ama la soco taariikhda dallacsiinta.','قم بترقية الطلاب أو إبقائهم في فصلهم أو تتبع سجل الترقية.'],'Back to Classes':['Ku noqo Fasallada','العودة إلى الفصول'],'EXAM AVERAGE':['CELCELISKA IMIXAANKA','متوسط الامتحان'],'PROMOTION DECISION':["GO'AANKA DALLACSIINTA",'قرار الترقية'],'NEW CLASS':['FASALKA CUSUB EE LOO DIRAYO','الفصل الجديد'],'Passed':['Gudbay','ناجح'],'Failed':['Dhacay','راسب'],'Promoted':['Dallacay','تمت الترقية'],'Retained':['Ku Celiyay','إعادة الفصل'],'Graduated':['Qalin-jabiyey','متخرج'],'The student remains in the same class':['Wuxuu joogayaa fasalka','يبقى الطالب في نفس الفصل'],'Execute Promotion':['Fuli Dallacsiinta','تنفيذ الترقية'],'Confirm Promotion':['Xaqiiji Dallacsiinta','تأكيد الترقية'],'Minimum promotion score':['Celceliska ugu yar ee dallacsiinta','الحد الأدنى للترقية'],'Missing exam results':['Natiijo imtixaan ayaa ka dhiman','نتائج امتحان مفقودة'],'Exam results are not published':['Natiijooyinka imtixaanka lama daabicin','نتائج الامتحان غير منشورة'],'Not eligible for promotion':['Uma qalmo dallacsiin','غير مؤهل للترقية'],'Final class':['Fasalka ugu dambeeya','الفصل النهائي'],'Next class':['Fasalka xiga','الفصل التالي'],
  'Add Branch':['Ku dar Branch','إضافة فرع'],'Branch Management':['Maamulka Branch-yada','إدارة الفروع'],'Manage users':['Maamul users-ka','إدارة المستخدمين'],'Deactivate':['Dami','تعطيل'],'Activate':['Daar','تفعيل'],'Save Branch':['Kaydi Branch-ka','حفظ الفرع'],'Post transfer':['Diiwaangeli wareejinta','تسجيل التحويل'],'Post deposit':['Diiwaangeli dhigaalka','تسجيل الإيداع'],'Post withdrawal':['Diiwaangeli la-bixidda','تسجيل السحب'],'Save reconciliation':['Kaydi iswaafajinta','حفظ التسوية'],'Recent records':['Diiwaanadii ugu dambeeyey','السجلات الأخيرة']
};

const terms: Dictionary = {
  'new':['cusub','جديد'],'all':['dhammaan','الكل'],'view':['eeg','عرض'],'manage':['maamul','إدارة'],'management':['maamulka','الإدارة'],'add':['ku dar','إضافة'],'remove':['ka saar','إزالة'],'select':['dooro','اختر'],'open':['fur','فتح'],'send':['dir','إرسال'],'download':['soo dejiso','تنزيل'],'upload':['soo geli','رفع'],'submit':['gudbi','إرسال'],'reset':['dib u celi','إعادة تعيين'],'change':['beddel','تغيير'],'confirm':['xaqiiji','تأكيد'],'approve':['oggolow','موافقة'],'reject':['diid','رفض'],'publish':['daabac','نشر'],'published':['la daabacay','منشور'],'locked':['xiran','مقفل'],'draft':['qabyo','مسودة'],'history':['taariikhda','السجل'],'summary':['kooban','الملخص'],'details':['faahfaahin','التفاصيل'],'information':['macluumaad','المعلومات'],'profile':['xogta qofka','الملف الشخصي'],'school':['dugsi','مدرسة'],'current':['hadda','الحالي'],'total':['wadarta','الإجمالي'],'available':['diyaar','متاح'],'required':['qasab','مطلوب'],'optional':['ikhtiyaari','اختياري'],'type':['nooc','النوع'],'code':['summad','الرمز'],'title':['cinwaan','العنوان'],'reason':['sabab','السبب'],'notes':['qoraallo','ملاحظات'],'start':['bilow','البداية'],'end':['dhammaad','النهاية'],'time':['waqti','الوقت'],'today':['maanta','اليوم'],'created':['la abuuray','تم الإنشاء'],'updated':['la cusboonaysiiyey','تم التحديث'],'success':['guul','نجاح'],'failed':['fashilmay','فشل'],'error':['khalad','خطأ'],'loading':['waa la soo rarayaa','جار التحميل'],'record':['diiwaan','سجل'],'records':['diiwaanno','سجلات'],'list':['liis','قائمة'],'report':['warbixin','تقرير'],'payment':['lacag-bixin','دفعة'],'payments':['lacag-bixinno','مدفوعات'],'invoice':['biil','فاتورة'],'invoices':['biilal','فواتير'],'receipt':['rasiidh','إيصال'],'fee':['lacag-dugsi','رسوم'],'discount':['dhimis','خصم'],'scholarship':['deeq waxbarasho','منحة'],'income':['dakhli','دخل'],'expense':['kharash','مصروف'],'bank':['bangi','بنك'],'cash':['kaash','نقد'],'transfer':['wareejin','تحويل'],'deposit':['dhigaal','إيداع'],'withdrawal':['la-bixid','سحب'],'account':['xisaab','حساب'],'promotion':['dallacsiin','ترقية'],'score':['dhibco','درجة'],'average':['celcelis','متوسط'],'result':['natiijo','نتيجة'],'results':['natiijooyin','نتائج'],'exam':['imtixaan','امتحان'],'exams':['imtixaanno','امتحانات'],'mark':['dhibic','علامة'],'marks':['dhibco','درجات'],'guardian':['waalid','ولي الأمر'],'parent':['waalid','ولي الأمر'],'children':['carruur','الأطفال'],'employee':['shaqaale','موظف'],'department':['waax','القسم'],'role':['door','دور'],'permission':['oggolaansho','صلاحية'],'announcement':['ogeysiis','إعلان'],'message':['fariin','رسالة'],'template':['qaab','قالب'],'system':['nidaamka','النظام'],'of':['ee','لـ'],'to':['ku','إلى'],'from':['ka','من'],'and':['iyo','و'],'or':['ama','أو'],'with':['leh','مع'],'without':['la’aan','بدون'],'for':['loogu talagalay','لـ']
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly current = signal<AppLanguage>(this.savedLanguage());
  private originals = new WeakMap<Node, string>();
  private attributeOriginals = new WeakMap<Element, Map<string,string>>();
  private applying = false;

  constructor() {
    this.apply(this.current());
    queueMicrotask(() => this.translateTree(document.body));
    new MutationObserver(records => {
      if (this.applying) return;
      for (const record of records) {
        if (record.type === 'characterData') this.translateText(record.target, true);
        record.addedNodes.forEach(node => this.translateTree(node));
      }
    }).observe(document.documentElement, { subtree:true, childList:true, characterData:true });
  }

  set(language: AppLanguage) {
    this.current.set(language);
    localStorage.setItem('madaaris-language', language);
    this.apply(language);
    this.translateTree(document.body);
  }

  translate(label: string) { return this.value(label); }

  private value(source: string) {
    const target = this.current();
    const exact = words[source];
    if (exact) return target === 'so' ? exact[0] : target === 'ar' ? exact[1] : source;
    const reverse = Object.entries(words).find(([, pair]) => pair[0] === source || pair[1] === source);
    if (reverse) return target === 'so' ? reverse[1][0] : target === 'ar' ? reverse[1][1] : reverse[0];

    // Translate known phrases inside longer UI sentences. Entries are longest-first
    // so "Attendance Reports" is handled before the shorter "Attendance".
    let output = source;
    const entries = Object.entries({...terms,...words}).sort((a,b) => Math.max(b[0].length,b[1][0].length,b[1][1].length)-Math.max(a[0].length,a[1][0].length,a[1][1].length));
    for (const [english,pair] of entries) {
      const replacements = target === 'en' ? [[pair[0],english],[pair[1],english]] : target === 'so' ? [[english,pair[0]],[pair[1],pair[0]]] : [[english,pair[1]],[pair[0],pair[1]]];
      for (const [from,to] of replacements) if(from && from!==to) {
        const escaped=from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        output=output.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,'giu'),to);
      }
    }
    return output;
  }

  private translateTree(root: Node | null) {
    if (!root) return;
    this.applying = true;
    if (root.nodeType === Node.TEXT_NODE) this.translateText(root);
    if (root.nodeType === Node.ELEMENT_NODE) this.translateElement(root as Element);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) node.nodeType === Node.TEXT_NODE ? this.translateText(node) : this.translateElement(node as Element);
    this.applying = false;
  }

  private translateText(node: Node, changed = false) {
    if (node.parentElement?.closest('script,style')) return;
    const raw = node.textContent ?? '';
    const trimmed = raw.trim(); if (!trimmed) return;
    if (changed && !Object.values(words).some(pair => pair.includes(trimmed))) this.originals.set(node, trimmed);
    const original = this.originals.get(node) ?? trimmed; this.originals.set(node, original);
    const translated = this.value(original);
    if (translated !== trimmed) node.textContent = raw.replace(trimmed, translated);
  }

  private translateElement(element: Element) {
    const attributes = ['placeholder','title','aria-label'];
    let saved = this.attributeOriginals.get(element); if (!saved) { saved = new Map(); this.attributeOriginals.set(element, saved); }
    for (const attribute of attributes) if (element.hasAttribute(attribute)) {
      const current = element.getAttribute(attribute) || ''; if (!saved.has(attribute)) saved.set(attribute,current);
      element.setAttribute(attribute,this.value(saved.get(attribute)!));
    }
  }

  private savedLanguage(): AppLanguage {
    const value = localStorage.getItem('madaaris-language');
    return value === 'so' || value === 'ar' || value === 'en' ? value : 'so';
  }
  private apply(language: AppLanguage) {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body?.classList.toggle('rtl', language === 'ar');
  }
}
