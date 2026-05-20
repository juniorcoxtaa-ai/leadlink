import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/db";
import { properties } from "../src/db/schema";
import { sql } from "drizzle-orm";
import { isBase64Image, normalizePropertyImages } from "../src/lib/property-images";
import { uploadPropertyImageServer } from "../src/lib/property-storage.server";

function dataUrlToFile(dataUrl: string, fallbackName: string): File {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Imagem base64 inválida.");
  }

  const mime = match[1];
  const payload = match[2];
  const buffer = Buffer.from(payload, "base64");
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return new File([buffer], `${fallbackName}.${ext}`, { type: mime });
}

async function main() {
  const rows = await db
    .select({
      id: properties.id,
      code: properties.code,
      title: properties.title,
      image: properties.image,
      images: properties.images,
    })
    .from(properties)
    .where(
      sql`${properties.image} like 'data:%' or coalesce(${properties.images}::text, '') like '%data:%'`,
    );

  const report: Array<Record<string, unknown>> = [];
  const exportDir = path.resolve("tmp/property-image-migration");
  await mkdir(exportDir, { recursive: true });

  for (const row of rows) {
    const gallery = normalizePropertyImages(row.images);
    const migratedGallery: string[] = [];
    let migratedCover = typeof row.image === "string" ? row.image : null;

    if (typeof row.image === "string" && isBase64Image(row.image)) {
      const file = dataUrlToFile(row.image, `${row.id}-cover`);
      await writeFile(path.join(exportDir, file.name), Buffer.from(await file.arrayBuffer()));
      migratedCover = await uploadPropertyImageServer(file);
    }

    for (let index = 0; index < gallery.length; index += 1) {
      const value = gallery[index];
      if (isBase64Image(value)) {
        const file = dataUrlToFile(value, `${row.id}-gallery-${index + 1}`);
        await writeFile(path.join(exportDir, file.name), Buffer.from(await file.arrayBuffer()));
        migratedGallery.push(await uploadPropertyImageServer(file));
      } else {
        migratedGallery.push(value);
      }
    }

    await db
      .update(properties)
      .set({
        image: migratedCover,
        images: migratedGallery.filter((value) => value !== migratedCover),
      })
      .where(sql`${properties.id} = ${row.id}`);

    report.push({
      id: row.id,
      code: row.code,
      title: row.title,
      coverMigrated: isBase64Image(row.image),
      galleryMigrated: gallery.filter((value) => isBase64Image(value)).length,
      finalImage: migratedCover,
      finalGalleryCount: migratedGallery.length,
    });
  }

  const reportPath = path.join(exportDir, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ affectedProperties: rows.length, reportPath }, null, 2));
}

await main();
