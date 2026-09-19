import fs from 'fs';

async function test() {
  try {
    const formData = new FormData();
    formData.append('url', 'https://tesseract.projectnaptha.com/img/eng_bw.png');
    formData.append('apikey', 'K85502014888957');
    formData.append('language', 'eng');
    formData.append('OCREngine', '2');

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
test();
