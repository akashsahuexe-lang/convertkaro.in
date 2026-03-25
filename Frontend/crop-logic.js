// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null;
let cropper = null;
let originalPdfBytes = null;
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

// 1. Handle PDF Upload
document.getElementById('pdfInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
        originalPdfBytes = await file.arrayBuffer();
        showPreview(originalPdfBytes);
    }
});

// 2. Show Preview (First Page)
async function showPreview(pdfBytes) {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1); // Pehla page preview ke liye

    const viewport = page.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    // Show Workspace and Init Cropper
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('cropWorkspace').style.display = 'block';

    if (cropper) cropper.destroy();
    cropper = new Cropper(canvas, {
        viewMode: 1,
        autoCropArea: 0.8,
        responsive: true,
    });
}

// 3. The Actual Cropping Logic
document.getElementById('btnCrop').addEventListener('click', async () => {
    if (!cropper || !originalPdfBytes) return;

    const { x, y, width, height } = cropper.getData();
    const canvasData = cropper.getCanvasData();

    // Load PDF with pdf-lib
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();

    // Ratio nikalna (Canvas vs Actual PDF size)
    const firstPage = pages[0];
    const { width: pdfW, height: pdfH } = firstPage.getSize();
    
    // Scale factors
    const scaleX = pdfW / canvasData.width;
    const scaleY = pdfH / canvasData.height;

    pages.forEach(page => {
        // PDF coordinates neeche se start hote hain (Bottom-Left)
        // Isliye humein Y coordinate ko flip karna hoga
        page.setCropBox(
            x * scaleX, 
            (canvasData.height - (y + height)) * scaleY, 
            width * scaleX, 
            height * scaleY
        );
    });

    // 4. Save and Download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "cropped_convertkaro.pdf";
    link.click();
    
    alert("Bhai, PDF Crop ho gaya! ✂️ Check your downloads.");
});