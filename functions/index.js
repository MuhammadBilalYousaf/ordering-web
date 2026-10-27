const { initializeApp } = require('firebase-admin/app');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const webpush = require('web-push');

initializeApp();

const publicKey = 'BB5HcsiS8ffOVrIHLPDuQniGf-atxp91aPYdnTq67m0Evl5VKiOVHHLrcfIgWniOM3FJqYsEhEitx14acl7zct0';
const privateKey = 'M6t3oSVOK4DiOlDZgTIF6x9hS8I-mQXlyk0ZKtsoG7Y';
webpush.setVapidDetails('mailto:orders@turknroll-management-app.web.app', publicKey, privateKey);

const labels = {
  PENDING_PAYMENT_VERIFICATION: 'Waiting for payment check',
  PAYMENT_VERIFIED: 'Payment verified',
  PAYMENT_REJECTED: 'Payment was not accepted',
  ACCEPTED: 'Your order was accepted',
  PREPARING: 'Your order is being prepared',
  READY: 'Your order is ready',
  COMPLETED: 'Your order is completed',
  CANCELLED: 'Your order was cancelled',
};

exports.orderStatusPush = onDocumentUpdated('customerOrders/{orderId}', async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  if (!after.orderStatus || before.orderStatus === after.orderStatus) return;
  if (!after.notifyEndpoint || !after.notifyP256dh || !after.notifyAuth) return;
  const slug = after.slug || 'turknroll';
  const url = `https://turknroll-management-app.web.app/b/${slug}/order/${event.params.orderId}`;
  try {
    await webpush.sendNotification({
      endpoint: after.notifyEndpoint,
      keys: { p256dh: after.notifyP256dh, auth: after.notifyAuth },
    }, JSON.stringify({
      title: `Order ${after.orderNumber || ''}`.trim(),
      body: labels[after.orderStatus] || 'Your order was updated',
      url,
    }));
  } catch (error) {
    console.error(error);
  }
});
