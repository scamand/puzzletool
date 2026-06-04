(function () {
    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            const image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.onerror = function () {
                reject(new Error("image-load-failed"));
            };
            image.src = src;
        });
    }

    async function createBinaryDataUrl(src, threshold) {
        const image = await loadImage(src);
        const canvas = document.createElement("canvas");
        const width = Math.max(1, image.naturalWidth || image.width);
        const height = Math.max(1, image.naturalHeight || image.height);
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, width, height);

        const frame = context.getImageData(0, 0, width, height);
        const data = frame.data;
        const limit = Number(threshold);

        for (let index = 0; index < data.length; index += 4) {
            const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
            const value = luminance >= limit ? 255 : 0;
            data[index] = value;
            data[index + 1] = value;
            data[index + 2] = value;
        }

        context.putImageData(frame, 0, 0);
        return canvas.toDataURL("image/png");
    }

    window.ImageBinary = {
        createBinaryDataUrl: createBinaryDataUrl
    };
})();
