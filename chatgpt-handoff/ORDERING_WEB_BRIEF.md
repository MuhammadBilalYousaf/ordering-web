# Customer ordering website (ordering-web)

Paste this file into ChatGPT together with the PNG screenshots in the same folder.

This is the public customer site for QR / link ordering. It is a separate Vite + React app. It is not the StaffPro Flutter staff app. Both share the Firebase project `turknroll-management-app`. StaffPro Business Admin publishes the restaurant and the menu. This site reads them and writes customer orders that staff can see.

Local URL: http://localhost:5173/
Live restaurant used in screenshots: http://localhost:5173/b/turknroll
Root `/` redirects to `/b/turknroll`.

Stack: React 19, React Router 7, Tailwind CSS 3, Vite 8, Firebase Auth + Firestore. Currency helper prints Pakistani rupees as `Rs 200`. Colors: ink `#14213d`, brand orange `#c2410c`, page background `#f6f3ef`.

## Screenshots to attach

- `ordering-home.png` — desktop home
- `ordering-menu.png` — desktop menu, 6 columns, category chips, Search, view-cart bar
- `ordering-menu-mobile.png` — phone width, 3 items per row, bottom navigation (the shot is the phone layout in the left of a wide canvas)
- `ordering-cart.png` — cart with quantity and checkout
- `ordering-checkout.png` — name, phone, takeaway/dine-in, notes, manual payment
- `ordering-account.png` — guest sign-in / sign-up

## Layout rules already implemented

Breakpoint is Tailwind `md` (768px).

Desktop (`md` and up):
- Sticky top bar: restaurant name, then Home, Menu, Cart (badge), Orders, Account. Active item is a dark pill.
- Content max width `max-w-6xl`, centered.
- No bottom tab bar.
- Page content fades/rises in (`.page-enter`). Product cards rise in (`.card-pop`).

Phone (under 768px):
- No top bar.
- Fixed bottom tab bar: Home, Menu, Cart, Orders, Account, with icons.
- Menu grid is 3 columns, compact cards (square photo, two-line name, price, small Add).
- Desktop menu grid grows: 3, then 4, then 5, then 6 columns. Cards must not become huge.

## Routes

All under `/b/:slug/`:

| Path | Page |
| --- | --- |
| `` (index) | Home |
| `menu` | Menu |
| `cart` | Cart |
| `checkout` | Checkout |
| `orders` | Order list |
| `track` | Look up an order number saved on this phone |
| `order/:orderId` | Live order status |
| `account` | Sign in, sign up, guest, or signed-in profile + loyalty |

## Home

Navy welcome block with the business name and a short guest/sign-in line. Cards: Browse the menu, Cart total (or Empty), Account (Guest or the signed-in name), and Pay to (account name, number, instructions, optional payment QR image). On desktop these cards sit in one row under a rounded hero.

## Menu

Data comes from Firestore `publicMenus/{businessId}`. Categories have `active`. Products have `available`, `name`, `description`, `imageUrl`, `price`, optional `variants[]` (`id`, `name`, `price`), optional `addons[]` (`id`, `name`, `price`).

Horizontal chip row of categories, sticky under the header. Selected chip is dark.

Search button opens a dialog. The query matches product name and description across every category. A result shows the category name and price. Choosing a result uses the same add behavior as a card.

Add behavior:
- If the product has more than one variant or any addon, a sheet opens (bottom sheet on phone, centered dialog on desktop) to pick variant, toggle addons, set quantity, then Add.
- Otherwise it adds immediately with the first variant (or none).
- Cart line key is `productId|variantId|sortedAddonIds`. Same key increases quantity.

A floating “View cart · Rs …” bar shows when the cart is not empty.

## Cart

Lines show photo, name, variant and addons, line total, minus / quantity / plus, and a remove ×. Minus stops at 1. Total and a Checkout button. Empty state points the customer back to the menu. Cart is stored in `localStorage` per slug.

## Checkout

Requires name (min 2), phone (min 7), payment reference (min 3), and a payment screenshot image. Order types: Takeaway or Dine-in. Dine-in asks “Serve at my seat” (table/seat note, min 3 characters) or “I’ll collect it”. Optional order notes, max 500 characters.

Payment is manual (EasyPaisa / JazzCash style). The page shows the business payment account, instructions, and QR. The customer uploads a receipt image. The image is compressed and OCR (tesseract.js) tries to fill the reference. The image is stored on the order as a data URL.

Signed-in customers with loyalty points can redeem. 1 point = Rs 1 discount. Redeem cannot exceed the balance or the subtotal. Guests cannot redeem. Earn rate is 1 point per Rs 10 spent, awarded later when the order is completed (not at checkout).

On success the cart clears and the app opens the order page. Anonymous Firebase sign-in is required for guests. A real account is email/password.

## Orders and tracking

Guests: orders are remembered on this phone only. Signed-in users: Firestore `customerOrders` where `customerUid` matches, plus any local orders for that email.

Each row shows up to three item photos, order number, total, and a friendly status. Tapping opens the order page, which live-updates.

Statuses, in the happy path: Waiting for payment check → Payment verified → Accepted → Being prepared → Ready → Completed. Also Payment was not accepted and Cancelled.

Track page only searches orders already saved on this phone.

## Account

Guest: Sign in (email, password), Sign up (name, email, phone, password), or Continue as guest.

Signed in: gradient profile card, email, phone, loyalty balance and activity (Earned / Redeemed / Reversed), link to orders, Sign out.

## Firestore (do not invent new collections)

- `publicBusinesses/{slug}` — written by StaffPro. Must be `status: active`. Fields used: `businessId`, `name`, `branchId`, `paymentAccountName`, `paymentAccountNumber`, `paymentInstructions`, `paymentQrUrl`.
- `publicMenus/{businessId}` — `{ categories: [...] }` as described above.
- `customerOrders/{id}` — created here. Important fields: `businessId`, `branchId`, `customerUid`, `customerName`, `phone`, `customerEmail`, `customerKind` (`guest` or `account`), `orderType` (`takeaway` or `dineIn`), `seatingNote`, `dineInPickup`, `items[]`, `subtotal`, `loyaltyDiscount`, `pointsRedeemed`, `total`, `orderNotes`, `paymentMethod: manual`, `paymentReference`, `paymentProofUrl`, `paymentStatus`, `orderStatus`, `orderNumber` (last 6 digits of timestamp), `slug`.
- `loyaltyAccounts/{businessId}_{uid}` and subcollection `transactions`.

New orders start as `paymentStatus` and `orderStatus` = `PENDING_PAYMENT_VERIFICATION`. Staff change status in StaffPro. This site only listens.

## What ChatGPT should preserve

Keep the slug-based public site, Firebase shape, guest checkout, manual payment plus screenshot, loyalty math, and the desktop-top / phone-bottom navigation. Menu stays dense: at least 3 columns on a phone, up to 6 on a large screen, cards compact. Search stays across all categories.
