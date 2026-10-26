# Customer ordering site

Separate website for QR ordering. It is not part of the StaffPro Flutter app.

It uses the same Firebase project as StaffPro (`turknroll-management-app`):

- `publicBusinesses/{slug}` and `publicMenus/{businessId}` are written from the StaffPro Business Admin screens
- `customerOrders` are created here and can be read by StaffPro staff

## Run

```bash
cd ordering-web
npm install
npm run dev
```

TurknRoll: http://localhost:5173/b/turknroll

## Deploy

```bash
npm run build
firebase deploy --only hosting
```

Anonymous sign-in must be enabled in the Firebase console before a customer can place an order.
