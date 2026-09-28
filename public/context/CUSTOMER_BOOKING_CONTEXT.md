# Customer Booking API Context & Implementation Specification

## 1. هدف این Context

این سند مرجع پیاده‌سازی بخش **Customer / User-facing** پروژه رزرو Gaming Center است.

هدف این Context این است که هر AI Agent، Developer یا سیستم دیگری که قرار است روی Frontend یا Integration با API کار کند، ابتدا این قواعد و جریان کاری را درک کند و سپس اقدام به پیاده‌سازی کند.

این سند مربوط به مسیر **کاربر عادی (Customer)** است.

بخش‌های زیر در Scope این سند نیستند:

* Gaming Center Admin
* Super Admin
* مدیریت Gaming Center
* مدیریت Station توسط Admin
* مدیریت مالی توسط Admin
* عملیات داخلی اپراتور Gaming Center

---

# 2. اصل بسیار مهم معماری

در این پروژه باید بین مسئولیت Frontend و Backend تفاوت کاملاً حفظ شود.

## Backend منبع حقیقت (Source of Truth) است.

Frontend نباید اطلاعاتی را که Backend می‌تواند به‌صورت authoritative تعیین کند، خودش حدس بزند یا محاسبه کند.

به‌خصوص در موارد زیر:

* Availability
* قابل رزرو بودن Station
* Slotهای زمانی
* قیمت نهایی رزرو
* Discount
* وضعیت Reservation
* وضعیت Payment
* امکان Cancel
* وضعیت Session
* مجاز بودن Rating

Frontend وظیفه دارد:

1. داده موردنیاز را از API بگیرد.
2. داده را به شکل مناسب به کاربر نمایش دهد.
3. انتخاب کاربر را به API ارسال کند.
4. State دریافتی از Backend را نمایش دهد.

Frontend نباید Business Ruleهای Backend را دوباره‌سازی کند.

---

# 3. Authentication

کاربر Customer از سیستم Authentication مبتنی بر OTP استفاده می‌کند.

جریان کلی:

```text
Enter phone number
        ↓
Request OTP
        ↓
Verify OTP
        ↓
Receive Access Token / Refresh Token
        ↓
Authenticated Customer
```

API دارای Endpointهای مربوط به:

* OTP Request
* OTP Verify
* Current User / Me

است.

پس Frontend نباید Authentication مستقل برای Customer ایجاد کند.

Token دریافتی از Backend باید در لایه Authentication پروژه مدیریت شود و درخواست‌های محافظت‌شده با Bearer Token ارسال شوند.

---

# 4. مشاهده Gaming Center

Customer ابتدا باید بتواند Gaming Centerها را مشاهده کند.

برای Public Gaming Center اطلاعاتی مانند موارد زیر در API وجود دارد:

* نام
* اطلاعات عمومی
* Rating
* Media
* Address
* Links
* صفحات Public
* اطلاعات مرتبط با Gaming Center

Frontend باید برای صفحه Gaming Center از Public API استفاده کند.

## نکته

Frontend نباید اطلاعات Gaming Center را از Reservation یا Station استخراج کند، وقتی Public Gaming Center API برای آن اطلاعات وجود دارد.

---

# 5. صفحه جزئیات Gaming Center

صفحه Detail می‌تواند شامل موارد زیر باشد:

```text
Gaming Center
├── Name
├── Description / Public Information
├── Rating
├── Reviews
├── Images / Media
├── Address
├── Links
└── Stations / Booking Information
```

APIهای Public برای مواردی مانند:

* Media
* Links
* Addresses
* Ratings
* Public Pages

وجود دارند.

بنابراین این اطلاعات باید از API دریافت شوند.

Frontend نباید داده‌ای مانند Rating یا Address را از داده‌های دیگری که اتفاقاً در دسترس هستند استخراج کند، اگر Endpoint اختصاصی برای آن وجود دارد.

---

# 6. Station / Gaming Device

Reservation روی یک Station انجام می‌شود.

Station می‌تواند شامل اطلاعاتی مانند:

* نام
* نوع دستگاه
* قیمت ساعتی
* حداقل مدت اجاره
* حداکثر مدت اجاره
* مدت پیش‌فرض
* Increment زمانی

باشد.

مهم‌ترین فیلدهای مرتبط با زمان و قیمت:

```text
hourlyPrice
minRentHours
maxRentHours
defaultDurationHours
incrementMinutes
```

این اطلاعات باید از Backend گرفته شوند.

---

# 7. انتخاب Station

کاربر باید ابتدا Station موردنظر خود را انتخاب کند.

مثلاً:

```text
PS5 #1
PS5 #2
PS5 #3
PC #1
PC #2
```

Frontend باید Stationهایی را که Backend در اختیار Customer قرار می‌دهد نمایش دهد.

اگر برای Stationها Availability وجود دارد، قابل رزرو بودن نباید صرفاً با اطلاعات Station تعیین شود.

---

# 8. مهم‌ترین بخش: انتخاب تاریخ و زمان

## قانون اصلی

Frontend نباید خودش محاسبه کند که چه ساعت‌هایی آزاد هستند.

Backend باید Availability را تعیین کند.

API دارای Endpoint مربوط به Availability Slots است:

```text
GET /public/gamingCenters/{gamingCenterSlug}/availability/slots
```

این API با پارامترهایی مانند:

```text
date
stationId
```

کار می‌کند.

---

# 9. مسئولیت Frontend در انتخاب تاریخ

Frontend می‌تواند UI انتخاب تاریخ را طراحی کند.

مثلاً:

```text
امروز
فردا
پس‌فردا
```

یا Date Picker.

Frontend می‌تواند تاریخ امروز، فردا و پس‌فردا را برای UX محاسبه کند.

اما این نکته بسیار مهم است:

## Frontend فقط تاریخ را انتخاب می‌کند؛ Availability را محاسبه نمی‌کند.

مثلاً اگر امروز:

```text
2026-09-28
```

باشد، Frontend می‌تواند:

```text
2026-09-28
2026-09-29
2026-09-30
```

را نمایش دهد.

سپس برای تاریخ انتخاب‌شده API را صدا بزند.

---

# 10. مسئولیت Backend در انتخاب Slot

بعد از انتخاب:

```text
Gaming Center
+
Station
+
Date
```

Frontend باید Availability API را فراخوانی کند.

مثلاً:

```text
GET /public/gamingCenters/{slug}/availability/slots
    ?date=2026-09-28
    &stationId=station-id
```

Backend باید مشخص کند که چه Slotهایی قابل رزرو هستند.

مثلاً Response می‌تواند از نظر مفهومی شامل:

```text
12:00 AVAILABLE
13:00 AVAILABLE
14:00 UNAVAILABLE
15:00 AVAILABLE
16:00 UNAVAILABLE
```

باشد.

Frontend باید بر اساس Response Backend UI را بسازد.

---

# 11. Frontend نباید Slotها را خودش بسازد

این کار اشتباه است:

```text
Gaming Center opens at 10:00
Gaming Center closes at 24:00

Frontend:
10:00
11:00
12:00
13:00
14:00
...
```

این روش قابل قبول نیست.

چون ممکن است:

* Station رزرو شده باشد.
* Reservation دیگری وجود داشته باشد.
* Station temporarily unavailable باشد.
* محدودیت زمانی وجود داشته باشد.
* حداقل یا حداکثر مدت Reservation متفاوت باشد.
* Increment زمانی متفاوت باشد.
* قوانین دیگری در Backend اعمال شده باشد.

بنابراین:

```text
Backend = تعیین Availability
Frontend = نمایش Availability
```

---

# 12. آیا Frontend باید ساعت را محاسبه کند؟

## خیر.

Frontend فقط باید:

1. تاریخ را انتخاب کند.
2. Station را مشخص کند.
3. Availability API را صدا بزند.
4. Slotهای برگشتی را نمایش دهد.
5. Slot انتخاب‌شده را نگه دارد.

Frontend نباید بگوید:

```text
startTime + duration = endTime
```

یا:

```text
این ساعت آزاد است چون در ساعات کاری قرار دارد.
```

مگر اینکه Contract صراحتاً چنین محاسبه‌ای را برای Frontend تعریف کرده باشد.

---

# 13. Time Zone

تمام DateTimeها باید با Timezone تعریف‌شده در Backend هماهنگ باشند.

Frontend نباید بدون اطلاع از Timezone، DateTime را به‌صورت local یا UTC تبدیل کند.

به‌خصوص:

```text
startTime
endTime
reservation date
session start
session end
payment timestamps
```

باید مطابق قرارداد DateTime API ارسال و نمایش داده شوند.

اگر Contract پروژه Timezone مشخصی تعریف کرده است، همان باید مرجع باشد.

اگر مشخص نشده است، Agent نباید خودش تصمیم architectural بگیرد؛ باید Contract Backend را بررسی یا از تیم Backend سؤال کند.

---

# 14. انتخاب زمان توسط کاربر

پس از دریافت Availability:

```text
12:00
13:00
15:00
16:00
```

Frontend می‌تواند UI زیر را بسازد:

```text
انتخاب ساعت

[12:00] [13:00] [15:00]
[16:00] [18:00] [20:00]
```

Slotهای غیرقابل رزرو:

```text
disabled
```

یا می‌توانند اصلاً نمایش داده نشوند.

اما وضعیت Slot باید از Backend بیاید.

---

# 15. Duration / مدت زمان رزرو

در API مربوط به Station فیلدهایی مانند:

```text
minRentHours
maxRentHours
defaultDurationHours
incrementMinutes
```

وجود دارند.

اما در Create Online Reservation، پارامترهای اصلی Reservation شامل:

```text
stationId
startTime
customer
```

هستند.

بنابراین در Contract فعلی نباید فرض شود که Frontend باید حتماً:

```text
1 ساعت
2 ساعت
3 ساعت
```

را به‌عنوان Duration از کاربر دریافت کند.

همچنین نباید فرض شود که Frontend باید `endTime` را خودش محاسبه و ارسال کند.

## Rule

تا زمانی که Contract صریحاً Duration را به Customer واگذار نکرده:

```text
Frontend نباید endTime را خودش محاسبه کند.
Frontend نباید منطق مدت رزرو را بازسازی کند.
```

اگر Backend با `defaultDurationHours` یا سایر قوانین Station مدت را تعیین می‌کند، Backend مرجع نهایی است.

---

# 16. ایجاد Reservation

بعد از انتخاب:

```text
Station
Date
Start Time
Customer
```

Frontend می‌تواند Online Reservation ایجاد کند.

Endpoint:

```text
POST /gamingCenters/{gamingCenterId}/reservation
```

یا مسیر دقیق Online Reservation طبق API Contract.

پارامترهای مهم شامل:

```text
stationId
startTime
customer
```

است.

---

# 17. Idempotency

ایجاد Reservation دارای الزام:

```text
idempotency-key
```

است.

این Header برای جلوگیری از ایجاد Reservation تکراری اهمیت بسیار زیادی دارد.

Frontend / API Client باید برای هر عملیات Create Reservation یک Idempotency Key مناسب ایجاد کند.

مثلاً:

```text
UUID
```

یا mechanism استاندارد پروژه.

## Rule

اگر کاربر چند بار روی دکمه:

```text
رزرو
```

کلیک کرد، نباید چند Reservation ایجاد شود.

Frontend باید:

* Button را در حالت loading قرار دهد.
* از Submit تکراری جلوگیری کند.
* Idempotency-Key ارسال کند.
* Response Backend را مرجع قرار دهد.

Backend نیز Idempotency را enforce می‌کند.

---

# 18. Race Condition در رزرو

حتی اگر Availability قبلاً آزاد بودن Slot را نشان داده باشد، این به معنی تضمین Reservation نیست.

مثلاً:

```text
10:00
    ↓
Availability = AVAILABLE
    ↓
Customer A انتخاب می‌کند
Customer B همزمان انتخاب می‌کند
    ↓
هر دو Create Reservation می‌زنند
```

در این وضعیت Backend باید مرجع نهایی باشد.

بنابراین Frontend نباید بعد از Availability فرض کند:

```text
این Slot قطعی رزرو شده است.
```

تا زمانی که Create Reservation با موفقیت انجام نشده است.

---

# 19. Pre-Invoice / پیش‌فاکتور

Customer Flow شامل نمایش قیمت قبل از پرداخت است.

Reservation دارای اطلاعاتی مانند:

```text
totalHours
totalPrice
Station Snapshot
```

است.

اما در Contract فعلی Endpoint مستقلی که به‌صورت واضح:

```text
Preview Invoice
Pre-Invoice
```

نام‌گذاری شده باشد، مشخص نیست.

بنابراین Agent نباید یک API خیالی مانند:

```text
GET /reservation/preview
```

ایجاد کند.

## Rule

اگر Backend بعد از Create Reservation قیمت نهایی را برگرداند، Frontend باید همان را نمایش دهد.

Frontend نباید قیمت نهایی را خودش محاسبه کند.

---

# 20. محاسبه قیمت

Station دارای:

```text
hourlyPrice
```

است.

همچنین Discount نیز در Domain وجود دارد.

بنابراین Frontend نباید قیمت نهایی را به شکل:

```text
hourlyPrice × hours
```

محاسبه و به‌عنوان مبلغ نهایی نمایش دهد.

چون ممکن است موارد زیر در Backend اعمال شوند:

* Discount
* Fixed Discount
* Percentage Discount
* Station-specific Discount
* قوانین قیمت‌گذاری
* rounding
* محدودیت‌های Reservation

## Source of Truth:

```text
Backend totalPrice
```

Frontend فقط مبلغ نهایی Backend را نمایش می‌دهد.

---

# 21. Payment

API دارای Payment Initialization است.

مسیر مفهومی:

```text
Reservation
    ↓
Payment Init
    ↓
Payment Gateway
    ↓
Payment Result
```

Endpoint مربوط به Payment Initialization وجود دارد.

Frontend نباید مستقیماً منطق داخلی Payment را پیاده‌سازی کند.

---

# 22. Payment Gateway URL

Contract فعلی وجود Payment Initialization را مشخص می‌کند، اما در اطلاعات موجود، ساختار کامل Response درگاه مانند:

```text
paymentUrl
checkoutUrl
authority
transactionId
```

به‌صورت قطعی مشخص نشده است.

بنابراین Agent نباید اسم فیلد Response را حدس بزند.

باید دقیقاً مطابق OpenAPI/Swagger واقعی Backend عمل کند.

---

# 23. Payment Success

Frontend نباید صرفاً با بازگشت کاربر از Gateway فرض کند:

```text
Payment Successful
```

است.

Source of Truth وضعیت Payment باید Backend باشد.

Flow صحیح مفهومی:

```text
Frontend
   ↓
Payment Init
   ↓
Gateway
   ↓
Payment Processing
   ↓
Backend verifies payment
   ↓
Payment state updated
   ↓
Frontend reads final state
```

---

# 24. Final Invoice

Reservation اطلاعات مالی مانند:

```text
totalHours
totalPrice
```

دارد.

اما در Contract فعلی Endpoint مستقل و صریح برای:

```text
Invoice
Receipt
PDF Invoice
```

مشخص نشده است.

بنابراین Frontend نباید خودش یک Invoice Domain مستقل بسازد و آن را فاکتور رسمی تلقی کند.

اگر Backend Invoice Endpoint ارائه کند، Frontend باید از همان استفاده کند.

---

# 25. Reservation Code

Reservation دارای شناسه Reservation است.

اما در Contract فعلی وجود یک فیلد مستقل با معنای:

```text
reservationCode
bookingCode
confirmationCode
```

به‌صورت قطعی مشخص نشده است.

بنابراین Agent نباید:

```text
Reservation ID
```

را بدون بررسی Contract به‌عنوان:

```text
Reservation Code
```

معرفی کند.

اگر Product به یک کد قابل نمایش برای Customer نیاز دارد، Backend باید فیلد یا Endpoint مشخص آن را ارائه کند.

---

# 26. Reservation Status

Reservation دارای Statusهایی از جنس:

```text
PENDING
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELED
NO_SHOW
```

است.

Frontend باید UI را بر اساس Status واقعی Backend طراحی کند.

مثلاً:

```text
PENDING
    → در انتظار تأیید

CONFIRMED
    → تأیید شده

IN_PROGRESS
    → در حال انجام

COMPLETED
    → تمام شده

CANCELED
    → لغو شده

NO_SHOW
    → عدم حضور
```

متن فارسی UI قابل تغییر است، اما مقدار داخلی Status نباید تغییر کند.

---

# 27. تغییر خودکار به IN_PROGRESS

Product Requirement این است:

```text
وقتی زمان Reservation شروع شد
Reservation به IN_PROGRESS تغییر کند.
```

API دارای Status:

```text
IN_PROGRESS
```

است و Session Management نیز وجود دارد.

اما Contract موجود به‌تنهایی تضمین نمی‌کند که:

```text
startTime reached
        ↓
automatic backend job
        ↓
IN_PROGRESS
```

حتماً پیاده‌سازی شده باشد.

## Rule

Frontend نباید Timer اجرا کند و خودش Reservation را به `IN_PROGRESS` تبدیل کند.

Frontend فقط Status Backend را نمایش می‌دهد.

اگر Automatic Transition در Backend وجود داشته باشد، Backend مسئول آن است.

اگر وجود نداشته باشد، باید Backend Job/Scheduler پیاده‌سازی شود؛ نه Frontend.

---

# 28. Admin Override

Product Requirement ممکن است اجازه دهد Admin شروع Reservation را متوقف یا تغییر دهد.

Frontend Customer نباید درباره این Rule تصمیم بگیرد.

مثلاً نباید بگوید:

```text
اگر startTime رسید:
status = IN_PROGRESS
```

چون ممکن است Backend Admin Override داشته باشد.

Backend باید وضعیت نهایی را تعیین کند.

---

# 29. تغییر خودکار به COMPLETED

همین Rule برای پایان Reservation نیز صادق است.

Frontend نباید:

```text
endTime reached
    ↓
status = COMPLETED
```

را خودش انجام دهد.

Frontend ممکن است فقط برای UI Countdown داشته باشد:

```text
01:24:35 remaining
```

اما Countdown یک UI feature است و نباید Source of Truth وضعیت Reservation باشد.

Status واقعی باید از Backend بیاید.

---

# 30. Session Management

API دارای عملیات Session مانند:

```text
Start
Stop
Pause
Resume
```

است.

این نشان می‌دهد Reservation و Gaming Session از نظر Domain به هم مرتبط هستند.

اما Frontend Customer نباید بدون بررسی Permission فرض کند که Customer مجاز به انجام تمام Session operations است.

اگر Endpoint مخصوص Customer وجود نداشته باشد، این عملیات احتمالاً برای نقش‌های مدیریتی/عملیاتی است.

---

# 31. Notification

API دارای Notification Center برای Customer است.

Customer می‌تواند:

* Notificationها را دریافت/مشاهده کند.
* Unread Notificationها را ببیند.
* Unread Count را بگیرد.
* Notification را Read کند.

Frontend می‌تواند Notification Bell داشته باشد:

```text
🔔 3
```

و سپس:

```text
GET notifications
GET notifications/unread-count
POST/PUT notification/{id}/read
```

طبق Contract واقعی.

---

# 32. SMS بعد از Completion

Product Requirement:

```text
Reservation COMPLETED
        ↓
SMS
        ↓
Customer دعوت به Rating
```

در Contract موجود Notification وجود دارد، اما Notification Type مشخصی که صراحتاً:

```text
RESERVATION_COMPLETED
RATE_RESERVATION
```

باشد، در اطلاعات بررسی‌شده مشخص نیست.

همچنین SMS Provider/Delivery Contract به‌صورت کامل در API Customer Contract مشخص نشده است.

## Rule

Frontend نباید SMS ارسال کند.

SMS باید توسط Backend / Notification Infrastructure انجام شود.

Frontend فقط باید وقتی Customer وارد Reservation یا Notification می‌شود، امکان Rating را نمایش دهد، در صورتی که Backend آن را مجاز اعلام کند.

---

# 33. Rating & Review

Customer API دارای امکان ثبت Rating است.

Rating:

```text
1 تا 5
```

و Comment دارد.

Customer می‌تواند Rating مربوط به Reservation را ثبت کند.

---

# 34. قانون "آخرین رزرو قابل امتیازدهی"

Product Requirement می‌تواند این باشد:

```text
بعد از COMPLETED شدن آخرین Reservation
Customer بتواند Rating بدهد.
```

اما Frontend نباید خودش تشخیص دهد که کدام Reservation قابل Rating است، مگر اینکه Contract چنین Ruleی را به Frontend واگذار کرده باشد.

Rule بهتر:

```text
Backend determines rating eligibility.
Frontend renders the action.
```

اگر Backend فیلدی مانند:

```text
canRate
ratingStatus
isRated
```

ارائه کرد، همان باید استفاده شود.

اگر چنین فیلدی وجود ندارد، Agent نباید Business Rule جدیدی را حدس بزند.

---

# 35. نمایش Reviews در Gaming Center

Public Rating API وجود دارد.

بنابراین صفحه Gaming Center می‌تواند:

```text
Average Rating
Review Count
Customer Reviews
```

را نمایش دهد.

ثبت Review و مشاهده Review دو Flow جدا هستند:

```text
Public:
GET Gaming Center Ratings

Authenticated Customer:
POST Customer Rating
```

---

# 36. My Reservations

Customer می‌تواند Reservationهای خودش را مشاهده کند.

API دارای:

```text
GET /customer/reservation
```

است.

صفحه My Reservations می‌تواند شامل:

```text
All
Upcoming
In Progress
Completed
Canceled
```

باشد.

اما Filterهای UI باید با قابلیت واقعی API هماهنگ شوند.

اگر Backend Pagination/Filter مشخصی ارائه می‌کند، Frontend باید همان را استفاده کند.

---

# 37. Reservation Detail

برای مشاهده جزئیات یک Reservation:

```text
GET /customer/reservation/{reservationId}
```

وجود دارد.

Detail می‌تواند شامل:

```text
Gaming Center
Station
Date
Start Time
Duration
Price
Status
Payment
Cancellation
Rating
```

باشد، مشروط به اینکه این فیلدها در Response واقعی موجود باشند.

Frontend نباید داده‌های missing را از چند API به‌صورت غیرضروری reconstruct کند.

---

# 38. Cancel Reservation

Customer API دارای:

```text
POST /customer/reservation/{reservationId}/cancel
```

است.

Frontend باید:

1. Reservation را نمایش دهد.
2. دکمه Cancel را در شرایط مناسب نشان دهد.
3. قبل از Cancel در صورت نیاز Confirmation بگیرد.
4. Cancel API را صدا بزند.
5. Response Backend را مرجع قرار دهد.
6. Status جدید را نمایش دهد.

Frontend نباید خودش Status را:

```text
CANCELED
```

کند و سپس فرض کند Backend نیز موفق شده است.

---

# 39. Cancellation Rules

اینکه Customer دقیقاً چه زمانی می‌تواند Reservation را Cancel کند باید توسط Backend تعیین شود.

Frontend نباید Rulesی مانند:

```text
حداقل 2 ساعت قبل قابل لغو است.
```

را بدون Contract به‌صورت مستقل پیاده کند.

اگر Backend Error بدهد:

```text
Cancellation not allowed
```

Frontend باید همان Rule را از Response/Error نمایش دهد.

---

# 40. Time Proposal

API قابلیت مهمی دارد که در Flow اولیه Customer ذکر نشده بود:

Gaming Center می‌تواند برای Reservation یک Time Proposal ایجاد کند.

Customer می‌تواند:

```text
Proposal
   ↓
Accept
```

یا:

```text
Proposal
   ↓
Reject
```

را انجام دهد.

مسیرهای Customer مربوط به Proposal وجود دارند.

این قابلیت باید در طراحی Reservation Detail و Notification در نظر گرفته شود.

---

# 41. Support / Ticket

Customer می‌تواند Ticket ایجاد کند.

Flow:

```text
Support
   ↓
Create Ticket
   ↓
Ticket Detail
   ↓
Send Message
   ↓
Receive Reply
```

Customer می‌تواند Ticketهای خودش را مشاهده کند.

---

# 42. Ticket Attachment

API امکان Upload Attachment برای Ticket دارد.

بنابراین Support UI می‌تواند امکان:

```text
Text
+
Image/File
```

را داشته باشد.

Frontend باید Upload را از مسیر اختصاصی API انجام دهد و سپس Attachment را به Ticket/Message متصل کند، مطابق Contract واقعی.

---

# 43. Customer Profile

Customer می‌تواند Profile خودش را مشاهده کند.

API:

```text
/customer/me
```

و همچنین Auth Me وجود دارد.

Profile UI نباید اطلاعات Customer را از Reservation استخراج کند.

Profile باید از User/Customer API گرفته شود.

---

# 44. Notification + Reservation Integration

Reservationها می‌توانند باعث ایجاد Notification شوند.

Notificationهایی که در Domain فعلی وجود دارند شامل مواردی مانند:

```text
RESERVATION_CREATED
CONFIRMED
REJECTED
CANCELLED
TIME_PROPOSED
```

هستند.

بنابراین Frontend باید Reservation State و Notification Center را دو سیستم مستقل ولی مرتبط در نظر بگیرد.

---

# 45. چیزهایی که Frontend نباید انجام دهد

## ممنوع / غیرضروری

Frontend نباید:

```text
Availability را خودش محاسبه کند.
```

نباید:

```text
Slotهای آزاد را از Opening Hours حدس بزند.
```

نباید:

```text
Price نهایی را خودش محاسبه کند.
```

نباید:

```text
Discount را خودش اعمال کند و مبلغ نهایی تولید کند.
```

نباید:

```text
Reservation را خودش IN_PROGRESS کند.
```

نباید:

```text
Reservation را خودش COMPLETED کند.
```

نباید:

```text
Payment را موفق اعلام کند بدون تأیید Backend.
```

نباید:

```text
Cancel را موفق فرض کند بدون Response Backend.
```

نباید:

```text
Rating Eligibility را بدون Backend Rule حدس بزند.
```

نباید:

```text
Reservation Code جعلی از Reservation ID تولید کند.
```

نباید:

```text
Invoice رسمی را خودش تولید کند، مگر Product صراحتاً Invoice Client-side را تعریف کرده باشد.
```

---

# 46. چیزهایی که Frontend می‌تواند خودش محاسبه کند

محاسبات UI که Business Rule محسوب نمی‌شوند قابل انجام هستند.

مثلاً:

```text
امروز
فردا
پس‌فردا
```

برای Date Picker.

همچنین:

```text
Countdown UI
```

برای نمایش زمان باقی‌مانده، به شرط اینکه Status واقعی از Backend گرفته شود.

همچنین:

```text
Formatting
```

مانند:

```text
1000000 → 1,000,000
```

یا:

```text
2026-09-28 → 7 مهر
```

به شرط رعایت Timezone.

---

# 47. Separation of Responsibilities

## Frontend

```text
UI
State Management
Form Validation
Date Picker
Displaying Slots
Displaying Prices
Displaying Reservation Status
Loading/Error States
Payment Redirect
Notification UI
Ticket UI
Rating UI
```

## Backend

```text
Availability
Reservation Validation
Conflict Detection
Pricing
Discount
Reservation Status
Payment State
Cancellation Rules
Session State
Rating Eligibility
Notification Generation
SMS
Invoice
Business Rules
```

---

# 48. Error Handling

Frontend باید Errorهای API را به‌صورت Business-aware مدیریت کند.

مثلاً خطاهایی مانند:

```text
IDEMPOTENCY_KEY_REQUIRED
IDEMPOTENCY_REQUEST_IN_PROGRESS
```

باید به‌عنوان خطای Business/API شناخته شوند، نه صرفاً HTTP Error.

برای Reservation، خطاهای مربوط به:

* Slot unavailable
* Reservation conflict
* Invalid station
* Invalid time
* Payment
* Cancellation
* Authorization

نباید با پیام generic مانند:

```text
Something went wrong
```

نمایش داده شوند، اگر Backend Error Code مناسب ارائه می‌کند.

---

# 49. Loading State

در عملیات‌های مهم:

```text
Availability Request
Create Reservation
Payment Init
Cancel Reservation
Accept Proposal
Reject Proposal
Send Ticket Message
Submit Rating
```

Frontend باید Loading State داشته باشد.

به‌خصوص Create Reservation باید در برابر Double Submit محافظت شود.

---

# 50. Refresh کردن Availability

Availability ممکن است بین:

```text
GET Availability
```

و:

```text
POST Reservation
```

تغییر کند.

بنابراین Frontend باید همیشه آماده دریافت Failure از Create Reservation باشد.

اگر Reservation ایجاد نشد چون Slot دیگر Available نیست:

```text
Backend response
       ↓
Show error
       ↓
Refresh Availability
       ↓
Ask customer to select another slot
```

---

# 51. Reservation Flow پیشنهادی نهایی

Flow استاندارد Customer Booking:

```text
1. Customer opens Gaming Center
        ↓
2. Fetch Public Gaming Center
        ↓
3. Customer selects Station
        ↓
4. Customer selects Date
        ↓
5. Frontend requests Availability
        ↓
6. Backend calculates/returns available Slots
        ↓
7. Frontend displays Slots
        ↓
8. Customer selects Slot
        ↓
9. Frontend creates Reservation
        ↓
10. Backend validates availability
        ↓
11. Reservation created
        ↓
12. Backend returns reservation/pricing information
        ↓
13. Frontend displays booking summary / pre-payment information
        ↓
14. Payment Init
        ↓
15. Redirect to Payment Gateway
        ↓
16. Backend verifies payment
        ↓
17. Frontend retrieves final reservation/payment state
        ↓
18. Display successful booking
        ↓
19. Reservation reaches start time
        ↓
20. Backend manages Reservation/Session state
        ↓
21. Reservation becomes COMPLETED
        ↓
22. Notification/SMS infrastructure notifies Customer
        ↓
23. Customer can submit Rating/Review
```

---

# 52. My Reservations Flow

```text
Customer
   ↓
My Reservations
   ↓
GET /customer/reservation
   ↓
Reservation List
   ↓
Select Reservation
   ↓
GET /customer/reservation/{reservationId}
   ↓
Reservation Detail
```

Detail UI باید بر اساس Status Backend تغییر کند.

---

# 53. Cancel Flow

```text
Reservation Detail
        ↓
Cancel
        ↓
Confirmation
        ↓
POST /customer/reservation/{id}/cancel
        ↓
Backend validates cancellation
        ↓
Success / Error
        ↓
Refresh Reservation
```

Frontend نباید قبل از Response، Reservation را قطعی Canceled فرض کند.

---

# 54. Rating Flow

```text
Completed Reservation
        ↓
Backend says/permits rating
        ↓
Customer opens Rating UI
        ↓
Select 1–5 stars
        ↓
Optional Comment
        ↓
Submit Rating
        ↓
Backend saves Rating
        ↓
Refresh Reservation / Rating state
```

---

# 55. Support Flow

```text
Support
   ↓
My Tickets
   ↓
Create Ticket
   ↓
Ticket Detail
   ↓
Send Message
   ↓
Optional Attachment
```

---

# 56. قابلیت‌هایی که API دارد اما در Flow اولیه Customer فراموش شده‌اند

Agent باید این قابلیت‌ها را نیز هنگام طراحی Customer Experience در نظر بگیرد:

### Notification Center

* List notifications
* Unread count
* Mark as read

### Reservation Time Proposal

* مشاهده پیشنهاد تغییر زمان
* Accept
* Reject

### Gaming Center Reviews

* مشاهده Rating/Reviewهای Public

### Gaming Center Media

* Gallery / Media

### Gaming Center Links

* Social / external links

### Gaming Center Addresses

* Address information

### Public Pages

* About
* Rules
* Policies
* FAQ
* سایر CMS pages

### Ticket Attachments

* ارسال فایل همراه Support Ticket

### Session-related states

* IN_PROGRESS
* COMPLETED
* Session operations در API

### Discounts

* Gaming Center-level
* Station-level
* Percentage
* Fixed Amount

---

# 57. بخش‌هایی که Contract فعلی نیاز به Clarification دارند

این موارد را Agent نباید حدس بزند.

## A. Pre-Invoice

مشخص نیست آیا API مستقل برای Preview Invoice دارد یا قیمت از Create Reservation برمی‌گردد.

## B. Payment Gateway Response

مشخص نیست Response دقیق Payment Init شامل چه فیلدی برای Redirect است.

## C. Payment Callback / Verification

باید مشخص شود Backend چگونه Payment را Verify و Finalize می‌کند.

## D. Invoice

Endpoint مشخص برای Invoice/Receipt/PDF در Contract بررسی‌شده واضح نیست.

## E. Reservation Code

وجود فیلد مستقل Reservation Code در Contract مشخص نیست.

## F. Automatic IN_PROGRESS

وجود Scheduler/Job برای تغییر خودکار Status باید Backend-side مشخص شود.

## G. Automatic COMPLETED

همین موضوع برای پایان Reservation نیز باید Backend-side مشخص شود.

## H. SMS after Completion

Provider و Trigger دقیق SMS باید Backend-side مشخص شود.

## I. Rating Eligibility

باید مشخص شود Backend چگونه مشخص می‌کند یک Reservation قابل Rating است.

## J. Duration

باید مشخص شود آیا Customer Duration را انتخاب می‌کند یا Backend بر اساس Station Configuration آن را تعیین می‌کند.

---

# 58. مهم‌ترین قانون برای AI Agent

اگر Agent هنگام پیاده‌سازی با چیزی مواجه شد که در این Context یا API Contract مشخص نیست، نباید Business Rule جدید اختراع کند.

ترتیب تصمیم‌گیری:

```text
1. Check API Contract
        ↓
2. Check actual Backend response/schema
        ↓
3. Check existing project implementation
        ↓
4. If still unclear → mark as clarification needed
```

نباید:

```text
Guess
```

کند.

---

# 59. API Contract First

هر Feature باید ابتدا به API Contract نگاشت شود.

مثلاً:

```text
Feature:
انتخاب زمان

API:
GET availability/slots

Frontend:
Render returned slots
```

نه:

```text
Feature:
انتخاب زمان

Frontend:
Generate hourly slots manually
```

---

# 60. Source of Truth Matrix

| Feature                   | Source of Truth |
| ------------------------- | --------------- |
| Gaming Center Information | Backend         |
| Station Information       | Backend         |
| Station Price             | Backend         |
| Availability              | Backend         |
| Available Slots           | Backend         |
| Date Options              | Frontend UX     |
| Reservation Price         | Backend         |
| Discount                  | Backend         |
| Reservation Status        | Backend         |
| Payment Status            | Backend         |
| Cancellation Eligibility  | Backend         |
| Rating Eligibility        | Backend         |
| Session Status            | Backend         |
| Completion                | Backend         |
| SMS                       | Backend         |
| Notification              | Backend         |
| Invoice                   | Backend         |
| Reservation Code          | Backend         |
| Countdown Display         | Frontend        |
| Date Formatting           | Frontend        |
| Currency Formatting       | Frontend        |
| Loading State             | Frontend        |
| Error Presentation        | Frontend        |

---

# 61. Golden Rule

در این پروژه:

> **Frontend تصمیم نمی‌گیرد که چه چیزی واقعاً قابل رزرو، پرداخت، لغو، تکمیل یا امتیازدهی است؛ Backend این تصمیم را می‌گیرد.**

Frontend فقط:

```text
Ask
Display
Collect Input
Submit
React to Backend State
```

انجام می‌دهد.

---

# 62. خلاصه اجرایی برای Agent

اگر فقط یک بخش از این Context را بخوانی، این بخش را بخوان:

```text
Customer Booking Flow:

Gaming Center
→ Station
→ Date
→ Availability API
→ Available Slots
→ Select Slot
→ Create Reservation
→ Backend calculates/validates booking
→ Payment Init
→ Payment Gateway
→ Backend verifies payment
→ Final Reservation State
```

قواعد کلیدی:

```text
Date:
Frontend انتخاب می‌کند.

Available Time:
Backend تعیین می‌کند.

Slots:
Backend تولید/تأیید می‌کند؛ Frontend فقط نمایش می‌دهد.

Price:
Backend تعیین می‌کند.

Discount:
Backend تعیین می‌کند.

Duration:
تا زمانی که Contract صریحاً نگفته، Frontend نباید خودش محاسبه کند.

Reservation:
Backend ایجاد و Validate می‌کند.

Idempotency:
برای Create Reservation الزامی است.

Payment:
Frontend فقط Flow را اجرا می‌کند؛ Backend مرجع وضعیت Payment است.

IN_PROGRESS:
Frontend خودش Status را تغییر نمی‌دهد.

COMPLETED:
Frontend خودش Status را تغییر نمی‌دهد.

Cancellation:
Frontend درخواست می‌دهد؛ Backend تصمیم می‌گیرد.

Rating:
Frontend فرم را نمایش می‌دهد؛ Backend Eligibility و ثبت را کنترل می‌کند.

SMS:
Frontend مسئول ارسال نیست.

Notification:
از Notification API استفاده شود.

Invoice:
بدون Contract مشخص، ساخته یا حدس زده نشود.

Reservation Code:
بدون فیلد/Contract مشخص، از ID ساخته نشود.

Unknown Behavior:
حدس زده نشود؛ به عنوان نیازمند clarification علامت‌گذاری شود.
```

---

# 63. Definition of Done برای Customer Booking

یک پیاده‌سازی Customer Booking زمانی از نظر Integration کامل تلقی می‌شود که:

```text
[ ] Customer Authentication works
[ ] Gaming Center detail works
[ ] Station selection works
[ ] Date selection works
[ ] Availability API is used
[ ] Slots are rendered from Backend
[ ] Frontend does not calculate availability
[ ] Reservation uses idempotency-key
[ ] Double submission is prevented
[ ] Backend response controls reservation state
[ ] Payment Init is integrated
[ ] Payment state is verified through Backend
[ ] My Reservations works
[ ] Reservation Detail works
[ ] Cancel Reservation works
[ ] Notification Center works
[ ] Time Proposal flow is supported if enabled
[ ] Rating flow is supported
[ ] Support Ticket works
[ ] Ticket Attachment works
[ ] Customer Profile works
[ ] Error states are handled
[ ] Loading states are handled
[ ] Backend business rules are not duplicated in Frontend
```

---

# 64. Final Architecture Principle

این پروژه باید به شکل زیر پیاده‌سازی شود:

```text
                    BACKEND
                       │
          ┌────────────┼────────────┐
          │            │            │
     Availability   Pricing     Reservation
          │            │            │
          └────────────┼────────────┘
                       │
                    FRONTEND
                       │
          ┌────────────┼────────────┐
          │            │            │
       Display      Input       Navigation
          │            │            │
          └────────────┼────────────┘
                       │
                 Customer UX
```

Backend مسئول **Business Truth** است.

Frontend مسئول **User Experience** است.

هر جا این دو با هم تداخل پیدا کردند، Business Rule باید در Backend باقی بماند و Frontend فقط نتیجه آن را مصرف کند.
