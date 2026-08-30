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
  'Register new school':['Diiwaangeli dugsi cusub','تسجيل مدرسة جديدة'],'Registered schools':['Dugsiyada diiwaangashan','المدارس المسجلة'],'Total schools':['Wadarta dugsiyada','إجمالي المدارس'],'Active schools':['Dugsiyada firfircoon','المدارس النشطة'],'School users':['Isticmaalayaasha dugsiyada','مستخدمو المدارس'],'Create school & owner':['Abuur dugsi iyo maamule','إنشاء المدرسة والمالك'],'School name':['Magaca dugsiga','اسم المدرسة'],'Owner full name':['Magaca maamulaha','اسم المالك الكامل'],'Owner email':['Iimaylka maamulaha','بريد المالك'],'Temporary password':['Fure ku-meel-gaar ah','كلمة مرور مؤقتة'],'Schools':['Dugsiyada','المدارس']
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
    const translation = words[source];
    return this.current() === 'so' ? translation?.[0] ?? source : this.current() === 'ar' ? translation?.[1] ?? source : source;
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
