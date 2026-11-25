const fs = require('fs');

const fileContent = `import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Eye, X } from 'lucide-react';
import axios from 'axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.get(\`\${apiUrl}/api/admin/orders\`);
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId) => {
    setIsModalOpen(true);
    setLoadingDetails(true);
    setOrderDetails(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.get(\`\${apiUrl}/api/orders/\${orderId}\`);
      if (response.data.success) {
        setOrderDetails(response.data.order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOrderDetails(null);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'รอดำเนินการ' },
      completed: { color: 'bg-green-100 text-green-800', text: 'เสร็จสิ้น' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'ยกเลิกแล้ว' },
      delivered: { color: 'bg-blue-100 text-blue-800', text: 'จัดส่งแล้ว' },
      delivering: { color: 'bg-indigo-100 text-indigo-800', text: 'กำลังจัดส่ง' }
    };

    const s = statusMap[status] || { color: 'bg-slate-100 text-slate-800', text: status };
    
    return (
      <span className={\`px-2 py-1 rounded-full text-xs font-medium \${s.color}\`}>
        {s.text}
      </span>
    );
  };

  const filteredOrders = orders.filter(order => 
    order.order_id?.toString().includes(searchTerm) ||
    order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.shop_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <ShoppingCart className="w-8 h-8 mr-3 text-primary-600" />
            คำสั่งซื้อทั้งหมด
          </h1>
          <p className="text-slate-500 mt-1">จัดการและดูประวัติคำสั่งซื้อทั้งหมดในระบบ</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหารหัสคำสั่งซื้อ, ชื่อผู้ซื้อ, ชื่อร้านค้า..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            <Filter className="w-5 h-5 mr-2" />
            ตัวกรอง
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-4 font-medium rounded-tl-lg">รหัสออเดอร์</th>
                <th className="px-6 py-4 font-medium">ผู้ซื้อ</th>
                <th className="px-6 py-4 font-medium">ร้านค้า</th>
                <th className="px-6 py-4 font-medium text-right">ยอดรวม</th>
                <th className="px-6 py-4 font-medium">ประเภท</th>
                <th className="px-6 py-4 font-medium">สถานะ</th>
                <th className="px-6 py-4 font-medium text-center rounded-tr-lg">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      #ORD-{order.order_id}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{order.buyer_name || 'ไม่ระบุ'}</td>
                    <td className="px-6 py-4 text-slate-600">{order.shop_name || 'ไม่ระบุ'}</td>
                    <td className="px-6 py-4 text-slate-900 font-bold text-right">
                      ฿{Number(order.total_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 capitalize">
                      {order.delivery_type === 'delivery' ? 'จัดส่ง' : 'รับที่ร้าน'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.order_status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleViewOrder(order.order_id)}
                        className="text-primary-600 hover:text-primary-800 transition-colors p-2 rounded-lg hover:bg-primary-50"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    ไม่พบข้อมูลคำสั่งซื้อ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">รายละเอียดใบเสร็จ (e-Receipt)</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[80vh] overflow-y-auto bg-slate-50">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                </div>
              ) : orderDetails ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 font-mono text-sm">
                  {/* Receipt Header */}
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-green-700">Smart Deal</h2>
                    <p className="text-slate-500 text-[10px] mt-1">e-Receipt / ใบเสร็จรับเงินอิเล็กทรอนิกส์</p>
                  </div>
                  
                  {/* Order Info */}
                  <div className="space-y-1.5 mb-6 text-slate-700 text-xs">
                    <p><strong>Order ID:</strong> #{orderDetails.order_id}</p>
                    <p><strong>Date:</strong> {new Date(orderDetails.created_at).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>Shop:</strong> {orderDetails.shops?.map(s => s.shop_name).join(', ') || orderDetails.shop_name || 'หลายร้าน'}</p>
                    <p><strong>Payment Method:</strong> {orderDetails.payment_method === 'promptpay' ? 'PromptPay' : orderDetails.payment_method}</p>
                  </div>
                  
                  {/* Items Table */}
                  <table className="w-full mb-6 text-xs">
                    <thead>
                      <tr className="border-y border-slate-200">
                        <th className="py-2 text-left font-semibold">รายการ (Item)</th>
                        <th className="py-2 text-center font-semibold w-16">จำนวน (Qty)</th>
                        <th className="py-2 text-right font-semibold w-20">ราคา (Price)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderDetails.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 text-slate-700 pr-2">{item.product_name}</td>
                          <td className="py-2 text-center text-slate-700">{item.quantity}</td>
                          <td className="py-2 text-right text-slate-700">฿{Number(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Summary */}
                  <div className="space-y-1 text-right border-t border-slate-200 pt-4 text-xs">
                    <p className="text-slate-600">ค่าจัดส่ง (Delivery Fee): ฿{Number(orderDetails.delivery_fee).toFixed(2)}</p>
                    <p className="text-slate-600">ส่วนลด (Discount): ฿{Number(orderDetails.discount || 0).toFixed(2)}</p>
                    <p className="text-sm font-bold text-slate-900 mt-2">ยอดชำระสุทธิ (Total): ฿{Number(orderDetails.total_amount).toFixed(2)}</p>
                  </div>
                  
                  {/* Footer */}
                  <div className="text-center mt-8 text-slate-300 text-[9px]">
                    <p>ขอบคุณที่ใช้บริการ Smart Deal</p>
                    <p>เอกสารนี้สร้างขึ้นโดยระบบอิเล็กทรอนิกส์</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  ไม่พบข้อมูลรายละเอียดคำสั่งซื้อ
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <button onClick={closeModal} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">
                ปิด (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
`;

fs.writeFileSync('C:\\smartdealadmin\\src\\pages\\Orders.jsx', fileContent);
