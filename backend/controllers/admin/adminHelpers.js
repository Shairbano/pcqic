const dns      = require('dns').promises;
const Counter  = require('../../models/Counter');
const Employee = require('../../models/Employee');
const generateUniqueEmployeeId = async () => {
  const existing = await Counter.findById('employeeId');
  if (!existing) {
    try {
      await Counter.create({ _id: 'employeeId', seq: await Employee.countDocuments() });
    } catch (e) {
      if (e.code !== 11000) throw e; // ignore: another request bootstrapped it first
    }
  }
  const seq = await Counter.nextValue('employeeId');
  return `QSP-${String(seq).padStart(5, '0')}`;
};

const verifyEmailDomain = async (email) => {
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!validEmail) return 'Enter a valid email address';

  const domain = email.split('@')[1].toLowerCase();
  const withTimeout = (p, ms = 3000) =>
    Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    if (mx && mx.length > 0) return null;
  } catch (err) {
    if (err.code && !['ENOTFOUND', 'ENODATA'].includes(err.code)) {
      console.warn(`[verifyEmailDomain] MX lookup for "${domain}" failed with ${err.code || err.message}; falling back to A/AAAA.`);
    }
  }

  try {
    const a = await withTimeout(dns.resolve4(domain));
    if (a && a.length > 0) return null;
  } catch {}
  try {
    const aaaa = await withTimeout(dns.resolve6(domain));
    if (aaaa && aaaa.length > 0) return null;
  } catch {}

  return 'Email domain does not exist or cannot receive mail';
};

module.exports = { generateUniqueEmployeeId, verifyEmailDomain };