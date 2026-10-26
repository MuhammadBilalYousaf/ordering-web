import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Shell } from './components/Shell';
import { BusinessProvider } from './context/BusinessContext';
import { CartProvider } from './context/CartContext';
import { AccountPage } from './pages/AccountPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { OrderPage, OrdersPage, TrackPage } from './pages/OrdersPage';

function BusinessSite() {
  const { slug } = useParams();
  return (
    <BusinessProvider slug={slug}>
      <CartProvider slug={slug}>
        <Shell slug={slug}>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="track" element={<TrackPage />} />
            <Route path="order/:orderId" element={<OrderPage />} />
          </Routes>
        </Shell>
      </CartProvider>
    </BusinessProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/b/turknroll" replace />} />
        <Route path="/b/:slug/*" element={<BusinessSite />} />
      </Routes>
    </BrowserRouter>
  );
}
