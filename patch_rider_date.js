const fs = require('fs');
let content = fs.readFileSync('C:\\smartdealadmin\\src\\pages\\Riders.jsx', 'utf8');

// The original code has:
// <p className="text-xs text-slate-400">{new Date(job.created_at).toLocaleString('th-TH')}</p>
// We need to change job.created_at to job.assigned_at || job.completed_at

const oldDateStr = `<p className="text-xs text-slate-400">{new Date(job.created_at).toLocaleString('th-TH')}</p>`;
const newDateStr = `<p className="text-xs text-slate-400">{new Date(job.assigned_at || job.completed_at || new Date()).toLocaleString('th-TH')}</p>`;

if (content.includes(oldDateStr)) {
    content = content.replace(oldDateStr, newDateStr);
    fs.writeFileSync('C:\\smartdealadmin\\src\\pages\\Riders.jsx', content);
    console.log('Fixed Rider History Date!');
} else {
    console.log('Could not find Rider History Date to fix!');
}
