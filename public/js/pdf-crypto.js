// S Craft — Local Offline PDF Encryption & Decryption via QPDF WebAssembly
// 100% private, client-side, zero cloud calls.

let qpdfInstance = null;
let qpdfPromise = null;

export async function getQpdf() {
  if (qpdfInstance) return qpdfInstance;
  if (qpdfPromise) return qpdfPromise;

  qpdfPromise = new Promise(async (resolve, reject) => {
    try {
      if (!window.createQpdfModule && !window.Module) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = './vendor/qpdf.js';
          s.onload = res;
          s.onerror = () => rej(new Error('Failed to load local QPDF engine'));
          document.head.appendChild(s);
        });
      }

      const createMod = window.createQpdfModule || window.Module;
      if (!createMod) throw new Error('QPDF module factory not found');

      const inst = await createMod({
        locateFile: (f) => './vendor/' + f
      });
      qpdfInstance = inst;
      resolve(qpdfInstance);
    } catch (err) {
      qpdfPromise = null;
      reject(err);
    }
  });

  return qpdfPromise;
}

/**
 * Encrypt a PDF with 256-bit AES user password
 */
export async function encryptPdf(pdfBytes, password) {
  if (!password || !password.trim()) {
    throw new Error('Please enter a password to protect the document.');
  }
  const qpdf = await getQpdf();
  const id = Date.now() + '_' + Math.floor(Math.random() * 10000);
  const inPath = `/in_${id}.pdf`;
  const outPath = `/enc_${id}.pdf`;

  try {
    qpdf.FS.writeFile(inPath, pdfBytes);
    const pw = password.trim();
    // qpdf input.pdf --encrypt user-pw owner-pw 256 -- output.pdf
    qpdf.callMain([inPath, '--encrypt', pw, pw, '256', '--', outPath]);
    
    let outBytes = null;
    try {
      outBytes = qpdf.FS.readFile(outPath);
    } catch (e) {
      throw new Error('Encryption failed. Unable to generate secured PDF.');
    }
    return outBytes;
  } finally {
    try { qpdf.FS.unlink(inPath); } catch (e) {}
    try { qpdf.FS.unlink(outPath); } catch (e) {}
  }
}

/**
 * Decrypt / Unlock a password-protected PDF
 */
export async function decryptPdf(pdfBytes, password) {
  if (!password || !password.trim()) {
    throw new Error('Please enter the current document password to unlock.');
  }
  const qpdf = await getQpdf();
  const id = Date.now() + '_' + Math.floor(Math.random() * 10000);
  const inPath = `/enc_in_${id}.pdf`;
  const outPath = `/dec_out_${id}.pdf`;

  let capturedErrors = [];
  const origError = console.error;
  console.error = (...args) => {
    capturedErrors.push(args.join(' '));
    origError.apply(console, args);
  };

  try {
    qpdf.FS.writeFile(inPath, pdfBytes);
    const pw = password.trim();
    
    try {
      qpdf.callMain([inPath, `--password=${pw}`, '--decrypt', outPath]);
    } catch (err) {
      // qpdf calls exit on invalid password
    }

    let outBytes = null;
    try {
      outBytes = qpdf.FS.readFile(outPath);
    } catch (e) {
      outBytes = null;
    }

    if (!outBytes || outBytes.length === 0) {
      const errStr = capturedErrors.join(' ').toLowerCase();
      if (errStr.includes('invalid password') || errStr.includes('incorrect password') || errStr.includes('wrong password') || errStr.includes('password')) {
        throw new Error('The password you entered is incorrect. Please check and try again.');
      }
      throw new Error('Incorrect password or unable to unlock this document.');
    }

    return outBytes;
  } finally {
    console.error = origError;
    try { qpdf.FS.unlink(inPath); } catch (e) {}
    try { qpdf.FS.unlink(outPath); } catch (e) {}
  }
}
