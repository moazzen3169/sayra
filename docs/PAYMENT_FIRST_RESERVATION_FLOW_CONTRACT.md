# معماری روند جدید رزرو و پرداخت آنلاین (Payment-First Flow)

این مستند تشریح‌کننده معماری رزروهای گروهی عمومی و جریان پرداخت آنلاین (Payment-First Architecture) در سامانه است.

---

## ۱. قاعده محوری (Core Invariant)

> **«هیچ رزرو واقعی (`Reservation` یا `GroupReservation`) با وضعیت پرداخت‌نشده (`UNPAID`) در سامانه ثبت نمی‌شود.»**

پیش از این معماری، رزروها پیش از پرداخت در پایگاه‌داده با وضعیت `UNPAID` ذخیره می‌شدند که منجر به مسدود ماندن ظرفیت بدون پرداخت، سردرگمی مشتری در رزروهای رهاشده و مشکلات همزمانی می‌شد. در معماری جدید، تا زمان تأیید قطعی و معتبر بانکی، هیچ رکورد رزروی در دیتابیس ایجاد نمی‌شود.

---

## ۲. مراحل ۴‌گانه جریان رزرو و پرداخت

```
+---------------------------------------------------------------------------------------------------+
| 1. Hold Capacity                                                                                  |
|    Frontend -> POST /api/v1/public/gamingCenters/:slug/group-reservations/checkout               |
|    Server:                                                                                        |
|      - Pessimistic Lock (SELECT ... FOR UPDATE)                                                   |
|      - Conflict checks with Reservations & active BookingHolds                                    |
|      - Authoritative server-side pricing                                                          |
|      - Creates BookingHold (ACTIVE, 10 min TTL) & Payment (INITIATED)                             |
|      - Returns { holdId, paymentId, paymentUrl, token, expiresAt, amount }                        |
+---------------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------------+
| 2. Gateway Redirection                                                                            |
|    Frontend redirects user to bank gateway (Zibal / ZarinPal) via paymentUrl.                    |
|    Capacity remains temporarily blocked in /availability/slots via BookingHold.                   |
+---------------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------------+
| 3. Authoritative Verification                                                                     |
|    Gateway returns user / sends webhook.                                                          |
|    - Browser Callback: POST /api/v1/payments/:paymentId/verify                                    |
|    - Gateway Webhook: POST /api/v1/payments/webhook                                               |
|    - Server validates transaction, amount, and reference code directly with bank API.             |
+---------------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------------+
| 4. Atomic Conversion ($transaction)                                                              |
|    In an isolated database transaction:                                                           |
|      - BookingHold locked & status changed to CONVERTED                                           |
|      - Payment status changed to PAID                                                             |
|      - GroupBooking & child Reservations created simultaneously with:                             |
|          status = CONFIRMED, paymentState = PAID                                                  |
|      - Platform commission & ledger entries recorded                                              |
+---------------------------------------------------------------------------------------------------+
```

---

## ۳. مدیریت وضعیت‌های استثنایی و انقضا (Failure & Expiry)

1. **انقضای هولد (Hold Expiry):**
   - هر هولد به صورت پیش‌فرض مهلت ۱۰ دقیقه‌ای (`expiresAt`) دارد.
   - کارگر پس‌زمینه (`BookingHoldExpiryWorker`) هولدهای قدیمی‌تر از ۱۰ دقیقه را که هنوز پرداخت نشده‌اند به وضعیت `EXPIRED` تغییر می‌دهد و ظرفیت ایستگاه‌ها فوراً آزاد می‌شود.
   - هولدهایی که پرداخت موفق آن‌ها در انتظار یا در حال تبدیل اتمیک است، هرگز منقضی نمی‌شوند.

2. **لغو پرداخت یا خطای بانکی (Payment Cancellation / Bank Error):**
   - در صورت اعلام لغو توسط کاربر (`Status=NOK`) یا خطای تراکنش از سمت درگاه، هولد به وضعیت `RELEASED` رفته و ظرفیت بلافاصله آزاد می‌گردد.

3. **پنل مدیریت و رزروهای دستی (Staff / Manager Manual Bookings):**
   - رزروهایی که توسط مدیر یا پرسنل گیم‌نت در پنل مدیریت ثبت می‌شوند، تابع قوانین مدیریتی سابق خود بوده و ملزم به پرداخت آنلاین لحظه‌ای نیستند.

---

## ۴. قرارداد اندپوینت‌ها (API Endpoints Specification)

### ۱.۴. ثبت هولد و دریافت لینک درگاه (Checkout)
- **مسیر:** `POST /api/v1/public/gamingCenters/:gamingCenterSlug/group-reservations/checkout`
- **هدرها:** `Idempotency-Key: <UUID>`
- **بدنه درخواست (`GroupReservationCheckoutPayload`):**
  ```json
  {
    "startTime": "2026-11-06T18:00:00.000Z",
    "durationMinutes": 120,
    "items": [
      { "stationId": "station-uuid-1" },
      { "stationId": "station-uuid-2" }
    ],
    "customer": {
      "fullName": "علی رضایی",
      "phone": "09123456789",
      "email": "ali@example.com"
    },
    "note": "دسته‌های اضافه مورد نیاز است"
  }
  ```
- **پاسخ (`GroupReservationCheckoutResponse`):**
  ```json
  {
    "holdId": "hold-uuid-123",
    "paymentId": "payment-uuid-456",
    "paymentUrl": "https://gateway.zibal.ir/start/12345678",
    "token": "12345678",
    "expiresAt": "2026-11-06T18:10:00.000Z",
    "amount": 480000,
    "gamingCenterId": "center-uuid-789",
    "gamingCenterSlug": "respawn-club"
  }
  ```

### ۲.۴. تأیید پرداخت از سمت مرورگر (Client Callback Verify)
- **مسیر:** `POST /api/v1/payments/:paymentId/verify`
- **بدنه درخواست:**
  ```json
  {
    "authority": "12345678",
    "status": "OK"
  }
  ```
- **پاسخ (`PaymentVerifyResponse`):**
  ```json
  {
    "success": true,
    "paymentStatus": "PAID",
    "paymentState": "PAID",
    "reservationStatus": "CONFIRMED",
    "reservationId": "res-uuid-999",
    "groupBookingId": "group-uuid-888",
    "trackingCode": "TRK-2026-999",
    "amount": 480000,
    "refId": "REF-BANK-777",
    "cardPan": "6037********1234"
  }
  ```

### ۳.۴. وب‌هوک نامتقارن درگاه (Gateway Webhook)
- **مسیر:** `POST /api/v1/payments/webhook`
- سرور بدون وابستگی به مرورگر کاربر، رویداد پرداخت موثق را پردازش کرده و تبدیل اتمیک هولد به رزرو قطعی را تضمین می‌نماید.
