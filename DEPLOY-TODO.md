# چک‌لیست انتشار رایگان Brass

هدف این است که لیگ خصوصی و غیرتجاری روی اینترنت در دسترس اعضای تأییدشده باشد، با هزینهٔ ماهانهٔ صفر و بدون خرید دامنه. بعد از هر مرحله، نتیجه و موارد باز را همین‌جا ثبت می‌کنیم.

## سرویس‌ها

- **Vercel Hobby** برای Next.js و آدرس رایگان `*.vercel.app`. این پلن برای استفادهٔ شخصی و غیرتجاری است. [پلن Hobby](https://vercel.com/docs/plans/hobby) · [دامنهٔ پیش‌فرض](https://vercel.com/docs/domains/working-with-domains)
- **Supabase Free** برای دیتابیس و Auth. سقف دو پروژهٔ فعال رایگان بین حساب‌ها و سازمان‌هایی است که در آن‌ها مالک یا ادمین هستی. هر پروژه ۵۰۰ مگابایت ظرفیت دیتابیس دارد و ممکن است بعد از حدود یک هفته کم‌فعالیتی متوقف شود. بکاپ را دستی می‌گیریم. [ظرفیت و هزینه‌ها](https://supabase.com/pricing) · [سقف پروژه‌ها](https://supabase.com/docs/guides/platform/billing-on-supabase) · [بکاپ رایگان](https://supabase.com/kb/faqs/platform/free-plan-backups)
- **Brevo Free** گزینهٔ اول برای SMTP، با سقف ۳۰۰ ایمیل در روز. بدون دامنهٔ تأییدشده ممکن است آدرس فرستنده بازنویسی شود. انتخاب این سرویس به فعال‌شدن SMTP و تحویل موفق ایمیل ثبت‌نام و بازیابی در Staging بستگی دارد. SMTP پیش‌فرض Supabase برای ایمیل اعضای خارج از تیم پروژه مناسب نیست. [سقف Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) · [آدرس فرستنده](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders) · [SMTP در Supabase](https://supabase.com/docs/guides/auth/auth-smtp)

## ۱. تثبیت نسخه

- [x] Build پروداکشن، lint، بررسی TypeScript در Build و دو مسیر E2E Chromium روی Supabase محلی پاس شدند.
- [x] Diff را مرور کردیم. فایل‌های env محلی، بکاپ‌ها و خروجی Playwright نادیده گرفته می‌شوند و اسکن تغییرات کلید محرمانهٔ واقعی پیدا نکرد.
- [x] نسخهٔ فعلی روی شاخهٔ محلی `codex/free-deploy-step-1` commit شد. هنوز چیزی push یا deploy نشده است.

## ۲. پیش‌انتشار رایگان

- [x] یک پروژهٔ Staging جدا با پلن Free ساخته شد و در Dashboard وضعیت Healthy دارد. منطقهٔ انتخاب‌شده ap-south-1 (Mumbai) است.
- [x] Supabase CLI به شناسهٔ ۲۰ حرفی پروژهٔ Staging متصل شد.
- [x] فهرست و dry-run روی brass-staging موفق بود و هر سه migration به‌ترتیب اعمال شدند. Migration پایه فقط برای ساخت Staging خالی استفاده شد و در Production دوباره اجرا نشد.
- [x] در `brass-staging` گزینهٔ **Allow new users to sign up** خاموش است و **Confirm email** روشن است.
- [x] در `brass-staging`، Hook فعال **Before User Created** به تابع Postgres `public.before_user_created` متصل شد. رفتار آن هنوز با signup واقعی در Staging آزمایش نشده است.
- [ ] Vercel Hobby را به نسخهٔ آزمایشی وصل کنیم. آدرس ثابت آزمایشی، متغیرهای Preview و مسیرهای تأیید و بازیابی را طبق [README](./README.md#supabase-configuration) تنظیم کنیم. کلیدهای Preview فقط متعلق به Staging باشند.
- [ ] SMTP رایگان را در Staging راه‌اندازی کنیم و ایمیل تأیید و بازیابی را روی حساب‌های آزمایشی دریافت کنیم.
- [ ] با ثبت‌نام آزمایشی در Staging بررسی کنیم که درخواست تأییدنشده از خود Supabase هم رد می‌شود، حساب تأیید‌نشده به داده‌ها دسترسی ندارد، لغو عضویت نشست موجود را از داده‌ها محروم می‌کند و تورنمنت‌ها و تاریخچه درست کار می‌کنند.

## ۳. انتشار و نگهداری

- [ ] از دیتابیس فعلی بکاپ دستی بگیریم و بازیابی حساب‌ها و تاریخچه را روی محیط جدا تأیید کنیم.
- [ ] پس از تأیید مقصد پروداکشن، فهرست مهاجرت‌های در انتظار را مرور کنیم و فقط دو مهاجرت جدید را اعمال کنیم.
- [ ] همان نسخهٔ تأییدشده را با متغیرهای Production و رمز و کلید نشست تازهٔ ادمین روی Vercel منتشر کنیم. ثبت‌نام تا بررسی Hook، مسیرهای HTTPS و تحویل ایمیل بسته بماند.
- [ ] ورود اعضای قبلی و نمایش تاریخچه را بررسی کنیم. سپس ثبت‌نام را با چند ایمیل از پیش تأییدشده آغاز کنیم.
- [ ] مصرف پلن‌های رایگان، هشدار توقف Supabase و بکاپ دستی دوره‌ای را پیگیری کنیم.

**مرحلهٔ فعلی:** تثبیت محلی نسخه کامل شد. مرحلهٔ بعد بررسی ظرفیت Supabase Free برای Staging است.
