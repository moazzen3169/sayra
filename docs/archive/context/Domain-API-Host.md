# API Endpoint & Base URL Integration Context

## 1. هدف این Context

این سند برای توضیح نحوه استفاده از APIهای پروژه Gaming Center در Frontend تهیه شده است.

هدف اصلی این سند این است که AI Agent یا Developer هنگام پیاده‌سازی Frontend:

* Endpointهای API را به‌صورت صحیح استفاده کند.
* هیچ URL کامل و Hard-Code شده‌ای را در کامپوننت‌ها و صفحات قرار ندهد.
* تمام درخواست‌های API را بر اساس یک `BASE_URL` مرکزی ایجاد کند.
* تغییر Domain یا API Host فقط با تغییر یک مقدار امکان‌پذیر باشد.
* Path مربوط به Endpoint از `BASE_URL` جدا باشد.
* Authentication، Headers، Query Parameters، Path Parameters و Request Body را مطابق Contract API ارسال کند.
* Endpointها را در یک ساختار قابل نگهداری و قابل توسعه مدیریت کند.
* در صورت تغییر Domain، نیاز به جستجو و اصلاح URL در کل پروژه وجود نداشته باشد.

---

# 2. اصل بسیار مهم: Base URL مرکزی

تمام درخواست‌های API باید از یک `BASE_URL` مرکزی ساخته شوند.

Frontend نباید در هیچ Component، Page، Hook یا Service به‌صورت مستقیم URL کامل API را Hard-Code کند.

### ساختار صحیح

```text
BASE_URL + ENDPOINT_PATH
```

مثلاً:

```text
BASE_URL = https://api.example.com
```

و Endpoint:

```text
/public/gamingCenters/{gamingCenterSlug}
```

در نهایت Request باید به این شکل ساخته شود:

```text
https://api.example.com/public/gamingCenters/{gamingCenterSlug}
```

اما Component نباید این URL کامل را خودش بسازد.

---

# 3. چرا Base URL باید مرکزی باشد؟

ممکن است Domain API در آینده تغییر کند.

مثلاً:

```text
https://api.example.com
```

به:

```text
https://api.production.com
```

یا:

```text
https://api.staging.example.com
```

تغییر کند.

اگر URLها در سراسر پروژه Hard-Code شده باشند، تغییر Domain نیازمند اصلاح تعداد زیادی فایل خواهد بود.

اما اگر تمام درخواست‌ها از یک Base URL مرکزی استفاده کنند، فقط مقدار Base URL تغییر می‌کند.

### هدف

تغییر:

```text
BASE_URL
```

باید برای تغییر Host اصلی API کافی باشد.

نباید لازم باشد تک‌تک Endpointها، Componentها یا Pageها تغییر کنند.

---

# 4. تفکیک Base URL و Endpoint Path

Base URL و Endpoint Path دو مفهوم جدا هستند.

### Base URL

مسئول مشخص کردن Host اصلی API است.

مثال:

```text
https://api.example.com
```

### Endpoint Path

مسیر مربوط به Resource یا عملیات API است.

مثال:

```text
/public/gamingCenters/{gamingCenterSlug}
```

بنابراین:

```text
BASE_URL = https://api.example.com
PATH = /public/gamingCenters/{gamingCenterSlug}
```

و Request نهایی:

```text
BASE_URL + PATH
```

---

# 5. Base URL نباید در Component نوشته شود

این روش اشتباه است:

```javascript
fetch("https://api.example.com/public/gamingCenters/my-center")
```

همچنین این روش نیز نباید در پروژه استفاده شود:

```javascript
const url = "https://api.example.com/public/gamingCenters";
```

در عوض باید Base URL در یک Configuration مرکزی قرار داشته باشد.

مثلاً به‌صورت مفهومی:

```javascript
const BASE_URL = ENV_API_BASE_URL;
```

و سپس Client API از آن استفاده کند.

---

# 6. Environment-based Base URL

Base URL ترجیحاً باید از Environment Configuration خوانده شود.

برای مثال:

```text
Development
https://api-dev.example.com
```

```text
Staging
https://api-staging.example.com
```

```text
Production
https://api.example.com
```

Frontend نباید برای هر Environment، Endpointهای متفاوتی داشته باشد.

تنها چیزی که تغییر می‌کند:

```text
BASE_URL
```

است.

---

# 7. API Client مرکزی

تمام Requestها باید ترجیحاً از طریق یک API Client مرکزی ارسال شوند.

ساختار مفهومی:

```text
Component
   ↓
Hook / Service
   ↓
API Client
   ↓
BASE_URL + Endpoint
   ↓
Backend API
```

Component نباید مسئول موارد زیر باشد:

* ساخت URL کامل
* مدیریت Base URL
* اضافه کردن Authorization
* مدیریت مشترک Headers
* Parse کردن Response در سطح پایین
* مدیریت عمومی Errorهای HTTP

این مسئولیت‌ها باید تا حد امکان در API Client یا Service Layer متمرکز شوند.

---

# 8. ساختار پیشنهادی API Client

ساختار دقیق وابسته به Framework و Library پروژه است، اما منطق باید مشابه نمونه زیر باشد:

```javascript
const apiClient = {
    get(path, options),
    post(path, body, options),
    put(path, body, options),
    patch(path, body, options),
    delete(path, options)
};
```

این Client باید خودش Base URL را به Path اضافه کند.

مثلاً:

```javascript
apiClient.get("/public/gamingCenters/my-center")
```

و Client درخواست زیر را ایجاد کند:

```text
BASE_URL + /public/gamingCenters/my-center
```

---

# 9. Endpointها نباید URL کامل باشند

در تعریف Endpointها فقط Path نگهداری شود.

صحیح:

```text
/public/gamingCenters/{gamingCenterSlug}
```

غلط:

```text
https://api.example.com/public/gamingCenters/{gamingCenterSlug}
```

این قانون برای تمام Endpointهای پروژه اعمال می‌شود.

---

# 10. دسته‌بندی Endpointها

Endpointها را باید بر اساس Domain یا Feature دسته‌بندی کرد.

ساختار منطقی می‌تواند مشابه این باشد:

```text
API
├── Auth
├── Public Gaming Centers
├── Customer
├── Reservations
├── Payments
├── Ratings
├── Notifications
├── Support / Tickets
└── Other Resources
```

هدف این است که Developer یا AI Agent بتواند به‌راحتی Endpoint مربوط به هر Feature را پیدا کند.

---

# 11. Path Parameters

هر Endpoint که دارای Dynamic Parameter است باید آن Parameter را در زمان ساخت Request جایگزین کند.

مثال:

```text
/public/gamingCenters/{gamingCenterSlug}
```

اگر:

```text
gamingCenterSlug = abc-gaming
```

باشد، Path نهایی:

```text
/public/gamingCenters/abc-gaming
```

خواهد بود.

اما Base URL همچنان جدا باقی می‌ماند.

---

# 12. Query Parameters

Query Parameter باید جدا از Path مدیریت شود.

مثلاً Endpoint:

```text
/public/gamingCenters/{gamingCenterSlug}/availability/slots
```

ممکن است پارامترهایی مانند:

```text
date
stationId
```

دریافت کند.

ساختار منطقی Request:

```text
PATH
+
QUERY PARAMETERS
```

مثلاً:

```text
/public/gamingCenters/abc-gaming/availability/slots?date=2026-09-28&stationId=123
```

Frontend نباید Query String را به‌صورت دستی و پراکنده در Componentها ایجاد کند.

API Client یا Service Layer باید مسئول ساخت صحیح Query String باشد.

---

# 13. Request Body

برای `POST`, `PUT`, `PATCH` و Endpointهایی که Body دریافت می‌کنند، Request Body باید مطابق API Contract ارسال شود.

Frontend نباید Field جدیدی را که در Contract وجود ندارد اختراع کند.

همچنین نباید نام Fieldهای API را بدون دلیل تغییر دهد.

مثلاً اگر API انتظار دارد:

```json
{
    "stationId": "...",
    "startTime": "...",
    "customer": {}
}
```

Frontend باید دقیقاً بر اساس همین Contract Request را ایجاد کند.

---

# 14. HTTP Method

HTTP Method بخشی از Contract API است.

Frontend باید Method مشخص‌شده توسط API را رعایت کند:

```text
GET
POST
PUT
PATCH
DELETE
```

نباید صرفاً بر اساس نام Endpoint حدس زده شود که چه Methodی باید استفاده شود.

---

# 15. Headers

Headers باید به دو دسته تقسیم شوند:

### Headers عمومی

مانند:

```text
Content-Type
Authorization
```

این موارد بهتر است توسط API Client مدیریت شوند.

### Headers مخصوص یک Endpoint

اگر Endpoint خاصی Header ویژه‌ای نیاز دارد، آن Header باید فقط برای همان Request اضافه شود.

---

# 16. Authorization

Endpointهای Customer که نیاز به Authentication دارند باید Token مناسب را از سیستم Authentication دریافت کنند.

به‌صورت مفهومی:

```text
Authorization: Bearer <access_token>
```

Frontend نباید Authorization Header را در تک‌تک Componentها به‌صورت دستی بنویسد.

این مسئولیت باید در API Client یا یک Request Interceptor متمرکز شود.

---

# 17. Refresh Token

در صورتی که API Contract برای Refresh Token Endpoint ارائه کرده باشد، مدیریت Refresh Token باید در لایه Authentication/API Client انجام شود.

Component نباید هنگام دریافت `401` خودش تصمیم بگیرد که چگونه Token را Refresh کند.

منطق عمومی باید در یک محل مرکزی قرار گیرد.

---

# 18. Authentication Endpointها

طبق API Contract، سیستم Customer شامل OTP Authentication است.

جریان کلی:

```text
Request OTP
    ↓
Verify OTP
    ↓
Receive Access / Refresh Token
    ↓
Store Authentication State
    ↓
Use Access Token for Protected Requests
```

Frontend باید Endpointهای Authentication را از طریق API Client فراخوانی کند.

---

# 19. Public Gaming Center Endpointها

برای اطلاعات عمومی Gaming Center، Endpointهای Public در API وجود دارند.

نمونه دسته‌ها:

```text
/public/gamingCenters/{gamingCenterSlug}
```

و Resourceهای مرتبط مانند:

```text
/media
/links
/addresses
/ratings
/pages/{pageSlug}
/availability/slots
```

این Endpointها باید در Service مربوط به Gaming Center قرار گیرند.

---

# 20. Availability Endpoint

برای دریافت Slotهای قابل رزرو، API دارای Availability Endpoint است.

Endpoint:

```text
GET /public/gamingCenters/{gamingCenterSlug}/availability/slots
```

پارامترهای مربوط به Availability طبق Contract شامل مواردی مانند:

```text
date
stationId
```

است.

Frontend باید این Endpoint را برای دریافت Slotهای قابل انتخاب استفاده کند.

Frontend نباید خودش Availability را محاسبه کند.

---

# 21. Reservation Endpoint

برای ایجاد Reservation، Frontend باید Endpoint مربوط به Customer Reservation را بر اساس API Contract فراخوانی کند.

طبق Contract، اطلاعاتی مانند:

```text
stationId
startTime
customer
```

در Request مورد استفاده قرار می‌گیرند.

همچنین برای ایجاد Reservation، `idempotency-key` مورد نیاز است.

---

# 22. Idempotency-Key

در Reservation Creation، `idempotency-key` یک Header مهم است.

Frontend باید برای جلوگیری از ایجاد Reservation تکراری، این Header را طبق Contract ارسال کند.

Frontend همچنین باید هنگام Submit شدن Reservation از ارسال چندباره ناخواسته جلوگیری کند.

مثلاً:

```text
User clicks Reserve
       ↓
Disable duplicate submission
       ↓
Generate/use idempotency key
       ↓
Send Request
```

---

# 23. Payment Endpoint

برای شروع فرآیند Payment، API دارای Endpoint مربوط به Payment Initialization است.

ساختار Endpoint:

```text
POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init
```

این Endpoint نیز طبق Contract به `idempotency-key` نیاز دارد.

Frontend باید Payment را از طریق این Endpoint آغاز کند.

---

# 24. Payment Gateway URL

Frontend نباید Gateway URL را حدس بزند یا خودش بسازد.

ابتدا باید Payment Initialization انجام شود.

سپس Response API باید بررسی شود و اگر Contract یک Payment URL یا Checkout URL ارائه کرد، Frontend باید از همان مقدار استفاده کند.

اصل مهم:

```text
Backend determines payment destination
Frontend consumes backend response
```

---

# 25. Reservation Endpointهای Customer

Customer API شامل Endpointهای مربوط به Reservation است.

از جمله:

```text
/customer/reservation
```

برای دریافت Reservationهای Customer.

و:

```text
/customer/reservation/{reservationId}
```

برای دریافت جزئیات یک Reservation.

Frontend باید از همین Endpointها برای صفحه My Reservations و Reservation Detail استفاده کند.

---

# 26. Cancel Reservation

برای لغو Reservation باید Endpoint مربوط به Cancel استفاده شود:

```text
/customer/reservation/{reservationId}/cancel
```

Frontend نباید فقط State محلی را تغییر دهد و فرض کند Reservation لغو شده است.

جریان صحیح:

```text
User clicks Cancel
       ↓
Call Cancel API
       ↓
Backend validates cancellation
       ↓
Response received
       ↓
Update UI from backend result
```

---

# 27. Rating Endpoint

Customer می‌تواند برای Reservation/Service مربوطه Rating و Comment ثبت کند.

طبق Contract، Rating شامل امتیاز 1 تا 5 و Comment است.

Frontend باید Request را طبق Contract ارسال کند و نباید خودش Eligibility را به‌صورت قطعی تعیین کند مگر اینکه Contract چنین منطقی را به Frontend واگذار کرده باشد.

---

# 28. Support / Ticket Endpointها

برای Support، API شامل Ticket functionality است.

Customer می‌تواند:

```text
Create Ticket
List Own Tickets
View Ticket
Send Message
Upload Attachment
```

را از طریق Endpointهای مربوطه انجام دهد.

تمام این درخواست‌ها نیز باید از API Client مرکزی عبور کنند.

---

# 29. Notification Endpointها

API شامل Notification functionality نیز هست.

از جمله:

```text
List Notifications
Get Unread Count
Mark Notification As Read
```

Frontend باید Notificationها را از Backend دریافت کند.

Frontend نباید Notification Business Event را خودش ایجاد یا شبیه‌سازی کند.

---

# 30. Time Proposal Endpointها

برای Reservationهایی که Time Proposal دارند، Customer می‌تواند Proposal را مشاهده و Accept یا Reject کند.

ساختار Endpointها:

```text
/customer/reservation/{reservationId}/proposals
```

```text
/customer/reservation/{reservationId}/proposals/{proposalId}/accept
```

```text
/customer/reservation/{reservationId}/proposals/{proposalId}/reject
```

این Endpointها نیز باید در Service مربوط به Reservation قرار گیرند.

---

# 31. Endpoint Registry

پیشنهاد می‌شود Endpointها به‌صورت مرکزی تعریف شوند.

مثلاً به‌صورت مفهومی:

```text
API_ENDPOINTS

AUTH
  requestOtp
  verifyOtp
  refresh

GAMING_CENTER
  details
  media
  links
  addresses
  ratings
  pages
  availability

RESERVATION
  list
  detail
  create
  cancel
  proposals
  acceptProposal
  rejectProposal

PAYMENT
  initialize

RATING
  create

SUPPORT
  tickets
  messages
  attachments

NOTIFICATION
  list
  unreadCount
  markRead
```

این ساختار باعث می‌شود Endpointها در پروژه پراکنده نشوند.

---

# 32. Component باید چه کاری انجام دهد؟

Component فقط باید اطلاعات مورد نیاز خود را از Service/Hook دریافت کند.

مثلاً:

```text
ReservationPage
      ↓
useCreateReservation()
      ↓
reservationService.create()
      ↓
apiClient.post()
      ↓
BASE_URL + endpoint
```

Component نباید مستقیماً:

```text
fetch("https://...")
```

انجام دهد.

---

# 33. Service Layer

برای هر Domain بهتر است Service مستقل وجود داشته باشد.

مثلاً:

```text
authService
gamingCenterService
reservationService
paymentService
ratingService
supportService
notificationService
```

این Serviceها مسئول ارتباط با Endpointهای مربوط به Domain خود هستند.

---

# 34. API Client مسئول Base URL است

Service نباید خودش Base URL را مدیریت کند.

مثلاً:

```text
reservationService
        ↓
apiClient
        ↓
BASE_URL
```

نه:

```text
reservationService
        ↓
https://api.example.com/...
```

این جداسازی باعث می‌شود تغییر Domain بسیار ساده باشد.

---

# 35. مثال تغییر Domain

فرض کنید امروز:

```text
BASE_URL=https://api.example.com
```

است.

Request:

```text
GET /public/gamingCenters/abc
```

در نهایت:

```text
https://api.example.com/public/gamingCenters/abc
```

ساخته می‌شود.

اگر فردا Domain به:

```text
https://api.new-domain.com
```

تغییر کند، فقط:

```text
BASE_URL=https://api.new-domain.com
```

تغییر می‌کند.

Endpoint همچنان:

```text
/public/gamingCenters/abc
```

باقی می‌ماند.

بنابراین هیچ Component یا Service دیگری نباید تغییر کند.

---

# 36. ممنوع: Hard-Coded URL

این موارد در کد Frontend ممنوع هستند:

```javascript
fetch("https://api.example.com/...")
```

```javascript
axios.get("https://api.example.com/...")
```

```javascript
const API_URL = "https://api.example.com";
```

داخل Component یا Service.

Base URL باید فقط در Configuration مرکزی پروژه تعریف شود.

---

# 37. یکسان‌سازی Slash

در ساخت URL باید از ایجاد Double Slash یا Missing Slash جلوگیری شود.

مثلاً:

```text
BASE_URL = https://api.example.com
PATH = /customer/reservation
```

و نه:

```text
BASE_URL = https://api.example.com/
PATH = /customer/reservation
```

مگر اینکه API Client به‌صورت آگاهانه این موارد را Normalize کند.

ترجیحاً API Client باید URL نهایی را به‌صورت امن و استاندارد Compose کند.

---

# 38. عدم استفاده از URL کامل در Endpoint Registry

Endpoint Registry باید فقط Path را نگه دارد.

صحیح:

```text
reservation.detail = /customer/reservation/{reservationId}
```

غلط:

```text
reservation.detail = https://api.example.com/customer/reservation/{reservationId}
```

---

# 39. Error Handling

Errorهای API باید در API Client قابل مدیریت باشند.

Frontend باید بتواند حداقل این حالت‌ها را مدیریت کند:

```text
2xx → Success
4xx → Client / Validation / Authorization Error
5xx → Server Error
Network Error → Connection Problem
```

اما متن و Code خطا باید مطابق API Contract مصرف شود.

Frontend نباید بدون وجود اطلاعات در Contract، Error Code جدید اختراع کند.

---

# 40. Loading State

هر Request asynchronous باید Loading State داشته باشد.

مثلاً:

```text
Loading
Success
Error
```

برای عملیات حساس مانند:

```text
Create Reservation
Cancel Reservation
Initialize Payment
Accept Proposal
Reject Proposal
```

باید از ارسال چندباره جلوگیری شود.

---

# 41. Response Handling

Frontend باید Response API را مطابق Contract مصرف کند.

نباید فرض کند Response حتماً دارای Fieldهایی است که در Contract تعریف نشده‌اند.

اگر Field مورد نیاز UI در Response وجود ندارد:

```text
Do not invent it
Do not fabricate it
Do not silently derive business-critical data
```

ابتدا باید مشخص شود که API واقعاً آن داده را ارائه می‌کند یا خیر.

---

# 42. Business Logic در Frontend

Frontend می‌تواند Logicهای UI را انجام دهد، مانند:

```text
نمایش Loading
نمایش Modal
نمایش Date Label
نمایش Countdown
Disable کردن Button
Format کردن قیمت
Format کردن تاریخ
```

اما نباید Business State را بدون API تعیین کند.

مثلاً Frontend نباید خودش تصمیم بگیرد:

```text
Reservation is COMPLETED
Reservation is IN_PROGRESS
Payment is PAID
Reservation is Cancellable
Slot is Actually Available
User is Eligible for Rating
```

این موارد باید از Backend/API مشخص شوند.

---

# 43. Availability ≠ Reservation Guarantee

Response مربوط به Availability فقط وضعیت Availability در زمان Query را نشان می‌دهد.

مثلاً:

```text
10:00 AVAILABLE
11:00 AVAILABLE
12:00 AVAILABLE
```

به این معنی نیست که Slot تا لحظه Create Reservation حتماً آزاد باقی می‌ماند.

ممکن است User دیگری قبل از Submit نهایی آن Slot را رزرو کند.

بنابراین:

```text
Availability API
        ↓
UI Selection
        ↓
Create Reservation API
        ↓
Backend Final Validation
```

Backend در Create Reservation مرجع نهایی است.

---

# 44. API Contract Source of Truth است

هنگام پیاده‌سازی Endpointها، API Contract باید مرجع اصلی موارد زیر باشد:

* HTTP Method
* Endpoint Path
* Path Parameters
* Query Parameters
* Request Body
* Required Fields
* Headers
* Authentication Requirements
* Response Structure
* Error Structure
* Status Codes

AI Agent نباید این موارد را حدس بزند.

اگر چیزی در Contract مشخص نیست، باید به‌عنوان Unknown/Undefined در نظر گرفته شود.

---

# 45. Endpoint Documentation Format

برای مستندسازی هر Endpoint بهتر است اطلاعات زیر ثبت شود:

```text
Name:
Purpose:
Method:
Path:
Authentication:
Path Parameters:
Query Parameters:
Headers:
Request Body:
Response:
Possible Errors:
Used By:
```

مثال:

```text
Name:
Get Gaming Center Availability

Purpose:
Get available reservation slots.

Method:
GET

Path:
/public/gamingCenters/{gamingCenterSlug}/availability/slots

Authentication:
Public / طبق Contract

Path Parameters:
gamingCenterSlug

Query Parameters:
date
stationId

Request Body:
None

Response:
Availability slots returned by API.
```

---

# 46. Naming Convention

نام‌گذاری Serviceها و Endpointها باید ثابت باشد.

مثلاً:

```text
getGamingCenter()
getGamingCenterMedia()
getGamingCenterAvailability()
getReservations()
getReservation()
createReservation()
cancelReservation()
initializePayment()
createRating()
getNotifications()
getSupportTickets()
```

هدف این است که Agent بتواند با مشاهده نام Function، Endpoint مربوطه را تشخیص دهد.

---

# 47. Endpointها نباید در UI Logic پخش شوند

مثلاً این ساختار نامناسب است:

```text
HomePage
  → URL

GamingCenterPage
  → URL

ReservationPage
  → URL

ProfilePage
  → URL
```

بهتر است:

```text
UI
 ↓
Hooks
 ↓
Services
 ↓
API Client
 ↓
Endpoint Registry
 ↓
BASE_URL
 ↓
API
```

---

# 48. تغییر API Domain

برای تغییر Domain API باید تنها Configuration تغییر کند.

مثلاً:

```text
APP_API_BASE_URL
```

یا نام معادل آن در Framework مورد استفاده.

مقدار Endpointها نباید تغییر کند.

این Requirement یک اصل معماری پروژه است و باید در تمام Featureهای آینده نیز رعایت شود.

---

# 49. توسعه Endpoint جدید

هر زمان Endpoint جدیدی به API اضافه شد، روند صحیح:

```text
1. Read API Contract
2. Add Endpoint Path
3. Add Service Function
4. Use API Client
5. Pass required parameters
6. Handle response
7. Handle documented errors
8. Connect Service to Hook/UI
```

نباید Endpoint جدید مستقیماً داخل Component نوشته شود.

---

# 50. Checklist برای AI Agent

قبل از پیاده‌سازی هر API Request، این موارد بررسی شوند:

```text
[ ] HTTP Method مشخص است؟
[ ] Endpoint Path مشخص است؟
[ ] Base URL از Configuration مرکزی می‌آید؟
[ ] URL کامل Hard-Code نشده؟
[ ] Path Parameters مشخص هستند؟
[ ] Query Parameters مشخص هستند؟
[ ] Request Body مطابق Contract است؟
[ ] Required Headers ارسال می‌شوند؟
[ ] Authorization طبق Contract مدیریت می‌شود؟
[ ] Response مطابق Contract Parse می‌شود؟
[ ] Errorهای مستندشده مدیریت می‌شوند؟
[ ] Loading State وجود دارد؟
[ ] Duplicate Request کنترل شده؟
[ ] Business Logic از API Contract جدا مانده؟
```

---

# 51. Golden Rules

این قوانین باید در کل پروژه رعایت شوند:

### Rule 1

هیچ URL کامل API در Componentها Hard-Code نشود.

### Rule 2

تمام Requestها از API Client مرکزی عبور کنند.

### Rule 3

Base URL فقط از Configuration/Environment خوانده شود.

### Rule 4

Endpoint Registry فقط Path را نگه دارد، نه Domain.

### Rule 5

Component مسئول API Infrastructure نباشد.

### Rule 6

Service مسئول Domain API باشد.

### Rule 7

API Client مسئول Base URL، Request Configuration و موارد عمومی Request باشد.

### Rule 8

API Contract مرجع نهایی ساخت Request و Response Handling است.

### Rule 9

اگر چیزی در API Contract مشخص نشده، نباید توسط AI یا Frontend حدس زده شود.

### Rule 10

تغییر Domain اصلی API باید با تغییر Base URL امکان‌پذیر باشد و نباید نیازمند تغییر Endpointهای پروژه باشد.

---

# 52. معماری نهایی پیشنهادی

ساختار کلی باید از این الگو پیروی کند:

```text
                    ┌────────────────────┐
                    │      UI / Page     │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   Hook / Feature   │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │      Service       │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   Endpoint Config  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │     API Client     │
                    └─────────┬──────────┘
                              │
                     BASE_URL + PATH
                              │
                              ▼
                    ┌────────────────────┐
                    │    Backend API     │
                    └────────────────────┘
```

---

# 53. نتیجه نهایی

هدف این معماری این است که Frontend از API به شکل استاندارد، قابل نگهداری و قابل تغییر استفاده کند.

مهم‌ترین اصل:

```text
BASE_URL باید مستقل از Endpoint Path باشد.
```

بنابراین:

```text
BASE_URL
    +
Endpoint Path
    =
Final Request URL
```

و هیچ بخش دیگری از Frontend نباید به Domain خاصی وابسته باشد.

اگر Domain API تغییر کرد:

```text
OLD:
https://api.example.com

NEW:
https://api.new-domain.com
```

تنها Configuration مربوط به:

```text
BASE_URL
```

تغییر می‌کند.

تمام Endpointها، Serviceها، Hooks و Componentها باید بدون نیاز به تغییر باقی بمانند.

این اصل باید برای تمام API Requestهای فعلی و آینده پروژه رعایت شود.
