import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { rtdbGet } from '../lib/rtdb';
import { useAuth } from '../context/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { CheckCircle, Package, Truck, Calendar, MapPin, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { safeStorage } from '../utils/storage';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(() => {
    if (orderId) {
      try {
        const localCached = safeStorage.getItem(`pending_order_${orderId}`);
        if (localCached) return JSON.parse(localCached);
      } catch (e) {
        // ignore
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const orderData = await rtdbGet<any>(`orders/${orderId}`);
        if (orderData) {
          setOrder(orderData);
        } else if (!order) {
          try {
            const localCached = safeStorage.getItem(`pending_order_${orderId}`);
            if (localCached) {
              setOrder(JSON.parse(localCached));
            } else {
              toast.error('Order not found');
            }
          } catch (e) {
            toast.error('Order not found');
          }
        }
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 ">
        <Loader2 className="h-10 w-10 text-primary-main animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      <main className="flex-grow pt-4 sm:pt-8 md:pt-10 pb-24 sm:pb-16 px-3 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl mx-auto w-full">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-sm border border-gray-100 text-center w-full overflow-hidden"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 md:mb-8"
            >
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" />
            </motion.div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-4 px-1">
              Thank you for your order!
            </h1>
            <p className="text-xs sm:text-base md:text-lg text-gray-600 mb-5 sm:mb-8 max-w-lg mx-auto leading-relaxed px-1">
              Your order has been placed successfully. We will send you an email confirmation with your order details.
            </p>

            <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 mb-6 sm:mb-8 text-left border border-gray-100 w-full">
              <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">Order Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 md:gap-6">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <Package className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Order ID</p>
                    <p className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base break-all select-all font-mono">{order?.orderId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <Calendar className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Date</p>
                    <p className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base">
                      {order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <Truck className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Status</p>
                    <p className="font-semibold text-primary-main text-xs sm:text-sm md:text-base">{order?.status || 'Processing'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 sm:col-span-2">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Shipping To</p>
                    <p className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base break-words">
                      {order?.shippingAddress?.fullAddress || 'N/A'}
                    </p>
                  </div>
                </div>
                {order?.paymentGateway && (
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 sm:col-span-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-500">Payment Gateway</p>
                      <p className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base break-words">
                        {order.paymentGateway} {order.paymentMethod ? `(${order.paymentMethod.toUpperCase()})` : ''}
                      </p>
                      {order.transactionId && (
                        <p className="text-[11px] sm:text-xs text-gray-500 font-mono mt-0.5 break-all">
                          Trx ID: {order.transactionId}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center items-stretch sm:items-center w-full">
              <Link 
                to={`/orders/${orderId}`} 
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-primary-main text-white text-xs sm:text-sm md:text-base font-semibold rounded-xl hover:bg-sky-600 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Truck className="h-4 w-4 shrink-0" />
                <span>Track Order</span>
              </Link>
              <Link 
                to="/orders" 
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-800 text-xs sm:text-sm md:text-base font-semibold rounded-xl hover:bg-gray-200 active:scale-[0.99] transition-all flex items-center justify-center"
              >
                <span>My Orders</span>
              </Link>
              <Link 
                to="/" 
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 border border-gray-200 text-gray-700 text-xs sm:text-sm md:text-base font-semibold rounded-xl hover:bg-gray-50 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <span>Continue Shopping</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
