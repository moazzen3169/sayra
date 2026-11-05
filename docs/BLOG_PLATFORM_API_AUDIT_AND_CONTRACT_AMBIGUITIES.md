# مستند ممیزی و ابهامات قرارداد بک‌اند پلتفرم وبلاگ سایرا (فاز ۱)

این سند تحلیل و ممیزی قرارداد API وبلاگ سایرا بر اساس فایل `Blog-Platform-API.yaml`، معماری پروژه و زیرساخت فرانت‌اند را مشخص می‌کند. این موارد باید قبل از فاز ۲ (مهاجرت نهایی UI و کامپوننت‌ها به API زنده) تعیین تکلیف شوند.

---

## ۱. پیش‌وند نهایی API (API Path Prefix & Base URL Alignment)

### وضعیت فعلی:
- فایل `src/lib/api/config.ts` متغیر `API_BASE_URL` را با مقدار پیش‌فرض `http://51.20.249.108/api/v1/` یا متغیر محیطی `NEXT_PUBLIC_API_BASE_URL` تنظیم می‌کند.
- تابع `buildUrl` در `src/lib/api/client.ts` مقدار `API_BASE_URL.replace(/\/+$/, '')` را با مسیر ورودی ترکیب می‌کند: `${base}${path}`.
- فایل `Blog-Platform-API.yaml` تمام اندپوینت‌ها را با پیشوند `/api/` (مثلاً `/api/articles/`، `/api/categories/`) تعریف کرده است، نه `/api/v1/articles/`.
- اگر مسیر اندپوینت در کلاینت `/articles/` باشد، همراه با Base URL فعلی به `http://51.20.249.108/api/v1/articles/` ارسال می‌شود.
- در تست زنده شبکه، درخواست مستقیم به سرور دمو روی هر دو آدرس `http://51.20.249.108/api/articles/` و `http://51.20.249.108/api/v1/articles/` کد وضعیت `404 Not Found` بازمی‌گرداند؛ زیرا پلتفرم وبلاگ ممکن است روی سرویس یا هاست جداگانه‌ای دیپلوی شده باشد یا نیاز به Reverse Proxy Nginx مجزا داشته باشد.

### تصمیم زیرساختی فاز ۱:
- مسیرهای اندپوینت در `ENDPOINTS.blog` به صورت نسبی به Base URL و با الگوی `/articles/`، `/categories/`، `/tags/`، `/media/` و `/authors/` تعریف شدند تا از دوبار تکرار پیش‌وند جلوگیری شود و در عین حال در صورت تغییر Base URL مستقل در آینده (`NEXT_PUBLIC_BLOG_API_BASE_URL` یا proxy mapping) نیازی به تغییر اندپوینت‌ها نباشد.

---

## ۲. پشتیبانی از فیلتر `status` در اندپوینت `GET /articles/`

### وضعیت فعلی:
- در فایل `Blog-Platform-API.yaml` در بخش پارامترهای کوئری اندپوینت `GET /api/articles/` فقط این موارد مستند شده‌اند:
  - `category` (string)
  - `is_hot` (boolean)
  - `ordering` (string)
  - `page` (integer)
  - `page_size` (integer)
  - `published_after` (date-time)
  - `published_before` (date-time)
  - `search` (string)
  - `series` (integer)
  - `tags` (array of string)
  - `visibility` (enum: `public`, `private`, `unlisted`)
- فیلتر `status` (مانند `draft`, `review`, `scheduled`, `published`, `archived`) در لیست پارامترهای متد `GET /api/articles/` در مستندات وجود ندارد!
- پنل مدیریت وبلاگ نیاز دارد مقاله‌های پیش‌نویس (DRAFT) یا بایگانی‌شده (ARCHIVED) را فیلتر و مشاهده کند.

### وضعیت ابهام:
- **Blocker / نیاز به تایید بک‌اند:** آیا فیلتر `status` در کوئری پارامترهای سرور پذیرفته می‌شود یا وضعیت از طریق `visibility` کنترل می‌گردد؟ در لایه سرویس تایپ شده `ArticleListQueryParams.status` به صورت اختیاری پشتیبانی شده اما ارسال آن نیازمند تایید سمت سرور است.

---

## ۳. ساختار واقعی تعاریف بلوک‌ها (Block Definitions Schema)

### وضعیت فعلی:
- اندپوینت `GET /api/articles/block-definitions/` با توضیح `"Returns the complete content contract specifications list for headless components"` تعریف شده است.
- اما در OpenAPI Schema مقدار بازگشتی آن به اشتباه به `StdArticleBlock_definitionsGetArticleListSerializer200` ارجاع داده شده که فیلد `data` آن از نوع `ArticleList` است!
- این ارجاع در مستندات یک خطای آشکار تایپی (Copy-Paste Error) در اسکیما است، چرا که تعاریف بلوک‌های محتوا (بلوک‌های ادیتور نظیر Heading، Paragraph، List، Quote، Code، Image و غیـره) نمی‌تواند خود یک مقاله منفرد (`ArticleList`) باشد.

### وضعیت ابهام:
- ساختار دقیق آرایه تعاریف بلوک در مستندات مشخص نیست. در فرانت‌اند `BlockDefinitionDto` به صورت منعطف و باز (`Record<string, unknown>`) مدل شده تا ساختار تخیلی ایجاد نشود.

---

## ۴. نوع واقعی `cover_image_id` (Integer vs String UUID/Key)

### وضعیت فعلی:
- در مدل `ArticleDetail` و `ArticleList` فیلد شناسه رسانه `cover_image.id` از نوع `integer` (عددی) است:
  ```yaml
  MediaDetail:
    properties:
      id:
        type: integer
  ```
- اما در مدل ایجاد و به‌روزرسانی مقاله `ArticleCreateUpdateRequest`:
  ```yaml
  cover_image_id:
    type: string
    writeOnly: true
    nullable: true
  og_image_id:
    type: string
    writeOnly: true
    nullable: true
  ```
  نوع `cover_image_id` به عنوان `string` مشخص شده است!

### وضعیت ابهام:
- آیا مقدار ارسالی در `cover_image_id` باید شناسه عددی تبدیل‌شده به رشته باشد (مانند `"12"`)، یا `storage_key` رسانه است؟
- فرانت‌اند این فیلد را به عنوان `string | null` تعریف کرده و هنگام ارسال، در صورت داشتن عدد، تبدیل به رشته می‌شود.

---

## ۵. ساختار دوگانه و ناهمگون صفحه‌بندی (Pagination Schema Inconsistency)

### وضعیت فعلی:
در فایل `Blog-Platform-API.yaml` دو ساختار کاملاً متمایز برای صفحه‌بندی گزارش شده است:
1. **ساختار DRF Paginated Response:**
   ```json
   {
     "count": 123,
     "next": "http://api.example.org/?page=4",
     "previous": "http://api.example.org/?page=2",
     "results": [ ... ]
   }
   ```
2. **ساختار پاکت استاندارد Sayra با شیء درون‌برنامه‌ای:**
   ```json
   {
     "data": [ ... ],
     "messagesList": [],
     "pagination": {
       "pageNo": 1,
       "pageSize": 10,
       "totalPage": 1,
       "totalCount": 10,
       "lastId": null
     }
   }
   ```
3. علاوه بر این، در برخی اندپوینت‌های DRF مانند `PaginatedStdArticleListGetArticleListSerializer200List` اعضای درون `results` خود یک پاکت مجدد هستند:
   `results: [ { data: { id, title, ... }, messagesList: [] } ]`

### راه‌حل پیاده‌سازی شده در Normalizer:
- تابع `normalizeListResponse` در `src/lib/api/blogNormalizer.ts` هر دو ساختار، به‌همراه بازکردن بسته‌های تودرتوی `{ data }` داخل اعضای `results`، و همچنین آرایه‌های ساده مستقیم را شناسایی و به خروجی یکدست و امن `BlogPaginatedResult<T>` نرمالایز می‌کند.

---

## نتیجه‌گیری فاز ۱
تمام زیرساخت‌های لازم (Endpointها، DTOها، Normalizer، Mapper و Service) پیاده‌سازی شدند و هیچ تغییری در صفحات UI یا داده‌های آزمایشی ایجاد نشده است.
