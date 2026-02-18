
import * as XLSX from 'xlsx';

const filePath = '/Users/ivanprpic/Desktop/Projekti/cezih_v2/Dijagnoze_kod_kojih_Zavod_osigurava_placanje_zdr_zad_u_cijelosti_300710.xls';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log(JSON.stringify(data.slice(0, 10), null, 2));
