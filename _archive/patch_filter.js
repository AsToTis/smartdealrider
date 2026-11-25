const fs = require('fs');
let content = fs.readFileSync('C:\\smartdealadmin\\src\\pages\\Orders.jsx', 'utf8');

// 1. Add state variables
content = content.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  "const [searchTerm, setSearchTerm] = useState('');\n  const [filterStatus, setFilterStatus] = useState('all');\n  const [showFilterMenu, setShowFilterMenu] = useState(false);"
);

// 2. Update filteredOrders logic
const oldFilterLogic = `  const filteredOrders = orders.filter(order => 
    order.order_id?.toString().includes(searchTerm) ||
    order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.shop_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );`;

const newFilterLogic = `  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_id?.toString().includes(searchTerm) ||
      order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shop_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || order.order_status === filterStatus;

    return matchesSearch && matchesFilter;
  });`;
content = content.replace(oldFilterLogic, newFilterLogic);

// 3. Update the Filter button UI
const oldButton = `<button className="flex items-center px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            <Filter className="w-5 h-5 mr-2" />
            ตัวกรอง
          </button>`;

const newButton = `<div className="relative">
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              <Filter className="w-5 h-5 mr-2" />
              ตัวกรอง
            </button>
            
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10 py-1">
                <button onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }} className={\`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 \${filterStatus === 'all' ? 'text-primary-600 font-medium' : 'text-slate-700'}\`}>ทั้งหมด</button>
                <button onClick={() => { setFilterStatus('pending'); setShowFilterMenu(false); }} className={\`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 \${filterStatus === 'pending' ? 'text-primary-600 font-medium' : 'text-slate-700'}\`}>รอดำเนินการ</button>
                <button onClick={() => { setFilterStatus('delivering'); setShowFilterMenu(false); }} className={\`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 \${filterStatus === 'delivering' ? 'text-primary-600 font-medium' : 'text-slate-700'}\`}>กำลังจัดส่ง</button>
                <button onClick={() => { setFilterStatus('delivered'); setShowFilterMenu(false); }} className={\`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 \${filterStatus === 'delivered' ? 'text-primary-600 font-medium' : 'text-slate-700'}\`}>จัดส่งแล้ว</button>
                <button onClick={() => { setFilterStatus('completed'); setShowFilterMenu(false); }} className={\`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 \${filterStatus === 'completed' ? 'text-primary-600 font-medium' : 'text-slate-700'}\`}>เสร็จสิ้น</button>
                <button onClick={() => { setFilterStatus('cancelled'); setShowFilterMenu(false); }} className={\`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 \${filterStatus === 'cancelled' ? 'text-primary-600 font-medium' : 'text-slate-700'}\`}>ยกเลิกแล้ว</button>
              </div>
            )}
          </div>`;
content = content.replace(oldButton, newButton);

fs.writeFileSync('C:\\smartdealadmin\\src\\pages\\Orders.jsx', content);
console.log('Fixed Filter!');
