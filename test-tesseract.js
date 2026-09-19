import { createWorker } from 'tesseract.js';

async function test() {
  try {
    console.log('Testing tesseract worker...');
    const worker = await createWorker('eng');
    const result = await worker.recognize('https://tesseract.projectnaptha.com/img/eng_bw.png');
    console.log('Success:', result.data.text.substring(0, 20));
    await worker.terminate();
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
