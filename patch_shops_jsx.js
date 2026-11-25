const fs = require('fs');
let content = fs.readFileSync('C:\\smartdealadmin\\src\\pages\\Shops.jsx', 'utf8');

const targetStr = `                      {/* Section 4: Product List */}`;

const newContent = `                      {/* Section 5: Recent Orders */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-72 flex-shrink-0">
                        <div className="border-b border-slate-100 pb-4 mb-4">
                          <h3 className="font-bold text-slate-800 text-base flex items-center">
                            <span className="material-symbols-outlined mr-2 text-purple-500">history</span> ประวัติคำสั่งซื้อล่าสุด
                          </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2">
                          {shopInsights.recent_orders && shopInsights.recent_orders.length > 0 ? (
                            <div className="space-y-3">
                              {shopInsights.recent_orders.map((order, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm">ออเดอร์ #{order.order_id}</p>
                                    <p className="text-xs text-slate-500 mt-1">ผู้ซื้อ: {order.buyer_name || 'ไม่ระบุ'}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className={\`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md mb-1 \${order.order_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}\`}>
                                      {order.order_status}
                                    </span>
                                    <p className="text-[11px] text-slate-400 font-medium">{new Date(order.created_at).toLocaleString('th-TH')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 opacity-50">receipt_long</span>
                              <p className="text-sm">ยังไม่มีประวัติคำสั่งซื้อ</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 6: Customer Reviews */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-[18rem] flex-shrink-0">
                        <div className="border-b border-slate-100 pb-4 mb-4">
                          <h3 className="font-bold text-slate-800 text-base flex items-center">
                            <span className="material-symbols-outlined mr-2 text-yellow-500">star</span> รีวิวจากลูกค้า
                          </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2">
                          {shopInsights.reviews && shopInsights.reviews.length > 0 ? (
                            <div className="space-y-3">
                              {shopInsights.reviews.map((rev, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex text-amber-400 text-sm">
                                      {'★'.repeat(Math.round(rev.rating))}
                                      <span className="ml-2 text-slate-600 font-bold">{Number(rev.rating).toFixed(1)}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium">{new Date(rev.created_at).toLocaleString('th-TH')}</span>
                                  </div>
                                  <p className="text-sm text-slate-700 italic">"{rev.comment || 'ไม่มีความเห็น'}"</p>
                                  <p className="text-xs text-slate-500 mt-2 text-right">- {rev.customer_name || 'ลูกค้า'}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 opacity-50">rate_review</span>
                              <p className="text-sm">ยังไม่มีรีวิวจากลูกค้า</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Section 4: Product List */}`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, newContent);
    fs.writeFileSync('C:\\smartdealadmin\\src\\pages\\Shops.jsx', content);
    console.log('Added Sections to Shops.jsx!');
} else {
    console.log('Could not find target string to replace in Shops.jsx!');
}
