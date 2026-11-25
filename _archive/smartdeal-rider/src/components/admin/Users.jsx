import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/admin/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredAndSortedUsers = users.filter((user) => {
    const term = search.toLowerCase();
    const matchesSearch = (user.full_name && user.full_name.toLowerCase().includes(term)) ||
                          (user.email && user.email.toLowerCase().includes(term));
    
    let matchesStatus = filterStatus === 'all' ? true : (filterStatus === 'active' ? user.status === 'active' : user.status !== 'active');
    let matchesRole = filterRole === 'all' ? true : user.role === filterRole;

    return matchesSearch && matchesStatus && matchesRole;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (sortBy === 'performance') {
      return (Number(b.performance_score) || 0) - (Number(a.performance_score) || 0);
    }
    return 0;
  });

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setIsSlideOverOpen(true);
    setIsDetailsLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/admin/users/${user.user_id}/details`);
      setUserDetails(response.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('ไม่สามารถดึงข้อมูลรายละเอียดผู้ใช้ได้');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const response = await axios.put(`http://localhost:5000/api/admin/users/${userId}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        setUsers(users.map(user => 
          user.user_id === userId ? { ...user, status: newStatus } : user
        ));
        setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
        setUserDetails(prev => prev ? { ...prev, user: { ...prev.user, status: newStatus } } : null);
        setIsSlideOverOpen(false);
        toast.success(`อัปเดตสถานะในฐานข้อมูลสำเร็จแล้ว`);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">จัดการผู้ใช้งาน</h1>
        <div className="text-sm text-slate-500 font-medium">ผู้ใช้ทั้งหมด {filteredAndSortedUsers.length} คน</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-200 flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterStatus === 'all' ? 'bg-green-600 text-white shadow-md shadow-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            ทั้งหมด
          </button>
          <button 
            onClick={() => setFilterStatus('active')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterStatus === 'active' ? 'bg-green-50 border border-green-300 text-green-700 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            ใช้งานอยู่
          </button>
          <button 
            onClick={() => setFilterStatus('inactive')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterStatus === 'inactive' ? 'bg-red-50 border border-red-300 text-red-700 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            ระงับการใช้งาน
          </button>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-green-500"
          >
            <option value="all">ทุกบทบาท (All Roles)</option>
            <option value="buyer">ผู้ซื้อ (Buyer)</option>
            <option value="seller">ร้านค้า (Seller)</option>
            <option value="driver">ไรเดอร์ (Driver)</option>
            <option value="admin">แอดมิน (Admin)</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-green-500"
          >
            <option value="newest">สมัครใหม่สุด</option>
            <option value="oldest">สมัครเก่านานสุด</option>
            <option value="performance">ผลงานดีสุด (Performance)</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อ หรือ อีเมล..."
            className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all sm:text-sm text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            กำลังโหลดข้อมูล...
          </div>
        ) : filteredAndSortedUsers.length > 0 ? (
          filteredAndSortedUsers.map((user) => (
            <div key={user.user_id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between transition-all duration-200 hover:shadow-lg hover:border-green-300 hover:-translate-y-0.5 group">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="relative flex-shrink-0">
                  <img 
                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=random`} 
                    alt={user.full_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 shadow-sm"
                  />
                  <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
                <div className="min-w-0 pr-4">
                  <h3 className="font-bold text-slate-900 text-lg truncate" title={user.full_name}>{user.full_name}</h3>
                  <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'seller' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'driver' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status === 'active' ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                    </span>
                    <span className="text-sm text-slate-500 font-medium">ID: SM-{user.user_id}</span>
                    {Number(user.performance_score) > 0 && (
                      <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 rounded-md border border-amber-200">
                        ⭐ {user.performance_score} ผลงาน
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openUserDetails(user)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-700 transition-colors shadow-sm"
                  title="ดูรายละเอียด"
                >
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                </button>
                <button 
                  onClick={() => openUserDetails(user)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-sm ${user.status === 'active' ? 'bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700' : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'}`}
                  title="ตั้งค่าบัญชี"
                >
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">person_search</span>
            <p className="text-lg">ไม่พบข้อมูลผู้ใช้ที่ตรงกับการค้นหา</p>
          </div>
        )}
      </div>

      {/* Customer 360 Slide-over Panel */}
      {isSlideOverOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsSlideOverOpen(false)}
          ></div>
          
          {/* Slide-over */}
          <div className="fixed inset-y-0 right-0 max-w-2xl w-full flex">
            <div className="w-full h-full bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* Top Action Bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">ข้อมูลเชิงลึก (Customer 360)</h2>
                <button 
                  onClick={() => setIsSlideOverOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Part 1: Header */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center space-x-6">
                  <div className="relative">
                    <img 
                      src={selectedUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.full_name || 'U')}&background=random`} 
                      alt={selectedUser.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm"
                    />
                    <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-white ${selectedUser.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedUser.full_name}</h3>
                    <div className="flex items-center space-x-4 mt-2 text-slate-500">
                      <span className="flex items-center"><span className="material-symbols-outlined text-[18px] mr-1">mail</span> {selectedUser.email || '-'}</span>
                      <span className="flex items-center"><span className="material-symbols-outlined text-[18px] mr-1">phone</span> {selectedUser.phone || '-'}</span>
                    </div>
                    <div className="mt-3 flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedUser.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedUser.status === 'active' ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                      </span>
                      <span className="text-sm font-medium text-slate-400">ID: SM-{selectedUser.user_id}</span>
                    </div>
                  </div>
                </div>

                {isDetailsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลเชิงลึก...</p>
                  </div>
                ) : userDetails ? (
                  <>
                    {/* Part 2: Stat Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center items-center">
                        <span className="text-slate-500 font-medium mb-1">
                          {selectedUser.role === 'seller' ? 'ยอดขายสะสม' : selectedUser.role === 'driver' ? 'รายได้จากค่าส่ง' : 'ยอดใช้จ่ายสะสม'}
                        </span>
                        <span className="text-2xl font-bold text-slate-900">฿{Number(userDetails.stats.total_spent).toLocaleString()}</span>
                      </div>
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center items-center">
                        <span className="text-slate-500 font-medium mb-1">
                          {selectedUser.role === 'seller' ? 'ออเดอร์ที่ขายได้' : selectedUser.role === 'driver' ? 'จำนวนงานสำเร็จ' : 'จำนวนคำสั่งซื้อ'}
                        </span>
                        <span className="text-2xl font-bold text-slate-900">{userDetails.stats.total_orders} <span className="text-base font-medium text-slate-500">{selectedUser.role === 'driver' ? 'งาน' : 'บิล'}</span></span>
                      </div>
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center items-center">
                        <span className="text-slate-500 font-medium mb-1">
                          {selectedUser.role === 'seller' ? 'ยอดขายเฉลี่ย/บิล' : selectedUser.role === 'driver' ? 'ค่าเฉลี่ยรายได้/งาน' : 'ยอดเฉลี่ย/บิล'}
                        </span>
                        <span className="text-2xl font-bold text-slate-900">฿{Number(userDetails.stats.avg_order_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>

                    {/* Part 3: 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                          <span className="material-symbols-outlined mr-2 text-green-600">location_on</span> ที่อยู่จัดส่งล่าสุด
                        </h4>
                        <div className="space-y-3">
                          {userDetails.addresses && userDetails.addresses.length > 0 ? (
                            userDetails.addresses.map((addr, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700 flex items-start">
                                <span className="material-symbols-outlined text-[18px] text-slate-400 mr-2 mt-0.5">home</span>
                                <span>{addr.address_line} {addr.province} {addr.zip_code}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-500 text-sm text-center py-2">ไม่มีข้อมูลที่อยู่</p>
                          )}
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                          <span className="material-symbols-outlined mr-2 text-blue-600">analytics</span> วิเคราะห์พฤติกรรม
                        </h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <span className="text-slate-500 text-sm">ระยะเวลาที่เป็นสมาชิก</span>
                            <span className="font-semibold text-slate-800">
                              {selectedUser.created_at ? Math.max(1, Math.floor((new Date() - new Date(selectedUser.created_at)) / (1000 * 60 * 60 * 24))) : '-'} วัน
                            </span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <span className="text-slate-500 text-sm">บทบาทปัจจุบัน</span>
                            <span className="font-semibold text-slate-800 capitalize">{selectedUser.role}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">วันที่สมัคร</span>
                            <span className="font-medium text-slate-700 text-sm">
                              {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('th-TH') : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Part 4: Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 flex items-center">
                          <span className="material-symbols-outlined mr-2 text-orange-500">receipt_long</span> 
                          {selectedUser.role === 'seller' ? 'ประวัติการขาย 5 รายการล่าสุด' : selectedUser.role === 'driver' ? 'ประวัติการวิ่งงาน 5 งานล่าสุด' : 'ประวัติการสั่งซื้อ 5 รายการล่าสุด'}
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-5 py-3 text-xs font-semibold text-slate-500">รหัสออเดอร์</th>
                              <th className="px-5 py-3 text-xs font-semibold text-slate-500">วันที่</th>
                              <th className="px-5 py-3 text-xs font-semibold text-slate-500">สถานะ</th>
                              <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">ยอดเงิน</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {userDetails.recent_orders && userDetails.recent_orders.length > 0 ? (
                              userDetails.recent_orders.map((order, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="px-5 py-3 font-medium text-slate-900">#ORD-{order.order_id}</td>
                                  <td className="px-5 py-3 text-sm text-slate-500">
                                    {order.created_at ? new Date(order.created_at).toLocaleDateString('th-TH') : '-'}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                      order.order_status === 'completed' || order.order_status === 'paid' ? 'bg-green-100 text-green-700' :
                                      order.order_status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                      order.order_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {order.order_status}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-right font-bold text-slate-900">
                                    ฿{Number(order.total_amount).toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="4" className="px-5 py-8 text-center text-slate-500 text-sm">
                                  {selectedUser.role === 'seller' ? 'ยังไม่มีประวัติการขาย' : selectedUser.role === 'driver' ? 'ยังไม่มีประวัติการวิ่งงาน' : 'ยังไม่มีประวัติการสั่งซื้อ'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500">ไม่สามารถโหลดข้อมูลได้</div>
                )}
              </div>

              {/* Action Footer */}
              <div className="px-6 py-5 bg-white border-t border-slate-200 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button 
                  onClick={() => setIsSlideOverOpen(false)}
                  className="px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
                <button 
                  onClick={() => toggleUserStatus(selectedUser.user_id, selectedUser.status)}
                  className={`px-6 py-3 text-sm font-bold text-white rounded-xl shadow-sm transition-all hover:shadow-md ${
                    selectedUser.status === 'active' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-200/50' 
                      : 'bg-green-600 hover:bg-green-700 shadow-green-200/50'
                  }`}
                >
                  {selectedUser.status === 'active' ? 'ระงับการใช้งานบัญชี' : 'เปิดใช้งานบัญชี (ปลดแบน)'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
