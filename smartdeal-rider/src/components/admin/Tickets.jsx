import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTickets = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('ไม่สามารถโหลดข้อมูลเรื่องร้องเรียนได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openTicketDetails = async (ticket) => {
    setSelectedTicket(ticket);
    setIsSlideOverOpen(true);
    setIsDetailsLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/admin/tickets/${ticket.issue_id}`);
      setTicketDetails(response.data);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('ไม่สามารถดึงข้อมูลรายละเอียดได้');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const updateTicketStatus = async (newStatus) => {
    if (!selectedTicket) return;
    setIsUpdating(true);
    try {
      const response = await axios.put(`http://localhost:5000/api/admin/tickets/${selectedTicket.issue_id}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        toast.success('อัปเดตสถานะสำเร็จ');
        setTickets(tickets.map(t => 
          t.issue_id === selectedTicket.issue_id ? { ...t, status: newStatus } : t
        ));
        setSelectedTicket({ ...selectedTicket, status: newStatus });
        if (ticketDetails) {
          setTicketDetails({ ...ticketDetails, ticket: { ...ticketDetails.ticket, status: newStatus } });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const term = search.toLowerCase();
    const matchesSearch = (ticket.issue_topic && ticket.issue_topic.toLowerCase().includes(term)) ||
                          (ticket.reporter_name && ticket.reporter_name.toLowerCase().includes(term)) ||
                          (ticket.issue_id.toString().includes(term));
    
    let matchesStatus = true;
    if (filterStatus !== 'all') {
      matchesStatus = ticket.status === filterStatus;
    }
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'resolved': return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 border border-green-200">แก้ไขแล้ว</span>;
      case 'investigating': return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">กำลังตรวจสอบ</span>;
      default: return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">รอดำเนินการ</span>;
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">จัดการเรื่องร้องเรียน</h1>
        <div className="text-sm text-slate-500 font-medium">เรื่องร้องเรียนทั้งหมด {filteredTickets.length} รายการ</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-200 flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterStatus === 'all' ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            ทั้งหมด
          </button>
          <button 
            onClick={() => setFilterStatus('pending')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterStatus === 'pending' ? 'bg-orange-50 border border-orange-300 text-orange-700 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            รอดำเนินการ
          </button>
          <button 
            onClick={() => setFilterStatus('investigating')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterStatus === 'investigating' ? 'bg-blue-50 border border-blue-300 text-blue-700 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            กำลังตรวจสอบ
          </button>
          <button 
            onClick={() => setFilterStatus('resolved')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterStatus === 'resolved' ? 'bg-green-50 border border-green-300 text-green-700 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            แก้ไขแล้ว
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาด้วยรหัส Ticket, หัวข้อ, ชื่อผู้แจ้ง..."
            className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all sm:text-sm text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">รหัส Ticket</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">หัวข้อร้องเรียน</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ร้องเรียน</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่แจ้ง</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.issue_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">#TCK-{ticket.issue_id}</span>
                      <div className="text-xs text-slate-500 mt-0.5">ออเดอร์ #{ticket.order_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 line-clamp-1 max-w-[250px]">{ticket.issue_topic}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-[250px] mt-0.5">{ticket.issue_detail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{ticket.reporter_name}</div>
                      <div className="text-xs text-slate-500 capitalize">{ticket.reporter_role}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(ticket.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openTicketDetails(ticket)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                      >
                        ตรวจสอบ
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">inbox</span>
                    <p className="text-lg font-medium text-slate-600">ไม่มีข้อมูลเรื่องร้องเรียน</p>
                    <p className="text-sm mt-1 text-slate-400">ยังไม่มีรายการที่ตรงกับการค้นหาของคุณ</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Slide-over */}
      {isSlideOverOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsSlideOverOpen(false)}></div>
          
          <div className="fixed inset-y-0 right-0 max-w-2xl w-full flex">
            <div className="w-full h-full bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-slate-800">รายละเอียดเรื่องร้องเรียน</h2>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">
                    #TCK-{selectedTicket.issue_id}
                  </span>
                </div>
                <button 
                  onClick={() => setIsSlideOverOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Status Bar */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">สถานะปัจจุบัน</h3>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">อัปเดตสถานะ</h3>
                    <div className="flex space-x-2">
                      <button 
                        disabled={isUpdating || selectedTicket.status === 'investigating'}
                        onClick={() => updateTicketStatus('investigating')}
                        className={\`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all \${selectedTicket.status === 'investigating' ? 'bg-blue-100 text-blue-700 border-blue-200 opacity-50 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}\`}
                      >
                        กำลังตรวจสอบ
                      </button>
                      <button 
                        disabled={isUpdating || selectedTicket.status === 'resolved'}
                        onClick={() => updateTicketStatus('resolved')}
                        className={\`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all \${selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-200 opacity-50 cursor-not-allowed' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'}\`}
                      >
                        แก้ไขแล้ว
                      </button>
                    </div>
                  </div>
                </div>

                {isDetailsLoading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>
                ) : ticketDetails ? (
                  <>
                    {/* Issue Details */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center">
                        <span className="material-symbols-outlined mr-2 text-red-500">report</span> ข้อมูลปัญหาที่พบ
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-500">หัวข้อร้องเรียน</label>
                          <p className="mt-1 font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">{ticketDetails.ticket.issue_topic}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-500">รายละเอียด</label>
                          <p className="mt-1 text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[100px] whitespace-pre-wrap">{ticketDetails.ticket.issue_detail || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
                        </div>
                        <div className="text-xs text-slate-400 text-right">
                          แจ้งเมื่อ: {new Date(ticketDetails.ticket.created_at).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'medium' })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* User Info */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                          <span className="material-symbols-outlined mr-2 text-blue-500">account_circle</span> ผู้ร้องเรียน
                        </h3>
                        <div className="flex items-center space-x-3 mb-4">
                          <img 
                            src={ticketDetails.ticket.reporter_avatar || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(ticketDetails.ticket.reporter_name)}&background=random\`} 
                            alt="Avatar"
                            className="w-12 h-12 rounded-full border border-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{ticketDetails.ticket.reporter_name}</p>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase border border-slate-200">
                              {ticketDetails.ticket.reporter_role}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="flex items-center text-slate-600"><span className="material-symbols-outlined text-[16px] mr-2 text-slate-400">mail</span> {ticketDetails.ticket.reporter_email || '-'}</p>
                          <p className="flex items-center text-slate-600"><span className="material-symbols-outlined text-[16px] mr-2 text-slate-400">phone</span> {ticketDetails.ticket.reporter_phone || '-'}</p>
                        </div>
                      </div>

                      {/* Order Info */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                          <span className="material-symbols-outlined mr-2 text-orange-500">receipt_long</span> ออเดอร์ที่เกี่ยวข้อง
                        </h3>
                        {ticketDetails.order ? (
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <span className="text-slate-500">รหัสออเดอร์</span>
                              <span className="font-bold text-slate-900">#{ticketDetails.order.order_id}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <span className="text-slate-500">ร้านค้า</span>
                              <span className="font-medium text-slate-800 truncate max-w-[150px]" title={ticketDetails.order.shop_name}>{ticketDetails.order.shop_name || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <span className="text-slate-500">ยอดเงิน</span>
                              <span className="font-bold text-primary-600">฿{Number(ticketDetails.order.total_amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">สถานะ</span>
                              <span className="font-semibold text-slate-700 uppercase">{ticketDetails.order.order_status}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm text-center py-4">ไม่พบข้อมูลออเดอร์ที่เกี่ยวข้อง</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-slate-500">ไม่สามารถโหลดรายละเอียดได้</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
