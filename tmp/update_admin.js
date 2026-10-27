const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminShareholderManagement.tsx', 'utf8');

// 1. Add filteredShareholders
if (!code.includes('filteredShareholders =')) {
  const targetFilter = '  // Filter applications';
  const filterAddition = `  // Filter verified shareholders
  const filteredShareholders = verifiedShareholders.filter((sh) => {
    const q = searchTerm.toLowerCase();
    return (
      (sh.shareholderName || '').toLowerCase().includes(q) ||
      (sh.userId || '').toLowerCase().includes(q) ||
      (sh.phone || '').includes(q) ||
      (sh.email || '').toLowerCase().includes(q)
    );
  });

  // Filter applications`;
  code = code.replace(targetFilter, filterAddition);
}

// 2. Add Tab 2 Verified Shareholders button
const oldTabButtons = `        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 \${
            activeTab === 'applications' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }\`}
        >
          1. Share Applications ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 \${
            activeTab === 'availability' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }\`}
        >
          2. Share Availability & Price Pool
        </button>`;

const newTabButtons = `        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 \${
            activeTab === 'applications' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }\`}
        >
          1. Share Applications ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shareholders')}
          className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 \${
            activeTab === 'shareholders' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }\`}
        >
          2. Verified Shareholders ({verifiedShareholders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 \${
            activeTab === 'availability' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }\`}
        >
          3. Share Availability & Price Pool
        </button>`;

if (code.includes(oldTabButtons)) {
  code = code.replace(oldTabButtons, newTabButtons);
  code = code.replace('3. Commission Sharing Agreements', '4. Commission Sharing Agreements');
  code = code.replace('4. Auditable Financial Ledger', '5. Auditable Financial Ledger');
  code = code.replace('5. Withdrawal Requests', '6. Withdrawal Requests');
  code = code.replace('6. Governance Audit Logs', '7. Governance Audit Logs');
}

// 3. Add Verified Shareholders tab content right after Tab 1
const tab1End = `{/* =========================================================================
          TAB 2: SHARE AVAILABILITY & PRICE POOL`;
const shareholdersTabContent = `{/* =========================================================================
          TAB: VERIFIED SHAREHOLDERS
      ========================================================================== */}
      {activeTab === 'shareholders' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Shareholder Name, UID, Phone, Email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-main"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Total Verified Shareholders: <strong className="text-slate-900">{verifiedShareholders.length}</strong>
            </div>
          </div>
          <div className="overflow-x-auto">
            {filteredShareholders.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No verified shareholders found matching current criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Shareholder ID</th>
                    <th className="py-3 px-4">Shareholder Name & UID</th>
                    <th className="py-3 px-4">Shares Owned (%)</th>
                    <th className="py-3 px-4">Investment Value</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShareholders.map((sh) => (
                    <tr key={sh.userId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        RJ-SH-{sh.userId.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{sh.shareholderName || 'Verified Shareholder'}</div>
                        <div className="text-[11px] font-mono text-slate-400">UID: {sh.userId}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-primary-main">
                        {sh.activeSharesPercent}% ({sh.activeSharesPercent} Units)
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        ৳{(sh.portfolioValue || (sh.activeSharesPercent * 2000)).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{sh.phone || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">{sh.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active Shareholder
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAppDetail({
                            id: \`RJ-SH-\${sh.userId.slice(0, 8).toUpperCase()}\`,
                            applicationId: \`RJ-SH-\${sh.userId.slice(0, 8).toUpperCase()}\`,
                            userId: sh.userId,
                            applicantName: sh.shareholderName,
                            sharePercent: sh.activeSharesPercent,
                            totalAmount: sh.portfolioValue || (sh.activeSharesPercent * 2000),
                            paymentMethod: 'Verified Equity',
                            transactionId: 'VERIFIED',
                            paymentStatus: 'Approved',
                            status: 'approved',
                            phone: sh.phone,
                            email: sh.email,
                            guardianName: sh.guardianName,
                            address: sh.address
                          })}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="View Shareholder Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      ` + tab1End;

if (code.includes(tab1End) && !code.includes(\"activeTab === 'shareholders'\")) {
  code = code.replace(tab1End, shareholdersTabContent);
}

// 4. Add User UID to selectedAppDetail modal
const modalApplicantTarget = `<div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Applicant Name</span>`;
const modalApplicantReplacement = `<div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">User UID</span>
                  <div className="font-mono text-slate-700 text-xs mt-0.5 font-bold">{selectedAppDetail.userId || 'N/A'}</div>
                </div>
                ` + modalApplicantTarget;

if (code.includes(modalApplicantTarget) && !code.includes('User UID</span>')) {
  code = code.replace(modalApplicantTarget, modalApplicantReplacement);
}

// 5. In applications table, display User UID under phone
const oldAppPhone = `<div className="text-[11px] text-slate-500 font-mono">
                          {app.phone || app.payerMobile || app.email}
                        </div>`;
const newAppPhone = `<div className="text-[11px] text-slate-500 font-mono">
                          {app.phone || app.payerMobile || app.email}
                        </div>
                        {app.userId && (
                          <div className="text-[10px] text-slate-400 font-mono">UID: {app.userId}</div>
                        )}`;

if (code.includes(oldAppPhone) && !code.includes('UID: {app.userId}')) {
  code = code.replace(oldAppPhone, newAppPhone);
}

fs.writeFileSync('src/pages/admin/AdminShareholderManagement.tsx', code, 'utf8');
console.log('Successfully updated AdminShareholderManagement.tsx with verified shareholders tab and UID display');
