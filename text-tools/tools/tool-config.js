(function () {
    window.TextToolsConfig = {
        card: {
            defaultWidth: 700,
            defaultHeight: 400,
            minWidth: 320,
            minHeight: 260,
            gap: 34,
            arrangeMarginX: 40,
            arrangeMarginTop: 24,
            autoFitPadding: 8,
            maxCards: 99
        },
        storage: {
            layout: "fixed_cipher_layout_v1",
            cardDefaults: "fixed_cipher_card_defaults_v1",
            paddleOcrToken: "fixed_cipher_paddle_ocr_token_v1"
        },
        ocr: {
            tesseractScriptUrl: "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js",
            tesseractLang: "eng+chi_sim",
            paddleJobUrl: "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs",
            paddleModel: "PaddleOCR-VL-1.5",
            paddlePollIntervalMs: 5000
        }
    };
})();
