const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// Auto-detect next image file (3.png → 4.png → 5.png...)
function getNextImageFile(start) {
  const folderPath = "./image";

  const availableFiles = fs
    .readdirSync(folderPath)
    .filter((f) => /^\d+\.png$/.test(f))
    .map((f) => parseInt(f.split(".")[0]))
    .sort((a, b) => a - b);

  // Find next file in range that exists
  if (availableFiles.includes(start)) {
    return {
      filename: `${start}.png`,
      fullPath: path.join(folderPath, `${start}.png`),
    };
  }

  throw new Error(`All images from ${start}.png been processed.`);
}

// Create job API
async function createJob(imagePath) {
  try {
    const form = new FormData();
    form.append("original_image_file", fs.createReadStream(imagePath));
    form.append("output_format", "png");

    const response = await axios.post(
      "https://api.magiceraser.org/api/magiceraser/v3/ai-image-watermark-remove-auto/create-job",
      form,
      {
        headers: {
          authority: "api.magiceraser.org",
          method: "POST",
          path: "/api/magiceraser/v3/ai-image-watermark-remove-auto/create-job",
          scheme: "https",
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "en-US,en;q=0.9,hi;q=0.8",

          // important headers
          origin: "https://magiceraser.org",
          "product-code": "067003",
          "product-serial": "bd679bce-9713-4569-8148-532ee2fb3922",

          referer: "https://magiceraser.org/",
          "sec-ch-ua": `"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"`,
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": `"Linux"`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
      }
    );

    return response.data.result.job_id;
  } catch (err) {
    console.error("Error creating job:", err.response?.data || err);
  }
}

// Get job result
async function checkJob(jobId) {
  const url = `https://api.magiceraser.org/api/magiceraser/v2/ai-remove-object/get-job/${jobId}`;
  const response = await axios.get(url);
  return response.data.result.output_url[0];
}

// Download final image
async function downloadImage(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);

  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Main logic
(async function run() {
  try {
    for (let i = 4; i <= 10; i++) {
      // Auto detect next image file
      const { filename, fullPath } = getNextImageFile(i);
      console.log("Processing image:", filename);

      // Step 1: API create job
      const jobId = await createJob(fullPath);
      console.log("Job ID:", jobId);

      // Wait few seconds
      await new Promise((res) => setTimeout(res, 5000));

      // // Step 2: Check status
      const outputUrl = await checkJob(jobId);
      console.log("Output URL:", outputUrl);

      // // Step 3: Download output
      const outputFile = `./output/out_${filename}`;
      await downloadImage(outputUrl, outputFile);

      console.log("Downloaded successfully:", outputFile);
    }
  } catch (err) {
    console.error("Error:", err);
  }
})();
