export interface BenefitPillar {
  number: string;
  en: string;
  title: string;
  description: string;
}

export interface RegistrationStepItem {
  number: string;
  title: string;
  summary: string;
}

export interface RuleHighlightItem {
  number: string;
  title: string;
  summary: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const KEY_HIGHLIGHTS: { value: string; label: string }[] = [
  {
    value: "۰۵",
    label: "مرحله کوتاه ثبت اولیه",
  },
  {
    value: "۳۰m",
    label: "مهلت پاسخ به رزرو",
  },
  {
    value: "۳ روز",
    label: "سقف تسویه بانکی",
  },
];

export const BENEFIT_PILLARS: BenefitPillar[] = [
  {
    number: "01",
    en: "DISCOVER",
    title: "دیده شدن هدفمند",
    description:
      "گیمرهای شهر شما بر اساس کنسول، سیستم و بازی‌ها، گیمنت شما را پیدا و انتخاب می‌کنند.",
  },
  {
    number: "02",
    en: "PREPAID",
    title: "رزرو قطعی و پیش‌پرداخت",
    description:
      "مبلغ رزرو پیش از حضور مشتری آنلاین پرداخت می‌شود تا هیچ صندلی بدون پشتوانه خالی نماند.",
  },
  {
    number: "03",
    en: "CONTROL",
    title: "مدیریت یکپارچه در موبایل",
    description:
      "تعرفه ساعتی، تخفیف‌ها، ساعات کاری، دستگاه‌ها و برداشت وجه کاملاً در اختیار شماست.",
  },
];

export const REGISTRATION_STEPS: RegistrationStepItem[] = [
  {
    number: "01",
    title: "ثبت اطلاعات پایه",
    summary: "نام گیمنت، نام مدیر و شماره موبایل را وارد کنید.",
  },
  {
    number: "02",
    title: "تأیید شماره موبایل",
    summary: "مالکیت شماره را با کد پیامکی ثبت کنید تا حساب مدیر ساخته شود.",
  },
  {
    number: "03",
    title: "موقعیت و ساعات کاری",
    summary: "نشانی روی نقشه و بازه فعالیت روزانه مجموعه را مشخص کنید.",
  },
  {
    number: "04",
    title: "ورود به پنل مدیریت",
    summary: "با تأیید نهایی فرم، بلافاصله به پنل اختصاصی گیمنت متصل می‌شوید.",
  },
  {
    number: "05",
    title: "احراز هویت و انتشار",
    summary: "پروانه کسب، شماره شبا و دستگاه‌ها را ثبت کنید تا صفحه شما فعال شود.",
  },
];

export const COOPERATION_RULES: RuleHighlightItem[] = [
  {
    number: "01",
    title: "پاسخ ۳۰ دقیقه‌ای به رزرو",
    summary:
      "پس از پرداخت مشتری، حداکثر ۳۰ دقیقه فرصت دارید رزرو را در پنل تأیید یا رد کنید.",
  },
  {
    number: "02",
    title: "حفظ ظرفیت قطعی",
    summary:
      "پس از تأیید رزرو، دستگاه رزروشده یا جایگزین هم‌رده بدون هزینه اضافه باید آماده باشد.",
  },
  {
    number: "03",
    title: "قانون لغو ۲۴ ساعته",
    summary:
      "مشتری فقط تا ۲۴ ساعت پیش از شروع سانس امکان لغو دارد؛ در عدم حضور، واگذاری جایگاه مجاز است.",
  },
  {
    number: "04",
    title: "کمیسیون شفاف و تسویه ۳ روزه",
    summary:
      "کمیسیون فقط از رزروهای انجام‌شده کسر می‌شود و واریز شبا حداکثر ظرف ۳ روز کاری انجام می‌گیرد.",
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-docs",
    question: "برای ثبت گیمنت چه اطلاعات و مدارکی نیاز است؟",
    answer:
      "برای شروع فقط شماره موبایل مدیر، آدرس روی نقشه و ساعات کاری کافی است. برای انتشار عمومی و تسویه‌حساب، کد ملی، تصویر پروانه کسب و شماره شبا در پنل ثبت می‌شود.",
  },
  {
    id: "faq-publish",
    question: "گیمنت چه زمانی در سایت نمایش داده می‌شود؟",
    answer:
      "بلافاصله پس از تکمیل فرم اولیه، پنل مدیریت ساخته می‌شود؛ نمایش عمومی در سایت پس از ارسال مدارک و تأیید پشتیبانی فعال خواهد شد.",
  },
  {
    id: "faq-30min",
    question: "اگر ظرف ۳۰ دقیقه به درخواست رزرو پاسخ ندهم چه می‌شود؟",
    answer:
      "درخواست به‌صورت خودکار منقضی شده و کل مبلغ پرداختی به کیف پول مشتری بازمی‌گردد.",
  },
  {
    id: "faq-settlement",
    question: "تسویه‌حساب درآمد گیمنت چقدر زمان می‌برد؟",
    answer:
      "درآمد رزروهای انجام‌شده پس از ثبت درخواست برداشت، حداکثر ظرف ۳ روز کاری به شبای تأییدشده واریز می‌شود.",
  },
];
