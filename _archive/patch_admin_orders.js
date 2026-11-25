const fs = require('fs');
const path = require('path');

// 1. Patch server.js
const serverJsPath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
let serverJs = fs.readFileSync(serverJsPath, 'utf8');
if (!serverJs.includes('/api/admin/orders')) {
    const adminOrdersApi = `
app.get('/api/admin/orders', async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(\`
        SELECT o.*, 
               u.username as buyer_name, 
               s.shop_name 
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN shops s ON o.shop_id = s.shop_id
        ORDER BY o.created_at DESC
      \`);
      res.json({ success: true, orders: rows });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('API /api/admin/orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

`;
    // Insert before app.listen
    const insertIndex = serverJs.lastIndexOf('app.listen');
    if (insertIndex !== -1) {
        serverJs = serverJs.slice(0, insertIndex) + adminOrdersApi + serverJs.slice(insertIndex);
        fs.writeFileSync(serverJsPath, serverJs);
        console.log('Patched server.js');
    } else {
        console.error('Could not find app.listen in server.js');
    }
}

// 2. Patch App.jsx
const appJsxPath = 'C:\\smartdealadmin\\src\\App.jsx';
let appJsx = fs.readFileSync(appJsxPath, 'utf8');
if (!appJsx.includes('import Orders from')) {
    appJsx = appJsx.replace("import Dashboard from './pages/Dashboard';", "import Dashboard from './pages/Dashboard';\nimport Orders from './pages/Orders';");
    appJsx = appJsx.replace('<Route index element={<Dashboard />} />', '<Route index element={<Dashboard />} />\n          <Route path="orders" element={<Orders />} />');
    fs.writeFileSync(appJsxPath, appJsx);
    console.log('Patched App.jsx');
}

// 3. Patch Sidebar.jsx
const sidebarJsxPath = 'C:\\smartdealadmin\\src\\components\\Sidebar.jsx';
let sidebarJsx = fs.readFileSync(sidebarJsxPath, 'utf8');
if (!sidebarJsx.includes('/orders')) {
    // Add ShoppingCart to imports if not there
    if (!sidebarJsx.includes('ShoppingCart')) {
        sidebarJsx = sidebarJsx.replace('import { \n  LayoutDashboard,', 'import { \n  LayoutDashboard,\n  ShoppingCart,');
    }
    
    // Add to navItems
    const navItemString = "{ name: 'คำสั่งซื้อ', path: '/orders', icon: ShoppingCart },\n    ";
    
    // Find the first navItem to inject after Dashboard
    const dashboardIndex = sidebarJsx.indexOf("path: '/'");
    if (dashboardIndex !== -1) {
        const endOfDashboardLine = sidebarJsx.indexOf('},', dashboardIndex) + 2;
        sidebarJsx = sidebarJsx.slice(0, endOfDashboardLine) + "\n    " + navItemString + sidebarJsx.slice(endOfDashboardLine);
        fs.writeFileSync(sidebarJsxPath, sidebarJsx);
        console.log('Patched Sidebar.jsx');
    } else {
        console.error('Could not find Dashboard in Sidebar.jsx');
    }
}

// 4. Create Orders.jsx
const ordersJsxPath = 'C:\\smartdealadmin\\src\\pages\\Orders.jsx';
const ordersCode = `import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Eye } from 'lucide-react';
import axios from 'axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
                      {order.delivery_type === 'delivery' ? 'จัดส่ง' : 'รับเอง'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.order_status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-primary-600 hover:text-primary-800 transition-colors p-2 rounded-lg hover:bg-primary-50">
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
    </div>
  );
};

export default Orders;
`;
fs.writeFileSync(ordersJsxPath, ordersCode);
console.log('Created Orders.jsx');
