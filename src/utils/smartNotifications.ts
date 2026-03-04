/**
 * Smart Notifications Service
 * Monitors inventory and sends real-time alerts for low stock, payments, etc.
 */

interface NotificationAlert {
  id: string;
  type: "low-stock" | "payment-due" | "tax-deadline" | "inventory-alert";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

// Local storage key for notifications
const NOTIFICATIONS_KEY = "nayance_notifications";
const LOW_STOCK_THRESHOLD = 10; // Alert if stock < 10

/**
 * Get all alerts from local storage
 */
export function getNotifications(): NotificationAlert[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add new notification
 */
export function addNotification(alert: Omit<NotificationAlert, "id" | "timestamp" | "read">): NotificationAlert {
  const newNotification: NotificationAlert = {
    ...alert,
    id: Date.now().toString(),
    timestamp: new Date(),
    read: false,
  };

  const notifications = getNotifications();
  notifications.push(newNotification);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));

  // Send browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(alert.title, {
      body: alert.message,
      icon: "/nayance-logo.jpeg",
    });
  }

  return newNotification;
}

/**
 * Clear all notifications
 */
export function clearNotifications(): void {
  localStorage.removeItem(NOTIFICATIONS_KEY);
}

/**
 * Mark notification as read
 */
export function markAsRead(notificationId: string): void {
  const notifications = getNotifications();
  const notification = notifications.find((n) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }
}

/**
 * Check inventory and create low-stock alerts
 * @param products - Array of products with stock levels
 */
export function checkLowStock(products: Array<{ id: string; name: string; stock: number }>): void {
  const existingNotifications = getNotifications();

  products.forEach((product) => {
    if (product.stock < LOW_STOCK_THRESHOLD) {
      // Check if we already have a low stock alert for this product
      const hasExisting = existingNotifications.some(
        (n) =>
          n.type === "low-stock" &&
          n.message.includes(product.id) &&
          !n.read
      );

      if (!hasExisting) {
        addNotification({
          type: "low-stock",
          title: `⚠️ Low Stock Alert`,
          message: `${product.name} stock is running low (${product.stock} units remaining). Consider reordering.`,
          action: {
            label: "Reorder",
            url: "/inventory-manager",
          },
        });
      }
    }
  });
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Get unread notification count
 */
export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

/**
 * Create payment due notification
 */
export function createPaymentNotification(daysUntilDue: number): void {
  if (daysUntilDue <= 3) {
    addNotification({
      type: "payment-due",
      title: "💳 Payment Due Soon",
      message: `Payment is due in ${daysUntilDue} days. Please settle your account.`,
      action: {
        label: "Pay Now",
        url: "/billing-plan",
      },
    });
  }
}

/**
 * Create tax deadline notification
 */
export function createTaxNotification(daysUntilDeadline: number): void {
  if (daysUntilDeadline <= 7) {
    addNotification({
      type: "tax-deadline",
      title: "📊 Tax Deadline Approaching",
      message: `Tax deadline is in ${daysUntilDeadline} days. Review your financial reports.`,
      action: {
        label: "View Reports",
        url: "/financial-reports",
      },
    });
  }
}
