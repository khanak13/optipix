import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const form = formidable({});
  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: "Failed to parse file" });
      return;
    }

    try {
      const file = files.file[0];
      const width = parseInt(fields.width[0]);
      const height = parseInt(fields.height[0]);
      const quality = parseInt(fields.quality[0]);

      const inputBuffer = fs.readFileSync(file.filepath);

      // Resize + optimize with Sharp
      const outputBuffer = await sharp(inputBuffer)
        .resize({ width, height, fit: "cover" })
        .jpeg({ quality })
        .toBuffer();

      const metrics = {
        originalSize: inputBuffer.length,
        newSize: outputBuffer.length,
      };

      res.setHeader("x-metrics", JSON.stringify(metrics));
      res.setHeader("Content-Type", "image/jpeg");
      res.send(outputBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Processing failed" });
    }
  });
}
