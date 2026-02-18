
import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = '/Users/ivanprpic/Desktop/Projekti/cezih_v2/djelatnosti_30112011-2.xls';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log(JSON.stringify(data.slice(0, 10), null, 2));
