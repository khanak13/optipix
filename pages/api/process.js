import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Form parse error" });
    }

    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: "No file received" });
    }

    const buffer = fs.readFileSync(file.filepath);

    // ✅ Validate input buffer (fixes Safari empty files)
    if (!buffer || buffer.length < 50) {
      return res.status(400).json({
        error: "Uploaded file is empty or corrupted",
      });
    }

    const width = Number(fields.width);
    const height = Number(fields.height);
    const quality = Number(fields.quality);

    try {
      // ✅ Sharp conversion with HEIC/HEIF → JPEG
      let sharpImage = sharp(buffer, { failOnError: false });

      const metadata = await sharpImage.metadata();

      if (!metadata || !metadata.format) {
        return res.status(400).json({
          error: "Unsupported or unreadable image format",
        });
      }

      // ✅ Resize without cropping
      const resultBuffer = await sharpImage
        .resize({
          width,
          height,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();

      res.setHeader(
        "X-metrics",
        JSON.stringify({
          originalSize: buffer.length,
          newSize: resultBuffer.length,
        })
      );

      return res.status(200).send(resultBuffer);
    } catch (error) {
      console.error("PROCESSING ERROR →", error);

      return res.status(500).json({
        error: "Processing failed. Unsupported image format.",
      });
    }
  });
}
