import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

export default function GlobalNotificationManager() {
  const { rider, token } = useAuth();
  const { showToast } = useToast();
  
  // Keep track of the last known status to detect changes
  const lastStatusRef = useRef<string | null>(null);
  
  // Track last message ID to know when a new message arrives
  const lastMessageIdRef = useRef<{ buyer: number; seller: number }>({ buyer: 0, seller: 0 });
  
  // Ref to track if we've initialized the message IDs for the current order
  const currentOrderIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token || !rider) return;

    const checkUpdates = async () => {
      try {
        const riderId = rider?.id || (rider as any)?.rider_id;
        if (!riderId) return;

        // 1. Check for Active Delivery Status changes
        const historyRes = await api.get(`/rider/${riderId}/history`);
        if (historyRes.data?.success && historyRes.data?.data?.deliveries) {
          const ongoing = historyRes.data.data.deliveries.find(
            (d: any) => d.status && d.status !== 'delivered' && d.status !== 'completed' && d.status !== 'cancelled'
          );

          if (ongoing) {
            const orderId = ongoing.order_id;
            
            // Check for status changes (e.g. food_ready)
            if (lastStatusRef.current && lastStatusRef.current !== ongoing.status) {
              if (ongoing.status === 'food_ready') {
                showToast('ออเดอร์พร้อมรับแล้ว!', 'ร้านค้าเตรียมอาหารเสร็จแล้ว มารับได้เลย', 'success');
              }
            }
            lastStatusRef.current = ongoing.status;
            
            // If the order changed, reset message tracking
            if (currentOrderIdRef.current !== orderId) {
                currentOrderIdRef.current = orderId;
                lastMessageIdRef.current = { buyer: 0, seller: 0 };
            }
            
            // 2. Poll for Unread Messages from both Seller and Buyer
            try {
                // Fetch buyer messages
                const buyerRes = await api.get(`/orders/${orderId}/messages?role=rider&target=buyer`);
                if (buyerRes.data?.success && Array.isArray(buyerRes.data.messages)) {
                    const buyerMsgs = buyerRes.data.messages;
                    if (buyerMsgs.length > 0) {
                        const latestBuyerMsg = buyerMsgs[buyerMsgs.length - 1];
                        if (lastMessageIdRef.current.buyer > 0 && latestBuyerMsg.id > lastMessageIdRef.current.buyer && latestBuyerMsg.sender_type !== 'rider') {
                            showToast('ข้อความใหม่จากลูกค้า', latestBuyerMsg.message || 'ส่งรูปภาพ', 'info');
                        }
                        lastMessageIdRef.current.buyer = Math.max(lastMessageIdRef.current.buyer, latestBuyerMsg.id);
                    }
                }

                // Fetch seller messages
                const sellerRes = await api.get(`/orders/${orderId}/messages?role=rider&target=seller`);
                if (sellerRes.data?.success && Array.isArray(sellerRes.data.messages)) {
                    const sellerMsgs = sellerRes.data.messages;
                    if (sellerMsgs.length > 0) {
                        const latestSellerMsg = sellerMsgs[sellerMsgs.length - 1];
                        if (lastMessageIdRef.current.seller > 0 && latestSellerMsg.id > lastMessageIdRef.current.seller && latestSellerMsg.sender_type !== 'rider') {
                            showToast('ข้อความใหม่จากร้านค้า', latestSellerMsg.message || 'ส่งรูปภาพ', 'info');
                        }
                        lastMessageIdRef.current.seller = Math.max(lastMessageIdRef.current.seller, latestSellerMsg.id);
                    }
                }
            } catch (msgErr) {
                // Silently ignore message fetch errors
            }

          } else {
             lastStatusRef.current = null;
             currentOrderIdRef.current = null;
          }
        }
        
        // 3. Poll for general notifications (Messages, Reviews, etc.)
        // Catch gracefully if backend endpoint doesn't exist yet
        const notifRes = await api.get(`/rider/notifications/unread`).catch(() => null);
        if (notifRes?.data?.success && notifRes.data.notifications) {
            const newNotifications = notifRes.data.notifications;
            newNotifications.forEach((notif: any) => {
                if (notif.type === 'review') {
                    showToast(`คุณได้รับคะแนนรีวิวใหม่!`, `${notif.rating} ดาว - ${notif.comment || ''}`, 'success');
                } else if (notif.type !== 'message') {
                    // System messages or others
                    showToast(notif.title, notif.message, 'info');
                }
            });
        }

      } catch (error) {
        // Silent fail for background polling
      }
    };

    checkUpdates();
    const interval = setInterval(checkUpdates, 5000); // Polling every 5 seconds for quicker message notification
    return () => clearInterval(interval);

  }, [token, rider, showToast]);

  return null;
}
