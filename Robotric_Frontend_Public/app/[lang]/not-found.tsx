import Link from 'next/link';

// Shown for unknown pages inside /en or /ar (bilingual, since not-found pages don't receive route params)
export default function NotFound() {
  return (
    <section className="section">
      <div className="container container--narrow">
        <div className="soon">
          <span className="label">404</span>
          <h1 className="h-section">Page not found · الصفحة غير موجودة</h1>
          <p>The page you are looking for doesn’t exist or has moved. · الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
          <div className="btn-row">
            <Link className="btn btn--primary" href="/en">Home</Link>
            <Link className="btn btn--outline" href="/ar">الرئيسية</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
